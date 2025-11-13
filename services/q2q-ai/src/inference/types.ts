import { ClassificationOutput } from '../labels.js';

/**
 * Supported AI providers
 */
export enum AIProvider {
  CLAUDE = 'claude',
  OPENAI = 'openai',
  GEMINI = 'gemini'
}

/**
 * Inference request configuration
 */
export interface InferenceRequest {
  text: string;
  correlationId?: string;
  userId?: string;
  contextType?: string;
}

/**
 * Token usage metrics
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Cost estimation (in USD)
 */
export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: 'USD';
}

/**
 * Inference result with metadata
 */
export interface InferenceResult {
  classification: ClassificationOutput;
  provider: AIProvider;
  modelName: string;
  tokens: TokenUsage;
  cost: CostEstimate;
  latencyMs: number;
  timestamp: string;
  correlationId: string;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Provider-specific configuration
 */
export interface ProviderConfig {
  apiKey: string;
  modelName?: string;
  maxTokens?: number;
  temperature?: number;
  retry?: Partial<RetryConfig>;
}

/**
 * Provider interface that all AI adapters must implement
 */
export interface AIProviderAdapter {
  readonly name: AIProvider;
  readonly modelName: string;

  /**
   * Classify text using the AI provider
   */
  classify(request: InferenceRequest): Promise<InferenceResult>;

  /**
   * Check if provider is configured and ready
   */
  isConfigured(): boolean;

  /**
   * Estimate cost for a given text without making API call
   */
  estimateCost(text: string): CostEstimate;
}

/**
 * Error types for inference operations
 */
export class InferenceError extends Error {
  constructor(
    message: string,
    public readonly provider: AIProvider,
    public readonly cause?: Error,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'InferenceError';
  }
}

export class ProviderNotConfiguredError extends InferenceError {
  constructor(provider: AIProvider) {
    super(`Provider ${provider} is not configured`, provider, undefined, false);
    this.name = 'ProviderNotConfiguredError';
  }
}

export class RateLimitError extends InferenceError {
  constructor(provider: AIProvider, retryAfterMs?: number) {
    super(
      `Rate limit exceeded for ${provider}${retryAfterMs ? `, retry after ${retryAfterMs}ms` : ''}`,
      provider,
      undefined,
      true
    );
    this.name = 'RateLimitError';
  }
}

export class InvalidResponseError extends InferenceError {
  constructor(provider: AIProvider, cause?: Error) {
    super(`Invalid response from ${provider}`, provider, cause, false);
    this.name = 'InvalidResponseError';
  }
}
