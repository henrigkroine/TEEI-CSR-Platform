# Real-Time Collaboration Documentation

## Overview

The TEEI CSR Platform collaboration feature enables multiple users to simultaneously edit report sections and boardroom notes with:

- **Conflict-free merges** using Operational Transform (OT)
- **Real-time presence** showing active users and their cursors
- **Comments** threaded and anchored to text ranges
- **Track changes** (suggestions) with accept/reject workflow
- **Offline support** with automatic operation queue and rehydration

## Architecture

```
┌─────────────────┐
│  Cockpit UI     │
│  (Astro + React)│
└────────┬────────┘
         │
         ├─ WebSocket (primary)
         ├─ SSE (fallback)
         └─ REST (poll)
         │
┌────────┴────────┐
│  API Gateway    │
│  Sticky routing │
└────────┬────────┘
         │
┌────────┴────────┐
│ Reporting Svc   │
│ - Doc Manager   │
│ - OT Transform  │
│ - Storage       │
└─────────────────┘
```

## Roles & Permissions

| Role      | View | Edit | Comment | Suggest | Manage Users |
|-----------|------|------|---------|---------|--------------|
| Owner     | ✓    | ✓    | ✓       | ✓       | ✓            |
| Editor    | ✓    | ✓    | ✓       | ✓       | ✗            |
| Commenter | ✓    | ✗    | ✓       | ✗       | ✗            |
| Viewer    | ✓    | ✗    | ✗       | ✗       | ✗            |

## Limits & Quotas

| Resource                 | Limit            | Reason                  |
|--------------------------|------------------|-------------------------|
| Operations per minute    | 120 per user     | Rate limiting           |
| Document size            | 100,000 chars    | Performance             |
| Concurrent users per doc | 50               | Broadcast efficiency    |
| Comment length           | 5,000 chars      | Database storage        |
| Session duration         | 24 hours         | Security                |
| Offline queue size       | 1,000 operations | Memory                  |

## Getting Started

### 1. Connect to Document

```typescript
import { useCollaboration } from '@/features/editor-collab/hooks/useCollaboration';

const { connected, snapshot, users, sendOperation } = useCollaboration({
  docId: 'report-123:executive_summary',
  token: jwtToken,
  transport: 'auto', // auto-detect WebSocket/SSE
  onOperation: (op) => {
    // Apply remote operation to local editor
    editor.applyOperation(op);
  }
});
```

### 2. Send Operations

```typescript
import { v4 as uuidv4 } from 'uuid';

// Insert text
const insertOp = {
  id: uuidv4(),
  docId: 'report-123:executive_summary',
  userId: currentUser.id,
  timestamp: Date.now(),
  clock: localClock++,
  type: 'insert',
  position: 10,
  text: 'Hello'
};

sendOperation(insertOp);
```

### 3. Add Comments

```typescript
const comment = {
  id: uuidv4(),
  docId: 'report-123:executive_summary',
  userId: currentUser.id,
  userName: currentUser.name,
  content: 'This section needs more detail',
  anchor: {
    start: 100,
    end: 150,
    isCollapsed: false
  },
  createdAt: new Date()
};

addComment(comment);
```

### 4. Track Changes Mode

```typescript
// Enable suggestion mode
const suggestion = {
  id: uuidv4(),
  docId: 'report-123:executive_summary',
  userId: currentUser.id,
  userName: currentUser.name,
  operation: deleteOp, // Proposed change
  status: 'pending',
  createdAt: new Date()
};

addSuggestion(suggestion);
```

## Transport Layers

### WebSocket (Preferred)

- **Path**: `/collab/ws`
- **Protocol**: Socket.IO
- **Auth**: JWT in handshake (`auth.token`)
- **Latency**: ~30ms p95
- **Events**: `join`, `leave`, `operation`, `presence`, `comment`, `suggestion`, `ping`

### SSE (Fallback)

- **Path**: `/collab/sse/connect?docId=xxx&token=yyy`
- **Protocol**: Server-Sent Events
- **Auth**: JWT in query string
- **Latency**: ~100ms p95
- **Notes**: Read-only stream; use REST API for sending operations

### REST (Poll)

- **Endpoints**: See OpenAPI spec (`packages/openapi/collab.yaml`)
- **Auth**: Bearer token in `Authorization` header
- **Latency**: ~200ms p95
- **Use case**: Polling for updates when WebSocket/SSE unavailable

## Operational Transform

### Operation Types

1. **Insert**: Add text at position
   ```json
   { "type": "insert", "position": 10, "text": "Hello" }
   ```

2. **Delete**: Remove text range
   ```json
   { "type": "delete", "position": 10, "length": 5 }
   ```

3. **Replace**: Atomic delete + insert
   ```json
   { "type": "replace", "position": 10, "length": 5, "text": "World" }
   ```

4. **Set Attribute**: Apply formatting
   ```json
   { "type": "set_attribute", "position": 0, "length": 5, "attribute": "bold", "value": true }
   ```

### Convergence

All clients converge to the same document state regardless of operation order:

```
User A: Insert "X" at 0
User B: Insert "Y" at 0  (concurrent)

Result: "XY" or "YX" (deterministic tie-breaking by user ID)
```

## Offline Support

### Operation Queue

When disconnected, operations are queued locally:

```typescript
// Automatic queueing
sendOperation(op); // Queued if offline

// On reconnect
connect(); // Automatically replays queue
```

### Conflict Resolution

On reconnect, queued operations are transformed against server state:

1. Fetch operations since last known clock
2. Transform local queue against server ops
3. Send transformed ops to server
4. Apply server response

## Performance

### Optimization Strategies

1. **Batch Flush**: Operations batched every 50ms
2. **Compression**: Adjacent ops merged (e.g., "a" + "b" → "ab")
3. **Snapshot Compaction**: Base snapshot updated every 10 minutes
4. **Tombstone GC**: Old ops deleted after 7 days
5. **Presence Throttling**: Updates rate-limited to 2/second

### Metrics

Monitor these metrics in Grafana:

- `collab_operations_per_second`: Throughput
- `collab_queue_depth`: Backpressure indicator
- `collab_reconnects_total`: Connection stability
- `collab_p95_operation_rtt_ms`: Latency
- `collab_active_users`: Concurrent load

### SLOs

- **p95 Operation RTT**: ≤120ms
- **Reconnect Merge Success**: ≥99.9%
- **Data Loss**: 0% (across refresh/reconnect)

## Accessibility

### Keyboard Navigation

- `Ctrl/Cmd + /`: Toggle comments panel
- `Ctrl/Cmd + Shift + M`: Enable suggestion mode
- `Tab`: Navigate comments
- `Escape`: Close comment/suggestion UI

### Screen Reader Support

- Presence avatars announced as "Alice is online"
- Typing indicators: "Bob is typing"
- Operation notifications: "Alice inserted text at line 5"
- ARIA live regions for real-time updates

## Troubleshooting

### Issue: Operations not syncing

**Symptoms**: Local edits not visible to other users

**Checks**:
1. Verify WebSocket connection: `console.log(connected)`
2. Check browser DevTools Network tab for failed requests
3. Inspect rate limits: `429` errors indicate throttling
4. Verify JWT token is valid (not expired)

**Resolution**:
- Refresh page to reconnect
- Check firewall/proxy allows WebSocket
- Reduce edit frequency if hitting rate limits

### Issue: Merge conflicts after reconnect

**Symptoms**: Local edits lost or overwritten

**Checks**:
1. Check offline queue size: `offlineQueueLength > 1000` means overflow
2. Inspect transformation errors in console
3. Verify document hasn't been published (immutable)

**Resolution**:
- Reduce offline edit volume
- Reconnect more frequently
- Export local changes before reconnecting

### Issue: Stale presence (users shown as online but not)

**Symptoms**: Avatars persist after user disconnects

**Checks**:
1. Presence cleanup runs every 5 minutes
2. Check server logs for connection errors
3. Verify heartbeat pings working (30s interval)

**Resolution**:
- Wait for cleanup cycle
- Force refresh to clear stale state
- Report to admin if persists >5 minutes

### Issue: Comments not loading

**Symptoms**: Comments panel empty or outdated

**Checks**:
1. Check REST API `/collab/comments?docId=xxx`
2. Verify RBAC role (Viewer cannot see comments in some configs)
3. Inspect database for `collab_comments` table

**Resolution**:
- Refresh page
- Verify user role permits commenting
- Check server health (`/health`)

## Security

### Authentication

- JWT bearer token required for all requests
- Token includes `userId`, `userName`, `email`, `role`
- Tokens expire after 24 hours

### Authorization

- RBAC enforced at document level
- Owner/Editor can modify
- Commenter can add comments only
- Viewer read-only

### Audit Logging

All actions logged to `collab_audit_log`:
- User ID, IP address, user agent
- Action type (join/leave/operation/comment/suggestion)
- Timestamp, document ID
- No PII in metadata

### Rate Limiting

- Per-user limits (120 ops/min)
- Document size limits (100k chars)
- Connection limits (50 users/doc)
- Exceeded limits return `429 Too Many Requests`

## API Reference

See **OpenAPI Specification**: `packages/openapi/collab.yaml`

Generate client:

```bash
npx @openapitools/openapi-generator-cli generate \
  -i packages/openapi/collab.yaml \
  -g typescript-fetch \
  -o apps/corp-cockpit-astro/src/generated/collab-client
```

## Support

- **Documentation**: `/docs/collab/`
- **Issues**: GitHub Issues with `[collab]` tag
- **Monitoring**: Grafana dashboard "Real-Time Collaboration"
- **Runbook**: `/docs/collab/runbook.md`
