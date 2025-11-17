import Fastify from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { genReportsRoutes } from './routes/gen-reports.js';
import { exportRoutes } from './routes/export.js';
import { regulatoryRoutes } from './routes/regulatory.js';
import { createHealthManager, setupHealthRoutes } from './health/index.js';
import { costTrackingMiddleware } from './middleware/cost-tracking.js';

const logger = createServiceLogger('reporting');
const PORT = parseInt(process.env.PORT_REPORTING || '3007');

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

  // Register middleware
  app.addHook('onRequest', costTrackingMiddleware);

  // Register routes with API versioning
  app.register(genReportsRoutes, { prefix: '/v1' });
  app.register(exportRoutes, { prefix: '/v1' });
  app.register(regulatoryRoutes, { prefix: '/v1' });

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
    logger.info(`  GET  /v1/export/csrd - Export CSRD data (CSV/JSON)`);
    logger.info(`  POST /v1/export/pdf - Export report to PDF`);
    logger.info(`  GET  /v1/export/pdf/:reportId/preview - Preview PDF metadata`);
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
