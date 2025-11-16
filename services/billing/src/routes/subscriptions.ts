/**
 * Subscription Management Routes
 * Handles subscription creation, updates, and Stripe integration
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Stripe from 'stripe';
import { db } from '@teei/shared-schema';
import {
  billingCustomers,
  billingSubscriptions,
  entitlementPolicies,
} from '@teei/shared-schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Stripe Price IDs (configure these in env)
const STRIPE_PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_ID_STARTER || 'price_starter',
  pro: process.env.STRIPE_PRICE_ID_PRO || 'price_pro',
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_enterprise',
  custom: process.env.STRIPE_PRICE_ID_CUSTOM || 'price_custom',
};

/**
 * Create Subscription Request Schema
 */
const CreateSubscriptionSchema = z.object({
  companyId: z.string().uuid(),
  plan: z.enum(['starter', 'pro', 'enterprise', 'custom']),
  seatCount: z.number().int().min(1).default(1),
  trialDays: z.number().int().min(0).max(30).optional(),
  paymentMethodId: z.string().optional(),
});

/**
 * Update Subscription Schema
 */
const UpdateSubscriptionSchema = z.object({
  seatCount: z.number().int().min(1).optional(),
  plan: z.enum(['starter', 'pro', 'enterprise', 'custom']).optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

export async function subscriptionRoutes(fastify: FastifyInstance) {

  /**
   * POST /api/billing/subscriptions
   * Create a new subscription
   */
  fastify.post<{ Body: z.infer<typeof CreateSubscriptionSchema> }>(
    '/api/billing/subscriptions',
    {
      schema: {
        body: CreateSubscriptionSchema,
      },
    },
    async (request, reply) => {
      const { companyId, plan, seatCount, trialDays, paymentMethodId } = request.body;

      try {
        // Check if customer exists
        let [customer] = await db
          .select()
          .from(billingCustomers)
          .where(eq(billingCustomers.companyId, companyId));

        // Create Stripe customer if doesn't exist
        if (!customer) {
          const stripeCustomer = await stripe.customers.create({
            metadata: { companyId },
          });

          [customer] = await db
            .insert(billingCustomers)
            .values({
              companyId,
              stripeCustomerId: stripeCustomer.id,
            })
            .returning();
        }

        // Create Stripe subscription
        const subscriptionData: Stripe.SubscriptionCreateParams = {
          customer: customer!.stripeCustomerId,
          items: [
            {
              price: STRIPE_PRICE_IDS[plan],
              quantity: seatCount,
            },
          ],
          metadata: {
            companyId,
            plan,
          },
        };

        if (trialDays) {
          subscriptionData.trial_period_days = trialDays;
        }

        if (paymentMethodId) {
          subscriptionData.default_payment_method = paymentMethodId;
        }

        const stripeSubscription = await stripe.subscriptions.create(subscriptionData);

        // Save subscription to database
        const [subscription] = await db
          .insert(billingSubscriptions)
          .values({
            companyId,
            customerId: customer!.id,
            stripeSubscriptionId: stripeSubscription.id,
            stripePriceId: STRIPE_PRICE_IDS[plan],
            plan,
            status: stripeSubscription.status as any,
            seatCount,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            trialStart: stripeSubscription.trial_start
              ? new Date(stripeSubscription.trial_start * 1000)
              : null,
            trialEnd: stripeSubscription.trial_end
              ? new Date(stripeSubscription.trial_end * 1000)
              : null,
          })
          .returning();

        // Create entitlement policies based on plan
        await createPlanPolicies(companyId, plan, subscription!.id);

        return {
          success: true,
          subscription,
          stripeClientSecret: (stripeSubscription.latest_invoice as any)?.payment_intent?.client_secret,
        };
      } catch (error: any) {
        request.log.error('Failed to create subscription:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to create subscription',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/billing/subscriptions/:companyId
   * Get subscription for a company
   */
  fastify.get<{ Params: { companyId: string } }>(
    '/api/billing/subscriptions/:companyId',
    async (request, reply) => {
      const { companyId } = request.params;

      const [subscription] = await db
        .select()
        .from(billingSubscriptions)
        .where(eq(billingSubscriptions.companyId, companyId))
        .orderBy(billingSubscriptions.createdAt);

      if (!subscription) {
        return reply.status(404).send({
          success: false,
          error: 'Subscription not found',
        });
      }

      return {
        success: true,
        subscription,
      };
    }
  );

  /**
   * PATCH /api/billing/subscriptions/:subscriptionId
   * Update subscription
   */
  fastify.patch<{
    Params: { subscriptionId: string };
    Body: z.infer<typeof UpdateSubscriptionSchema>;
  }>(
    '/api/billing/subscriptions/:subscriptionId',
    {
      schema: {
        body: UpdateSubscriptionSchema,
      },
    },
    async (request, reply) => {
      const { subscriptionId } = request.params;
      const updates = request.body;

      try {
        const [subscription] = await db
          .select()
          .from(billingSubscriptions)
          .where(eq(billingSubscriptions.id, subscriptionId));

        if (!subscription) {
          return reply.status(404).send({
            success: false,
            error: 'Subscription not found',
          });
        }

        // Update Stripe subscription
        const updateData: Stripe.SubscriptionUpdateParams = {};

        if (updates.seatCount) {
          updateData.items = [
            {
              id: (
                await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)
              ).items.data[0]!.id,
              quantity: updates.seatCount,
            },
          ];
        }

        if (updates.plan) {
          updateData.items = [
            {
              id: (
                await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)
              ).items.data[0]!.id,
              price: STRIPE_PRICE_IDS[updates.plan],
            },
          ];
        }

        if (updates.cancelAtPeriodEnd !== undefined) {
          updateData.cancel_at_period_end = updates.cancelAtPeriodEnd;
        }

        const stripeSubscription = await stripe.subscriptions.update(
          subscription.stripeSubscriptionId,
          updateData
        );

        // Update database
        const [updated] = await db!
          .update(billingSubscriptions)
          .set({
            seatCount: updates.seatCount || subscription.seatCount,
            plan: updates.plan || subscription.plan,
            cancelAtPeriodEnd: updates.cancelAtPeriodEnd ?? subscription.cancelAtPeriodEnd,
            status: stripeSubscription.status as any,
            updatedAt: new Date(),
          })
          .where(eq(billingSubscriptions.id, subscriptionId))
          .returning();

        return {
          success: true,
          subscription: updated,
        };
      } catch (error: any) {
        request.log.error('Failed to update subscription:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to update subscription',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/billing/subscriptions/:subscriptionId/cancel
   * Cancel subscription
   */
  fastify.post<{ Params: { subscriptionId: string } }>(
    '/api/billing/subscriptions/:subscriptionId/cancel',
    async (request, reply) => {
      const { subscriptionId } = request.params;

      try {
        const [subscription] = await db
          .select()
          .from(billingSubscriptions)
          .where(eq(billingSubscriptions.id, subscriptionId));

        if (!subscription) {
          return reply.status(404).send({
            success: false,
            error: 'Subscription not found',
          });
        }

        // Cancel at period end in Stripe
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });

        // Update database
        const [updated] = await db
          .update(billingSubscriptions)
          .set({
            cancelAtPeriodEnd: true,
            updatedAt: new Date(),
          })
          .where(eq(billingSubscriptions.id, subscriptionId))
          .returning();

        return {
          success: true,
          subscription: updated,
        };
      } catch (error: any) {
        request.log.error('Failed to cancel subscription:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to cancel subscription',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/billing/portal/:companyId
   * Get customer portal URL
   */
  fastify.post<{ Params: { companyId: string } }>(
    '/api/billing/portal/:companyId',
    async (request, reply) => {
      const { companyId } = request.params;

      try {
        const [customer] = await db
          .select()
          .from(billingCustomers)
          .where(eq(billingCustomers.companyId, companyId));

        if (!customer) {
          return reply.status(404).send({
            success: false,
            error: 'Customer not found',
          });
        }

        const session = await stripe.billingPortal.sessions.create({
          customer: customer.stripeCustomerId,
          return_url: `${process.env.APP_URL || 'http://localhost:4321'}/billing`,
        });

        return {
          success: true,
          url: session.url,
        };
      } catch (error: any) {
        request.log.error('Failed to create portal session:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to create portal session',
          message: error.message,
        });
      }
    }
  );
}

/**
 * Create entitlement policies based on subscription plan
 */
async function createPlanPolicies(companyId: string, plan: string, subscriptionId: string): Promise<void> {

  const featuresByPlan: Record<string, string[]> = {
    starter: ['report_builder', 'export_pdf', 'export_csv'],
    pro: [
      'report_builder',
      'boardroom_live',
      'forecast',
      'benchmarking',
      'nlq',
      'export_pdf',
      'export_csv',
      'export_pptx',
      'api_access',
    ],
    enterprise: [
      'report_builder',
      'boardroom_live',
      'forecast',
      'benchmarking',
      'nlq',
      'gen_ai_reports',
      'export_pdf',
      'export_csv',
      'export_pptx',
      'api_access',
      'sso',
      'custom_branding',
      'priority_support',
    ],
  };

  const features = featuresByPlan[plan] || [];

  for (const feature of features) {
    await db.insert(entitlementPolicies).values({
      companyId,
      subscriptionId,
      name: `${plan} - ${feature}`,
      description: `${plan} plan access to ${feature}`,
      rules: [
        {
          feature,
          actions: ['view', 'create', 'update', 'delete', 'export', 'query', 'configure'],
          effect: 'allow' as const,
        },
      ],
      status: 'active',
      priority: 1,
    });
  }
}
