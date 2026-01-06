# Server-Sent Events (SSE) Real-Time Updates

## Overview

The TEEI Corporate Cockpit implements Server-Sent Events (SSE) for real-time dashboard updates with automatic reconnection, exponential backoff, and polling fallback.

**Features:**
- ✅ Exponential backoff on connection failures
- ✅ Automatic reconnection with configurable max retries
- ✅ Last-event-ID resume logic to prevent data loss
- ✅ Company-scoped channels for tenant isolation
- ✅ Graceful fallback to polling when SSE unavailable
- ✅ Connection status indicators
- ✅ Event history for missed events recovery

---

## Architecture

### Client-Side Components

#### 1. SSE Client (`sseClient.ts`)

Core SSE client with resilience features:

```typescript
import { createSSEClient } from '../utils/sseClient';

const client = createSSEClient({
  companyId: 'acme-corp',
  channel: 'dashboard-updates',
  initialRetryDelay: 1000,
  maxRetryDelay: 30000,
  maxRetries: 10,
  onConnectionChange: (state) => {
    console.log('Connection state:', state);
  },
  onMessage: (event) => {
    console.log('Received event:', event);
  },
  onError: (error) => {
    console.error('SSE error:', error);
  },
});

client.connect();
```

**Connection States:**
- `disconnected` - Not connected
- `connecting` - Establishing connection
- `connected` - Successfully connected
- `reconnecting` - Attempting to reconnect after failure
- `failed` - Max retries exceeded

#### 2. React Hook (`useSSEConnection.ts`)

React-friendly interface with automatic lifecycle management:

```tsx
import { useSSEConnection } from '../hooks/useSSEConnection';

function MyComponent({ companyId }) {
  const connection = useSSEConnection({
    companyId,
    channel: 'dashboard-updates',
    autoConnect: true,
    enablePollingFallback: true,
  });

  // Subscribe to messages
  React.useEffect(() => {
    const unsubscribe = connection.subscribe((event) => {
      console.log('Received:', event);
    });

    return unsubscribe;
  }, [connection]);

  return (
    <div>
      Status: {connection.isConnected ? 'Connected' : 'Offline'}
    </div>
  );
}
```

**Specialized Hooks:**

```tsx
// Dashboard updates
const connection = useDashboardUpdates(companyId, (data) => {
  console.log('Dashboard update:', data);
});

// Evidence updates
const connection = useEvidenceUpdates(companyId, (data) => {
  console.log('Evidence update:', data);
});
```

#### 3. Connection Status UI (`ConnectionStatus.tsx`)

Visual indicators for connection state:

```tsx
import ConnectionStatus from '../components/ConnectionStatus';

// Full indicator with tooltip
<ConnectionStatus connection={connection} position="top-right" showDetails />

// Compact dot only
<ConnectionStatusCompact connection={connection} />

// Badge for headers
<ConnectionStatusBadge connection={connection} />

// Banner for important notifications
<ConnectionStatusBanner
  connection={connection}
  onDismiss={() => setShowBanner(false)}
/>
```

### Server-Side Components

#### 1. SSE Manager (`sse/sseManager.ts`)

Manages all SSE connections with tenant isolation:

```typescript
import { sseManager } from '../sse/sseManager';

// Add connection
sseManager.addConnection(
  connectionId,
  companyId,
  channel,
  reply,
  lastEventId // Optional resume support
);

// Broadcast to all clients in channel
sseManager.broadcast(
  'acme-corp',
  'dashboard-updates',
  'dashboard-update',
  { metric: 'SROI', value: 2.5 }
);

// Remove connection
sseManager.removeConnection(connectionId);

// Get statistics
const stats = sseManager.getStats();
```

**Features:**
- Company-scoped channels for tenant isolation
- Event history (last 100 events per channel) for resume support
- Automatic heartbeat every 30 seconds
- Connection lifecycle management

#### 2. SSE Routes (`routes/sse.ts`)

Fastify routes for SSE endpoints:

**Endpoints:**

```bash
# Establish SSE connection
GET /sse/stream?companyId=acme-corp&channel=dashboard-updates&lastEventId=event-123

# Get connection statistics (admin only)
GET /sse/stats

# Test broadcast (development only)
POST /sse/test-broadcast
Body: { companyId, channel, type, data }
```

**Helper Functions:**

```typescript
import {
  broadcastDashboardUpdate,
  broadcastEvidenceUpdate,
  broadcastReportUpdate,
} from '../routes/sse';

// Trigger updates from anywhere in the application
broadcastDashboardUpdate('acme-corp', {
  widgets: ['sroi', 'vis'],
  timestamp: new Date().toISOString(),
});
```

---

## Usage Examples

### Example 1: Dashboard with Real-Time Updates

```tsx
import DashboardWithSSE from '../components/DashboardWithSSE';

export default function Dashboard({ companyId }) {
  return (
    <DashboardWithSSE companyId={companyId}>
      <SROIPanel companyId={companyId} />
      <VISPanel companyId={companyId} />
      <Q2QFeed companyId={companyId} />
    </DashboardWithSSE>
  );
}
```

### Example 2: Widget with Real-Time Updates

```tsx
import { useDashboardUpdate } from '../components/DashboardWithSSE';

export function SROIPanel({ companyId }) {
  const [data, setData] = React.useState(null);

  // Fetch initial data
  React.useEffect(() => {
    fetch(`/api/companies/${companyId}/sroi`)
      .then((res) => res.json())
      .then(setData);
  }, [companyId]);

  // Listen for real-time updates
  useDashboardUpdate((update) => {
    if (update.widgets?.includes('sroi')) {
      // Refetch SROI data
      fetch(`/api/companies/${companyId}/sroi`)
        .then((res) => res.json())
        .then(setData);
    }
  });

  return <div>SROI: {data?.value}</div>;
}
```

### Example 3: Trigger Update from Backend

```typescript
import { broadcastDashboardUpdate } from './routes/sse';

// After data mutation
export async function updateVolunteerHours(companyId: string, hours: number) {
  // Update database
  await db.volunteerHours.update({ companyId, hours });

  // Notify connected clients
  broadcastDashboardUpdate(companyId, {
    widgets: ['sroi', 'vis', 'at-a-glance'],
    reason: 'volunteer_hours_updated',
    timestamp: new Date().toISOString(),
  });
}
```

---

## Configuration

### Client Configuration

```typescript
const client = createSSEClient({
  companyId: 'acme-corp',          // Required: Company ID
  channel: 'dashboard-updates',    // Required: Event channel

  // Retry configuration
  initialRetryDelay: 1000,         // Initial delay: 1s
  maxRetryDelay: 30000,            // Max delay: 30s
  maxRetries: 10,                  // Max attempts: 10

  // Callbacks
  onConnectionChange: (state) => {},
  onMessage: (event) => {},
  onError: (error) => {},
});
```

### Polling Fallback Configuration

```typescript
const fallback = new PollingFallback({
  companyId: 'acme-corp',
  channel: 'dashboard-updates',
  pollInterval: 5000,              // Poll every 5 seconds
  onMessage: (event) => {},
  onError: (error) => {},
});

fallback.start();
```

---

## Event Channels

### Available Channels

| Channel | Description | Event Types |
|---------|-------------|-------------|
| `dashboard-updates` | Dashboard widget updates | `dashboard-update`, `connected` |
| `evidence-updates` | Evidence explorer updates | `evidence-update`, `evidence-deleted` |
| `report-updates` | Report generation status | `report-ready`, `report-failed` |

### Adding New Channels

**1. Update validation in `routes/sse.ts`:**

```typescript
const validChannels = [
  'dashboard-updates',
  'evidence-updates',
  'report-updates',
  'my-new-channel', // Add here
];
```

**2. Create specialized hook in `useSSEConnection.ts`:**

```typescript
export function useMyNewChannelUpdates(
  companyId: string,
  onUpdate: (data: unknown) => void
) {
  const connection = useSSEConnection({
    companyId,
    channel: 'my-new-channel',
  });

  useSSEMessage(connection, 'my-event-type', (data) => {
    onUpdate(data);
  });

  return connection;
}
```

**3. Create broadcast helper in `routes/sse.ts`:**

```typescript
export function broadcastMyNewChannel(companyId: string, data: unknown): void {
  sseManager.broadcast(companyId, 'my-new-channel', 'my-event-type', data);
}
```

---

## Testing

### Unit Tests

```bash
# Run SSE client tests
pnpm test sseClient.test.ts
```

### Manual Testing

**1. Start reporting service:**

```bash
cd services/reporting
pnpm dev
```

**2. Test SSE connection:**

```bash
# Connect to SSE stream
curl -N http://localhost:4000/sse/stream?companyId=test-company&channel=dashboard-updates
```

**3. Trigger test broadcast (development only):**

```bash
curl -X POST http://localhost:4000/sse/test-broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "test-company",
    "channel": "dashboard-updates",
    "type": "dashboard-update",
    "data": { "metric": "SROI", "value": 2.5 }
  }'
```

**4. Check connection statistics:**

```bash
curl http://localhost:4000/sse/stats
```

### Browser Testing

Open browser console and run:

```javascript
const eventSource = new EventSource(
  '/api/sse/stream?companyId=test-company&channel=dashboard-updates'
);

eventSource.onopen = () => console.log('Connected');
eventSource.onmessage = (event) => console.log('Message:', event.data);
eventSource.onerror = (error) => console.error('Error:', error);
```

---

## Troubleshooting

### Issue: SSE Connection Fails Immediately

**Symptoms:** Client connects but immediately disconnects with error

**Solutions:**
1. Check CORS configuration in `services/reporting/src/index.ts`
2. Verify company ID format (alphanumeric, hyphens, underscores only)
3. Check firewall rules allow streaming responses
4. Disable nginx buffering if behind reverse proxy

### Issue: No Events Received

**Symptoms:** Connection established but no events arrive

**Solutions:**
1. Verify backend is calling `broadcastDashboardUpdate()`
2. Check company ID matches between client and broadcast
3. Check channel name matches exactly
4. Enable debug logging: `DEBUG=sse:* pnpm dev`

### Issue: Frequent Disconnections

**Symptoms:** Connection drops every 30-60 seconds

**Solutions:**
1. Check for aggressive load balancer timeouts
2. Verify heartbeat is working (30s interval)
3. Check client network connection stability
4. Consider increasing heartbeat frequency

### Issue: High Memory Usage

**Symptoms:** Server memory grows over time

**Solutions:**
1. Check event history size (default 100 per channel)
2. Verify connections are properly closed on client disconnect
3. Monitor `sseManager.getStats()` for connection leaks
4. Implement connection TTL if needed

---

## Performance Considerations

### Client-Side

- SSE connections are long-lived (1 connection per client)
- Minimal CPU usage (event-driven, no polling)
- Low network overhead (only when events occur)
- Consider polling fallback for mobile networks

### Server-Side

- 1 open HTTP connection per client
- ~2KB memory per connection
- Heartbeat every 30s adds minimal overhead
- Event history: ~10KB per channel (last 100 events)

**Capacity Estimates:**
- 1,000 concurrent connections: ~2MB memory
- 10,000 concurrent connections: ~20MB memory
- Event throughput: ~10,000 events/second

---

## Security Considerations

### Authentication

**Current Implementation:**
- TODO: Add JWT authentication middleware
- Company ID validation prevents cross-tenant access
- Channel access control not yet implemented

**Recommended:**

```typescript
// Add to routes/sse.ts
const user = await validateJWT(request.headers.authorization);

if (user.company_id !== companyId && user.role !== 'SUPER_ADMIN') {
  return reply.status(403).send({ error: 'FORBIDDEN' });
}
```

### Rate Limiting

**Current:** Global rate limiting via `@fastify/rate-limit`

**Recommended:** Per-company connection limits

```typescript
// Track connections per company
const connectionLimits = new Map<string, number>();
const MAX_CONNECTIONS_PER_COMPANY = 100;

if ((connectionLimits.get(companyId) || 0) >= MAX_CONNECTIONS_PER_COMPANY) {
  return reply.status(429).send({ error: 'TOO_MANY_CONNECTIONS' });
}
```

### Data Validation

- All event data is JSON-encoded
- Company IDs validated with regex pattern
- Channel names restricted to whitelist
- No user input directly broadcast

---

## Monitoring

### Metrics to Track

```typescript
const stats = sseManager.getStats();

// Monitor these metrics:
stats.totalConnections;           // Active connections
stats.connectionsByCompany;       // Per-tenant breakdown
stats.connectionsByChannel;       // Per-channel breakdown
stats.historySize;                // Event history size
```

### Alerts

Set up alerts for:
- Connection count > 80% of capacity
- Reconnection rate > 10%
- Event broadcast failures
- Memory usage growth

### Logging

Enable SSE logging:

```bash
LOG_LEVEL=debug pnpm dev
```

Logs include:
- Connection established/closed
- Broadcasts sent
- Reconnection attempts
- Error details

---

## Migration from Polling

If you're currently using polling, migrate gradually:

**1. Enable SSE alongside polling:**

```tsx
const connection = useSSEConnection({
  companyId,
  channel: 'dashboard-updates',
  enablePollingFallback: true,  // Keep polling as backup
});
```

**2. Monitor SSE adoption:**

Track SSE vs polling usage via `getStats()`

**3. Gradually reduce polling frequency:**

```typescript
const POLL_INTERVAL = connection.isConnected ? 60000 : 5000;
```

**4. Remove polling once SSE stable:**

After 1-2 weeks of stable SSE, disable polling fallback.

---

## Future Enhancements

### Planned Features

- [ ] JWT authentication middleware
- [ ] Per-channel access control
- [ ] Compression for large payloads
- [ ] Binary event support (Protocol Buffers)
- [ ] Reconnection jitter to prevent thundering herd
- [ ] Connection pooling for shared workers
- [ ] WebSocket fallback (Socket.IO)

### Experimental Features

- [ ] Event replay (last N minutes)
- [ ] Event filtering client-side
- [ ] Multi-channel subscription
- [ ] Priority events (bypass queue)

---

## References

- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [SSE Spec (W3C)](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Fastify SSE](https://github.com/fastify/fastify-sse-v2)
- [EventSource Polyfill](https://github.com/Yaffle/EventSource)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-13
**Maintained By**: Worker 3 - Phase C Implementation
**Review Frequency**: After each sprint
