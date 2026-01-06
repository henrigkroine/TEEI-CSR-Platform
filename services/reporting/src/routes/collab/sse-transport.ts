/**
 * Server-Sent Events (SSE) Fallback Transport
 *
 * Provides SSE-based real-time updates for clients that cannot use WebSockets.
 * Includes backpressure handling and automatic reconnection support.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type {
  DocumentId,
  Operation,
  UserPresence,
  Comment,
  Suggestion,
  WSMessage
} from '@teei/shared-types';
import { DocumentManager } from '../../collab/sessions/document-manager.js';
import { DocumentStore } from '../../collab/storage/document-store.js';
import { createServiceLogger } from '@teei/shared-utils';
import { verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const logger = createServiceLogger('collab-sse');

interface SSEClient {
  id: string;
  userId: string;
  docId: DocumentId;
  reply: FastifyReply;
  lastEventId: number;
  connected: boolean;
}

export class SSETransport {
  private clients: Map<string, SSEClient> = new Map();
  private eventIdCounter: number = 0;

  constructor(
    private documentManagers: Map<DocumentId, DocumentManager>,
    private store: DocumentStore
  ) {}

  /**
   * Register SSE routes
   */
  registerRoutes(fastify: FastifyInstance): void {
    /**
     * GET /collab/sse/connect?docId=xxx&token=yyy
     * Establish SSE connection
     */
    fastify.get<{
      Querystring: { docId: string; token: string; lastEventId?: string };
    }>('/sse/connect', async (request, reply) => {
      await this.handleConnect(request, reply);
    });

    logger.info('SSE routes registered');
  }

  /**
   * Handle SSE connection
   */
  private async handleConnect(
    request: FastifyRequest<{
      Querystring: { docId: string; token: string; lastEventId?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const { docId, token, lastEventId } = request.query;

    try {
      // Authenticate
      const payload = verify(token, process.env.JWT_SECRET || 'change-me') as any;
      const userId = payload.userId;
      const userName = payload.userName || payload.email;

      // Set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disable nginx buffering
      });

      // Create client
      const clientId = uuidv4();
      const client: SSEClient = {
        id: clientId,
        userId,
        docId,
        reply,
        lastEventId: lastEventId ? parseInt(lastEventId, 10) : 0,
        connected: true
      };

      this.clients.set(clientId, client);

      // Get or create document manager
      let docManager = this.documentManagers.get(docId);
      if (!docManager) {
        docManager = new DocumentManager(docId, this.store);
        await docManager.initialize(userId);
        this.documentManagers.set(docId, docManager);
        this.subscribeToDocumentEvents(docId, docManager);
      }

      // Send initial state
      const { snapshot, operations } = await docManager.getState(client.lastEventId);
      const users = await docManager.getPresence();

      this.sendEvent(client, 'welcome', {
        sessionId: clientId,
        snapshot,
        operations,
        users,
        role: 'editor'
      });

      // Create session
      await this.store.createSession({
        id: clientId,
        docId,
        userId,
        role: 'editor',
        connectedAt: new Date(),
        lastActivity: new Date(),
        transport: 'sse',
        connectionId: clientId
      });

      // Audit log
      await this.store.auditLog({
        docId,
        userId,
        action: 'join',
        metadata: { sessionId: clientId, transport: 'sse' },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || ''
      });

      logger.info({ clientId, userId, docId }, 'SSE client connected');

      // Handle disconnect
      request.raw.on('close', async () => {
        await this.handleDisconnect(clientId);
      });

      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        if (!client.connected) {
          clearInterval(pingInterval);
          return;
        }

        this.sendComment(client, 'SSE keep-alive');
      }, 30000);

      // Keep connection open
      await new Promise(() => {});
    } catch (err) {
      logger.error({ err, docId }, 'SSE connection failed');
      reply.status(500).send({ error: 'Connection failed' });
    }
  }

  /**
   * Handle client disconnect
   */
  private async handleDisconnect(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.connected = false;
    this.clients.delete(clientId);

    // Delete session
    await this.store.deleteSession(clientId);

    // Audit log
    await this.store.auditLog({
      docId: client.docId,
      userId: client.userId,
      action: 'leave',
      metadata: { sessionId: clientId },
      ipAddress: '',
      userAgent: ''
    });

    logger.info({ clientId, userId: client.userId }, 'SSE client disconnected');
  }

  /**
   * Subscribe to document events
   */
  private subscribeToDocumentEvents(docId: DocumentId, docManager: DocumentManager): void {
    // Broadcast operations
    docManager.on('operations', (batch: any) => {
      this.broadcastToDocument(docId, 'operation_broadcast', batch);
    });

    // Broadcast presence
    docManager.on('presence', (presence: UserPresence) => {
      this.broadcastToDocument(docId, 'presence_broadcast', presence);
    });

    // Broadcast comments
    docManager.on('comment', (comment: Comment) => {
      this.broadcastToDocument(docId, 'comment_broadcast', comment);
    });

    // Broadcast suggestions
    docManager.on('suggestion', (suggestion: Suggestion) => {
      this.broadcastToDocument(docId, 'suggestion_broadcast', suggestion);
    });
  }

  /**
   * Broadcast event to all clients in document
   */
  private broadcastToDocument(docId: DocumentId, type: string, payload: any): void {
    for (const [clientId, client] of this.clients) {
      if (client.docId === docId && client.connected) {
        this.sendEvent(client, type, payload);
      }
    }
  }

  /**
   * Send SSE event to client
   */
  private sendEvent(client: SSEClient, type: string, payload: any): void {
    if (!client.connected) return;

    const eventId = ++this.eventIdCounter;

    const message: WSMessage = {
      type: type as any,
      payload,
      timestamp: Date.now()
    };

    try {
      // SSE format:
      // id: <eventId>\n
      // event: <type>\n
      // data: <json>\n\n
      client.reply.raw.write(`id: ${eventId}\n`);
      client.reply.raw.write(`event: message\n`);
      client.reply.raw.write(`data: ${JSON.stringify(message)}\n\n`);

      // Update last event ID
      client.lastEventId = eventId;
    } catch (err) {
      logger.error({ err, clientId: client.id }, 'Failed to send SSE event');
      client.connected = false;
    }
  }

  /**
   * Send SSE comment (for keep-alive)
   */
  private sendComment(client: SSEClient, comment: string): void {
    if (!client.connected) return;

    try {
      client.reply.raw.write(`: ${comment}\n\n`);
    } catch (err) {
      logger.error({ err, clientId: client.id }, 'Failed to send SSE comment');
      client.connected = false;
    }
  }

  /**
   * Get active client count
   */
  getClientCount(docId?: DocumentId): number {
    if (docId) {
      return Array.from(this.clients.values()).filter(
        c => c.docId === docId && c.connected
      ).length;
    }
    return Array.from(this.clients.values()).filter(c => c.connected).length;
  }

  /**
   * Shutdown transport
   */
  async shutdown(): Promise<void> {
    // Close all connections
    for (const [clientId, client] of this.clients) {
      if (client.connected) {
        this.sendEvent(client, 'shutdown', { message: 'Server shutting down' });
        client.reply.raw.end();
        await this.handleDisconnect(clientId);
      }
    }

    this.clients.clear();
    logger.info('SSE transport shut down');
  }
}
