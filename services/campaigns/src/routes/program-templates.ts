/**
 * Program Templates Routes
 *
 * Provides reference data endpoints for program templates used in campaign creation wizard.
 * These are read-only endpoints for listing and retrieving template details.
 *
 * SWARM 6: Agent 3.6 - Campaign Service API
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '@teei/shared-schema';
import { programTemplates } from '@teei/shared-schema';
import { eq, and, or, ilike, sql } from 'drizzle-orm';

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

/**
 * Program Template Filters Schema
 */
const ProgramTemplateFiltersSchema = z.object({
  programType: z.enum(['mentorship', 'language', 'buddy', 'upskilling', 'weei']).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  search: z.string().optional(), // Search in name and description
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export const programTemplateRoutes: FastifyPluginAsync = async (fastify) => {

  // ==========================================================================
  // GET /program-templates - List Program Templates
  // ==========================================================================
  fastify.get<{ Querystring: z.infer<typeof ProgramTemplateFiltersSchema> }>(
    '/program-templates',
    {
      schema: {
        description: 'List program templates with filters (for campaign creation wizard)',
        tags: ['program-templates'],
        querystring: ProgramTemplateFiltersSchema,
      },
    },
    async (request, reply) => {
      const filters = request.query;

      try {
        // Build where conditions
        const conditions: any[] = [];

        if (filters.programType) {
          conditions.push(eq(programTemplates.programType, filters.programType));
        }

        if (filters.isActive !== undefined) {
          conditions.push(eq(programTemplates.isActive, filters.isActive));
        }

        if (filters.isPublic !== undefined) {
          conditions.push(eq(programTemplates.isPublic, filters.isPublic));
        }

        // Search in name and description
        if (filters.search) {
          const searchPattern = `%${filters.search}%`;
          conditions.push(
            or(
              ilike(programTemplates.name, searchPattern),
              ilike(programTemplates.description || '', searchPattern)
            )
          );
        }

        // Build where clause
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Query program templates
        const results = await db
          .select()
          .from(programTemplates)
          .where(whereClause)
          .limit(filters.limit)
          .offset(filters.offset);

        // Get total count
        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(programTemplates)
          .where(whereClause);

        return {
          success: true,
          templates: results,
          pagination: {
            total: Number(countResult.count),
            limit: filters.limit,
            offset: filters.offset,
          },
        };
      } catch (error: any) {
        request.log.error('Failed to list program templates:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to list program templates',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // GET /program-templates/:id - Get Program Template Details
  // ==========================================================================
  fastify.get<{ Params: { id: string } }>(
    '/program-templates/:id',
    {
      schema: {
        description: 'Get program template details by ID',
        tags: ['program-templates'],
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
        const [template] = await db
          .select()
          .from(programTemplates)
          .where(eq(programTemplates.id, id));

        if (!template) {
          return reply.status(404).send({
            success: false,
            error: 'Program template not found',
          });
        }

        // Include rich context for campaign wizard
        const enrichedTemplate = {
          ...template,
          meta: {
            // Helper info for UI
            configType: template.programType, // mentorship, language, buddy, upskilling, weei
            hasEstimatedCosts: !!template.estimatedCostPerParticipant,
            hasEstimatedHours: !!template.estimatedHoursPerVolunteer,
            suitableGroupCount: (template.suitableForGroups as string[] || []).length,
            outcomeMetricCount: (template.outcomeMetrics as string[] || []).length,
            isDeprecated: !!template.deprecatedAt,
            hasSupersedingVersion: !!template.supersededBy,
          },
        };

        return {
          success: true,
          template: enrichedTemplate,
        };
      } catch (error: any) {
        request.log.error('Failed to fetch program template:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch program template',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // GET /program-templates/:id/compatible-groups - Get Compatible Groups
  // ==========================================================================
  fastify.get<{ Params: { id: string } }>(
    '/program-templates/:id/compatible-groups',
    {
      schema: {
        description: 'Get beneficiary groups compatible with this program template',
        tags: ['program-templates'],
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
        const [template] = await db
          .select()
          .from(programTemplates)
          .where(eq(programTemplates.id, id));

        if (!template) {
          return reply.status(404).send({
            success: false,
            error: 'Program template not found',
          });
        }

        // Get template's program type
        const templateType = template.programType;

        // Get compatible beneficiary groups
        // Groups must have this program type in their eligibleProgramTypes array
        const allGroups = await db.query.beneficiaryGroups.findMany({
          where: (groups, { eq, and }) =>
            and(
              eq(groups.isActive, true),
              eq(groups.isPublic, true)
            ),
        });

        // Filter groups that include this template's program type
        const compatibleGroups = allGroups.filter(group => {
          const eligibleTypes = group.eligibleProgramTypes as string[];
          return eligibleTypes && eligibleTypes.includes(templateType);
        });

        return {
          success: true,
          groups: compatibleGroups,
          count: compatibleGroups.length,
          templateType,
        };
      } catch (error: any) {
        request.log.error('Failed to fetch compatible groups:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch compatible groups',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // GET /program-templates/types - Get Program Types Summary
  // ==========================================================================
  fastify.get(
    '/program-templates/types',
    {
      schema: {
        description: 'Get summary of available program types',
        tags: ['program-templates'],
      },
    },
    async (request, reply) => {
      try {
        // Get count of templates by type
        const allTemplates = await db
          .select()
          .from(programTemplates)
          .where(and(
            eq(programTemplates.isActive, true),
            eq(programTemplates.isPublic, true)
          ));

        // Group by program type
        const typesSummary = allTemplates.reduce((acc, template) => {
          const type = template.programType;
          if (!acc[type]) {
            acc[type] = {
              type,
              count: 0,
              templates: [],
            };
          }
          acc[type].count++;
          acc[type].templates.push({
            id: template.id,
            name: template.name,
            version: template.version,
            estimatedCostPerParticipant: template.estimatedCostPerParticipant,
            estimatedHoursPerVolunteer: template.estimatedHoursPerVolunteer,
          });
          return acc;
        }, {} as Record<string, any>);

        return {
          success: true,
          types: Object.values(typesSummary),
          totalTemplates: allTemplates.length,
        };
      } catch (error: any) {
        request.log.error('Failed to fetch program types summary:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch program types summary',
          message: error.message,
        });
      }
    }
  );
};
