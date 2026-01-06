/**
 * Guardrails Types
 * Worker 10: AI/ML Explainability & Guardrails
 *
 * Types for safety moderation, evidence gating, and budget enforcement
 */

import { z } from 'zod';

// ============================================================================
// Safety Moderation
// ============================================================================

export const SafetyCategorySchema = z.enum([
  'hate',
  'violence',
  'self-harm',
  'sexual',
  'sexual/minors',
  'harassment',
  'dangerous',
]);

export type SafetyCategory = z.infer<typeof SafetyCategorySchema>;

export const SafetyViolationSchema = z.object({
  category: SafetyCategorySchema,
  confidence: z.number().min(0).max(1),
  flaggedText: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high']).optional(),
});

export type SafetyViolation = z.infer<typeof SafetyViolationSchema>;

export const SafetyCheckResultSchema = z.object({
  passed: z.boolean(),
  violations: z.array(SafetyViolationSchema),
  categoriesChecked: z.array(SafetyCategorySchema),
  rationale: z.string().optional(),
  action: z.enum(['allow', 'warn', 'block']),
  checkDurationMs: z.number(),
});

export type SafetyCheckResult = z.infer<typeof SafetyCheckResultSchema>;

export const SafetyCheckRequestSchema = z.object({
  text: z.string(),
  companyId: z.string().uuid(),
  operation: z.string(),
  context: z.record(z.string(), z.any()).optional(),
});

export type SafetyCheckRequest = z.infer<typeof SafetyCheckRequestSchema>;

// ============================================================================
// Evidence Gate
// ============================================================================

export const EvidenceGateConfigSchema = z.object({
  minCitationsPerParagraph: z.number().min(0).default(1),
  minCitationDensity: z.number().min(0).max(1).default(0.5), // per 100 words
  failFast: z.boolean().default(true),
  enabled: z.boolean().default(true),
});

export type EvidenceGateConfig = z.infer<typeof EvidenceGateConfigSchema>;

export const EvidenceGateResultSchema = z.object({
  passed: z.boolean(),
  citationCount: z.number(),
  paragraphCount: z.number(),
  citationDensity: z.number(),
  minCitationsRequired: z.number(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type EvidenceGateResult = z.infer<typeof EvidenceGateResultSchema>;

export const EvidenceGateRequestSchema = z.object({
  generatedText: z.string(),
  availableEvidenceIds: z.array(z.string()),
  config: EvidenceGateConfigSchema.optional(),
});

export type EvidenceGateRequest = z.infer<typeof EvidenceGateRequestSchema>;

// ============================================================================
// Budget Enforcement
// ============================================================================

export const BudgetCheckRequestSchema = z.object({
  companyId: z.string().uuid(),
  estimatedCostUsd: z.number().min(0),
  operation: z.string(),
});

export type BudgetCheckRequest = z.infer<typeof BudgetCheckRequestSchema>;

export const BudgetCheckResultSchema = z.object({
  allowed: z.boolean(),
  limitUsd: z.number(),
  usedUsd: z.number(),
  remainingUsd: z.number(),
  thisCostUsd: z.number(),
  period: z.enum(['daily', 'monthly']),
  resetAt: z.string(),
  thresholdReached: z.boolean(), // true if >= alert threshold
  message: z.string().optional(),
});

export type BudgetCheckResult = z.infer<typeof BudgetCheckResultSchema>;

// ============================================================================
// Combined Guardrails Result
// ============================================================================

export const GuardrailsResultSchema = z.object({
  safety: SafetyCheckResultSchema,
  evidence: EvidenceGateResultSchema.optional(),
  budget: BudgetCheckResultSchema,
  overallPassed: z.boolean(),
  blockedReason: z.string().optional(),
});

export type GuardrailsResult = z.infer<typeof GuardrailsResultSchema>;
