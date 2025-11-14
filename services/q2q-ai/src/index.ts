import Fastify from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { classifyRoutes } from './routes/classify.js';
import { initializeModelRegistry } from './registry/persist.js';
import { createHealthManager, setupHealthRoutes } from './health/index.js';

const logger = createServiceLogger('q2q-ai');
const PORT = parseInt(process.env.PORT_Q2Q_AI || '3005');

async function start() {
  // Initialize model registry on startup
  try {
    await initializeModelRegistry();
  } catch (err) {
    logger.error('Failed to initialize model registry:', err);
    // Continue startup even if registry init fails
  }

  const app = Fastify({
    logger: logger as any,
  });

  // Setup health check manager
  const healthManager = createHealthManager();
  setupHealthRoutes(app, healthManager);
  healthManager.setAlive(true);

  // Register routes with API versioning
  app.register(classifyRoutes, { prefix: '/v1' });

  // Import and register calibration routes
  const { calibrationRoutes } = await import('./routes/calibration.js');
  app.register(calibrationRoutes);

  // Import and register model registry routes
  const { registryRoutes } = await import('./routes/registry.js');
  app.register(registryRoutes);

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    healthManager.setReady(true);
    logger.info(`Q2Q AI Service running on port ${PORT}`);
    logger.info('Available endpoints:');
    logger.info(`  GET  /health - Health check`);
    logger.info(`  POST /classify/text - Classify text and store outcome scores`);
    logger.info(`  GET  /taxonomy - Get outcome dimension definitions`);
    logger.info(`  POST /q2q/eval/upload - Upload calibration dataset`);
    logger.info(`  GET  /q2q/eval/datasets - List calibration datasets`);
    logger.info(`  POST /q2q/eval/run - Run evaluation on dataset`);
    logger.info(`  GET  /q2q/eval/results - List all evaluation runs`);
    logger.info(`  GET  /q2q/eval/results/:id - Get evaluation results`);
    logger.info(`  GET  /q2q/eval/results/:id/report - Get human-readable report`);
    logger.info(`  GET  /q2q/registry/models - List all models`);
    logger.info(`  GET  /q2q/registry/models/:id - Get model by ID`);
    logger.info(`  POST /q2q/registry/models/:id/activate - Activate model`);
    logger.info(`  GET  /q2q/registry/models/active/:provider - Get active model`);
    logger.info(`  POST /q2q/registry/sync - Sync models from YAML`);
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
