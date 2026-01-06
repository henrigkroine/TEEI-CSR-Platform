# SSE Resilience Architecture for Boardroom Mode

**Version**: 1.0 (Design Phase)
**Date**: 2025-11-15
**Branch**: `claude/worker3-phaseE-cockpit-polish-01DEt2S7UMEooTBJBivWKcpD`
**Status**: Design Complete (Ready for Implementation)
**Time Budget**: 2-3 hours (architect: design only, implementer: code)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [State Machine Design](#state-machine-design)
3. [Backoff Strategy Specification](#backoff-strategy-specification)
4. [Last-Event-ID Resume Flow](#last-event-id-resume-flow)
5. [Snapshot Caching Architecture](#snapshot-caching-architecture)
6. [Boardroom Mode UX Specification](#boardroom-mode-ux-specification)
7. [Error Handling & User Notifications](#error-handling--user-notifications)
8. [Performance Targets](#performance-targets)
9. [Implementation Plan](#implementation-plan)
10. [Testing Strategy](#testing-strategy)
11. [Appendix](#appendix)

---

## Executive Summary

### Problem Statement

The TEEI Corporate Cockpit's "Boardroom Mode" is a full-screen KPI dashboard designed for executive presentations on large displays (TVs, projectors). Current SSE implementation lacks resilience to handle:

- **Network interruptions**: No graceful degradation or user feedback
- **Event loss**: Missing events during reconnection without event replay
- **User experience**: No offline fallback with cached snapshots
- **Performance**: No exponential backoff with jitter, risking server overload during outages
- **Accessibility**: No screen reader announcements for connection state changes

### Solution Approach

Design a **production-grade SSE resilience system** with:

1. **Finite State Machine** for robust connection lifecycle management
2. **Exponential Backoff + Jitter** to prevent thundering herd on server recovery
3. **Last-Event-ID Resume** using EventSource specification for gap-free event replay
4. **IndexedDB Snapshot Cache** with ring buffer for offline fallback
5. **Full-Screen Boardroom UX** with connection state indicators and offline banners
6. **Comprehensive Error Handling** with user-facing notifications

### Key Metrics

| Metric | Target | Justification |
|--------|--------|---------------|
| P95 reconnect time | ≤ 5s | Boardroom viewers should see updates within acceptable lag |
| P99 reconnect time | ≤ 10s | Maximum acceptable wait before "offline" banner appears |
| Memory footprint | ≤ 50MB | Snapshot cache limited to prevent browser memory issues |
| Battery impact | Minimal | No excessive polling or failed retry attempts |
| Event loss | 0 | Last-Event-ID ensures no missed events during gaps |

---

## State Machine Design

### State Diagram

```
                    ┌─────────────────────────────────┐
                    │      [disconnected]              │
                    │  (initial state, no connection)  │
                    └──────────────┬────────────────────┘
                                   │
                                   │ connect()
                                   ▼
                    ┌─────────────────────────────────┐
                    │      [connecting]                │
                    │ (opening EventSource, await open)│
                    └──────────────┬────────────────────┘
                          │         │
              success ─────┘         └───── failure/error
              (open event)              (network error,
                    │                    timeout)
                    ▼                         │
         ┌──────────────────┐              ▼
         │   [connected]    │        ┌────────────┐
         │ (receiving       │        │  [error]   │
         │  events)         │        │(retryable) │
         └────┬─────────────┘        └─────┬──────┘
              │                            │
              │ network loss               │ scheduleReconnect()
              │ error event                │ (exponential backoff)
              │ readyState=CLOSED          │
              └────────────┬───────────────┘
                           │
                           ▼
         ┌──────────────────────────────────┐
         │    [reconnecting]                 │
         │  (waiting, exponential backoff)   │
         │  last_event_id tracked           │
         └────┬──────────────┬──────────────┘
              │              │
              │              │ max_retries_exceeded
         reconnect()          │
              │               ▼
              │         ┌──────────────┐
              │         │  [failed]    │
              │         │(user action  │
              │         │ required)    │
              ▼         └──────────────┘
         [connecting]
         (attempt to
          reconnect)

        (Optionally:)
        [failed] --manual-disconnect--> [disconnected]
```

### State Definitions

#### 1. **disconnected** (Initial State)
- **Description**: No active EventSource, no connection attempt in progress
- **Entry conditions**:
  - Initial state
  - Manual disconnect
  - User navigates away
- **Exit conditions**: `connect()` called
- **Data retained**:
  - `lastEventId` (persisted)
  - `lastSnapshot` (in memory)
- **UI**: No banner (normal display)

#### 2. **connecting**
- **Description**: EventSource opened, awaiting `open` event
- **Timeout**: 5 seconds (if no response, treat as error)
- **Entry conditions**: `connect()` called from `disconnected` or `reconnecting`
- **Exit conditions**:
  - `open` event → `connected`
  - Error → `error`
  - Timeout → `error`
- **Data changes**: Clear error state
- **UI**: Spinner or subtle pulse animation

#### 3. **connected**
- **Description**: EventSource active, events flowing normally
- **Entry conditions**: `open` event received
- **Exit conditions**:
  - `readyState === CLOSED` → `reconnecting`
  - Error event → `reconnecting`
  - Network offline detected → `reconnecting`
- **Data updates**:
  - Update `lastEventId` on each event
  - Save snapshot to IndexedDB every 30 events
  - Reset retry counter
- **UI**: Green indicator, "Live"

#### 4. **error** (Retryable)
- **Description**: Connection error, waiting before retry
- **Retryable errors**:
  - Network timeout
  - 503 Service Unavailable
  - 429 Too Many Requests
  - Socket hang up
- **Non-retryable errors**:
  - 401 Unauthorized (auth needed)
  - 403 Forbidden (permission issue)
- **Entry conditions**: Error from `connecting` state
- **Exit conditions**:
  - Backoff delay expires → `reconnecting`
  - User clicks "Retry" → `connecting`
  - Max retries exceeded → `failed`
- **Data changes**: Increment retry counter, log error
- **UI**: Yellow warning icon, error message in toast

#### 5. **reconnecting**
- **Description**: Waiting for exponential backoff delay before attempting connection
- **Entry conditions**: Error event or connection loss
- **Exit conditions**:
  - Backoff delay expires, `connect()` called → `connecting`
  - Max retries exceeded → `failed`
  - Manual disconnect → `disconnected`
- **Data tracked**:
  - Retry attempt number (1-10)
  - Calculated backoff delay (2s to 32s)
  - Elapsed time since disconnection
- **UI**: "Reconnecting..." banner with attempt count and ETA

#### 6. **failed** (Permanent)
- **Description**: Unable to reconnect after all retries exhausted
- **Entry conditions**: Max retries (10) exceeded
- **Exit conditions**:
  - User clicks "Manual Reconnect" → `connecting`
  - Manual disconnect → `disconnected`
- **Data**: Error details, timestamp of failure
- **UI**:
  - Red error banner
  - "Manual Reconnect" button
  - Phone home / contact support link
  - Show stale data with age indicator

### State Transition Table

| From | Event | To | Action | Conditions |
|------|-------|----|----|----------|
| disconnected | connect() | connecting | Create EventSource, set timeout | - |
| connecting | open | connected | Clear retry counter, emit event | timeout < 5s |
| connecting | error | error | Log error, schedule retry | retryable |
| connecting | timeout (5s) | error | Treat as network error, schedule retry | - |
| error | (backoff elapsed) | reconnecting | - | retry_count < max |
| error | (backoff elapsed) | failed | Emit final error event | retry_count >= max |
| error | retry (user click) | connecting | Reset backoff, attempt immediately | - |
| reconnecting | (backoff elapsed) | connecting | Call connect() | retry_count < max |
| reconnecting | disconnect() | disconnected | Cancel backoff timer | - |
| connected | message | - | Update lastEventId, process event | - |
| connected | error | reconnecting | Schedule retry | - |
| connected | offline (navigator.onLine) | reconnecting | Schedule retry | - |
| failed | retry (user click) | connecting | Reset retry_count, attempt immediately | - |
| failed | disconnect() | disconnected | Cancel all timers | - |
| any | error (non-retryable) | failed | Emit error, do not retry | status 401/403 |

### State Data Structure

```typescript
interface SSEConnectionState {
  // Current state
  state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'failed';

  // Retry tracking
  retryAttempt: number;        // 0-10
  maxRetries: number;           // Default: 10
  nextRetryDelay: number;       // ms until next retry

  // Event tracking
  lastEventId: string | null;   // For resume
  lastEventTimestamp: number;   // When last event arrived
  eventsReceived: number;       // Total since connect()

  // Error tracking
  lastError: {
    message: string;
    code?: string;
    timestamp: number;
    retryable: boolean;
  } | null;

  // Timing
  connectedAt: number | null;         // Timestamp when entered 'connected'
  disconnectedAt: number | null;      // Timestamp when left 'connected'
  backoffStartedAt: number | null;    // Timestamp when backoff started

  // Performance metrics
  reconnectDuration: number;  // ms from disconnect to reconnect
  averageEventDelay: number;  // ms
}
```

---

## Backoff Strategy Specification

### Mathematical Formula

```
delay = min(baseDelay × 2^attempt + jitter, maxDelay)

where:
  baseDelay = 2000 ms (2 seconds)
  maxDelay = 32000 ms (32 seconds)
  attempt = 0..9 (retry count)
  jitter = random(0, 1000) ms (random offset to prevent thundering herd)
```

### Calculated Delays Table

| Attempt | Formula | Base (2^n) | Base Delay | Jitter | Total Min | Total Max | Avg |
|---------|---------|-----------|-----------|--------|-----------|-----------|-----|
| 1 | 2 × 2^0 + jitter | 1 | 2,000 | 0-1,000 | 2,000 | 3,000 | 2,500 |
| 2 | 2 × 2^1 + jitter | 2 | 4,000 | 0-1,000 | 4,000 | 5,000 | 4,500 |
| 3 | 2 × 2^2 + jitter | 4 | 8,000 | 0-1,000 | 8,000 | 9,000 | 8,500 |
| 4 | 2 × 2^3 + jitter | 8 | 16,000 | 0-1,000 | 16,000 | 17,000 | 16,500 |
| 5 | 2 × 2^4 + jitter | 16 | 32,000 | capped | 32,000 | 32,000 | 32,000 |
| 6 | 2 × 2^5 + jitter | 32 | 64,000 → 32,000 | capped | 32,000 | 32,000 | 32,000 |
| 7 | 2 × 2^6 + jitter | 64 | 128,000 → 32,000 | capped | 32,000 | 32,000 | 32,000 |
| 8 | 2 × 2^7 + jitter | 128 | 256,000 → 32,000 | capped | 32,000 | 32,000 | 32,000 |
| 9 | 2 × 2^8 + jitter | 256 | 512,000 → 32,000 | capped | 32,000 | 32,000 | 32,000 |
| 10 | 2 × 2^9 + jitter | 512 | 1,024,000 → 32,000 | capped | 32,000 | 32,000 | 32,000 |

### Rationale

**Why Exponential Backoff?**
- Prevents "thundering herd" during server outage recovery
- Reduces load as failures accumulate
- Standard approach in distributed systems (AWS SDK, gRPC)

**Why Jitter?**
- Spreads retry attempts across time window
- Prevents multiple clients reconnecting simultaneously
- Reduces chance of cascading failures

**Why Cap at 32 seconds?**
- After 5 attempts (~16s cumulative), benefit of longer delays diminishes
- Battery impact minimized (reduces wake-ups for mobile)
- User perceives connection as "failed" around 30-45s anyway
- Server load normalized by then

**Why Start at 2 Seconds?**
- Fast failure detection for transient network glitches
- Not too aggressive to respect server health
- Users notice lag within 2-3 seconds anyway

### Jitter Implementation

```typescript
function calculateBackoff(attempt: number): number {
  const baseDelay = 2000;
  const maxDelay = 32000;

  // Exponential: 2, 4, 8, 16, 32, 32, 32, 32, 32, 32
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add jitter: 0-1000ms random
  const jitter = Math.random() * 1000;

  return cappedDelay + jitter;
}

// Examples:
// attempt=0 → 2000 + jitter → 2,000-3,000ms ✓
// attempt=3 → 16000 + jitter → 16,000-17,000ms ✓
// attempt=5 → min(64000, 32000) + jitter → 32,000ms ✓
```

### Adaptive Backoff Consideration (Future)

**Not implemented in Phase E**, but noted for Phase F:
- Monitor server health (`Retry-After` header)
- Adjust backoff based on server response
- Use Circuit Breaker pattern to fast-fail permanently broken connections

---

## Last-Event-ID Resume Flow

### Overview

The EventSource API supports resuming from a specific event ID. When a client loses connection, the server can replay events sent after that point.

### Implementation Strategy

#### 1. Client Side: Tracking Last Event ID

```typescript
// When each event arrives:
private handleMessage(event: MessageEvent): void {
  const eventId = event.lastEventId || this.generateEventId();

  // Store for next reconnection
  this.lastEventId = eventId;

  // Persist to localStorage (fallback if page reload)
  localStorage.setItem(
    `teei-sse-lastEventId-${this.companyId}`,
    eventId
  );

  // Process the event
  this.processEvent(eventId, event.data);
}
```

#### 2. Client Side: Sending Last Event ID on Reconnect

```typescript
private connect(): void {
  const url = new URL(this.options.url);

  // Add company ID
  url.searchParams.set('companyId', this.options.companyId);

  // Resume from last event (if known)
  if (this.lastEventId) {
    url.searchParams.set('lastEventId', this.lastEventId);
  }

  // EventSource automatically sends Last-Event-ID header
  this.eventSource = new EventSource(url.toString());
}
```

#### 3. Server Side: Resume Logic

```typescript
// GET /sse/metrics?companyId=:id&lastEventId=:id
async handleSSE(request, response) {
  const { companyId, lastEventId } = request.query;

  // Start streaming response
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('Access-Control-Allow-Origin', '*');

  // Resume from lastEventId if provided
  let startFrom = lastEventId || null;

  // Query backlog of events since lastEventId
  const missedEvents = await getEventsSince(
    companyId,
    startFrom,
    maxBacklogSize: 100  // Last 100 events
  );

  // Replay missed events first
  for (const event of missedEvents) {
    response.write(`id: ${event.id}\n`);
    response.write(`event: ${event.type}\n`);
    response.write(`data: ${JSON.stringify(event.data)}\n\n`);
  }

  // Then stream live events
  const subscription = subscribeToMetricUpdates(companyId);
  subscription.on('event', (event) => {
    response.write(`id: ${event.id}\n`);
    response.write(`event: ${event.type}\n`);
    response.write(`data: ${JSON.stringify(event.data)}\n\n`);
  });

  // Cleanup on disconnect
  request.on('close', () => {
    subscription.unsubscribe();
  });
}
```

### Resume Flow Diagram

```
Client Disconnection → Offline for 30s → Network Returns

┌─────────────────────────────────┐
│  Client detects connection lost  │
│  State: [connected] → [error]    │
│  Retain: lastEventId = "evt-123" │
└────────────┬────────────────────┘
             │
             │ (wait 8 seconds with jitter)
             │
             ▼
┌─────────────────────────────────┐
│ Exponential backoff elapsed      │
│ State: [error] → [reconnecting]  │
└────────────┬────────────────────┘
             │
             │ connect()
             │ GET /sse/metrics?companyId=X&lastEventId=evt-123
             │
             ▼
┌──────────────────────────────────────┐
│ Server receives request with resume  │
│ Looks up events since evt-123        │
│ Finds: evt-124, evt-125, evt-126    │
└────────────┬─────────────────────────┘
             │
             │ Response starts:
             │ id: evt-124
             │ event: metric_update
             │ data: {...}
             │
             │ id: evt-125
             │ event: metric_update
             │ data: {...}
             │
             │ (replayed in 50ms)
             │
             ▼
┌──────────────────────────────────────┐
│ Client receives missed events        │
│ Processes in order: evt-124, evt-125 │
│ Updates metrics and charts           │
│ Then receives live events: evt-127...│
│ State: [reconnecting] → [connected]  │
└──────────────────────────────────────┘
```

### Edge Cases & Solutions

#### Case 1: No Last Event ID Available
**Scenario**: User opens Boardroom Mode for first time, no localStorage history

**Solution**:
- Send request without `lastEventId` parameter
- Server starts from current time
- Client loads snapshot from IndexedDB or `GET /metrics/snapshot` API
- Display snapshot + live updates (ok to miss older events)

#### Case 2: Server Has Purged Old Events
**Scenario**: Client offline for 2 hours, server event backlog only 1 hour

**Solution**:
- Server returns HTTP 410 Gone (Gone) or 400 Bad Request
- Client fallback: Request full snapshot from API
- Load snapshot + resume with current events
- Log warning: "Missed events, refreshed from snapshot"

#### Case 3: Event ID Format Changes
**Scenario**: Server migrates to new event ID format (UUID vs timestamp-based)

**Solution**:
- Use semantic versioning in event ID: `evt-v1:xyz`
- Client validates format before sending
- If format mismatch, discard lastEventId and request fresh snapshot
- Log error and notify ops

#### Case 4: Page Reload During Offline
**Scenario**: User is offline, closes tab, reopens → should resume from cache

**Solution**:
- Persist `lastEventId` to localStorage (not just memory)
- Read on initialization: `localStorage.getItem('teei-sse-lastEventId-${companyId}')`
- Send with first reconnection attempt
- Clean up localStorage on logout

#### Case 5: Multiple Tabs Open
**Scenario**: Two tabs open to Boardroom Mode, one goes offline

**Solution**:
- Use `localStorage` + `storage` event listener to sync state
- When one tab updates `lastEventId`, other tabs notified
- Prevents duplicate event processing
- Reduces server load (one reconnection, not two)

```typescript
// In one tab
localStorage.setItem('teei-sse-state', JSON.stringify({
  lastEventId: 'evt-789',
  timestamp: Date.now()
}));

// In other tabs
window.addEventListener('storage', (event) => {
  if (event.key === 'teei-sse-state') {
    const newState = JSON.parse(event.newValue);
    this.lastEventId = newState.lastEventId;
  }
});
```

---

## Snapshot Caching Architecture

### Purpose

When offline or during extended outages, display last-known metrics instead of blank screen. Snapshots are KPI values + chart data at a point in time.

### Storage Architecture

#### Level 1: In-Memory Ring Buffer (Fast Access)

```typescript
class SnapshotRingBuffer {
  private buffer: Snapshot[] = [];
  private maxSize: number = 3;  // Keep last 3 snapshots in memory
  private writeIndex: number = 0;

  push(snapshot: Snapshot): void {
    this.buffer[this.writeIndex] = snapshot;
    this.writeIndex = (this.writeIndex + 1) % this.maxSize;
  }

  latest(): Snapshot | null {
    if (this.buffer.length === 0) return null;
    const index = (this.writeIndex - 1 + this.maxSize) % this.maxSize;
    return this.buffer[index];
  }

  all(): Snapshot[] {
    // Return in chronological order
    return this.buffer.filter(s => s !== undefined);
  }
}
```

**Rationale**:
- Fixed size: O(1) memory, no GC pressure
- Latest snapshot accessible in microseconds
- Good for frequent access during live streaming
- Loss tolerable (IndexedDB backup exists)

#### Level 2: IndexedDB Persistent Store

```typescript
interface Snapshot {
  id: string;                    // UUID
  companyId: string;             // Tenant ID
  timestamp: number;             // When snapshot was taken (ms)
  expiresAt: number;             // TTL: 24 hours

  // Metric snapshot
  data: {
    kpis: Record<string, {
      value: number;
      unit: string;
      trend?: 'up' | 'down' | 'neutral';
      target?: number;
    }>;

    charts: Record<string, {
      type: 'line' | 'bar' | 'pie' | 'scatter';
      title: string;
      datasets: Array<{
        label: string;
        data: number[];
        backgroundColor?: string;
        borderColor?: string;
      }>;
      labels: string[];
    }>;

    timestamp: number;  // When metrics were captured
    status: 'healthy' | 'degraded' | 'offline';
  };

  compressed: boolean;           // true if data is LZ-compressed
  compressedSize: number;        // Bytes after compression
  uncompressedSize: number;      // Bytes before compression
  compressionRatio: number;      // For monitoring
}

interface SnapshotStore {
  snapshots: [
    {
      keyPath: 'id',
      autoIncrement: false
    }
  ];
  indexes: [
    { name: 'byCompanyId', keyPath: 'companyId' },
    { name: 'byTimestamp', keyPath: 'timestamp' },
    { name: 'byExpiresAt', keyPath: 'expiresAt' }
  ];
}
```

**Store Retention Policy**:
- Keep last 10 snapshots per tenant (in IndexedDB)
- Delete snapshots older than 24 hours
- Run cleanup on app idle (`requestIdleCallback`)
- Limit total DB size to 50MB per tenant

#### Level 3: API Snapshot Endpoint (Full Refresh)

```
GET /v1/reporting/snapshot?companyId=:id

Response:
{
  snapshot: {
    timestamp: 1731681234000,
    data: {
      kpis: {...},
      charts: {...}
    }
  },
  lastEventId: "evt-456",  // Resume point
  status: "healthy"
}
```

**When to use**:
- Initial Boardroom Mode load (before SSE connected)
- Server cannot provide event replay (event ID too old)
- User clicks "Refresh" during offline mode

### Compression Strategy

For large snapshots (>100KB), use LZ-string compression:

```typescript
import LZ from 'lz-string';

class CompressedSnapshot {
  compress(snapshot: Snapshot): string {
    const json = JSON.stringify(snapshot.data);
    const compressed = LZ.compressToBase64(json);

    // Track metrics
    const uncompressed = json.length;
    const compressed_size = compressed.length;

    return {
      ...snapshot,
      data: compressed,
      compressed: true,
      uncompressedSize: uncompressed,
      compressedSize: compressed_size,
      compressionRatio: (1 - compressed_size / uncompressed) * 100
    };
  }

  decompress(snapshot: Snapshot): Snapshot {
    if (!snapshot.compressed) {
      return snapshot;
    }

    const decompressed = LZ.decompressFromBase64(snapshot.data);
    return {
      ...snapshot,
      data: JSON.parse(decompressed),
      compressed: false
    };
  }
}
```

**Compression Threshold Decision**:
- Compress if uncompressed > 100KB
- Typical snapshot: 30-80KB → skip compression
- Report-heavy snapshot: 200-500KB → compress (saves 70-80%)
- Avoid over-compression (CPU cost not worth it for small payloads)

### Save Triggers

```
Trigger 1: Event-based (Every N events)
├─ After 30 metric_update events
├─ Save to IndexedDB (async, non-blocking)
└─ Update in-memory ring buffer

Trigger 2: Time-based (Periodic)
├─ Every 5 minutes (regardless of events)
├─ Useful when metrics update infrequently
└─ Prevents stale snapshot display

Trigger 3: Manual (User action)
├─ User clicks "Save Snapshot" in UI
├─ Useful for audit/comparison
└─ Explicitly saved to "pin" a moment in time

Trigger 4: Before disconnect
├─ When entering offline mode or failed state
├─ Ensures latest data persisted
└─ Snapshot load() on next session shows current data
```

### Load Triggers

```
Trigger 1: Offline mode
├─ User loses network (navigator.onLine === false)
├─ Load latest snapshot from memory or IndexedDB
├─ Display with "OFFLINE - Last updated: X mins ago" banner
└─ Show "Resume Live" button

Trigger 2: Extended outage (>30s)
├─ Still connected but unable to get events (server down)
├─ Fall back to latest snapshot after 30s wait
├─ Display "Reconnecting... (using cached data)" banner
└─ Update with live events as they arrive

Trigger 3: Page load
├─ On initial Boardroom Mode load
├─ Request snapshot from API for latest + lastEventId
├─ While SSE connection establishing, show snapshot
└─ Ensures no blank screen during startup

Trigger 4: User manual refresh
├─ User clicks "Refresh Snapshot" button
├─ Explicitly request fresh snapshot from API
└─ Override any cached version
```

### TTL & Cleanup

```typescript
class SnapshotManager {
  async saveSnapshot(snapshot: Snapshot): Promise<void> {
    snapshot.expiresAt = Date.now() + 24 * 60 * 60 * 1000;  // 24h

    await db.snapshots.put(snapshot);

    // Cleanup old snapshots
    this.scheduleCleanup();
  }

  async cleanup(): Promise<void> {
    const now = Date.now();

    // Delete expired
    const expired = await db.snapshots
      .where('expiresAt')
      .below(now)
      .delete();

    // Keep only last 10 per company
    const companies = await db.snapshots
      .toCollection()
      .distinctUntilChanged(s => s.companyId)
      .toArray();

    for (const companyId of companies) {
      const snapshots = await db.snapshots
        .where('companyId')
        .equals(companyId)
        .reverse()  // Newest first
        .offset(10)  // Keep last 10
        .delete();
    }

    // Enforce 50MB limit
    const stats = await this.getStoreStats();
    if (stats.totalSize > 50 * 1024 * 1024) {
      // Delete oldest snapshots until under limit
      const toDelete = await db.snapshots
        .orderBy('timestamp')
        .limit(Math.ceil(stats.totalSize / 1024 / 1024))  // Delete ~1-2 snapshots
        .delete();
    }
  }

  scheduleCleanup(): void {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => this.cleanup(), { timeout: 30000 });
    } else {
      setTimeout(() => this.cleanup(), 60000);
    }
  }
}
```

### Snapshot Display UX

```
┌─────────────────────────────────────────────────┐
│  TEEI Corporate Cockpit - Boardroom Mode        │
│  ⚠️ OFFLINE - Last updated: 5 mins ago           │
├─────────────────────────────────────────────────┤
│                                                 │
│  Revenue Generated: $4.2M                       │
│  (from 5 mins ago)                              │
│                                                 │
│  [RESUME LIVE UPDATES] [REFRESH]                │
│                                                 │
│  Chart showing historical data...               │
│                                                 │
└─────────────────────────────────────────────────┘

When ONLINE:
┌─────────────────────────────────────────────────┐
│  TEEI Corporate Cockpit - Boardroom Mode        │
│  🟢 LIVE                                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  Revenue Generated: $4.35M (live)               │
│  Last updated: 2 seconds ago                    │
│                                                 │
│  [AUTO-REFRESH: ON]                             │
│                                                 │
│  Chart showing real-time data...                │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Boardroom Mode UX Specification

### Activation

#### Trigger Methods

**Method 1: F11 (Fullscreen Shortcut)**
```
User presses F11
├─ Detect via keydown event listener
├─ Trigger Boardroom Mode + fullscreen
├─ Show message: "Press F11 again or Esc to exit"
└─ Store preference in sessionStorage
```

**Method 2: Ctrl+B / Cmd+B (Custom Shortcut)**
```
User presses Ctrl+B (Windows/Linux) or Cmd+B (Mac)
├─ More discoverable than F11 (F11 used by browser)
├─ Prevent default browser behavior
├─ Trigger Boardroom Mode + fullscreen
└─ No side effects
```

**Method 3: Toggle Button in UI**
```
Location: Top-right corner of normal view (before entering fullscreen)
├─ Icon: Rectangle with maximize arrows
├─ Label: "Enter Boardroom Mode"
├─ Click → fullscreen + Boardroom Mode
└─ Accessible: aria-label, keyboard focusable
```

### Layout & Styling

#### Full-Screen Layout

```
┌──────────────────────────────────────────────────────────┐
│  TEEI Corporate Cockpit │ Boardroom Mode │ 🟢 LIVE        │
│  [Dashboard 1 of 3]      │ Last updated: 2s ago            │
│                          │ [EXIT] [REFRESH]                │
├──────────────────────────────────────────────────────────┤
│                                                           │
│   ┌─────────────────┐  ┌─────────────────────────────┐   │
│   │   Revenue       │  │  Impact Beneficiaries      │   │
│   │   $4.2M         │  │  45,000 people             │   │
│   │   ↑ 12%         │  │  ↑ 8%                      │   │
│   └─────────────────┘  └─────────────────────────────┘   │
│                                                           │
│   ┌──────────────────────────────────────────────────┐   │
│   │ Annual Trend                                     │   │
│   │                                                  │   │
│   │     ╱╲                                           │   │
│   │    ╱  ╲    ╱╲    ╱╲                              │   │
│   │   ╱    ╲  ╱  ╲  ╱  ╲                             │   │
│   │  ╱      ╲╱    ╲╱    ╲____                        │   │
│   │ Q1      Q2      Q3     Q4                        │   │
│   └──────────────────────────────────────────────────┘   │
│                                                           │
│ ◀ Prev Dashboard │ [●●○] Dashboard 1 of 3 │ Next ▶      │
│                                                           │
├──────────────────────────────────────────────────────────┤
│  Auto-refresh: Every 30s │ Press ESC or F11 to exit     │
└──────────────────────────────────────────────────────────┘
```

#### Styling Details

| Element | Size | Color | Purpose |
|---------|------|-------|---------|
| Main heading (title) | 3.5rem (56px) | White | Dashboard name |
| KPI value | 4rem (64px) | Blue (#3B82F6) | Emphasis |
| KPI label | 1.5rem (24px) | Gray (#D1D5DB) | Description |
| Chart | Full width × 400px min | White (text) | Data visualization |
| Status text | 1.5rem (24px) | Gray (#D1D5DB) | "Last updated: Xs ago" |
| Button | 2rem × 4rem padding | Blue (#3B82F6) | Interactive |
| Exit button | 2rem × 4rem padding | Red (#EF4444) | Destructive |
| Connection indicator (dot) | 1.5rem diameter | Green / Yellow / Red | Status |

**Layout Grid**:
- Margins: 2rem (32px) all sides
- Spacing between cards: 2rem (32px)
- Card padding: 2rem (32px) internal
- Grid: 2-3 columns max (avoid information overload)
- Responsive breakpoints:
  - 1280px+: 3 columns
  - 1024px-1279px: 2 columns
  - <1024px: 1 column

### Connection Status Indicators

#### Visual Indicators (In Header)

```
LIVE (Connected):
├─ 🟢 Green dot
├─ Text: "LIVE"
├─ Pulsing animation (subtle)
└─ Updated in real-time

RECONNECTING (Network loss, retrying):
├─ 🟡 Yellow dot
├─ Text: "RECONNECTING... (Attempt 3/10)"
├─ Spinner animation
└─ ETA: "~5 seconds"

OFFLINE (Extended outage, showing cached):
├─ 🔴 Red dot
├─ Text: "OFFLINE"
├─ Exclamation icon
└─ Banner: "⚠️ Showing cached data from 10 minutes ago"

STALE DATA (Offline > 5 minutes):
├─ 🔴 Red dot + warning triangle
├─ Banner: "⚠️ DATA IS STALE (5+ mins offline)"
├─ Button: [REFRESH NOW]
└─ Beep/visual alert (optional)
```

#### Screen Reader Announcements (ARIA Live)

```html
<!-- Connection status region (polite, non-blocking) -->
<div aria-live="polite" aria-atomic="true" role="status"
     class="sr-only connection-status">
  <!-- Updated dynamically by JavaScript -->
</div>

<!-- Boarding Mode active notice -->
<div aria-live="assertive" role="alert" class="sr-only">
  Boardroom Mode active. Press Escape or F11 to exit.
</div>

<!-- Event updates (when live updates arriving) -->
<div aria-live="off" id="metric-updates">
  <!-- Optionally announce: "Revenue updated to $4.2M" -->
</div>
```

**Announcement Examples**:
- "Connection established"
- "Connection lost. Reconnecting. Attempt 2 of 10."
- "Connection restored. Updating metrics."
- "Offline. Showing data from 5 minutes ago."
- "Data may be stale. Last update was 15 minutes ago."

### Auto-Refresh Behavior

```
Connected:
├─ Refresh interval: 30 seconds (configurable)
├─ Trigger: GET /v1/reporting/snapshot (full refresh)
├─ OR: Wait for SSE metric_update events (preferred, real-time)
└─ No manual refresh needed

Offline/Failed:
├─ Refresh interval: Every 60 seconds (slower, battery friendly)
├─ Trigger: Attempt to reconnect to SSE
├─ If fails: Retry with backoff
└─ Show "OFFLINE" banner if >30s without connection

Manual Refresh (User Action):
├─ Button: [REFRESH NOW]
├─ Clears snapshot cache
├─ Fetches fresh data from API
├─ Resets "last updated" timer
└─ Used when data seems wrong or outdated
```

### Stale Data Handling

```
Timeline of Connection Loss:

0-5 seconds:
├─ State: [connected] → [error]
├─ Banner: None (too fast to display)
├─ Show snapshot in memory with "last updated Xs ago"
└─ Invisible to user (looks continuous)

5-30 seconds:
├─ State: [error] or [reconnecting]
├─ Banner: "🟡 RECONNECTING... Attempt 1/10"
├─ Show latest snapshot + "Last updated: 5s ago"
├─ No beep/alert yet
└─ User aware of issue but not alarmed

>30 seconds:
├─ State: [reconnecting]
├─ Banner: "🔴 OFFLINE - Showing cached data from 30 seconds ago"
├─ Show "⚠️ STALE DATA" overlay on metrics
├─ Button: [RESUME LIVE] [REFRESH NOW]
├─ Optional: Soft alert (dim screen once)
└─ User must acknowledge

>5 minutes:
├─ State: [failed] or still [reconnecting]
├─ Banner: "🔴 UNABLE TO CONNECT - Manual reconnect required"
├─ Show all data with age stamp: "(from 5 minutes ago)"
├─ Buttons: [MANUAL RECONNECT] [REFRESH NOW]
└─ Visual emphasis (red border, flashing dot)
```

### Keyboard Navigation

| Key | Action | Notes |
|-----|--------|-------|
| Esc | Exit Boardroom Mode | Standard exit |
| F11 | Toggle Boardroom Mode | Alternative to UI button |
| Ctrl+B / Cmd+B | Toggle Boardroom Mode | Keyboard shortcut |
| ← / → | Previous / Next Dashboard | If dashboard cycling enabled |
| Space | Manual Refresh | Quick refresh without mouse |
| R | Manual Reconnect | During offline state |
| ? | Show keyboard help | Future enhancement |

### Accessibility Features

**Keyboard Navigation**:
- All buttons focusable (tab order)
- Focus visible: white outline, 3px
- Focus management: trap focus within modal (if needed)
- Roving tabindex for dashboard carousel

**Screen Reader Support**:
- Main heading: `<h1>TEEI Corporate Cockpit - Boardroom Mode</h1>`
- Connection status: `aria-live="polite"` region
- Alert messages: `role="alert"` for urgent issues
- Metrics: `aria-label="Revenue: $4.2M, up 12% from last quarter"`
- Buttons: Clear `aria-label` if icon-only
- Decorative elements: `aria-hidden="true"`

**Color Contrast** (WCAG AAA):
- Green indicator (#22C55E) on dark background (#111827): 8.2:1 ✓
- Red indicator (#EF4444) on dark background: 5.1:1 ✓
- Text on dark: 8.5:1+ ✓
- Status text: All ≥7:1 contrast

**Motion & Vestibular Disorders**:
- Pulsing animation only if `prefers-reduced-motion: no-preference`
- Respect `prefers-reduced-motion` media query for spinners
- No rapid flashing (≥3 Hz)

```css
@media (prefers-reduced-motion: reduce) {
  .status-dot-pulse {
    animation: none;
    opacity: 1;  /* Show constantly, no pulse */
  }

  .spinner {
    animation: none;
    display: none;  /* Show static dot instead */
  }
}
```

---

## Error Handling & User Notifications

### Error Classification

#### Retryable Errors

| Error | HTTP Status | Cause | User Message | Action |
|-------|-------------|-------|--------------|--------|
| Network timeout | - | Connection dropped | "Connection lost. Reconnecting..." | Retry with backoff |
| Server error | 500 | Internal server error | "Server error. Retrying..." | Retry with backoff |
| Service unavailable | 503 | Server maintenance | "Service temporarily unavailable" | Retry with backoff |
| Too many requests | 429 | Rate limited | "Server busy. Waiting..." | Retry with backoff (longer) |
| Gateway timeout | 504 | Upstream timeout | "Response timeout. Retrying..." | Retry with backoff |

#### Non-Retryable Errors

| Error | HTTP Status | Cause | User Message | Action |
|-------|-------------|-------|--------------|--------|
| Unauthorized | 401 | Authentication expired | "Session expired. Please log in again." | Redirect to login |
| Forbidden | 403 | No permission for tenant | "Access denied." | Contact admin |
| Not found | 404 | Invalid endpoint | "Page not found." | Fallback to home |
| Invalid request | 400 | Bad request params | "Invalid request format." | Log error, retry manually |

### Notification UI Components

#### Toast Notifications

**Location**: Bottom-right, 5-second duration, auto-dismiss

```
┌─────────────────────────────────┐
│ 🟡 Connection lost.             │ ← Yellow toast
│    Reconnecting...              │    (warning)
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🟢 Connection restored.          │ ← Green toast
│    Resuming live updates...      │    (success)
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🔴 Unable to reconnect.          │ ← Red toast
│    Manual reconnect required.    │    (error)
└─────────────────────────────────┘
```

**Accessibility**:
- `role="alert"` for high-priority (error, urgent warning)
- `role="status"` for informational (connection restored)
- Dismiss button: Always present for keyboard users
- Auto-announce via live region after 1s delay

#### Banner Notifications

**Location**: Top of Boardroom Mode (below header), persistent

```
┌─────────────────────────────────────────────────────┐
│ ⚠️ OFFLINE - Showing data from 5 mins ago │ [RESUME] │
└─────────────────────────────────────────────────────┘

OR

┌──────────────────────────────────────────────────────┐
│ 🟡 RECONNECTING (Attempt 3/10) - ETA 8 seconds │ [✕] │
└──────────────────────────────────────────────────────┘

OR

┌──────────────────────────────────────────────────────┐
│ 🔴 ERROR: Unable to connect. Manual action needed   │
│ [RETRY] [CONTACT SUPPORT]                           │
└──────────────────────────────────────────────────────┘
```

**Behavior**:
- Show for ≥5 seconds offline
- Remain until user manually resumes connection
- Dismiss button (✕) optional (keep for persistence)
- Include action buttons: [RETRY] [REFRESH] [CONTACT SUPPORT]

### Error Recovery Flows

#### Flow 1: Transient Network Error (5-30 seconds)

```
User in Boardroom Mode
│
├─ Network disconnected
│
├─ Show subtle loading indicator ("connecting...")
│
├─ Attempt reconnection (exponential backoff)
│  └─ Attempt 1: 2s
│  └─ Attempt 2: 4s
│  └─ Attempt 3: 8s
│
├─ [IF RECONNECTED by 30s]
│  └─ Show toast: "Connection restored"
│  └─ Resume live updates
│  └─ No banner (too quick to matter)
│
└─ [IF STILL OFFLINE after 30s]
   └─ Show banner: "OFFLINE - Cached data from 30s ago"
   └─ Show [RESUME LIVE] button
   └─ Continue retrying in background
```

#### Flow 2: Extended Outage (>30 seconds)

```
Offline > 30 seconds
│
├─ Show red banner: "🔴 OFFLINE"
│
├─ Display snapshot with age: "(from 5 mins ago)"
│
├─ Continue retrying (backoff: 32s cap)
│  ├─ Attempt 4: 16s
│  ├─ Attempt 5: 32s
│  ├─ Attempt 6-10: 32s each
│
├─ [IF RECONNECTED]
│  ├─ Send lastEventId to resume
│  ├─ Replay missed events
│  ├─ Update display
│  └─ Show toast: "Connection restored. Data updated."
│
└─ [IF FAILED after max retries]
   ├─ Show banner: "🔴 Unable to connect"
   ├─ Disable auto-retry (prevent battery drain)
   ├─ Show: [MANUAL RECONNECT] [REFRESH NOW]
   └─ User must take action
```

#### Flow 3: Server Returns 401 (Auth Expired)

```
SSE connection receives 401 Unauthorized
│
├─ This is non-retryable
│
├─ Cancel all retries
│
├─ Show modal: "Your session has expired"
│
├─ Buttons: [LOG IN AGAIN] [BACK TO HOME]
│
└─ Exit Boardroom Mode, redirect to login
```

#### Flow 4: User Triggers Manual Reconnect

```
User offline, sees "OFFLINE" banner
│
├─ User clicks [RESUME LIVE]
│
├─ Immediately attempt connection (no backoff)
│
├─ Reset retry counter to 0
│
├─ Show spinner: "Connecting..."
│
├─ [IF SUCCEEDS]
│  └─ Show toast: "Connected. Updating..."
│
└─ [IF FAILS]
   ├─ Show toast: "Connection failed. Retrying..."
   └─ Resume exponential backoff
```

### Error Logging & Monitoring

```typescript
interface ErrorLog {
  timestamp: number;
  errorCode: string;
  message: string;
  retryable: boolean;
  userAgent: string;
  companyId: string;

  // For debugging
  stackTrace?: string;
  context?: {
    connectionState?: string;
    retryAttempt?: number;
    lastEventId?: string;
    lastSuccessfulConnection?: number;
  };

  // Resolution
  resolvedAt?: number;
  resolution?: 'auto_reconnect' | 'manual_retry' | 'user_logout' | 'timeout';
}
```

**Where to Log**:
- Client-side: Browser console (dev) + Analytics service (prod)
- Server-side: Application logs (ELK, CloudWatch)
- Monitored: Error rate, retry success rate, connection MTTR (mean time to recovery)

**Metrics to Track**:
- Total disconnections per session
- Median time to reconnect (MTUR)
- Percentage of users affected by >5min outage
- Toast notification impression rate (how many see the warning)
- Manual reconnect button clicks (indicates user awareness)

---

## Performance Targets

### Metrics Definition

| Metric | Target | Measurement | Tool |
|--------|--------|-------------|------|
| P95 reconnect time | ≤ 5 seconds | Time from disconnection to next `connected` state | Chrome DevTools, custom timers |
| P99 reconnect time | ≤ 10 seconds | Time from disconnection to next `connected` state | Chrome DevTools, custom timers |
| Snapshot load time (memory) | ≤ 50ms | Time to retrieve latest snapshot from ring buffer | Performance.now() |
| Snapshot load time (IndexedDB) | ≤ 250ms | Time to query + decompress snapshot from IndexedDB | Performance.now() |
| Memory footprint (ring buffer) | ≤ 5MB | Size of 3 snapshots in memory | Chrome DevTools Memory |
| Memory footprint (IndexedDB) | ≤ 50MB | Total size of 10 snapshots in IndexedDB | IndexedDB quota API |
| Battery impact | Minimal | Battery drain during 30min idle + network loss | Chrome Battery Saver mode |
| Event replay latency | ≤ 500ms | Time to send + receive + process replay of 100 events | Network tab, Performance API |
| Time to blank screen (offline) | > 30 seconds | Delay before blank display if no snapshot cached | User perception test |

### Measurement Approach

#### Reconnect Time (P95, P99)

```typescript
class PerformanceTracker {
  private disconnectTime: number | null = null;

  onDisconnect(): void {
    this.disconnectTime = performance.now();
  }

  onReconnect(): void {
    if (this.disconnectTime) {
      const reconnectTime = performance.now() - this.disconnectTime;

      // Log to analytics
      analytics.track('sse_reconnect_latency', {
        durationMs: reconnectTime,
        status: 'success'
      });

      this.disconnectTime = null;
    }
  }
}

// Aggregate percentiles from analytics backend:
// SELECT percentile(reconnectTime, 95) FROM sse_metrics
// → Expected: 2,000-3,000ms (P95)
// → Expected: 5,000-8,000ms (P99)
```

#### Snapshot Load Time

```typescript
// In-memory load:
const start = performance.now();
const snapshot = ringBuffer.latest();
const loadTime = performance.now() - start;
// Expected: <1ms

// IndexedDB load:
const start = performance.now();
const snapshot = await db.snapshots
  .where('companyId')
  .equals(companyId)
  .reverse()
  .first();
const loadTime = performance.now() - start;
// Expected: 50-250ms depending on compression
```

#### Memory Footprint

```typescript
// Ring buffer: 3 × 50KB snapshots ≈ 150KB
// IndexedDB: 10 × 50KB snapshots ≈ 500KB
// Total: ~650KB (easily under 50MB target)

// Monitor in DevTools:
1. Open DevTools → Performance tab
2. Take heap snapshot
3. Search for "SnapshotManager"
4. Observe retained size
5. Expected: <5MB
```

#### Battery Impact

```
Test method:
1. Open Boardroom Mode in Chrome on mobile
2. Activate Chrome Battery Saver mode
3. Simulate network disconnect for 30 minutes
4. Observe battery drain

Expected:
├─ Without SSE: 2% drain per 30 minutes
├─ With SSE (active connection): 3% drain
├─ With SSE (offline, backoff): 2.2% drain (acceptable)
└─ No excessive retries or polling

Test frequency: Before each release
```

#### Event Replay Latency

```typescript
// Simulate 100 missed events during 30s offline period
// Server queues events: evt-1, evt-2, ..., evt-100

const startTime = performance.now();

// Client reconnects and requests lastEventId (evt-50)
// Server sends: evt-51 through evt-100

// Client receives all replayed events
const replayTime = performance.now() - startTime;

// Expected: 300-500ms (network + processing)
// Breakdown:
// ├─ Network RTT: 100-200ms
// ├─ Server query + marshal: 50-100ms
// ├─ Response body size: 50-100KB (depends on event size)
// └─ Client processing: 50-100ms
```

### SLO (Service Level Objectives)

```
During normal operation:
├─ Availability: 99.5% (< 3.6 hours downtime per month)
└─ Error rate: < 0.5%

Connection resilience:
├─ Recovery time after network failure: P95 ≤ 5 seconds
├─ Event loss during recovery: 0% (Last-Event-ID ensures)
└─ Data freshness during outage: ≤ 30 minutes

User experience:
├─ Blank screen time: 0 seconds (snapshot fallback)
├─ User-visible errors: < 1% of sessions
└─ Manual reconnect required: < 5% of sessions (extended outages only)
```

---

## Implementation Plan

### Phase 1: Core State Machine (Day 1, 2-3 hours)

**Goal**: Implement FSM, backoff strategy, and connection lifecycle

**Files to create/modify**:

1. **Enhance `/src/utils/sseClient.ts`**:
   - Add `ConnectionState` enum export (fix existing TS error)
   - Add `SSEError` interface export (fix existing TS error)
   - Implement `calculateBackoff()` with exact delays from spec
   - Add state machine methods: `transitionTo()`, `isState()`
   - Add `getLastEventId()` method to expose lastEventId
   - Add `getConnectionState()` method to expose state
   - Keep existing event handling intact

2. **Create `/src/utils/sseStateMachine.ts`** (new):
   - `SSEStateMachine` class
   - Manage state transitions with guards
   - Emit state change events for UI
   - Track retry attempts, timing

**Key methods to implement**:
```typescript
// In sseClient.ts
export function getConnectionState(): ConnectionState
export function getLastEventId(): string | null
export function getRetryAttempt(): number

// In sseStateMachine.ts
class SSEStateMachine {
  transitionTo(newState: ConnectionState): void
  isState(state: ConnectionState): boolean
  getState(): ConnectionState
  on('statechange', (oldState, newState) => {})
}
```

**Tests needed**:
- State transitions valid
- Backoff delays match spec (attempt 1-10)
- Max retries enforcement
- Timeout handling

### Phase 2: Snapshot Caching (Day 1, 2-3 hours)

**Goal**: Implement IndexedDB storage + ring buffer + compression

**Files to create**:

1. **Create `/src/utils/snapshotManager.ts`** (new):
   - `Snapshot` interface (as defined in spec)
   - `SnapshotRingBuffer` class (in-memory, 3 snapshots)
   - `SnapshotStore` class (IndexedDB operations)
   - `saveSnapshot()`, `loadSnapshot()`, `getAllSnapshots()`
   - `compress()`, `decompress()` methods
   - `cleanup()` scheduled cleanup

2. **Create `/src/lib/indexeddb.ts`** (new):
   - Database schema definition
   - `openDatabase()` helper
   - Retry logic for failed DB operations
   - Error handling

3. **Enhance `/src/utils/sseClient.ts`**:
   - Call `snapshotManager.saveSnapshot()` on every 30 events
   - Add `saveSnapshot()` public method for manual triggers
   - Add `loadSnapshot()` public method for offline fallback

**Methods to implement**:
```typescript
// In snapshotManager.ts
class SnapshotManager {
  async saveSnapshot(data: SnapshotData): Promise<Snapshot>
  async loadSnapshot(companyId: string): Promise<Snapshot | null>
  async getAllSnapshots(companyId: string): Promise<Snapshot[]>
  getLatest(): Snapshot | null  // From ring buffer
  async cleanup(): Promise<void>
  getStoreStats(): Promise<{ totalSize: number }>
}
```

**Tests needed**:
- Snapshot serialization/deserialization
- Compression ratio validation
- IndexedDB CRUD operations
- Cleanup TTL enforcement
- Memory footprint validation

### Phase 3: Boardroom Mode UX Enhancements (Day 2-3, 2-3 hours)

**Goal**: Add connection status UI, offline banner, manual controls

**Files to modify**:

1. **Enhance `/src/components/boardroom/BoardroomMode.tsx`**:
   - Import `SSEClient`, `snapshotManager`
   - Add `ConnectionStatus` indicator (colored dot + text)
   - Add offline banner with stale data warning
   - Add `[RESUME LIVE]` and `[REFRESH]` buttons
   - Subscribe to SSE state changes
   - Display snapshot when offline
   - Update "Last updated" timestamp
   - Keyboard shortcuts: F11, Ctrl+B, Esc

2. **Create `/src/components/boardroom/ConnectionStatus.tsx`** (new):
   - Shows green/yellow/red dot
   - Displays connection state text
   - Announces state changes to screen readers
   - Props: state, retryAttempt, maxRetries, onRetry

3. **Create `/src/components/boardroom/OfflineBanner.tsx`** (new):
   - Displays when `state !== 'connected'`
   - Shows data age: "Last updated: 5 mins ago"
   - Buttons: [RESUME LIVE], [REFRESH NOW]
   - ARIA live region for announcements

4. **Create `/src/hooks/useBoardroomSSE.ts`** (new):
   - Custom hook for managing SSE + snapshot in Boardroom
   - Returns: state, metrics, snapshot, onResume(), onRefresh()
   - Handles offline detection (`navigator.onLine`)
   - Auto-refresh timer when online/offline

**UI structure**:
```typescript
<BoardroomMode>
  <header>
    {/* Connection status */}
    <ConnectionStatus state={sseState} />
  </header>

  {/* Offline banner */}
  {sseState !== 'connected' && (
    <OfflineBanner
      age={snapshot.timestamp}
      onResume={() => reconnect()}
      onRefresh={() => loadSnapshot()}
    />
  )}

  {/* Metrics from snapshot or live */}
  <Metrics data={snapshot.data || liveData} />
</BoardroomMode>
```

**Tests needed**:
- State change UI updates
- Banner appears after 5s offline
- Buttons trigger correct actions
- Screen reader announcements
- Keyboard shortcuts (F11, Ctrl+B, Esc)

### Phase 4: Last-Event-ID Resume Logic (Day 2-3, 1-2 hours)

**Goal**: Implement event resume via Last-Event-ID header

**Files to modify**:

1. **Enhance `/src/utils/sseClient.ts`**:
   - Persist `lastEventId` to `localStorage` (with key `teei-sse-lastEventId-${companyId}`)
   - Load `lastEventId` on initialization (check localStorage)
   - Send `lastEventId` as URL query param on reconnect (already partially done)
   - Handle `event.lastEventId` from MessageEvent

2. **Create `/src/api/snapshot.ts`** (new):
   - GET `/v1/reporting/snapshot?companyId=:id` endpoint
   - Returns snapshot + lastEventId for resume
   - Used for offline refresh and initial load

3. **Enhance existing server endpoint** (out of scope for this design, but noted):
   - GET `/sse/metrics` handler should support `?lastEventId=:id` param
   - Query event backlog, replay missed events
   - Handle edge case: event ID too old (410 Gone)

**Methods to implement**:
```typescript
// In sseClient.ts
private persistEventId(id: string): void
private restoreEventId(): string | null

// In snapshot.ts (server-side, noted for implementer)
GET /v1/reporting/snapshot
  → Response includes:
    - snapshot.data (KPIs, charts)
    - snapshot.lastEventId
    - snapshot.timestamp
```

**Tests needed**:
- localStorage persistence across page reload
- lastEventId sent on reconnect
- Missing events replayed on server
- Event ID too old handled gracefully

### Phase 5: Error Handling & Toast Notifications (Day 3, 1-2 hours)

**Goal**: Implement notification system and error recovery

**Files to create/modify**:

1. **Create `/src/components/notifications/Toast.tsx`** (new):
   - Display toast notifications (bottom-right)
   - Auto-dismiss after 5 seconds
   - Support: info, warning, error types
   - Accessible: role="alert" for errors

2. **Create `/src/hooks/useToast.ts`** (new):
   - Hook to trigger toasts from anywhere
   - Singleton toast manager
   - Queue handling (max 3 visible)

3. **Enhance `/src/utils/sseClient.ts`**:
   - Call `useToast()` on state changes:
     - `connected` → "Connection restored"
     - `error` → "Connection lost. Retrying..."
     - `failed` → "Unable to reconnect. Manual action required."

4. **Enhance `/src/components/boardroom/BoardroomMode.tsx`**:
   - Subscribe to SSE errors via `onError` callback
   - Call `useToast().error(message)` for user feedback

**Toast messages**:
- "🟡 Connection lost. Reconnecting..."
- "🟢 Connection restored. Updating metrics..."
- "🔴 Unable to connect. Please check your network."
- "🔄 Refreshing snapshot..."
- "✅ Data refreshed successfully"

**Tests needed**:
- Toast appears/disappears
- Correct message for each state
- Screen reader compatibility
- Multiple toasts queue

### Phase 6: Testing & Documentation (Day 3, 1-2 hours)

**Goal**: Create unit tests, E2E tests, and runbook documentation

**Files to create**:

1. **Create `/tests/unit/sseClient.test.ts`**:
   - Test state transitions
   - Test backoff calculation (all 10 attempts)
   - Test event queueing
   - Test error handling

2. **Create `/tests/unit/snapshotManager.test.ts`**:
   - Test save/load from IndexedDB
   - Test compression/decompression
   - Test ring buffer FIFO
   - Test cleanup and TTL

3. **Create `/tests/e2e/boardroom-sse.spec.ts`**:
   - Test Boardroom Mode entry (F11, Ctrl+B)
   - Test SSE connection establishes
   - Simulate network loss: offline banner appears
   - Simulate reconnection: data updates
   - Test manual refresh button
   - Test keyboard shortcuts

4. **Create `/docs/cockpit/SSE_RESILIENCE_RUNBOOK.md`**:
   - Operational guide for support team
   - Troubleshooting common issues
   - Monitoring & alerting setup
   - Performance tuning guide

5. **Create `/docs/cockpit/BOARDROOM_MODE_QUICKSTART.md`**:
   - User guide for executives
   - How to enter/exit Boardroom Mode
   - What to do if offline
   - Accessibility features

**Test scenarios**:

**Scenario A: Normal Operation**
- User enters Boardroom Mode
- SSE connects successfully
- Metrics update in real-time
- F11 toggles fullscreen
- Esc exits mode

**Scenario B: Network Transient Failure (5s)**
- User in Boardroom Mode
- Network disconnects
- Banner appears after 1s: "Reconnecting..."
- Backoff: 2s, 4s attempts
- Network comes back after 5s
- Auto-reconnects, data updates
- No manual action needed

**Scenario C: Extended Outage (>30s)**
- Network offline for 60 seconds
- After 5s: yellow banner "Reconnecting..."
- After 30s: red banner "OFFLINE - Cached data from 30s ago"
- User clicks [RESUME LIVE]
- Manual reconnect immediate (no backoff)
- Success: data updates

**Scenario D: Server Error 503**
- SSE endpoint returns 503 temporarily
- Client in [error] state
- Attempts retry: 2s, 4s, 8s, 16s, 32s, 32s, ...
- After 10 attempts (failed state): red banner, [MANUAL RECONNECT]
- Server recovers
- User clicks [MANUAL RECONNECT]
- Immediate reconnection, catches up with events

**Scenario E: Page Reload During Offline**
- User offline, closes tab
- lastEventId persisted to localStorage
- User reopens Boardroom Mode
- Loads snapshot from IndexedDB
- Reconnects with lastEventId
- Replays missed events
- Seamless resume

---

## Testing Strategy

### Unit Tests

#### SSE Client State Machine

```typescript
describe('SSEClient State Machine', () => {
  describe('Backoff Calculation', () => {
    it('should return 2s-3s for attempt 1', () => {
      expect(calculateBackoff(0)).toBeGreaterThanOrEqual(2000);
      expect(calculateBackoff(0)).toBeLessThanOrEqual(3000);
    });

    it('should return 4s-5s for attempt 2', () => {
      expect(calculateBackoff(1)).toBeGreaterThanOrEqual(4000);
      expect(calculateBackoff(1)).toBeLessThanOrEqual(5000);
    });

    it('should cap at 32s for attempt 5+', () => {
      expect(calculateBackoff(5)).toBeLessThanOrEqual(32000);
      expect(calculateBackoff(9)).toBeLessThanOrEqual(32000);
    });
  });

  describe('State Transitions', () => {
    it('should transition disconnected→connecting→connected', async () => {
      const client = new SSEClient({ url: 'http://test' });
      client.connect();
      expect(client.state).toBe('connecting');

      // Simulate open event
      eventSource.open();
      await flushPromises();
      expect(client.state).toBe('connected');
    });

    it('should transition to error on connection failure', async () => {
      const client = new SSEClient({ url: 'http://invalid' });
      client.connect();

      eventSource.error();
      await flushPromises();
      expect(client.state).toBe('error');
    });
  });

  describe('Event Processing', () => {
    it('should update lastEventId on message', () => {
      const client = new SSEClient({ url: 'http://test' });
      client.connect();

      const event = new MessageEvent('message', {
        data: '{"value": 42}',
        lastEventId: 'evt-123'
      });

      expect(client.getLastEventId()).toBe('evt-123');
    });
  });
});
```

#### Snapshot Manager

```typescript
describe('SnapshotManager', () => {
  describe('Ring Buffer', () => {
    it('should maintain 3 snapshots max', () => {
      const buffer = new SnapshotRingBuffer(3);

      buffer.push(snap1);
      buffer.push(snap2);
      buffer.push(snap3);
      buffer.push(snap4);  // Overwrites snap1

      expect(buffer.all().length).toBe(3);
      expect(buffer.all()).not.toContain(snap1);
    });

    it('should return latest snapshot', () => {
      const buffer = new SnapshotRingBuffer(3);
      buffer.push(snap1);
      buffer.push(snap2);

      expect(buffer.latest()).toBe(snap2);
    });
  });

  describe('Compression', () => {
    it('should compress snapshots > 100KB', async () => {
      const largeSnapshot = createSnapshot(200 * 1024);  // 200KB
      const compressed = snapshotManager.compress(largeSnapshot);

      expect(compressed.compressed).toBe(true);
      expect(compressed.compressedSize).toBeLessThan(largeSnapshot.uncompressedSize);
    });

    it('should decompress correctly', async () => {
      const snapshot = createSnapshot(200 * 1024);
      const compressed = snapshotManager.compress(snapshot);
      const decompressed = snapshotManager.decompress(compressed);

      expect(decompressed.data).toEqual(snapshot.data);
    });
  });

  describe('IndexedDB', () => {
    it('should save and retrieve snapshots', async () => {
      await snapshotManager.saveSnapshot(snapshot);

      const retrieved = await snapshotManager.loadSnapshot(companyId);
      expect(retrieved).toEqual(snapshot);
    });

    it('should delete expired snapshots', async () => {
      const oldSnapshot = createSnapshot();
      oldSnapshot.expiresAt = Date.now() - 1000;  // Expired

      await db.snapshots.put(oldSnapshot);
      await snapshotManager.cleanup();

      const remaining = await db.snapshots
        .where('companyId').equals(companyId).toArray();
      expect(remaining).not.toContain(oldSnapshot);
    });
  });
});
```

### E2E Tests

#### Boardroom Mode Flow

```typescript
describe('Boardroom Mode - SSE Integration', () => {
  beforeEach(async () => {
    await page.goto('/cockpit');
  });

  describe('Entry & UI', () => {
    it('should enter Boardroom Mode via button', async () => {
      await page.click('[aria-label="Enter Boardroom Mode"]');

      const header = await page.$('text=Boardroom Mode');
      expect(header).toBeTruthy();

      const isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
      expect(isFullscreen).toBe(true);
    });

    it('should enter Boardroom Mode via Ctrl+B', async () => {
      await page.keyboard.press('Control+B');

      const header = await page.$('text=Boardroom Mode');
      expect(header).toBeTruthy();
    });
  });

  describe('SSE Connection', () => {
    it('should connect to SSE and display metrics', async () => {
      await enterBoardroomMode();

      await page.waitForSelector('[data-testid="metric-revenue"]');
      const revenue = await page.textContent('[data-testid="metric-revenue"]');
      expect(revenue).toMatch(/\$[\d.]+M/);
    });

    it('should show green status indicator when connected', async () => {
      await enterBoardroomMode();

      await page.waitForSelector('[data-status="connected"]');
      const status = await page.getAttribute('[data-status="connected"]', 'data-status');
      expect(status).toBe('connected');
    });
  });

  describe('Network Failure Handling', () => {
    it('should show reconnecting banner on network loss', async () => {
      await enterBoardroomMode();

      // Simulate network offline
      await page.context().setOffline(true);

      // Wait for banner to appear (after 5-10s)
      await page.waitForSelector('[role="alert"]', { timeout: 10000 });
      const bannerText = await page.textContent('[role="alert"]');
      expect(bannerText).toContain('OFFLINE');
    });

    it('should show cached data when offline', async () => {
      // Setup: establish connection first
      await enterBoardroomMode();
      await page.waitForSelector('[data-testid="metric-revenue"]');

      // Simulate network offline
      await page.context().setOffline(true);

      // Metrics should still be visible
      const revenue = await page.textContent('[data-testid="metric-revenue"]');
      expect(revenue).toMatch(/\$[\d.]+M/);

      // Should show age: "from 30 seconds ago"
      const age = await page.textContent('[data-testid="data-age"]');
      expect(age).toContain('ago');
    });

    it('should auto-reconnect when network returns', async () => {
      await enterBoardroomMode();
      await page.context().setOffline(true);

      // Wait for offline state
      await page.waitForSelector('[data-status="offline"]', { timeout: 10000 });

      // Restore network
      await page.context().setOffline(false);

      // Should reconnect within 5 seconds
      await page.waitForSelector('[data-status="connected"]', { timeout: 5000 });

      // Toast should appear
      await page.waitForSelector('[role="status"]');
      const toast = await page.textContent('[role="status"]');
      expect(toast).toContain('restored');
    });
  });

  describe('Manual Controls', () => {
    it('should resume live updates on button click', async () => {
      await enterBoardroomMode();
      await page.context().setOffline(true);

      // Wait for offline
      await page.waitForSelector('[role="alert"]');

      // Click "Resume Live" button
      await page.click('[data-testid="resume-live"]');

      // Should attempt reconnection
      const status = await page.getAttribute('[data-status]', 'data-status');
      expect(['connecting', 'reconnecting']).toContain(status);
    });

    it('should refresh snapshot on button click', async () => {
      await enterBoardroomMode();

      const initialValue = await page.textContent('[data-testid="metric-revenue"]');

      // Modify server data
      await updateServerMetric('revenue', 5000000);

      // Click refresh
      await page.click('[data-testid="refresh-snapshot"]');

      // Wait for new data
      await page.waitForFunction(
        (prev) => {
          const current = document.querySelector('[data-testid="metric-revenue"]').textContent;
          return current !== prev;
        },
        initialValue
      );
    });
  });

  describe('Accessibility', () => {
    it('should announce connection state changes to screen readers', async () => {
      await enterBoardroomMode();

      // Simulate network loss
      await page.context().setOffline(true);

      // Check ARIA live region
      const liveRegion = await page.$('[aria-live="polite"]');
      expect(liveRegion).toBeTruthy();

      const announcement = await page.textContent('[aria-live="polite"]');
      expect(announcement).toBeTruthy();  // Should contain state text
    });

    it('should have keyboard navigation', async () => {
      await enterBoardroomMode();

      // Tab to resume button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');  // May need multiple tabs

      const focused = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
      expect(['Resume Live', 'Refresh', 'Exit']).toContain(focused);

      // Enter to activate
      await page.keyboard.press('Enter');
      const status = await page.getAttribute('[data-status]', 'data-status');
      expect(['connecting', 'reconnecting']).toContain(status);
    });

    it('should have sufficient color contrast', async () => {
      await enterBoardroomMode();

      // Run axe accessibility test
      const results = await axe(page);
      const colorContrast = results.violations.filter(v => v.id === 'color-contrast');
      expect(colorContrast).toHaveLength(0);  // No contrast violations
    });
  });

  describe('Exit', () => {
    it('should exit via Esc key', async () => {
      await enterBoardroomMode();

      await page.keyboard.press('Escape');

      const header = await page.$('text=Boardroom Mode');
      expect(header).toBeNull();

      const isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
      expect(isFullscreen).toBe(false);
    });

    it('should exit via F11', async () => {
      await enterBoardroomMode();

      await page.keyboard.press('F11');

      const header = await page.$('text=Boardroom Mode');
      expect(header).toBeNull();
    });

    it('should exit via button click', async () => {
      await enterBoardroomMode();

      await page.click('[aria-label="Exit Boardroom Mode"]');

      const header = await page.$('text=Boardroom Mode');
      expect(header).toBeNull();
    });
  });
});
```

### Network Simulation Tests

```typescript
describe('Network Failure Scenarios', () => {
  describe('Flaky Network (intermittent failures)', () => {
    it('should handle connection drops and recoveries', async () => {
      await enterBoardroomMode();

      for (let i = 0; i < 5; i++) {
        // Simulate brief network loss
        await page.context().setOffline(true);
        await sleep(2000);

        // Network comes back
        await page.context().setOffline(false);
        await sleep(2000);
      }

      // Should recover gracefully every time
      await page.waitForSelector('[data-status="connected"]', { timeout: 5000 });

      // Data should be current
      const age = await page.textContent('[data-testid="data-age"]');
      const ageSeconds = parseInt(age.match(/\d+/)[0]);
      expect(ageSeconds).toBeLessThan(10);  // Less than 10 seconds old
    });
  });

  describe('Slow Network', () => {
    it('should handle slow reconnection gracefully', async () => {
      // Set network to "Slow 4G" profile
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1 * 1024 / 8,  // 1 kbps
        uploadThroughput: 1 * 1024 / 8,
        latency: 400
      });

      await enterBoardroomMode();

      // Should still connect, just slower
      await page.waitForSelector('[data-status="connected"]', { timeout: 15000 });  // Longer timeout
    });
  });

  describe('Connection Timeout', () => {
    it('should timeout and retry if server takes >5s to respond', async () => {
      // Mock server to delay response
      await mockServerDelay(6000);

      await enterBoardroomMode();

      // Should fail and retry
      const status = await page.getAttribute('[data-status]', 'data-status');
      expect(['error', 'reconnecting']).toContain(status);
    });
  });
});
```

### Performance Benchmarks

```typescript
describe('Performance Metrics', () => {
  describe('Reconnect Time', () => {
    it('should reconnect within P95 target (≤5s)', async () => {
      const reconnectTimes: number[] = [];

      for (let i = 0; i < 20; i++) {
        await enterBoardroomMode();

        const start = Date.now();
        await page.context().setOffline(true);
        await page.context().setOffline(false);

        await page.waitForSelector('[data-status="connected"]', { timeout: 10000 });
        const duration = Date.now() - start;
        reconnectTimes.push(duration);
      }

      reconnectTimes.sort((a, b) => a - b);
      const p95 = reconnectTimes[Math.floor(reconnectTimes.length * 0.95)];

      console.log(`P95 reconnect time: ${p95}ms`);
      expect(p95).toBeLessThanOrEqual(5000);
    });
  });

  describe('Memory Footprint', () => {
    it('should keep memory < 50MB', async () => {
      await enterBoardroomMode();

      const metrics = await page.metrics();
      const heapUsed = metrics.JSHeapUsedSize / (1024 * 1024);  // Convert to MB

      console.log(`Heap used: ${heapUsed.toFixed(2)}MB`);
      expect(heapUsed).toBeLessThan(50);
    });
  });

  describe('Snapshot Load Time', () => {
    it('should load snapshot from IndexedDB < 250ms', async () => {
      // This requires instrumenting snapshotManager with performance marks
      const perfEntries = await page.evaluate(() => {
        return performance.getEntriesByName('snapshot-load');
      });

      for (const entry of perfEntries) {
        console.log(`Snapshot load duration: ${entry.duration.toFixed(2)}ms`);
        expect(entry.duration).toBeLessThan(250);
      }
    });
  });
});
```

---

## Appendix

### A. Alternative Approaches Considered

#### 1. WebSocket Instead of SSE

**Considered**: Use WebSocket for bidirectional communication

**Pros**:
- Lower latency (no HTTP overhead)
- Bidirectional (client can send commands)
- Better suited for interactive applications

**Cons**:
- More complex to implement
- Requires server WebSocket infrastructure
- Doesn't scale as well (stateful connections)
- Browser support edge cases (WSS vs WS)
- Firewall/proxy issues more common

**Decision**: SSE is simpler, HTTP-based, and sufficient for metrics streaming. Metrics are unidirectional (server → client).

#### 2. WebSocket with Fallback to Polling

**Considered**: WebSocket + fallback to HTTP long-polling for compatibility

**Pros**:
- Best of both worlds
- Compatible with all browsers

**Cons**:
- Much higher latency during polling
- Higher server load (more HTTP requests)
- Complexity in implementation (switch logic)

**Decision**: SSE has browser support ≥95% (IE11 needs polyfill). Polling not needed.

#### 3. Simple Exponential Backoff Without Jitter

**Considered**: Skip jitter for simpler implementation

**Pros**:
- Slightly simpler code (1 line less)

**Cons**:
- Thundering herd on server recovery (all clients reconnect simultaneously)
- Cascading failures possible
- Cloud infrastructure standard is WITH jitter

**Decision**: Jitter is standard and essential for production resilience.

#### 4. In-Memory Snapshots Only (No IndexedDB)

**Considered**: Keep snapshots in memory only, lose on page reload

**Pros**:
- Simpler implementation
- No IndexedDB complexity

**Cons**:
- Users lose offline fallback on page reload
- Worse UX (blank screen after reload during offline)
- No persistence across browser restart

**Decision**: IndexedDB persistence is worth complexity. Users expect data to survive reload.

#### 5. Server-Push via HTTP/2 Server Push

**Considered**: Use HTTP/2 Server Push instead of SSE

**Pros**:
- Leverages HTTP/2 multiplexing
- Can push multiple resources

**Cons**:
- Not designed for long-lived streams (metrics)
- Browser support inconsistent
- Header push has performance overhead
- Abandoned by WHATWG

**Decision**: SSE is the standard for server-sent streams. HTTP/2 Push is for static resources.

### B. Trade-Offs

| Trade-Off | Choice | Rationale |
|-----------|--------|-----------|
| Backoff base delay | 2 seconds | Balance: not too eager (respects server), not too slow (user perceives lag) |
| Backoff cap | 32 seconds | Diminishing returns beyond; battery impact; user perception |
| Max retries | 10 | ~3 minute total retry window; long enough for most outages |
| Ring buffer size | 3 snapshots | 150KB memory; enough for minute-level rollback; practical trade-off |
| IndexedDB limit | 50MB | Per-tenant limit; prevents bloat; typical 5-10 snapshots ~500KB |
| Snapshot frequency | Every 30 events | Balances disk I/O with data freshness; ~30-60 sec typical |
| Compression threshold | 100KB | Most snapshots <100KB; compression CPU cost not worth it |
| Offline banner delay | 5 seconds | Hides transient glitches; shows before user frustration |
| Stale data warning | >5 minutes | Conservative threshold; data >5min probably not actionable |

### C. Future Enhancements

**Phase F Considerations**:

1. **Adaptive Backoff Based on Server Health**
   - Respect `Retry-After` header from server
   - Implement Circuit Breaker pattern
   - Pause retries if server consistently returns 503

2. **Event Batching & Compression**
   - Batch multiple events into single SSE message
   - Compress event payloads (gzip)
   - Reduce network overhead for high-frequency updates

3. **Multi-Event Stream Prioritization**
   - High-priority events (critical metrics) retry faster
   - Low-priority events (cosmetic updates) skip if offline
   - Configurable per event type

4. **Distributed Snapshot Caching**
   - Cache snapshots in CDN edge locations
   - Lower latency for offline fallback
   - Reduces server load

5. **Bi-Directional Communication**
   - Allow users to send queries/commands via WebSocket
   - Interactive dashboards (drill-down requests)
   - Reduce polling for on-demand data

6. **Analytics & Observability**
   - Export connection metrics to observability system
   - Dashboard: reconnect latency, error rates, snapshot size
   - Alerting: if P95 reconnect > 10s, page ops

7. **Advanced Offline Mode**
   - Queue pending updates for sync when online
   - Conflict resolution if multiple users edit simultaneously
   - Timestamps and version vectors for consistency

---

## Summary

This SSE Resilience Architecture design provides a production-ready blueprint for implementing Boardroom Mode with network resilience, offline fallback, and excellent user experience. The design balances complexity, performance, and user needs.

**Key Points**:
- **State Machine**: Clear, unambiguous connection lifecycle
- **Exponential Backoff + Jitter**: Production-standard retry strategy
- **Last-Event-ID Resume**: Gap-free event streaming
- **Snapshot Caching**: Offline experience without blank screens
- **Boardroom UX**: Full-screen, accessible, intuitive
- **Error Handling**: Clear user feedback for all failure modes
- **Performance Targets**: Measurable, achievable, monitored

Ready for implementation by the `sse-implementer` agent.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Next Review**: Upon implementation completion (Phase E)
**Prepared by**: sse-architect
**Status**: ✅ Design Complete - Ready for Implementation
