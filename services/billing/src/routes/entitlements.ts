/**
 * Entitlements Routes
 * API endpoints for checking feature entitlements
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '@teei/shared-schema';
import {
  billingSubscriptions,
  l2iSubscriptions,
  usageQuotas,
} from '@teei/shared-schema';
import { eq, and } from 'drizzle-orm';
import { DEFAULT_PLAN_FEATURES, Feature } from '@teei/entitlements';
import { l2iBundleService } from '../lib/l2i-bundle-service.js';

/**
 * Get Entitlements Request Schema
 */
const GetEntitlementsSchema = z.object({
  companyId: z.string().uuid(),
});

export async function entitlementsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/entitlements/me
   * Get current user/company entitlements with quota information
   */
  fastify.get<{ Querystring: z.infer<typeof GetEntitlementsSchema> }>(
    '/api/entitlements/me',
    {
      schema: {
        querystring: GetEntitlementsSchema,
      },
    },
    async (request, reply) => {
      const { companyId } = request.query;

      try {
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

        if (!subscription) {
          return reply.status(404).send({
            success: false,
            error: 'No active subscription found',
          });
        }

        // Get plan features
        const planKey = subscription.plan as keyof typeof DEFAULT_PLAN_FEATURES;
        const planFeatures = DEFAULT_PLAN_FEATURES[planKey];

        if (!planFeatures) {
          return reply.status(500).send({
            success: false,
            error: 'Invalid subscription plan',
          });
        }

        // Get usage quotas
        const quotas = await db
          .select()
          .from(usageQuotas)
          .where(eq(usageQuotas.companyId, companyId));

        // Build quota map
        const quotaMap: Record<string, { limit: number; used: number; resetDate: string }> = {};
        for (const quota of quotas) {
          quotaMap[quota.feature] = {
            limit: quota.limit,
            used: quota.used,
            resetDate: quota.nextReset.toISOString(),
          };
        }

        // Get L2I bundles
        const l2iSubs = await l2iBundleService.getCompanyL2ISubscriptions(companyId);
        const l2iBundles = [];

        for (const l2iSub of l2iSubs) {
          const bundle = await l2iBundleService.getBundleBySku(l2iSub.sku as any);
          if (bundle) {
            l2iBundles.push({
              sku: l2iSub.sku,
              impactTier: bundle.impactTier,
              learnersSupported: bundle.learnersSupported,
              recognitionBadge: bundle.recognitionBadge,
              programAllocation: {
                language: Math.round(l2iSub.programAllocation.language * bundle.annualPrice),
                mentorship: Math.round(l2iSub.programAllocation.mentorship * bundle.annualPrice),
                upskilling: Math.round(l2iSub.programAllocation.upskilling * bundle.annualPrice),
                weei: Math.round(l2iSub.programAllocation.weei * bundle.annualPrice),
              },
            });
          }
        }

        // Build feature map
        const features: Record<string, any> = {};

        // Report Builder
        features.reportBuilder = {
          enabled: planFeatures.features.has(Feature.REPORT_BUILDER),
          tier: planFeatures.features.has(Feature.GEN_AI_REPORTS) ? 'advanced+genai' : 'advanced',
        };

        // Boardroom Live
        features.boardroomLive = {
          enabled: planFeatures.features.has(Feature.BOARDROOM_LIVE),
        };

        // NLQ (Natural Language Queries)
        const nlqQuota = quotaMap[Feature.NLQ];
        features.nlq = {
          enabled: planFeatures.features.has(Feature.NLQ),
          quota: nlqQuota || {
            limit: planFeatures.maxNlqQueriesPerMonth || 0,
            used: 0,
            resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
          },
        };

        // AI Copilot
        const aiTokensQuota = quotaMap['ai_tokens'];
        features.aiCopilot = {
          enabled: planFeatures.features.has(Feature.AI_COPILOT),
          tokenLimit: planFeatures.maxAiTokensPerMonth,
          tokensUsed: aiTokensQuota?.used || 0,
        };

        // Export formats
        features.exportPdf = { enabled: planFeatures.features.has(Feature.EXPORT_PDF) };
        features.exportCsv = { enabled: planFeatures.features.has(Feature.EXPORT_CSV) };
        features.exportPptx = { enabled: planFeatures.features.has(Feature.EXPORT_PPTX) };

        // External connectors
        features.connectors = {
          enabled: planFeatures.features.has(Feature.EXTERNAL_CONNECTORS),
          limit: planFeatures.maxExternalConnectors || 0,
          active: [], // TODO: Get active connectors from config
        };

        // Forecasting
        features.forecast = { enabled: planFeatures.features.has(Feature.FORECAST) };

        // Benchmarking
        features.benchmarking = { enabled: planFeatures.features.has(Feature.BENCHMARKING) };

        // Gen-AI Reports
        features.genAiReports = { enabled: planFeatures.features.has(Feature.GEN_AI_REPORTS) };

        // API Access
        features.apiAccess = { enabled: planFeatures.features.has(Feature.API_ACCESS) };

        // SSO/SAML
        features.sso = { enabled: planFeatures.features.has(Feature.SSO) };

        // SCIM Provisioning
        features.scimProvisioning = { enabled: planFeatures.features.has(Feature.SCIM_PROVISIONING) };

        // Custom Branding
        features.customBranding = { enabled: planFeatures.features.has(Feature.CUSTOM_BRANDING) };

        // Multi-region
        features.multiRegion = { enabled: planFeatures.features.has(Feature.MULTI_REGION) };

        // Priority Support
        features.prioritySupport = { enabled: planFeatures.features.has(Feature.PRIORITY_SUPPORT) };

        // Build quotas object
        const seatsQuota = quotaMap['seats'];
        const storageQuota = quotaMap['storage'];
        const quotasObj = {
          seats: seatsQuota || {
            limit: planFeatures.maxSeats || 0,
            used: subscription.seatCount || 0,
          },
          storage: storageQuota || {
            limit: (planFeatures.maxStorageGB || 0) * 1024 * 1024 * 1024, // Convert GB to bytes
            used: 0,
          },
          aiTokens: aiTokensQuota || {
            limit: planFeatures.maxAiTokensPerMonth || 0,
            used: 0,
            resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
          },
        };

        return {
          success: true,
          plan: subscription.plan,
          features,
          l2iBundles,
          quotas: quotasObj,
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
   * POST /api/entitlements/check
   * Check if a specific feature/action is allowed
   */
  fastify.post<{
    Body: {
      companyId: string;
      userId?: string;
      feature: string;
      action: string;
      resource?: string;
    };
  }>(
    '/api/entitlements/check',
    async (request, reply) => {
      const { companyId, userId, feature, action, resource } = request.body;

      try {
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

        if (!subscription) {
          return {
            success: true,
            allowed: false,
            reason: 'No active subscription',
          };
        }

        // Get plan features
        const planKey = subscription.plan as keyof typeof DEFAULT_PLAN_FEATURES;
        const planFeatures = DEFAULT_PLAN_FEATURES[planKey];

        if (!planFeatures) {
          return {
            success: true,
            allowed: false,
            reason: 'Invalid subscription plan',
          };
        }

        // Check if feature is in plan
        const featureEnum = Feature[feature.toUpperCase() as keyof typeof Feature];
        if (!featureEnum || !planFeatures.features.has(featureEnum)) {
          return {
            success: true,
            allowed: false,
            reason: `Feature ${feature} not included in ${subscription.plan} plan`,
          };
        }

        // Check quota if applicable
        const [quota] = await db
          .select()
          .from(usageQuotas)
          .where(
            and(
              eq(usageQuotas.companyId, companyId),
              eq(usageQuotas.feature, feature)
            )
          )
          .limit(1);

        if (quota && quota.used >= quota.limit) {
          return {
            success: true,
            allowed: false,
            reason: `Quota exceeded for ${feature} (${quota.used}/${quota.limit})`,
            quotaRemaining: 0,
          };
        }

        return {
          success: true,
          allowed: true,
          reason: `Allowed by ${subscription.plan} subscription`,
          quotaRemaining: quota ? quota.limit - quota.used : undefined,
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
}
