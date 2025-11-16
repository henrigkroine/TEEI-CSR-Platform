/**
 * Intent Classification Engine
 *
 * Uses Claude 3.5 Sonnet or GPT-4 to classify natural language queries into structured intents
 * with extracted slots for safe query generation.
 *
 * Features:
 * - Multi-language support (en, uk, no)
 * - Confidence scoring
 * - Ambiguity detection
 * - Cost tracking (tokens + USD)
 * - Redis caching for repeated queries
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createHash } from 'crypto';
import { z } from 'zod';
import {
  INTENT_CLASSIFICATION_SYSTEM_PROMPT,
  INTENT_CLASSIFICATION_USER_PROMPT,
} from './prompts/intent-classification-prompt.js';

// ===== TYPES & SCHEMAS =====

export const IntentType = z.enum([
  'get_metric',
  'compare_cohorts',
  'trend_analysis',
  'benchmark',
  'forecast',
]);

export const MetricType = z.enum([
  'sroi_ratio',
  'vis_score',
  'outcome_scores',
  'participant_engagement',
  'volunteer_activity',
  'integration_scores',
  'job_readiness_scores',
]);

export const TimeRangeType = z.enum([
  'last_7d',
  'last_30d',
  'last_90d',
  'last_quarter',
  'ytd',
  'last_year',
  'custom',
]);

export const GroupByType = z.enum([
  'program',
  'location',
  'demographic',
  'volunteer',
  'outcome_dimension',
]).optional();

export const ComparisonType = z.enum([
  'industry',
  'region',
  'company_size',
  'peer_group',
]).optional();

export const IntentSlotsSchema = z.object({
  metric: MetricType,
  timeRange: TimeRangeType,
  groupBy: GroupByType.optional(),
  filters: z.record(z.string(), z.any()).optional(),
  comparisonType: ComparisonType.optional(),
});

export const AmbiguitySchema = z.object({
  hasAmbiguity: z.boolean(),
  clarificationNeeded: z.string().optional(),
});

export const IntentClassificationResultSchema = z.object({
  intent: IntentType,
  confidence: z.number().min(0).max(1),
  slots: IntentSlotsSchema,
  language: z.string(),
  ambiguity: AmbiguitySchema,
  reasoning: z.string(),
});

export type IntentSlots = z.infer<typeof IntentSlotsSchema>;
export type IntentClassificationResult = z.infer<typeof IntentClassificationResultSchema>;

export interface IntentClassificationResponse {
  result: IntentClassificationResult;
  costTracking: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUSD: number;
    model: string;
    provider: 'anthropic' | 'openai';
  };
  cached: boolean;
  queryHash: string;
}

// ===== CONFIGURATION =====

export interface IntentClassifierConfig {
  provider: 'anthropic' | 'openai';
  model?: string;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  redisClient?: any; // IORedis instance
  cacheTtlSeconds?: number;
  maxTokens?: number;
  temperature?: number;
}

// ===== PRICING (as of Jan 2025) =====

const PRICING = {
  anthropic: {
    'claude-3-5-sonnet-20241022': {
      input: 3.0 / 1_000_000, // $3 per million input tokens
      output: 15.0 / 1_000_000, // $15 per million output tokens
    },
  },
  openai: {
    'gpt-4-turbo-preview': {
      input: 10.0 / 1_000_000,
      output: 30.0 / 1_000_000,
    },
    'gpt-4': {
      input: 30.0 / 1_000_000,
      output: 60.0 / 1_000_000,
    },
  },
};

// ===== INTENT CLASSIFIER CLASS =====

export class IntentClassifier {
  private anthropicClient?: Anthropic;
  private openaiClient?: OpenAI;
  private redisClient?: any;
  private config: Required<IntentClassifierConfig>;

  constructor(config: IntentClassifierConfig) {
    this.config = {
      provider: config.provider,
      model: config.model || (config.provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4-turbo-preview'),
      anthropicApiKey: config.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '',
      openaiApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY || '',
      redisClient: config.redisClient,
      cacheTtlSeconds: config.cacheTtlSeconds || 3600, // 1 hour default
      maxTokens: config.maxTokens || 1024,
      temperature: config.temperature || 0.1, // Low temperature for consistent classification
    };

    // Initialize clients
    if (this.config.provider === 'anthropic') {
      if (!this.config.anthropicApiKey) {
        throw new Error('Anthropic API key is required when provider is "anthropic"');
      }
      this.anthropicClient = new Anthropic({
        apiKey: this.config.anthropicApiKey,
      });
    } else {
      if (!this.config.openaiApiKey) {
        throw new Error('OpenAI API key is required when provider is "openai"');
      }
      this.openaiClient = new OpenAI({
        apiKey: this.config.openaiApiKey,
      });
    }

    this.redisClient = this.config.redisClient;
  }

  /**
   * Classify a natural language query into intent + slots
   */
  async classify(query: string): Promise<IntentClassificationResponse> {
    // Generate cache key
    const queryHash = this.hashQuery(query);
    const cacheKey = `nlq:intent:${queryHash}`;

    // Check cache first
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          return {
            ...parsedCache,
            cached: true,
            queryHash,
          };
        }
      } catch (error) {
        console.warn('Redis cache read failed:', error);
        // Continue without cache
      }
    }

    // Call LLM
    let result: IntentClassificationResult;
    let costTracking: IntentClassificationResponse['costTracking'];

    if (this.config.provider === 'anthropic') {
      const response = await this.classifyWithAnthropic(query);
      result = response.result;
      costTracking = response.costTracking;
    } else {
      const response = await this.classifyWithOpenAI(query);
      result = response.result;
      costTracking = response.costTracking;
    }

    // Cache the result
    if (this.redisClient) {
      try {
        const cacheData = {
          result,
          costTracking,
          cached: false,
          queryHash,
        };
        await this.redisClient.setex(
          cacheKey,
          this.config.cacheTtlSeconds,
          JSON.stringify(cacheData)
        );
      } catch (error) {
        console.warn('Redis cache write failed:', error);
        // Continue without cache
      }
    }

    return {
      result,
      costTracking,
      cached: false,
      queryHash,
    };
  }

  /**
   * Classify using Anthropic Claude
   */
  private async classifyWithAnthropic(query: string): Promise<{
    result: IntentClassificationResult;
    costTracking: IntentClassificationResponse['costTracking'];
  }> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const response = await this.anthropicClient.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: INTENT_CLASSIFICATION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: INTENT_CLASSIFICATION_USER_PROMPT(query),
        },
      ],
    });

    // Extract JSON from response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const jsonText = content.text.trim();
    let parsedResult: unknown;

    try {
      parsedResult = JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`Failed to parse Claude response as JSON: ${jsonText}`);
    }

    // Validate with Zod
    const result = IntentClassificationResultSchema.parse(parsedResult);

    // Calculate cost
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const totalTokens = inputTokens + outputTokens;

    const modelPricing = PRICING.anthropic[this.config.model as keyof typeof PRICING.anthropic] ||
      PRICING.anthropic['claude-3-5-sonnet-20241022'];

    const estimatedCostUSD =
      inputTokens * modelPricing.input +
      outputTokens * modelPricing.output;

    const costTracking: IntentClassificationResponse['costTracking'] = {
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUSD,
      model: this.config.model,
      provider: 'anthropic',
    };

    return { result, costTracking };
  }

  /**
   * Classify using OpenAI GPT-4
   */
  private async classifyWithOpenAI(query: string): Promise<{
    result: IntentClassificationResult;
    costTracking: IntentClassificationResponse['costTracking'];
  }> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openaiClient.chat.completions.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: [
        {
          role: 'system',
          content: INTENT_CLASSIFICATION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: INTENT_CLASSIFICATION_USER_PROMPT(query),
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const jsonText = content.trim();
    let parsedResult: unknown;

    try {
      parsedResult = JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`Failed to parse OpenAI response as JSON: ${jsonText}`);
    }

    // Validate with Zod
    const result = IntentClassificationResultSchema.parse(parsedResult);

    // Calculate cost
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    const modelPricing = PRICING.openai[this.config.model as keyof typeof PRICING.openai] ||
      PRICING.openai['gpt-4-turbo-preview'];

    const estimatedCostUSD =
      inputTokens * modelPricing.input +
      outputTokens * modelPricing.output;

    const costTracking: IntentClassificationResponse['costTracking'] = {
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUSD,
      model: this.config.model,
      provider: 'openai',
    };

    return { result, costTracking };
  }

  /**
   * Generate a hash for cache key
   */
  private hashQuery(query: string): string {
    return createHash('sha256')
      .update(query.toLowerCase().trim())
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Batch classify multiple queries (parallelized)
   */
  async classifyBatch(queries: string[]): Promise<IntentClassificationResponse[]> {
    return Promise.all(queries.map(q => this.classify(q)));
  }
}

// ===== FACTORY FUNCTION =====

/**
 * Create an IntentClassifier instance
 */
export function createIntentClassifier(config: IntentClassifierConfig): IntentClassifier {
  return new IntentClassifier(config);
}
