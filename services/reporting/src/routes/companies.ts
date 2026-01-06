import type { FastifyPluginAsync } from 'fastify';
import { getAtAGlance } from '../controllers/atAGlance.js';
import { getOutcomes } from '../controllers/outcomes.js';
import { getQ2QFeed } from '../controllers/q2qFeed.js';
import { getSROI } from '../controllers/sroiController.js';
import { getVIS } from '../controllers/visController.js';
import { exportCSRD } from '../controllers/export.js';
import { CACHE_CONTROL } from '../middleware/etag.js';
import { createCacheMiddleware, storeCacheHook } from '../middleware/cache.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/connection.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('reporting:companies');

export const companyRoutes: FastifyPluginAsync = async (fastify) => {
  // At-a-glance metrics
  fastify.get('/companies/:id/at-a-glance', {
    preHandler: [
      createCacheMiddleware({ namespace: 'at-a-glance', ttl: 60000 }), // 1 minute
      async (request: FastifyRequest, reply: FastifyReply) => {
        // Apply short cache (5 minutes) for frequently updated metrics
        reply.header('Cache-Control', CACHE_CONTROL.SHORT);
      },
    ],
    schema: {
      description: 'Get at-a-glance metrics for a company',
      tags: ['companies'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', pattern: '^\\d{4}-Q[1-4]$' },
        },
      },
    },
    handler: getAtAGlance,
  });

  // Outcome dimensions
  fastify.get('/companies/:id/outcomes', {
    preHandler: [
      createCacheMiddleware({ namespace: 'outcomes', ttl: 60000 }), // 1 minute
      async (request: FastifyRequest, reply: FastifyReply) => {
        // Apply short cache (5 minutes) for frequently updated outcomes
        reply.header('Cache-Control', CACHE_CONTROL.SHORT);
      },
    ],
    schema: {
      description: 'Get outcome time series for a company',
      tags: ['companies'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          dimensions: {
            type: 'string',
            description: 'Comma-separated: integration,language,job_readiness',
          },
        },
      },
    },
    handler: getOutcomes,
  });

  // Q2Q feed
  fastify.get('/companies/:id/q2q-feed', {
    schema: {
      description: 'Get Q2Q insights feed for a company',
      tags: ['companies'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        },
      },
    },
    handler: getQ2QFeed,
  });

  // SROI
  fastify.get('/companies/:id/sroi', {
    preHandler: [
      createCacheMiddleware({ namespace: 'sroi', ttl: 60000 }), // 1 minute
      async (request: FastifyRequest, reply: FastifyReply) => {
        // Apply medium cache (1 hour) for expensive SROI calculations
        reply.header('Cache-Control', CACHE_CONTROL.MEDIUM);
      },
    ],
    schema: {
      description: 'Calculate SROI for a company',
      tags: ['companies'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', pattern: '^\\d{4}-Q[1-4]$' },
        },
      },
    },
    handler: getSROI,
  });

  // VIS
  fastify.get('/companies/:id/vis', {
    preHandler: [
      createCacheMiddleware({ namespace: 'vis', ttl: 60000 }), // 1 minute
      async (request: FastifyRequest, reply: FastifyReply) => {
        // Apply medium cache (1 hour) for expensive VIS calculations
        reply.header('Cache-Control', CACHE_CONTROL.MEDIUM);
      },
    ],
    schema: {
      description: 'Calculate VIS for a company',
      tags: ['companies'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', pattern: '^\\d{4}-Q[1-4]$' },
          top: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
      },
    },
    handler: getVIS,
  });

  // Export
  fastify.get('/export/csrd', {
    schema: {
      description: 'Export CSRD data in CSV or JSON format',
      tags: ['export'],
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['csv', 'json'], default: 'json' },
          period: { type: 'string', pattern: '^\\d{4}-Q[1-4]$' },
        },
      },
    },
    handler: exportCSRD,
  });

  // List generated reports for a company
  fastify.get<{
    Params: { id: string };
    Querystring: {
      type?: string;
      status?: string;
      sortBy?: 'date' | 'type';
      sortOrder?: 'asc' | 'desc';
    };
  }>('/companies/:id/gen-reports', {
    schema: {
      description: 'List generated reports for a company',
      tags: ['companies', 'gen-reports'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          status: { type: 'string' },
          sortBy: { type: 'string', enum: ['date', 'type'] },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { id: companyId } = request.params;
        const { type, status, sortBy = 'date', sortOrder = 'desc' } = request.query;

        // Build query
        let query = `
          SELECT
            rl.report_id as "reportId",
            rl.period_start as "periodStart",
            rl.period_end as "periodEnd",
            rl.created_at as "generatedAt",
            rl.tokens_total as "tokensUsed",
            rl.sections,
            rl.locale
          FROM report_lineage rl
          WHERE rl.company_id = $1
        `;

        const params: any[] = [companyId];
        let paramIndex = 2;

        // Filter by type (extract from sections JSONB array)
        if (type && type !== 'all') {
          // Map frontend report types to backend section types
          const typeMap: Record<string, string> = {
            quarterly: 'quarterly-report',
            annual: 'annual-report',
            board_presentation: 'board-presentation',
            csrd: 'csrd-report',
          };
          const sectionType = typeMap[type] || type;
          query += ` AND rl.sections::text LIKE $${paramIndex}`;
          params.push(`%${sectionType}%`);
          paramIndex++;
        }

        // Sort
        if (sortBy === 'date') {
          query += ` ORDER BY rl.created_at ${sortOrder.toUpperCase()}`;
        } else if (sortBy === 'type') {
          query += ` ORDER BY rl.sections::text ${sortOrder.toUpperCase()}`;
        }

        const result = await pool.query(query, params);

        // Map database results to frontend format
        const reports = result.rows.map((row) => {
          // Extract report type from sections array
          const sections = Array.isArray(row.sections) ? row.sections : JSON.parse(row.sections || '[]');
          let reportType: string = 'quarterly'; // default
          if (sections.length > 0) {
            const firstSection = sections[0];
            if (firstSection.includes('quarterly')) reportType = 'quarterly';
            else if (firstSection.includes('annual')) reportType = 'annual';
            else if (firstSection.includes('board')) reportType = 'board_presentation';
            else if (firstSection.includes('csrd')) reportType = 'csrd';
          }

          return {
            reportId: row.reportId,
            reportType: reportType as any,
            status: 'draft' as const, // Default to draft since status is not stored
            period: {
              from: row.periodStart.toISOString(),
              to: row.periodEnd.toISOString(),
            },
            generatedAt: row.generatedAt.toISOString(),
            tokensUsed: parseInt(row.tokensUsed, 10) || 0,
          };
        });

        // Apply status filter in memory (since it's not in DB)
        const filteredReports = status && status !== 'all'
          ? reports.filter(r => r.status === status)
          : reports;

        reply.code(200).send({ reports: filteredReports });
      } catch (error: any) {
        logger.error(`Failed to list gen-reports: ${error.message}`, { error });
        reply.code(500).send({
          error: 'Failed to list reports',
          message: error.message,
        });
      }
    },
  });

  // Delete a generated report
  fastify.delete<{
    Params: { id: string; reportId: string };
  }>('/companies/:id/gen-reports/:reportId', {
    schema: {
      description: 'Delete a generated report',
      tags: ['companies', 'gen-reports'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          reportId: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { id: companyId, reportId } = request.params;

        // Verify the report belongs to the company
        const checkResult = await pool.query(
          'SELECT id FROM report_lineage WHERE report_id = $1 AND company_id = $2',
          [reportId, companyId]
        );

        if (checkResult.rows.length === 0) {
          return reply.code(404).send({
            error: 'Report not found',
            message: 'Report does not exist or does not belong to this company',
          });
        }

        // Delete report (cascade will delete sections and citations)
        await pool.query(
          'DELETE FROM report_lineage WHERE report_id = $1 AND company_id = $2',
          [reportId, companyId]
        );

        reply.code(200).send({ success: true });
      } catch (error: any) {
        logger.error(`Failed to delete gen-report: ${error.message}`, { error });
        reply.code(500).send({
          error: 'Failed to delete report',
          message: error.message,
        });
      }
    },
  });
};
