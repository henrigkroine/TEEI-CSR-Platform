import Fastify from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { genReportsRoutes } from './routes/gen-reports.js';
import { exportRoutes } from './routes/export.js';
import { trustRoutes } from './routes/trust.js';
import { regulatoryRoutes } from './routes/regulatory.js';
import { campaignDashboardRoutes } from './routes/campaign-dashboard.js';
import { companyRoutes } from './routes/companies.js';
import { savedViewsRoutes } from './routes/savedViews.js';
import { sseRoutes } from './routes/sse.js';
import { complianceRoutes } from './routes/compliance.js';
import { createHealthManager, setupHealthRoutes } from './health/index.js';
import { costTrackingMiddleware } from './middleware/cost-tracking.js';
import { etagHook, initializeETagCache } from './middleware/etag.js';
import { storeCacheHook } from './middleware/cache.js';

const logger = createServiceLogger('reporting');
const PORT = parseInt(process.env.PORT_REPORTING || '4017');

async function start() {
  const app = Fastify({
    logger: logger as any,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // Setup health check manager
  const healthManager = createHealthManager();
  setupHealthRoutes(app, healthManager);
  healthManager.setAlive(true);

  // Initialize ETag cache (Redis or in-memory fallback)
  await initializeETagCache(process.env.REDIS_URL);

  // Register middleware
  app.addHook('onRequest', costTrackingMiddleware);

  // Enable ETag middleware globally for GET requests
  app.addHook('onSend', etagHook);

  // Store responses in cache after handler execution
  app.addHook('onSend', storeCacheHook);

  // Register routes with API versioning
  app.register(genReportsRoutes, { prefix: '/v1' });
  // Register company-specific gen-reports endpoint without prefix
  app.register(async (app) => {
    app.get<{
      Params: { id: string };
      Querystring: {
        sortBy?: 'date' | 'type';
        sortOrder?: 'asc' | 'desc';
        type?: string;
        status?: string;
      };
    }>('/companies/:id/gen-reports', async (request, reply) => {
      try {
        const { id: companyId } = request.params;
        const { sortBy = 'date', sortOrder = 'desc', type, status } = request.query;

        // Import pool here to avoid circular dependencies
        const { pool } = await import('./db/connection.js');

        // Query report_lineage table
        let query = `
          SELECT
            rl.id as report_id,
            rl.period_start,
            rl.period_end,
            rl.model_name,
            rl.tokens_total,
            rl.estimated_cost_usd,
            rl.created_at,
            rl.sections,
            rl.locale
          FROM report_lineage rl
          WHERE rl.company_id = $1
        `;

        const params: any[] = [companyId];

        // Add filters
        if (type) {
          // Map frontend report types to section types
          const sectionTypeMap: Record<string, string> = {
            quarterly: 'quarterly-report',
            annual: 'annual-report',
            board_presentation: 'investor-update',
            csrd: 'impact-deep-dive',
          };
          const sectionType = sectionTypeMap[type] || type;
          query += ` AND rl.sections::text LIKE $${params.length + 1}`;
          params.push(`%${sectionType}%`);
        }

        // Add sorting
        if (sortBy === 'date') {
          query += ` ORDER BY rl.created_at ${sortOrder.toUpperCase()}`;
        } else {
          query += ` ORDER BY rl.sections ${sortOrder.toUpperCase()}`;
        }

        const result = await pool.query(query, params);

        // Transform to frontend format
        const reports = result.rows.map((row) => {
          // Extract report type from sections
          const sections = Array.isArray(row.sections) ? row.sections : JSON.parse(row.sections || '[]');
          const reportType = sections[0]?.replace('-report', '') || 'quarterly';

          // Map to frontend ReportType
          const typeMap: Record<string, 'quarterly' | 'annual' | 'board_presentation' | 'csrd'> = {
            'quarterly': 'quarterly',
            'annual': 'annual',
            'investor-update': 'board_presentation',
            'impact-deep-dive': 'csrd',
          };
          const mappedType = typeMap[reportType] || 'quarterly';

          return {
            reportId: row.report_id,
            reportType: mappedType,
            status: 'final' as const, // Generated reports are always final
            period: {
              from: new Date(row.period_start).toISOString(),
              to: new Date(row.period_end).toISOString(),
            },
            generatedAt: new Date(row.created_at).toISOString(),
            tokensUsed: row.tokens_total || 0,
          };
        });

        // Apply status filter if provided
        const filteredReports = status
          ? reports.filter((r) => r.status === status)
          : reports;

        reply.code(200).send({
          reports: filteredReports,
        });
      } catch (error: any) {
        logger.error(`Failed to list generated reports: ${error.message}`, { error });
        reply.code(500).send({
          error: 'Failed to list generated reports',
          message: error.message,
        });
      }
    });
  });
  app.register(exportRoutes, { prefix: '/v1' });
  app.register(trustRoutes);
  app.register(regulatoryRoutes, { prefix: '/v1' });
  app.register(campaignDashboardRoutes, { prefix: '/api' });
  app.register(companyRoutes);
  app.register(savedViewsRoutes);
  app.register(sseRoutes, { prefix: '/api' });
  app.register(complianceRoutes);

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    healthManager.setReady(true);
    logger.info(`Reporting Service running on port ${PORT}`);
    logger.info('Available endpoints:');
    logger.info(`  GET  /health - Health check`);
    logger.info(`  GET  /health/live - Liveness probe`);
    logger.info(`  GET  /health/ready - Readiness probe`);
    logger.info(`  GET  /health/dependencies - Dependencies health`);
    logger.info(`  POST /v1/gen-reports/generate - Generate AI report with citations`);
    logger.info(`  GET  /v1/gen-reports/cost-summary - Cost summary`);
    logger.info(`  GET  /companies/:id/gen-reports - List generated reports for company`);
    logger.info(`  GET  /v1/export/csrd - Export CSRD data (CSV/JSON)`);
    logger.info(`  POST /v1/export/pdf - Export report to PDF`);
    logger.info(`  GET  /v1/export/pdf/:reportId/preview - Preview PDF metadata`);
    logger.info(`  GET  /trust/v1/evidence/:reportId - Get evidence lineage`);
    logger.info(`  GET  /trust/v1/ledger/:reportId - Get integrity ledger`);
    logger.info(`  GET  /trust/v1/policies - Get retention/residency policies`);
    logger.info(`  GET  /api/campaigns/:id/dashboard - Get campaign dashboard (all metrics)`);
    logger.info(`  GET  /api/campaigns/:id/time-series - Get campaign time-series data`);
    logger.info(`  GET  /api/campaigns/:id/capacity - Get campaign capacity metrics`);
    logger.info(`  GET  /api/campaigns/:id/financials - Get campaign financial metrics`);
    logger.info(`  GET  /api/campaigns/:id/volunteers - Get campaign volunteer leaderboard`);
    logger.info(`  GET  /api/campaigns/:id/impact - Get campaign impact summary`);
    logger.info(`  GET  /api/sse/dashboard - SSE connection for dashboard updates`);
    logger.info(`  GET  /api/sse/stream - SSE connection for real-time updates`);
    logger.info(`  GET  /compliance/alerts - Get compliance alerts`);
    logger.info('');
    logger.info('Environment:');
    logger.info(`  LLM Provider: ${process.env.LLM_PROVIDER || 'openai'}`);
    logger.info(`  LLM Model: ${process.env.LLM_MODEL || 'gpt-4-turbo'}`);
    logger.info(`  Database: ${process.env.DATABASE_URL ? 'configured' : 'NOT configured'}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    healthManager.setShuttingDown(true);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
