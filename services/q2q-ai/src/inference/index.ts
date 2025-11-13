/**
 * Q2Q AI Inference System
 *
 * Provider-agnostic AI inference for text classification
 * with support for Claude, OpenAI, and Gemini
 */

export { getInferenceDriver, InferenceDriver } from './driver.js';
export { ClaudeProvider } from './providers/claude.js';
export { OpenAIProvider } from './providers/openai.js';
export { GeminiProvider } from './providers/gemini.js';
export { withRetry, DEFAULT_RETRY_CONFIG } from './retry.js';
export { buildClassificationPrompt, extractJSON, SYSTEM_PROMPT, FEW_SHOT_EXAMPLES } from './prompt.js';
export type {
  AIProvider,
  AIProviderAdapter,
  InferenceRequest,
  InferenceResult,
  TokenUsage,
  CostEstimate,
  ProviderConfig,
  RetryConfig,
  InferenceError,
  ProviderNotConfiguredError,
  RateLimitError,
  InvalidResponseError
} from './types.js';
