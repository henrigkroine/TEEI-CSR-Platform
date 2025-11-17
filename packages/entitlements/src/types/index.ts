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
  GEN_AI_REPORTS = 'gen_ai_reports',
  API_ACCESS = 'api_access',
  SSO = 'sso',
  CUSTOM_BRANDING = 'custom_branding',
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
 * Admin roles for Admin Studio v2
 */
export enum AdminRole {
  OWNER = 'owner', // Full access to all admin functions
  BILLING_ADMIN = 'billing_admin', // Manage plans, entitlements, invoices
  IDENTITY_ADMIN = 'identity_admin', // Manage SSO, SCIM, users, groups
  VIEWER = 'viewer', // Read-only access to admin settings
}

/**
 * Admin role permissions map
 */
export const ADMIN_ROLE_PERMISSIONS = {
  [AdminRole.OWNER]: {
    canManageTenants: true,
    canSuspendTenants: true,
    canTerminateTenants: true,
    canManageSSO: true,
    canManageSCIM: true,
    canManageBilling: true,
    canManageResidency: true,
    canRotateSecrets: true,
    canCreateSnapshots: true,
    canViewAuditLogs: true,
  },
  [AdminRole.BILLING_ADMIN]: {
    canManageTenants: false,
    canSuspendTenants: false,
    canTerminateTenants: false,
    canManageSSO: false,
    canManageSCIM: false,
    canManageBilling: true,
    canManageResidency: false,
    canRotateSecrets: false,
    canCreateSnapshots: false,
    canViewAuditLogs: true,
  },
  [AdminRole.IDENTITY_ADMIN]: {
    canManageTenants: false,
    canSuspendTenants: false,
    canTerminateTenants: false,
    canManageSSO: true,
    canManageSCIM: true,
    canManageBilling: false,
    canManageResidency: false,
    canRotateSecrets: false,
    canCreateSnapshots: false,
    canViewAuditLogs: true,
  },
  [AdminRole.VIEWER]: {
    canManageTenants: false,
    canSuspendTenants: false,
    canTerminateTenants: false,
    canManageSSO: false,
    canManageSCIM: false,
    canManageBilling: false,
    canManageResidency: false,
    canRotateSecrets: false,
    canCreateSnapshots: false,
    canViewAuditLogs: true,
  },
} as const;

/**
 * Check if admin has permission
 */
export function hasAdminPermission(role: AdminRole, permission: keyof typeof ADMIN_ROLE_PERMISSIONS[AdminRole.OWNER]): boolean {
  const permissions = ADMIN_ROLE_PERMISSIONS[role];
  return permissions ? permissions[permission] : false;
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
    features: Set<Feature>;
  };
  pro: {
    maxSeats: number;
    maxReportsPerMonth: number;
    maxAiTokensPerMonth: number;
    maxStorageGB: number;
    features: Set<Feature>;
  };
  enterprise: {
    maxSeats: null; // unlimited
    maxReportsPerMonth: null;
    maxAiTokensPerMonth: null;
    maxStorageGB: null;
    features: Set<Feature>;
  };
}

/**
 * Default plan features
 */
export const DEFAULT_PLAN_FEATURES: PlanFeatures = {
  starter: {
    maxSeats: 5,
    maxReportsPerMonth: 10,
    maxAiTokensPerMonth: 100000,
    maxStorageGB: 10,
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
    features: new Set([
      Feature.REPORT_BUILDER,
      Feature.BOARDROOM_LIVE,
      Feature.FORECAST,
      Feature.BENCHMARKING,
      Feature.NLQ,
      Feature.GEN_AI_REPORTS,
      Feature.EXPORT_PDF,
      Feature.EXPORT_CSV,
      Feature.EXPORT_PPTX,
      Feature.API_ACCESS,
      Feature.SSO,
      Feature.CUSTOM_BRANDING,
      Feature.PRIORITY_SUPPORT,
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
