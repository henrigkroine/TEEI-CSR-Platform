/**
 * REST API Endpoints for Real-Time Collaboration
 *
 * Provides HTTP endpoints for collaboration features:
 * - Session management
 * - Document history
 * - Comments CRUD
 * - Suggestions review
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type {
  DocumentId,
  Operation,
  Comment,
  Suggestion,
  CollabRole
} from '@teei/shared-types';
import { DocumentManager } from '../../collab/sessions/document-manager.js';
import { DocumentStore } from '../../collab/storage/document-store.js';
import { createServiceLogger } from '@teei/shared-utils';
import { verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const logger = createServiceLogger('collab-rest');

interface AuthRequest extends FastifyRequest {
  user?: {
    userId: string;
    userName: string;
    userEmail: string;
  };
}

export async function registerCollabRoutes(
  fastify: FastifyInstance,
  store: DocumentStore,
  documentManagers: Map<DocumentId, DocumentManager>
): Promise<void> {
  // Auth middleware
  fastify.addHook('preHandler', async (request: AuthRequest, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      const payload = verify(token, process.env.JWT_SECRET || 'change-me') as any;

      request.user = {
        userId: payload.userId,
        userName: payload.userName || payload.email,
        userEmail: payload.email
      };
    } catch (err) {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });

  /**
   * POST /collab/sessions
   * Create or join a collaboration session
   */
  fastify.post<{
    Body: { docId: DocumentId; initialContent?: string };
  }>('/sessions', async (request: AuthRequest, reply) => {
    const { docId, initialContent } = request.body;
    const user = request.user!;

    try {
      // Get or create document manager
      let docManager = documentManagers.get(docId);
      if (!docManager) {
        docManager = new DocumentManager(docId, store);
        await docManager.initialize(user.userId, initialContent);
        documentManagers.set(docId, docManager);
      }

      // Get document state
      const { snapshot, operations } = await docManager.getState();
      const users = await docManager.getPresence();
      const comments = await docManager.getComments();

      // Create session
      const sessionId = uuidv4();
      const role = CollabRole.Editor; // TODO: Get from database

      await store.createSession({
        id: sessionId,
        docId,
        userId: user.userId,
        role,
        connectedAt: new Date(),
        lastActivity: new Date(),
        transport: 'rest'
      });

      // Audit log
      await store.auditLog({
        docId,
        userId: user.userId,
        action: 'join',
        metadata: { sessionId, transport: 'rest' },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || ''
      });

      return reply.send({
        sessionId,
        snapshot,
        operations,
        users,
        comments,
        role
      });
    } catch (err) {
      logger.error({ err, docId }, 'Create session failed');
      return reply.status(500).send({
        error: 'Failed to create session',
        message: (err as Error).message
      });
    }
  });

  /**
   * GET /collab/history?docId=xxx&since=yyy
   * Get document history (snapshot + operations)
   */
  fastify.get<{
    Querystring: { docId: string; since?: string };
  }>('/history', async (request: AuthRequest, reply) => {
    const { docId, since } = request.query;
    const sinceClock = since ? parseInt(since, 10) : 0;

    try {
      const { snapshot, operations } = await store.getDocumentState(
        docId,
        sinceClock
      );

      return reply.send({ snapshot, operations });
    } catch (err) {
      logger.error({ err, docId }, 'Get history failed');
      return reply.status(500).send({
        error: 'Failed to get history',
        message: (err as Error).message
      });
    }
  });

  /**
   * POST /collab/operations
   * Apply operation (for REST-only clients)
   */
  fastify.post<{
    Body: { docId: DocumentId; operation: Operation };
  }>('/operations', async (request: AuthRequest, reply) => {
    const { docId, operation } = request.body;
    const user = request.user!;

    try {
      const docManager = documentManagers.get(docId);
      if (!docManager) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      const role = CollabRole.Editor; // TODO: Get from session
      await docManager.applyOperation(operation, user.userId, role);

      return reply.send({ success: true, opId: operation.id });
    } catch (err) {
      logger.error({ err, docId }, 'Apply operation failed');
      return reply.status(500).send({
        error: 'Operation failed',
        message: (err as Error).message
      });
    }
  });

  /**
   * GET /collab/comments?docId=xxx
   * Get comments for document
   */
  fastify.get<{
    Querystring: { docId: string };
  }>('/comments', async (request: AuthRequest, reply) => {
    const { docId } = request.query;

    try {
      const comments = await store.getComments(docId);
      return reply.send({ comments });
    } catch (err) {
      logger.error({ err, docId }, 'Get comments failed');
      return reply.status(500).send({
        error: 'Failed to get comments',
        message: (err as Error).message
      });
    }
  });

  /**
   * POST /collab/comments
   * Add comment
   */
  fastify.post<{
    Body: Comment;
  }>('/comments', async (request: AuthRequest, reply) => {
    const comment = request.body;
    const user = request.user!;

    try {
      const docManager = documentManagers.get(comment.docId);
      if (!docManager) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      const role = CollabRole.Commenter; // TODO: Get from session
      await docManager.addComment(comment, user.userId, role);

      return reply.status(201).send({ success: true, commentId: comment.id });
    } catch (err) {
      logger.error({ err }, 'Add comment failed');
      return reply.status(500).send({
        error: 'Failed to add comment',
        message: (err as Error).message
      });
    }
  });

  /**
   * PUT /collab/comments/:id/resolve
   * Resolve comment
   */
  fastify.put<{
    Params: { id: string };
  }>('/comments/:id/resolve', async (request: AuthRequest, reply) => {
    const { id } = request.params;
    const user = request.user!;

    try {
      await store.resolveComment(id, user.userId);
      return reply.send({ success: true });
    } catch (err) {
      logger.error({ err, commentId: id }, 'Resolve comment failed');
      return reply.status(500).send({
        error: 'Failed to resolve comment',
        message: (err as Error).message
      });
    }
  });

  /**
   * POST /collab/suggestions
   * Create suggestion (track changes)
   */
  fastify.post<{
    Body: Suggestion;
  }>('/suggestions', async (request: AuthRequest, reply) => {
    const suggestion = request.body;
    const user = request.user!;

    try {
      const docManager = documentManagers.get(suggestion.docId);
      if (!docManager) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      const role = CollabRole.Editor; // TODO: Get from session
      await docManager.addSuggestion(suggestion, user.userId, role);

      return reply.status(201).send({
        success: true,
        suggestionId: suggestion.id
      });
    } catch (err) {
      logger.error({ err }, 'Add suggestion failed');
      return reply.status(500).send({
        error: 'Failed to add suggestion',
        message: (err as Error).message
      });
    }
  });

  /**
   * GET /collab/suggestions?docId=xxx&status=pending
   * Get suggestions for document
   */
  fastify.get<{
    Querystring: { docId: string; status?: string };
  }>('/suggestions', async (request: AuthRequest, reply) => {
    const { docId, status } = request.query;

    try {
      const suggestions = await store.getSuggestions(docId, status);
      return reply.send({ suggestions });
    } catch (err) {
      logger.error({ err, docId }, 'Get suggestions failed');
      return reply.status(500).send({
        error: 'Failed to get suggestions',
        message: (err as Error).message
      });
    }
  });

  /**
   * PUT /collab/suggestions/:id/accept
   * Accept suggestion
   */
  fastify.put<{
    Params: { id: string };
    Body: { docId: DocumentId };
  }>('/suggestions/:id/accept', async (request: AuthRequest, reply) => {
    const { id } = request.params;
    const { docId } = request.body;
    const user = request.user!;

    try {
      const docManager = documentManagers.get(docId);
      if (!docManager) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      const role = CollabRole.Editor; // TODO: Get from session
      await docManager.reviewSuggestion(id, true, user.userId, role);

      return reply.send({ success: true });
    } catch (err) {
      logger.error({ err, suggestionId: id }, 'Accept suggestion failed');
      return reply.status(500).send({
        error: 'Failed to accept suggestion',
        message: (err as Error).message
      });
    }
  });

  /**
   * PUT /collab/suggestions/:id/reject
   * Reject suggestion
   */
  fastify.put<{
    Params: { id: string };
    Body: { docId: DocumentId };
  }>('/suggestions/:id/reject', async (request: AuthRequest, reply) => {
    const { id } = request.params;
    const { docId } = request.body;
    const user = request.user!;

    try {
      const docManager = documentManagers.get(docId);
      if (!docManager) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      const role = CollabRole.Editor; // TODO: Get from session
      await docManager.reviewSuggestion(id, false, user.userId, role);

      return reply.send({ success: true });
    } catch (err) {
      logger.error({ err, suggestionId: id }, 'Reject suggestion failed');
      return reply.status(500).send({
        error: 'Failed to reject suggestion',
        message: (err as Error).message
      });
    }
  });

  /**
   * GET /collab/presence?docId=xxx
   * Get active users (presence)
   */
  fastify.get<{
    Querystring: { docId: string };
  }>('/presence', async (request: AuthRequest, reply) => {
    const { docId } = request.query;

    try {
      const presence = await store.getPresence(docId);
      return reply.send({ presence });
    } catch (err) {
      logger.error({ err, docId }, 'Get presence failed');
      return reply.status(500).send({
        error: 'Failed to get presence',
        message: (err as Error).message
      });
    }
  });

  /**
   * DELETE /collab/sessions/:id
   * Leave session
   */
  fastify.delete<{
    Params: { id: string };
  }>('/sessions/:id', async (request: AuthRequest, reply) => {
    const { id } = request.params;
    const user = request.user!;

    try {
      await store.deleteSession(id);

      // Audit log
      await store.auditLog({
        docId: '',
        userId: user.userId,
        action: 'leave',
        metadata: { sessionId: id },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || ''
      });

      return reply.send({ success: true });
    } catch (err) {
      logger.error({ err, sessionId: id }, 'Delete session failed');
      return reply.status(500).send({
        error: 'Failed to delete session',
        message: (err as Error).message
      });
    }
  });

  logger.info('Collaboration REST routes registered');
}
