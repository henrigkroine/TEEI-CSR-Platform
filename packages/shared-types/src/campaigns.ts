import { z } from 'zod';

/**
 * Campaigns Types & Validation
 *
 * SWARM 6: Beneficiary Groups, Campaigns & Monetization
 * Sellable CSR products linking templates, beneficiary groups, and commercial terms
 *
 * @see /packages/shared-schema/src/schema/campaigns.ts
 * @see /docs/CAMPAIGN_LIFECYCLE.md
 * @see /docs/CAMPAIGN_PRICING_MODELS.md
 */

// ============================================================================
// ENUMS (matching database enums)
// ============================================================================

export const CampaignStatusEnum = z.enum([
  'draft',
  'planned',
  'recruiting',
  'active',
  'paused',
  'completed',
  'closed'
]);

export const PricingModelEnum = z.enum([
  'seats',
  'credits',
  'bundle',
  'iaas',
  'custom'
]);

export const CampaignPriorityEnum = z.enum([
  'low',
  'medium',
  'high',
  'critical'
]);

// Type exports
export type CampaignStatus = z.infer<typeof CampaignStatusEnum>;
export type PricingModel = z.infer<typeof PricingModelEnum>;
export type CampaignPriority = z.infer<typeof CampaignPriorityEnum>;

// ============================================================================
// COMPLEX TYPES (JSONB fields)
// ============================================================================

/**
 * IAAS (Impact-as-a-Service) pricing metrics
 */
export const IAASMetricsSchema = z.object({
  learnersCommitted: z.number().int().min(0),
  pricePerLearner: z.number().min(0),
  outcomesGuaranteed: z.array(z.string()),
  outcomeThresholds: z.record(z.string(), z.number()).optional(),
});

export type IAASMetrics = z.infer<typeof IAASMetricsSchema>;

/**
 * Custom pricing terms
 */
export const CustomPricingTermsSchema = z.object({
  description: z.string().optional(),
  fixedFee: z.number().min(0).optional(),
  variableComponents: z.array(z.object({
    name: z.string(),
    unit: z.string(),
    rate: z.number().min(0),
    cap: z.number().min(0).optional(),
  })).optional(),
  milestonePayments: z.array(z.object({
    milestone: z.string(),
    amount: z.number().min(0),
    dueDate: z.string().date().optional(),
  })).optional(),
});

export type CustomPricingTerms = z.infer<typeof CustomPricingTermsSchema>;

/**
 * Configuration overrides from template
 */
export const ConfigOverridesSchema = z.record(z.string(), z.any());

export type ConfigOverrides = z.infer<typeof ConfigOverridesSchema>;

// ============================================================================
// API SCHEMAS (for requests/responses)
// ============================================================================

/**
 * Create campaign request
 */
export const CreateCampaignSchema = z.object({
  // Required fields
  name: z.string()
    .min(1, "Campaign name is required")
    .max(255, "Campaign name must be 255 characters or less"),

  companyId: z.string().uuid("Invalid company ID"),
  programTemplateId: z.string().uuid("Invalid program template ID"),
  beneficiaryGroupId: z.string().uuid("Invalid beneficiary group ID"),

  startDate: z.string().date("Invalid start date (use YYYY-MM-DD)"),
  endDate: z.string().date("Invalid end date (use YYYY-MM-DD)"),

  targetVolunteers: z.number().int().min(1, "Must target at least 1 volunteer"),
  targetBeneficiaries: z.number().int().min(1, "Must target at least 1 beneficiary"),

  budgetAllocated: z.number().min(0, "Budget must be non-negative"),
  currency: z.string().length(3, "Currency must be ISO 4217 code (3 letters)").default('EUR'),

  pricingModel: PricingModelEnum,

  // Optional fields
  description: z.string().max(5000, "Description too long").optional(),
  quarter: z.string().max(10).optional(), // "2025-Q1"

  status: CampaignStatusEnum.optional(),
  priority: CampaignPriorityEnum.optional(),

  maxSessions: z.number().int().min(1).optional(),

  // Pricing model specific fields
  committedSeats: z.number().int().min(1).optional(),
  seatPricePerMonth: z.number().min(0).optional(),

  creditAllocation: z.number().int().min(1).optional(),
  creditConsumptionRate: z.number().min(0).optional(),

  iaasMetrics: IAASMetricsSchema.optional(),

  l2iSubscriptionId: z.string().uuid().optional(),
  bundleAllocationPercentage: z.number().min(0).max(1).optional(),

  customPricingTerms: CustomPricingTermsSchema.optional(),

  // Configuration
  configOverrides: ConfigOverridesSchema.optional(),

  // Metadata
  tags: z.array(z.string().max(50)).max(20).optional(),
  internalNotes: z.string().max(10000).optional(),

  isActive: z.boolean().optional(),
}).refine(
  (data) => {
    // Validate date range
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start < end;
  },
  {
    message: "Start date must be before end date",
    path: ["endDate"],
  }
).refine(
  (data) => {
    // Validate seats pricing model has required fields
    if (data.pricingModel === 'seats') {
      return data.committedSeats !== undefined && data.seatPricePerMonth !== undefined;
    }
    return true;
  },
  {
    message: "Seats pricing model requires committedSeats and seatPricePerMonth",
    path: ["pricingModel"],
  }
).refine(
  (data) => {
    // Validate credits pricing model has required fields
    if (data.pricingModel === 'credits') {
      return data.creditAllocation !== undefined && data.creditConsumptionRate !== undefined;
    }
    return true;
  },
  {
    message: "Credits pricing model requires creditAllocation and creditConsumptionRate",
    path: ["pricingModel"],
  }
).refine(
  (data) => {
    // Validate IAAS pricing model has required fields
    if (data.pricingModel === 'iaas') {
      return data.iaasMetrics !== undefined;
    }
    return true;
  },
  {
    message: "IAAS pricing model requires iaasMetrics",
    path: ["pricingModel"],
  }
).refine(
  (data) => {
    // Validate bundle pricing model has required fields
    if (data.pricingModel === 'bundle') {
      return data.l2iSubscriptionId !== undefined && data.bundleAllocationPercentage !== undefined;
    }
    return true;
  },
  {
    message: "Bundle pricing model requires l2iSubscriptionId and bundleAllocationPercentage",
    path: ["pricingModel"],
  }
);

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;

/**
 * Update campaign request
 * All fields optional except those that shouldn't change
 */
export const UpdateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),

  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  quarter: z.string().max(10).optional(),

  status: CampaignStatusEnum.optional(),
  priority: CampaignPriorityEnum.optional(),

  targetVolunteers: z.number().int().min(1).optional(),
  targetBeneficiaries: z.number().int().min(1).optional(),
  maxSessions: z.number().int().min(1).optional(),

  budgetAllocated: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),

  // Pricing updates
  committedSeats: z.number().int().min(1).optional(),
  seatPricePerMonth: z.number().min(0).optional(),
  creditAllocation: z.number().int().min(1).optional(),
  creditConsumptionRate: z.number().min(0).optional(),
  iaasMetrics: IAASMetricsSchema.optional(),
  bundleAllocationPercentage: z.number().min(0).max(1).optional(),
  customPricingTerms: CustomPricingTermsSchema.optional(),

  // Configuration
  configOverrides: ConfigOverridesSchema.optional(),

  // Metadata
  tags: z.array(z.string().max(50)).max(20).optional(),
  internalNotes: z.string().max(10000).optional(),

  isActive: z.boolean().optional(),
  isArchived: z.boolean().optional(),
}).refine(
  (data) => {
    // Validate date range if both provided
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return start < end;
    }
    return true;
  },
  {
    message: "Start date must be before end date",
    path: ["endDate"],
  }
);

export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>;

/**
 * Filter/search campaigns
 */
export const FilterCampaignsSchema = z.object({
  companyId: z.string().uuid().optional(),
  programTemplateId: z.string().uuid().optional(),
  beneficiaryGroupId: z.string().uuid().optional(),
  status: CampaignStatusEnum.optional(),
  statuses: z.array(CampaignStatusEnum).optional(),
  priority: CampaignPriorityEnum.optional(),
  pricingModel: PricingModelEnum.optional(),
  l2iSubscriptionId: z.string().uuid().optional(),

  // Date filters
  startDateFrom: z.string().date().optional(),
  startDateTo: z.string().date().optional(),
  endDateFrom: z.string().date().optional(),
  endDateTo: z.string().date().optional(),
  quarter: z.string().max(10).optional(),

  // Capacity filters
  isNearCapacity: z.boolean().optional(),
  isOverCapacity: z.boolean().optional(),
  isHighValue: z.boolean().optional(),
  minUpsellScore: z.number().int().min(0).max(100).optional(),

  // Status filters
  isActive: z.boolean().optional(),
  isArchived: z.boolean().optional(),

  // Search
  tags: z.array(z.string()).optional(),
  search: z.string().max(255).optional(), // Search in name/description

  // Pagination
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['name', 'startDate', 'endDate', 'status', 'capacityUtilization', 'upsellOpportunityScore', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type FilterCampaignsInput = z.infer<typeof FilterCampaignsSchema>;

/**
 * Campaign response (from database)
 */
export const CampaignSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),

  // Relationships
  companyId: z.string().uuid(),
  programTemplateId: z.string().uuid(),
  beneficiaryGroupId: z.string().uuid(),

  // Period
  startDate: z.string(),
  endDate: z.string(),
  quarter: z.string().nullable(),

  // Lifecycle
  status: CampaignStatusEnum,
  priority: CampaignPriorityEnum,

  // Capacity
  targetVolunteers: z.number().int(),
  currentVolunteers: z.number().int(),
  targetBeneficiaries: z.number().int(),
  currentBeneficiaries: z.number().int(),
  maxSessions: z.number().int().nullable(),
  currentSessions: z.number().int(),

  // Budget
  budgetAllocated: z.string(), // Decimal as string
  budgetSpent: z.string(),
  currency: z.string(),

  // Pricing
  pricingModel: PricingModelEnum,
  committedSeats: z.number().int().nullable(),
  seatPricePerMonth: z.string().nullable(),
  creditAllocation: z.number().int().nullable(),
  creditConsumptionRate: z.string().nullable(),
  creditsRemaining: z.number().int().nullable(),
  iaasMetrics: IAASMetricsSchema.nullable(),
  l2iSubscriptionId: z.string().uuid().nullable(),
  bundleAllocationPercentage: z.string().nullable(),
  customPricingTerms: CustomPricingTermsSchema.nullable(),

  // Configuration
  configOverrides: ConfigOverridesSchema,

  // Impact metrics
  cumulativeSROI: z.string().nullable(),
  averageVIS: z.string().nullable(),
  totalHoursLogged: z.string(),
  totalSessionsCompleted: z.number().int(),

  // Upsell indicators
  capacityUtilization: z.string(),
  isNearCapacity: z.boolean(),
  isOverCapacity: z.boolean(),
  isHighValue: z.boolean(),
  upsellOpportunityScore: z.number().int(),

  // Lineage
  evidenceSnippetIds: z.array(z.string()),

  // Metadata
  tags: z.array(z.string()),
  internalNotes: z.string().nullable(),

  // Status
  isActive: z.boolean(),
  isArchived: z.boolean(),

  // Audit
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastMetricsUpdateAt: z.string().datetime().nullable(),
  createdBy: z.string().uuid().nullable(),
});

export type Campaign = z.infer<typeof CampaignSchema>;

/**
 * Paginated response
 */
export const CampaignsResponseSchema = z.object({
  campaigns: z.array(CampaignSchema),
  pagination: z.object({
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
    hasMore: z.boolean(),
  }),
});

export type CampaignsResponse = z.infer<typeof CampaignsResponseSchema>;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if campaign uses seats pricing
 */
export function isSeatsPricing(campaign: Campaign): boolean {
  return campaign.pricingModel === 'seats';
}

/**
 * Check if campaign uses credits pricing
 */
export function isCreditsPricing(campaign: Campaign): boolean {
  return campaign.pricingModel === 'credits';
}

/**
 * Check if campaign uses bundle pricing
 */
export function isBundlePricing(campaign: Campaign): boolean {
  return campaign.pricingModel === 'bundle';
}

/**
 * Check if campaign uses IAAS pricing
 */
export function isIAASPricing(campaign: Campaign): boolean {
  return campaign.pricingModel === 'iaas';
}

/**
 * Check if campaign uses custom pricing
 */
export function isCustomPricing(campaign: Campaign): boolean {
  return campaign.pricingModel === 'custom';
}

/**
 * Check if campaign is active
 */
export function isCampaignActive(campaign: Campaign): boolean {
  return campaign.status === 'active' && campaign.isActive && !campaign.isArchived;
}

/**
 * Check if campaign is completed
 */
export function isCampaignCompleted(campaign: Campaign): boolean {
  return campaign.status === 'completed' || campaign.status === 'closed';
}

/**
 * Check if campaign can be started
 */
export function canStartCampaign(campaign: Campaign): boolean {
  return ['draft', 'planned', 'recruiting'].includes(campaign.status);
}

/**
 * Check if campaign can be paused
 */
export function canPauseCampaign(campaign: Campaign): boolean {
  return campaign.status === 'active';
}

/**
 * Check if campaign can be resumed
 */
export function canResumeCampaign(campaign: Campaign): boolean {
  return campaign.status === 'paused';
}

/**
 * Check if campaign is near capacity
 */
export function isCampaignNearCapacity(campaign: Campaign, threshold: number = 0.8): boolean {
  const utilization = parseFloat(campaign.capacityUtilization);
  return utilization >= threshold && utilization < 1.0;
}

/**
 * Check if campaign is over capacity
 */
export function isCampaignOverCapacity(campaign: Campaign): boolean {
  const utilization = parseFloat(campaign.capacityUtilization);
  return utilization >= 1.0;
}

/**
 * Check if campaign has budget remaining
 */
export function hasBudgetRemaining(campaign: Campaign): boolean {
  const allocated = parseFloat(campaign.budgetAllocated);
  const spent = parseFloat(campaign.budgetSpent);
  return spent < allocated;
}

/**
 * Check if campaign is within date range
 */
export function isCampaignInDateRange(campaign: Campaign, date: Date = new Date()): boolean {
  const start = new Date(campaign.startDate);
  const end = new Date(campaign.endDate);
  return date >= start && date <= end;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Summary type for list views
 */
export type CampaignSummary = Pick<
  Campaign,
  | 'id'
  | 'name'
  | 'status'
  | 'priority'
  | 'pricingModel'
  | 'startDate'
  | 'endDate'
  | 'capacityUtilization'
  | 'isNearCapacity'
  | 'isOverCapacity'
  | 'tags'
  | 'companyId'
>;

/**
 * Capacity metrics
 */
export interface CampaignCapacityMetrics {
  volunteers: {
    target: number;
    current: number;
    utilization: number;
  };
  beneficiaries: {
    target: number;
    current: number;
    utilization: number;
  };
  sessions: {
    target: number | null;
    current: number;
    utilization: number | null;
  };
  budget: {
    allocated: number;
    spent: number;
    remaining: number;
    utilization: number;
  };
}

/**
 * Impact metrics
 */
export interface CampaignImpactMetrics {
  sroi: number | null;
  vis: number | null;
  totalHours: number;
  totalSessions: number;
  evidenceCount: number;
}

/**
 * State transition input
 */
export const CampaignStateTransitionSchema = z.object({
  targetStatus: CampaignStatusEnum,
  reason: z.string().max(500).optional(),
  effectiveDate: z.string().datetime().optional(),
});

export type CampaignStateTransition = z.infer<typeof CampaignStateTransitionSchema>;
