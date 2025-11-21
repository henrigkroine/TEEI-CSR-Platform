/**
 * Document Manager - Orchestrates real-time collaboration operations
 *
 * Manages document state, operation transformation, and broadcasting
 * for multi-user collaborative editing.
 */

import { EventEmitter } from 'events';
import type {
  DocumentId,
  DocumentSnapshot,
  Operation,
  CollabRole,
  UserPresence,
  Comment,
  Suggestion,
  OperationBatch,
  RateLimitConfig
} from '@teei/shared-types';
import { transform, applyOperation, validateOperation, compressOperations } from '../merge/ot-transform.js';
import { DocumentStore } from '../storage/document-store.js';
import { createServiceLogger } from '@teei/shared-utils';
import { v4 as uuidv4 } from 'uuid';

const logger = createServiceLogger('doc-manager');

interface PendingOp {
  operation: Operation;
  resolve: () => void;
  reject: (err: Error) => void;
}

/**
 * Document Manager handles real-time collaborative editing for a single document
 */
export class DocumentManager extends EventEmitter {
  private snapshot: DocumentSnapshot | null = null;
  private pendingOps: PendingOp[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private rateLimits: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(
    private docId: DocumentId,
    private store: DocumentStore,
    private config: RateLimitConfig = {
      maxOpsPerMinute: 120,
      maxDocSize: 100000,
      maxUsers: 50,
      batchFlushMs: 50
    }
  ) {
    super();
  }

  /**
   * Initialize document (load or create)
   */
  async initialize(userId: string, initialContent: string = ''): Promise<void> {
    this.snapshot = await this.store.getOrCreateSnapshot(
      this.docId,
      userId,
      initialContent
    );

    logger.info({
      docId: this.docId,
      version: this.snapshot.version,
      clock: this.snapshot.clock
    }, 'Document initialized');
  }

  /**
   * Get current document state with pending ops
   */
  async getState(sinceClock: number = 0): Promise<{
    snapshot: DocumentSnapshot;
    operations: Operation[];
  }> {
    if (!this.snapshot) {
      throw new Error('Document not initialized');
    }

    const { snapshot, operations } = await this.store.getDocumentState(
      this.docId,
      sinceClock
    );

    return { snapshot, operations };
  }

  /**
   * Apply operation from user
   */
  async applyOperation(
    op: Operation,
    userId: string,
    role: CollabRole
  ): Promise<void> {
    if (!this.snapshot) {
      throw new Error('Document not initialized');
    }

    // Check RBAC
    this.checkPermission(role, 'edit');

    // Rate limiting
    this.checkRateLimit(userId);

    // Validate operation
    validateOperation(op, this.docId, this.snapshot.content.length);

    // Check document size limit
    const projectedSize = this.projectDocumentSize(op);
    if (projectedSize > this.config.maxDocSize) {
      throw new Error(
        `Document size limit exceeded: ${projectedSize} > ${this.config.maxDocSize}`
      );
    }

    return new Promise((resolve, reject) => {
      // Add to pending queue
      this.pendingOps.push({ operation: op, resolve, reject });

      // Schedule flush if not already scheduled
      if (!this.flushTimer) {
        this.flushTimer = setTimeout(
          () => this.flush(),
          this.config.batchFlushMs
        );
      }
    });
  }

  /**
   * Flush pending operations (batch processing)
   */
  private async flush(): Promise<void> {
    if (this.pendingOps.length === 0) return;

    const batch = this.pendingOps.splice(0);
    this.flushTimer = null;

    try {
      // Transform operations against each other
      const transformed = this.transformBatch(batch.map(p => p.operation));

      // Apply to snapshot
      for (const op of transformed) {
        this.snapshot!.content = applyOperation(this.snapshot!.content, op);
        this.snapshot!.clock = Math.max(this.snapshot!.clock, op.clock) + 1;
      }

      // Persist to database
      await this.store.appendOperations(transformed);

      // Broadcast to connected clients
      this.emit('operations', {
        operations: transformed,
        clock: this.snapshot!.clock
      } as OperationBatch);

      // Resolve promises
      batch.forEach(p => p.resolve());

      logger.info({
        docId: this.docId,
        count: transformed.length,
        clock: this.snapshot!.clock
      }, 'Operations flushed');
    } catch (err) {
      logger.error({ err, docId: this.docId }, 'Flush failed');
      batch.forEach(p => p.reject(err as Error));
    }
  }

  /**
   * Transform batch of operations against each other
   */
  private transformBatch(ops: Operation[]): Operation[] {
    if (ops.length <= 1) return ops;

    // Compress adjacent operations first
    const compressed = compressOperations(ops);

    // Transform each operation against all previous ones
    const transformed: Operation[] = [];
    for (let i = 0; i < compressed.length; i++) {
      let current = compressed[i];

      for (let j = 0; j < i; j++) {
        [transformed[j], current] = transform(transformed[j], current);
      }

      transformed.push(current);
    }

    return transformed;
  }

  /**
   * Handle remote operations (from other users)
   */
  async handleRemoteOperations(ops: Operation[]): Promise<void> {
    if (!this.snapshot) return;

    for (const op of ops) {
      // Validate
      validateOperation(op, this.docId, this.snapshot.content.length);

      // Apply to local snapshot
      this.snapshot.content = applyOperation(this.snapshot.content, op);
      this.snapshot.clock = Math.max(this.snapshot.clock, op.clock);
    }

    // Broadcast to local clients
    this.emit('remote_operations', { operations: ops });
  }

  /**
   * Add comment
   */
  async addComment(comment: Comment, userId: string, role: CollabRole): Promise<void> {
    this.checkPermission(role, 'comment');

    await this.store.addComment(comment);
    this.emit('comment', comment);

    await this.store.auditLog({
      docId: this.docId,
      userId,
      action: 'comment',
      metadata: { commentId: comment.id },
      ipAddress: '',
      userAgent: ''
    });
  }

  /**
   * Get comments
   */
  async getComments(): Promise<Comment[]> {
    return this.store.getComments(this.docId);
  }

  /**
   * Add suggestion (track changes)
   */
  async addSuggestion(
    suggestion: Suggestion,
    userId: string,
    role: CollabRole
  ): Promise<void> {
    this.checkPermission(role, 'edit');

    await this.store.addSuggestion(suggestion);
    this.emit('suggestion', suggestion);

    await this.store.auditLog({
      docId: this.docId,
      userId,
      action: 'suggestion',
      metadata: { suggestionId: suggestion.id },
      ipAddress: '',
      userAgent: ''
    });
  }

  /**
   * Accept/reject suggestion
   */
  async reviewSuggestion(
    suggestionId: string,
    accept: boolean,
    userId: string,
    role: CollabRole
  ): Promise<void> {
    this.checkPermission(role, 'edit');

    const suggestions = await this.store.getSuggestions(this.docId);
    const suggestion = suggestions.find(s => s.id === suggestionId);

    if (!suggestion) {
      throw new Error(`Suggestion not found: ${suggestionId}`);
    }

    const status = accept ? 'accepted' : 'rejected';
    await this.store.updateSuggestionStatus(suggestionId, status, userId);

    // If accepted, apply the operation
    if (accept) {
      await this.applyOperation(suggestion.operation, userId, role);
    }

    this.emit('suggestion_reviewed', { suggestionId, accept, userId });

    await this.store.auditLog({
      docId: this.docId,
      userId,
      action: accept ? 'accept_suggestion' : 'reject_suggestion',
      metadata: { suggestionId },
      ipAddress: '',
      userAgent: ''
    });
  }

  /**
   * Broadcast presence update
   */
  async updatePresence(presence: UserPresence): Promise<void> {
    await this.store.upsertPresence(presence);
    this.emit('presence', presence);
  }

  /**
   * Get active users
   */
  async getPresence(): Promise<UserPresence[]> {
    return this.store.getPresence(this.docId);
  }

  /**
   * Compact snapshot (combine ops into snapshot)
   */
  async compact(): Promise<void> {
    if (!this.snapshot) return;

    const opsBefore = await this.store.getOperations(this.docId, 0);
    const opsBeforeCount = opsBefore.length;

    // Update snapshot with current content
    await this.store.updateSnapshot(
      this.docId,
      this.snapshot.content,
      this.snapshot.attributes,
      this.snapshot.clock
    );

    // Mark old ops as tombstones
    const tombstoneIds = opsBefore.slice(0, -100).map(op => op.id); // Keep last 100
    await this.store.markTombstones(tombstoneIds);

    // GC old tombstones (older than 7 days)
    const gcDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const tombstonesRemoved = await this.store.garbageCollect(this.docId, gcDate);

    const opsAfter = await this.store.getOperations(this.docId, 0);
    const opsAfterCount = opsAfter.length;

    await this.store.logCompaction(
      this.docId,
      opsBeforeCount,
      opsAfterCount,
      tombstonesRemoved
    );

    logger.info({
      docId: this.docId,
      opsBefore: opsBeforeCount,
      opsAfter: opsAfterCount,
      tombstonesRemoved
    }, 'Snapshot compacted');
  }

  /**
   * Check RBAC permissions
   */
  private checkPermission(role: CollabRole, action: 'edit' | 'comment'): void {
    if (action === 'edit') {
      if (role !== CollabRole.Owner && role !== CollabRole.Editor) {
        throw new Error(`Insufficient permissions: ${role} cannot edit`);
      }
    }

    if (action === 'comment') {
      if (role === CollabRole.Viewer) {
        throw new Error(`Insufficient permissions: ${role} cannot comment`);
      }
    }
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(userId: string): void {
    const now = Date.now();
    const limit = this.rateLimits.get(userId);

    if (!limit || limit.resetAt < now) {
      this.rateLimits.set(userId, {
        count: 1,
        resetAt: now + 60000 // 1 minute
      });
      return;
    }

    if (limit.count >= this.config.maxOpsPerMinute) {
      throw new Error(
        `Rate limit exceeded: ${limit.count}/${this.config.maxOpsPerMinute} ops/min`
      );
    }

    limit.count++;
  }

  /**
   * Project document size after operation
   */
  private projectDocumentSize(op: Operation): number {
    if (!this.snapshot) return 0;

    let delta = 0;
    if (op.type === 'insert') {
      delta = (op as any).text.length;
    } else if (op.type === 'delete') {
      delta = -(op as any).length;
    } else if (op.type === 'replace') {
      delta = (op as any).text.length - (op as any).length;
    }

    return this.snapshot.content.length + delta;
  }

  /**
   * Shutdown document manager
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      await this.flush();
    }
    this.removeAllListeners();
  }
}
