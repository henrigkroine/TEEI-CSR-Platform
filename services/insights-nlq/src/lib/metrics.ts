/**
 * Prometheus Metrics for Insights NLQ Service (Optional)
 *
 * Provides performance and usage metrics.
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// Metrics storage (in-memory)
interface Metrics {
  queryDuration: { bucket: number; count: number }[];
  cacheHits: number;
  cacheMisses: number;
  safetyViolations: number;
  llmRequests: { provider: string; count: number }[];
  queryErrors: { type: string; count: number }[];
}

const metrics: Metrics = {
  queryDuration: [],
  cacheHits: 0,
  cacheMisses: 0,
  safetyViolations: 0,
  llmRequests: [],
  queryErrors: [],
};

/**
 * Record query duration
 */
export function recordQueryDuration(durationMs: number): void {
  // Histogram buckets: 100ms, 500ms, 1s, 5s, 10s, 30s
  const buckets = [100, 500, 1000, 5000, 10000, 30000];

  for (const bucket of buckets) {
    if (durationMs <= bucket) {
      const entry = metrics.queryDuration.find(e => e.bucket === bucket);
      if (entry) {
        entry.count++;
      } else {
        metrics.queryDuration.push({ bucket, count: 1 });
      }
      break;
    }
  }
}

/**
 * Record cache hit
 */
export function recordCacheHit(): void {
  metrics.cacheHits++;
}

/**
 * Record cache miss
 */
export function recordCacheMiss(): void {
  metrics.cacheMisses++;
}

/**
 * Record safety violation
 */
export function recordSafetyViolation(): void {
  metrics.safetyViolations++;
}

/**
 * Record LLM request
 */
export function recordLLMRequest(provider: 'anthropic' | 'openai'): void {
  const entry = metrics.llmRequests.find(e => e.provider === provider);
  if (entry) {
    entry.count++;
  } else {
    metrics.llmRequests.push({ provider, count: 1 });
  }
}

/**
 * Record query error
 */
export function recordQueryError(type: string): void {
  const entry = metrics.queryErrors.find(e => e.type === type);
  if (entry) {
    entry.count++;
  } else {
    metrics.queryErrors.push({ type, count: 1 });
  }
}

/**
 * Register metrics routes
 */
export async function metricsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    const output: string[] = [];

    // Query duration histogram
    output.push('# HELP nlq_query_duration_seconds Query execution time histogram');
    output.push('# TYPE nlq_query_duration_seconds histogram');
    for (const { bucket, count } of metrics.queryDuration) {
      output.push(`nlq_query_duration_seconds_bucket{le="${bucket / 1000}"} ${count}`);
    }

    // Cache metrics
    output.push('# HELP nlq_cache_hits_total Cache hit counter');
    output.push('# TYPE nlq_cache_hits_total counter');
    output.push(`nlq_cache_hits_total ${metrics.cacheHits}`);

    output.push('# HELP nlq_cache_misses_total Cache miss counter');
    output.push('# TYPE nlq_cache_misses_total counter');
    output.push(`nlq_cache_misses_total ${metrics.cacheMisses}`);

    // Safety violations
    output.push('# HELP nlq_safety_violations_total Safety check failures');
    output.push('# TYPE nlq_safety_violations_total counter');
    output.push(`nlq_safety_violations_total ${metrics.safetyViolations}`);

    // LLM requests
    output.push('# HELP nlq_llm_requests_total LLM API calls by provider');
    output.push('# TYPE nlq_llm_requests_total counter');
    for (const { provider, count } of metrics.llmRequests) {
      output.push(`nlq_llm_requests_total{provider="${provider}"} ${count}`);
    }

    // Query errors
    output.push('# HELP nlq_query_errors_total Query errors by type');
    output.push('# TYPE nlq_query_errors_total counter');
    for (const { type, count } of metrics.queryErrors) {
      output.push(`nlq_query_errors_total{type="${type}"} ${count}`);
    }

    reply
      .type('text/plain; version=0.0.4; charset=utf-8')
      .send(output.join('\n'));
  });
}
