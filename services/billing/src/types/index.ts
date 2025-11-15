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
