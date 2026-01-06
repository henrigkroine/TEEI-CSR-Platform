import OpenAI from 'openai';
import {
  AIProvider,
  AIProviderAdapter,
  InferenceRequest,
  InferenceResult,
  TokenUsage,
  CostEstimate,
  InferenceError,
  RateLimitError,
  InvalidResponseError
} from '../types.js';
import { ClassificationOutputSchema } from '../../labels.js';
import { buildClassificationPrompt, extractJSON } from '../prompt.js';
import { withRetry } from '../retry.js';

/**
 * Pricing for OpenAI models (as of 2025)
 * https://openai.com/pricing
 */
const OPENAI_PRICING = {
  'gpt-4o': {
    inputPer1M: 2.50,
    outputPer1M: 10.00
  },
  'gpt-4o-mini': {
    inputPer1M: 0.15,
    outputPer1M: 0.60
  },
  'gpt-4-turbo': {
    inputPer1M: 10.00,
    outputPer1M: 30.00
  },
  'gpt-3.5-turbo': {
    inputPer1M: 0.50,
    outputPer1M: 1.50
  }
};

/**
 * OpenAI provider adapter
 */
export class OpenAIProvider implements AIProviderAdapter {
  readonly name = AIProvider.OPENAI;
  readonly modelName: string;
  private client: OpenAI | null = null;
  private apiKey: string | null = null;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || null;
    this.modelName = process.env.Q2Q_OPENAI_MODEL || 'gpt-4o-mini';
    this.maxTokens = parseInt(process.env.Q2Q_MAX_TOKENS || '4096', 10);
    this.temperature = parseFloat(process.env.Q2Q_TEMPERATURE || '0.0');

    if (this.apiKey) {
      this.client = new OpenAI({
        apiKey: this.apiKey
      });
    }
  }

  isConfigured(): boolean {
    return this.apiKey !== null && this.client !== null;
  }

  async classify(request: InferenceRequest): Promise<InferenceResult> {
    if (!this.client) {
      throw new InferenceError('OpenAI provider not configured', this.name);
    }

    const startTime = Date.now();
    const prompt = buildClassificationPrompt(request.text);

    try {
      const result = await withRetry(
        async () => {
          return await this.client!.chat.completions.create({
            model: this.modelName,
            max_tokens: this.maxTokens,
            temperature: this.temperature,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant that responds only with valid JSON.'
              },
              {
                role: 'user',
                content: prompt
              }
            ]
          });
        },
        {},
        {
          correlationId: request.correlationId,
          operation: 'OpenAIProvider.classify'
        }
      );

      const latencyMs = Date.now() - startTime;

      // Extract response content
      const content = result.choices[0]?.message?.content;
      if (!content) {
        throw new InvalidResponseError(this.name, new Error('No content in response'));
      }

      // Parse JSON response
      const jsonStr = extractJSON(content);
      let classification;
      try {
        const parsed = JSON.parse(jsonStr);
        classification = ClassificationOutputSchema.parse(parsed);
      } catch (error: any) {
        throw new InvalidResponseError(this.name, error);
      }

      // Calculate token usage and cost
      const tokens: TokenUsage = {
        inputTokens: result.usage?.prompt_tokens || 0,
        outputTokens: result.usage?.completion_tokens || 0,
        totalTokens: result.usage?.total_tokens || 0
      };

      const cost = this.calculateCost(tokens);

      return {
        classification,
        provider: this.name,
        modelName: this.modelName,
        tokens,
        cost,
        latencyMs,
        timestamp: new Date().toISOString(),
        correlationId: request.correlationId || 'unknown'
      };
    } catch (error: any) {
      // Handle OpenAI-specific errors
      if (error.status === 429 || error.code === 'rate_limit_exceeded') {
        const retryAfter = error.headers?.['retry-after'];
        const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
        throw new RateLimitError(this.name, retryAfterMs);
      }

      if (error instanceof InvalidResponseError || error instanceof RateLimitError) {
        throw error;
      }

      throw new InferenceError(
        `OpenAI API error: ${error.message}`,
        this.name,
        error,
        error.status >= 500
      );
    }
  }

  estimateCost(text: string): CostEstimate {
    // Rough estimation: ~4 chars per token
    const estimatedInputTokens = Math.ceil(text.length / 4);
    // Estimate output tokens (classification is typically small)
    const estimatedOutputTokens = 500;

    return this.calculateCost({
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
      totalTokens: estimatedInputTokens + estimatedOutputTokens
    });
  }

  private calculateCost(tokens: TokenUsage): CostEstimate {
    const pricing = OPENAI_PRICING[this.modelName as keyof typeof OPENAI_PRICING] ||
      OPENAI_PRICING['gpt-4o-mini'];

    const inputCost = (tokens.inputTokens / 1_000_000) * pricing.inputPer1M;
    const outputCost = (tokens.outputTokens / 1_000_000) * pricing.outputPer1M;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      currency: 'USD'
    };
  }
}
