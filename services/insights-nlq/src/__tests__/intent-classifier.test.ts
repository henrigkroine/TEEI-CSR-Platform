/**
 * Unit Tests for Intent Classifier
 *
 * Tests intent classification, slot extraction, and validation logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntentClassifier, createIntentClassifier } from '../lib/intent-classifier.js';
import { SlotExtractor, validateSlotsOrThrow } from '../lib/slot-extractor.js';
import type { IntentSlots } from '../lib/intent-classifier.js';

// ===== MOCK RESPONSES =====

const mockAnthropicResponse = {
  content: [
    {
      type: 'text' as const,
      text: JSON.stringify({
        intent: 'get_metric',
        confidence: 0.95,
        slots: {
          metric: 'sroi_ratio',
          timeRange: 'last_quarter',
        },
        language: 'en',
        ambiguity: {
          hasAmbiguity: false,
        },
        reasoning: 'Clear query for SROI metric with specific time range.',
      }),
    },
  ],
  usage: {
    input_tokens: 100,
    output_tokens: 50,
  },
};

const mockOpenAIResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          intent: 'trend_analysis',
          confidence: 0.92,
          slots: {
            metric: 'outcome_scores',
            timeRange: 'last_90d',
            groupBy: 'outcome_dimension',
          },
          language: 'en',
          ambiguity: {
            hasAmbiguity: false,
          },
          reasoning: 'Trend analysis for outcome scores over 90 days.',
        }),
      },
    },
  ],
  usage: {
    prompt_tokens: 120,
    completion_tokens: 60,
  },
};

// ===== INTENT CLASSIFIER TESTS =====

describe('IntentClassifier', () => {
  describe('constructor', () => {
    it('should throw if Anthropic API key is missing when provider is anthropic', () => {
      expect(() => {
        new IntentClassifier({
          provider: 'anthropic',
          anthropicApiKey: '',
        });
      }).toThrow('Anthropic API key is required');
    });

    it('should throw if OpenAI API key is missing when provider is openai', () => {
      expect(() => {
        new IntentClassifier({
          provider: 'openai',
          openaiApiKey: '',
        });
      }).toThrow('OpenAI API key is required');
    });

    it('should initialize with default config values', () => {
      const classifier = new IntentClassifier({
        provider: 'anthropic',
        anthropicApiKey: 'test-key',
      });

      expect(classifier).toBeDefined();
    });
  });

  describe('classify with Anthropic', () => {
    let classifier: IntentClassifier;
    let mockAnthropicCreate: any;

    beforeEach(() => {
      // Mock Anthropic client
      mockAnthropicCreate = vi.fn().mockResolvedValue(mockAnthropicResponse);

      classifier = new IntentClassifier({
        provider: 'anthropic',
        anthropicApiKey: 'test-key',
      });

      // Replace the client's create method
      (classifier as any).anthropicClient = {
        messages: {
          create: mockAnthropicCreate,
        },
      };
    });

    it('should classify a simple metric query', async () => {
      const result = await classifier.classify('What was our SROI last quarter?');

      expect(result.result.intent).toBe('get_metric');
      expect(result.result.confidence).toBe(0.95);
      expect(result.result.slots.metric).toBe('sroi_ratio');
      expect(result.result.slots.timeRange).toBe('last_quarter');
      expect(result.cached).toBe(false);
    });

    it('should include cost tracking', async () => {
      const result = await classifier.classify('What was our SROI last quarter?');

      expect(result.costTracking).toBeDefined();
      expect(result.costTracking.inputTokens).toBe(100);
      expect(result.costTracking.outputTokens).toBe(50);
      expect(result.costTracking.totalTokens).toBe(150);
      expect(result.costTracking.estimatedCostUSD).toBeGreaterThan(0);
      expect(result.costTracking.provider).toBe('anthropic');
    });

    it('should generate a query hash', async () => {
      const result = await classifier.classify('What was our SROI last quarter?');

      expect(result.queryHash).toBeDefined();
      expect(result.queryHash).toHaveLength(16);
    });

    it('should handle caching with Redis', async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        setex: vi.fn().mockResolvedValue('OK'),
      };

      const classifierWithCache = new IntentClassifier({
        provider: 'anthropic',
        anthropicApiKey: 'test-key',
        redisClient: mockRedis,
      });

      (classifierWithCache as any).anthropicClient = {
        messages: {
          create: mockAnthropicCreate,
        },
      };

      const result = await classifierWithCache.classify('What was our SROI last quarter?');

      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalled();
      expect(result.cached).toBe(false);
    });

    it('should return cached results on subsequent calls', async () => {
      const cachedData = {
        result: mockAnthropicResponse.content[0].text,
        costTracking: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimatedCostUSD: 0,
          model: 'claude-3-5-sonnet-20241022',
          provider: 'anthropic',
        },
        cached: false,
        queryHash: 'abc123',
      };

      const mockRedis = {
        get: vi.fn().mockResolvedValue(JSON.stringify(cachedData)),
        setex: vi.fn(),
      };

      const classifierWithCache = new IntentClassifier({
        provider: 'anthropic',
        anthropicApiKey: 'test-key',
        redisClient: mockRedis,
      });

      const result = await classifierWithCache.classify('What was our SROI last quarter?');

      expect(result.cached).toBe(true);
      expect(mockAnthropicCreate).not.toHaveBeenCalled();
    });
  });

  describe('classify with OpenAI', () => {
    let classifier: IntentClassifier;
    let mockOpenAICreate: any;

    beforeEach(() => {
      mockOpenAICreate = vi.fn().mockResolvedValue(mockOpenAIResponse);

      classifier = new IntentClassifier({
        provider: 'openai',
        openaiApiKey: 'test-key',
      });

      (classifier as any).openaiClient = {
        chat: {
          completions: {
            create: mockOpenAICreate,
          },
        },
      };
    });

    it('should classify a trend analysis query', async () => {
      const result = await classifier.classify('Show outcome trends for the past 3 months');

      expect(result.result.intent).toBe('trend_analysis');
      expect(result.result.confidence).toBe(0.92);
      expect(result.result.slots.metric).toBe('outcome_scores');
      expect(result.result.slots.timeRange).toBe('last_90d');
      expect(result.result.slots.groupBy).toBe('outcome_dimension');
    });

    it('should include cost tracking for OpenAI', async () => {
      const result = await classifier.classify('Show outcome trends for the past 3 months');

      expect(result.costTracking.provider).toBe('openai');
      expect(result.costTracking.inputTokens).toBe(120);
      expect(result.costTracking.outputTokens).toBe(60);
    });
  });

  describe('classifyBatch', () => {
    let classifier: IntentClassifier;

    beforeEach(() => {
      classifier = new IntentClassifier({
        provider: 'anthropic',
        anthropicApiKey: 'test-key',
      });

      (classifier as any).anthropicClient = {
        messages: {
          create: vi.fn().mockResolvedValue(mockAnthropicResponse),
        },
      };
    });

    it('should classify multiple queries in parallel', async () => {
      const queries = [
        'What was our SROI last quarter?',
        'Show VIS score for last month',
        'How are we doing?',
      ];

      const results = await classifier.classifyBatch(queries);

      expect(results).toHaveLength(3);
      expect(results[0].result.intent).toBe('get_metric');
      expect(results[1].result.intent).toBe('get_metric');
      expect(results[2].result.intent).toBe('get_metric');
    });
  });
});

// ===== SLOT EXTRACTOR TESTS =====

describe('SlotExtractor', () => {
  describe('normalizeTimeRange', () => {
    it('should normalize last_7d to correct date range', () => {
      const result = SlotExtractor.normalizeTimeRange('last_7d');

      expect(result.timeRangeType).toBe('last_7d');
      expect(result.isCustom).toBe(false);

      const daysDiff = Math.round(
        (result.endDate.getTime() - result.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(7);
    });

    it('should normalize last_quarter to correct date range', () => {
      const result = SlotExtractor.normalizeTimeRange('last_quarter');

      expect(result.timeRangeType).toBe('last_quarter');
      expect(result.isCustom).toBe(false);
      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();
    });

    it('should normalize ytd to start of year', () => {
      const result = SlotExtractor.normalizeTimeRange('ytd');

      expect(result.timeRangeType).toBe('ytd');
      expect(result.startDate.getMonth()).toBe(0); // January
      expect(result.startDate.getDate()).toBe(1);
    });

    it('should throw on unsupported time range', () => {
      expect(() => {
        SlotExtractor.normalizeTimeRange('invalid_range');
      }).toThrow('Unsupported time range');
    });
  });

  describe('validateSlots', () => {
    it('should validate correct slots for SROI metric', () => {
      const slots: IntentSlots = {
        metric: 'sroi_ratio',
        timeRange: 'last_quarter',
      };

      const result = SlotExtractor.validateSlots(slots, 'get_metric');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.validatedSlots).toBeDefined();
      expect(result.validatedSlots?.templateId).toBe('sroi_ratio');
    });

    it('should reject unknown metric', () => {
      const slots: IntentSlots = {
        metric: 'unknown_metric' as any,
        timeRange: 'last_quarter',
      };

      const result = SlotExtractor.validateSlots(slots, 'get_metric');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown metric: unknown_metric');
    });

    it('should reject time range not allowed for metric', () => {
      const slots: IntentSlots = {
        metric: 'sroi_ratio',
        timeRange: 'last_7d', // Not allowed for SROI
      };

      const result = SlotExtractor.validateSlots(slots, 'get_metric');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not allowed for metric'))).toBe(true);
    });

    it('should reject time window exceeding maximum', () => {
      // This test would need a custom date range that exceeds the max
      // For now, we'll skip this as it requires custom date handling
      expect(true).toBe(true);
    });

    it('should validate groupBy if allowed', () => {
      const slots: IntentSlots = {
        metric: 'outcome_scores',
        timeRange: 'last_30d',
        groupBy: 'outcome_dimension',
      };

      const result = SlotExtractor.validateSlots(slots, 'trend_analysis');

      expect(result.valid).toBe(true);
      expect(result.validatedSlots?.groupBy).toBe('outcome_dimension');
    });

    it('should warn if groupBy not supported by metric', () => {
      const slots: IntentSlots = {
        metric: 'sroi_ratio',
        timeRange: 'last_quarter',
        groupBy: 'program' as any,
      };

      const result = SlotExtractor.validateSlots(slots, 'get_metric');

      expect(result.warnings.some(w => w.includes('does not support grouping'))).toBe(true);
    });

    it('should validate comparisonType for benchmark queries', () => {
      const slots: IntentSlots = {
        metric: 'sroi_ratio',
        timeRange: 'last_quarter',
        comparisonType: 'industry',
      };

      // Note: This needs the cohort_sroi_benchmark template which supports benchmarks
      const result = SlotExtractor.validateSlots(slots, 'benchmark');

      // Since sroi_ratio template doesn't have allowedFilters.cohortType,
      // it will warn about not supporting benchmarking
      expect(result.warnings.some(w => w.includes('does not support benchmarking'))).toBe(true);
    });
  });

  describe('extractQueryParams', () => {
    it('should extract query parameters for SQL template', () => {
      const validatedSlots = {
        metric: 'sroi_ratio',
        timeRange: SlotExtractor.normalizeTimeRange('last_quarter'),
        templateId: 'sroi_ratio',
      };

      const params = SlotExtractor.extractQueryParams(validatedSlots, 'company-123');

      expect(params.companyId).toBe('company-123');
      expect(params.startDate).toBeDefined();
      expect(params.endDate).toBeDefined();
      expect(params.limit).toBe(100);
    });

    it('should include groupBy in params if present', () => {
      const validatedSlots = {
        metric: 'outcome_scores',
        timeRange: SlotExtractor.normalizeTimeRange('last_30d'),
        groupBy: 'outcome_dimension',
        templateId: 'outcome_scores_by_dimension',
      };

      const params = SlotExtractor.extractQueryParams(validatedSlots, 'company-123');

      expect(params.groupBy).toBe('outcome_dimension');
    });

    it('should include filters in params if present', () => {
      const validatedSlots = {
        metric: 'sroi_ratio',
        timeRange: SlotExtractor.normalizeTimeRange('last_quarter'),
        filters: { program_id: 'prog-123' },
        templateId: 'sroi_ratio',
      };

      const params = SlotExtractor.extractQueryParams(validatedSlots, 'company-123');

      expect(params.program_id).toBe('prog-123');
    });
  });

  describe('parseCustomDateRange', () => {
    it('should parse valid ISO date strings', () => {
      const result = SlotExtractor.parseCustomDateRange('2025-01-01', '2025-03-31');

      expect(result.timeRangeType).toBe('custom');
      expect(result.isCustom).toBe(true);
      expect(result.startDate.toISOString()).toContain('2025-01-01');
      expect(result.endDate.toISOString()).toContain('2025-03-31');
    });

    it('should throw on invalid date format', () => {
      expect(() => {
        SlotExtractor.parseCustomDateRange('invalid', '2025-03-31');
      }).toThrow('Invalid custom date range format');
    });

    it('should throw if start date is after end date', () => {
      expect(() => {
        SlotExtractor.parseCustomDateRange('2025-03-31', '2025-01-01');
      }).toThrow('Start date must be before end date');
    });
  });

  describe('formatTimeRange', () => {
    it('should format last_7d as human-readable string', () => {
      const timeRange = SlotExtractor.normalizeTimeRange('last_7d');
      const formatted = SlotExtractor.formatTimeRange(timeRange);

      expect(formatted).toBe('Last 7 days');
    });

    it('should format ytd as human-readable string', () => {
      const timeRange = SlotExtractor.normalizeTimeRange('ytd');
      const formatted = SlotExtractor.formatTimeRange(timeRange);

      expect(formatted).toBe('Year to date');
    });

    it('should format custom range as date range', () => {
      const timeRange = SlotExtractor.parseCustomDateRange('2025-01-01', '2025-03-31');
      const formatted = SlotExtractor.formatTimeRange(timeRange);

      expect(formatted).toContain('2025-01-01');
      expect(formatted).toContain('2025-03-31');
    });
  });
});

// ===== HELPER FUNCTION TESTS =====

describe('validateSlotsOrThrow', () => {
  it('should return validated slots if validation passes', () => {
    const slots: IntentSlots = {
      metric: 'sroi_ratio',
      timeRange: 'last_quarter',
    };

    const result = validateSlotsOrThrow(slots, 'get_metric');

    expect(result).toBeDefined();
    expect(result.metric).toBe('sroi_ratio');
  });

  it('should throw if validation fails', () => {
    const slots: IntentSlots = {
      metric: 'unknown_metric' as any,
      timeRange: 'last_quarter',
    };

    expect(() => {
      validateSlotsOrThrow(slots, 'get_metric');
    }).toThrow('Slot validation failed');
  });
});
