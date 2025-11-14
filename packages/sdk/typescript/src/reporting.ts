/**
 * Reporting Service Client
 * Gen-AI powered report generation with citations and cost tracking
 */

import { TEEIClient } from './client';
import { GenerateReportRequest, GenerateReportResponse, CostSummaryResponse } from './types';

export class ReportingService {
  constructor(private client: TEEIClient) {}

  /**
   * Generate AI report with citations
   *
   * Generates a CSR impact report using AI with evidence-based citations.
   * Automatically redacts PII before sending to LLM and tracks full lineage.
   *
   * @param request - Report generation parameters
   * @returns Generated report with sections, citations, and lineage
   *
   * @example
   * ```typescript
   * const report = await sdk.reporting.generateReport({
   *   companyId: '550e8400-e29b-41d4-a716-446655440000',
   *   period: {
   *     start: '2024-01-01',
   *     end: '2024-12-31',
   *   },
   *   locale: 'en',
   *   sections: ['impact-summary', 'sroi-narrative'],
   *   deterministic: false,
   *   temperature: 0.7,
   * });
   *
   * console.log(`Report ID: ${report.reportId}`);
   * console.log(`Sections: ${report.sections.length}`);
   * console.log(`Cost: $${report.lineage.estimatedCostUsd}`);
   * ```
   */
  async generateReport(request: GenerateReportRequest): Promise<GenerateReportResponse> {
    return this.client.post<GenerateReportResponse>('/gen-reports/generate', request);
  }

  /**
   * Get cost summary for generated reports
   *
   * Returns aggregated AI cost metrics for monitoring spend.
   *
   * @returns Cost summary with total spend, request count, and breakdown by model
   *
   * @example
   * ```typescript
   * const summary = await sdk.reporting.getCostSummary();
   * console.log(`Total Cost: $${summary.totalCostUsd}`);
   * console.log(`Requests: ${summary.requestsCount}`);
   * console.log(`Avg Cost: $${summary.avgCostPerRequest}`);
   * ```
   */
  async getCostSummary(): Promise<CostSummaryResponse> {
    return this.client.get<CostSummaryResponse>('/gen-reports/cost-summary');
  }
}
