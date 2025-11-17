import Fastify from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { loadConfig } from './config.js';
import { initDatabase, closeDatabase } from './db/index.js';
import { createHealthManager, setupHealthRoutes } from './health/index.js';
import { ResidencyCache } from './utils/cache.js';
import { residencyRoutes } from './routes/residency.js';
import { allowedRegionsRoutes } from './routes/allowed-regions.js';
import { createValidateResidencyMiddleware } from './middleware/validateResidency.js';

const logger = createServiceLogger('data-residency');
const config = loadConfig();

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

  // Initialize database
  try {
    initDatabase(config.databaseUrl);
    healthManager.setDependencyHealth('database', true);
    logger.info('Database connected');
  } catch (err) {
    logger.error('Failed to connect to database:', err);
    healthManager.setDependencyHealth('database', false);
    throw err;
  }

  // Initialize cache
  const cache = new ResidencyCache(config.redisUrl, config.cacheEnabled, config.cacheTTL);
  try {
    await cache.connect();
    const cacheHealthy = await cache.isHealthy();
    healthManager.setDependencyHealth('cache', cacheHealthy);
    if (cacheHealthy) {
      logger.info('Cache connected');
    } else {
      logger.warn('Cache connection failed - running without cache');
    }
  } catch (err) {
    logger.warn('Cache initialization failed - running without cache:', err);
    healthManager.setDependencyHealth('cache', false);
  }

  // Register middleware (optional - services can call the API directly)
  // app.addHook('onRequest', createValidateResidencyMiddleware({ cache, config }));

  // Register routes
  app.register(residencyRoutes, { cache, config });
  allowedRegionsRoutes(app);

  // Start server
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    healthManager.setReady(true);
    logger.info(`Data Residency Service running on port ${config.port}`);
    logger.info('Configuration:');
    logger.info(`  Current Region: ${config.currentRegion}`);
    logger.info(`  Default Region: ${config.defaultRegion}`);
    logger.info(`  Enforcement Mode: ${config.enforcement}`);
    logger.info(`  Cache Enabled: ${config.cacheEnabled}`);
    logger.info(`  Cache TTL: ${config.cacheTTL}s`);
    logger.info('');
    logger.info('Available endpoints:');
    logger.info(`  GET  /health - Health check`);
    logger.info(`  GET  /health/live - Liveness probe`);
    logger.info(`  GET  /health/ready - Readiness probe`);
    logger.info(`  GET  /health/dependencies - Dependencies health`);
    logger.info(`  GET  /health/residency - Residency-specific health`);
    logger.info(`  GET  /api/residency/company/:id - Get company region`);
    logger.info(`  PUT  /api/residency/company/:id - Update company region`);
    logger.info(`  POST /api/residency/validate - Validate residency`);
    logger.info(`  POST /api/residency/validate/bulk - Bulk validate residency`);
    logger.info(`  GET  /api/residency/regions - List available regions`);
    logger.info(`  GET  /api/residency/regions/:region - Get region metadata`);
    logger.info(`  GET  /api/residency/company/:companyId/allowed-regions - Get allowed regions`);
    logger.info(`  PUT  /api/residency/company/:companyId/allowed-regions - Update allowed regions`);
    logger.info(`  POST /api/residency/validate-region-access - Validate region access`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    healthManager.setShuttingDown(true);
    await cache.disconnect();
    await closeDatabase();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
