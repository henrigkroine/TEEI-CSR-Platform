/**
 * Drift Alert Routing
 *
 * Monitors drift detection and routes alerts per tenant:
 * - Detects when PSI or JS-divergence exceeds thresholds
 * - Routes alerts per tenant (email, webhook, dashboard)
 * - Includes drift magnitude and affected dimensions
 * - Suggests rollback if drift is severe (>0.3 PSI)
 */

import {
  DriftCheckResult,
  checkDrift,
  storeDriftCheck,
  getDriftAlerts,
  Distribution,
} from './drift.js';
import { Language } from '../inference/language_detection.js';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertChannel = 'email' | 'webhook' | 'dashboard' | 'slack';

export interface DriftAlert {
  id: string;
  tenantId: string;
  timestamp: Date;
  severity: AlertSeverity;
  driftCheck: DriftCheckResult;

  // Recommendations
  suggestRollback: boolean;
  recommendedAction: string;

  // Routing
  channels: AlertChannel[];
  recipients?: string[]; // Email addresses or webhook URLs
}

export interface TenantAlertConfig {
  tenantId: string;
  channels: AlertChannel[];
  emailRecipients?: string[];
  webhookUrl?: string;
  slackWebhook?: string;
  dashboardEnabled: boolean;

  // Thresholds (override defaults)
  psiThreshold?: number;
  jsThreshold?: number;
  criticalPsiThreshold?: number; // For rollback suggestions
}

/**
 * In-memory storage for tenant alert configs and drift alerts
 * In production, this should use a database
 */
class DriftAlertStore {
  private configs: Map<string, TenantAlertConfig> = new Map();
  private alerts: Map<string, DriftAlert> = new Map();

  saveConfig(config: TenantAlertConfig): void {
    this.configs.set(config.tenantId, config);
  }

  getConfig(tenantId: string): TenantAlertConfig | undefined {
    return this.configs.get(tenantId);
  }

  saveAlert(alert: DriftAlert): void {
    this.alerts.set(alert.id, alert);
  }

  getAlert(id: string): DriftAlert | undefined {
    return this.alerts.get(id);
  }

  getAlertsByTenant(tenantId: string): DriftAlert[] {
    return Array.from(this.alerts.values())
      .filter(a => a.tenantId === tenantId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getAllAlerts(): DriftAlert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  clear(): void {
    this.configs.clear();
    this.alerts.clear();
  }
}

const driftAlertStore = new DriftAlertStore();

/**
 * Drift Alert Router
 */
export class DriftAlertRouter {
  /**
   * Check drift and route alerts if thresholds exceeded
   */
  async checkAndAlert(
    tenantId: string,
    label: string,
    language: Language,
    baseline: Distribution,
    current: Distribution
  ): Promise<DriftAlert | null> {
    // Get tenant config
    const config = this.getTenantConfig(tenantId);

    // Use tenant-specific thresholds or defaults
    const psiThreshold = config?.psiThreshold ?? 0.2;
    const jsThreshold = config?.jsThreshold ?? 0.1;

    // Perform drift check
    const driftCheck = checkDrift(label, language, baseline, current, psiThreshold, jsThreshold);

    // Store drift check result
    await storeDriftCheck(driftCheck);

    // If no alert triggered, return early
    if (!driftCheck.alertTriggered) {
      return null;
    }

    // Determine severity
    const severity = this.calculateSeverity(driftCheck, config);

    // Determine if rollback is suggested
    const criticalPsiThreshold = config?.criticalPsiThreshold ?? 0.3;
    const suggestRollback = driftCheck.psiScore > criticalPsiThreshold || severity === 'critical';

    // Create alert
    const alert: DriftAlert = {
      id: `drift-alert-${tenantId}-${Date.now()}`,
      tenantId,
      timestamp: new Date(),
      severity,
      driftCheck,
      suggestRollback,
      recommendedAction: this.getRecommendedAction(severity, suggestRollback, driftCheck),
      channels: config?.channels ?? ['dashboard'],
      recipients: config?.emailRecipients,
    };

    // Save alert
    driftAlertStore.saveAlert(alert);

    console.warn(`[DriftAlert] ${severity.toUpperCase()} drift detected for tenant ${tenantId}`);
    console.warn(`[DriftAlert] Label: ${label}, Language: ${language}`);
    console.warn(`[DriftAlert] PSI: ${driftCheck.psiScore.toFixed(4)}, JS: ${driftCheck.jsScore.toFixed(4)}`);
    console.warn(`[DriftAlert] Suggest Rollback: ${suggestRollback}`);

    // Route alert to configured channels
    await this.routeAlert(alert, config);

    return alert;
  }

  /**
   * Calculate alert severity based on drift magnitude
   */
  private calculateSeverity(driftCheck: DriftCheckResult, config?: TenantAlertConfig): AlertSeverity {
    const psiScore = driftCheck.psiScore;
    const jsScore = driftCheck.jsScore;

    // Critical: PSI > 0.3 or JS > 0.15
    if (psiScore > 0.3 || jsScore > 0.15) {
      return 'critical';
    }

    // High: PSI > 0.25 or JS > 0.12
    if (psiScore > 0.25 || jsScore > 0.12) {
      return 'high';
    }

    // Medium: PSI > 0.2 or JS > 0.1
    if (psiScore > 0.2 || jsScore > 0.1) {
      return 'medium';
    }

    // Low: PSI > 0.1 or JS > 0.05
    return 'low';
  }

  /**
   * Get recommended action based on severity
   */
  private getRecommendedAction(
    severity: AlertSeverity,
    suggestRollback: boolean,
    driftCheck: DriftCheckResult
  ): string {
    if (suggestRollback) {
      return `IMMEDIATE ACTION REQUIRED: Severe drift detected (PSI: ${driftCheck.psiScore.toFixed(4)}). Consider rolling back to previous model override.`;
    }

    switch (severity) {
      case 'critical':
        return 'CRITICAL: Investigate immediately. Model behavior has changed significantly.';
      case 'high':
        return 'HIGH: Schedule investigation within 24 hours. Monitor closely.';
      case 'medium':
        return 'MEDIUM: Review drift trends. Consider retraining or recalibration.';
      case 'low':
        return 'LOW: Monitor trend. No immediate action required.';
    }
  }

  /**
   * Route alert to configured channels
   */
  private async routeAlert(alert: DriftAlert, config?: TenantAlertConfig): Promise<void> {
    const channels = alert.channels;

    for (const channel of channels) {
      switch (channel) {
        case 'email':
          await this.sendEmailAlert(alert, config);
          break;
        case 'webhook':
          await this.sendWebhookAlert(alert, config);
          break;
        case 'slack':
          await this.sendSlackAlert(alert, config);
          break;
        case 'dashboard':
          // Dashboard alerts are stored in database and displayed in UI
          console.info(`[DriftAlert] Dashboard alert stored: ${alert.id}`);
          break;
      }
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: DriftAlert, config?: TenantAlertConfig): Promise<void> {
    const recipients = config?.emailRecipients ?? [];

    if (recipients.length === 0) {
      console.warn(`[DriftAlert] No email recipients configured for tenant ${alert.tenantId}`);
      return;
    }

    const emailContent = this.formatEmailAlert(alert);

    console.info(`[DriftAlert] Sending email to: ${recipients.join(', ')}`);
    console.info(`[DriftAlert] Email content:\n${emailContent}`);

    // In production, integrate with email service:
    // await emailService.send({
    //   to: recipients,
    //   subject: `[${alert.severity.toUpperCase()}] Model Drift Alert - ${alert.tenantId}`,
    //   body: emailContent,
    // });
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: DriftAlert, config?: TenantAlertConfig): Promise<void> {
    const webhookUrl = config?.webhookUrl;

    if (!webhookUrl) {
      console.warn(`[DriftAlert] No webhook URL configured for tenant ${alert.tenantId}`);
      return;
    }

    const payload = {
      alertId: alert.id,
      tenantId: alert.tenantId,
      timestamp: alert.timestamp.toISOString(),
      severity: alert.severity,
      label: alert.driftCheck.label,
      language: alert.driftCheck.language,
      psiScore: alert.driftCheck.psiScore,
      jsScore: alert.driftCheck.jsScore,
      suggestRollback: alert.suggestRollback,
      recommendedAction: alert.recommendedAction,
    };

    console.info(`[DriftAlert] Sending webhook to: ${webhookUrl}`);
    console.info(`[DriftAlert] Payload: ${JSON.stringify(payload, null, 2)}`);

    // In production, send HTTP POST to webhook:
    // await fetch(webhookUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: DriftAlert, config?: TenantAlertConfig): Promise<void> {
    const slackWebhook = config?.slackWebhook;

    if (!slackWebhook) {
      console.warn(`[DriftAlert] No Slack webhook configured for tenant ${alert.tenantId}`);
      return;
    }

    const message = this.formatSlackAlert(alert);

    console.info(`[DriftAlert] Sending Slack message to: ${slackWebhook}`);
    console.info(`[DriftAlert] Message: ${message}`);

    // In production, send to Slack webhook:
    // await fetch(slackWebhook, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ text: message }),
    // });
  }

  /**
   * Format email alert content
   */
  private formatEmailAlert(alert: DriftAlert): string {
    const lines: string[] = [];

    lines.push(`Model Drift Alert - ${alert.severity.toUpperCase()}`);
    lines.push('');
    lines.push(`Tenant: ${alert.tenantId}`);
    lines.push(`Timestamp: ${alert.timestamp.toISOString()}`);
    lines.push(`Label: ${alert.driftCheck.label}`);
    lines.push(`Language: ${alert.driftCheck.language}`);
    lines.push('');
    lines.push('Drift Metrics:');
    lines.push(`  PSI Score: ${alert.driftCheck.psiScore.toFixed(4)}`);
    lines.push(`  JS Score:  ${alert.driftCheck.jsScore.toFixed(4)}`);
    lines.push(`  Sample Size: ${alert.driftCheck.sampleSize}`);
    lines.push('');
    lines.push(`Recommended Action: ${alert.recommendedAction}`);
    lines.push('');

    if (alert.suggestRollback) {
      lines.push('⚠️  ROLLBACK SUGGESTED ⚠️');
      lines.push('');
    }

    lines.push('Baseline Distribution:');
    for (const [key, val] of Object.entries(alert.driftCheck.baselineDistribution)) {
      lines.push(`  ${key}: ${(val * 100).toFixed(2)}%`);
    }

    lines.push('');
    lines.push('Current Distribution:');
    for (const [key, val] of Object.entries(alert.driftCheck.currentDistribution)) {
      lines.push(`  ${key}: ${(val * 100).toFixed(2)}%`);
    }

    return lines.join('\n');
  }

  /**
   * Format Slack alert message
   */
  private formatSlackAlert(alert: DriftAlert): string {
    const emoji = alert.severity === 'critical' ? '🚨' : alert.severity === 'high' ? '⚠️' : 'ℹ️';
    const rollbackEmoji = alert.suggestRollback ? '🔄 ROLLBACK SUGGESTED' : '';

    return `${emoji} *Model Drift Alert* (${alert.severity.toUpperCase()}) ${rollbackEmoji}
Tenant: ${alert.tenantId}
Label: ${alert.driftCheck.label} (${alert.driftCheck.language})
PSI: ${alert.driftCheck.psiScore.toFixed(4)} | JS: ${alert.driftCheck.jsScore.toFixed(4)}

${alert.recommendedAction}`;
  }

  /**
   * Get tenant alert configuration
   */
  getTenantConfig(tenantId: string): TenantAlertConfig | undefined {
    return driftAlertStore.getConfig(tenantId);
  }

  /**
   * Set tenant alert configuration
   */
  setTenantConfig(config: TenantAlertConfig): void {
    driftAlertStore.saveConfig(config);
  }

  /**
   * Get drift alerts for a tenant
   */
  getTenantAlerts(tenantId: string): DriftAlert[] {
    return driftAlertStore.getAlertsByTenant(tenantId);
  }

  /**
   * Get all drift alerts
   */
  getAllAlerts(): DriftAlert[] {
    return driftAlertStore.getAllAlerts();
  }

  /**
   * Get specific alert by ID
   */
  getAlert(alertId: string): DriftAlert | undefined {
    return driftAlertStore.getAlert(alertId);
  }

  /**
   * Clear all alerts (for testing)
   */
  clear(): void {
    driftAlertStore.clear();
  }
}

/**
 * Create default tenant alert config
 */
export function createDefaultAlertConfig(tenantId: string): TenantAlertConfig {
  return {
    tenantId,
    channels: ['dashboard'],
    dashboardEnabled: true,
    psiThreshold: 0.2,
    jsThreshold: 0.1,
    criticalPsiThreshold: 0.3,
  };
}

/**
 * Singleton instance
 */
let driftAlertRouter: DriftAlertRouter | null = null;

export function getDriftAlertRouter(): DriftAlertRouter {
  if (!driftAlertRouter) {
    driftAlertRouter = new DriftAlertRouter();
  }
  return driftAlertRouter;
}

export function resetDriftAlertRouter(): void {
  driftAlertRouter = null;
}
