/**
 * Shared TypeScript types for Enterprise Hierarchies & Consolidated Reporting
 */

/**
 * Organization (parent entity that owns hierarchies)
 */
export interface Org {
  id: string;
  name: string;
  currency: string; // ISO 4217 code (USD, EUR, GBP, etc.)
  ownerUserId: string;
  logoUrl?: string;
  theme?: Record<string, any>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Organizational unit (node in hierarchy tree)
 */
export interface OrgUnit {
  id: string;
  orgId: string;
  parentId?: string;
  name: string;
  code: string; // Unique code like "ACME-UK-NORTH"
  description?: string;
  currency?: string; // Optional override, inherits from org if null
  active: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Organizational unit member (links TEEI tenants to org units)
 */
export interface OrgUnitMember {
  id: string;
  orgUnitId: string;
  tenantId: string; // Reference to companies.id
  percentShare: number; // 0.00 to 100.00
  startDate: string; // ISO date
  endDate?: string; // Optional, for time-bound memberships
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Elimination rule types
 */
export type EliminationRuleType =
  | 'EVENT_SOURCE'  // Eliminate events from specific source
  | 'TENANT_PAIR'   // Eliminate inter-company transactions
  | 'MANUAL'        // Manual elimination pattern
  | 'TAG_BASED';    // Eliminate based on event tags

/**
 * Elimination rule
 */
export interface EliminationRule {
  id: string;
  orgId: string;
  name: string;
  ruleType: EliminationRuleType;
  patternJson: Record<string, any>; // Rule-specific pattern
  description?: string;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Consolidation adjustment (manual correction)
 */
export interface ConsolAdjustment {
  id: string;
  orgId: string;
  period: string; // ISO date (period start)
  metric: string; // 'sroi', 'vis', 'volunteer_hours', etc.
  amountLocal: number;
  amountBase: number;
  currency: string;
  note: string; // Mandatory explanation
  orgUnitId?: string;
  version: number;
  published: boolean;
  publishedAt?: string;
  publishedBy?: string;
  createdBy: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

/**
 * FX rate
 */
export interface FxRate {
  id: string;
  day: string; // ISO date
  base: string; // ISO 4217 code
  quote: string; // ISO 4217 code
  rate: number;
  source?: string; // 'manual', 'ecb', 'fed', etc.
  createdBy?: string;
  createdAt: string;
}

/**
 * Consolidation fact (rolled-up metric)
 */
export interface ConsolFact {
  id: string;
  orgId: string;
  orgUnitId: string;
  period: string; // ISO date (period start)
  metric: string;
  valueLocal: number;
  valueBase: number;
  currency: string;
  fxRate?: number;
  eliminated: number;
  adjusted: number;
  runId?: string;
  calculatedAt: string;
  metadata?: Record<string, any>;
}

/**
 * Consolidation run status
 */
export type ConsolRunStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Consolidation run
 */
export interface ConsolRun {
  id: string;
  orgId: string;
  period: string; // ISO date
  scope?: Record<string, any>; // Which org units to include
  status: ConsolRunStatus;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  stats?: {
    unitsProcessed?: number;
    metricsCalculated?: number;
    eliminationsApplied?: number;
    adjustmentsApplied?: number;
  };
  triggeredBy: string;
  createdAt: string;
}

/**
 * Hierarchy audit entry
 */
export interface HierarchyAudit {
  id: string;
  orgId: string;
  entityType: 'org' | 'org_unit' | 'org_unit_member' | 'elimination_rule';
  entityId: string;
  action: string; // 'created', 'updated', 'deleted', 'activated', 'deactivated'
  changes?: Record<string, any>;
  performedBy: string;
  performedAt: string;
  metadata?: Record<string, any>;
}

/**
 * Tree node for UI rendering (includes children)
 */
export interface OrgUnitTreeNode extends OrgUnit {
  children?: OrgUnitTreeNode[];
  memberCount?: number;
  totalMembers?: number; // Including descendants
}

/**
 * DTOs for API requests/responses
 */

export interface CreateOrgRequest {
  name: string;
  currency: string;
  logoUrl?: string;
  theme?: Record<string, any>;
}

export interface UpdateOrgRequest {
  name?: string;
  currency?: string;
  logoUrl?: string;
  theme?: Record<string, any>;
  active?: boolean;
}

export interface CreateOrgUnitRequest {
  orgId: string;
  parentId?: string;
  name: string;
  code: string;
  description?: string;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface UpdateOrgUnitRequest {
  name?: string;
  code?: string;
  description?: string;
  currency?: string;
  parentId?: string;
  active?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateOrgUnitMemberRequest {
  orgUnitId: string;
  tenantId: string;
  percentShare: number;
  startDate: string;
  endDate?: string;
  metadata?: Record<string, any>;
}

export interface UpdateOrgUnitMemberRequest {
  percentShare?: number;
  startDate?: string;
  endDate?: string;
  metadata?: Record<string, any>;
}

export interface CreateEliminationRuleRequest {
  orgId: string;
  name: string;
  ruleType: EliminationRuleType;
  patternJson: Record<string, any>;
  description?: string;
}

export interface UpdateEliminationRuleRequest {
  name?: string;
  patternJson?: Record<string, any>;
  description?: string;
  active?: boolean;
}

export interface CreateConsolAdjustmentRequest {
  orgId: string;
  period: string;
  metric: string;
  amountLocal: number;
  currency: string;
  note: string;
  orgUnitId?: string;
  metadata?: Record<string, any>;
}

export interface CreateFxRateRequest {
  day: string;
  base: string;
  quote: string;
  rate: number;
  source?: string;
}

export interface RunConsolidationRequest {
  orgId: string;
  period: string;
  scope?: {
    orgUnitIds?: string[];
    includeDescendants?: boolean;
  };
}

export interface ConsolFactsQuery {
  orgId?: string;
  orgUnitId?: string;
  period?: string;
  metric?: string;
  periodStart?: string;
  periodEnd?: string;
}

/**
 * Metric types supported by consolidation
 */
export type ConsolidationMetric =
  | 'sroi'
  | 'vis'
  | 'volunteer_hours'
  | 'donation_amount'
  | 'compute_cost'
  | 'storage_cost'
  | 'ai_cost'
  | 'total_cost'
  | 'sdg_1'  // SDG mappings
  | 'sdg_2'
  | 'sdg_3'
  | 'sdg_4'
  | 'sdg_5'
  | 'sdg_6'
  | 'sdg_7'
  | 'sdg_8'
  | 'sdg_9'
  | 'sdg_10'
  | 'sdg_11'
  | 'sdg_12'
  | 'sdg_13'
  | 'sdg_14'
  | 'sdg_15'
  | 'sdg_16'
  | 'sdg_17';

/**
 * Rollup result (used internally by consolidation engine)
 */
export interface RollupResult {
  orgUnitId: string;
  metric: ConsolidationMetric;
  valueLocal: number;
  valueBase: number;
  currency: string;
  fxRate?: number;
  eliminated: number;
  adjusted: number;
  breakdown?: {
    tenantId: string;
    value: number;
    currency: string;
    eliminated?: boolean;
  }[];
}

/**
 * Consolidation diff (for comparing periods)
 */
export interface ConsolidationDiff {
  orgUnitId: string;
  metric: ConsolidationMetric;
  previousPeriod: string;
  currentPeriod: string;
  previousValue: number;
  currentValue: number;
  change: number;
  changePercent: number;
  currency: string;
  fxImpact?: number; // Impact of FX rate changes
}
