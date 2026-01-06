import { FastifyRequest, FastifyReply } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('reporting:cost-tracking');

export interface CostMetrics {
  requestId: string;
  companyId?: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  estimatedCostUsd: string;
  modelName: string;
  provider: string;
  timestamp: string;
  durationMs: number;
}

/**
 * Cost tracking middleware
 * Logs token usage and estimated costs per request
 */
export async function costTrackingMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const startTime = Date.now();
  const requestId = request.id || 'unknown';

  // Attach cost tracking helper to request
  (request as any).trackCost = (metrics: Partial<CostMetrics>) => {
    const durationMs = Date.now() - startTime;
    const costMetrics: CostMetrics = {
      requestId,
      companyId: metrics.companyId,
      tokensInput: metrics.tokensInput || 0,
      tokensOutput: metrics.tokensOutput || 0,
      tokensTotal: metrics.tokensTotal || (metrics.tokensInput || 0) + (metrics.tokensOutput || 0),
      estimatedCostUsd: metrics.estimatedCostUsd || '0',
      modelName: metrics.modelName || 'unknown',
      provider: metrics.provider || 'unknown',
      timestamp: new Date().toISOString(),
      durationMs,
    };

    logger.info('LLM API cost tracked', costMetrics);

    // In production, this could also:
    // - Store to database for billing
    // - Send to analytics platform
    // - Update company usage quotas
    // - Trigger alerts if costs exceed thresholds

    return costMetrics;
  };
}

/**
 * Cost aggregation for reporting
 */
export class CostAggregator {
  private costs: CostMetrics[] = [];

  addCost(metrics: CostMetrics): void {
    this.costs.push(metrics);
  }

  getTotalCost(): number {
    return this.costs.reduce((sum, c) => sum + parseFloat(c.estimatedCostUsd), 0);
  }

  getTotalTokens(): number {
    return this.costs.reduce((sum, c) => sum + c.tokensTotal, 0);
  }

  getCostsByCompany(): Map<string, number> {
    const byCompany = new Map<string, number>();

    for (const cost of this.costs) {
      if (cost.companyId) {
        const current = byCompany.get(cost.companyId) || 0;
        byCompany.set(cost.companyId, current + parseFloat(cost.estimatedCostUsd));
      }
    }

    return byCompany;
  }

  getCostsByModel(): Map<string, number> {
    const byModel = new Map<string, number>();

    for (const cost of this.costs) {
      const current = byModel.get(cost.modelName) || 0;
      byModel.set(cost.modelName, current + parseFloat(cost.estimatedCostUsd));
    }

    return byModel;
  }

  getSummary(): {
    totalCost: string;
    totalTokens: number;
    requestCount: number;
    avgCostPerRequest: string;
    avgTokensPerRequest: number;
  } {
    const totalCost = this.getTotalCost();
    const totalTokens = this.getTotalTokens();
    const requestCount = this.costs.length;

    return {
      totalCost: totalCost.toFixed(6),
      totalTokens,
      requestCount,
      avgCostPerRequest: (totalCost / requestCount).toFixed(6),
      avgTokensPerRequest: Math.round(totalTokens / requestCount),
    };
  }

  reset(): void {
    this.costs = [];
  }
}

// Global cost aggregator instance
const globalCostAggregator = new CostAggregator();

/**
 * Get global cost aggregator
 */
export function getCostAggregator(): CostAggregator {
  return globalCostAggregator;
}
