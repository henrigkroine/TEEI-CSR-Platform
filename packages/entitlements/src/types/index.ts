/**
 * Entitlements Type Definitions
 */

import { z } from 'zod';

/**
 * Feature names in the platform
 */
export enum Feature {
  REPORT_BUILDER = 'report_builder',
  BOARDROOM_LIVE = 'boardroom_live',
  FORECAST = 'forecast',
  BENCHMARKING = 'benchmarking',
  NLQ = 'nlq',
  AI_COPILOT = 'ai_copilot',
  GEN_AI_REPORTS = 'gen_ai_reports',
  API_ACCESS = 'api_access',
  EXTERNAL_CONNECTORS = 'external_connectors',
  SSO = 'sso',
  SCIM_PROVISIONING = 'scim_provisioning',
  CUSTOM_BRANDING = 'custom_branding',
  MULTI_REGION = 'multi_region',
  PRIORITY_SUPPORT = 'priority_support',
  EXPORT_PDF = 'export_pdf',
  EXPORT_CSV = 'export_csv',
  EXPORT_PPTX = 'export_pptx',
}

/**
 * Actions that can be performed on features
 */
export enum Action {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  QUERY = 'query',
  CONFIGURE = 'configure',
}

/**
 * Entitlement check request
 */
export const EntitlementCheckRequestSchema = z.object({
  companyId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  feature: z.nativeEnum(Feature),
  action: z.nativeEnum(Action),
  resource: z.string().optional(),
  context: z.record(z.any()).optional(),
});

export type EntitlementCheckRequest = z.infer<typeof EntitlementCheckRequestSchema>;

/**
 * Entitlement decision
 */
export const EntitlementDecisionSchema = z.object({
  allowed: z.boolean(),
  reason: z.string(),
  policyId: z.string().uuid().optional(),
  grantId: z.string().uuid().optional(),
  quotaRemaining: z.number().optional(),
  expiresAt: z.date().optional(),
});

export type EntitlementDecision = z.infer<typeof EntitlementDecisionSchema>;

/**
 * Policy rule
 */
export const PolicyRuleSchema = z.object({
  feature: z.string(),
  actions: z.array(z.string()),
  effect: z.enum(['allow', 'deny']),
  conditions: z.record(z.any()).optional(),
  limits: z.object({
    maxUsagePerDay: z.number().optional(),
    maxUsagePerMonth: z.number().optional(),
    quotaType: z.enum(['requests', 'tokens', 'seats', 'storage']).optional(),
  }).optional(),
});

export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

/**
 * Entitlement policy
 */
export const EntitlementPolicySchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid().optional(),
  name: z.string(),
  description: z.string().optional(),
  rules: z.array(PolicyRuleSchema),
  status: z.enum(['active', 'inactive', 'expired']),
  priority: z.number(),
  validFrom: z.date().optional(),
  validUntil: z.date().optional(),
});

export type EntitlementPolicy = z.infer<typeof EntitlementPolicySchema>;

/**
 * Subscription plan features
 */
export interface PlanFeatures {
  starter: {
    maxSeats: number;
    maxReportsPerMonth: number;
    maxAiTokensPerMonth: number;
    maxStorageGB: number;
    maxNlqQueriesPerMonth: number;
    maxExternalConnectors: number;
    features: Set<Feature>;
  };
  pro: {
    maxSeats: number;
    maxReportsPerMonth: number;
    maxAiTokensPerMonth: number;
    maxStorageGB: number;
    maxNlqQueriesPerMonth: number;
    maxExternalConnectors: number;
    features: Set<Feature>;
  };
  enterprise: {
    maxSeats: null; // unlimited
    maxReportsPerMonth: null;
    maxAiTokensPerMonth: null;
    maxStorageGB: null;
    maxNlqQueriesPerMonth: null;
    maxExternalConnectors: null;
    features: Set<Feature>;
  };
  essentials: {
    maxSeats: number;
    maxReportsPerMonth: number;
    maxAiTokensPerMonth: number;
    maxStorageGB: number;
    maxNlqQueriesPerMonth: number;
    maxExternalConnectors: number;
    features: Set<Feature>;
  };
  professional: {
    maxSeats: number;
    maxReportsPerMonth: number | null;
    maxAiTokensPerMonth: number;
    maxStorageGB: number;
    maxNlqQueriesPerMonth: number;
    maxExternalConnectors: number;
    features: Set<Feature>;
  };
}

/**
 * Default plan features
 */
export const DEFAULT_PLAN_FEATURES: PlanFeatures = {
  // Legacy plans (for existing customers)
  starter: {
    maxSeats: 5,
    maxReportsPerMonth: 10,
    maxAiTokensPerMonth: 100000,
    maxStorageGB: 10,
    maxNlqQueriesPerMonth: 0,
    maxExternalConnectors: 0,
    features: new Set([
      Feature.REPORT_BUILDER,
      Feature.EXPORT_PDF,
      Feature.EXPORT_CSV,
    ]),
  },
  pro: {
    maxSeats: 25,
    maxReportsPerMonth: 100,
    maxAiTokensPerMonth: 1000000,
    maxStorageGB: 100,
    maxNlqQueriesPerMonth: 100,
    maxExternalConnectors: 1,
    features: new Set([
      Feature.REPORT_BUILDER,
      Feature.BOARDROOM_LIVE,
      Feature.FORECAST,
      Feature.BENCHMARKING,
      Feature.NLQ,
      Feature.EXPORT_PDF,
      Feature.EXPORT_CSV,
      Feature.EXPORT_PPTX,
      Feature.API_ACCESS,
    ]),
  },
  enterprise: {
    maxSeats: null,
    maxReportsPerMonth: null,
    maxAiTokensPerMonth: null,
    maxStorageGB: null,
    maxNlqQueriesPerMonth: null,
    maxExternalConnectors: null,
    features: new Set([
      Feature.REPORT_BUILDER,
      Feature.BOARDROOM_LIVE,
      Feature.FORECAST,
      Feature.BENCHMARKING,
      Feature.NLQ,
      Feature.AI_COPILOT,
      Feature.GEN_AI_REPORTS,
      Feature.EXPORT_PDF,
      Feature.EXPORT_CSV,
      Feature.EXPORT_PPTX,
      Feature.API_ACCESS,
      Feature.EXTERNAL_CONNECTORS,
      Feature.SSO,
      Feature.SCIM_PROVISIONING,
      Feature.CUSTOM_BRANDING,
      Feature.MULTI_REGION, // Global (4+ regions)
      Feature.PRIORITY_SUPPORT,
    ]),
  },
  // Founding-8 plans
  essentials: {
    maxSeats: 10,
    maxReportsPerMonth: 50,
    maxAiTokensPerMonth: 500000, // 500K tokens
    maxStorageGB: 50,
    maxNlqQueriesPerMonth: 0, // NLQ not available
    maxExternalConnectors: 0, // No connectors
    features: new Set([
      Feature.REPORT_BUILDER,
      Feature.EXPORT_PDF,
      Feature.EXPORT_CSV,
    ]),
  },
  professional: {
    maxSeats: 50,
    maxReportsPerMonth: null, // Unlimited
    maxAiTokensPerMonth: 2000000, // 2M tokens
    maxStorageGB: 200,
    maxNlqQueriesPerMonth: 200,
    maxExternalConnectors: 2,
    features: new Set([
      Feature.REPORT_BUILDER,
      Feature.BOARDROOM_LIVE,
      Feature.FORECAST,
      Feature.BENCHMARKING,
      Feature.NLQ,
      Feature.AI_COPILOT,
      Feature.EXPORT_PDF,
      Feature.EXPORT_CSV,
      Feature.EXPORT_PPTX,
      Feature.API_ACCESS,
      Feature.EXTERNAL_CONNECTORS,
      Feature.MULTI_REGION, // Dual-region
    ]),
  },
};

/**
 * Cache configuration
 */
export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  ttl: number; // seconds
  keyPrefix: string;
}

/**
 * Entitlement engine configuration
 */
export interface EntitlementEngineConfig {
  cache?: CacheConfig;
  evaluationTimeout?: number; // milliseconds
  enableAuditLog?: boolean;
}
