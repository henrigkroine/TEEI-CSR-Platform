/**
 * L2I (License-to-Impact) Bundle Types
 * Add-on SKUs tied to TEEI program funding tiers
 */

import { z } from 'zod';

/**
 * L2I Bundle Tier
 */
export enum L2IBundleTier {
  FOUNDATION = 'foundation',
  GROWTH = 'growth',
  EXPAND = 'expand',
  LAUNCH = 'launch',
}

/**
 * L2I Program Tags
 * Maps to TEEI program categories
 */
export enum L2IProgramTag {
  LANGUAGE = 'language',
  MENTORSHIP = 'mentorship',
  UPSKILLING = 'upskilling',
  WEEI = 'weei',
}

/**
 * L2I Bundle Status
 */
export enum L2IBundleStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CONSUMED = 'consumed',
  REVOKED = 'revoked',
}

/**
 * Recognition Metadata Schema
 */
export const RecognitionMetadataSchema = z.object({
  founderBadge: z.enum(['founding-8', 'founding-100', 'founding-1000']).optional(),
  impactCredits: z.number().int().min(0).optional(),
  acknowledgmentTier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  publicRecognition: z.boolean().optional(),
});

export type RecognitionMetadata = z.infer<typeof RecognitionMetadataSchema>;

/**
 * L2I Bundle Schema
 */
export const L2IBundleSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  subscriptionId: z.string().uuid().optional(),

  // Bundle tier and pricing
  tier: z.nativeEnum(L2IBundleTier),
  sku: z.string(),
  priceUSD: z.number().int().positive(), // Price in cents

  // Learner capacity
  learnerCapacity: z.number().int().positive(),
  learnersAllocated: z.number().int().min(0).default(0),

  // Program tags
  programTags: z.array(z.nativeEnum(L2IProgramTag)).min(1),

  // Recognition
  recognition: RecognitionMetadataSchema.optional(),

  // Allocation details
  teeiProgramId: z.string().optional(),
  allocationNotes: z.string().optional(),

  // Status and validity
  status: z.nativeEnum(L2IBundleStatus),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().optional(),
  purchasedAt: z.string().datetime(),

  // Stripe integration
  stripePriceId: z.string().optional(),
  stripeInvoiceItemId: z.string().optional(),

  // Metadata
  metadata: z.record(z.any()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type L2IBundle = z.infer<typeof L2IBundleSchema>;

/**
 * Impact Metrics Schema
 */
export const ImpactMetricsSchema = z.object({
  hoursCompleted: z.number().min(0).optional(),
  skillsAcquired: z.array(z.string()).optional(),
  certificationsEarned: z.array(z.string()).optional(),
  engagementScore: z.number().min(0).max(100).optional(),
});

export type ImpactMetrics = z.infer<typeof ImpactMetricsSchema>;

/**
 * L2I Allocation Schema
 */
export const L2IAllocationSchema = z.object({
  id: z.string().uuid(),
  bundleId: z.string().uuid(),
  companyId: z.string().uuid(),

  // Learner info
  learnerUserId: z.string().uuid().optional(),
  learnerExternalId: z.string().optional(),
  learnerName: z.string(),
  learnerEmail: z.string().email().optional(),

  // Program details
  programTag: z.nativeEnum(L2IProgramTag),
  programCohort: z.string().optional(),

  // Status
  allocatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  status: z.enum(['active', 'completed', 'withdrawn']),

  // Impact tracking
  impactMetrics: ImpactMetricsSchema.optional(),

  // Metadata
  metadata: z.record(z.any()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type L2IAllocation = z.infer<typeof L2IAllocationSchema>;

/**
 * L2I Bundle Tier Definitions
 * Pricing and capacity for each tier
 */
export interface L2IBundleTierDefinition {
  tier: L2IBundleTier;
  name: string;
  description: string;
  priceUSD: number; // in cents
  learnerCapacity: number;
  defaultRecognition: RecognitionMetadata;
  availablePrograms: L2IProgramTag[];
}

export const L2I_BUNDLE_TIERS: Record<L2IBundleTier, L2IBundleTierDefinition> = {
  [L2IBundleTier.FOUNDATION]: {
    tier: L2IBundleTier.FOUNDATION,
    name: 'Foundation',
    description: 'Fund 250 learners in TEEI programs',
    priceUSD: 500000, // $5,000.00
    learnerCapacity: 250,
    defaultRecognition: {
      founderBadge: 'founding-1000',
      impactCredits: 250,
      acknowledgmentTier: 'bronze',
      publicRecognition: true,
    },
    availablePrograms: [L2IProgramTag.LANGUAGE, L2IProgramTag.MENTORSHIP],
  },
  [L2IBundleTier.GROWTH]: {
    tier: L2IBundleTier.GROWTH,
    name: 'Growth',
    description: 'Fund 500 learners in TEEI programs',
    priceUSD: 1000000, // $10,000.00
    learnerCapacity: 500,
    defaultRecognition: {
      founderBadge: 'founding-100',
      impactCredits: 500,
      acknowledgmentTier: 'silver',
      publicRecognition: true,
    },
    availablePrograms: [
      L2IProgramTag.LANGUAGE,
      L2IProgramTag.MENTORSHIP,
      L2IProgramTag.UPSKILLING,
    ],
  },
  [L2IBundleTier.EXPAND]: {
    tier: L2IBundleTier.EXPAND,
    name: 'Expand',
    description: 'Custom scale expansion with dedicated support',
    priceUSD: 5000000, // $50,000.00
    learnerCapacity: 2500, // Default, can be customized
    defaultRecognition: {
      founderBadge: 'founding-100',
      impactCredits: 2500,
      acknowledgmentTier: 'gold',
      publicRecognition: true,
    },
    availablePrograms: [
      L2IProgramTag.LANGUAGE,
      L2IProgramTag.MENTORSHIP,
      L2IProgramTag.UPSKILLING,
      L2IProgramTag.WEEI,
    ],
  },
  [L2IBundleTier.LAUNCH]: {
    tier: L2IBundleTier.LAUNCH,
    name: 'Launch',
    description: 'Enterprise-scale launch with full white-glove service',
    priceUSD: 10000000, // $100,000.00
    learnerCapacity: 5000, // Default, can be customized
    defaultRecognition: {
      founderBadge: 'founding-8',
      impactCredits: 5000,
      acknowledgmentTier: 'platinum',
      publicRecognition: true,
    },
    availablePrograms: [
      L2IProgramTag.LANGUAGE,
      L2IProgramTag.MENTORSHIP,
      L2IProgramTag.UPSKILLING,
      L2IProgramTag.WEEI,
    ],
  },
};

/**
 * Purchase L2I Bundle Request
 */
export const PurchaseL2IBundleSchema = z.object({
  companyId: z.string().uuid(),
  tier: z.nativeEnum(L2IBundleTier),
  programTags: z.array(z.nativeEnum(L2IProgramTag)).min(1),
  learnerCapacity: z.number().int().positive().optional(), // Override default capacity
  teeiProgramId: z.string().optional(),
  allocationNotes: z.string().optional(),
  paymentMethodId: z.string().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
});

export type PurchaseL2IBundleRequest = z.infer<typeof PurchaseL2IBundleSchema>;

/**
 * Allocate Learner Request
 */
export const AllocateLearnerSchema = z.object({
  bundleId: z.string().uuid(),
  learnerName: z.string().min(1),
  learnerEmail: z.string().email().optional(),
  learnerExternalId: z.string().optional(),
  learnerUserId: z.string().uuid().optional(),
  programTag: z.nativeEnum(L2IProgramTag),
  programCohort: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type AllocateLearnerRequest = z.infer<typeof AllocateLearnerSchema>;

/**
 * L2I Bundle Summary (for dashboards)
 */
export const L2IBundleSummarySchema = z.object({
  totalBundles: z.number().int(),
  totalCapacity: z.number().int(),
  totalAllocated: z.number().int(),
  totalSpent: z.number().int(), // in cents
  byTier: z.record(
    z.object({
      count: z.number().int(),
      capacity: z.number().int(),
      allocated: z.number().int(),
      spent: z.number().int(),
    })
  ),
  byProgram: z.record(
    z.object({
      allocations: z.number().int(),
      completions: z.number().int(),
      avgEngagement: z.number().optional(),
    })
  ),
  impactCredits: z.number().int(),
  founderBadge: z.enum(['founding-8', 'founding-100', 'founding-1000']).optional(),
});

export type L2IBundleSummary = z.infer<typeof L2IBundleSummarySchema>;
