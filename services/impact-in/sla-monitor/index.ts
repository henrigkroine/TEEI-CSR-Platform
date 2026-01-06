/**
 * Impact-In SLA Monitoring Service
 *
 * Tracks delivery success rates, latency, and compliance with Service Level Agreements.
 *
 * SLA Thresholds:
 * - On-time delivery: ≥ 98% within scheduled window
 * - Delivery latency: ≤ 5 minutes from scheduled time
 * - Retry success: ≥ 90% after up to 3 attempts
 *
 * Features:
 * - Real-time delivery success/failure tracking
 * - Per-tenant and per-platform metrics
 * - SLA breach detection and alerting
 * - Weekly/monthly SLA reporting
 * - Dashboard API endpoint for UI integration
 *
 * Reference: MULTI_AGENT_PLAN.md § Worker 4/Phase F/SLA Monitor
 */

import { db } from '@teei/shared-schema';
import { impactDeliveries, scheduledDeliveries } from '@teei/shared-schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('impact-in-sla-monitor');

/**
 * SLA Thresholds
 */
export const SLA_THRESHOLDS = {
  /** Minimum success rate (98%) */
  MIN_SUCCESS_RATE: 0.98,

  /** Maximum delivery latency in milliseconds (5 minutes) */
  MAX_DELIVERY_LATENCY_MS: 5 * 60 * 1000,

  /** Minimum retry success rate (90%) */
  MIN_RETRY_SUCCESS_RATE: 0.90,

  /** Maximum consecutive failures before alert */
  MAX_CONSECUTIVE_FAILURES: 3,

  /** Warning threshold for success rate (95%) */
  WARNING_SUCCESS_RATE: 0.95,
} as const;

/**
 * SLA Status enum
 */
export enum SLAStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  BREACH = 'breach',
}

/**
 * Delivery metrics for a time period
 */
export interface DeliveryMetrics {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  retriedDeliveries: number;
  successRate: number;
  retrySuccessRate: number;
  avgDeliveryLatencyMs: number;
  avgPayloadSizeBytes: number;
  avgRetries: number;
  maxRetries: number;
}

/**
 * SLA metrics by platform
 */
export interface PlatformSLAMetrics extends DeliveryMetrics {
  platform: 'benevity' | 'goodera' | 'workday';
  slaStatus: SLAStatus;
  breaches: SLABreach[];
}

/**
 * SLA breach record
 */
export interface SLABreach {
  type: 'success_rate' | 'latency' | 'retry_success_rate';
  threshold: number;
  actual: number;
  timestamp: Date;
  severity: 'warning' | 'critical';
}

/**
 * Calculate delivery metrics for a time period
 */
export async function calculateDeliveryMetrics(
  companyId: string,
  platform: 'benevity' | 'goodera' | 'workday' | null,
  startDate: Date,
  endDate: Date
): Promise<DeliveryMetrics> {
  const conditions = [
    eq(impactDeliveries.companyId, companyId),
    gte(impactDeliveries.createdAt, startDate),
    lte(impactDeliveries.createdAt, endDate),
  ];

  if (platform) {
    conditions.push(eq(impactDeliveries.provider, platform));
  }

  const whereClause = and(...conditions);

  // Get aggregated metrics
  const [metrics] = await db
    .select({
      total: sql<number>`count(*)`,
      successful: sql<number>`count(*) filter (where status = 'success')`,
      failed: sql<number>`count(*) filter (where status = 'failed')`,
      retried: sql<number>`count(*) filter (where attempt_count > 1)`,
      avgLatency: sql<number>`avg(extract(epoch from (delivered_at - created_at)) * 1000)`,
      avgPayloadSize: sql<number>`avg(octet_length(payload::text))`,
      avgRetries: sql<number>`avg(attempt_count)`,
      maxRetries: sql<number>`max(attempt_count)`,
    })
    .from(impactDeliveries)
    .where(whereClause);

  const total = Number(metrics?.total || 0);
  const successful = Number(metrics?.successful || 0);
  const failed = Number(metrics?.failed || 0);
  const retried = Number(metrics?.retried || 0);

  // Calculate rates
  const successRate = total > 0 ? successful / total : 0;
  const retriedSuccessful = await db
    .select({ count: sql<number>`count(*)` })
    .from(impactDeliveries)
    .where(
      and(
        ...conditions,
        eq(impactDeliveries.status, 'success'),
        sql`attempt_count > 1`
      )
    );

  const retrySuccessRate = retried > 0 ? Number(retriedSuccessful[0]?.count || 0) / retried : 0;

  return {
    totalDeliveries: total,
    successfulDeliveries: successful,
    failedDeliveries: failed,
    retriedDeliveries: retried,
    successRate,
    retrySuccessRate,
    avgDeliveryLatencyMs: Number(metrics?.avgLatency || 0),
    avgPayloadSizeBytes: Number(metrics?.avgPayloadSize || 0),
    avgRetries: Number(metrics?.avgRetries || 0),
    maxRetries: Number(metrics?.maxRetries || 0),
  };
}

/**
 * Calculate SLA status based on metrics
 */
export function calculateSLAStatus(metrics: DeliveryMetrics): SLAStatus {
  // Check for critical breaches
  if (metrics.successRate < SLA_THRESHOLDS.MIN_SUCCESS_RATE) {
    return SLAStatus.BREACH;
  }

  if (metrics.avgDeliveryLatencyMs > SLA_THRESHOLDS.MAX_DELIVERY_LATENCY_MS) {
    return SLAStatus.BREACH;
  }

  if (metrics.retriedDeliveries > 0 && metrics.retrySuccessRate < SLA_THRESHOLDS.MIN_RETRY_SUCCESS_RATE) {
    return SLAStatus.BREACH;
  }

  // Check for warnings
  if (metrics.successRate < SLA_THRESHOLDS.WARNING_SUCCESS_RATE) {
    return SLAStatus.WARNING;
  }

  return SLAStatus.HEALTHY;
}

/**
 * Identify SLA breaches
 */
export function identifyBreaches(metrics: DeliveryMetrics): SLABreach[] {
  const breaches: SLABreach[] = [];
  const now = new Date();

  // Success rate breach
  if (metrics.successRate < SLA_THRESHOLDS.MIN_SUCCESS_RATE) {
    breaches.push({
      type: 'success_rate',
      threshold: SLA_THRESHOLDS.MIN_SUCCESS_RATE,
      actual: metrics.successRate,
      timestamp: now,
      severity: 'critical',
    });
  } else if (metrics.successRate < SLA_THRESHOLDS.WARNING_SUCCESS_RATE) {
    breaches.push({
      type: 'success_rate',
      threshold: SLA_THRESHOLDS.WARNING_SUCCESS_RATE,
      actual: metrics.successRate,
      timestamp: now,
      severity: 'warning',
    });
  }

  // Latency breach
  if (metrics.avgDeliveryLatencyMs > SLA_THRESHOLDS.MAX_DELIVERY_LATENCY_MS) {
    breaches.push({
      type: 'latency',
      threshold: SLA_THRESHOLDS.MAX_DELIVERY_LATENCY_MS,
      actual: metrics.avgDeliveryLatencyMs,
      timestamp: now,
      severity: 'critical',
    });
  }

  // Retry success rate breach
  if (metrics.retriedDeliveries > 0 && metrics.retrySuccessRate < SLA_THRESHOLDS.MIN_RETRY_SUCCESS_RATE) {
    breaches.push({
      type: 'retry_success_rate',
      threshold: SLA_THRESHOLDS.MIN_RETRY_SUCCESS_RATE,
      actual: metrics.retrySuccessRate,
      timestamp: now,
      severity: 'critical',
    });
  }

  return breaches;
}

/**
 * Get SLA status for all platforms for a company
 */
export async function getSLAStatus(
  companyId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  overall: DeliveryMetrics & { slaStatus: SLAStatus; breaches: SLABreach[] };
  byPlatform: PlatformSLAMetrics[];
}> {
  // Default to current week if no dates provided
  const start = startDate || getWeekStart();
  const end = endDate || new Date();

  logger.info('Calculating SLA status', { companyId, startDate: start, endDate: end });

  // Get overall metrics
  const overallMetrics = await calculateDeliveryMetrics(companyId, null, start, end);
  const overallStatus = calculateSLAStatus(overallMetrics);
  const overallBreaches = identifyBreaches(overallMetrics);

  // Get per-platform metrics
  const platforms: Array<'benevity' | 'goodera' | 'workday'> = ['benevity', 'goodera', 'workday'];
  const platformMetrics: PlatformSLAMetrics[] = [];

  for (const platform of platforms) {
    const metrics = await calculateDeliveryMetrics(companyId, platform, start, end);
    const status = calculateSLAStatus(metrics);
    const breaches = identifyBreaches(metrics);

    platformMetrics.push({
      platform,
      ...metrics,
      slaStatus: status,
      breaches,
    });
  }

  return {
    overall: {
      ...overallMetrics,
      slaStatus: overallStatus,
      breaches: overallBreaches,
    },
    byPlatform: platformMetrics,
  };
}

/**
 * Monitor SLA compliance and trigger alerts
 */
export async function monitorSLACompliance(companyId: string): Promise<void> {
  const slaStatus = await getSLAStatus(companyId);

  // Check for breaches
  if (slaStatus.overall.slaStatus === SLAStatus.BREACH) {
    logger.error('SLA BREACH detected', {
      companyId,
      successRate: slaStatus.overall.successRate,
      breaches: slaStatus.overall.breaches,
    });

    // Trigger alerts
    await triggerSLAAlert(companyId, slaStatus.overall.breaches);
  } else if (slaStatus.overall.slaStatus === SLAStatus.WARNING) {
    logger.warn('SLA WARNING', {
      companyId,
      successRate: slaStatus.overall.successRate,
      breaches: slaStatus.overall.breaches,
    });
  }

  // Check individual platforms
  for (const platform of slaStatus.byPlatform) {
    if (platform.slaStatus === SLAStatus.BREACH) {
      logger.error('Platform SLA BREACH', {
        companyId,
        platform: platform.platform,
        breaches: platform.breaches,
      });

      await triggerSLAAlert(companyId, platform.breaches, platform.platform);
    }
  }
}

/**
 * Trigger SLA alert (Slack/PagerDuty integration)
 */
async function triggerSLAAlert(
  companyId: string,
  breaches: SLABreach[],
  platform?: string
): Promise<void> {
  // TODO: Implement Slack/PagerDuty integration
  logger.info('Triggering SLA alert', {
    companyId,
    platform,
    breaches: breaches.map(b => ({
      type: b.type,
      severity: b.severity,
      threshold: b.threshold,
      actual: b.actual,
    })),
  });

  // Example Slack webhook payload structure:
  const slackPayload = {
    text: `🚨 SLA ${breaches[0].severity.toUpperCase()} Alert`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `Impact-In SLA ${breaches[0].severity === 'critical' ? 'BREACH' : 'WARNING'}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Company:*\n${companyId}`,
          },
          {
            type: 'mrkdwn',
            text: `*Platform:*\n${platform || 'All'}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: breaches.map(b =>
            `• *${b.type}*: ${(b.actual * 100).toFixed(2)}% (threshold: ${(b.threshold * 100).toFixed(2)}%)`
          ).join('\n'),
        },
      },
    ],
  };

  // TODO: Send to Slack webhook
  // await fetch(process.env.SLACK_WEBHOOK_URL, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(slackPayload),
  // });
}

/**
 * Generate weekly SLA report
 */
export async function generateWeeklySLAReport(companyId: string): Promise<{
  period: { start: Date; end: Date };
  overall: DeliveryMetrics & { slaStatus: SLAStatus };
  byPlatform: PlatformSLAMetrics[];
  recommendations: string[];
}> {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 7);

  const slaStatus = await getSLAStatus(companyId, start, end);

  // Generate recommendations based on metrics
  const recommendations: string[] = [];

  if (slaStatus.overall.successRate < SLA_THRESHOLDS.WARNING_SUCCESS_RATE) {
    recommendations.push('Success rate below warning threshold. Review failed deliveries and platform connectivity.');
  }

  if (slaStatus.overall.avgDeliveryLatencyMs > SLA_THRESHOLDS.MAX_DELIVERY_LATENCY_MS * 0.8) {
    recommendations.push('Delivery latency approaching threshold. Consider optimizing payload size or platform response time.');
  }

  if (slaStatus.overall.maxRetries >= 3) {
    recommendations.push('Multiple deliveries requiring maximum retries. Investigate platform reliability or network issues.');
  }

  for (const platform of slaStatus.byPlatform) {
    if (platform.slaStatus === SLAStatus.BREACH) {
      recommendations.push(`${platform.platform} platform experiencing SLA breaches. Immediate attention required.`);
    }
  }

  return {
    period: { start, end },
    overall: slaStatus.overall,
    byPlatform: slaStatus.byPlatform,
    recommendations,
  };
}

/**
 * Get delivery timeline for UI visualization (last 30 deliveries)
 */
export async function getDeliveryTimeline(
  companyId: string,
  limit: number = 30
): Promise<Array<{
  id: string;
  platform: string;
  status: string;
  attemptCount: number;
  createdAt: Date;
  deliveredAt: Date | null;
  latencyMs: number | null;
  payloadSample: any;
}>> {
  const deliveries = await db
    .select({
      id: impactDeliveries.id,
      platform: impactDeliveries.provider,
      status: impactDeliveries.status,
      attemptCount: impactDeliveries.attemptCount,
      createdAt: impactDeliveries.createdAt,
      deliveredAt: impactDeliveries.deliveredAt,
      payloadSample: impactDeliveries.payloadSample,
    })
    .from(impactDeliveries)
    .where(eq(impactDeliveries.companyId, companyId))
    .orderBy(desc(impactDeliveries.createdAt))
    .limit(limit);

  return deliveries.map(d => ({
    id: d.id,
    platform: d.platform,
    status: d.status,
    attemptCount: d.attemptCount,
    createdAt: d.createdAt,
    deliveredAt: d.deliveredAt,
    latencyMs: d.deliveredAt
      ? d.deliveredAt.getTime() - d.createdAt.getTime()
      : null,
    payloadSample: d.payloadSample,
  }));
}

/**
 * Helper: Get start of current week (Monday)
 */
function getWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Monday start
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Start SLA monitoring daemon (runs every hour)
 */
export function startSLAMonitoring(): void {
  logger.info('Starting SLA monitoring daemon...');

  // Monitor all active companies every hour
  setInterval(async () => {
    try {
      // Get all companies with active schedules
      const companies = await db
        .select({ companyId: scheduledDeliveries.companyId })
        .from(scheduledDeliveries)
        .where(eq(scheduledDeliveries.active, true))
        .groupBy(scheduledDeliveries.companyId);

      logger.info(`Monitoring SLA for ${companies.length} companies`);

      for (const { companyId } of companies) {
        await monitorSLACompliance(companyId);
      }
    } catch (error) {
      logger.error('SLA monitoring error:', error);
    }
  }, 60 * 60 * 1000); // Every hour

  logger.info('SLA monitoring started');
}
