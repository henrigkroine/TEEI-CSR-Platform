/**
 * Multi-Region Canary Controller
 * Progressive delivery with error-budget gating and auto-rollback
 *
 * Agents: canary-controller-author, error-budget-guardian, region-flag-integrator
 */

import { Prometheus } from './prometheus-client';
import { FeatureFlagClient } from './feature-flags';
import { NotificationService } from './notifications';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

export interface CanaryDeployment {
  id: string;
  service: string;
  version: string;
  region: string;
  status: 'initializing' | 'active' | 'paused' | 'completed' | 'rolled_back';
  currentStage: number;
  currentWeight: number;
  startedAt: Date;
  lastTransitionAt: Date;
  completedAt?: Date;
  metrics: DeploymentMetrics;
  errorBudget: ErrorBudget;
}

export interface DeploymentMetrics {
  requestCount: number;
  errorCount: number;
  errorRate: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  availability: number;
}

export interface ErrorBudget {
  total: number;           // Total budget (1 - SLO) over window
  consumed: number;        // Budget consumed so far
  remaining: number;       // Budget remaining
  burnRate: number;        // Current burn rate
  status: 'healthy' | 'warning' | 'critical' | 'exhausted';
}

export interface CanaryConfig {
  global: any;
  services: any;
  featureFlags: any;
  monitoring: any;
  notifications: any;
}

/**
 * Canary Controller - Progressive Delivery Manager
 */
export class CanaryController {
  private deployments: Map<string, CanaryDeployment> = new Map();
  private config: CanaryConfig;
  private prometheus: Prometheus;
  private featureFlags: FeatureFlagClient;
  private notifications: NotificationService;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(configPath?: string) {
    // Load configuration
    const configFile = configPath || path.join(__dirname, 'config.yaml');
    const configYaml = fs.readFileSync(configFile, 'utf8');
    this.config = yaml.load(configYaml) as CanaryConfig;

    // Initialize clients
    this.prometheus = new Prometheus({
      url: process.env.PROMETHEUS_URL || 'http://localhost:9090'
    });

    this.featureFlags = new FeatureFlagClient({
      provider: this.config.featureFlags.provider,
      apiKey: process.env.FEATURE_FLAG_API_KEY
    });

    this.notifications = new NotificationService(this.config.notifications);
  }

  /**
   * Start canary deployment
   */
  async startDeployment(params: {
    service: string;
    version: string;
    region: string;
  }): Promise<CanaryDeployment> {
    const { service, version, region } = params;

    // Validate service is enabled for canary
    const serviceConfig = this.config.services[service];
    if (!serviceConfig?.enabled) {
      throw new Error(`Canary deployment not enabled for service: ${service}`);
    }

    // Check if feature flag allows deployment in this region
    const canaryEnabled = await this.featureFlags.isEnabled(
      'canary_deployment_enabled',
      { region }
    );

    if (!canaryEnabled) {
      throw new Error(`Canary deployment disabled for region: ${region}`);
    }

    // Create deployment
    const deployment: CanaryDeployment = {
      id: `${service}-${version}-${region}-${Date.now()}`,
      service,
      version,
      region,
      status: 'initializing',
      currentStage: 0,
      currentWeight: 0,
      startedAt: new Date(),
      lastTransitionAt: new Date(),
      metrics: this.getInitialMetrics(),
      errorBudget: this.calculateErrorBudget(this.getInitialMetrics())
    };

    this.deployments.set(deployment.id, deployment);

    // Notify start
    await this.notifications.send({
      event: 'start',
      deployment,
      message: `Starting canary deployment: ${service}@${version} in ${region}`
    });

    // Transition to first stage
    await this.transitionToStage(deployment.id, 0);

    console.info(`[CanaryController] Started deployment ${deployment.id}`);

    return deployment;
  }

  /**
   * Transition to next stage
   */
  private async transitionToStage(
    deploymentId: string,
    stageIndex: number
  ): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;

    // Get stage config
    const stages = this.getStagesForService(deployment.service);
    if (stageIndex >= stages.length) {
      await this.completeDeployment(deploymentId);
      return;
    }

    const stage = stages[stageIndex];

    // Update deployment
    deployment.currentStage = stageIndex;
    deployment.currentWeight = stage.weight;
    deployment.lastTransitionAt = new Date();
    deployment.status = 'active';

    // Update traffic weight via feature flag
    await this.featureFlags.updateRolloutPercentage(
      `canary_${deployment.service}`,
      deployment.region,
      stage.weight * 100
    );

    console.info(
      `[CanaryController] Deployment ${deploymentId} → Stage ${stageIndex} (${stage.weight * 100}% traffic)`
    );

    await this.notifications.send({
      event: 'stage_transition',
      deployment,
      message: `Transitioned to stage ${stageIndex}: ${stage.weight * 100}% traffic`
    });
  }

  /**
   * Monitor all active deployments
   */
  async monitorDeployments(): Promise<void> {
    for (const deployment of this.deployments.values()) {
      if (deployment.status !== 'active') continue;

      try {
        // Fetch current metrics
        const metrics = await this.fetchMetrics(deployment);
        deployment.metrics = metrics;

        // Calculate error budget
        deployment.errorBudget = this.calculateErrorBudget(metrics);

        // Check rollback criteria
        if (await this.shouldRollback(deployment)) {
          await this.rollback(deployment.id, 'Failed rollback criteria');
          continue;
        }

        // Check if ready to advance
        if (await this.shouldAdvanceStage(deployment)) {
          await this.transitionToStage(deployment.id, deployment.currentStage + 1);
        }
      } catch (error) {
        console.error(`[CanaryController] Error monitoring ${deployment.id}:`, error);
      }
    }
  }

  /**
   * Check if deployment should be rolled back
   */
  private async shouldRollback(deployment: CanaryDeployment): Promise<boolean> {
    const criteria = this.config.global.rollback.criteria;

    for (const rule of criteria) {
      switch (rule.metric) {
        case 'error_rate':
          if (deployment.metrics.errorRate > rule.threshold) {
            console.warn(
              `[CanaryController] Rollback: Error rate ${(deployment.metrics.errorRate * 100).toFixed(2)}% > ${(rule.threshold * 100).toFixed(2)}%`
            );
            return true;
          }
          break;

        case 'latency_p95':
          if (deployment.metrics.latencyP95 > rule.threshold) {
            console.warn(
              `[CanaryController] Rollback: p95 latency ${deployment.metrics.latencyP95}ms > ${rule.threshold}ms`
            );
            return true;
          }
          break;

        case 'availability':
          if (deployment.metrics.availability < rule.threshold) {
            console.warn(
              `[CanaryController] Rollback: Availability ${deployment.metrics.availability.toFixed(2)}% < ${rule.threshold}%`
            );
            return true;
          }
          break;

        case 'budget_burn_rate':
          if (deployment.errorBudget.burnRate > rule.threshold) {
            console.warn(
              `[CanaryController] Rollback: Burn rate ${deployment.errorBudget.burnRate.toFixed(2)} > ${rule.threshold}`
            );
            return true;
          }
          break;
      }
    }

    return false;
  }

  /**
   * Check if deployment should advance to next stage
   */
  private async shouldAdvanceStage(deployment: CanaryDeployment): Promise<boolean> {
    const stages = this.getStagesForService(deployment.service);
    const currentStage = stages[deployment.currentStage];

    // Check if minimum duration has passed
    const minutesSinceTransition =
      (Date.now() - deployment.lastTransitionAt.getTime()) / (1000 * 60);

    const stageDurationMinutes = this.parseDuration(currentStage.duration);
    if (minutesSinceTransition < stageDurationMinutes) {
      return false;
    }

    // Check if minimum sample size reached
    if (deployment.metrics.requestCount < currentStage.minSampleSize) {
      console.info(
        `[CanaryController] Not advancing: Sample size ${deployment.metrics.requestCount} < ${currentStage.minSampleSize}`
      );
      return false;
    }

    // Check error budget health
    if (deployment.errorBudget.status === 'critical' || deployment.errorBudget.status === 'exhausted') {
      console.info(
        `[CanaryController] Not advancing: Error budget ${deployment.errorBudget.status}`
      );
      return false;
    }

    // All criteria met
    return true;
  }

  /**
   * Rollback deployment
   */
  async rollback(deploymentId: string, reason: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;

    // Check if manual approval required
    const serviceConfig = this.config.services[deployment.service];
    if (serviceConfig.rollback?.manualApprovalRequired) {
      deployment.status = 'paused';
      await this.notifications.send({
        event: 'rollback_approval_required',
        deployment,
        message: `Rollback requires manual approval: ${reason}`,
        severity: 'critical'
      });
      return;
    }

    // Set traffic to 0%
    await this.featureFlags.updateRolloutPercentage(
      `canary_${deployment.service}`,
      deployment.region,
      0
    );

    deployment.status = 'rolled_back';
    deployment.currentWeight = 0;
    deployment.completedAt = new Date();

    console.warn(`[CanaryController] Rolled back ${deploymentId}: ${reason}`);

    await this.notifications.send({
      event: 'rollback',
      deployment,
      message: `Deployment rolled back: ${reason}`,
      severity: 'critical'
    });
  }

  /**
   * Complete deployment (promote to 100%)
   */
  private async completeDeployment(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;

    deployment.status = 'completed';
    deployment.currentWeight = 1.0;
    deployment.completedAt = new Date();

    console.info(`[CanaryController] Completed deployment ${deploymentId}`);

    await this.notifications.send({
      event: 'complete',
      deployment,
      message: `Deployment completed successfully: ${deployment.service}@${deployment.version} in ${deployment.region}`
    });
  }

  /**
   * Fetch metrics from Prometheus
   */
  private async fetchMetrics(deployment: CanaryDeployment): Promise<DeploymentMetrics> {
    const labels = {
      service: deployment.service,
      version: deployment.version,
      region: deployment.region,
      deployment: 'canary'
    };

    const [requestCount, errorCount, latencyP50, latencyP95, latencyP99] = await Promise.all([
      this.prometheus.queryInstant(`sum(rate(http_requests_total{${this.labelsToString(labels)}}[5m])) * 300`),
      this.prometheus.queryInstant(`sum(rate(http_requests_total{${this.labelsToString(labels)},status=~"5.."}[5m])) * 300`),
      this.prometheus.queryInstant(`histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket{${this.labelsToString(labels)}}[5m])) by (le)) * 1000`),
      this.prometheus.queryInstant(`histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{${this.labelsToString(labels)}}[5m])) by (le)) * 1000`),
      this.prometheus.queryInstant(`histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{${this.labelsToString(labels)}}[5m])) by (le)) * 1000`)
    ]);

    const errorRate = requestCount > 0 ? errorCount / requestCount : 0;
    const availability = requestCount > 0 ? ((requestCount - errorCount) / requestCount) * 100 : 100;

    return {
      requestCount,
      errorCount,
      errorRate,
      latencyP50,
      latencyP95,
      latencyP99,
      availability
    };
  }

  /**
   * Calculate error budget
   */
  private calculateErrorBudget(metrics: DeploymentMetrics): ErrorBudget {
    const slo = this.config.global.errorBudget.availability / 100; // 0.999 for 99.9%
    const windowHours = this.config.global.errorBudget.budgetWindowHours;

    // Total budget = (1 - SLO) over the window
    const totalBudget = (1 - slo) * 100; // as percentage

    // Consumed = actual error rate
    const consumed = (1 - metrics.availability / 100) * 100;

    // Remaining
    const remaining = Math.max(0, totalBudget - consumed);

    // Burn rate = how fast we're consuming budget
    // If we consume 1 hour of budget in 5 minutes, burn rate = 12
    const burnRate = consumed / totalBudget;

    let status: ErrorBudget['status'] = 'healthy';
    if (remaining <= 0) status = 'exhausted';
    else if (burnRate >= this.config.global.errorBudget.burnRateThresholds.critical) status = 'critical';
    else if (burnRate >= this.config.global.errorBudget.burnRateThresholds.warning) status = 'warning';

    return {
      total: totalBudget,
      consumed,
      remaining,
      burnRate,
      status
    };
  }

  /**
   * Start monitoring loop
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.monitorDeployments().catch(err => {
        console.error('[CanaryController] Monitoring error:', err);
      });
    }, intervalMs);

    console.info(`[CanaryController] Started monitoring (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Helper methods

  private getStagesForService(service: string): any[] {
    const serviceConfig = this.config.services[service];
    return serviceConfig?.stages || this.config.global.stages;
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)(m|h)$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    return unit === 'h' ? value * 60 : value;
  }

  private labelsToString(labels: Record<string, string>): string {
    return Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }

  private getInitialMetrics(): DeploymentMetrics {
    return {
      requestCount: 0,
      errorCount: 0,
      errorRate: 0,
      latencyP50: 0,
      latencyP95: 0,
      latencyP99: 0,
      availability: 100
    };
  }

  /**
   * Get all active deployments
   */
  getActiveDeployments(): CanaryDeployment[] {
    return Array.from(this.deployments.values()).filter(
      d => d.status === 'active' || d.status === 'initializing'
    );
  }

  /**
   * Get deployment by ID
   */
  getDeployment(id: string): CanaryDeployment | undefined {
    return this.deployments.get(id);
  }
}

/**
 * Singleton instance
 */
let controllerInstance: CanaryController | null = null;

export function getCanaryController(configPath?: string): CanaryController {
  if (!controllerInstance) {
    controllerInstance = new CanaryController(configPath);
  }
  return controllerInstance;
}
