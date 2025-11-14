import Fastify from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { EventBus } from '@teei/events';
import { notificationRoutes } from './routes/send.js';
import { createHealthManager, setupHealthRoutes } from './health/index.js';
import { initializeEmailWorker, shutdownEmailWorker } from './workers/email-worker.js';
import { initializeScheduler, stopAllCronJobs } from './lib/scheduler.js';
import { initializeEventListeners } from './events/listeners.js';

const logger = createServiceLogger('notifications');
const PORT = parseInt(process.env.PORT_NOTIFICATIONS || '3008');

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

  // Initialize email worker and queue
  initializeEmailWorker();
  logger.info('Email worker initialized');

  // Initialize notification scheduler
  initializeScheduler();
  logger.info('Notification scheduler initialized');

  // Initialize event bus and listeners
  const eventBus = new EventBus({
    natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
    serviceName: 'notifications',
  });

  await eventBus.connect();
  logger.info('Event bus connected');

  initializeEventListeners(eventBus);
  logger.info('Event listeners registered');

  // Register API routes with versioning
  app.register(notificationRoutes, { prefix: '/v1' });

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    healthManager.setReady(true);
    logger.info(`Notifications Service running on port ${PORT}`);
    logger.info('Available endpoints:');
    logger.info(`  GET  /health - Health check`);
    logger.info(`  GET  /health/live - Liveness probe`);
    logger.info(`  GET  /health/ready - Readiness probe`);
    logger.info(`  GET  /health/dependencies - Dependencies health`);
    logger.info(`  GET  /health/queue - Queue status`);
    logger.info(`  POST /v1/notifications/send - Send notification immediately`);
    logger.info(`  POST /v1/notifications/schedule - Schedule notification`);
    logger.info(`  DELETE /v1/notifications/:id/cancel - Cancel scheduled notification`);
    logger.info(`  GET  /v1/notifications/history - Query notification history`);
    logger.info(`  GET  /v1/notifications/:id - Get notification details`);
    logger.info(`  GET  /v1/notifications/quota - Check quota status`);
    logger.info(`  POST /v1/notifications/webhooks/sendgrid - SendGrid webhook`);
    logger.info(`  POST /v1/notifications/webhooks/twilio - Twilio webhook`);
    logger.info('');
    logger.info('Environment:');
    logger.info(`  SendGrid: ${process.env.SENDGRID_API_KEY ? 'configured' : 'NOT configured'}`);
    logger.info(`  Redis: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
    logger.info(`  NATS: ${process.env.NATS_URL || 'nats://localhost:4222'}`);
    logger.info(`  Database: ${process.env.DATABASE_URL ? 'configured' : 'NOT configured'}`);
    logger.info('');
    logger.info('Providers:');
    logger.info(`  Email: SendGrid (active)`);
    logger.info(`  SMS: Twilio (stub - not implemented)`);
    logger.info(`  Push: FCM (stub - not implemented)`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    healthManager.setShuttingDown(true);

    // Stop accepting new requests
    await app.close();

    // Stop scheduler
    stopAllCronJobs();

    // Shutdown worker
    await shutdownEmailWorker();

    // Disconnect event bus
    await eventBus.disconnect();

    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
