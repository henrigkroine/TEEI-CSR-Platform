/**
 * Campaign Management Routes
 *
 * Handles CRUD operations for campaigns, metrics retrieval, program instances,
 * and state transitions.
 *
 * SWARM 6: Agent 3.6 - Campaign Service API
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '@teei/shared-schema';
import {
  campaigns,
  programInstances,
  campaignMetricsSnapshots,
  NewCampaign,
  Campaign
} from '@teei/shared-schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import type { AuthenticatedRequest } from '../middleware/auth.js';

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

/**
 * Create Campaign Request Schema
 */
const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),

  // Relationships
  companyId: z.string().uuid(),
  programTemplateId: z.string().uuid(),
  beneficiaryGroupId: z.string().uuid(),

  // Period
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/).optional(),

  // Capacity
  targetVolunteers: z.number().int().min(1),
  targetBeneficiaries: z.number().int().min(1),
  maxSessions: z.number().int().min(1).optional(),

  // Budget
  budgetAllocated: z.number().positive(),
  currency: z.string().length(3).default('EUR'),

  // Pricing Model
  pricingModel: z.enum(['seats', 'credits', 'bundle', 'iaas', 'custom']),

  // Seats model fields
  committedSeats: z.number().int().min(1).optional(),
  seatPricePerMonth: z.number().positive().optional(),

  // Credits model fields
  creditAllocation: z.number().int().min(1).optional(),
  creditConsumptionRate: z.number().positive().optional(),

  // IAAS model fields
  iaasMetrics: z.object({
    learnersCommitted: z.number().int().min(1),
    pricePerLearner: z.number().positive(),
    outcomesGuaranteed: z.array(z.string()),
    outcomeThresholds: z.record(z.number()).optional()
  }).optional(),

  // Bundle model fields
  l2iSubscriptionId: z.string().uuid().optional(),
  bundleAllocationPercentage: z.number().min(0).max(1).optional(),

  // Custom pricing
  customPricingTerms: z.record(z.any()).optional(),

  // Configuration overrides
  configOverrides: z.record(z.any()).optional(),

  // Metadata
  tags: z.array(z.string()).optional(),
  internalNotes: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  { message: 'startDate must be before endDate', path: ['startDate'] }
).refine(
  (data) => {
    // Validate pricing model has required fields
    if (data.pricingModel === 'seats' && (!data.committedSeats || !data.seatPricePerMonth)) {
      return false;
    }
    if (data.pricingModel === 'credits' && (!data.creditAllocation || !data.creditConsumptionRate)) {
      return false;
    }
    if (data.pricingModel === 'iaas' && !data.iaasMetrics) {
      return false;
    }
    if (data.pricingModel === 'bundle' && (!data.l2iSubscriptionId || !data.bundleAllocationPercentage)) {
      return false;
    }
    return true;
  },
  { message: 'Missing required fields for selected pricing model', path: ['pricingModel'] }
);

/**
 * Update Campaign Request Schema
 */
const UpdateCampaignSchema = CreateCampaignSchema.partial().omit({ companyId: true });

/**
 * Campaign Filters Schema
 */
const CampaignFiltersSchema = z.object({
  companyId: z.string().uuid().optional(),
  status: z.enum(['draft', 'planned', 'recruiting', 'active', 'paused', 'completed', 'closed']).optional(),
  programTemplateId: z.string().uuid().optional(),
  beneficiaryGroupId: z.string().uuid().optional(),
  pricingModel: z.enum(['seats', 'credits', 'bundle', 'iaas', 'custom']).optional(),
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/).optional(),
  isNearCapacity: z.boolean().optional(),
  isOverCapacity: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

/**
 * State Transition Schema
 */
const StateTransitionSchema = z.object({
  targetStatus: z.enum(['draft', 'planned', 'recruiting', 'active', 'paused', 'completed', 'closed']),
  notes: z.string().optional(),
});

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export const campaignRoutes: FastifyPluginAsync = async (fastify) => {

  // ==========================================================================
  // POST /campaigns - Create Campaign
  // ==========================================================================
  fastify.post<{ Body: z.infer<typeof CreateCampaignSchema> }>(
    '/campaigns',
    {
      schema: {
        description: 'Create a new campaign',
        tags: ['campaigns'],
        body: CreateCampaignSchema,
      },
    },
    async (request, reply) => {
      const authRequest = request as AuthenticatedRequest;
      const data = request.body;

      try {
        // Validate template and group exist
        const [template] = await db.query.programTemplates.findMany({
          where: (templates, { eq }) => eq(templates.id, data.programTemplateId),
        });

        const [group] = await db.query.beneficiaryGroups.findMany({
          where: (groups, { eq }) => eq(groups.id, data.beneficiaryGroupId),
        });

        if (!template) {
          return reply.status(404).send({
            success: false,
            error: 'Program template not found',
          });
        }

        if (!group) {
          return reply.status(404).send({
            success: false,
            error: 'Beneficiary group not found',
          });
        }

        // Check template-group compatibility
        const templateType = template.programType;
        const groupEligibleTypes = group.eligibleProgramTypes as string[];

        if (!groupEligibleTypes.includes(templateType)) {
          return reply.status(400).send({
            success: false,
            error: 'Incompatible template and group',
            message: `Template type '${templateType}' is not eligible for this beneficiary group`,
          });
        }

        // Create campaign
        const newCampaign: NewCampaign = {
          name: data.name,
          description: data.description,
          companyId: data.companyId,
          programTemplateId: data.programTemplateId,
          beneficiaryGroupId: data.beneficiaryGroupId,
          startDate: data.startDate,
          endDate: data.endDate,
          quarter: data.quarter,
          status: 'draft',
          priority: data.priority || 'medium',
          targetVolunteers: data.targetVolunteers,
          targetBeneficiaries: data.targetBeneficiaries,
          maxSessions: data.maxSessions,
          budgetAllocated: data.budgetAllocated.toString(),
          currency: data.currency,
          pricingModel: data.pricingModel,
          committedSeats: data.committedSeats,
          seatPricePerMonth: data.seatPricePerMonth?.toString(),
          creditAllocation: data.creditAllocation,
          creditConsumptionRate: data.creditConsumptionRate?.toString(),
          creditsRemaining: data.creditAllocation,
          iaasMetrics: data.iaasMetrics,
          l2iSubscriptionId: data.l2iSubscriptionId,
          bundleAllocationPercentage: data.bundleAllocationPercentage?.toString(),
          customPricingTerms: data.customPricingTerms,
          configOverrides: data.configOverrides || {},
          tags: data.tags || [],
          internalNotes: data.internalNotes,
          createdBy: authRequest.user.userId,
        };

        const [campaign] = await db.insert(campaigns).values(newCampaign).returning();

        return {
          success: true,
          campaign,
        };
      } catch (error: any) {
        request.log.error('Failed to create campaign:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to create campaign',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // GET /campaigns/:id - Get Campaign Details
  // ==========================================================================
  fastify.get<{ Params: { id: string } }>(
    '/campaigns/:id',
    {
      schema: {
        description: 'Get campaign details by ID',
        tags: ['campaigns'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const [campaign] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, id));

        if (!campaign) {
          return reply.status(404).send({
            success: false,
            error: 'Campaign not found',
          });
        }

        return {
          success: true,
          campaign,
        };
      } catch (error: any) {
        request.log.error('Failed to fetch campaign:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch campaign',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // PATCH /campaigns/:id - Update Campaign
  // ==========================================================================
  fastify.patch<{
    Params: { id: string };
    Body: z.infer<typeof UpdateCampaignSchema>;
  }>(
    '/campaigns/:id',
    {
      schema: {
        description: 'Update campaign',
        tags: ['campaigns'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: UpdateCampaignSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body;

      try {
        const [existingCampaign] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, id));

        if (!existingCampaign) {
          return reply.status(404).send({
            success: false,
            error: 'Campaign not found',
          });
        }

        // Build update object
        const updateData: Partial<NewCampaign> = {};

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.startDate !== undefined) updateData.startDate = updates.startDate;
        if (updates.endDate !== undefined) updateData.endDate = updates.endDate;
        if (updates.quarter !== undefined) updateData.quarter = updates.quarter;
        if (updates.targetVolunteers !== undefined) updateData.targetVolunteers = updates.targetVolunteers;
        if (updates.targetBeneficiaries !== undefined) updateData.targetBeneficiaries = updates.targetBeneficiaries;
        if (updates.maxSessions !== undefined) updateData.maxSessions = updates.maxSessions;
        if (updates.budgetAllocated !== undefined) updateData.budgetAllocated = updates.budgetAllocated.toString();
        if (updates.currency !== undefined) updateData.currency = updates.currency;
        if (updates.tags !== undefined) updateData.tags = updates.tags;
        if (updates.internalNotes !== undefined) updateData.internalNotes = updates.internalNotes;
        if (updates.priority !== undefined) updateData.priority = updates.priority;
        if (updates.configOverrides !== undefined) updateData.configOverrides = updates.configOverrides;

        updateData.updatedAt = new Date();

        const [updated] = await db
          .update(campaigns)
          .set(updateData)
          .where(eq(campaigns.id, id))
          .returning();

        return {
          success: true,
          campaign: updated,
        };
      } catch (error: any) {
        request.log.error('Failed to update campaign:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to update campaign',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // DELETE /campaigns/:id - Soft Delete Campaign
  // ==========================================================================
  fastify.delete<{ Params: { id: string } }>(
    '/campaigns/:id',
    {
      schema: {
        description: 'Soft delete campaign (mark as archived)',
        tags: ['campaigns'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const [campaign] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, id));

        if (!campaign) {
          return reply.status(404).send({
            success: false,
            error: 'Campaign not found',
          });
        }

        // Soft delete: mark as archived and closed
        const [updated] = await db
          .update(campaigns)
          .set({
            isActive: false,
            isArchived: true,
            status: 'closed',
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, id))
          .returning();

        return {
          success: true,
          message: 'Campaign archived successfully',
          campaign: updated,
        };
      } catch (error: any) {
        request.log.error('Failed to delete campaign:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to delete campaign',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // GET /campaigns - List Campaigns with Filters
  // ==========================================================================
  fastify.get<{ Querystring: z.infer<typeof CampaignFiltersSchema> }>(
    '/campaigns',
    {
      schema: {
        description: 'List campaigns with filters',
        tags: ['campaigns'],
        querystring: CampaignFiltersSchema,
      },
    },
    async (request, reply) => {
      const filters = request.query;

      try {
        // Build where conditions
        const conditions: any[] = [];

        if (filters.companyId) {
          conditions.push(eq(campaigns.companyId, filters.companyId));
        }

        if (filters.status) {
          conditions.push(eq(campaigns.status, filters.status));
        }

        if (filters.programTemplateId) {
          conditions.push(eq(campaigns.programTemplateId, filters.programTemplateId));
        }

        if (filters.beneficiaryGroupId) {
          conditions.push(eq(campaigns.beneficiaryGroupId, filters.beneficiaryGroupId));
        }

        if (filters.pricingModel) {
          conditions.push(eq(campaigns.pricingModel, filters.pricingModel));
        }

        if (filters.quarter) {
          conditions.push(eq(campaigns.quarter, filters.quarter));
        }

        if (filters.isNearCapacity !== undefined) {
          conditions.push(eq(campaigns.isNearCapacity, filters.isNearCapacity));
        }

        if (filters.isOverCapacity !== undefined) {
          conditions.push(eq(campaigns.isOverCapacity, filters.isOverCapacity));
        }

        // Query campaigns
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const results = await db
          .select()
          .from(campaigns)
          .where(whereClause)
          .orderBy(desc(campaigns.createdAt))
          .limit(filters.limit)
          .offset(filters.offset);

        // Get total count
        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(campaigns)
          .where(whereClause);

        return {
          success: true,
          campaigns: results,
          pagination: {
            total: Number(countResult.count),
            limit: filters.limit,
            offset: filters.offset,
          },
        };
      } catch (error: any) {
        request.log.error('Failed to list campaigns:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to list campaigns',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // GET /campaigns/:id/metrics - Get Campaign Metrics
  // ==========================================================================
  fastify.get<{ Params: { id: string } }>(
    '/campaigns/:id/metrics',
    {
      schema: {
        description: 'Get campaign metrics',
        tags: ['campaigns', 'metrics'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const [campaign] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, id));

        if (!campaign) {
          return reply.status(404).send({
            success: false,
            error: 'Campaign not found',
          });
        }

        // Get latest metrics snapshot (if exists)
        const [latestSnapshot] = await db
          .select()
          .from(campaignMetricsSnapshots)
          .where(eq(campaignMetricsSnapshots.campaignId, id))
          .orderBy(desc(campaignMetricsSnapshots.createdAt))
          .limit(1);

        // Calculate current metrics
        const volunteerUtilization = campaign.targetVolunteers > 0
          ? (campaign.currentVolunteers / campaign.targetVolunteers)
          : 0;

        const beneficiaryUtilization = campaign.targetBeneficiaries > 0
          ? (campaign.currentBeneficiaries / campaign.targetBeneficiaries)
          : 0;

        const sessionUtilization = campaign.maxSessions
          ? (campaign.currentSessions / campaign.maxSessions)
          : 0;

        const budgetUtilization = parseFloat(campaign.budgetAllocated) > 0
          ? (parseFloat(campaign.budgetSpent) / parseFloat(campaign.budgetAllocated))
          : 0;

        const metrics = {
          // Current values
          current: {
            volunteers: campaign.currentVolunteers,
            beneficiaries: campaign.currentBeneficiaries,
            sessions: campaign.currentSessions,
            hoursLogged: campaign.totalHoursLogged,
            budgetSpent: campaign.budgetSpent,
          },

          // Targets
          targets: {
            volunteers: campaign.targetVolunteers,
            beneficiaries: campaign.targetBeneficiaries,
            sessions: campaign.maxSessions,
            budget: campaign.budgetAllocated,
          },

          // Utilization percentages
          utilization: {
            volunteers: Math.round(volunteerUtilization * 100),
            beneficiaries: Math.round(beneficiaryUtilization * 100),
            sessions: campaign.maxSessions ? Math.round(sessionUtilization * 100) : null,
            budget: Math.round(budgetUtilization * 100),
          },

          // Impact metrics
          impact: {
            cumulativeSROI: campaign.cumulativeSROI,
            averageVIS: campaign.averageVIS,
            totalHoursLogged: campaign.totalHoursLogged,
            totalSessionsCompleted: campaign.totalSessionsCompleted,
          },

          // Capacity flags
          capacity: {
            isNearCapacity: campaign.isNearCapacity,
            isOverCapacity: campaign.isOverCapacity,
            capacityUtilization: campaign.capacityUtilization,
          },

          // Upsell indicators
          upsell: {
            isHighValue: campaign.isHighValue,
            upsellOpportunityScore: campaign.upsellOpportunityScore,
          },

          // Latest snapshot (if available)
          latestSnapshot: latestSnapshot || null,

          // Last update
          lastMetricsUpdateAt: campaign.lastMetricsUpdateAt,
        };

        return {
          success: true,
          metrics,
        };
      } catch (error: any) {
        request.log.error('Failed to fetch campaign metrics:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch campaign metrics',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // GET /campaigns/:id/instances - List Program Instances
  // ==========================================================================
  fastify.get<{ Params: { id: string } }>(
    '/campaigns/:id/instances',
    {
      schema: {
        description: 'List program instances for a campaign',
        tags: ['campaigns', 'instances'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const [campaign] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, id));

        if (!campaign) {
          return reply.status(404).send({
            success: false,
            error: 'Campaign not found',
          });
        }

        // Get all program instances for this campaign
        const instances = await db
          .select()
          .from(programInstances)
          .where(eq(programInstances.campaignId, id))
          .orderBy(desc(programInstances.createdAt));

        return {
          success: true,
          instances,
          count: instances.length,
        };
      } catch (error: any) {
        request.log.error('Failed to fetch program instances:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch program instances',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // GET /campaigns/:id/evidence - Get Campaign Evidence
  // SWARM 6: Agent 4.4 - evidence-campaign-linker
  // ==========================================================================
  fastify.get<{
    Params: { id: string };
    Querystring: { limit?: number; offset?: number };
  }>(
    '/campaigns/:id/evidence',
    {
      schema: {
        description: 'Get top evidence snippets for a campaign',
        tags: ['campaigns', 'evidence'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 10,
              description: 'Number of evidence snippets to return',
            },
            offset: {
              type: 'integer',
              minimum: 0,
              default: 0,
              description: 'Pagination offset',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { limit = 10, offset = 0 } = request.query;

      try {
        const [campaign] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, id));

        if (!campaign) {
          return reply.status(404).send({
            success: false,
            error: 'Campaign not found',
          });
        }

        // Query evidence snippets linked to this campaign
        // TODO: Replace with actual evidenceSnippets query when schema is migrated
        // For now, return campaign's evidenceSnippetIds as placeholder
        const evidenceSnippetIds = campaign.evidenceSnippetIds as string[];

        return {
          success: true,
          evidence: {
            campaignId: id,
            campaignName: campaign.name,
            snippetCount: evidenceSnippetIds.length,
            snippetIds: evidenceSnippetIds.slice(offset, offset + limit),
            pagination: {
              total: evidenceSnippetIds.length,
              limit,
              offset,
              hasMore: offset + limit < evidenceSnippetIds.length,
            },
          },
        };
      } catch (error: any) {
        request.log.error('Failed to fetch campaign evidence:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch campaign evidence',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // POST /campaigns/:id/transition - Manual State Transition
  // ==========================================================================
  fastify.post<{
    Params: { id: string };
    Body: z.infer<typeof StateTransitionSchema>;
  }>(
    '/campaigns/:id/transition',
    {
      schema: {
        description: 'Manually transition campaign state',
        tags: ['campaigns'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: StateTransitionSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { targetStatus, notes } = request.body;

      try {
        const [campaign] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, id));

        if (!campaign) {
          return reply.status(404).send({
            success: false,
            error: 'Campaign not found',
          });
        }

        // Validate state transition (basic validation)
        const currentStatus = campaign.status;

        // Define valid transitions
        const validTransitions: Record<string, string[]> = {
          draft: ['planned', 'closed'],
          planned: ['recruiting', 'closed'],
          recruiting: ['active', 'closed'],
          active: ['paused', 'completed'],
          paused: ['active', 'closed'],
          completed: ['closed'],
          closed: [], // Terminal state
        };

        const allowedTargets = validTransitions[currentStatus] || [];

        if (!allowedTargets.includes(targetStatus)) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid state transition',
            message: `Cannot transition from '${currentStatus}' to '${targetStatus}'`,
            allowedTargets,
          });
        }

        // Update campaign status
        const [updated] = await db
          .update(campaigns)
          .set({
            status: targetStatus,
            internalNotes: notes ? `${campaign.internalNotes || ''}\n[${new Date().toISOString()}] Transition to ${targetStatus}: ${notes}` : campaign.internalNotes,
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, id))
          .returning();

        return {
          success: true,
          message: `Campaign transitioned from '${currentStatus}' to '${targetStatus}'`,
          campaign: updated,
        };
      } catch (error: any) {
        request.log.error('Failed to transition campaign state:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to transition campaign state',
          message: error.message,
        });
      }
    }
  );
};
