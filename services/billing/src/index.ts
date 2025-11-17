/**
 * TEEI Billing Service
 * Main entry point
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { billingRoutes } from './routes/billing.js';
import { subscriptionRoutes } from './routes/subscriptions.js';
import { webhookRoutes } from './routes/webhooks.js';
import { l2iBundleRoutes } from './routes/l2i-bundles.js';
import { entitlementRoutes } from './routes/entitlements.js';

const fastify = Fastify({
  logger: true,
});

// Security middleware
await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
});

// CORS
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:4321',
  credentials: true,
});

// Register routes
await fastify.register(billingRoutes);
await fastify.register(subscriptionRoutes);
await fastify.register(webhookRoutes);
await fastify.register(l2iBundleRoutes);
await fastify.register(entitlementRoutes);

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3010', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    console.log(`✅ Billing service running on http://${host}:${port}`);
    console.log(`📊 Usage endpoint: http://${host}:${port}/api/billing/usage/:tenantId`);
    console.log(`💰 Budget endpoint: http://${host}:${port}/api/billing/budgets/:tenantId`);
    console.log(`📄 Invoice endpoint: http://${host}:${port}/api/billing/invoices/generate`);
    console.log(`🎯 L2I Bundles: http://${host}:${port}/api/billing/l2i/bundles/:companyId`);
    console.log(`🔐 Entitlements: http://${host}:${port}/api/entitlements/me?companyId=:id`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
