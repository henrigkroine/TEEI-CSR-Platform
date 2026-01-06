/**
 * SLA Tracker
 *
 * Monitors and tracks SLA compliance for DSAR operations
 */

import type { DsarJob, SlaConfig, SlaMetrics } from '../types/index.js';
import { DsrStatus, DsrRequestType } from '@teei/compliance';
import pino from 'pino';

const logger = pino({ name: 'sla-tracker' });

/**
 * SLA Tracker
 */
export class SlaTracker {
  private config: SlaConfig;
  private metrics: Map<DsrRequestType, SlaMetrics>;

  constructor(config: SlaConfig) {
    this.config = config;
    this.metrics = new Map();
  }

  /**
   * Track job completion
   */
  trackCompletion(job: DsarJob): void {
    if (!job.completedAt || !job.createdAt) {
      return;
    }

    const durationMs = job.completedAt.getTime() - job.createdAt.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    const slaHours = this.getSlaHours(job.requestType);
    const isCompliant = durationHours <= slaHours;

    // Update metrics
    const metrics = this.getOrCreateMetrics(job.requestType);
    metrics.totalRequests++;

    if (job.status === DsrStatus.COMPLETED) {
      metrics.completedRequests++;
    } else if (job.status === DsrStatus.FAILED) {
      metrics.failedRequests++;
    }

    // Update completion times
    this.updateCompletionTimes(metrics, durationHours);

    if (!isCompliant) {
      metrics.breaches++;
    }

    // Calculate SLA compliance percentage
    metrics.slaCompliance =
      (metrics.completedRequests / metrics.totalRequests) * 100;

    logger.info(
      {
        jobId: job.id,
        requestType: job.requestType,
        durationHours: durationHours.toFixed(2),
        slaHours,
        isCompliant,
        slaCompliance: metrics.slaCompliance.toFixed(2),
      },
      'SLA tracked'
    );
  }

  /**
   * Get metrics for request type
   */
  getMetrics(requestType: DsrRequestType): SlaMetrics {
    return this.getOrCreateMetrics(requestType);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, SlaMetrics> {
    const result: Record<string, SlaMetrics> = {};

    for (const [type, metrics] of this.metrics.entries()) {
      result[type] = metrics;
    }

    return result;
  }

  /**
   * Check if job is at risk of SLA breach
   */
  isAtRisk(job: DsarJob): boolean {
    if (job.status === DsrStatus.COMPLETED || job.status === DsrStatus.FAILED) {
      return false;
    }

    const now = new Date();
    const elapsed = now.getTime() - job.createdAt.getTime();
    const slaMs = this.getSlaHours(job.requestType) * 60 * 60 * 1000;

    // Consider at risk if > 80% of SLA time has elapsed
    return elapsed > slaMs * 0.8;
  }

  /**
   * Get estimated completion time
   */
  getEstimatedCompletion(job: DsarJob): Date | null {
    const metrics = this.metrics.get(job.requestType);
    if (!metrics || metrics.averageCompletionTime === 0) {
      // Use SLA as estimate if no historical data
      const slaMs = this.getSlaHours(job.requestType) * 60 * 60 * 1000;
      return new Date(job.createdAt.getTime() + slaMs);
    }

    const avgMs = metrics.averageCompletionTime * 60 * 60 * 1000;
    return new Date(job.createdAt.getTime() + avgMs);
  }

  /**
   * Get SLA hours for request type
   */
  private getSlaHours(requestType: DsrRequestType): number {
    switch (requestType) {
      case DsrRequestType.ERASURE:
        return this.config.deleteSla;
      case DsrRequestType.ACCESS:
      case DsrRequestType.PORTABILITY:
        return this.config.exportSla;
      default:
        return this.config.exportSla;
    }
  }

  /**
   * Get or create metrics
   */
  private getOrCreateMetrics(requestType: DsrRequestType): SlaMetrics {
    if (!this.metrics.has(requestType)) {
      this.metrics.set(requestType, {
        totalRequests: 0,
        completedRequests: 0,
        failedRequests: 0,
        averageCompletionTime: 0,
        p95CompletionTime: 0,
        p99CompletionTime: 0,
        slaCompliance: 100,
        breaches: 0,
      });
    }

    return this.metrics.get(requestType)!;
  }

  /**
   * Update completion time metrics
   */
  private updateCompletionTimes(metrics: SlaMetrics, durationHours: number): void {
    // Simple running average (in production, use time-series DB)
    const n = metrics.completedRequests;
    metrics.averageCompletionTime =
      (metrics.averageCompletionTime * (n - 1) + durationHours) / n;

    // Approximate percentiles (in production, use proper percentile calculation)
    if (durationHours > metrics.p95CompletionTime) {
      metrics.p95CompletionTime = durationHours;
    }

    if (durationHours > metrics.p99CompletionTime) {
      metrics.p99CompletionTime = durationHours;
    }
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics.clear();
    logger.info('SLA metrics reset');
  }
}

/**
 * Create SLA tracker
 */
export function createSlaTracker(config?: SlaConfig): SlaTracker {
  const defaultConfig: SlaConfig = {
    exportSla: 24,
    deleteSla: 72,
    statusSla: 5,
    consentSla: 2,
  };

  return new SlaTracker(config || defaultConfig);
}
