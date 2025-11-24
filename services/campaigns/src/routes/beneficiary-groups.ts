/**
 * Beneficiary Groups Routes
 *
 * Provides reference data endpoints for beneficiary groups used in campaign creation wizard.
 * These are read-only endpoints for listing and retrieving beneficiary group details.
 *
 * SWARM 6: Agent 3.6 - Campaign Service API
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '@teei/shared-schema';
import { beneficiaryGroups } from '@teei/shared-schema';
import { eq, and, or, ilike, sql } from 'drizzle-orm';

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

/**
 * Beneficiary Group Filters Schema
 */
const BeneficiaryGroupFiltersSchema = z.object({
  groupType: z.enum([
    'refugees',
    'migrants',
    'asylum_seekers',
    'women_in_tech',
    'youth',
    'seniors',
    'displaced_persons',
    'newcomers',
    'students',
    'job_seekers',
    'caregivers',
    'veterans',
    'other'
  ]).optional(),
  countryCode: z.string().length(2).optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  eligibleProgramType: z.enum(['mentorship', 'language', 'buddy', 'upskilling', 'weei']).optional(),
  search: z.string().optional(), // Search in name and description
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export const beneficiaryGroupRoutes: FastifyPluginAsync = async (fastify) => {

  // ==========================================================================
  // GET /beneficiary-groups - List Beneficiary Groups
  // ==========================================================================
  fastify.get<{ Querystring: z.infer<typeof BeneficiaryGroupFiltersSchema> }>(
    '/beneficiary-groups',
    {
      schema: {
        description: 'List beneficiary groups with filters (for campaign creation wizard)',
        tags: ['beneficiary-groups'],
        querystring: BeneficiaryGroupFiltersSchema,
      },
    },
    async (request, reply) => {
      const filters = request.query;

      try {
        // Build where conditions
        const conditions: any[] = [];

        if (filters.groupType) {
          conditions.push(eq(beneficiaryGroups.groupType, filters.groupType));
        }

        if (filters.countryCode) {
          conditions.push(eq(beneficiaryGroups.countryCode, filters.countryCode.toUpperCase()));
        }

        if (filters.region) {
          conditions.push(eq(beneficiaryGroups.region, filters.region));
        }

        if (filters.city) {
          conditions.push(eq(beneficiaryGroups.city, filters.city));
        }

        if (filters.isActive !== undefined) {
          conditions.push(eq(beneficiaryGroups.isActive, filters.isActive));
        }

        if (filters.isPublic !== undefined) {
          conditions.push(eq(beneficiaryGroups.isPublic, filters.isPublic));
        }

        // Search in name and description
        if (filters.search) {
          const searchPattern = `%${filters.search}%`;
          conditions.push(
            or(
              ilike(beneficiaryGroups.name, searchPattern),
              ilike(beneficiaryGroups.description || '', searchPattern)
            )
          );
        }

        // Build where clause
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Query beneficiary groups
        let query = db
          .select()
          .from(beneficiaryGroups)
          .where(whereClause)
          .limit(filters.limit)
          .offset(filters.offset);

        let results = await query;

        // Filter by eligible program type if specified
        // This requires filtering the JSONB array eligibleProgramTypes
        if (filters.eligibleProgramType) {
          results = results.filter(group => {
            const eligibleTypes = group.eligibleProgramTypes as string[];
            return eligibleTypes && eligibleTypes.includes(filters.eligibleProgramType!);
          });
        }

        // Get total count
        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(beneficiaryGroups)
          .where(whereClause);

        return {
          success: true,
          groups: results,
          pagination: {
            total: Number(countResult.count),
            limit: filters.limit,
            offset: filters.offset,
          },
        };
      } catch (error: any) {
        request.log.error('Failed to list beneficiary groups:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to list beneficiary groups',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // GET /beneficiary-groups/:id - Get Beneficiary Group Details
  // ==========================================================================
  fastify.get<{ Params: { id: string } }>(
    '/beneficiary-groups/:id',
    {
      schema: {
        description: 'Get beneficiary group details by ID',
        tags: ['beneficiary-groups'],
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
        const [group] = await db
          .select()
          .from(beneficiaryGroups)
          .where(eq(beneficiaryGroups.id, id));

        if (!group) {
          return reply.status(404).send({
            success: false,
            error: 'Beneficiary group not found',
          });
        }

        // Include rich context for campaign wizard
        const enrichedGroup = {
          ...group,
          meta: {
            // Helper info for UI
            displayLocation: [group.city, group.region, group.countryCode]
              .filter(Boolean)
              .join(', '),
            languageCount: (group.primaryLanguages as string[] || []).length,
            programTypeCount: (group.eligibleProgramTypes as string[] || []).length,
            tagCount: (group.tags as string[] || []).length,
          },
        };

        return {
          success: true,
          group: enrichedGroup,
        };
      } catch (error: any) {
        request.log.error('Failed to fetch beneficiary group:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch beneficiary group',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // GET /beneficiary-groups/:id/compatible-templates - Get Compatible Templates
  // ==========================================================================
  fastify.get<{ Params: { id: string } }>(
    '/beneficiary-groups/:id/compatible-templates',
    {
      schema: {
        description: 'Get program templates compatible with this beneficiary group',
        tags: ['beneficiary-groups'],
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
        const [group] = await db
          .select()
          .from(beneficiaryGroups)
          .where(eq(beneficiaryGroups.id, id));

        if (!group) {
          return reply.status(404).send({
            success: false,
            error: 'Beneficiary group not found',
          });
        }

        // Get eligible program types from group
        const eligibleTypes = (group.eligibleProgramTypes as string[]) || [];

        if (eligibleTypes.length === 0) {
          return {
            success: true,
            templates: [],
            message: 'No eligible program types defined for this beneficiary group',
          };
        }

        // Get compatible templates
        const templates = await db.query.programTemplates.findMany({
          where: (templates, { inArray, eq, and }) =>
            and(
              inArray(templates.programType, eligibleTypes as any),
              eq(templates.isActive, true),
              eq(templates.isPublic, true)
            ),
        });

        return {
          success: true,
          templates,
          count: templates.length,
          eligibleTypes,
        };
      } catch (error: any) {
        request.log.error('Failed to fetch compatible templates:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch compatible templates',
          message: error.message,
        });
      }
    }
  );
};
