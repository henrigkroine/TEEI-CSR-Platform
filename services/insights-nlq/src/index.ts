/**
 * Insights NLQ Service
 * Natural Language Query with guardrails, evidence linking, and safety verification
 */

import Fastify from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { createHealthManager, setupHealthRoutes } from './health/index.js';
import { nlqRoutes } from './routes/nlq.js';

const logger = createServiceLogger('insights-nlq');
const PORT = parseInt(process.env.PORT_INSIGHTS_NLQ || '3015');

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

  // Check dependencies
  try {
    // Check ClickHouse
    if (process.env.CLICKHOUSE_URL) {
      healthManager.setDependency('clickhouse', true);
    }

    // Check Redis
    if (process.env.REDIS_URL) {
      healthManager.setDependency('redis', true);
    }

    // Check Anthropic API key
    if (process.env.ANTHROPIC_API_KEY) {
      healthManager.setDependency('anthropic', true);
    } else {
      logger.warn('ANTHROPIC_API_KEY not configured - NLQ planning will fail');
    }
  } catch (err) {
    logger.error('Failed to check dependencies:', err);
  }

  // Register API routes
  app.register(async (instance) => {
    await instance.register(nlqRoutes);
  });

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    healthManager.setReady(true);

    logger.info(`Insights NLQ Service running on port ${PORT}`);
    logger.info('Available endpoints:');
    logger.info('  Health:');
    logger.info('    GET  /health - Health check');
    logger.info('    GET  /health/live - Liveness probe');
    logger.info('    GET  /health/ready - Readiness probe');
    logger.info('    GET  /health/dependencies - Dependencies health');
    logger.info('');
    logger.info('  NLQ APIs:');
    logger.info('    POST /v1/insights/nlq/query - Execute natural language query');
    logger.info('    POST /v1/insights/nlq/plan - Get query plan (debug)');
    logger.info('    GET  /v1/insights/nlq/metrics - List available metrics');
    logger.info('');
    logger.info('Environment:');
    logger.info(`  ClickHouse: ${process.env.CLICKHOUSE_URL || 'NOT configured'}`);
    logger.info(`  Redis: ${process.env.REDIS_URL || 'NOT configured'}`);
    logger.info(`  Anthropic: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'NOT configured'}`);
    logger.info('');
    logger.info('Performance Targets:');
    logger.info('  - Plan time: ≤350ms avg');
    logger.info('  - End-to-end: ≤2.5s p95');
    logger.info('  - Citation: ≥1 per answer');
    logger.info('  - Safety: 100% verification pass rate');
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    healthManager.setShuttingDown(true);

    await app.close();

    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
