/**
 * Collaboration Routes - Main Entry Point
 *
 * Registers WebSocket, SSE, and REST API routes for real-time collaboration.
 */

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { DocumentStore } from '../../collab/storage/document-store.js';
import { DocumentManager } from '../../collab/sessions/document-manager.js';
import { CollabWebSocketServer } from '../../collab/sessions/websocket-server.js';
import { SSETransport } from './sse-transport.js';
import { registerCollabRoutes } from './rest-api.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('collab-routes');

export interface CollabRouteOptions {
  pool: Pool;
  jwtSecret?: string;
}

/**
 * Register all collaboration routes
 */
export async function registerCollaboration(
  fastify: FastifyInstance,
  options: CollabRouteOptions
): Promise<void> {
  const { pool, jwtSecret } = options;

  // Initialize store
  const store = new DocumentStore(pool);

  // Shared document managers (across transports)
  const documentManagers = new Map<string, DocumentManager>();

  // Initialize WebSocket server
  const wsServer = new CollabWebSocketServer(fastify, store, jwtSecret);

  // Initialize SSE transport
  const sseTransport = new SSETransport(documentManagers, store);

  // Register routes with prefix
  await fastify.register(async (instance) => {
    // REST API routes
    await registerCollabRoutes(instance, store, documentManagers);

    // SSE routes
    sseTransport.registerRoutes(instance);
  }, { prefix: '/collab' });

  // Periodic snapshot compaction (every 10 minutes)
  const compactionInterval = setInterval(async () => {
    try {
      for (const [docId, manager] of documentManagers) {
        await manager.compact();
      }
    } catch (err) {
      logger.error({ err }, 'Compaction failed');
    }
  }, 10 * 60 * 1000);

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    clearInterval(compactionInterval);
    await wsServer.shutdown();
    await sseTransport.shutdown();

    // Shutdown all document managers
    for (const [docId, manager] of documentManagers) {
      await manager.shutdown();
    }

    logger.info('Collaboration services shut down');
  });

  logger.info('Collaboration routes registered');
}
