/**
 * Streaming API Routes
 * SSE endpoints for real-time updates
 */

import type { FastifyInstance } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { sseStreamHandler } from '../stream/sse.js';
import { connectionRegistry } from '../stream/connection-registry.js';
import { getReplayCacheStats } from '../stream/replay.js';

const logger = createServiceLogger('stream-routes');

export async function streamRoutes(app: FastifyInstance) {
  /**
   * GET /stream/updates
   * SSE endpoint for real-time updates
   * Query params: ?companyId={id}&lastEventId={id}
   */
  app.get('/updates', sseStreamHandler);

  /**
   * GET /stream/stats
   * Get streaming statistics (for monitoring/debugging)
   */
  app.get('/stats', async (request, reply) => {
    try {
      const connectionStats = connectionRegistry.getStats();
      const replayStats = await getReplayCacheStats();

      return reply.send({
        connections: connectionStats,
        replayCache: replayStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get stream stats');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve stream statistics',
      });
    }
  });

  /**
   * GET /stream/health
   * Health check for streaming service
   */
  app.get('/health', async (request, reply) => {
    const stats = connectionRegistry.getStats();

    return reply.send({
      status: 'ok',
      streaming: {
        enabled: process.env.STREAMING_ENABLED === 'true',
        activeConnections: stats.totalConnections,
        activeCompanies: stats.activeCompanies,
      },
      timestamp: new Date().toISOString(),
    });
  });
}
