/**
 * NLQ k6 Test Helpers
 *
 * Shared utilities for NLQ performance testing:
 * - Question generators
 * - Cache key calculation
 * - Custom metrics
 * - Response validators
 */

import { Rate, Trend, Counter } from 'k6/metrics';
import { crypto } from 'k6/experimental/webcrypto';

// ===== CUSTOM METRICS =====

export const nlqMetrics = {
  // Overall metrics
  errorRate: new Rate('nlq_errors'),
  cacheHitRate: new Rate('nlq_cache_hit_rate'),

  // Endpoint-specific latency
  askLatency: new Trend('nlq_ask_latency'),
  queryStatusLatency: new Trend('nlq_query_status_latency'),
  historyLatency: new Trend('nlq_history_latency'),

  // Cache performance
  cachedResponseLatency: new Trend('nlq_cached_response_latency'),
  uncachedResponseLatency: new Trend('nlq_uncached_response_latency'),

  // Safety and rate limiting
  safetyCheckFailures: new Rate('nlq_safety_check_failures'),
  rateLimitRejections: new Counter('nlq_rate_limit_rejections'),

  // Intent classification
  intentClassificationTime: new Trend('nlq_intent_classification_time'),
  intentConfidence: new Trend('nlq_intent_confidence'),

  // Query execution
  queryExecutionTime: new Trend('nlq_query_execution_time'),
  resultRowCount: new Trend('nlq_result_row_count'),

  // Answer quality
  answerConfidence: new Trend('nlq_answer_confidence'),

  // Cost tracking
  tokensUsed: new Trend('nlq_tokens_used'),
  estimatedCostUSD: new Trend('nlq_estimated_cost_usd'),
};

// ===== TEST DATA =====

/**
 * Sample company IDs for testing
 */
export const COMPANIES = [
  'c1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o', // Acme Corporation
  'd2b3c4d5-e6f7-8g9h-0i1j-2k3l4m5n6o7p', // TechCo Inc
  'e3c4d5e6-f7g8-9h0i-1j2k-3l4m5n6o7p8q', // Global Impact Co
];

/**
 * Canonical questions that should have high cache hit rates
 * These simulate common user queries
 */
export const CANONICAL_QUESTIONS = [
  // SROI queries
  "What's our social return on investment this quarter?",
  "Show me SROI for Q3 2024",
  "How is our SROI trending?",
  "What was our SROI last month?",

  // VIS queries
  "What's our volunteer impact score?",
  "Show me VIS for this year",
  "How many volunteer hours did we log?",

  // Participation metrics
  "How many employees participated in CSR activities?",
  "What's our employee participation rate?",
  "Show me participation trends",

  // Impact metrics
  "What's our total social impact?",
  "How many people did we help this quarter?",
  "Show me our impact by program",
  "Which programs have the highest impact?",

  // Financial metrics
  "How much did we invest in CSR?",
  "What's our total CSR budget utilization?",
  "Show me spending by category",

  // Demographic breakdowns
  "Show me participation by department",
  "How does engagement vary by location?",
  "What's the demographic breakdown of volunteers?",

  // Trend analysis
  "How has our impact changed over time?",
  "Show me month-over-month growth",
  "Compare Q1 vs Q2 performance",

  // Outcomes
  "What outcomes did we achieve?",
  "Show me education outcomes",
  "How many people gained skills?",
];

/**
 * Autocomplete partial queries
 * Used for testing autocomplete/suggestion endpoints
 */
export const AUTOCOMPLETE_QUERIES = [
  "What's our",
  "Show me",
  "How many",
  "What was",
  "Compare",
  "SROI",
  "VIS",
  "volunteer",
  "impact",
  "participation",
];

/**
 * Edge case questions to test safety guardrails
 * These should be rejected or handled gracefully
 */
export const EDGE_CASE_QUESTIONS = [
  // Too short
  "hi",
  "ok",

  // Potentially unsafe
  "DROP TABLE users",
  "SELECT * FROM users WHERE 1=1",

  // Ambiguous
  "show me stuff",
  "give me data",
  "what about things",

  // Out of scope
  "What's the weather today?",
  "Who won the Super Bowl?",
  "Tell me a joke",
];

// ===== HELPER FUNCTIONS =====

/**
 * Get random element from array
 */
export function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate random question with variation
 * Adds slight variations to canonical questions to test cache normalization
 */
export function generateVariedQuestion(baseQuestion) {
  const variations = [
    baseQuestion,
    baseQuestion.toLowerCase(),
    baseQuestion.toUpperCase(),
    baseQuestion + '?',
    baseQuestion.replace('?', ''),
    '  ' + baseQuestion + '  ', // Leading/trailing whitespace
  ];

  return randomChoice(variations);
}

/**
 * Calculate cache key (simplified version matching server logic)
 */
export function calculateCacheKey(question, companyId, filters = {}) {
  const normalized = question.toLowerCase().trim();
  const key = `${normalized}:${companyId}:${JSON.stringify(filters)}`;

  // In real implementation, this would use SHA-256
  // For testing, we just use the normalized string
  return btoa(key).substring(0, 64);
}

/**
 * Validate NLQ ask response
 */
export function validateAskResponse(response) {
  const checks = {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'has valid JSON body': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body !== null;
      } catch (e) {
        return false;
      }
    },
  };

  // If status is 200, validate response structure
  if (response.status === 200) {
    checks['has queryId'] = (r) => {
      const body = JSON.parse(r.body);
      return body.queryId && /^[0-9a-f-]{36}$/i.test(body.queryId);
    };

    checks['has answer'] = (r) => {
      const body = JSON.parse(r.body);
      return body.answer && body.answer.summary;
    };

    checks['has metadata'] = (r) => {
      const body = JSON.parse(r.body);
      return body.metadata && typeof body.metadata.executionTimeMs === 'number';
    };

    checks['has confidence score'] = (r) => {
      const body = JSON.parse(r.body);
      return body.answer.confidence && typeof body.answer.confidence.overall === 'number';
    };
  }

  // If status is 429, it's a rate limit
  if (response.status === 429) {
    checks['has rate limit error'] = (r) => {
      const body = JSON.parse(r.body);
      return body.error === 'Rate limit exceeded';
    };
  }

  return checks;
}

/**
 * Track response metrics from NLQ ask response
 */
export function trackResponseMetrics(response) {
  if (response.status !== 200) {
    nlqMetrics.errorRate.add(1);

    if (response.status === 429) {
      nlqMetrics.rateLimitRejections.add(1);
    }

    return;
  }

  try {
    const body = JSON.parse(response.body);

    // Track cache hit/miss
    const cached = response.headers['X-Cached'] === 'true' || body.metadata.cached;
    nlqMetrics.cacheHitRate.add(cached ? 1 : 0);

    // Track latency by cache status
    const latency = parseInt(response.headers['X-Query-Time-Ms']) || body.metadata.executionTimeMs;
    if (cached) {
      nlqMetrics.cachedResponseLatency.add(latency);
    } else {
      nlqMetrics.uncachedResponseLatency.add(latency);
    }

    // Track query execution time
    if (body.metadata.executionTimeMs) {
      nlqMetrics.queryExecutionTime.add(body.metadata.executionTimeMs);
    }

    // Track confidence scores
    if (body.answer.confidence) {
      nlqMetrics.answerConfidence.add(body.answer.confidence.overall * 100);

      if (body.answer.confidence.components.intentConfidence) {
        nlqMetrics.intentConfidence.add(body.answer.confidence.components.intentConfidence * 100);
      }
    }

    // Track result size
    if (body.answer.data && Array.isArray(body.answer.data)) {
      nlqMetrics.resultRowCount.add(body.answer.data.length);
    }

    // Track cost
    if (body.metadata.tokensUsed) {
      nlqMetrics.tokensUsed.add(body.metadata.tokensUsed);
    }

    if (body.metadata.estimatedCostUSD) {
      const cost = parseFloat(body.metadata.estimatedCostUSD);
      nlqMetrics.estimatedCostUSD.add(cost * 1000000); // Convert to micro-dollars for better metrics
    }

    // Track safety check failures
    if (!body.metadata.safetyPassed) {
      nlqMetrics.safetyCheckFailures.add(1);
    } else {
      nlqMetrics.safetyCheckFailures.add(0);
    }

    nlqMetrics.errorRate.add(0);

  } catch (e) {
    console.error('Failed to track metrics:', e);
    nlqMetrics.errorRate.add(1);
  }
}

/**
 * Build NLQ ask request body
 */
export function buildAskRequest(question, companyId, context = {}) {
  return {
    question,
    companyId,
    context: {
      language: context.language || 'en',
      filters: context.filters || {},
      previousQueryId: context.previousQueryId,
    },
    userId: context.userId,
    sessionId: context.sessionId || `test-session-${Date.now()}`,
  };
}

/**
 * Build history query params
 */
export function buildHistoryParams(companyId, options = {}) {
  const params = new URLSearchParams({
    companyId,
    limit: options.limit || 20,
    offset: options.offset || 0,
  });

  if (options.startDate) {
    params.append('startDate', options.startDate);
  }

  if (options.endDate) {
    params.append('endDate', options.endDate);
  }

  if (options.status) {
    params.append('status', options.status);
  }

  return params.toString();
}

/**
 * Pretty print test summary
 */
export function printTestSummary(testName, data) {
  console.log('\n========================================');
  console.log(`${testName.toUpperCase()}`);
  console.log('========================================\n');

  // Extract key metrics
  const askP95 = data.metrics.nlq_ask_latency?.values?.['p(95)'];
  const cacheHitRate = data.metrics.nlq_cache_hit_rate?.values?.rate;
  const errorRate = data.metrics.nlq_errors?.values?.rate;
  const avgConfidence = data.metrics.nlq_answer_confidence?.values?.avg;
  const rateLimitRejects = data.metrics.nlq_rate_limit_rejections?.values?.count;

  console.log('Performance Metrics:');
  console.log(`  Ask endpoint p95:       ${askP95 ? askP95.toFixed(2) + 'ms' : 'N/A'} ${askP95 && askP95 <= 2500 ? '✅' : '❌'}`);
  console.log(`  Cache hit rate:         ${cacheHitRate ? (cacheHitRate * 100).toFixed(1) + '%' : 'N/A'} ${cacheHitRate && cacheHitRate >= 0.80 ? '✅' : '❌'}`);
  console.log(`  Error rate:             ${errorRate ? (errorRate * 100).toFixed(2) + '%' : 'N/A'} ${errorRate && errorRate < 0.01 ? '✅' : '❌'}`);
  console.log(`  Avg answer confidence:  ${avgConfidence ? avgConfidence.toFixed(1) + '%' : 'N/A'}`);
  console.log(`  Rate limit rejections:  ${rateLimitRejects || 0}`);

  const passed = askP95 <= 2500 && cacheHitRate >= 0.80 && errorRate < 0.01;
  console.log(`\nOverall: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('========================================\n');
}
