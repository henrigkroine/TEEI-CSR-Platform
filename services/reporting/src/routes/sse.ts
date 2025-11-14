/**
 * SSE Routes for Real-Time Updates
 *
 * Endpoints:
 * - GET /sse/stream - Establish SSE connection for real-time updates
 * - GET /sse/stats - Get SSE connection statistics (admin only)
 *
 * @module routes/sse
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sseManager } from '../sse/sseManager.js';

interface SSEQueryParams {
  companyId: string;
  channel: string;
  lastEventId?: string;
}

/**
 * Register SSE routes
 */
export async function sseRoutes(fastify: FastifyInstance) {
  /**
   * SSE Stream Endpoint
   *
   * Establishes Server-Sent Events connection for real-time updates.
   * Clients receive events for their specific company and channel.
   *
   * Query Parameters:
   * - companyId: Company identifier for tenant isolation
   * - channel: Event channel (dashboard-updates, evidence-updates, etc.)
   * - lastEventId: (Optional) Resume from this event ID
   *
   * @example
   * GET /sse/stream?companyId=acme-corp&channel=dashboard-updates
   */
  fastify.get<{ Querystring: SSEQueryParams }>(
    '/sse/stream',
    {
      schema: {
        description: 'Establish SSE connection for real-time updates',
        tags: ['SSE'],
        querystring: {
          type: 'object',
          required: ['companyId', 'channel'],
          properties: {
            companyId: {
              type: 'string',
              description: 'Company identifier',
              pattern: '^[a-z0-9_-]{1,100}$',
            },
            channel: {
              type: 'string',
              description: 'Event channel to subscribe to',
              enum: ['dashboard-updates', 'evidence-updates', 'report-updates'],
            },
            lastEventId: {
              type: 'string',
              description: 'Resume from this event ID',
            },
          },
        },
        response: {
          200: {
            description: 'SSE stream established',
            type: 'string',
          },
          400: {
            description: 'Invalid parameters',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: SSEQueryParams }>, reply: FastifyReply) => {
      const { companyId, channel, lastEventId } = request.query;

      // Validate company ID format
      if (!companyId || !/^[a-z0-9_-]{1,100}$/i.test(companyId)) {
        return reply.status(400).send({
          error: 'INVALID_COMPANY_ID',
          message: 'Invalid company ID format',
        });
      }

      // Validate channel
      const validChannels = ['dashboard-updates', 'evidence-updates', 'report-updates'];
      if (!validChannels.includes(channel)) {
        return reply.status(400).send({
          error: 'INVALID_CHANNEL',
          message: `Invalid channel. Must be one of: ${validChannels.join(', ')}`,
        });
      }

      // TODO: Add authentication check
      // Verify user has access to this company
      // const user = request.user;
      // if (user.company_id !== companyId && user.role !== 'SUPER_ADMIN') {
      //   return reply.status(403).send({
      //     error: 'FORBIDDEN',
      //     message: 'Access denied to this company',
      //   });
      // }

      // Set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      });

      // Generate connection ID
      const connectionId = `${companyId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add connection to manager
      sseManager.addConnection(
        connectionId,
        companyId,
        channel,
        reply,
        lastEventId || null
      );

      // Handle client disconnect
      request.raw.on('close', () => {
        fastify.log.info(`[SSE] Client disconnected: ${connectionId}`);
        sseManager.removeConnection(connectionId);
      });

      // Handle connection errors
      reply.raw.on('error', (error) => {
        fastify.log.error(`[SSE] Connection error for ${connectionId}:`, error);
        sseManager.removeConnection(connectionId);
      });

      // Keep connection open (reply will be closed by client or error)
    }
  );

  /**
   * SSE Statistics Endpoint
   *
   * Returns connection statistics for monitoring.
   * Restricted to admin users.
   *
   * @example
   * GET /sse/stats
   */
  fastify.get(
    '/sse/stats',
    {
      schema: {
        description: 'Get SSE connection statistics',
        tags: ['SSE'],
        response: {
          200: {
            description: 'Connection statistics',
            type: 'object',
            properties: {
              totalConnections: { type: 'number' },
              connectionsByCompany: { type: 'object' },
              connectionsByChannel: { type: 'object' },
              historySize: { type: 'number' },
            },
          },
          403: {
            description: 'Forbidden - Admin only',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // TODO: Add admin authentication check
      // const user = request.user;
      // if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      //   return reply.status(403).send({
      //     error: 'FORBIDDEN',
      //     message: 'Admin access required',
      //   });
      // }

      const stats = sseManager.getStats();
      return reply.send(stats);
    }
  );

  /**
   * Test Broadcast Endpoint (Development Only)
   *
   * Manually trigger a broadcast for testing.
   * Should be removed or secured in production.
   *
   * @example
   * POST /sse/test-broadcast
   * Body: { companyId, channel, type, data }
   */
  if (process.env.NODE_ENV === 'development') {
    fastify.post<{
      Body: {
        companyId: string;
        channel: string;
        type: string;
        data: unknown;
      };
    }>(
      '/sse/test-broadcast',
      {
        schema: {
          description: 'Test SSE broadcast (Development only)',
          tags: ['SSE'],
          body: {
            type: 'object',
            required: ['companyId', 'channel', 'type', 'data'],
            properties: {
              companyId: { type: 'string' },
              channel: { type: 'string' },
              type: { type: 'string' },
              data: { type: 'object' },
            },
          },
        },
      },
      async (
        request: FastifyRequest<{
          Body: {
            companyId: string;
            channel: string;
            type: string;
            data: unknown;
          };
        }>,
        reply: FastifyReply
      ) => {
        const { companyId, channel, type, data } = request.body;

        sseManager.broadcast(companyId, channel, type, data);

        return reply.send({
          success: true,
          message: 'Broadcast sent',
          companyId,
          channel,
          type,
        });
      }
    );
  }
}

/**
 * Helper function to trigger dashboard updates
 * Can be called from other parts of the application
 */
export function broadcastDashboardUpdate(companyId: string, data: unknown): void {
  sseManager.broadcast(companyId, 'dashboard-updates', 'dashboard-update', data);
}

/**
 * Helper function to trigger evidence updates
 */
export function broadcastEvidenceUpdate(companyId: string, data: unknown): void {
  sseManager.broadcast(companyId, 'evidence-updates', 'evidence-update', data);
}

/**
 * Helper function to trigger report updates
 */
export function broadcastReportUpdate(companyId: string, data: unknown): void {
  sseManager.broadcast(companyId, 'report-updates', 'report-update', data);
}
