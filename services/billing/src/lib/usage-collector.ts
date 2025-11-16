/**
 * Usage Collector
 * Aggregates per-tenant infrastructure and AI usage metrics
 * Integrates with @teei/observability for AI cost tracking
 */

import type { UsageMetric } from '../types/index.js';

interface InfraMetricsSource {
  getComputeHours(tenantId: string, start: Date, end: Date): Promise<number>;
  getStorageGB(tenantId: string, timestamp: Date): Promise<number>;
  getBandwidthGB(tenantId: string, start: Date, end: Date): Promise<number>;
  getDbQueries(tenantId: string, start: Date, end: Date): Promise<number>;
}

interface AIMetricsSource {
  getTokenUsage(tenantId: string, start: Date, end: Date): Promise<{
    inputTokens: number;
    outputTokens: number;
    totalCostUSD: number;
    modelBreakdown: Record<string, { inputTokens: number; outputTokens: number; costUSD: number }>;
  }>;
}

export class UsageCollector {
  constructor(
    private infraSource: InfraMetricsSource,
    private aiSource: AIMetricsSource,
  ) {}

  /**
   * Collect usage metrics for a tenant over a time period
   */
  async collect(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    region: 'eu-west-1' | 'us-east-1' | 'ap-southeast-1' = 'eu-west-1',
  ): Promise<UsageMetric> {
    // Collect infra metrics in parallel
    const [computeHours, storageGB, bandwidthGB, dbQueries] = await Promise.all([
      this.infraSource.getComputeHours(tenantId, periodStart, periodEnd),
      this.infraSource.getStorageGB(tenantId, periodEnd),
      this.infraSource.getBandwidthGB(tenantId, periodStart, periodEnd),
      this.infraSource.getDbQueries(tenantId, periodStart, periodEnd),
    ]);

    // Collect AI metrics
    const aiMetrics = await this.aiSource.getTokenUsage(tenantId, periodStart, periodEnd);

    // Calculate infrastructure costs (using DEFAULT_PRICING from types)
    const infraCost =
      computeHours * 0.05 +
      storageGB * 0.02 +
      bandwidthGB * 0.09 +
      (dbQueries / 1000) * 0.001;

    const totalCostUSD = infraCost + aiMetrics.totalCostUSD;

    return {
      tenantId,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      infra: {
        computeHours,
        storageGB,
        bandwidthGB,
        dbQueries,
      },
      ai: aiMetrics,
      totalCostUSD,
      region,
    };
  }

  /**
   * Collect hourly snapshot (for real-time monitoring)
   */
  async collectHourly(tenantId: string, region?: 'eu-west-1' | 'us-east-1' | 'ap-southeast-1'): Promise<UsageMetric> {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    return this.collect(tenantId, hourAgo, now, region);
  }

  /**
   * Collect daily rollup
   */
  async collectDaily(tenantId: string, date: Date, region?: 'eu-west-1' | 'us-east-1' | 'ap-southeast-1'): Promise<UsageMetric> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    return this.collect(tenantId, dayStart, dayEnd, region);
  }

  /**
   * Collect monthly rollup (for invoicing)
   */
  async collectMonthly(
    tenantId: string,
    year: number,
    month: number,
    region?: 'eu-west-1' | 'us-east-1' | 'ap-southeast-1'
  ): Promise<UsageMetric> {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    return this.collect(tenantId, monthStart, monthEnd, region);
  }

  /**
   * Collect usage for all active tenants (batch job)
   */
  async collectAllTenants(
    tenantIds: string[],
    periodStart: Date,
    periodEnd: Date,
  ): Promise<UsageMetric[]> {
    return Promise.all(
      tenantIds.map((id) => this.collect(id, periodStart, periodEnd))
    );
  }
}

/**
 * Prometheus-based Infrastructure Metrics Source
 * Queries Prometheus for compute, storage, bandwidth, DB metrics
 */
export class PrometheusInfraSource implements InfraMetricsSource {
  constructor(private prometheusUrl: string) {}

  async getComputeHours(tenantId: string, start: Date, end: Date): Promise<number> {
    // Query: sum(rate(container_cpu_usage_seconds_total{tenant_id="..."}[1h])) * duration_hours
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    // Simplified calculation (real implementation would query Prometheus)
    // For now, estimate based on typical pod allocation
    const avgPods = 2; // 2 pods per tenant on average
    const avgCPUCores = 0.5; // 0.5 CPU per pod
    return avgPods * avgCPUCores * durationHours;
  }

  async getStorageGB(tenantId: string, timestamp: Date): Promise<number> {
    // Query: sum(container_fs_usage_bytes{tenant_id="..."}) / (1024^3)
    // Simplified: estimate based on data volume
    return 10.0; // 10 GB default
  }

  async getBandwidthGB(tenantId: string, start: Date, end: Date): Promise<number> {
    // Query: sum(rate(container_network_transmit_bytes_total{tenant_id="..."}[1h])) * duration_seconds / (1024^3)
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const avgMbpsPerHour = 0.5; // 0.5 Mbps average
    return (avgMbpsPerHour * durationHours * 3600) / 8 / 1024; // Convert to GB
  }

  async getDbQueries(tenantId: string, start: Date, end: Date): Promise<number> {
    // Query: sum(increase(pg_stat_statements_calls{tenant_id="..."}[duration]))
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const avgQueriesPerHour = 1000;
    return Math.floor(avgQueriesPerHour * durationHours);
  }
}

/**
 * Observability-based AI Metrics Source
 * Integrates with existing @teei/observability/ai-costs.ts
 */
export class ObservabilityAISource implements AIMetricsSource {
  async getTokenUsage(tenantId: string, start: Date, end: Date) {
    // Integration point with @teei/observability/src/ai-costs.ts
    // Real implementation would query Prometheus metrics:
    //   - ai_tokens_total{tenant_id, model, type="input"}
    //   - ai_tokens_total{tenant_id, model, type="output"}
    //   - ai_cost_usd_total{tenant_id, model}

    // Simplified calculation for now
    const modelBreakdown = {
      'claude-3-sonnet': {
        inputTokens: 50000,
        outputTokens: 20000,
        costUSD: (50000 / 1000) * 0.003 + (20000 / 1000) * 0.015, // $0.45
      },
      'claude-3-haiku': {
        inputTokens: 100000,
        outputTokens: 40000,
        costUSD: (100000 / 1000) * 0.00025 + (40000 / 1000) * 0.00125, // $0.075
      },
    };

    const inputTokens = Object.values(modelBreakdown).reduce((sum, m) => sum + m.inputTokens, 0);
    const outputTokens = Object.values(modelBreakdown).reduce((sum, m) => sum + m.outputTokens, 0);
    const totalCostUSD = Object.values(modelBreakdown).reduce((sum, m) => sum + m.costUSD, 0);

    return {
      inputTokens,
      outputTokens,
      totalCostUSD,
      modelBreakdown,
    };
  }
}

/**
 * Factory for creating usage collector with default sources
 */
export function createUsageCollector(prometheusUrl?: string): UsageCollector {
  const infraSource = new PrometheusInfraSource(prometheusUrl || 'http://prometheus:9090');
  const aiSource = new ObservabilityAISource();
  return new UsageCollector(infraSource, aiSource);
}
