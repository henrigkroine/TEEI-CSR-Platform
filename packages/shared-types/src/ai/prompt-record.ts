/**
 * AI Prompt Audit Types
 * Worker 10: AI/ML Explainability & Guardrails
 *
 * Defines types for AI prompt audit trail, explainability, and guardrails
 */

import { z } from 'zod';

// ============================================================================
// Guardrail Results
// ============================================================================

export const SafetyCheckDetailsSchema = z.object({
  categoriesChecked: z.array(z.string()),
  violations: z.array(z.object({
    category: z.string(),
    confidence: z.number().min(0).max(1),
    flaggedText: z.string().optional(), // excerpt, not full text
  })),
  rationale: z.string().optional(),
  checkDurationMs: z.number().optional(),
});

export const EvidenceGateDetailsSchema = z.object({
  minCitationsRequired: z.number(),
  actualCitations: z.number(),
  citationDensity: z.number(), // citations per 100 words
  paragraphCount: z.number(),
  warnings: z.array(z.string()).optional(),
});

export const BudgetCheckDetailsSchema = z.object({
  limitUsd: z.number(),
  usedUsd: z.number(),
  remainingUsd: z.number(),
  thisCostUsd: z.number(),
  period: z.enum(['daily', 'monthly']),
  resetAt: z.string(), // ISO datetime
});

export type SafetyCheckDetails = z.infer<typeof SafetyCheckDetailsSchema>;
export type EvidenceGateDetails = z.infer<typeof EvidenceGateDetailsSchema>;
export type BudgetCheckDetails = z.infer<typeof BudgetCheckDetailsSchema>;

// ============================================================================
// Explainability
// ============================================================================

export const SectionExplanationSchema = z.object({
  sectionType: z.string(),
  whyThisSection: z.string(), // reasoning for including this section
  topEvidenceIds: z.array(z.string()), // top-k evidence IDs
  variablesUsed: z.record(z.string(), z.any()), // template variables (masked)
});

export type SectionExplanation = z.infer<typeof SectionExplanationSchema>;

// ============================================================================
// Prompt Record (main audit record)
// ============================================================================

export const PromptRecordStatusSchema = z.enum([
  'success',
  'failed',
  'blocked_safety',
  'blocked_evidence',
  'blocked_budget',
]);

export const PromptRecordSchema = z.object({
  // Primary identifiers
  id: z.string().uuid(),
  requestId: z.string(),
  companyId: z.string().uuid(),
  userId: z.string().uuid().optional(),

  // Model and configuration
  modelName: z.string(),
  modelVersion: z.string().optional(),
  provider: z.enum(['openai', 'anthropic', 'google', 'azure']),
  region: z.string().optional(),

  // Prompt details (masked, no PII)
  promptTemplate: z.string().optional(),
  promptHash: z.string(), // SHA256
  promptVariables: z.record(z.string(), z.any()).optional(),

  // Output details
  outputHash: z.string(), // SHA256
  outputSummary: z.string().optional(),

  // Evidence and citations
  evidenceIds: z.array(z.string()),
  citationCount: z.number().default(0),
  topK: z.number().optional(),

  // Token usage and costs
  tokensInput: z.number(),
  tokensOutput: z.number(),
  tokensTotal: z.number(),
  costUsd: z.number(),

  // Performance metrics
  latencyMs: z.number(),
  createdAt: z.string(), // ISO datetime

  // Guardrail outcomes
  safetyCheckPassed: z.boolean(),
  safetyCheckDetails: SafetyCheckDetailsSchema.optional(),

  evidenceGatePassed: z.boolean(),
  evidenceGateDetails: EvidenceGateDetailsSchema.optional(),

  budgetCheckPassed: z.boolean(),
  budgetCheckDetails: BudgetCheckDetailsSchema.optional(),

  // Overall status
  status: PromptRecordStatusSchema,
  errorMessage: z.string().optional(),

  // Explainability data
  sectionExplanations: z.array(SectionExplanationSchema).optional(),
  retryCount: z.number().default(0),
  parentRequestId: z.string().optional(),

  // Operation context
  operation: z.enum(['report-generation', 'nlq-query', 'q2q-classification', 'other']),

  // Audit trail
  createdBy: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PromptRecord = z.infer<typeof PromptRecordSchema>;
export type PromptRecordStatus = z.infer<typeof PromptRecordStatusSchema>;

// ============================================================================
// Create Prompt Record Input (for persistence)
// ============================================================================

export const CreatePromptRecordSchema = PromptRecordSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePromptRecord = z.infer<typeof CreatePromptRecordSchema>;

// ============================================================================
// AI Budget Configuration
// ============================================================================

export const AIBudgetConfigSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),

  dailyLimitUsd: z.number().min(0),
  monthlyLimitUsd: z.number().min(0),

  dailyUsedUsd: z.number().min(0),
  monthlyUsedUsd: z.number().min(0),

  dailyResetAt: z.string(),
  monthlyResetAt: z.string(),

  alertThresholdPct: z.number().min(0).max(100).default(80),

  enabled: z.boolean().default(true),

  createdAt: z.string(),
  updatedAt: z.string().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type AIBudgetConfig = z.infer<typeof AIBudgetConfigSchema>;

// ============================================================================
// AI Safety Policy
// ============================================================================

export const AISafetyPolicySchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid().optional(), // null for global policy

  isGlobal: z.boolean().default(false),

  blockedCategories: z.array(z.string()),
  warningCategories: z.array(z.string()),

  minConfidenceThreshold: z.number().min(0).max(1).default(0.7),

  blockOnViolation: z.boolean().default(true),
  logViolations: z.boolean().default(true),

  enabled: z.boolean().default(true),

  createdAt: z.string(),
  updatedAt: z.string().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type AISafetyPolicy = z.infer<typeof AISafetyPolicySchema>;

// ============================================================================
// Audit Query Filters
// ============================================================================

export const AuditQueryFiltersSchema = z.object({
  companyId: z.string().uuid(),
  since: z.string().optional(), // ISO datetime
  until: z.string().optional(),
  model: z.string().optional(),
  operation: z.enum(['report-generation', 'nlq-query', 'q2q-classification', 'other']).optional(),
  status: PromptRecordStatusSchema.optional(),
  safetyCheckPassed: z.boolean().optional(),
  evidenceGatePassed: z.boolean().optional(),
  budgetCheckPassed: z.boolean().optional(),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0),
});

export type AuditQueryFilters = z.infer<typeof AuditQueryFiltersSchema>;

// ============================================================================
// Explainability Request
// ============================================================================

export const ExplainRequestSchema = z.object({
  promptRecordId: z.string().uuid(),
  includePrompt: z.boolean().default(false),
  includeOutput: z.boolean().default(false),
  includeEvidence: z.boolean().default(true),
});

export type ExplainRequest = z.infer<typeof ExplainRequestSchema>;

// ============================================================================
// Explainability Response
// ============================================================================

export const ExplainResponseSchema = z.object({
  promptRecord: PromptRecordSchema,
  promptTemplate: z.string().optional(),
  promptReconstructed: z.string().optional(),
  outputFull: z.string().optional(),
  evidenceSnippets: z.array(z.object({
    id: z.string(),
    text: z.string(),
    dimension: z.string().optional(),
    score: z.number().optional(),
    relevanceScore: z.number().optional(),
  })).optional(),
  sectionBreakdown: z.array(z.object({
    sectionType: z.string(),
    reasoning: z.string(),
    evidenceUsed: z.array(z.string()),
    variables: z.record(z.string(), z.any()),
  })).optional(),
});

export type ExplainResponse = z.infer<typeof ExplainResponseSchema>;
