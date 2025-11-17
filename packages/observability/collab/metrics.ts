/**
 * Observability Metrics for Real-Time Collaboration
 *
 * Prometheus metrics for monitoring collaboration performance,
 * health, and resource usage.
 */

import { Counter, Gauge, Histogram, register } from 'prom-client';

/**
 * Operation throughput
 */
export const operationsPerSecond = new Counter({
  name: 'collab_operations_total',
  help: 'Total number of operations processed',
  labelNames: ['docId', 'type', 'userId'],
  registers: [register]
});

/**
 * Operation queue depth (backpressure indicator)
 */
export const queueDepth = new Gauge({
  name: 'collab_queue_depth',
  help: 'Number of operations in flush queue',
  labelNames: ['docId'],
  registers: [register]
});

/**
 * Operation round-trip time (latency)
 */
export const operationRTT = new Histogram({
  name: 'collab_operation_rtt_ms',
  help: 'Operation round-trip time in milliseconds',
  labelNames: ['docId', 'type', 'transport'],
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [register]
});

/**
 * Active users per document
 */
export const activeUsers = new Gauge({
  name: 'collab_active_users',
  help: 'Number of active users per document',
  labelNames: ['docId'],
  registers: [register]
});

/**
 * Active documents
 */
export const activeDocs = new Gauge({
  name: 'collab_active_docs',
  help: 'Number of documents with active sessions',
  registers: [register]
});

/**
 * Reconnect attempts
 */
export const reconnects = new Counter({
  name: 'collab_reconnects_total',
  help: 'Total number of reconnect attempts',
  labelNames: ['userId', 'docId', 'success'],
  registers: [register]
});

/**
 * Merge conflicts
 */
export const mergeConflicts = new Counter({
  name: 'collab_merge_conflicts_total',
  help: 'Total number of merge conflicts during reconnect',
  labelNames: ['docId', 'userId', 'resolved'],
  registers: [register]
});

/**
 * WebSocket connections
 */
export const wsConnections = new Gauge({
  name: 'collab_ws_connections',
  help: 'Number of active WebSocket connections',
  registers: [register]
});

/**
 * SSE connections
 */
export const sseConnections = new Gauge({
  name: 'collab_sse_connections',
  help: 'Number of active SSE connections',
  registers: [register]
});

/**
 * Snapshot compaction duration
 */
export const compactionDuration = new Histogram({
  name: 'collab_compaction_duration_ms',
  help: 'Snapshot compaction duration in milliseconds',
  labelNames: ['docId'],
  buckets: [100, 500, 1000, 2500, 5000, 10000],
  registers: [register]
});

/**
 * Operations compressed
 */
export const operationsCompressed = new Counter({
  name: 'collab_operations_compressed_total',
  help: 'Number of operations compressed during flush',
  labelNames: ['docId'],
  registers: [register]
});

/**
 * Rate limit hits
 */
export const rateLimitHits = new Counter({
  name: 'collab_rate_limit_hits_total',
  help: 'Number of times rate limit was hit',
  labelNames: ['userId', 'docId'],
  registers: [register]
});

/**
 * Document size
 */
export const documentSize = new Gauge({
  name: 'collab_document_size_chars',
  help: 'Document size in characters',
  labelNames: ['docId'],
  registers: [register]
});

/**
 * Comments created
 */
export const commentsCreated = new Counter({
  name: 'collab_comments_total',
  help: 'Total number of comments created',
  labelNames: ['docId', 'userId'],
  registers: [register]
});

/**
 * Suggestions created
 */
export const suggestionsCreated = new Counter({
  name: 'collab_suggestions_total',
  help: 'Total number of suggestions created',
  labelNames: ['docId', 'userId', 'status'],
  registers: [register]
});

/**
 * Audit log entries
 */
export const auditLogEntries = new Counter({
  name: 'collab_audit_log_entries_total',
  help: 'Total number of audit log entries',
  labelNames: ['action', 'docId'],
  registers: [register]
});

/**
 * Data loss incidents (should be 0)
 */
export const dataLoss = new Counter({
  name: 'collab_data_loss_total',
  help: 'Number of data loss incidents (CRITICAL)',
  labelNames: ['docId', 'userId'],
  registers: [register]
});

/**
 * Transform errors
 */
export const transformErrors = new Counter({
  name: 'collab_transform_errors_total',
  help: 'Number of OT transform errors',
  labelNames: ['docId', 'opType'],
  registers: [register]
});

/**
 * Helper: Record operation metrics
 */
export function recordOperation(
  docId: string,
  type: string,
  userId: string,
  rttMs: number,
  transport: 'websocket' | 'sse' | 'rest'
): void {
  operationsPerSecond.inc({ docId, type, userId });
  operationRTT.observe({ docId, type, transport }, rttMs);
}

/**
 * Helper: Record reconnect
 */
export function recordReconnect(
  userId: string,
  docId: string,
  success: boolean
): void {
  reconnects.inc({ userId, docId, success: success ? 'true' : 'false' });
}

/**
 * Helper: Record merge conflict
 */
export function recordMergeConflict(
  docId: string,
  userId: string,
  resolved: boolean
): void {
  mergeConflicts.inc({ docId, userId, resolved: resolved ? 'true' : 'false' });
}

/**
 * Helper: Update active users
 */
export function updateActiveUsers(docId: string, count: number): void {
  activeUsers.set({ docId }, count);
}

/**
 * Helper: Update active docs
 */
export function updateActiveDocs(count: number): void {
  activeDocs.set(count);
}

/**
 * Helper: Record compaction
 */
export function recordCompaction(docId: string, durationMs: number): void {
  compactionDuration.observe({ docId }, durationMs);
}

/**
 * Helper: Record rate limit hit
 */
export function recordRateLimitHit(userId: string, docId: string): void {
  rateLimitHits.inc({ userId, docId });
}

/**
 * Helper: Update document size
 */
export function updateDocumentSize(docId: string, sizeChars: number): void {
  documentSize.set({ docId }, sizeChars);
}

/**
 * Helper: Record comment
 */
export function recordComment(docId: string, userId: string): void {
  commentsCreated.inc({ docId, userId });
}

/**
 * Helper: Record suggestion
 */
export function recordSuggestion(
  docId: string,
  userId: string,
  status: string
): void {
  suggestionsCreated.inc({ docId, userId, status });
}

/**
 * Helper: Record audit log entry
 */
export function recordAuditLog(action: string, docId: string): void {
  auditLogEntries.inc({ action, docId });
}

/**
 * Helper: Record data loss (CRITICAL)
 */
export function recordDataLoss(docId: string, userId: string): void {
  dataLoss.inc({ docId, userId });
  console.error(`[CRITICAL] Data loss incident: docId=${docId}, userId=${userId}`);
}

/**
 * Helper: Record transform error
 */
export function recordTransformError(docId: string, opType: string): void {
  transformErrors.inc({ docId, opType });
}

/**
 * Get metrics endpoint handler
 */
export async function getMetricsHandler(): Promise<string> {
  return register.metrics();
}
