import Fastify from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { classifyRoutes } from './routes/classify.js';

const logger = createServiceLogger('q2q-ai');
const PORT = parseInt(process.env.PORT_Q2Q_AI || '3005');

async function start() {
  const app = Fastify({
    logger: logger as any,
  });

  // Health check
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'q2q-ai',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  });

  // Register routes
  app.register(classifyRoutes);

  // Import and register calibration routes
  const { calibrationRoutes } = await import('./routes/calibration.js');
  app.register(calibrationRoutes);

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
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
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
