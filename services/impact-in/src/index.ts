/**
 * Impact-In Service
 * Delivers impact data to external CSR platforms (Benevity, Goodera, Workday)
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/Integrations Lead
 */

import Fastify from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { deliveryRoutes } from './routes/deliveries.js';
import { replayRoutes } from './routes/replay.js';
import { registerWebhookRoutes } from './routes/webhooks.js';
import { registerIngestRoutes } from './routes/ingest.js';
import { registerIntegrationsHealthRoutes } from './routes/integrations-health.js';
import { slaRoutes } from './routes/sla.js';
import { createHealthManager, setupHealthRoutes } from './health/index.js';
import { startScheduler } from '../scheduler/index.js';
import { startSLAMonitoring } from '../sla-monitor/index.js';

const logger = createServiceLogger('impact-in');
const PORT = parseInt(process.env.PORT_IMPACT_IN || '3007');

async function start() {
  const app = Fastify({
    logger: logger as any,
    // Enable raw body for webhook signature verification
    disableRequestLogging: false,
  });

  // Setup health check manager
  const healthManager = createHealthManager();
  setupHealthRoutes(app, healthManager);
  healthManager.setAlive(true);

  // Register routes with API versioning
  app.register(deliveryRoutes, { prefix: '/v1/impact-in' });
  app.register(replayRoutes, { prefix: '/v1/impact-in' });
  app.register(registerIngestRoutes, { prefix: '/v1/impact-in' });
  app.register(registerIntegrationsHealthRoutes, { prefix: '/v1/impact-in' });
  await registerWebhookRoutes(app);
  app.register(slaRoutes, { prefix: '/v1/impact-in' });

  // Root endpoint
  app.get('/', async (request, reply) => {
    return {
      service: 'impact-in',
      version: '2.0.0',
      description: 'Impact data ingestion and delivery service for external CSR platforms and internal TEEI services',
      platforms: ['benevity', 'goodera', 'workday', 'kintell', 'upskilling', 'buddy'],
      endpoints: {
        deliveries: '/v1/impact-in/deliveries',
        stats: '/v1/impact-in/stats',
        replay: '/v1/impact-in/deliveries/:id/replay',
        bulkReplay: '/v1/impact-in/deliveries/bulk-replay',
        retryAllFailed: '/v1/impact-in/deliveries/retry-all-failed',
        ingest: 'POST /v1/impact-in/ingest',
        ingestStatus: 'GET /v1/impact-in/ingest/status',
        ingestSchedule: 'POST /v1/impact-in/ingest/schedule',
        integrationsHealth: 'GET /v1/impact-in/integrations/health',
        integrationsMetrics: 'GET /v1/impact-in/integrations/metrics',
        webhooks: {
          benevity: 'POST /webhooks/benevity',
          goodera: 'POST /webhooks/goodera',
          workday: 'POST /webhooks/workday',
          health: 'GET /webhooks/health',
        },
        slaStatus: '/v1/impact-in/sla-status',
        slaReport: '/v1/impact-in/sla-report',
        deliveryTimeline: '/v1/impact-in/delivery-timeline',
        health: '/health',
      },
    };
  });

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    healthManager.setReady(true);
    logger.info(`Impact-In Service running on port ${PORT}`);
    logger.info('Supported providers: Benevity, Goodera, Workday');

    // Start scheduler daemon (if enabled)
    if (process.env.ENABLE_SCHEDULER !== 'false') {
      startScheduler({
        checkInterval: parseInt(process.env.SCHEDULER_CHECK_INTERVAL || '1'),
        maxRetries: parseInt(process.env.SCHEDULER_MAX_RETRIES || '3'),
      });
    }

    // Start SLA monitoring daemon (if enabled)
    if (process.env.ENABLE_SLA_MONITORING !== 'false') {
      startSLAMonitoring();
    }
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
