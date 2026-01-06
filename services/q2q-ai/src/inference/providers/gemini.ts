import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
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
 * Pricing for Gemini models (as of 2025)
 * https://ai.google.dev/pricing
 */
const GEMINI_PRICING = {
  'gemini-1.5-pro': {
    inputPer1M: 1.25,
    outputPer1M: 5.00
  },
  'gemini-1.5-flash': {
    inputPer1M: 0.075,
    outputPer1M: 0.30
  },
  'gemini-2.0-flash-exp': {
    inputPer1M: 0.00, // Free during preview
    outputPer1M: 0.00
  }
};

/**
 * Google Gemini provider adapter
 */
export class GeminiProvider implements AIProviderAdapter {
  readonly name = AIProvider.GEMINI;
  readonly modelName: string;
  private client: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    this.apiKey = process.env.GOOGLE_AI_API_KEY || null;
    this.modelName = process.env.Q2Q_GEMINI_MODEL || 'gemini-1.5-flash';
    this.maxTokens = parseInt(process.env.Q2Q_MAX_TOKENS || '4096', 10);
    this.temperature = parseFloat(process.env.Q2Q_TEMPERATURE || '0.0');

    if (this.apiKey) {
      this.client = new GoogleGenerativeAI(this.apiKey);
    }
  }

  isConfigured(): boolean {
    return this.apiKey !== null && this.client !== null;
  }

  async classify(request: InferenceRequest): Promise<InferenceResult> {
    if (!this.client) {
      throw new InferenceError('Gemini provider not configured', this.name);
    }

    const startTime = Date.now();
    const prompt = buildClassificationPrompt(request.text);

    try {
      const model = this.client.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          maxOutputTokens: this.maxTokens,
          temperature: this.temperature,
          responseMimeType: 'application/json'
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          }
        ]
      });

      const result = await withRetry(
        async () => {
          return await model.generateContent(prompt);
        },
        {},
        {
          correlationId: request.correlationId,
          operation: 'GeminiProvider.classify'
        }
      );

      const latencyMs = Date.now() - startTime;

      // Extract response text
      const response = result.response;
      const content = response.text();

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
      const usageMetadata = response.usageMetadata;
      const tokens: TokenUsage = {
        inputTokens: usageMetadata?.promptTokenCount || 0,
        outputTokens: usageMetadata?.candidatesTokenCount || 0,
        totalTokens: usageMetadata?.totalTokenCount || 0
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
      // Handle Gemini-specific errors
      if (error.status === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        throw new RateLimitError(this.name);
      }

      if (error instanceof InvalidResponseError || error instanceof RateLimitError) {
        throw error;
      }

      throw new InferenceError(
        `Gemini API error: ${error.message}`,
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
    const pricing = GEMINI_PRICING[this.modelName as keyof typeof GEMINI_PRICING] ||
      GEMINI_PRICING['gemini-1.5-flash'];

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
