/**
 * SSE (Server-Sent Events) Streaming Endpoint
 * Provides real-time updates for cockpit widgets
 * Company-scoped with JWT verification
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { connectionRegistry, type SSEConnection } from './connection-registry.js';
import { getEventsSince } from './replay.js';

const logger = createServiceLogger('sse-stream');

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

// Supported event types
export const SSE_EVENT_TYPES = {
  METRIC_UPDATED: 'metric_updated',
  SROI_UPDATED: 'sroi_updated',
  VIS_UPDATED: 'vis_updated',
  JOURNEY_FLAG_UPDATED: 'journey_flag_updated',
} as const;

export type SSEEventType = typeof SSE_EVENT_TYPES[keyof typeof SSE_EVENT_TYPES];

export interface SSEEventData {
  type: SSEEventType;
  companyId: string;
  data: any;
  timestamp: string;
}

/**
 * Format SSE message according to EventSource spec
 */
export function formatSSEMessage(eventId: string, event: SSEEventType, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\nid: ${eventId}\n\n`;
}

/**
 * Format SSE heartbeat comment
 */
export function formatHeartbeat(): string {
  return `:heartbeat\n\n`;
}

/**
 * Check if streaming is enabled
 */
function isStreamingEnabled(companyId: string): boolean {
  // Check environment variable
  const envEnabled = process.env.STREAMING_ENABLED === 'true';
  if (!envEnabled) {
    logger.debug({ companyId }, 'Streaming disabled by environment variable');
    return false;
  }

  // TODO: Check per-company feature flag in database
  // const company = await db.query.companies.findFirst({
  //   where: eq(companies.id, companyId),
  //   columns: { features: true }
  // });
  // return company?.features?.streaming === true;

  // For now, return env flag only
  return true;
}

/**
 * SSE Stream Handler
 * GET /stream/updates?companyId={id}&lastEventId={id}
 */
export async function sseStreamHandler(
  request: FastifyRequest<{
    Querystring: {
      companyId: string;
      lastEventId?: string;
    };
  }>,
  reply: FastifyReply
) {
  const { companyId, lastEventId } = request.query;

  // Verify company ID is provided
  if (!companyId) {
    return reply.code(400).send({
      error: 'Bad Request',
      message: 'companyId query parameter is required',
    });
  }

  // TODO: Extract companyId from JWT and verify it matches query param
  // const userCompanyId = request.user?.companyId;
  // if (userCompanyId !== companyId) {
  //   return reply.code(403).send({
  //     error: 'Forbidden',
  //     message: 'You can only stream events for your own company',
  //   });
  // }

  // Check if streaming is enabled
  if (!isStreamingEnabled(companyId)) {
    return reply.code(501).send({
      error: 'Not Implemented',
      message: 'Streaming is not enabled for this company',
    });
  }

  logger.info({ companyId, lastEventId }, 'SSE connection established');

  // Set up SSE headers
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  // Create connection object
  const connectionId = `${companyId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const connection: SSEConnection = {
    id: connectionId,
    companyId,
    reply,
    connectedAt: new Date(),
    lastActivity: new Date(),
    buffer: [],
  };

  // Register connection
  connectionRegistry.addConnection(connection);

  // If lastEventId provided, replay missed events
  if (lastEventId) {
    try {
      const missedEvents = await getEventsSince(lastEventId, companyId);
      logger.info({ companyId, lastEventId, count: missedEvents.length }, 'Replaying missed events');

      for (const event of missedEvents) {
        const message = formatSSEMessage(event.id, event.type as SSEEventType, event.data);
        reply.raw.write(message);
      }
    } catch (error) {
      logger.error({ error, companyId, lastEventId }, 'Failed to replay missed events');
    }
  }

  // Send initial connection confirmation
  const welcomeMessage = formatSSEMessage(
    `welcome-${Date.now()}`,
    SSE_EVENT_TYPES.METRIC_UPDATED,
    {
      message: 'Connected to TEEI SSE stream',
      companyId,
      timestamp: new Date().toISOString(),
    }
  );
  reply.raw.write(welcomeMessage);

  // Set up heartbeat
  const heartbeatTimer = setInterval(() => {
    try {
      reply.raw.write(formatHeartbeat());
      connection.lastActivity = new Date();
    } catch (error) {
      logger.error({ error, connectionId }, 'Failed to send heartbeat');
      clearInterval(heartbeatTimer);
      connectionRegistry.removeConnection(connectionId);
    }
  }, HEARTBEAT_INTERVAL);

  // Set up idle timeout (15 minutes)
  const IDLE_TIMEOUT = 15 * 60 * 1000;
  const idleCheckTimer = setInterval(() => {
    const idleTime = Date.now() - connection.lastActivity.getTime();
    if (idleTime > IDLE_TIMEOUT) {
      logger.info({ connectionId, companyId, idleTime }, 'Closing idle connection');
      clearInterval(heartbeatTimer);
      clearInterval(idleCheckTimer);
      connectionRegistry.removeConnection(connectionId);
      reply.raw.end();
    }
  }, 60000); // Check every minute

  // Handle client disconnect
  request.raw.on('close', () => {
    logger.info({ connectionId, companyId }, 'SSE connection closed by client');
    clearInterval(heartbeatTimer);
    clearInterval(idleCheckTimer);
    connectionRegistry.removeConnection(connectionId);
  });

  // Handle errors
  reply.raw.on('error', (error) => {
    logger.error({ error, connectionId, companyId }, 'SSE connection error');
    clearInterval(heartbeatTimer);
    clearInterval(idleCheckTimer);
    connectionRegistry.removeConnection(connectionId);
  });
}

/**
 * Send event to specific connection
 */
export function sendEventToConnection(
  connection: SSEConnection,
  eventId: string,
  eventType: SSEEventType,
  data: any
): boolean {
  try {
    const message = formatSSEMessage(eventId, eventType, data);
    connection.reply.raw.write(message);
    connection.lastActivity = new Date();
    return true;
  } catch (error) {
    logger.error({ error, connectionId: connection.id }, 'Failed to send event to connection');
    return false;
  }
}

/**
 * Broadcast event to all connections for a company
 */
export function broadcastToCompany(
  companyId: string,
  eventId: string,
  eventType: SSEEventType,
  data: any
): number {
  const connections = connectionRegistry.getConnectionsForCompany(companyId);
  let successCount = 0;

  for (const connection of connections) {
    // Handle backpressure: if buffer is too large, drop old events
    if (connection.buffer.length > 100) {
      connection.buffer.shift(); // Remove oldest event
      logger.warn(
        { connectionId: connection.id, companyId },
        'Buffer overflow, dropping oldest event'
      );
    }

    const success = sendEventToConnection(connection, eventId, eventType, data);
    if (success) {
      successCount++;
    } else {
      // Remove failed connection
      connectionRegistry.removeConnection(connection.id);
    }
  }

  logger.debug(
    { companyId, eventType, connections: connections.length, success: successCount },
    'Broadcast complete'
  );

  return successCount;
}
