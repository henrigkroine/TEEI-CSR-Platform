/**
 * WebSocket Server for Real-Time Collaboration
 *
 * Handles WebSocket connections, heartbeats, and message routing
 * for collaborative editing sessions.
 */

import type { FastifyInstance } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';
import { Server } from 'socket.io';
import type {
  DocumentId,
  WSMessage,
  WSMessageType,
  JoinPayload,
  WelcomePayload,
  Operation,
  UserPresence,
  Comment,
  Suggestion,
  CollabRole,
  CollabSession
} from '@teei/shared-types';
import { DocumentManager } from './document-manager.js';
import { DocumentStore } from '../storage/document-store.js';
import { createServiceLogger } from '@teei/shared-utils';
import { verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const logger = createServiceLogger('ws-server');

interface AuthenticatedSocket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  docId?: DocumentId;
  role?: CollabRole;
  lastPing: number;
}

/**
 * WebSocket server for real-time collaboration
 */
export class CollabWebSocketServer {
  private io: SocketIOServer;
  private documentManagers: Map<DocumentId, DocumentManager> = new Map();
  private sessions: Map<string, AuthenticatedSocket> = new Map();
  private pingInterval: NodeJS.Timeout;

  constructor(
    private fastify: FastifyInstance,
    private store: DocumentStore,
    private jwtSecret: string = process.env.JWT_SECRET || 'change-me'
  ) {
    // Initialize Socket.IO
    this.io = new Server(fastify.server, {
      path: '/collab/ws',
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
      },
      pingTimeout: 30000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1 MB max message size
      transports: ['websocket', 'polling']
    });

    this.setupHandlers();
    this.startPingTimer();

    logger.info('WebSocket server initialized');
  }

  /**
   * Set up Socket.IO event handlers
   */
  private setupHandlers(): void {
    this.io.use(async (socket, next) => {
      try {
        // Authenticate via JWT token
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const payload = verify(token, this.jwtSecret) as any;

        // Attach user info to socket
        (socket as any).userId = payload.userId;
        (socket as any).userName = payload.userName || payload.email;
        (socket as any).userEmail = payload.email;

        logger.info({
          socketId: socket.id,
          userId: payload.userId
        }, 'Socket authenticated');

        next();
      } catch (err) {
        logger.error({ err }, 'Socket authentication failed');
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket as any);
    });
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: any): void {
    const userId = socket.userId;
    const userName = socket.userName;
    const userEmail = socket.userEmail;

    logger.info({ socketId: socket.id, userId }, 'Client connected');

    // Register session
    this.sessions.set(socket.id, {
      id: socket.id,
      userId,
      userName,
      userEmail,
      lastPing: Date.now()
    });

    // Handle join document
    socket.on('join', async (payload: JoinPayload) => {
      await this.handleJoin(socket, payload);
    });

    // Handle leave document
    socket.on('leave', async () => {
      await this.handleLeave(socket);
    });

    // Handle operation
    socket.on('operation', async (payload: { operation: Operation }) => {
      await this.handleOperation(socket, payload.operation);
    });

    // Handle presence update
    socket.on('presence', async (payload: { presence: UserPresence }) => {
      await this.handlePresence(socket, payload.presence);
    });

    // Handle comment
    socket.on('comment', async (payload: { comment: Comment }) => {
      await this.handleComment(socket, payload.comment);
    });

    // Handle suggestion
    socket.on('suggestion', async (payload: { suggestion: Suggestion }) => {
      await this.handleSuggestion(socket, payload.suggestion);
    });

    // Handle ping
    socket.on('ping', () => {
      const session = this.sessions.get(socket.id);
      if (session) {
        session.lastPing = Date.now();
      }
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      await this.handleDisconnect(socket);
    });

    // Error handling
    socket.on('error', (err: Error) => {
      logger.error({ err, socketId: socket.id }, 'Socket error');
    });
  }

  /**
   * Handle join document
   */
  private async handleJoin(socket: any, payload: JoinPayload): Promise<void> {
    const session = this.sessions.get(socket.id);
    if (!session) return;

    try {
      const { docId } = payload;

      // Get or create document manager
      let docManager = this.documentManagers.get(docId);
      if (!docManager) {
        docManager = new DocumentManager(docId, this.store);
        await docManager.initialize(session.userId);
        this.documentManagers.set(docId, docManager);

        // Subscribe to document events
        this.subscribeToDocumentEvents(docId, docManager);
      }

      // Determine user role (TODO: get from database based on userId)
      const role = CollabRole.Editor; // Default role

      // Update session
      session.docId = docId;
      session.role = role;

      // Join socket room
      socket.join(docId);

      // Get document state
      const { snapshot, operations } = await docManager.getState();
      const users = await docManager.getPresence();
      const comments = await docManager.getComments();

      // Send welcome message
      const welcome: WelcomePayload = {
        sessionId: socket.id,
        snapshot,
        operations,
        users,
        role
      };

      this.sendMessage(socket, 'welcome', welcome);

      // Broadcast user joined
      this.broadcast(docId, 'presence', {
        userId: session.userId,
        userName: session.userName,
        userEmail: session.userEmail,
        avatarColor: this.getAvatarColor(session.userId),
        isTyping: false,
        lastSeen: Date.now()
      }, socket.id);

      // Create session in database
      await this.store.createSession({
        id: socket.id,
        docId,
        userId: session.userId,
        role,
        connectedAt: new Date(),
        lastActivity: new Date(),
        transport: 'websocket',
        connectionId: socket.id
      });

      // Audit log
      await this.store.auditLog({
        docId,
        userId: session.userId,
        action: 'join',
        metadata: { sessionId: socket.id, role },
        ipAddress: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'] || ''
      });

      logger.info({
        socketId: socket.id,
        userId: session.userId,
        docId
      }, 'User joined document');
    } catch (err) {
      logger.error({ err, socketId: socket.id }, 'Join failed');
      this.sendMessage(socket, 'error', {
        message: 'Failed to join document',
        error: (err as Error).message
      });
    }
  }

  /**
   * Handle leave document
   */
  private async handleLeave(socket: any): Promise<void> {
    const session = this.sessions.get(socket.id);
    if (!session || !session.docId) return;

    const docId = session.docId;

    // Leave socket room
    socket.leave(docId);

    // Broadcast user left
    this.broadcast(docId, 'presence', {
      userId: session.userId,
      userName: session.userName,
      userEmail: session.userEmail,
      avatarColor: this.getAvatarColor(session.userId),
      isTyping: false,
      lastSeen: 0 // Indicates user left
    }, socket.id);

    // Delete session
    await this.store.deleteSession(socket.id);

    // Audit log
    await this.store.auditLog({
      docId,
      userId: session.userId,
      action: 'leave',
      metadata: { sessionId: socket.id },
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'] || ''
    });

    // Clear session docId
    session.docId = undefined;
    session.role = undefined;

    logger.info({ socketId: socket.id, docId }, 'User left document');
  }

  /**
   * Handle operation
   */
  private async handleOperation(socket: any, operation: Operation): Promise<void> {
    const session = this.sessions.get(socket.id);
    if (!session || !session.docId || !session.role) return;

    try {
      const docManager = this.documentManagers.get(session.docId);
      if (!docManager) {
        throw new Error('Document not found');
      }

      // Apply operation
      await docManager.applyOperation(operation, session.userId, session.role);

      // Update session activity
      await this.store.updateSessionActivity(socket.id);

      // Acknowledge to sender
      this.sendMessage(socket, 'operation_ack', { opId: operation.id });

      logger.debug({
        socketId: socket.id,
        docId: session.docId,
        opId: operation.id,
        type: operation.type
      }, 'Operation processed');
    } catch (err) {
      logger.error({ err, socketId: socket.id }, 'Operation failed');
      this.sendMessage(socket, 'error', {
        message: 'Operation failed',
        error: (err as Error).message,
        opId: operation.id
      });
    }
  }

  /**
   * Handle presence update
   */
  private async handlePresence(socket: any, presence: UserPresence): Promise<void> {
    const session = this.sessions.get(socket.id);
    if (!session || !session.docId) return;

    try {
      const docManager = this.documentManagers.get(session.docId);
      if (!docManager) return;

      await docManager.updatePresence(presence);

      logger.debug({
        socketId: socket.id,
        docId: session.docId,
        userId: presence.userId
      }, 'Presence updated');
    } catch (err) {
      logger.error({ err, socketId: socket.id }, 'Presence update failed');
    }
  }

  /**
   * Handle comment
   */
  private async handleComment(socket: any, comment: Comment): Promise<void> {
    const session = this.sessions.get(socket.id);
    if (!session || !session.docId || !session.role) return;

    try {
      const docManager = this.documentManagers.get(session.docId);
      if (!docManager) return;

      await docManager.addComment(comment, session.userId, session.role);

      logger.info({
        socketId: socket.id,
        docId: session.docId,
        commentId: comment.id
      }, 'Comment added');
    } catch (err) {
      logger.error({ err, socketId: socket.id }, 'Comment failed');
      this.sendMessage(socket, 'error', {
        message: 'Comment failed',
        error: (err as Error).message
      });
    }
  }

  /**
   * Handle suggestion
   */
  private async handleSuggestion(socket: any, suggestion: Suggestion): Promise<void> {
    const session = this.sessions.get(socket.id);
    if (!session || !session.docId || !session.role) return;

    try {
      const docManager = this.documentManagers.get(session.docId);
      if (!docManager) return;

      await docManager.addSuggestion(suggestion, session.userId, session.role);

      logger.info({
        socketId: socket.id,
        docId: session.docId,
        suggestionId: suggestion.id
      }, 'Suggestion added');
    } catch (err) {
      logger.error({ err, socketId: socket.id }, 'Suggestion failed');
      this.sendMessage(socket, 'error', {
        message: 'Suggestion failed',
        error: (err as Error).message
      });
    }
  }

  /**
   * Handle disconnect
   */
  private async handleDisconnect(socket: any): Promise<void> {
    const session = this.sessions.get(socket.id);
    if (!session) return;

    // Handle leave if in a document
    if (session.docId) {
      await this.handleLeave(socket);
    }

    // Remove session
    this.sessions.delete(socket.id);

    logger.info({ socketId: socket.id, userId: session.userId }, 'Client disconnected');
  }

  /**
   * Subscribe to document manager events
   */
  private subscribeToDocumentEvents(docId: DocumentId, docManager: DocumentManager): void {
    // Broadcast operations
    docManager.on('operations', (batch: any) => {
      this.broadcast(docId, 'operation_broadcast', batch);
    });

    // Broadcast presence
    docManager.on('presence', (presence: UserPresence) => {
      this.broadcast(docId, 'presence_broadcast', presence);
    });

    // Broadcast comments
    docManager.on('comment', (comment: Comment) => {
      this.broadcast(docId, 'comment_broadcast', comment);
    });

    // Broadcast suggestions
    docManager.on('suggestion', (suggestion: Suggestion) => {
      this.broadcast(docId, 'suggestion_broadcast', suggestion);
    });
  }

  /**
   * Send message to specific socket
   */
  private sendMessage(socket: any, type: string, payload: any): void {
    const message: WSMessage = {
      type: type as any,
      payload,
      timestamp: Date.now()
    };
    socket.emit('message', message);
  }

  /**
   * Broadcast message to all sockets in document (except sender)
   */
  private broadcast(docId: DocumentId, type: string, payload: any, excludeSocketId?: string): void {
    const message: WSMessage = {
      type: type as any,
      payload,
      timestamp: Date.now()
    };

    if (excludeSocketId) {
      this.io.to(docId).except(excludeSocketId).emit('message', message);
    } else {
      this.io.to(docId).emit('message', message);
    }
  }

  /**
   * Start ping timer (check for stale connections)
   */
  private startPingTimer(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60 seconds

      this.sessions.forEach((session, socketId) => {
        if (now - session.lastPing > timeout) {
          logger.warn({ socketId, userId: session.userId }, 'Stale connection detected');
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.disconnect(true);
          }
          this.sessions.delete(socketId);
        }
      });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get avatar color for user (deterministic)
   */
  private getAvatarColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];

    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Shutdown server
   */
  async shutdown(): Promise<void> {
    clearInterval(this.pingInterval);

    // Shutdown all document managers
    for (const [docId, manager] of this.documentManagers) {
      await manager.shutdown();
    }

    // Close all connections
    this.io.close();

    logger.info('WebSocket server shut down');
  }
}
