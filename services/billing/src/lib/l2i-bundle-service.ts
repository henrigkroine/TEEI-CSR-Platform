/**
 * L2I Bundle Service
 * Handles License-to-Impact bundle purchases, allocations, and tracking
 */

import { createServiceLogger } from '@teei/shared-utils';
import { db, l2iBundles, l2iAllocations, billingInvoices } from '@teei/shared-schema';
import { eq, and, sql } from 'drizzle-orm';
import Stripe from 'stripe';
import {
  L2IBundleTier,
  L2IProgramTag,
  L2IBundleStatus,
  PurchaseL2IBundleRequest,
  AllocateLearnerRequest,
  L2IBundle,
  L2IAllocation,
  L2IBundleSummary,
  L2I_BUNDLE_TIERS,
} from '../types/l2i.js';

const logger = createServiceLogger('billing:l2i-bundles');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export class L2IBundleService {
  /**
   * Purchase an L2I bundle
   */
  async purchaseBundle(request: PurchaseL2IBundleRequest): Promise<L2IBundle> {
    const tierDef = L2I_BUNDLE_TIERS[request.tier];

    if (!tierDef) {
      throw new Error(`Invalid L2I bundle tier: ${request.tier}`);
    }

    // Validate program tags
    const invalidTags = request.programTags.filter(
      (tag) => !tierDef.availablePrograms.includes(tag)
    );

    if (invalidTags.length > 0) {
      throw new Error(
        `Invalid program tags for ${tierDef.name} tier: ${invalidTags.join(', ')}`
      );
    }

    const learnerCapacity = request.learnerCapacity || tierDef.learnerCapacity;
    const priceUSD = tierDef.priceUSD;
    const sku = `L2I-${tierDef.name.toUpperCase()}-${learnerCapacity}`;

    try {
      // Create Stripe price if it doesn't exist
      const stripePrice = await this.getOrCreateStripePrice(sku, priceUSD, tierDef.name);

      // Create the bundle in database
      const validFrom = request.validFrom ? new Date(request.validFrom) : new Date();
      const validUntil = request.validUntil ? new Date(request.validUntil) : null;

      const [bundle] = await db.insert(l2iBundles).values({
        companyId: request.companyId,
        tier: request.tier,
        sku,
        priceUSD,
        learnerCapacity,
        learnersAllocated: 0,
        programTags: request.programTags,
        recognition: tierDef.defaultRecognition,
        teeiProgramId: request.teeiProgramId,
        allocationNotes: request.allocationNotes,
        status: L2IBundleStatus.ACTIVE,
        validFrom,
        validUntil,
        purchasedAt: new Date(),
        stripePriceId: stripePrice.id,
      }).returning();

      logger.info('L2I bundle purchased', {
        bundleId: bundle!.id,
        companyId: request.companyId,
        tier: request.tier,
        sku,
      });

      return this.formatBundle(bundle!);
    } catch (error: any) {
      logger.error('Failed to purchase L2I bundle', { error, request });
      throw new Error(`Failed to purchase L2I bundle: ${error.message}`);
    }
  }

  /**
   * Allocate a learner to an L2I bundle
   */
  async allocateLearner(request: AllocateLearnerRequest): Promise<L2IAllocation> {
    // Get the bundle
    const [bundle] = await db
      .select()
      .from(l2iBundles)
      .where(eq(l2iBundles.id, request.bundleId))
      .limit(1);

    if (!bundle) {
      throw new Error(`L2I bundle not found: ${request.bundleId}`);
    }

    // Check capacity
    if (bundle.learnersAllocated >= bundle.learnerCapacity) {
      throw new Error(
        `L2I bundle ${bundle.sku} is at full capacity (${bundle.learnerCapacity})`
      );
    }

    // Check if program tag is allowed
    if (!bundle.programTags.includes(request.programTag)) {
      throw new Error(
        `Program tag ${request.programTag} not allowed for bundle ${bundle.sku}`
      );
    }

    // Check if bundle is active
    if (bundle.status !== L2IBundleStatus.ACTIVE) {
      throw new Error(`L2I bundle ${bundle.sku} is not active (status: ${bundle.status})`);
    }

    try {
      // Create allocation
      const [allocation] = await db.insert(l2iAllocations).values({
        bundleId: request.bundleId,
        companyId: bundle.companyId,
        learnerUserId: request.learnerUserId,
        learnerExternalId: request.learnerExternalId,
        learnerName: request.learnerName,
        learnerEmail: request.learnerEmail,
        programTag: request.programTag,
        programCohort: request.programCohort,
        status: 'active',
        metadata: request.metadata || {},
      }).returning();

      // Increment learners allocated
      await db
        .update(l2iBundles)
        .set({
          learnersAllocated: sql`${l2iBundles.learnersAllocated} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(l2iBundles.id, request.bundleId));

      logger.info('Learner allocated to L2I bundle', {
        allocationId: allocation!.id,
        bundleId: request.bundleId,
        learnerName: request.learnerName,
        programTag: request.programTag,
      });

      return this.formatAllocation(allocation!);
    } catch (error: any) {
      logger.error('Failed to allocate learner', { error, request });
      throw new Error(`Failed to allocate learner: ${error.message}`);
    }
  }

  /**
   * Get L2I bundles for a company
   */
  async getBundlesByCompany(companyId: string): Promise<L2IBundle[]> {
    const bundles = await db
      .select()
      .from(l2iBundles)
      .where(eq(l2iBundles.companyId, companyId))
      .orderBy(l2iBundles.createdAt);

    return bundles.map(this.formatBundle);
  }

  /**
   * Get allocations for a bundle
   */
  async getAllocationsByBundle(bundleId: string): Promise<L2IAllocation[]> {
    const allocations = await db
      .select()
      .from(l2iAllocations)
      .where(eq(l2iAllocations.bundleId, bundleId))
      .orderBy(l2iAllocations.allocatedAt);

    return allocations.map(this.formatAllocation);
  }

  /**
   * Get L2I bundle summary for a company
   */
  async getBundleSummary(companyId: string): Promise<L2IBundleSummary> {
    const bundles = await db
      .select()
      .from(l2iBundles)
      .where(eq(l2iBundles.companyId, companyId));

    const allocationsList = await db
      .select()
      .from(l2iAllocations)
      .where(eq(l2iAllocations.companyId, companyId));

    // Calculate totals
    const totalBundles = bundles.length;
    const totalCapacity = bundles.reduce((sum, b) => sum + b.learnerCapacity, 0);
    const totalAllocated = bundles.reduce((sum, b) => sum + b.learnersAllocated, 0);
    const totalSpent = bundles.reduce((sum, b) => sum + b.priceUSD, 0);

    // Group by tier
    const byTier: Record<string, any> = {};
    for (const tier of Object.values(L2IBundleTier)) {
      const tierBundles = bundles.filter((b) => b.tier === tier);
      byTier[tier] = {
        count: tierBundles.length,
        capacity: tierBundles.reduce((sum, b) => sum + b.learnerCapacity, 0),
        allocated: tierBundles.reduce((sum, b) => sum + b.learnersAllocated, 0),
        spent: tierBundles.reduce((sum, b) => sum + b.priceUSD, 0),
      };
    }

    // Group by program
    const byProgram: Record<string, any> = {};
    for (const tag of Object.values(L2IProgramTag)) {
      const programAllocations = allocationsList.filter((a) => a.programTag === tag);
      const completions = programAllocations.filter((a) => a.status === 'completed').length;

      // Calculate average engagement
      const engagementScores = programAllocations
        .map((a) => (a.impactMetrics as any)?.engagementScore)
        .filter((score) => score !== undefined) as number[];

      const avgEngagement = engagementScores.length > 0
        ? engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length
        : undefined;

      byProgram[tag] = {
        allocations: programAllocations.length,
        completions,
        avgEngagement,
      };
    }

    // Calculate total impact credits
    const impactCredits = bundles.reduce((sum, b) => {
      const recognition = b.recognition as any;
      return sum + (recognition?.impactCredits || 0);
    }, 0);

    // Get highest founder badge
    const founderBadges = bundles
      .map((b) => (b.recognition as any)?.founderBadge)
      .filter(Boolean) as Array<'founding-8' | 'founding-100' | 'founding-1000'>;

    const founderBadgeOrder = ['founding-8', 'founding-100', 'founding-1000'];
    const founderBadge = founderBadges.sort(
      (a, b) => founderBadgeOrder.indexOf(a) - founderBadgeOrder.indexOf(b)
    )[0];

    return {
      totalBundles,
      totalCapacity,
      totalAllocated,
      totalSpent,
      byTier,
      byProgram,
      impactCredits,
      founderBadge,
    };
  }

  /**
   * Update allocation impact metrics
   */
  async updateAllocationMetrics(
    allocationId: string,
    impactMetrics: {
      hoursCompleted?: number;
      skillsAcquired?: string[];
      certificationsEarned?: string[];
      engagementScore?: number;
    }
  ): Promise<L2IAllocation> {
    const [allocation] = await db
      .update(l2iAllocations)
      .set({
        impactMetrics,
        updatedAt: new Date(),
      })
      .where(eq(l2iAllocations.id, allocationId))
      .returning();

    if (!allocation) {
      throw new Error(`Allocation not found: ${allocationId}`);
    }

    return this.formatAllocation(allocation);
  }

  /**
   * Mark allocation as completed
   */
  async completeAllocation(allocationId: string): Promise<L2IAllocation> {
    const [allocation] = await db
      .update(l2iAllocations)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(l2iAllocations.id, allocationId))
      .returning();

    if (!allocation) {
      throw new Error(`Allocation not found: ${allocationId}`);
    }

    logger.info('Allocation marked as completed', {
      allocationId,
      learnerName: allocation.learnerName,
    });

    return this.formatAllocation(allocation);
  }

  /**
   * Get or create Stripe price for L2I bundle
   */
  private async getOrCreateStripePrice(
    sku: string,
    priceUSD: number,
    tierName: string
  ): Promise<Stripe.Price> {
    // Search for existing price
    const prices = await stripe.prices.list({
      lookup_keys: [sku],
      limit: 1,
    });

    if (prices.data.length > 0) {
      return prices.data[0]!;
    }

    // Create new price
    return await stripe.prices.create({
      unit_amount: priceUSD,
      currency: 'usd',
      lookup_key: sku,
      product_data: {
        name: `L2I ${tierName} Bundle`,
        description: `License-to-Impact ${tierName} tier add-on`,
        metadata: {
          type: 'l2i_bundle',
          tier: tierName.toLowerCase(),
        },
      },
    });
  }

  /**
   * Format bundle for API response
   */
  private formatBundle(bundle: any): L2IBundle {
    return {
      id: bundle.id,
      companyId: bundle.companyId,
      subscriptionId: bundle.subscriptionId,
      tier: bundle.tier,
      sku: bundle.sku,
      priceUSD: bundle.priceUSD,
      learnerCapacity: bundle.learnerCapacity,
      learnersAllocated: bundle.learnersAllocated,
      programTags: bundle.programTags,
      recognition: bundle.recognition,
      teeiProgramId: bundle.teeiProgramId,
      allocationNotes: bundle.allocationNotes,
      status: bundle.status,
      validFrom: bundle.validFrom.toISOString(),
      validUntil: bundle.validUntil?.toISOString(),
      purchasedAt: bundle.purchasedAt.toISOString(),
      stripePriceId: bundle.stripePriceId,
      stripeInvoiceItemId: bundle.stripeInvoiceItemId,
      metadata: bundle.metadata,
      createdAt: bundle.createdAt.toISOString(),
      updatedAt: bundle.updatedAt.toISOString(),
    };
  }

  /**
   * Format allocation for API response
   */
  private formatAllocation(allocation: any): L2IAllocation {
    return {
      id: allocation.id,
      bundleId: allocation.bundleId,
      companyId: allocation.companyId,
      learnerUserId: allocation.learnerUserId,
      learnerExternalId: allocation.learnerExternalId,
      learnerName: allocation.learnerName,
      learnerEmail: allocation.learnerEmail,
      programTag: allocation.programTag,
      programCohort: allocation.programCohort,
      allocatedAt: allocation.allocatedAt.toISOString(),
      completedAt: allocation.completedAt?.toISOString(),
      status: allocation.status,
      impactMetrics: allocation.impactMetrics,
      metadata: allocation.metadata,
      createdAt: allocation.createdAt.toISOString(),
      updatedAt: allocation.updatedAt.toISOString(),
    };
  }
}

export const l2iBundleService = new L2IBundleService();
