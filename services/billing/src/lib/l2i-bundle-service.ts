/**
 * L2I Bundle Service
 * Handles License-to-Impact bundle creation, attachment, and allocation tracking
 */

import { createServiceLogger } from '@teei/shared-utils';
import { db } from '@teei/shared-schema';
import {
  l2iBundles,
  l2iSubscriptions,
  l2iAllocations,
  l2iImpactEvents,
  billingSubscriptions,
  billingInvoices,
} from '@teei/shared-schema';
import { eq, and, sql } from 'drizzle-orm';
import Stripe from 'stripe';
import {
  L2IBundleSku,
  L2IBundle,
  L2ISubscription,
  L2IAllocation,
  CreateL2ISubscriptionRequest,
  UpdateL2IAllocationRequest,
  L2I_BUNDLE_DEFINITIONS,
} from '../types/index.js';

const logger = createServiceLogger('billing:l2i-service');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export class L2IBundleService {
  /**
   * Initialize L2I bundle SKU definitions in database
   * (Run once during system setup)
   */
  async initializeBundles(): Promise<void> {
    logger.info('Initializing L2I bundle definitions');

    for (const [sku, definition] of Object.entries(L2I_BUNDLE_DEFINITIONS)) {
      // Check if bundle already exists
      const [existing] = await db
        .select()
        .from(l2iBundles)
        .where(eq(l2iBundles.sku, sku as L2IBundleSku));

      if (!existing) {
        await db.insert(l2iBundles).values({
          sku: definition.sku,
          name: definition.name,
          description: definition.description,
          annualPrice: definition.annualPrice,
          currency: definition.currency,
          impactTier: definition.impactTier,
          learnersSupported: definition.learnersSupported,
          recognitionBadge: definition.recognitionBadge,
          foundingMember: definition.foundingMember,
          defaultAllocation: definition.defaultAllocation,
          stripePriceId: definition.stripePriceId,
          active: definition.active,
        });

        logger.info(`Initialized L2I bundle: ${sku}`);
      }
    }
  }

  /**
   * Get all active L2I bundles
   */
  async getBundles(): Promise<L2IBundle[]> {
    const bundles = await db
      .select()
      .from(l2iBundles)
      .where(eq(l2iBundles.active, true));

    return bundles as L2IBundle[];
  }

  /**
   * Get L2I bundle by SKU
   */
  async getBundleBySku(sku: L2IBundleSku): Promise<L2IBundle | null> {
    const [bundle] = await db
      .select()
      .from(l2iBundles)
      .where(eq(l2iBundles.sku, sku));

    return (bundle as L2IBundle) || null;
  }

  /**
   * Create L2I subscription for a company
   */
  async createL2ISubscription(
    request: CreateL2ISubscriptionRequest
  ): Promise<L2ISubscription> {
    const { companyId, subscriptionId, sku, quantity, programAllocation, paymentMethodId } = request;

    logger.info('Creating L2I subscription', { companyId, sku, quantity });

    // Get bundle definition
    const bundle = await this.getBundleBySku(sku);
    if (!bundle) {
      throw new Error(`L2I bundle not found: ${sku}`);
    }

    // Use provided allocation or default
    const allocation = programAllocation || bundle.defaultAllocation;

    // Validate allocation sums to 1.0
    const sum = allocation.language + allocation.mentorship + allocation.upskilling + allocation.weei;
    if (Math.abs(sum - 1.0) > 0.0001) {
      throw new Error('Program allocation must sum to 1.0');
    }

    // If subscriptionId provided, attach to existing Stripe subscription
    let stripeSubscriptionItemId: string | undefined;
    let periodStart: Date;
    let periodEnd: Date;

    if (subscriptionId) {
      const [subscription] = await db
        .select()
        .from(billingSubscriptions)
        .where(eq(billingSubscriptions.id, subscriptionId));

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Add L2I bundle as subscription item in Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      const subscriptionItem = await stripe.subscriptionItems.create({
        subscription: stripeSubscription.id,
        price: bundle.stripePriceId,
        quantity,
      });

      stripeSubscriptionItemId = subscriptionItem.id;
      periodStart = new Date(stripeSubscription.current_period_start * 1000);
      periodEnd = new Date(stripeSubscription.current_period_end * 1000);
    } else {
      // Create standalone L2I subscription (annual)
      periodStart = new Date();
      periodEnd = new Date();
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Create L2I subscription record
    const [l2iSub] = await db
      .insert(l2iSubscriptions)
      .values({
        companyId,
        bundleId: bundle.id,
        subscriptionId: subscriptionId || null,
        sku,
        quantity,
        stripeSubscriptionItemId,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        status: 'active',
        programAllocation: allocation,
      })
      .returning();

    // Create allocation records for each program
    await this.createAllocations(l2iSub!.id, companyId, allocation, bundle.annualPrice * quantity, periodStart, periodEnd);

    // Log impact event
    await this.logImpactEvent({
      l2iSubscriptionId: l2iSub!.id,
      companyId,
      eventType: 'allocation_changed',
      metadata: { allocation, sku, quantity },
    });

    logger.info('L2I subscription created', { l2iSubscriptionId: l2iSub!.id });

    return l2iSub as L2ISubscription;
  }

  /**
   * Get L2I subscriptions for a company
   */
  async getCompanyL2ISubscriptions(companyId: string): Promise<L2ISubscription[]> {
    const subs = await db
      .select()
      .from(l2iSubscriptions)
      .where(
        and(
          eq(l2iSubscriptions.companyId, companyId),
          eq(l2iSubscriptions.status, 'active')
        )
      );

    return subs as L2ISubscription[];
  }

  /**
   * Update L2I program allocation
   */
  async updateAllocation(
    l2iSubscriptionId: string,
    request: UpdateL2IAllocationRequest
  ): Promise<L2ISubscription> {
    const { programAllocation } = request;

    logger.info('Updating L2I allocation', { l2iSubscriptionId, programAllocation });

    // Get existing subscription
    const [existing] = await db
      .select()
      .from(l2iSubscriptions)
      .where(eq(l2iSubscriptions.id, l2iSubscriptionId));

    if (!existing) {
      throw new Error('L2I subscription not found');
    }

    // Get bundle to calculate amounts
    const bundle = await this.getBundleBySku(existing.sku as L2IBundleSku);
    if (!bundle) {
      throw new Error('L2I bundle not found');
    }

    const totalAmount = bundle.annualPrice * existing.quantity;

    // Update subscription
    const [updated] = await db
      .update(l2iSubscriptions)
      .set({
        programAllocation,
        updatedAt: new Date(),
      })
      .where(eq(l2iSubscriptions.id, l2iSubscriptionId))
      .returning();

    // Delete existing allocations
    await db
      .delete(l2iAllocations)
      .where(eq(l2iAllocations.l2iSubscriptionId, l2iSubscriptionId));

    // Create new allocations
    await this.createAllocations(
      l2iSubscriptionId,
      existing.companyId,
      programAllocation,
      totalAmount,
      existing.currentPeriodStart,
      existing.currentPeriodEnd
    );

    // Log impact event
    await this.logImpactEvent({
      l2iSubscriptionId,
      companyId: existing.companyId,
      eventType: 'allocation_changed',
      metadata: { programAllocation },
    });

    logger.info('L2I allocation updated', { l2iSubscriptionId });

    return updated as L2ISubscription;
  }

  /**
   * Get allocations for an L2I subscription
   */
  async getAllocations(l2iSubscriptionId: string): Promise<L2IAllocation[]> {
    const allocations = await db
      .select()
      .from(l2iAllocations)
      .where(eq(l2iAllocations.l2iSubscriptionId, l2iSubscriptionId));

    return allocations as L2IAllocation[];
  }

  /**
   * Record learner impact for an allocation
   */
  async recordLearnerImpact(
    allocationId: string,
    learnerIds: string[],
    outcomeMetrics?: { sroi?: number; vis?: number; engagement?: number }
  ): Promise<void> {
    logger.info('Recording learner impact', { allocationId, learnerCount: learnerIds.length });

    const [allocation] = await db
      .select()
      .from(l2iAllocations)
      .where(eq(l2iAllocations.id, allocationId));

    if (!allocation) {
      throw new Error('Allocation not found');
    }

    // Update allocation metrics
    const newLearnersServed = allocation.learnersServed + learnerIds.length;

    await db
      .update(l2iAllocations)
      .set({
        learnersServed: newLearnersServed,
        lastCalculatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(l2iAllocations.id, allocationId));

    // Update L2I subscription total
    await db.execute(sql`
      UPDATE l2i_subscriptions
      SET learners_served_to_date = learners_served_to_date + ${learnerIds.length},
          last_impact_update_at = NOW()
      WHERE id = ${allocation.l2iSubscriptionId}
    `);

    // Log impact event
    await this.logImpactEvent({
      l2iSubscriptionId: allocation.l2iSubscriptionId,
      allocationId,
      companyId: allocation.companyId,
      eventType: 'learner_served',
      program: allocation.program as any,
      learnerIds,
      outcomeMetrics,
    });

    logger.info('Learner impact recorded', { allocationId, newLearnersServed });
  }

  /**
   * Get impact summary for a company
   */
  async getImpactSummary(companyId: string): Promise<{
    totalCommitment: number;
    totalLearnersServed: number;
    recognitionBadges: string[];
    foundingMember: boolean;
    allocations: Array<{
      program: string;
      amountUSD: number;
      learnersServed: number;
      averageSROI: number | null;
      averageVIS: number | null;
    }>;
  }> {
    // Get all active L2I subscriptions
    const subs = await this.getCompanyL2ISubscriptions(companyId);

    let totalCommitment = 0;
    let totalLearnersServed = 0;
    const recognitionBadges = new Set<string>();
    let foundingMember = false;

    for (const sub of subs) {
      const bundle = await this.getBundleBySku(sub.sku as L2IBundleSku);
      if (bundle) {
        totalCommitment += bundle.annualPrice * sub.quantity;
        totalLearnersServed += sub.learnersServedToDate;
        recognitionBadges.add(bundle.recognitionBadge);
        if (bundle.foundingMember) {
          foundingMember = true;
        }
      }
    }

    // Get allocation summaries
    const allocationSummaries = await db
      .select()
      .from(l2iAllocations)
      .where(eq(l2iAllocations.companyId, companyId));

    const allocations = allocationSummaries.map((alloc) => ({
      program: alloc.program,
      amountUSD: parseInt(alloc.allocationAmountUSD.toString()) / 100,
      learnersServed: alloc.learnersServed,
      averageSROI: alloc.averageSROI ? parseFloat(alloc.averageSROI.toString()) : null,
      averageVIS: alloc.averageVIS ? parseFloat(alloc.averageVIS.toString()) : null,
    }));

    return {
      totalCommitment: totalCommitment / 100, // Convert cents to dollars
      totalLearnersServed,
      recognitionBadges: Array.from(recognitionBadges),
      foundingMember,
      allocations,
    };
  }

  /**
   * Create allocation records for each program
   */
  private async createAllocations(
    l2iSubscriptionId: string,
    companyId: string,
    programAllocation: { language: number; mentorship: number; upskilling: number; weei: number },
    totalAmountCents: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    const programs: Array<keyof typeof programAllocation> = ['language', 'mentorship', 'upskilling', 'weei'];

    for (const program of programs) {
      const percentage = programAllocation[program];
      if (percentage > 0) {
        const amountUSD = Math.round(totalAmountCents * percentage);

        await db.insert(l2iAllocations).values({
          l2iSubscriptionId,
          companyId,
          program,
          allocationPercentage: percentage.toString(),
          allocationAmountUSD: amountUSD,
          periodStart,
          periodEnd,
        });
      }
    }
  }

  /**
   * Log impact event
   */
  private async logImpactEvent(event: {
    l2iSubscriptionId: string;
    allocationId?: string;
    companyId: string;
    eventType: 'learner_served' | 'outcome_recorded' | 'allocation_changed';
    program?: string;
    learnerIds?: string[];
    outcomeMetrics?: { sroi?: number; vis?: number; engagement?: number };
    metadata?: Record<string, any>;
  }): Promise<void> {
    await db.insert(l2iImpactEvents).values({
      l2iSubscriptionId: event.l2iSubscriptionId,
      allocationId: event.allocationId || null,
      companyId: event.companyId,
      eventType: event.eventType,
      program: event.program as any || null,
      learnerIds: event.learnerIds || null,
      outcomeMetrics: event.outcomeMetrics || null,
      metadata: event.metadata || {},
    });
  }

  /**
   * Cancel L2I subscription
   */
  async cancelL2ISubscription(l2iSubscriptionId: string): Promise<L2ISubscription> {
    logger.info('Canceling L2I subscription', { l2iSubscriptionId });

    const [existing] = await db
      .select()
      .from(l2iSubscriptions)
      .where(eq(l2iSubscriptions.id, l2iSubscriptionId));

    if (!existing) {
      throw new Error('L2I subscription not found');
    }

    // If attached to Stripe, cancel subscription item
    if (existing.stripeSubscriptionItemId) {
      await stripe.subscriptionItems.del(existing.stripeSubscriptionItemId);
    }

    // Update status
    const [updated] = await db
      .update(l2iSubscriptions)
      .set({
        status: 'canceled',
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(l2iSubscriptions.id, l2iSubscriptionId))
      .returning();

    logger.info('L2I subscription canceled', { l2iSubscriptionId });

    return updated as L2ISubscription;
  }
}

// Export singleton instance
export const l2iBundleService = new L2IBundleService();
