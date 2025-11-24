/**
 * Campaign Service Entry Point
 *
 * Starts the Fastify server for campaign management APIs.
 *
 * SWARM 6: Agent 3.6 - Campaign Service API
 */

import { buildApp } from './app.js';
import { createServiceLogger } from '@teei/shared-utils';
import { config } from './config.js';
import { testConnection, closePool } from './db/connection.js';

const logger = createServiceLogger('campaigns');
const PORT = config.service.port;

/**
 * Start the campaign service
 */
async function start() {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('Database connection failed. Exiting...');
      process.exit(1);
    }
    logger.info('Database connection successful');

    // Build and start Fastify app
    const fastify = await buildApp();

    const host = '0.0.0.0';

    await fastify.listen({ port: PORT, host });

    console.log('\n🚀 Campaign Service Started\n');
    console.log(`✅ Server running on http://${host}:${PORT}`);
    console.log(`🏥 Health check: http://${host}:${PORT}/health`);
    console.log('\n📋 Campaign Endpoints:');
    console.log(`   POST   /api/campaigns - Create campaign`);
    console.log(`   GET    /api/campaigns/:id - Get campaign details`);
    console.log(`   PATCH  /api/campaigns/:id - Update campaign`);
    console.log(`   DELETE /api/campaigns/:id - Soft delete campaign`);
    console.log(`   GET    /api/campaigns - List campaigns`);
    console.log(`   GET    /api/campaigns/:id/metrics - Get metrics`);
    console.log(`   GET    /api/campaigns/:id/instances - List instances`);
    console.log(`   POST   /api/campaigns/:id/transition - State transition`);
    console.log('\n👥 Beneficiary Group Endpoints:');
    console.log(`   GET    /api/beneficiary-groups - List groups`);
    console.log(`   GET    /api/beneficiary-groups/:id - Get group details`);
    console.log(`   GET    /api/beneficiary-groups/:id/compatible-templates`);
    console.log('\n📚 Program Template Endpoints:');
    console.log(`   GET    /api/program-templates - List templates`);
    console.log(`   GET    /api/program-templates/:id - Get template details`);
    console.log(`   GET    /api/program-templates/:id/compatible-groups`);
    console.log(`   GET    /api/program-templates/types - Program types summary`);
    console.log('\n💰 Pricing Insights Endpoints (Agent 5.3):');
    console.log(`   GET    /api/campaigns/:id/pricing - Campaign pricing analytics`);
    console.log(`   GET    /api/companies/:id/pricing-signals - All signals (CRM export)`);
    console.log(`   GET    /api/companies/:id/pricing-report - Comprehensive report`);
    console.log(`   GET    /api/campaigns/:id/pricing/export - Export campaign pricing`);
    console.log(`   GET    /api/companies/:id/pricing-signals/export - Export all signals`);
    console.log(`   GET    /api/companies/:id/pricing-report/export - Export report`);
    console.log('\n');

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down...');
      await fastify.close();
      await closePool();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (err) {
    console.error('❌ Failed to start campaign service:', err);
    logger.error(err);
    process.exit(1);
  }
}

start();
