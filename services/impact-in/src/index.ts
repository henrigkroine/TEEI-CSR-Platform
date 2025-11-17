/**
 * Impact-In Service
 * Delivers impact data to external CSR platforms (Benevity, Goodera, Workday)
 * Includes Data Importer & Mapping Studio (Worker 22)
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/Integrations Lead, Worker 22
 */

import Fastify from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import { createServiceLogger } from '@teei/shared-utils';
import { deliveryRoutes } from './routes/deliveries.js';
import { replayRoutes } from './routes/replay.js';
import { registerWebhookRoutes } from './routes/webhooks.js';
import { slaRoutes } from './routes/sla.js';
import { registerImportRoutes } from './routes/imports/index.js';
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

  // Register multipart plugin for file uploads
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 200 * 1024 * 1024, // 200MB max file size
      files: 1, // Max 1 file per request
    },
  });

  // Register routes with API versioning
  app.register(deliveryRoutes, { prefix: '/v1/impact-in' });
  app.register(replayRoutes, { prefix: '/v1/impact-in' });
  await registerWebhookRoutes(app);
  app.register(slaRoutes, { prefix: '/v1/impact-in' });
  await registerImportRoutes(app);

  // Root endpoint
  app.get('/', async (request, reply) => {
    return {
      service: 'impact-in',
      version: '1.0.0',
      description: 'Impact data delivery service for external CSR platforms + Data Importer',
      platforms: ['benevity', 'goodera', 'workday'],
      endpoints: {
        deliveries: '/v1/impact-in/deliveries',
        stats: '/v1/impact-in/stats',
        replay: '/v1/impact-in/deliveries/:id/replay',
        bulkReplay: '/v1/impact-in/deliveries/bulk-replay',
        retryAllFailed: '/v1/impact-in/deliveries/retry-all-failed',
        webhooks: {
          benevity: 'POST /webhooks/benevity',
          goodera: 'POST /webhooks/goodera',
          workday: 'POST /webhooks/workday',
          health: 'GET /webhooks/health',
        },
        imports: {
          createSession: 'POST /v1/impact-in/imports/sessions',
          uploadFile: 'POST /v1/impact-in/imports/sessions/:id/upload',
          saveMapping: 'POST /v1/impact-in/imports/sessions/:id/mapping',
          generatePreview: 'POST /v1/impact-in/imports/sessions/:id/preview',
          commitImport: 'POST /v1/impact-in/imports/sessions/:id/commit',
          getSession: 'GET /v1/impact-in/imports/sessions/:id',
          getErrors: 'GET /v1/impact-in/imports/sessions/:id/errors',
          listSessions: 'GET /v1/impact-in/imports/sessions',
          listTemplates: 'GET /v1/impact-in/imports/templates',
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
