import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('reporting:llm-client');

export type LLMProvider = 'openai' | 'anthropic';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  seed?: number; // For deterministic generation
}

export interface LLMResponse {
  content: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  modelName: string;
  finishReason: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * LLM Client with retry logic and support for multiple providers
 * Supports OpenAI and Anthropic Claude APIs
 */
export class LLMClient {
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;

    if (config.provider === 'openai') {
      this.openaiClient = new OpenAI({
        apiKey: config.apiKey,
      });
    } else if (config.provider === 'anthropic') {
      this.anthropicClient = new Anthropic({
        apiKey: config.apiKey,
      });
    } else {
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }

    logger.info(`LLM Client initialized with provider: ${config.provider}, model: ${config.model}`);
  }

  /**
   * Generate completion with retry logic
   */
  async generateCompletion(
    messages: LLMMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      seed?: number;
    }
  ): Promise<LLMResponse> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        logger.info(`Attempting LLM completion (attempt ${attempt + 1}/${maxRetries})`);

        if (this.config.provider === 'openai') {
          return await this.callOpenAI(messages, options);
        } else if (this.config.provider === 'anthropic') {
          return await this.callAnthropic(messages, options);
        } else {
          throw new Error(`Unsupported provider: ${this.config.provider}`);
        }
      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries - 1;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);

        if (!isRetryable || isLastAttempt) {
          logger.error(`LLM completion failed: ${error.message}`, { error });
          throw error;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(`Retryable error, waiting ${delay}ms before retry: ${error.message}`);
        await this.sleep(delay);
      }
    }

    throw new Error('LLM completion failed after all retries');
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number; seed?: number }
  ): Promise<LLMResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const temperature = options?.temperature ?? this.config.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? this.config.maxTokens ?? 4000;
    const seed = options?.seed ?? this.config.seed;

    const completion = await this.openaiClient.chat.completions.create({
      model: this.config.model,
      messages: messages as any,
      temperature,
      max_tokens: maxTokens,
      seed,
    });

    const choice = completion.choices[0];
    if (!choice) {
      throw new Error('No completion choices returned from OpenAI');
    }

    return {
      content: choice.message.content || '',
      tokensInput: completion.usage?.prompt_tokens || 0,
      tokensOutput: completion.usage?.completion_tokens || 0,
      tokensTotal: completion.usage?.total_tokens || 0,
      modelName: completion.model,
      finishReason: choice.finish_reason,
    };
  }

  /**
   * Call Anthropic Claude API
   */
  private async callAnthropic(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number; seed?: number }
  ): Promise<LLMResponse> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const temperature = options?.temperature ?? this.config.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? this.config.maxTokens ?? 4000;

    // Extract system message if present
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const response = await this.anthropicClient.messages.create({
      model: this.config.model,
      max_tokens: maxTokens,
      temperature,
      system: systemMessage?.content,
      messages: conversationMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Anthropic response');
    }

    return {
      content: textContent.text,
      tokensInput: response.usage.input_tokens,
      tokensOutput: response.usage.output_tokens,
      tokensTotal: response.usage.input_tokens + response.usage.output_tokens,
      modelName: response.model,
      finishReason: response.stop_reason || 'end_turn',
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Rate limits, timeouts, and server errors are retryable
    const retryableStatusCodes = [429, 500, 502, 503, 504];

    if (error.status && retryableStatusCodes.includes(error.status)) {
      return true;
    }

    // Check for network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    return false;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Estimate cost in USD based on tokens and model
   */
  static estimateCost(
    provider: LLMProvider,
    model: string,
    tokensInput: number,
    tokensOutput: number
  ): string {
    // Pricing as of 2024 (per 1M tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4-turbo': { input: 10, output: 30 },
      'gpt-4': { input: 30, output: 60 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
      'claude-3-opus-20240229': { input: 15, output: 75 },
      'claude-3-sonnet-20240229': { input: 3, output: 15 },
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    };

    const modelPricing = pricing[model] || { input: 5, output: 15 }; // Default fallback
    const inputCost = (tokensInput / 1_000_000) * modelPricing.input;
    const outputCost = (tokensOutput / 1_000_000) * modelPricing.output;
    const totalCost = inputCost + outputCost;

    return totalCost.toFixed(6);
  }
}

/**
 * Create LLM client from environment variables
 */
export function createLLMClient(): LLMClient {
  const provider = (process.env.LLM_PROVIDER || 'openai') as LLMProvider;
  const model = process.env.LLM_MODEL || (provider === 'openai' ? 'gpt-4-turbo' : 'claude-3-sonnet-20240229');
  const apiKey = provider === 'openai'
    ? process.env.OPENAI_API_KEY
    : process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(`API key not found for provider: ${provider}`);
  }

  return new LLMClient({
    provider,
    model,
    apiKey,
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4000'),
  });
}
