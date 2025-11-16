/**
 * NLQ Templates API Routes
 *
 * Endpoints:
 * - GET /v1/nlq/templates - List available metric templates
 * - GET /v1/nlq/templates/:id - Get specific template details
 *
 * Templates define the allowed metrics that can be queried via NLQ,
 * along with their safety constraints, parameters, and example questions.
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '@teei/shared-schema';
import { nlqTemplates } from '@teei/shared-schema/schema/nlq';
import { eq, and, sql } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('insights-nlq:templates');

// ===== ZOD SCHEMAS =====

const TemplatesListQuerySchema = z.object({
  category: z.enum(['impact', 'financial', 'engagement', 'outcomes']).optional(),
  active: z.coerce.boolean().default(true),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
});

// ===== ROUTE REGISTRATION =====

export async function templatesRoutes(app: FastifyInstance) {
  /**
   * GET /v1/nlq/templates
   * List all available metric templates with filtering
   */
  app.get<{
    Querystring: z.infer<typeof TemplatesListQuerySchema>;
  }>('/templates', async (request, reply) => {
    try {
      const params = TemplatesListQuerySchema.parse(request.query);

      logger.info('Listing templates', {
        category: params.category,
        active: params.active,
        limit: params.limit,
      });

      // Build query conditions
      const conditions = [];

      if (params.active !== undefined) {
        conditions.push(eq(nlqTemplates.active, params.active));
      }

      if (params.category) {
        conditions.push(eq(nlqTemplates.category, params.category));
      }

      // Add search filter if provided
      if (params.search) {
        const searchTerm = `%${params.search.toLowerCase()}%`;
        conditions.push(
          sql`(
            LOWER(${nlqTemplates.displayName}) LIKE ${searchTerm} OR
            LOWER(${nlqTemplates.description}) LIKE ${searchTerm} OR
            LOWER(${nlqTemplates.templateName}) LIKE ${searchTerm}
          )`
        );
      }

      // Fetch templates
      const templates = await db
        .select({
          id: nlqTemplates.id,
          templateName: nlqTemplates.templateName,
          displayName: nlqTemplates.displayName,
          description: nlqTemplates.description,
          category: nlqTemplates.category,
          estimatedComplexity: nlqTemplates.estimatedComplexity,
          maxTimeWindowDays: nlqTemplates.maxTimeWindowDays,
          maxResultRows: nlqTemplates.maxResultRows,
          cacheTtlSeconds: nlqTemplates.cacheTtlSeconds,
          allowedTimeRanges: nlqTemplates.allowedTimeRanges,
          allowedGroupBy: nlqTemplates.allowedGroupBy,
          exampleQuestions: nlqTemplates.exampleQuestions,
          tags: nlqTemplates.tags,
          version: nlqTemplates.version,
          createdAt: nlqTemplates.createdAt,
          updatedAt: nlqTemplates.updatedAt,
        })
        .from(nlqTemplates)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(params.limit)
        .offset(params.offset)
        .orderBy(nlqTemplates.displayName);

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(nlqTemplates)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = Number(countResult[0]?.count || 0);

      return reply.send({
        templates: templates.map(t => ({
          id: t.id,
          templateName: t.templateName,
          displayName: t.displayName,
          description: t.description,
          category: t.category,
          performance: {
            estimatedComplexity: t.estimatedComplexity,
            maxTimeWindowDays: t.maxTimeWindowDays,
            maxResultRows: t.maxResultRows,
            cacheTtlSeconds: t.cacheTtlSeconds,
          },
          allowedParameters: {
            timeRanges: t.allowedTimeRanges,
            groupBy: t.allowedGroupBy,
          },
          examples: t.exampleQuestions,
          tags: t.tags,
          metadata: {
            version: t.version,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          },
        })),
        pagination: {
          total,
          limit: params.limit,
          offset: params.offset,
          hasMore: params.offset + params.limit < total,
        },
      });

    } catch (error) {
      logger.error('Failed to list templates', { error });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'Failed to fetch templates',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /v1/nlq/templates/:id
   * Get detailed information about a specific template
   */
  app.get<{
    Params: { id: string };
  }>('/templates/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
        return reply.status(400).send({
          error: 'Invalid template ID format',
        });
      }

      logger.info('Fetching template details', { templateId: id });

      const templates = await db
        .select()
        .from(nlqTemplates)
        .where(eq(nlqTemplates.id, id))
        .limit(1);

      if (templates.length === 0) {
        return reply.status(404).send({
          error: 'Template not found',
          templateId: id,
        });
      }

      const template = templates[0];

      return reply.send({
        id: template.id,
        templateName: template.templateName,
        displayName: template.displayName,
        description: template.description,
        category: template.category,

        // SQL templates (full details)
        templates: {
          sql: template.sqlTemplate,
          chql: template.chqlTemplate,
        },

        // Allowed parameters
        allowedParameters: {
          timeRanges: template.allowedTimeRanges,
          groupBy: template.allowedGroupBy,
          filters: template.allowedFilters,
          maxTimeWindowDays: template.maxTimeWindowDays,
        },

        // Security constraints
        security: {
          requiresTenantFilter: template.requiresTenantFilter,
          allowedJoins: template.allowedJoins,
          deniedColumns: template.deniedColumns,
        },

        // Performance hints
        performance: {
          estimatedComplexity: template.estimatedComplexity,
          maxResultRows: template.maxResultRows,
          cacheTtlSeconds: template.cacheTtlSeconds,
        },

        // Examples and documentation
        examples: template.exampleQuestions,
        relatedTemplates: template.relatedTemplates,
        tags: template.tags,

        // Governance
        governance: {
          active: template.active,
          version: template.version,
          createdBy: template.createdBy,
          approvedBy: template.approvedBy,
          approvedAt: template.approvedAt,
        },

        // Timestamps
        metadata: {
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        },
      });

    } catch (error) {
      logger.error('Failed to fetch template', { error });

      return reply.status(500).send({
        error: 'Failed to fetch template',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /v1/nlq/templates/categories
   * Get list of template categories with counts
   */
  app.get('/templates/categories', async (request, reply) => {
    try {
      logger.info('Fetching template categories');

      const categories = await db
        .select({
          category: nlqTemplates.category,
          count: sql<number>`count(*)`,
        })
        .from(nlqTemplates)
        .where(eq(nlqTemplates.active, true))
        .groupBy(nlqTemplates.category);

      return reply.send({
        categories: categories.map(c => ({
          name: c.category,
          count: Number(c.count),
        })),
      });

    } catch (error) {
      logger.error('Failed to fetch categories', { error });

      return reply.status(500).send({
        error: 'Failed to fetch categories',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /v1/nlq/templates/examples
   * Get random example questions across all templates
   */
  app.get<{
    Querystring: { limit?: string; category?: string };
  }>('/templates/examples', async (request, reply) => {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit) : 10;
      const category = request.query.category;

      logger.info('Fetching example questions', { limit, category });

      const conditions = [eq(nlqTemplates.active, true)];

      if (category) {
        conditions.push(eq(nlqTemplates.category, category));
      }

      // Fetch templates with example questions
      const templates = await db
        .select({
          id: nlqTemplates.id,
          templateName: nlqTemplates.templateName,
          displayName: nlqTemplates.displayName,
          category: nlqTemplates.category,
          exampleQuestions: nlqTemplates.exampleQuestions,
        })
        .from(nlqTemplates)
        .where(and(...conditions))
        .limit(50); // Get up to 50 templates

      // Extract and flatten example questions
      const examples: Array<{
        question: string;
        templateId: string;
        templateName: string;
        displayName: string;
        category: string;
      }> = [];

      for (const template of templates) {
        if (template.exampleQuestions && Array.isArray(template.exampleQuestions)) {
          for (const question of template.exampleQuestions) {
            examples.push({
              question: typeof question === 'string' ? question : (question as any).question,
              templateId: template.id,
              templateName: template.templateName,
              displayName: template.displayName,
              category: template.category,
            });
          }
        }
      }

      // Shuffle and limit
      const shuffled = examples.sort(() => Math.random() - 0.5).slice(0, limit);

      return reply.send({
        examples: shuffled,
        total: examples.length,
      });

    } catch (error) {
      logger.error('Failed to fetch examples', { error });

      return reply.status(500).send({
        error: 'Failed to fetch examples',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
