/**
 * Real-Time Collaboration Types for TEEI CSR Platform
 *
 * Document model with CRDT/OT operations, comments, and suggestions
 * for collaborative editing of report sections and boardroom notes.
 */

/**
 * Document identifier format: reportId:sectionKey
 * Examples:
 * - "report-123:executive_summary"
 * - "report-456:financial_metrics"
 * - "boardroom-789:q3_notes"
 */
export type DocumentId = string;

/**
 * User roles for collaboration permissions
 */
export enum CollabRole {
  Owner = 'owner',        // Full control: edit, comment, manage users
  Editor = 'editor',      // Can edit and comment
  Commenter = 'commenter', // Can only add comments
  Viewer = 'viewer'       // Read-only access
}

/**
 * Operation types for text transformations (Operational Transform)
 */
export enum OperationType {
  Insert = 'insert',
  Delete = 'delete',
  Replace = 'replace',
  SetAttribute = 'set_attribute',
  RemoveAttribute = 'remove_attribute'
}

/**
 * Base operation interface
 */
export interface BaseOperation {
  id: string;              // Unique operation ID (UUID)
  docId: DocumentId;
  userId: string;          // Actor performing the operation
  timestamp: number;       // Unix timestamp (ms)
  clock: number;           // Lamport clock for ordering
}

/**
 * Insert operation: add text at position
 */
export interface InsertOperation extends BaseOperation {
  type: OperationType.Insert;
  position: number;        // Character position (0-indexed)
  text: string;            // Text to insert
}

/**
 * Delete operation: remove text range
 */
export interface DeleteOperation extends BaseOperation {
  type: OperationType.Delete;
  position: number;        // Start position
  length: number;          // Number of characters to delete
}

/**
 * Replace operation: atomic delete + insert
 */
export interface ReplaceOperation extends BaseOperation {
  type: OperationType.Replace;
  position: number;
  length: number;          // Characters to delete
  text: string;            // New text to insert
}

/**
 * Attribute operations for styling/formatting
 */
export interface SetAttributeOperation extends BaseOperation {
  type: OperationType.SetAttribute;
  position: number;
  length: number;
  attribute: string;       // e.g., 'bold', 'italic', 'color'
  value: any;              // Attribute value
}

export interface RemoveAttributeOperation extends BaseOperation {
  type: OperationType.RemoveAttribute;
  position: number;
  length: number;
  attribute: string;
}

/**
 * Union type for all operations
 */
export type Operation =
  | InsertOperation
  | DeleteOperation
  | ReplaceOperation
  | SetAttributeOperation
  | RemoveAttributeOperation;

/**
 * Document snapshot: base state + incremental operations
 */
export interface DocumentSnapshot {
  docId: DocumentId;
  version: number;         // Snapshot version (incremented on publish)
  content: string;         // Current text content
  attributes: AttributeMap; // Character-level attributes
  clock: number;           // Latest Lamport clock
  createdAt: Date;
  createdBy: string;
  isPublished: boolean;    // Immutable published snapshots
}

/**
 * Attribute map: position -> attributes
 */
export type AttributeMap = Record<number, Record<string, any>>;

/**
 * Operation log entry (persisted)
 */
export interface OperationLog {
  id: string;
  docId: DocumentId;
  operation: Operation;
  transformedFrom?: string[]; // IDs of ops this was transformed against
  isTombstone: boolean;    // Marked for GC
  createdAt: Date;
}

/**
 * User presence information
 */
export interface UserPresence {
  userId: string;
  userName: string;
  userEmail: string;
  avatarColor: string;     // Hex color for avatar
  cursor?: TextSelection;  // Current cursor/selection
  isTyping: boolean;
  lastSeen: number;        // Unix timestamp
}

/**
 * Text selection/cursor position
 */
export interface TextSelection {
  start: number;           // Start position
  end: number;             // End position (same as start for cursor)
  isCollapsed: boolean;    // True if cursor, false if selection
}

/**
 * Comment on document
 */
export interface Comment {
  id: string;
  docId: DocumentId;
  userId: string;
  userName: string;
  content: string;
  anchor: TextSelection;   // Text range this comment refers to
  parentId?: string;       // For threaded replies
  createdAt: Date;
  updatedAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

/**
 * Suggestion (track changes mode)
 */
export interface Suggestion {
  id: string;
  docId: DocumentId;
  userId: string;
  userName: string;
  operation: Operation;    // Proposed change
  status: SuggestionStatus;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export enum SuggestionStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Rejected = 'rejected'
}

/**
 * Collaboration session
 */
export interface CollabSession {
  id: string;
  docId: DocumentId;
  userId: string;
  role: CollabRole;
  connectedAt: Date;
  lastActivity: Date;
  transport: 'websocket' | 'sse' | 'rest';
  connectionId?: string;   // WebSocket/SSE connection identifier
}

/**
 * WebSocket message types
 */
export enum WSMessageType {
  // Client -> Server
  Join = 'join',
  Leave = 'leave',
  Operation = 'operation',
  Presence = 'presence',
  Comment = 'comment',
  Suggestion = 'suggestion',
  Ping = 'ping',

  // Server -> Client
  Welcome = 'welcome',
  Snapshot = 'snapshot',
  OperationBroadcast = 'operation_broadcast',
  PresenceBroadcast = 'presence_broadcast',
  CommentBroadcast = 'comment_broadcast',
  SuggestionBroadcast = 'suggestion_broadcast',
  Pong = 'pong',
  Error = 'error'
}

/**
 * WebSocket message envelope
 */
export interface WSMessage<T = any> {
  type: WSMessageType;
  payload: T;
  timestamp: number;
  requestId?: string;      // For request/response correlation
}

/**
 * Join session payload
 */
export interface JoinPayload {
  docId: DocumentId;
  token: string;           // JWT auth token
}

/**
 * Welcome message (initial state)
 */
export interface WelcomePayload {
  sessionId: string;
  snapshot: DocumentSnapshot;
  operations: Operation[]; // Pending ops since snapshot
  users: UserPresence[];   // Currently active users
  role: CollabRole;
}

/**
 * Operation batch (for flush every 50ms)
 */
export interface OperationBatch {
  operations: Operation[];
  clock: number;           // Highest clock in batch
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxOpsPerMinute: number; // Per user
  maxDocSize: number;      // Characters
  maxUsers: number;        // Concurrent users per doc
  batchFlushMs: number;    // Operation batch interval
}

/**
 * Audit log entry
 */
export interface AuditLog {
  id: string;
  docId: DocumentId;
  userId: string;
  action: 'join' | 'leave' | 'operation' | 'comment' | 'suggestion' | 'publish';
  metadata: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

/**
 * Metrics for observability
 */
export interface CollabMetrics {
  operationsPerSecond: number;
  queueDepth: number;
  reconnects: number;
  p95OperationRTT: number; // Round-trip time in ms
  activeUsers: number;
  activeDocs: number;
}
