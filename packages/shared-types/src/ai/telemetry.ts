/**
 * AI Telemetry Types
 * Worker 10: AI/ML Explainability & Guardrails
 *
 * Types for OpenTelemetry spans and AI operation tracking
 */

import { z } from 'zod';

// ============================================================================
// AI Operation Span
// ============================================================================

export const AIOperationSpanSchema = z.object({
  // Span metadata
  spanId: z.string(),
  traceId: z.string(),
  parentSpanId: z.string().optional(),

  // Operation details
  operation: z.enum(['report-generation', 'nlq-query', 'q2q-classification', 'other']),
  model: z.string(),
  provider: z.string(),

  // Timing
  startTime: z.number(), // timestamp in ms
  endTime: z.number().optional(),
  durationMs: z.number().optional(),

  // Resource usage
  tokensInput: z.number(),
  tokensOutput: z.number(),
  tokensTotal: z.number(),
  costUsd: z.number(),

  // Context
  companyId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  requestId: z.string(),

  // Status
  status: z.enum(['success', 'error', 'blocked']),
  error: z.string().optional(),

  // Guardrails
  guardrailsPassed: z.boolean(),
  safetyBlocked: z.boolean().default(false),
  evidenceBlocked: z.boolean().default(false),
  budgetBlocked: z.boolean().default(false),

  // Links
  promptRecordId: z.string().uuid().optional(),
});

export type AIOperationSpan = z.infer<typeof AIOperationSpanSchema>;

// ============================================================================
// AI Metrics
// ============================================================================

export const AIMetricsSchema = z.object({
  // Request counts
  totalRequests: z.number(),
  successfulRequests: z.number(),
  failedRequests: z.number(),
  blockedRequests: z.number(),

  // Guardrail metrics
  safetyBlocks: z.number(),
  evidenceBlocks: z.number(),
  budgetBlocks: z.number(),

  // Token usage
  totalTokens: z.number(),
  totalInputTokens: z.number(),
  totalOutputTokens: z.number(),

  // Costs
  totalCostUsd: z.number(),
  avgCostPerRequest: z.number(),

  // Performance
  avgLatencyMs: z.number(),
  p50LatencyMs: z.number(),
  p95LatencyMs: z.number(),
  p99LatencyMs: z.number(),

  // Time period
  periodStart: z.string(),
  periodEnd: z.string(),

  // Grouping
  companyId: z.string().uuid().optional(),
  model: z.string().optional(),
  operation: z.string().optional(),
});

export type AIMetrics = z.infer<typeof AIMetricsSchema>;

// ============================================================================
// Eval Harness Types
// ============================================================================

export const EvalFixtureSchema = z.object({
  id: z.string(),
  name: z.string(),
  operation: z.enum(['report-generation', 'nlq-query', 'q2q-classification']),

  // Input
  promptTemplate: z.string(),
  promptVariables: z.record(z.string(), z.any()),
  evidenceSnippets: z.array(z.object({
    id: z.string(),
    text: z.string(),
    dimension: z.string().optional(),
  })),

  // Expected output
  expectedCitations: z.number().optional(),
  expectedStructure: z.record(z.string(), z.any()).optional(),

  // Golden file
  goldenOutputPath: z.string().optional(),

  // Seed for determinism
  seed: z.number().default(42),
});

export type EvalFixture = z.infer<typeof EvalFixtureSchema>;

export const EvalResultSchema = z.object({
  fixtureId: z.string(),
  fixtureName: z.string(),

  // Scores
  factualityScore: z.number().min(0).max(1), // citation coverage
  structureScore: z.number().min(0).max(1), // output structure match
  safetyScore: z.number().min(0).max(1), // no safety violations

  // Pass/fail
  passed: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),

  // Performance
  latencyMs: z.number(),
  tokensUsed: z.number(),
  costUsd: z.number(),

  // Metadata
  model: z.string(),
  timestamp: z.string(),
});

export type EvalResult = z.infer<typeof EvalResultSchema>;

export const EvalSuiteResultSchema = z.object({
  suiteName: z.string(),
  totalFixtures: z.number(),
  passedFixtures: z.number(),
  failedFixtures: z.number(),

  // Aggregate scores
  avgFactualityScore: z.number(),
  avgStructureScore: z.number(),
  avgSafetyScore: z.number(),

  // Performance
  totalDurationMs: z.number(),
  totalCostUsd: z.number(),

  // Individual results
  results: z.array(EvalResultSchema),

  // Metadata
  timestamp: z.string(),
  model: z.string(),
});

export type EvalSuiteResult = z.infer<typeof EvalSuiteResultSchema>;
