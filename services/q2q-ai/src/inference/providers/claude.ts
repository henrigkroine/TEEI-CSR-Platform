import Anthropic from '@anthropic-ai/sdk';
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
 * Pricing for Claude models (as of 2025)
 * https://www.anthropic.com/pricing
 */
const CLAUDE_PRICING = {
  'claude-3-5-sonnet-20241022': {
    inputPer1M: 3.00,
    outputPer1M: 15.00
  },
  'claude-3-5-haiku-20241022': {
    inputPer1M: 0.80,
    outputPer1M: 4.00
  },
  'claude-3-opus-20240229': {
    inputPer1M: 15.00,
    outputPer1M: 75.00
  }
};

/**
 * Claude (Anthropic) provider adapter
 */
export class ClaudeProvider implements AIProviderAdapter {
  readonly name = AIProvider.CLAUDE;
  readonly modelName: string;
  private client: Anthropic | null = null;
  private apiKey: string | null = null;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || null;
    this.modelName = process.env.Q2Q_CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
    this.maxTokens = parseInt(process.env.Q2Q_MAX_TOKENS || '4096', 10);
    this.temperature = parseFloat(process.env.Q2Q_TEMPERATURE || '0.0');

    if (this.apiKey) {
      this.client = new Anthropic({
        apiKey: this.apiKey
      });
    }
  }

  isConfigured(): boolean {
    return this.apiKey !== null && this.client !== null;
  }

  async classify(request: InferenceRequest): Promise<InferenceResult> {
    if (!this.client) {
      throw new InferenceError('Claude provider not configured', this.name);
    }

    const startTime = Date.now();
    const prompt = buildClassificationPrompt(request.text);

    try {
      const result = await withRetry(
        async () => {
          return await this.client!.messages.create({
            model: this.modelName,
            max_tokens: this.maxTokens,
            temperature: this.temperature,
            messages: [
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
          operation: 'ClaudeProvider.classify'
        }
      );

      const latencyMs = Date.now() - startTime;

      // Extract text content
      const textContent = result.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('');

      // Parse JSON response
      const jsonStr = extractJSON(textContent);
      let classification;
      try {
        const parsed = JSON.parse(jsonStr);
        classification = ClassificationOutputSchema.parse(parsed);
      } catch (error: any) {
        throw new InvalidResponseError(this.name, error);
      }

      // Calculate token usage and cost
      const tokens: TokenUsage = {
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
        totalTokens: result.usage.input_tokens + result.usage.output_tokens
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
      // Handle Anthropic-specific errors
      if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after'];
        const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
        throw new RateLimitError(this.name, retryAfterMs);
      }

      if (error instanceof InvalidResponseError || error instanceof RateLimitError) {
        throw error;
      }

      throw new InferenceError(
        `Claude API error: ${error.message}`,
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
    const pricing = CLAUDE_PRICING[this.modelName as keyof typeof CLAUDE_PRICING] ||
      CLAUDE_PRICING['claude-3-5-sonnet-20241022'];

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
