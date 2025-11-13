import type { FastifyInstance } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('kintell-connector:webhooks');

export async function webhookRoutes(app: FastifyInstance) {
  // POST /webhooks/session - Session completion webhook (placeholder)
  app.post('/session', async (request, reply) => {
    logger.info({ body: request.body }, 'Session webhook received');

    // TODO: Implement actual webhook processing
    // - Validate webhook signature
    // - Parse Kintell session data
    // - Store in database
    // - Emit event

    return { status: 'received', message: 'Webhook processing not yet implemented' };
  });

  // POST /webhooks/rating - Rating webhook (placeholder)
  app.post('/rating', async (request, reply) => {
    logger.info({ body: request.body }, 'Rating webhook received');

    // TODO: Implement actual webhook processing

    return { status: 'received', message: 'Webhook processing not yet implemented' };
  });
}
