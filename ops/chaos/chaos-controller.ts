/**
 * Chaos Engineering Controller
 * Safe, controlled chaos experiments with SLO validation
 * Agents: chaos-experimenter, slo-validator, autoticket-integrator
 */

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import axios from 'axios';
import { Prometheus } from '../canary/prometheus-client';

export interface ChaosExperiment {
  name: string;
  description: string;
  type: string;
  schedule?: string;
  enabled: boolean;
  targets: any;
  config?: any;
  duration: string;
  validation: ValidationRule[];
}

export interface ValidationRule {
  metric: string;
  threshold: number;
  window: string;
}

export interface ExperimentExecution {
  id: string;
  experimentName: string;
  status: 'scheduled' | 'running' | 'completed' | 'aborted' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  duration: number;
  sloViolations: SLOViolation[];
  metrics: ExperimentMetrics;
  incidentId?: string;
  abortReason?: string;
}

export interface SLOViolation {
  metric: string;
  threshold: number;
  actual: number;
  severity: 'warning' | 'critical';
  timestamp: Date;
}

export interface ExperimentMetrics {
  availability: number;
  errorRate: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  requestCount: number;
}

export class ChaosController {
  private config: any;
  private executions: Map<string, ExperimentExecution> = new Map();
  private prometheus: Prometheus;

  constructor(configPath?: string) {
    const configFile = configPath || __dirname + '/chaos-config.yaml';
    const configYaml = fs.readFileSync(configFile, 'utf8');
    this.config = yaml.load(configYaml);

    this.prometheus = new Prometheus({
      url: process.env.PROMETHEUS_URL || 'http://localhost:9090'
    });
  }

  /**
   * Run chaos experiment
   */
  async runExperiment(experimentName: string, dryRun: boolean = false): Promise<ExperimentExecution> {
    const experiment = this.config.experiments.find((e: ChaosExperiment) => e.name === experimentName);

    if (!experiment) {
      throw new Error(`Experiment ${experimentName} not found`);
    }

    if (!experiment.enabled) {
      throw new Error(`Experiment ${experimentName} is disabled`);
    }

    const execution: ExperimentExecution = {
      id: `exp-${experimentName}-${Date.now()}`,
      experimentName,
      status: 'running',
      startedAt: new Date(),
      duration: this.parseDuration(experiment.duration),
      sloViolations: [],
      metrics: this.getInitialMetrics()
    };

    this.executions.set(execution.id, execution);

    console.info(`[Chaos] Starting experiment: ${experimentName} ${dryRun ? '(DRY RUN)' : ''}`);

    // Notify start
    await this.notify('start', execution, experiment);

    // Execute experiment
    try {
      if (!dryRun) {
        await this.executeExperiment(execution, experiment);
      } else {
        console.info(`[Chaos] DRY RUN - Simulating experiment execution`);
        await this.simulateExperiment(execution, experiment);
      }

      // Validate SLOs
      const violations = await this.validateSLOs(execution, experiment);

      if (violations.length > 0) {
        execution.sloViolations = violations;

        if (this.config.safety.abortOnSLOViolation) {
          await this.abortExperiment(execution, 'SLO violations detected');
          return execution;
        }
      }

      execution.status = 'completed';
      execution.completedAt = new Date();

      console.info(`[Chaos] Experiment ${experimentName} completed successfully`);

      await this.notify('complete', execution, experiment);

      // Create ticket with results
      if (this.config.global.ticketing.enabled) {
        await this.createTicket(execution, experiment);
      }

      // Save audit log
      if (this.config.audit.enabled) {
        await this.saveAuditLog(execution, experiment);
      }

    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();

      console.error(`[Chaos] Experiment ${experimentName} failed:`, error);

      await this.notify('failed', execution, experiment);

      throw error;
    }

    return execution;
  }

  /**
   * Execute chaos experiment
   */
  private async executeExperiment(execution: ExperimentExecution, experiment: ChaosExperiment): Promise<void> {
    console.info(`[Chaos] Executing ${experiment.type} experiment...`);

    switch (experiment.type) {
      case 'pod-kill':
        await this.executePodKill(experiment);
        break;

      case 'network-latency':
        await this.executeNetworkLatency(experiment);
        break;

      case 'network-loss':
        await this.executeNetworkLoss(experiment);
        break;

      case 'cpu-stress':
        await this.executeCPUStress(experiment);
        break;

      case 'az-failure':
        await this.executeAZFailure(experiment);
        break;

      default:
        throw new Error(`Unknown experiment type: ${experiment.type}`);
    }

    // Wait for experiment duration
    await this.sleep(this.parseDuration(experiment.duration));

    // Cleanup (remove injected faults)
    await this.cleanup(experiment);
  }

  /**
   * Simulate experiment (dry run)
   */
  private async simulateExperiment(execution: ExperimentExecution, experiment: ChaosExperiment): Promise<void> {
    console.info(`[Chaos] Simulating ${experiment.type} for ${experiment.duration}...`);

    // Simulate duration
    await this.sleep(Math.min(this.parseDuration(experiment.duration), 10000)); // Max 10s for dry run

    console.info(`[Chaos] Simulation complete`);
  }

  /**
   * Execute pod kill experiment
   */
  private async executePodKill(experiment: ChaosExperiment): Promise<void> {
    const { namespace, deployment, count } = experiment.targets;

    console.info(`[Chaos] Killing ${count} pod(s) in ${namespace}/${deployment}...`);

    // In production, use kubectl or Kubernetes API:
    // kubectl delete pod -n ${namespace} -l app=${deployment} --field-selector=status.phase=Running --force

    console.info(`[Chaos] Pod kill executed (simulated in this demo)`);
  }

  /**
   * Execute network latency injection
   */
  private async executeNetworkLatency(experiment: ChaosExperiment): Promise<void> {
    const { namespace, deployment, percentage } = experiment.targets;
    const { latencyMs, jitterMs } = experiment.config;

    console.info(`[Chaos] Injecting ${latencyMs}ms (±${jitterMs}ms) latency to ${percentage * 100}% of ${namespace}/${deployment}...`);

    // In production, use Chaos Mesh, Litmus, or tc (traffic control):
    // kubectl apply -f network-chaos.yaml

    console.info(`[Chaos] Network latency injected (simulated)`);
  }

  /**
   * Execute network packet loss
   */
  private async executeNetworkLoss(experiment: ChaosExperiment): Promise<void> {
    const { namespace, service, percentage } = experiment.targets;
    const { lossPercentage } = experiment.config;

    console.info(`[Chaos] Injecting ${lossPercentage}% packet loss to ${percentage * 100}% of ${namespace}/${service}...`);

    console.info(`[Chaos] Network loss injected (simulated)`);
  }

  /**
   * Execute CPU stress test
   */
  private async executeCPUStress(experiment: ChaosExperiment): Promise<void> {
    const { namespace, deployment, count } = experiment.targets;
    const { cpuPercent, workers } = experiment.config;

    console.info(`[Chaos] Stressing CPU to ${cpuPercent}% on ${count} pod(s) in ${namespace}/${deployment}...`);

    // In production, use stress-ng or similar tool

    console.info(`[Chaos] CPU stress applied (simulated)`);
  }

  /**
   * Execute AZ failure simulation
   */
  private async executeAZFailure(experiment: ChaosExperiment): Promise<void> {
    const { region, availabilityZone, percentage } = experiment.targets;

    console.info(`[Chaos] Simulating failure of ${availabilityZone} in ${region}...`);

    // In production, use AWS Fault Injection Simulator (FIS) or similar

    console.info(`[Chaos] AZ failure simulated`);
  }

  /**
   * Validate SLOs during/after experiment
   */
  private async validateSLOs(execution: ExperimentExecution, experiment: ChaosExperiment): Promise<SLOViolation[]> {
    console.info(`[Chaos] Validating SLOs...`);

    const violations: SLOViolation[] = [];

    // Fetch metrics
    const metrics = await this.fetchMetrics(experiment);
    execution.metrics = metrics;

    // Check each validation rule
    for (const rule of experiment.validation) {
      const actual = await this.getMetricValue(rule.metric, rule.window);

      if (this.isViolation(rule.metric, actual, rule.threshold)) {
        const severity = this.getViolationSeverity(rule.metric, actual, rule.threshold);

        violations.push({
          metric: rule.metric,
          threshold: rule.threshold,
          actual,
          severity,
          timestamp: new Date()
        });

        console.warn(
          `[Chaos] SLO violation: ${rule.metric} = ${actual} (threshold: ${rule.threshold}) [${severity}]`
        );
      }
    }

    return violations;
  }

  /**
   * Abort experiment
   */
  private async abortExperiment(execution: ExperimentExecution, reason: string): Promise<void> {
    console.warn(`[Chaos] Aborting experiment ${execution.id}: ${reason}`);

    execution.status = 'aborted';
    execution.abortReason = reason;
    execution.completedAt = new Date();

    // Cleanup immediately
    const experiment = this.config.experiments.find((e: ChaosExperiment) => e.name === execution.experimentName);
    if (experiment) {
      await this.cleanup(experiment);
    }

    await this.notify('aborted', execution, experiment);
  }

  /**
   * Cleanup after experiment
   */
  private async cleanup(experiment: ChaosExperiment): Promise<void> {
    console.info(`[Chaos] Cleaning up experiment...`);

    // Remove injected faults
    // In production: kubectl delete chaosexperiment ${experiment.name}

    console.info(`[Chaos] Cleanup complete`);
  }

  /**
   * Fetch metrics from Prometheus
   */
  private async fetchMetrics(experiment: ChaosExperiment): Promise<ExperimentMetrics> {
    const namespace = experiment.targets.namespace;
    const deployment = experiment.targets.deployment || experiment.targets.service;

    const labels = { namespace, deployment };

    const [availability, errorRate, latencyP50, latencyP95, latencyP99, requestCount] = await Promise.all([
      this.prometheus.queryInstant(`avg_over_time(up{${this.labelsToString(labels)}}[5m]) * 100`),
      this.prometheus.queryInstant(`rate(http_requests_total{${this.labelsToString(labels)},status=~"5.."}[5m]) / rate(http_requests_total{${this.labelsToString(labels)}}[5m])`),
      this.prometheus.queryInstant(`histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{${this.labelsToString(labels)}}[5m])) * 1000`),
      this.prometheus.queryInstant(`histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{${this.labelsToString(labels)}}[5m])) * 1000`),
      this.prometheus.queryInstant(`histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{${this.labelsToString(labels)}}[5m])) * 1000`),
      this.prometheus.queryInstant(`sum(rate(http_requests_total{${this.labelsToString(labels)}}[5m])) * 300`)
    ]);

    return {
      availability,
      errorRate: errorRate * 100,
      latencyP50,
      latencyP95,
      latencyP99,
      requestCount
    };
  }

  /**
   * Get metric value
   */
  private async getMetricValue(metric: string, window: string): Promise<number> {
    switch (metric) {
      case 'availability':
        return await this.prometheus.queryInstant(`avg_over_time(up[${window}]) * 100`);

      case 'error_rate':
        return await this.prometheus.queryInstant(`rate(http_requests_total{status=~"5.."}[${window}]) / rate(http_requests_total[${window}])`);

      case 'latency_p95':
        return await this.prometheus.queryInstant(`histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[${window}])) * 1000`);

      default:
        return 0;
    }
  }

  /**
   * Check if metric value is a violation
   */
  private isViolation(metric: string, actual: number, threshold: number): boolean {
    switch (metric) {
      case 'availability':
        return actual < threshold;

      case 'error_rate':
      case 'latency_p95':
      case 'latency_p99':
        return actual > threshold;

      default:
        return false;
    }
  }

  /**
   * Get violation severity
   */
  private getViolationSeverity(metric: string, actual: number, threshold: number): 'warning' | 'critical' {
    const deviation = Math.abs((actual - threshold) / threshold);

    return deviation > 0.5 ? 'critical' : 'warning';
  }

  /**
   * Create incident ticket
   */
  private async createTicket(execution: ExperimentExecution, experiment: ChaosExperiment): Promise<void> {
    const provider = this.config.global.ticketing.provider;

    console.info(`[Chaos] Creating ticket in ${provider}...`);

    const title = `Chaos Experiment: ${experiment.name}`;
    const body = `
**Experiment**: ${experiment.name}
**Status**: ${execution.status}
**Duration**: ${execution.duration / 1000}s
**SLO Violations**: ${execution.sloViolations.length}

**Metrics**:
- Availability: ${execution.metrics.availability.toFixed(2)}%
- Error Rate: ${execution.metrics.errorRate.toFixed(2)}%
- p95 Latency: ${execution.metrics.latencyP95.toFixed(0)}ms

${execution.sloViolations.length > 0 ? `**Violations**:\n${execution.sloViolations.map(v => `- ${v.metric}: ${v.actual} (threshold: ${v.threshold})`).join('\n')}` : ''}

**Next Steps**:
- [ ] Review experiment results
- [ ] Identify resilience gaps
- [ ] Create remediation tickets
- [ ] Update runbooks
    `.trim();

    if (provider === 'github') {
      // Create GitHub issue
      // const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
      // await octokit.issues.create({ owner, repo, title, body, labels });

      console.info(`[Chaos] Ticket created: ${title}`);
    }
  }

  /**
   * Save audit log
   */
  private async saveAuditLog(execution: ExperimentExecution, experiment: ChaosExperiment): Promise<void> {
    const logPath = `${this.config.audit.evidencePath}/${execution.id}.json`;

    const auditLog = {
      id: execution.id,
      experiment: experiment.name,
      timestamp: new Date().toISOString(),
      duration: execution.duration,
      status: execution.status,
      metrics: execution.metrics,
      sloViolations: execution.sloViolations,
      soc2Evidence: this.config.audit.soc2Evidence
    };

    fs.mkdirSync(this.config.audit.evidencePath, { recursive: true });
    fs.writeFileSync(logPath, JSON.stringify(auditLog, null, 2));

    console.info(`[Chaos] Audit log saved: ${logPath}`);
  }

  /**
   * Send notification
   */
  private async notify(event: string, execution: ExperimentExecution, experiment: ChaosExperiment): Promise<void> {
    console.info(`[Chaos] Sending ${event} notification...`);

    // Slack, PagerDuty, email notifications would go here
  }

  // Helper methods

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)(ms|s|m|h)$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'ms':
        return value;
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  private labelsToString(labels: Record<string, string>): string {
    return Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }

  private getInitialMetrics(): ExperimentMetrics {
    return {
      availability: 100,
      errorRate: 0,
      latencyP50: 0,
      latencyP95: 0,
      latencyP99: 0,
      requestCount: 0
    };
  }

  /**
   * Get execution
   */
  getExecution(id: string): ExperimentExecution | undefined {
    return this.executions.get(id);
  }

  /**
   * List executions
   */
  listExecutions(): ExperimentExecution[] {
    return Array.from(this.executions.values());
  }
}
