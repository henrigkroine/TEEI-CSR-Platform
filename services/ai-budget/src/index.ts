import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { budgetRoutes } from './routes/index.js';
import { finopsBudgetRoutes } from './routes/finops-budgets.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV !== 'production' ?
        {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  },
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Register routes
await fastify.register(budgetRoutes, { prefix: '/api/ai-budget' });
await fastify.register(finopsBudgetRoutes, { prefix: '/api/ai-budget/finops' });

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3010');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    fastify.log.info(`AI Budget Service listening on ${host}:${port}`);
    fastify.log.info('Routes:');
    fastify.log.info('  AI Token Budgets:');
    fastify.log.info('    GET  /api/ai-budget/tenant/:id - Get budget status');
    fastify.log.info('    POST /api/ai-budget/check - Check budget pre-flight');
    fastify.log.info('    POST /api/ai-budget/track - Track usage');
    fastify.log.info('    POST /api/ai-budget/set - Set budget limit');
    fastify.log.info('    GET  /api/ai-budget/top-consumers - Get top consumers');
    fastify.log.info('');
    fastify.log.info('  FinOps Budgets:');
    fastify.log.info('    POST   /api/ai-budget/finops/budgets - Create budget');
    fastify.log.info('    GET    /api/ai-budget/finops/budgets/:id - Get budget');
    fastify.log.info('    GET    /api/ai-budget/finops/budgets/tenant/:tenantId - List budgets');
    fastify.log.info('    PATCH  /api/ai-budget/finops/budgets/:id - Update budget');
    fastify.log.info('    DELETE /api/ai-budget/finops/budgets/:id - Delete budget');
    fastify.log.info('    GET    /api/ai-budget/finops/budgets/:id/status - Get budget status');
    fastify.log.info('    GET    /api/ai-budget/finops/budgets/tenant/:tenantId/status - List budget statuses');
    fastify.log.info('    GET    /api/ai-budget/finops/budgets/:id/events - Get budget events');
    fastify.log.info('    POST   /api/ai-budget/finops/budgets/:id/check-enforcement - Check enforcement');
    fastify.log.info('');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
