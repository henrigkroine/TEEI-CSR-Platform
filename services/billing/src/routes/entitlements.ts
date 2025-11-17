/**
 * Entitlements Routes
 * API endpoints for checking user/company entitlements
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, billingSubscriptions, l2iBundles } from '@teei/shared-schema';
import { eq, and } from 'drizzle-orm';
import { EntitlementEngine, Feature, DEFAULT_PLAN_FEATURES } from '@teei/entitlements';

const entitlementEngine = new EntitlementEngine();

/**
 * Entitlement Check Request Schema
 */
const EntitlementCheckSchema = z.object({
  companyId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  feature: z.string(),
  action: z.enum(['view', 'create', 'update', 'delete', 'export', 'query', 'configure']),
});

/**
 * Company Entitlements Response
 */
interface CompanyEntitlements {
  companyId: string;
  subscription: {
    plan: string;
    status: string;
    features: string[];
    limits: {
      maxSeats: number | null;
      maxReportsPerMonth: number | null;
      maxAiTokensPerMonth: number | null;
      maxStorageGB: number | null;
    };
  } | null;
  l2iBundles: {
    totalBundles: number;
    totalCapacity: number;
    totalAllocated: number;
    impactCredits: number;
    founderBadge?: string;
  };
  availableFeatures: string[];
}

export async function entitlementRoutes(fastify: FastifyInstance) {

  /**
   * POST /api/entitlements/check
   * Check if a user/company has access to a feature
   */
  fastify.post<{ Body: z.infer<typeof EntitlementCheckSchema> }>(
    '/api/entitlements/check',
    {
      schema: {
        body: EntitlementCheckSchema,
      },
    },
    async (request, reply) => {
      try {
        const decision = await entitlementEngine.check({
          companyId: request.body.companyId,
          userId: request.body.userId,
          feature: request.body.feature as any,
          action: request.body.action as any,
        });

        return {
          success: true,
          allowed: decision.allowed,
          reason: decision.reason,
          quotaRemaining: decision.quotaRemaining,
          expiresAt: decision.expiresAt,
        };
      } catch (error: any) {
        request.log.error('Failed to check entitlement:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to check entitlement',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/entitlements/me
   * Get entitlements for the current user's company
   * Query params: companyId, userId (optional)
   */
  fastify.get<{ Querystring: { companyId: string; userId?: string } }>(
    '/api/entitlements/me',
    async (request, reply) => {
      const { companyId, userId } = request.query;

      if (!companyId) {
        return reply.status(400).send({
          success: false,
          error: 'companyId is required',
        });
      }

      try {
        const entitlements = await getCompanyEntitlements(companyId);

        return {
          success: true,
          entitlements,
        };
      } catch (error: any) {
        request.log.error('Failed to get entitlements:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to get entitlements',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/entitlements/:companyId
   * Get full entitlements for a company (admin only)
   */
  fastify.get<{ Params: { companyId: string } }>(
    '/api/entitlements/:companyId',
    async (request, reply) => {
      const { companyId } = request.params;

      try {
        const entitlements = await getCompanyEntitlements(companyId);

        return {
          success: true,
          entitlements,
        };
      } catch (error: any) {
        request.log.error('Failed to get entitlements:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to get entitlements',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/entitlements/usage/increment
   * Increment usage quota for a feature
   */
  fastify.post<{
    Body: {
      companyId: string;
      feature: string;
      quotaType: string;
      amount?: number;
    };
  }>(
    '/api/entitlements/usage/increment',
    async (request, reply) => {
      try {
        await entitlementEngine.incrementUsage(
          request.body.companyId,
          request.body.feature as any,
          request.body.quotaType,
          request.body.amount
        );

        return {
          success: true,
          message: 'Usage incremented',
        };
      } catch (error: any) {
        request.log.error('Failed to increment usage:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to increment usage',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/entitlements/cache/invalidate/:companyId
   * Invalidate entitlement cache for a company
   */
  fastify.post<{ Params: { companyId: string } }>(
    '/api/entitlements/cache/invalidate/:companyId',
    async (request, reply) => {
      const { companyId } = request.params;

      try {
        await entitlementEngine.invalidateCompany(companyId);

        return {
          success: true,
          message: 'Cache invalidated',
        };
      } catch (error: any) {
        request.log.error('Failed to invalidate cache:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to invalidate cache',
          message: error.message,
        });
      }
    }
  );
}

/**
 * Get full entitlements for a company
 */
async function getCompanyEntitlements(companyId: string): Promise<CompanyEntitlements> {
  // Get active subscription
  const [subscription] = await db
    .select()
    .from(billingSubscriptions)
    .where(
      and(
        eq(billingSubscriptions.companyId, companyId),
        eq(billingSubscriptions.status, 'active')
      )
    )
    .limit(1);

  let subscriptionInfo = null;
  const availableFeatures: string[] = [];

  if (subscription) {
    const planFeatures = DEFAULT_PLAN_FEATURES[subscription.plan as keyof typeof DEFAULT_PLAN_FEATURES];

    if (planFeatures) {
      subscriptionInfo = {
        plan: subscription.plan,
        status: subscription.status,
        features: Array.from(planFeatures.features),
        limits: {
          maxSeats: planFeatures.maxSeats,
          maxReportsPerMonth: planFeatures.maxReportsPerMonth,
          maxAiTokensPerMonth: planFeatures.maxAiTokensPerMonth,
          maxStorageGB: planFeatures.maxStorageGB,
        },
      };

      availableFeatures.push(...planFeatures.features);
    }
  }

  // Get L2I bundles
  const bundles = await db
    .select()
    .from(l2iBundles)
    .where(eq(l2iBundles.companyId, companyId));

  const totalBundles = bundles.length;
  const totalCapacity = bundles.reduce((sum, b) => sum + b.learnerCapacity, 0);
  const totalAllocated = bundles.reduce((sum, b) => sum + b.learnersAllocated, 0);

  const impactCredits = bundles.reduce((sum, b) => {
    const recognition = b.recognition as any;
    return sum + (recognition?.impactCredits || 0);
  }, 0);

  const founderBadges = bundles
    .map((b) => (b.recognition as any)?.founderBadge)
    .filter(Boolean) as string[];

  const founderBadgeOrder = ['founding-8', 'founding-100', 'founding-1000'];
  const founderBadge = founderBadges.sort(
    (a, b) => founderBadgeOrder.indexOf(a) - founderBadgeOrder.indexOf(b)
  )[0];

  return {
    companyId,
    subscription: subscriptionInfo,
    l2iBundles: {
      totalBundles,
      totalCapacity,
      totalAllocated,
      impactCredits,
      founderBadge,
    },
    availableFeatures: Array.from(new Set(availableFeatures)),
  };
}
