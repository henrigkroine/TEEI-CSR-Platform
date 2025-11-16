/**
 * Snapshot Types for 3-Level Cache System
 *
 * Supports Boardroom Mode offline/disconnection scenarios
 * with in-memory, IndexedDB, and API-based snapshot retrieval.
 */

/**
 * Chart data structure for snapshot storage
 */
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

/**
 * Complete snapshot of dashboard state at a point in time
 */
export interface Snapshot {
  /** Unique snapshot identifier */
  id: string;

  /** Company/tenant identifier */
  companyId: string;

  /** Unix timestamp (milliseconds) when snapshot was created */
  timestamp: number;

  /** Snapshot payload (may be compressed string if compressed=true) */
  data: {
    kpis: Record<string, number>;
    charts: Record<string, ChartData>;
  } | string; // String when compressed

  /** Whether data is LZ-compressed */
  compressed: boolean;

  /** Compression ratio (compressed size / original size) if compressed */
  compressionRatio?: number;
}

/**
 * Lightweight snapshot metadata for listing/filtering
 */
export interface SnapshotMetadata {
  /** Snapshot ID */
  id: string;

  /** Creation timestamp */
  timestamp: number;

  /** Approximate size in bytes */
  size: number;

  /** Compression status */
  compressed: boolean;
}

/**
 * Snapshot save trigger reasons (for telemetry/audit)
 */
export enum SnapshotTrigger {
  /** Manual save by user */
  MANUAL = 'manual',

  /** Auto-save after N events */
  EVENT_THRESHOLD = 'event_threshold',

  /** Auto-save after time interval */
  TIME_INTERVAL = 'time_interval',

  /** Pre-disconnect save */
  PRE_DISCONNECT = 'pre_disconnect',

  /** Initial snapshot on load */
  INITIAL_LOAD = 'initial_load',
}

/**
 * Cache level enum for performance tracking
 */
export enum CacheLevel {
  /** In-memory ring buffer (fastest) */
  MEMORY = 'memory',

  /** IndexedDB persistent storage */
  INDEXED_DB = 'indexed_db',

  /** API fetch (slowest, fallback) */
  API = 'api',

  /** No data available */
  NONE = 'none',
}

/**
 * Snapshot retrieval result with performance metadata
 */
export interface SnapshotResult {
  /** Retrieved snapshot (null if not found) */
  snapshot: Snapshot | null;

  /** Cache level that provided the data */
  source: CacheLevel;

  /** Retrieval time in milliseconds */
  retrievalTimeMs: number;

  /** Whether snapshot was decompressed */
  wasDecompressed: boolean;
}
