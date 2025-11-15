/**
 * Reporting API Client
 * Handles Gen-AI report generation with citations, cost tracking, and lineage.
 *
 * Features:
 * - Report generation with narrative controls
 * - Cost summary and budget tracking
 * - Retry logic with exponential backoff
 * - Feature flag for dev mode (mock data fallback)
 * - Comprehensive error handling
 *
 * @module api/reporting
 */

import type {
  GenerateReportRequest as FrontendReportRequest,
  GeneratedReport,
  Citation,
  ReportSection,
  ReportMetadata,
} from '../types/reports';

import type {
  GenerateReportRequest as APIReportRequest,
  GenerateReportResponse,
  CostSummaryResponse,
  LineageMetadata,
  APISection,
} from '@teei/shared-types';

// ==================== CONFIGURATION ====================

interface ReportingClientConfig {
  /**
   * Base URL for the API
   * @default '/v1' (relative to current origin)
   */
  baseURL?: string;

  /**
   * Enable real API calls (vs mock data in dev mode)
   * @default process.env.PUBLIC_USE_REAL_API === 'true'
   */
  useRealAPI?: boolean;

  /**
   * Request timeout in milliseconds
   * @default 60000 (60 seconds - report generation can be slow)
   */
  timeout?: number;

  /**
   * Maximum retry attempts for failed requests
   * @default 3
   */
  maxRetries?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

const DEFAULT_CONFIG: Required<ReportingClientConfig> = {
  baseURL: '/v1',
  useRealAPI: typeof process !== 'undefined' && process.env?.PUBLIC_USE_REAL_API === 'true',
  timeout: 60000,
  maxRetries: 3,
  debug: false,
};

// ==================== ERROR TYPES ====================

export class ReportingAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ReportingAPIError';
  }

  isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  isBudgetExceeded(): boolean {
    return this.statusCode === 403 && this.message.includes('budget');
  }

  isServerError(): boolean {
    return this.statusCode !== undefined && this.statusCode >= 500;
  }
}

// ==================== API CLIENT ====================

export class ReportingClient {
  private config: Required<ReportingClientConfig>;

  constructor(config: ReportingClientConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate AI report with citations
   */
  async generateReport(request: FrontendReportRequest, companyId: string): Promise<GeneratedReport> {
    if (!this.config.useRealAPI) {
      return this.generateMockReport(request, companyId);
    }

    try {
      // Map frontend request to API request
      const apiRequest = this.mapToAPIRequest(request, companyId);

      this.log('Generating report', { request: apiRequest });

      // Make API call with retry logic
      const response = await this.fetchWithRetry<GenerateReportResponse>(
        `${this.config.baseURL}/gen-reports/generate`,
        {
          method: 'POST',
          body: JSON.stringify(apiRequest),
        }
      );

      this.log('Report generated', { reportId: response.reportId });

      // Map API response to frontend format
      return this.mapToFrontendReport(response, request);
    } catch (error) {
      this.logError('Failed to generate report', error);
      throw error;
    }
  }

  /**
   * Get cost summary for AI report generation
   */
  async getCostSummary(companyId?: string): Promise<CostSummaryResponse> {
    if (!this.config.useRealAPI) {
      return this.getMockCostSummary();
    }

    try {
      const url = companyId
        ? `${this.config.baseURL}/gen-reports/cost-summary?companyId=${companyId}`
        : `${this.config.baseURL}/gen-reports/cost-summary`;

      this.log('Fetching cost summary', { companyId });

      const response = await this.fetchWithRetry<CostSummaryResponse>(url);

      this.log('Cost summary retrieved', response);

      return response;
    } catch (error) {
      this.logError('Failed to get cost summary', error);
      throw error;
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Fetch with retry logic and exponential backoff
   */
  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    attempt: number = 1
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Extract rate limit info
        if (response.status === 429) {
          const retryAfter = response.headers.get('X-RateLimit-Reset');
          const remaining = response.headers.get('X-RateLimit-Remaining');
          throw new ReportingAPIError(
            `Rate limit exceeded. ${remaining ? `${remaining} requests remaining.` : ''} ${retryAfter ? `Reset at ${new Date(parseInt(retryAfter) * 1000).toLocaleTimeString()}` : ''}`,
            429,
            { retryAfter, remaining }
          );
        }

        // Extract error message
        const message = errorData.message || errorData.error || `API error: ${response.statusText}`;
        throw new ReportingAPIError(message, response.status, errorData.details);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      // Don't retry on certain errors
      if (
        error instanceof ReportingAPIError &&
        (error.statusCode === 400 || error.statusCode === 401 || error.statusCode === 403)
      ) {
        throw error;
      }

      // Retry on network errors or 5xx errors
      if (attempt < this.config.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
        this.log(`Retry attempt ${attempt} after ${delay}ms`, { error });
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithRetry<T>(url, options, attempt + 1);
      }

      // Transform error
      if (error instanceof ReportingAPIError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ReportingAPIError('Request timeout', undefined, { timeout: this.config.timeout });
        }
        throw new ReportingAPIError(error.message, undefined, error);
      }

      throw new ReportingAPIError('Unknown error occurred', undefined, error);
    }
  }

  /**
   * Get authentication headers (JWT from session/cookie)
   */
  private getAuthHeaders(): Record<string, string> {
    // In production, this would get the JWT from a cookie or session
    // For now, return empty - auth is handled by Astro middleware
    return {};
  }

  /**
   * Map frontend request to API request format
   */
  private mapToAPIRequest(request: FrontendReportRequest, companyId: string): APIReportRequest {
    // Map narrative settings to API parameters
    const temperature = this.mapToneToTemperature(request.options?.tone);
    const maxTokens = this.mapLengthToTokens(request.options?.length);
    const language = this.mapLocale(request.options?.tone);

    return {
      companyId,
      period: {
        start: request.period.from,
        end: request.period.to,
      },
      options: {
        temperature,
        maxTokens,
        language,
        seed: request.options?.deterministic ? 42 : undefined,
      },
    };
  }

  /**
   * Map API response to frontend format
   */
  private mapToFrontendReport(
    response: GenerateReportResponse,
    originalRequest: FrontendReportRequest
  ): GeneratedReport {
    // Build citation index for replacement
    const citationMap = new Map<number, any>();
    let citationCounter = 0;

    response.sections.forEach((section: APISection) => {
      section.citations.forEach((citation: any) => {
        citationCounter++;
        citationMap.set(citationCounter, citation);
      });
    });

    return {
      reportId: response.reportId,
      reportType: originalRequest.reportType,
      status: 'draft',
      sections: response.sections.map((section: APISection, index: number) => {
        // Transform citation markers from [1], [2], [3] to [citation:snippetId]
        let transformedContent = section.content;
        section.citations.forEach((citation: any, citationIndex: number) => {
          const marker = `[${citationIndex + 1}]`;
          const snippetId = citation.snippetId || citation.evidenceId || 'unknown';
          const replacement = `[citation:${snippetId}]`;
          transformedContent = transformedContent.replace(new RegExp(`\\${marker}`, 'g'), replacement);
        });

        return {
          title: this.getSectionTitle(section.type),
          content: transformedContent,
          order: index + 1,
        };
      }),
      citations: response.sections.flatMap((section: APISection) =>
        section.citations.map((citation: any) => this.mapCitation(citation))
      ),
      metadata: this.mapLineageToMetadata(response.lineage),
      period: {
        from: originalRequest.period.from,
        to: originalRequest.period.to,
      },
      createdAt: response.lineage.timestamp,
      updatedAt: response.lineage.timestamp,
    };
  }

  /**
   * Map citation from API to frontend format
   */
  private mapCitation(citation: any): Citation {
    return {
      id: citation.id || citation.snippetId || 'unknown',
      evidenceId: citation.evidenceId || citation.snippetId || 'unknown',
      snippetText: citation.snippetText || citation.text || '',
      source: citation.source || `Evidence ${(citation.snippetId || citation.evidenceId || '').slice(0, 8)}`,
      confidence: citation.confidence ?? citation.relevanceScore ?? 0.85,
    };
  }

  /**
   * Map lineage metadata to frontend format
   */
  private mapLineageToMetadata(lineage: LineageMetadata): ReportMetadata {
    return {
      model: lineage.modelName,
      promptVersion: lineage.promptVersion,
      tokensUsed: lineage.tokensUsed,
      seed: undefined, // Not returned by API
      generatedAt: lineage.timestamp,
    };
  }

  /**
   * Map tone to temperature
   */
  private mapToneToTemperature(tone?: string): number {
    switch (tone) {
      case 'professional':
      case 'formal':
        return 0.3;
      case 'technical':
        return 0.2;
      case 'inspiring':
      case 'conversational':
        return 0.7;
      default:
        return 0.5;
    }
  }

  /**
   * Map length to max tokens
   */
  private mapLengthToTokens(length?: string): number {
    switch (length) {
      case 'brief':
        return 800;
      case 'standard':
        return 2000;
      case 'detailed':
        return 4000;
      default:
        return 2000;
    }
  }

  /**
   * Map locale to API language
   */
  private mapLocale(_tone?: string): 'en' | 'no' | 'uk' {
    // API supports en, no, uk
    // Default to en for all tones
    return 'en';
  }

  /**
   * Get user-friendly section title
   */
  private getSectionTitle(sectionType: string): string {
    switch (sectionType) {
      case 'impact-summary':
        return 'Impact Summary';
      case 'sroi-narrative':
        return 'Social Return on Investment';
      case 'outcome-trends':
        return 'Outcome Trends & Analysis';
      default:
        return sectionType
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
    }
  }

  // ==================== MOCK DATA (DEV MODE) ====================

  /**
   * Generate mock report for development
   */
  private async generateMockReport(
    request: FrontendReportRequest,
    companyId: string
  ): Promise<GeneratedReport> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    this.log('Generating mock report', { request, companyId });

    const mockCitations: Citation[] = [
      {
        id: 'cite-0',
        evidenceId: 'snip_abc123',
        snippetText: '150 young participants completed the program with 450 total sessions',
        source: 'Program Data 2024',
        confidence: 0.95,
      },
      {
        id: 'cite-1',
        evidenceId: 'snip_def456',
        snippetText: 'Belonging scores increased from 0.45 to 0.82 (82% improvement)',
        source: 'Outcome Surveys Q1-Q4 2024',
        confidence: 0.92,
      },
      {
        id: 'cite-2',
        evidenceId: 'snip_ghi789',
        snippetText: 'Confidence dimension showed 78% positive trajectory',
        source: 'Wellbeing Assessment 2024',
        confidence: 0.89,
      },
    ];

    const mockSections: ReportSection[] = [
      {
        title: 'Impact Summary',
        content: `Sample Company achieved remarkable impact in 2024, engaging 150 participants through 450 mentorship sessions [citation:snip_abc123]. The program demonstrated strong outcomes across multiple dimensions, with participants showing 82% improvement in belonging [citation:snip_def456] and 78% increase in confidence [citation:snip_ghi789].

The initiative successfully created measurable social value while maintaining cost-effectiveness and scalability. Evidence-based analysis confirms sustained improvement across key wellbeing indicators.`,
        order: 1,
      },
      {
        title: 'Social Return on Investment',
        content: `Based on comprehensive data analysis, the program generated an estimated SROI of 3.2:1, meaning every dollar invested created $3.20 in social value [citation:snip_abc123]. This calculation accounts for participant outcomes, community impact, and long-term wellbeing improvements.

Key value drivers include enhanced belonging [citation:snip_def456], improved confidence [citation:snip_ghi789], and stronger community integration. The program's evidence-based approach ensures transparency and accountability in impact measurement.`,
        order: 2,
      },
    ];

    return {
      reportId: `rpt_mock_${Date.now()}`,
      reportType: request.reportType,
      status: 'draft',
      sections: mockSections,
      citations: mockCitations,
      metadata: {
        model: 'gpt-4-turbo (mock)',
        promptVersion: 'v2.1.0',
        tokensUsed: 1500,
        seed: request.options?.deterministic ? 42 : undefined,
        generatedAt: new Date().toISOString(),
      },
      period: request.period,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get mock cost summary for development
   */
  private async getMockCostSummary(): Promise<CostSummaryResponse> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    this.log('Fetching mock cost summary');

    return {
      totalCostUsd: '45.67',
      requestsCount: 234,
      totalTokens: 567890,
      avgCostPerRequest: '0.195',
      byModel: [
        {
          modelName: 'gpt-4-turbo',
          requestsCount: 200,
          totalCostUsd: '40.00',
          totalTokens: 500000,
        },
        {
          modelName: 'gpt-3.5-turbo',
          requestsCount: 34,
          totalCostUsd: '5.67',
          totalTokens: 67890,
        },
      ],
    };
  }

  // ==================== LOGGING ====================

  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[ReportingClient] ${message}`, data || '');
    }
  }

  private logError(message: string, error: any): void {
    if (this.config.debug) {
      console.error(`[ReportingClient] ${message}`, error);
    }
  }
}

// ==================== SINGLETON INSTANCE ====================

/**
 * Default reporting client instance
 * Configure via environment variables:
 * - PUBLIC_USE_REAL_API=true - Enable real API calls
 * - PUBLIC_REPORTING_DEBUG=true - Enable debug logging
 */
export const reportingClient = new ReportingClient({
  useRealAPI: typeof process !== 'undefined' && process.env?.PUBLIC_USE_REAL_API === 'true',
  debug: typeof process !== 'undefined' && process.env?.PUBLIC_REPORTING_DEBUG === 'true',
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate estimated cost for a report generation request
 */
export function estimateReportCost(request: FrontendReportRequest): {
  estimatedTokens: number;
  estimatedCostUsd: string;
  modelName: string;
} {
  const baseTokens = 800; // Base prompt + context
  const lengthMultiplier =
    request.options?.length === 'brief' ? 0.5 : request.options?.length === 'detailed' ? 2 : 1;

  const estimatedTokens = Math.round(baseTokens * lengthMultiplier);

  // GPT-4 Turbo pricing (as of 2024): $0.01/1K input, $0.03/1K output
  const inputCost = (estimatedTokens * 0.6 * 0.01) / 1000; // 60% input
  const outputCost = (estimatedTokens * 0.4 * 0.03) / 1000; // 40% output
  const totalCost = inputCost + outputCost;

  return {
    estimatedTokens,
    estimatedCostUsd: totalCost.toFixed(4),
    modelName: 'gpt-4-turbo',
  };
}

/**
 * Format cost as currency
 */
export function formatCost(costUsd: string | number): string {
  const cost = typeof costUsd === 'string' ? parseFloat(costUsd) : costUsd;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(cost);
}

/**
 * Check if cost is approaching budget limit
 */
export function checkBudgetWarning(
  totalCostUsd: string,
  monthlyBudgetUsd: number,
  warningThreshold: number = 0.8
): {
  isWarning: boolean;
  percentUsed: number;
  remaining: string;
} {
  const totalCost = parseFloat(totalCostUsd);
  const percentUsed = totalCost / monthlyBudgetUsd;
  const remaining = Math.max(0, monthlyBudgetUsd - totalCost);

  return {
    isWarning: percentUsed >= warningThreshold,
    percentUsed,
    remaining: remaining.toFixed(2),
  };
}
