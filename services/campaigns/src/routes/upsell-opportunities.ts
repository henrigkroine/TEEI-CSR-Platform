/**
 * Upsell Opportunities Routes
 *
 * SWARM 6: Agent 5.4 - upsell-opportunity-analyzer
 *
 * Endpoints:
 * - GET /api/companies/:companyId/upsell-opportunities
 *   Return all upsell recommendations for a company
 *
 * - GET /api/campaigns/:campaignId/upsell-potential
 *   Return upsell potential for a specific campaign
 *
 * - GET /api/companies/:companyId/bundle-opportunities
 *   Return bundle/consolidation opportunities
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, eq, inArray } from '@teei/shared-schema';
import { campaigns, type Campaign } from '@teei/shared-schema';
import {
  generateUpsellRecommendations,
  scoreUpsellOpportunity,
  findBundleOpportunities,
  findExpansionOpportunities,
  findHighPerformers,
  type UpsellOpportunity,
  type CompanyUpsellOpportunity,
} from '../lib/upsell-analyzer.js';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CompanyIdSchema = z.object({
  companyId: z.string().uuid(),
});

const CampaignIdSchema = z.object({
  campaignId: z.string().uuid(),
});

const UpsellFiltersSchema = z.object({
  minScore: z.number().min(0).max(100).optional(),
  type: z.enum(['capacity_expansion', 'performance_boost', 'bundle_upgrade', 'engagement_boost']).optional(),
  onlyHighValue: z.boolean().optional(),
});

const HighPerformersFiltersSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  minSROI: z.number().optional(),
});

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export const upsellOpportunitiesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /companies/:companyId/upsell-opportunities
   * Get all upsell recommendations for a company
   */
  fastify.get<{
    Params: z.infer<typeof CompanyIdSchema>;
    Querystring: z.infer<typeof UpsellFiltersSchema>;
  }>(
    '/companies/:companyId/upsell-opportunities',
    {
      schema: {
        description: 'Get upsell opportunities for a company',
        tags: ['upsell', 'companies'],
        params: CompanyIdSchema,
        querystring: UpsellFiltersSchema,
      },
    },
    async (request, reply) => {
      try {
        const { companyId } = request.params;
        const { minScore = 0, type, onlyHighValue = false } = request.query;

        // Generate recommendations
        const result = await generateUpsellRecommendations(companyId);

        // Apply filters
        let filtered = result.recommendations;

        if (minScore > 0) {
          filtered = filtered.filter(r => r.compositeScore >= minScore);
        }

        if (type) {
          filtered = filtered.filter(r => r.recommendationType === type);
        }

        if (onlyHighValue) {
          filtered = filtered.filter(r => r.highValueFlag);
        }

        return {
          success: true,
          companyId,
          summary: {
            totalRecommendations: filtered.length,
            totalPotentialValue: filtered.reduce((sum, r) => sum + (r.estimatedExpansionCost || 0), 0),
            averageScore: filtered.length > 0
              ? Math.round(filtered.reduce((sum, r) => sum + r.compositeScore, 0) / filtered.length)
              : 0,
          },
          recommendations: filtered,
          bundleOpportunity: result.bundleOpportunity,
          nextSteps: result.nextSteps,
        };
      } catch (error: any) {
        request.log.error('Failed to fetch upsell opportunities:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch upsell opportunities',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /campaigns/:campaignId/upsell-potential
   * Get upsell potential for a specific campaign
   */
  fastify.get<{
    Params: z.infer<typeof CampaignIdSchema>;
  }>(
    '/campaigns/:campaignId/upsell-potential',
    {
      schema: {
        description: 'Get upsell potential for a specific campaign',
        tags: ['upsell', 'campaigns'],
        params: CampaignIdSchema,
      },
    },
    async (request, reply) => {
      try {
        const { campaignId } = request.params;

        // Fetch campaign
        const [campaign] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, campaignId))
          .limit(1);

        if (!campaign) {
          return reply.status(404).send({
            success: false,
            error: 'Campaign not found',
          });
        }

        // Score the campaign
        const opportunity = await scoreUpsellOpportunity(campaign);

        // Provide detailed insights
        const insights = generateCampaignInsights(campaign, opportunity);

        return {
          success: true,
          campaignId,
          opportunity,
          insights,
        };
      } catch (error: any) {
        request.log.error('Failed to fetch campaign upsell potential:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch campaign upsell potential',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /companies/:companyId/bundle-opportunities
   * Get bundle/consolidation opportunities for a company
   */
  fastify.get<{
    Params: z.infer<typeof CompanyIdSchema>;
  }>(
    '/companies/:companyId/bundle-opportunities',
    {
      schema: {
        description: 'Get bundle consolidation opportunities',
        tags: ['upsell', 'companies', 'bundles'],
        params: CompanyIdSchema,
      },
    },
    async (request, reply) => {
      try {
        const { companyId } = request.params;

        // Get all bundle opportunities
        const allBundleOpps = await findBundleOpportunities();

        // Find this company's bundle opportunity
        const companyBundleOpp = allBundleOpps.find(opp => opp.companyId === companyId);

        if (!companyBundleOpp) {
          return {
            success: true,
            companyId,
            opportunity: null,
            message: 'No bundle opportunity available. Company needs at least 2 active campaigns.',
            recommendation: 'Create or activate additional campaigns to enable bundle consolidation.',
          };
        }

        return {
          success: true,
          companyId,
          opportunity: companyBundleOpp,
          estimatedSavings: companyBundleOpp.estimatedBundleValue,
        };
      } catch (error: any) {
        request.log.error('Failed to fetch bundle opportunities:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch bundle opportunities',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /upsell/expansion-opportunities
   * Get all expansion opportunities across all companies (admin only)
   */
  fastify.get<{
    Querystring: z.infer<typeof UpsellFiltersSchema>;
  }>(
    '/upsell/expansion-opportunities',
    {
      schema: {
        description: 'Get expansion opportunities across all companies (admin)',
        tags: ['upsell', 'admin'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { limit = 50, offset = 0 } = request.query;

        // Get all expansion opportunities
        const allOpportunities = await findExpansionOpportunities();

        // Sort by composite score
        const sorted = allOpportunities.sort((a, b) => b.compositeScore - a.compositeScore);

        // Paginate
        const paginated = sorted.slice(offset, offset + limit);

        // Group by company
        const byCompany = new Map<string, UpsellOpportunity[]>();
        paginated.forEach(opp => {
          if (!byCompany.has(opp.companyId)) {
            byCompany.set(opp.companyId, []);
          }
          byCompany.get(opp.companyId)!.push(opp);
        });

        return {
          success: true,
          summary: {
            totalOpportunities: sorted.length,
            returnedCount: paginated.length,
            totalPotentialValue: paginated.reduce((sum, opp) => sum + (opp.estimatedExpansionCost || 0), 0),
          },
          opportunities: paginated,
          pagination: {
            limit,
            offset,
            total: sorted.length,
            hasMore: offset + limit < sorted.length,
          },
        };
      } catch (error: any) {
        request.log.error('Failed to fetch expansion opportunities:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch expansion opportunities',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /upsell/high-performers
   * Get all high-performing campaigns across all companies
   */
  fastify.get<{
    Querystring: z.infer<typeof HighPerformersFiltersSchema>;
  }>(
    '/upsell/high-performers',
    {
      schema: {
        description: 'Get high-performing campaigns (admin)',
        tags: ['upsell', 'admin'],
      },
    },
    async (request, reply) => {
      try {
        const { limit = 50, offset = 0, minSROI } = request.query;

        // Get all high performers
        const allHighPerformers = await findHighPerformers();

        // Filter by minimum SROI if provided
        let filtered = allHighPerformers;
        if (minSROI !== undefined) {
          filtered = filtered.filter(opp => (opp.cumulativeSROI || 0) >= minSROI);
        }

        // Sort by SROI descending
        const sorted = filtered.sort((a, b) => (b.cumulativeSROI || 0) - (a.cumulativeSROI || 0));

        // Paginate
        const paginated = sorted.slice(offset, offset + limit);

        return {
          success: true,
          summary: {
            totalHighPerformers: sorted.length,
            returnedCount: paginated.length,
            averageSROI: paginated.length > 0
              ? (paginated.reduce((sum, opp) => sum + (opp.cumulativeSROI || 0), 0) / paginated.length).toFixed(2)
              : 0,
          },
          highPerformers: paginated,
          pagination: {
            limit,
            offset,
            total: sorted.length,
            hasMore: offset + limit < sorted.length,
          },
        };
      } catch (error: any) {
        request.log.error('Failed to fetch high performers:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch high performers',
          message: error.message,
        });
      }
    }
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate detailed insights for a campaign's upsell potential
 */
function generateCampaignInsights(
  campaign: Campaign,
  opportunity: UpsellOpportunity
): Record<string, any> {
  const insights: Record<string, any> = {
    capacityInsight: null,
    performanceInsight: null,
    engagementInsight: null,
    spendInsight: null,
    risks: [],
    opportunities: [],
  };

  // Capacity insights
  const utilPercent = Math.round(opportunity.capacityUtilization * 100);
  if (opportunity.capacityUtilization >= 0.8) {
    insights.capacityInsight = {
      status: 'high',
      message: `Campaign is ${utilPercent}% full. Expansion opportunity exists.`,
      recommendation: `Increase ${opportunity.capacityUtilization > 1.0 ? 'urgently' : ''} target capacity to ${Math.round(campaign.targetVolunteers * 1.5)} volunteers.`,
    };
    insights.opportunities.push('Capacity expansion - highest priority');
  } else {
    insights.capacityInsight = {
      status: 'healthy',
      message: `Campaign is ${utilPercent}% full. Healthy utilization.`,
    };
  }

  // Performance insights
  const sroi = opportunity.cumulativeSROI || 0;
  const vis = opportunity.averageVIS || 0;

  if (sroi > 5 || vis > 80) {
    insights.performanceInsight = {
      status: 'high',
      message: `Strong performance with SROI ${sroi.toFixed(1)} and VIS ${vis.toFixed(0)}.`,
      recommendation: 'Scale this campaign to maximize return on investment.',
    };
    insights.opportunities.push('Scale high-performing campaign');
  } else if (sroi > 2 || vis > 50) {
    insights.performanceInsight = {
      status: 'moderate',
      message: `Moderate performance. SROI ${sroi.toFixed(1)}, VIS ${vis.toFixed(0)}.`,
      recommendation: 'Monitor performance metrics closely before scaling.',
    };
  } else {
    insights.performanceInsight = {
      status: 'low',
      message: `Performance below expected targets.`,
      recommendation: 'Review campaign strategy before expansion.',
    };
    insights.risks.push('Underperforming campaign - review before scaling');
  }

  // Engagement insights
  if (opportunity.currentSessions > 100) {
    insights.engagementInsight = {
      status: 'high',
      message: `High engagement: ${opportunity.currentSessions} sessions logged.`,
    };
    insights.opportunities.push('High engagement - expand to retain momentum');
  } else if (opportunity.currentSessions > 25) {
    insights.engagementInsight = {
      status: 'moderate',
      message: `Moderate engagement: ${opportunity.currentSessions} sessions.`,
    };
  } else {
    insights.engagementInsight = {
      status: 'low',
      message: `Limited engagement: ${opportunity.currentSessions} sessions.`,
    };
    insights.risks.push('Low engagement - improve before scaling');
  }

  // Spend insights
  const spendPercent = Math.round((opportunity.budgetSpent / opportunity.budgetAllocated) * 100);
  if (spendPercent > 90) {
    insights.spendInsight = {
      status: 'critical',
      message: `Budget ${spendPercent}% spent. At limit.`,
      recommendation: 'Increase budget allocation or reduce scope.',
    };
    insights.risks.push('Budget constraint - may limit expansion');
  } else if (spendPercent > 70) {
    insights.spendInsight = {
      status: 'warning',
      message: `Budget ${spendPercent}% spent. Approaching limit.`,
    };
  } else {
    insights.spendInsight = {
      status: 'healthy',
      message: `Budget ${spendPercent}% spent. Healthy margin.`,
    };
    insights.opportunities.push('Budget available for expansion');
  }

  return insights;
}
