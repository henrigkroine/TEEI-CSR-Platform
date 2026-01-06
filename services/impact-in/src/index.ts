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
import { registerIngestRoutes } from './routes/ingest.js';
import { registerIntegrationsHealthRoutes } from './routes/integrations-health.js';
import { slaRoutes } from './routes/sla.js';
import { registerImportRoutes } from './routes/imports/index.js';
import { createHealthManager, setupHealthRoutes } from './health/index.js';
import { startScheduler } from '../scheduler/index.js';
import { startSLAMonitoring } from '../sla-monitor/index.js';

const logger = createServiceLogger('impact-in');
const PORT = parseInt(process.env.PORT_IMPACT_IN || '3025');

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
  app.register(registerIngestRoutes, { prefix: '/v1/impact-in' });
  app.register(registerIntegrationsHealthRoutes, { prefix: '/v1/impact-in' });
  await registerWebhookRoutes(app);
  app.register(slaRoutes, { prefix: '/v1/impact-in' });
  await registerImportRoutes(app);

  // Register new ingest routes (Worker 4)
  app.register(registerIngestRoutes, { prefix: '/v1/ingest' });
  app.register(registerIntegrationsHealthRoutes, { prefix: '/integrations' });

  // Root endpoint
  app.get('/', async (request, reply) => {
    return {
      service: 'impact-in',
      version: '1.0.0',
      description: 'Impact data delivery service for external CSR platforms + Data Importer',
      platforms: ['benevity', 'goodera', 'workday'],
      endpoints: {
        // Outbound delivery (existing)
        deliveries: '/v1/impact-in/deliveries',
        stats: '/v1/impact-in/stats',
        replay: '/v1/impact-in/deliveries/:id/replay',
        bulkReplay: '/v1/impact-in/deliveries/bulk-replay',
        retryAllFailed: '/v1/impact-in/deliveries/retry-all-failed',

        // Inbound ingestion (Worker 4)
        ingest: {
          benevityVolunteers: 'POST /v1/ingest/benevity/volunteers',
          benevityDonations: 'POST /v1/ingest/benevity/donations',
          gooderaVolunteers: 'POST /v1/ingest/goodera/volunteers',
          gooderaDonations: 'POST /v1/ingest/goodera/donations',
          workdayDirectory: 'POST /v1/ingest/workday/directory',
          kintellEnrollments: 'POST /v1/ingest/kintell/enrollments',
          upskillingEnrollments: 'POST /v1/ingest/upskilling/enrollments',
          buddyData: 'POST /v1/ingest/buddy/data',
          mentorshipPlacements: 'POST /v1/ingest/mentorship/placements',
          all: 'POST /v1/ingest/all',
        },

        // Webhooks
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

        // Health endpoints
        health: '/health',
        integrationsHealth: 'GET /integrations/health',
        connectorHealth: 'GET /integrations/health/:connector',
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
