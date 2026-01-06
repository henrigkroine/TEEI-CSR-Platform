/**
 * Model Registry Types
 * Type definitions for tenant-specific model configuration overrides
 */

import { z } from 'zod';

// ============================================================================
// Regional Policy Configuration
// ============================================================================

/**
 * Supported data residency regions
 * Supports both simple codes and AWS-style region identifiers
 */
export const RegionSchema = z.enum([
  // Simple region codes
  'us',
  'eu',
  'uk',
  'ap',
  'global',
  // AWS-style region identifiers
  'eu-central-1',  // Frankfurt, Germany
  'eu-west-1',     // Ireland
  'us-east-1',     // Virginia, USA
  'us-west-2',     // Oregon, USA
  'ap-southeast-1', // Singapore
]);

export type Region = z.infer<typeof RegionSchema>;

/** Alias for backwards compatibility */
export type DataRegion = Region;

/**
 * Regional policy enforcement mode
 */
export const RegionEnforcementModeSchema = z.enum([
  'strict',   // Block requests to disallowed regions (GDPR)
  'advisory', // Log warnings but allow
  'disabled', // No enforcement
]);

export type RegionEnforcementMode = z.infer<typeof RegionEnforcementModeSchema>;

/**
 * Regional policy for model selection
 */
export const RegionPolicySchema = z.object({
  allowedRegions: z.array(RegionSchema),
  primaryRegion: RegionSchema.optional(),
  preferredRegion: RegionSchema.optional(),
  enforcementMode: RegionEnforcementModeSchema.default('strict'),
  enforceStrict: z.boolean().default(true),
  fallbackBehavior: z.enum(['use_primary', 'fail']).default('use_primary'),
  fallbackRegion: RegionSchema.optional(),
});

export type RegionPolicy = z.infer<typeof RegionPolicySchema>;

// ============================================================================
// Q2Q Model Configuration
// ============================================================================

export const Q2QWeightsSchema = z.object({
  confidence: z.number().min(0).max(1),
  belonging: z.number().min(0).max(1),
  language_proficiency: z.number().min(0).max(1),
  job_readiness: z.number().min(0).max(1),
  wellbeing: z.number().min(0).max(1),
}).refine(
  (weights) => {
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    return Math.abs(sum - 1.0) < 0.001; // Allow for floating point errors
  },
  { message: 'Weights must sum to 1.0' }
);

export const Q2QThresholdsSchema = z.object({
  confidence: z.number().min(0).max(1).default(0.7),
  belonging: z.number().min(0).max(1).default(0.7),
  language_proficiency: z.number().min(0).max(1).default(0.7),
  job_readiness: z.number().min(0).max(1).default(0.7),
  wellbeing: z.number().min(0).max(1).default(0.7),
});

export const Q2QConfigSchema = z.object({
  model: z.enum(['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet-20241022', 'gemini-1.5-flash']).optional(),
  weights: Q2QWeightsSchema.optional(),
  thresholds: Q2QThresholdsSchema.optional(),
  temperature: z.number().min(0).max(2).default(0.3).optional(),
  maxTokens: z.number().min(100).max(4000).default(2000).optional(),
  regionPolicy: RegionPolicySchema.optional(),
});

export type Q2QWeights = z.infer<typeof Q2QWeightsSchema>;
export type Q2QThresholds = z.infer<typeof Q2QThresholdsSchema>;
export type Q2QConfig = z.infer<typeof Q2QConfigSchema>;

// ============================================================================
// SROI Calculator Configuration
// ============================================================================

export const SROIConfigSchema = z.object({
  deadweightFactor: z.number().min(0).max(1).default(0.1).optional(),
  attributionFactor: z.number().min(0).max(1).default(0.85).optional(),
  dropOffRate: z.number().min(0).max(1).default(0.25).optional(),
  discountRate: z.number().min(0).max(0.2).default(0.035).optional(),
  financialProxies: z.record(z.number().min(0)).optional(),
});

export type SROIConfig = z.infer<typeof SROIConfigSchema>;

// ============================================================================
// VIS Calculator Configuration
// ============================================================================

export const VISWeightsSchema = z.object({
  frequency: z.number().min(0).max(1).default(0.25),
  duration: z.number().min(0).max(1).default(0.2),
  skills_applied: z.number().min(0).max(1).default(0.3),
  beneficiary_reach: z.number().min(0).max(1).default(0.25),
}).refine(
  (weights) => {
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    return Math.abs(sum - 1.0) < 0.001;
  },
  { message: 'Weights must sum to 1.0' }
);

export const VISConfigSchema = z.object({
  weights: VISWeightsSchema.optional(),
});

export type VISWeights = z.infer<typeof VISWeightsSchema>;
export type VISConfig = z.infer<typeof VISConfigSchema>;

// ============================================================================
// Guardrails
// ============================================================================

export const GuardrailsSchema = z.object({
  minFairnessThreshold: z.number().min(0.8).max(1.0).default(0.9).optional(),
  minPrivacyRedaction: z.boolean().default(true).optional(),
  maxCostPerRequest: z.number().min(0).optional(),
});

export type Guardrails = z.infer<typeof GuardrailsSchema>;

// ============================================================================
// Rollback Configuration
// ============================================================================

export const RollbackTriggerSchema = z.enum([
  'accuracy_drop',
  'latency_spike',
  'cost_overrun',
  'fairness_violation',
]);

export const RollbackConfigSchema = z.object({
  previousVersion: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  autoRollbackTriggers: z.array(RollbackTriggerSchema).optional(),
  canaryPercentage: z.number().min(0).max(100).default(10).optional(),
});

export type RollbackTrigger = z.infer<typeof RollbackTriggerSchema>;
export type RollbackConfig = z.infer<typeof RollbackConfigSchema>;

// ============================================================================
// Tenant Override (Complete Schema)
// ============================================================================

export const TenantOverrideSchema = z.object({
  // Metadata
  tenantId: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  createdAt: z.string().datetime(),
  createdBy: z.string(),
  description: z.string().optional(),

  // Model Configurations
  q2q: Q2QConfigSchema.optional(),
  sroi: SROIConfigSchema.optional(),
  vis: VISConfigSchema.optional(),

  // Regional Policy (global, applies to all AI operations)
  regionPolicy: RegionPolicySchema.optional(),

  // Guardrails and Rollback
  guardrails: GuardrailsSchema.optional(),
  rollback: RollbackConfigSchema.optional(),
});

export type TenantOverride = z.infer<typeof TenantOverrideSchema>;

// ============================================================================
// Global Defaults
// ============================================================================

export const GLOBAL_DEFAULTS: Required<Omit<TenantOverride, 'tenantId' | 'version' | 'createdAt' | 'createdBy' | 'description' | 'rollback'>> = {
  q2q: {
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 2000,
    weights: {
      confidence: 0.2,
      belonging: 0.2,
      language_proficiency: 0.2,
      job_readiness: 0.2,
      wellbeing: 0.2,
    },
    thresholds: {
      confidence: 0.7,
      belonging: 0.7,
      language_proficiency: 0.7,
      job_readiness: 0.7,
      wellbeing: 0.7,
    },
    regionPolicy: {
      allowedRegions: ['global'],
      enforceStrict: false,
      enforcementMode: 'disabled',
      fallbackBehavior: 'use_primary',
    },
  },
  sroi: {
    deadweightFactor: 0.1,
    attributionFactor: 0.85,
    dropOffRate: 0.25,
    discountRate: 0.035,
  },
  vis: {
    weights: {
      frequency: 0.25,
      duration: 0.2,
      skills_applied: 0.3,
      beneficiary_reach: 0.25,
    },
  },
  regionPolicy: {
    allowedRegions: ['eu-central-1', 'eu-west-1', 'us-east-1', 'us-west-2', 'ap-southeast-1'],
    primaryRegion: 'us-east-1',
    enforcementMode: 'advisory',
    enforceStrict: false,
    fallbackBehavior: 'use_primary',
  },
  guardrails: {
    minFairnessThreshold: 0.9,
    minPrivacyRedaction: true,
    maxCostPerRequest: 0.5,
  },
};

// ============================================================================
// Validation Errors
// ============================================================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GuardrailViolationError extends Error {
  constructor(
    message: string,
    public readonly guardrail: string,
    public readonly attemptedValue: unknown,
    public readonly minimumValue: unknown
  ) {
    super(message);
    this.name = 'GuardrailViolationError';
  }
}
