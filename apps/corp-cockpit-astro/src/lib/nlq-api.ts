/**
 * NLQ API Client
 *
 * Client functions for Natural Language Query service
 * Handles question submission, query retrieval, and history fetching
 */

import { createApiClient, type ApiError } from './api';

const NLQ_SERVICE_URL = process.env.NLQ_SERVICE_URL || 'http://localhost:3011';

// ===== TYPES =====

export interface NLQAskRequest {
  question: string;
  companyId: string;
  context?: {
    previousQueryId?: string;
    filters?: Record<string, any>;
    language?: 'en' | 'uk' | 'no' | 'es' | 'fr';
  };
  userId?: string;
  sessionId?: string;
}

export interface ConfidenceScore {
  overall: number;
  level: 'high' | 'medium' | 'low';
  components: {
    intentConfidence: number;
    dataCompleteness: number;
    sampleSizeScore: number;
    recencyScore: number;
    ambiguityPenalty: number;
  };
  weights: {
    intent: number;
    dataCompleteness: number;
    sampleSize: number;
    recency: number;
    ambiguity: number;
  };
  recommendations: string[];
}

export interface AnswerLineage {
  sources: Array<{
    sourceType: string;
    sourceId: string;
    tableName?: string;
    confidence: number;
  }>;
  transformations: string[];
  calculationSteps?: string[];
}

export interface Visualization {
  type: 'table' | 'chart' | 'metric';
  chartType?: 'line' | 'bar' | 'pie' | 'area';
  config?: Record<string, any>;
}

export interface NLQAnswer {
  summary: string;
  data: any[];
  confidence: ConfidenceScore;
  lineage: AnswerLineage;
  visualization?: Visualization;
}

export interface NLQMetadata {
  executionTimeMs: number;
  cached: boolean;
  safetyPassed: boolean;
  intent: string;
  templateId: string;
  tokensUsed: number;
  estimatedCostUSD: string;
}

export interface NLQResponse {
  queryId: string;
  answer: NLQAnswer;
  metadata: NLQMetadata;
}

export interface QueryHistoryItem {
  id: string;
  question: string;
  normalizedQuestion: string | null;
  intent: string;
  intentConfidence: number | null;
  templateName: string | null;
  executionStatus: 'pending' | 'success' | 'failed' | 'rejected';
  resultRowCount: number | null;
  executionTimeMs: number | null;
  answerConfidence: number | null;
  answerSummary: string | null;
  cached: boolean;
  safetyPassed: boolean;
  createdAt: string;
}

export interface QueryHistoryResponse {
  queries: QueryHistoryItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface QueryHistoryParams {
  companyId: string;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  status?: 'pending' | 'success' | 'failed' | 'rejected';
}

export interface QueryDetailsResponse {
  queryId: string;
  status: string;
  question: string;
  normalizedQuestion: string | null;
  intent: string;
  template: {
    id: string | null;
    name: string | null;
  };
  query: {
    sql: string | null;
    chql: string | null;
    preview: string | null;
  };
  safety: {
    passed: boolean;
    violations: any;
    details: any;
  };
  execution: {
    status: string;
    rowCount: number | null;
    executionTimeMs: number | null;
  };
  answer: {
    summary: string | null;
    confidence: number | null;
    lineage: any;
  };
  metadata: {
    cached: boolean;
    cacheKey: string | null;
    modelName: string | null;
    tokensUsed: number | null;
    estimatedCostUsd: string | null;
    createdAt: string;
  };
}

export interface RateLimitError {
  error: string;
  message: string;
  limits: {
    daily: number;
    hourly: number;
  };
  resetAt: string;
}

// ===== API CLIENT =====

export class NLQApiClient {
  private client: ReturnType<typeof createApiClient>;

  constructor(token?: string) {
    this.client = createApiClient(token);
    // Override base URL for NLQ service
    (this.client as any).baseUrl = NLQ_SERVICE_URL;
  }

  /**
   * Submit a natural language question and get an answer
   */
  async ask(request: NLQAskRequest): Promise<NLQResponse> {
    return this.client.post<NLQResponse>('/v1/nlq/ask', request);
  }

  /**
   * Get query details by ID
   */
  async getQuery(queryId: string): Promise<QueryDetailsResponse> {
    return this.client.get<QueryDetailsResponse>(`/v1/nlq/queries/${queryId}`);
  }

  /**
   * Get query history for a company
   */
  async getHistory(params: QueryHistoryParams): Promise<QueryHistoryResponse> {
    const queryString = new URLSearchParams();
    queryString.append('companyId', params.companyId);

    if (params.limit !== undefined) {
      queryString.append('limit', params.limit.toString());
    }
    if (params.offset !== undefined) {
      queryString.append('offset', params.offset.toString());
    }
    if (params.startDate) {
      queryString.append('startDate', params.startDate);
    }
    if (params.endDate) {
      queryString.append('endDate', params.endDate);
    }
    if (params.status) {
      queryString.append('status', params.status);
    }

    return this.client.get<QueryHistoryResponse>(`/v1/nlq/history?${queryString.toString()}`);
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Create an NLQ API client instance
 */
export function createNLQClient(token?: string): NLQApiClient {
  return new NLQApiClient(token);
}

/**
 * Submit a question directly
 */
export async function askQuestion(
  question: string,
  companyId: string,
  options?: {
    context?: NLQAskRequest['context'];
    userId?: string;
    sessionId?: string;
    token?: string;
  }
): Promise<NLQResponse> {
  const client = createNLQClient(options?.token);
  return client.ask({
    question,
    companyId,
    context: options?.context,
    userId: options?.userId,
    sessionId: options?.sessionId,
  });
}

/**
 * Get query history for a company
 */
export async function getQueryHistory(
  companyId: string,
  options?: {
    limit?: number;
    offset?: number;
    token?: string;
  }
): Promise<QueryHistoryResponse> {
  const client = createNLQClient(options?.token);
  return client.getHistory({
    companyId,
    limit: options?.limit,
    offset: options?.offset,
  });
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: any): error is RateLimitError {
  return error && error.error === 'Rate limit exceeded';
}

/**
 * Get confidence level color class
 */
export function getConfidenceColor(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high':
      return 'text-green-600 dark:text-green-400';
    case 'medium':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'low':
      return 'text-red-600 dark:text-red-400';
  }
}

/**
 * Format execution time for display
 */
export function formatExecutionTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format confidence score as percentage
 */
export function formatConfidence(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}
