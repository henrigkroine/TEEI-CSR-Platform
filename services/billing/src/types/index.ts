import { z } from 'zod';

/**
 * Usage Metrics Schema
 * Tracks per-tenant infrastructure and AI token usage
 */
export const UsageMetricSchema = z.object({
  tenantId: z.string().uuid(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),

  // Infrastructure usage
  infra: z.object({
    computeHours: z.number().min(0),
    storageGB: z.number().min(0),
    bandwidthGB: z.number().min(0),
    dbQueries: z.number().int().min(0),
  }),

  // AI token usage (from observability/ai-costs.ts)
  ai: z.object({
    inputTokens: z.number().int().min(0),
    outputTokens: z.number().int().min(0),
    totalCostUSD: z.number().min(0),
    modelBreakdown: z.record(z.object({
      inputTokens: z.number().int().min(0),
      outputTokens: z.number().int().min(0),
      costUSD: z.number().min(0),
    })),
  }),

  // Calculated totals
  totalCostUSD: z.number().min(0),
  region: z.enum(['eu-west-1', 'us-east-1', 'ap-southeast-1']),
});

export type UsageMetric = z.infer<typeof UsageMetricSchema>;

/**
 * Budget Configuration Schema
 * Per-tenant monthly budget with tiered alerts
 */
export const BudgetConfigSchema = z.object({
  tenantId: z.string().uuid(),
  monthlyLimitUSD: z.number().positive(),

  // Alert thresholds (% of budget)
  alerts: z.object({
    warning: z.number().min(0).max(100).default(80),  // 80%
    critical: z.number().min(0).max(100).default(90), // 90%
    exceeded: z.number().min(0).max(100).default(100), // 100%
  }),

  // Actions on budget exceeded
  enforcement: z.object({
    throttleAt: z.number().min(0).max(100).default(95), // Throttle at 95%
    hardStopAt: z.number().min(0).max(100).default(105), // Hard stop at 105%
  }),

  // Anomaly detection settings
  anomalyDetection: z.object({
    enabled: z.boolean().default(true),
    stdDevThreshold: z.number().positive().default(2.5), // 2.5 std deviations
    windowDays: z.number().int().positive().default(30), // 30-day rolling window
  }),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BudgetConfig = z.infer<typeof BudgetConfigSchema>;

/**
 * Anomaly Alert Schema
 * Triggered when usage deviates significantly from baseline
 */
export const AnomalyAlertSchema = z.object({
  alertId: z.string().uuid(),
  tenantId: z.string().uuid(),
  detectedAt: z.string().datetime(),

  metric: z.enum(['ai_tokens', 'compute', 'storage', 'bandwidth', 'total_cost']),
  currentValue: z.number(),
  expectedValue: z.number(),
  deviation: z.number(), // Standard deviations from mean
  severity: z.enum(['low', 'medium', 'high', 'critical']),

  context: z.object({
    rollingMean: z.number(),
    rollingStdDev: z.number(),
    percentileRank: z.number(), // 0-100
  }),

  resolved: z.boolean().default(false),
  resolvedAt: z.string().datetime().optional(),
});

export type AnomalyAlert = z.infer<typeof AnomalyAlertSchema>;

/**
 * Invoice Schema
 * Monthly invoice with line items
 */
export const InvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  tenantId: z.string().uuid(),
  billingPeriod: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),

  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    totalUSD: z.number(),
    category: z.enum(['infra', 'ai', 'storage', 'bandwidth', 'support']),
  })),

  subtotalUSD: z.number(),
  taxUSD: z.number().default(0),
  discountUSD: z.number().default(0),
  totalUSD: z.number(),

  status: z.enum(['draft', 'pending', 'paid', 'overdue', 'void']),
  dueDate: z.string().datetime(),
  paidAt: z.string().datetime().optional(),

  // Stripe integration
  stripeInvoiceId: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),

  createdAt: z.string().datetime(),
});

export type Invoice = z.infer<typeof InvoiceSchema>;

/**
 * Pricing Tier Schema
 * Tiered pricing for different usage levels
 */
export const PricingTierSchema = z.object({
  tierId: z.string(),
  name: z.string(),

  // Infrastructure pricing (per unit)
  infra: z.object({
    computePerHour: z.number(),
    storagePerGBMonth: z.number(),
    bandwidthPerGB: z.number(),
    dbQueryPer1000: z.number(),
  }),

  // AI token pricing (per 1K tokens)
  ai: z.object({
    inputTokensPer1K: z.number(),
    outputTokensPer1K: z.number(),
    // Model-specific overrides
    modelOverrides: z.record(z.object({
      inputTokensPer1K: z.number(),
      outputTokensPer1K: z.number(),
    })).optional(),
  }),

  // Minimum commitment
  minimumMonthlyUSD: z.number().default(0),

  // Volume discounts
  volumeDiscounts: z.array(z.object({
    thresholdUSD: z.number(),
    discountPercent: z.number().min(0).max(100),
  })).default([]),
});

export type PricingTier = z.infer<typeof PricingTierSchema>;

/**
 * Billing Event Schema
 * Audit trail for all billing-related events
 */
export const BillingEventSchema = z.object({
  eventId: z.string().uuid(),
  tenantId: z.string().uuid(),
  timestamp: z.string().datetime(),

  eventType: z.enum([
    'usage_recorded',
    'budget_alert',
    'invoice_created',
    'payment_received',
    'quota_exceeded',
    'anomaly_detected',
  ]),

  metadata: z.record(z.any()),
  severity: z.enum(['info', 'warning', 'error']),
});

export type BillingEvent = z.infer<typeof BillingEventSchema>;

/**
 * L2I Bundle SKU Schema
 */
export const L2IBundleSkuSchema = z.enum(['L2I-250', 'L2I-500', 'L2I-EXPAND', 'L2I-LAUNCH']);
export type L2IBundleSku = z.infer<typeof L2IBundleSkuSchema>;

/**
 * L2I Program Schema
 */
export const L2IProgramSchema = z.enum(['language', 'mentorship', 'upskilling', 'weei']);
export type L2IProgram = z.infer<typeof L2IProgramSchema>;

/**
 * Recognition Badge Schema
 */
export const RecognitionBadgeSchema = z.enum(['bronze', 'silver', 'gold', 'platinum']);
export type RecognitionBadge = z.infer<typeof RecognitionBadgeSchema>;

/**
 * L2I Bundle Definition Schema
 */
export const L2IBundleSchema = z.object({
  id: z.string().uuid(),
  sku: L2IBundleSkuSchema,
  name: z.string(),
  description: z.string().optional(),

  // Pricing
  annualPrice: z.number().positive(), // USD
  currency: z.string().default('usd'),

  // Impact metrics
  impactTier: z.enum(['tier1', 'tier2', 'tier3', 'tier4']),
  learnersSupported: z.number().int().positive(),

  // Recognition
  recognitionBadge: RecognitionBadgeSchema,
  foundingMember: z.boolean().default(false),

  // Program allocation defaults
  defaultAllocation: z.object({
    language: z.number().min(0).max(1),
    mentorship: z.number().min(0).max(1),
    upskilling: z.number().min(0).max(1),
    weei: z.number().min(0).max(1),
  }),

  // Stripe integration
  stripePriceId: z.string().optional(),

  active: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type L2IBundle = z.infer<typeof L2IBundleSchema>;

/**
 * L2I Subscription Schema
 */
export const L2ISubscriptionSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  bundleId: z.string().uuid(),
  subscriptionId: z.string().uuid().optional(),

  sku: L2IBundleSkuSchema,
  quantity: z.number().int().positive().default(1),

  // Stripe data
  stripeSubscriptionItemId: z.string().optional(),

  // Billing period
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime(),

  // Status
  status: z.enum(['active', 'trialing', 'past_due', 'canceled', 'unpaid']),
  cancelAtPeriodEnd: z.boolean().default(false),
  canceledAt: z.string().datetime().optional(),

  // Program allocation (must sum to 1.0)
  programAllocation: z.object({
    language: z.number().min(0).max(1),
    mentorship: z.number().min(0).max(1),
    upskilling: z.number().min(0).max(1),
    weei: z.number().min(0).max(1),
  }).refine(
    (alloc) => {
      const sum = alloc.language + alloc.mentorship + alloc.upskilling + alloc.weei;
      return Math.abs(sum - 1.0) < 0.0001; // Allow for floating point precision
    },
    { message: 'Program allocation must sum to 1.0' }
  ),

  // Impact tracking
  learnersServedToDate: z.number().int().min(0).default(0),
  lastImpactUpdateAt: z.string().datetime().optional(),

  metadata: z.record(z.any()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type L2ISubscription = z.infer<typeof L2ISubscriptionSchema>;

/**
 * L2I Allocation Schema
 */
export const L2IAllocationSchema = z.object({
  id: z.string().uuid(),
  l2iSubscriptionId: z.string().uuid(),
  companyId: z.string().uuid(),

  program: L2IProgramSchema,
  allocationPercentage: z.number().min(0).max(1),
  allocationAmountUSD: z.number().min(0),

  // Impact metrics
  learnersServed: z.number().int().min(0).default(0),
  averageSROI: z.number().optional(),
  averageVIS: z.number().optional(),
  engagementRate: z.number().min(0).max(1).optional(),

  // Evidence lineage
  evidenceSnippets: z.array(z.object({
    evidenceId: z.string().uuid(),
    learnerName: z.string(), // anonymized
    outcome: z.string(),
    sroi: z.number(),
  })).optional(),

  // Period tracking
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),

  lastCalculatedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type L2IAllocation = z.infer<typeof L2IAllocationSchema>;

/**
 * L2I Impact Event Schema
 */
export const L2IImpactEventSchema = z.object({
  id: z.string().uuid(),
  l2iSubscriptionId: z.string().uuid(),
  allocationId: z.string().uuid().optional(),
  companyId: z.string().uuid(),

  eventType: z.enum(['learner_served', 'outcome_recorded', 'allocation_changed']),
  program: L2IProgramSchema.optional(),

  learnerIds: z.array(z.string().uuid()).optional(),
  outcomeMetrics: z.object({
    sroi: z.number().optional(),
    vis: z.number().optional(),
    engagement: z.number().optional(),
  }).optional(),

  sourceSystem: z.string().optional(),
  sourceEventId: z.string().optional(),

  metadata: z.record(z.any()).default({}),
  createdAt: z.string().datetime(),
});

export type L2IImpactEvent = z.infer<typeof L2IImpactEventSchema>;

/**
 * Create L2I Bundle Request
 */
export const CreateL2ISubscriptionSchema = z.object({
  companyId: z.string().uuid(),
  subscriptionId: z.string().uuid().optional(),
  sku: L2IBundleSkuSchema,
  quantity: z.number().int().positive().default(1),
  programAllocation: z.object({
    language: z.number().min(0).max(1),
    mentorship: z.number().min(0).max(1),
    upskilling: z.number().min(0).max(1),
    weei: z.number().min(0).max(1),
  }).optional(), // If not provided, use bundle defaults
  paymentMethodId: z.string().optional(),
});

export type CreateL2ISubscriptionRequest = z.infer<typeof CreateL2ISubscriptionSchema>;

/**
 * Update L2I Allocation Request
 */
export const UpdateL2IAllocationSchema = z.object({
  programAllocation: z.object({
    language: z.number().min(0).max(1),
    mentorship: z.number().min(0).max(1),
    upskilling: z.number().min(0).max(1),
    weei: z.number().min(0).max(1),
  }).refine(
    (alloc) => {
      const sum = alloc.language + alloc.mentorship + alloc.upskilling + alloc.weei;
      return Math.abs(sum - 1.0) < 0.0001;
    },
    { message: 'Program allocation must sum to 1.0' }
  ),
});

export type UpdateL2IAllocationRequest = z.infer<typeof UpdateL2IAllocationSchema>;

/**
 * L2I Bundle Definitions
 */
export const L2I_BUNDLE_DEFINITIONS: Record<L2IBundleSku, Omit<L2IBundle, 'id' | 'createdAt' | 'updatedAt'>> = {
  'L2I-250': {
    sku: 'L2I-250',
    name: 'Impact Starter',
    description: 'Support 250 learners annually with Language and Mentorship programs',
    annualPrice: 5000,
    currency: 'usd',
    impactTier: 'tier1',
    learnersSupported: 250,
    recognitionBadge: 'bronze',
    foundingMember: false,
    defaultAllocation: {
      language: 0.5,
      mentorship: 0.5,
      upskilling: 0,
      weei: 0,
    },
    stripePriceId: process.env.STRIPE_L2I_250_PRICE_ID || 'price_l2i_250',
    active: true,
  },
  'L2I-500': {
    sku: 'L2I-500',
    name: 'Impact Builder',
    description: 'Support 500 learners annually with Language, Mentorship, and Upskilling programs',
    annualPrice: 10000,
    currency: 'usd',
    impactTier: 'tier2',
    learnersSupported: 500,
    recognitionBadge: 'silver',
    foundingMember: false,
    defaultAllocation: {
      language: 0.4,
      mentorship: 0.3,
      upskilling: 0.3,
      weei: 0,
    },
    stripePriceId: process.env.STRIPE_L2I_500_PRICE_ID || 'price_l2i_500',
    active: true,
  },
  'L2I-EXPAND': {
    sku: 'L2I-EXPAND',
    name: 'Impact Expander',
    description: 'Support 2,500 learners annually with all programs including WEEI',
    annualPrice: 50000,
    currency: 'usd',
    impactTier: 'tier3',
    learnersSupported: 2500,
    recognitionBadge: 'gold',
    foundingMember: false,
    defaultAllocation: {
      language: 0.35,
      mentorship: 0.25,
      upskilling: 0.25,
      weei: 0.15,
    },
    stripePriceId: process.env.STRIPE_L2I_EXPAND_PRICE_ID || 'price_l2i_expand',
    active: true,
  },
  'L2I-LAUNCH': {
    sku: 'L2I-LAUNCH',
    name: 'Impact Launcher (Founding-8)',
    description: 'Support 5,000+ learners annually with all programs, custom initiatives, and Founding-8 membership',
    annualPrice: 100000,
    currency: 'usd',
    impactTier: 'tier4',
    learnersSupported: 5000,
    recognitionBadge: 'platinum',
    foundingMember: true,
    defaultAllocation: {
      language: 0.3,
      mentorship: 0.25,
      upskilling: 0.25,
      weei: 0.2,
    },
    stripePriceId: process.env.STRIPE_L2I_LAUNCH_PRICE_ID || 'price_l2i_launch',
    active: true,
  },
};

/**
 * Default pricing tier (Stripe-ready)
 */
export const DEFAULT_PRICING: PricingTier = {
  tierId: 'standard',
  name: 'Standard',
  infra: {
    computePerHour: 0.05,      // $0.05/hour
    storagePerGBMonth: 0.02,   // $0.02/GB/month
    bandwidthPerGB: 0.09,      // $0.09/GB
    dbQueryPer1000: 0.001,     // $0.001/1000 queries
  },
  ai: {
    inputTokensPer1K: 0.003,   // $0.003/1K input tokens (GPT-4 Turbo equivalent)
    outputTokensPer1K: 0.006,  // $0.006/1K output tokens
    modelOverrides: {
      'claude-3-opus': {
        inputTokensPer1K: 0.015,
        outputTokensPer1K: 0.075,
      },
      'claude-3-sonnet': {
        inputTokensPer1K: 0.003,
        outputTokensPer1K: 0.015,
      },
      'claude-3-haiku': {
        inputTokensPer1K: 0.00025,
        outputTokensPer1K: 0.00125,
      },
    },
  },
  minimumMonthlyUSD: 0,
  volumeDiscounts: [
    { thresholdUSD: 1000, discountPercent: 5 },
    { thresholdUSD: 5000, discountPercent: 10 },
    { thresholdUSD: 10000, discountPercent: 15 },
  ],
};
