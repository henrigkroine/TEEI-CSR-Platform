# Boardroom Live Guide

**Phase H3-A: Corporate Cockpit GA+ Enhancement**

## Overview

Boardroom Live is a full-screen presentation mode designed for executive presentations on large displays (TVs, projectors, boardroom screens). It provides real-time metrics with SSE-based live updates, evidence overlays, offline snapshot capability, and presenter controls.

## Features

### 1. Full-Screen Presentation Mode
- **Optimized Layout**: Hides navigation and sidebars for maximum content visibility
- **Large Typography**: 1.5x scale for readability on large screens
- **Auto-Refresh**: Metrics update every 60 seconds automatically
- **Keyboard Navigation**: Full keyboard control for remote presentations

### 2. Live SSE Updates with Polling Fallback
- **Primary Transport**: Server-Sent Events (SSE) for real-time updates
- **Automatic Fallback**: Degrades to polling if SSE unavailable
- **Reconnection Logic**: Automatic reconnection with exponential backoff
- **Performance**: SSE reconnect < 5s (p95)

### 3. Evidence Overlay
- **Toggleable Display**: Show/hide evidence and citations on demand
- **Source Information**: Complete data lineage and source tracking
- **Confidence Scores**: Visual indicators for data confidence levels
- **Search & Filter**: Quickly find specific evidence items

### 4. Offline Snapshot Capability
- **IndexedDB Storage**: Persistent offline data storage
- **Quick Loading**: Snapshot loads < 2.0s (acceptance criteria)
- **Automatic Sync**: Saves latest data for offline access
- **Metadata Tracking**: Timestamp and version information

### 5. Presenter Controls
- **View Navigation**: Switch between Dashboard, Trends, SROI, VIS
- **Evidence Toggle**: Show/hide evidence overlay (E key)
- **Data Refresh**: Manual refresh trigger (R key)
- **PDF Export**: Export current view with watermarks and citations

## Usage

### Accessing Boardroom Live

```
URL: /[lang]/cockpit/[companyId]/boardroom-live
```

**Requirements**:
- User must have `VIEW_DASHBOARD` permission
- Feature flag `COCKPIT_BOARDROOM_LIVE` must be enabled

### Keyboard Controls

| Key | Action |
|-----|--------|
| `→` or `PgDn` | Next view |
| `←` or `PgUp` | Previous view |
| `E` | Toggle evidence overlay |
| `R` | Refresh data |
| `Esc` | Exit boardroom mode |
| `F11` | Toggle fullscreen (browser) |

### View Switching Performance

View switches are performance-monitored and must complete in < 100ms:

```typescript
// Performance measurement
const startTime = performance.now();
setCurrentView(view);
const switchTime = performance.now() - startTime;
// Warning if > 100ms
```

### Connection States

Boardroom Live displays connection status:

1. **SSE Connected** (🟢): Real-time updates via Server-Sent Events
2. **Polling Mode** (🟡): Fallback to periodic polling
3. **Offline** (🔴): Using cached snapshot data
4. **Disconnected** (⚪): Reconnecting...

## Component Architecture

### Main Components

```
boardroom-live.astro              # Page entry point
  └─ BoardroomLiveApp.tsx         # Main React app
       ├─ BoardroomMode.tsx       # Full-screen container
       ├─ PresenterControls.tsx   # Navigation controls
       ├─ EvidenceOverlay.tsx     # Evidence display
       ├─ BoardroomMetrics.tsx    # Metrics visualization
       └─ useOfflineSnapshot.ts   # Offline capability
```

### Data Flow

```
API /api/cockpit/{companyId}/live-metrics
  ├─ SSE: /api/sse/cockpit-live/{companyId}
  │    └─ Real-time updates (primary)
  │
  ├─ Polling Fallback
  │    └─ GET every 5s (if SSE fails)
  │
  └─ IndexedDB Snapshot
       └─ Offline cache (< 2.0s load time)
```

## SSE Implementation

### Connection Setup

```typescript
const {
  state: sseState,
  isConnected: isSSEConnected,
  isPolling,
  subscribe: subscribeToSSE,
} = useSSEConnection({
  companyId,
  channel: 'cockpit-live',
  autoConnect: true,
  enablePollingFallback: true,
  pollingInterval: 5000,
  retryOptions: {
    initialDelay: 1000,
    maxDelay: 5000,
    maxRetries: 5,
  },
});
```

### Event Handling

```typescript
useEffect(() => {
  const unsubscribe = subscribeToSSE((event) => {
    const data = JSON.parse(event.data);
    setMetricsData(data);
    saveSnapshot(data); // Save for offline
  });

  return unsubscribe;
}, [subscribeToSSE, saveSnapshot]);
```

## Offline Snapshot

### Storage Strategy

- **Database**: IndexedDB (`teei-cockpit-offline`)
- **Object Store**: `snapshots`
- **Indexes**: `timestamp`, `companyId`
- **Max Age**: 7 days (automatic cleanup)

### Snapshot Structure

```typescript
interface Snapshot<T> {
  data: T;
  metadata: {
    timestamp: number;
    version: string;
    companyId: string;
    key: string;
  };
}
```

### Usage

```typescript
const {
  hasSnapshot,
  snapshotAge,
  saveSnapshot,
  loadSnapshot,
} = useOfflineSnapshot({
  companyId,
  key: 'boardroom-live-snapshot',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// Save data
await saveSnapshot(metricsData);

// Load offline
if (isOffline && hasSnapshot) {
  const data = await loadSnapshot();
}
```

## Evidence Overlay

### Features

- **Evidence List**: All metrics with source attribution
- **Confidence Scoring**: Visual indicators (High/Medium/Low)
- **Search**: Filter evidence by metric, source, or citation
- **Details Panel**: Expandable metadata for each evidence item

### Evidence Data Format

```typescript
interface EvidenceItem {
  id: string;
  metric: string;
  value: string | number;
  source: string;
  timestamp: string;
  citation?: string;
  confidence?: number; // 0.0 - 1.0
}
```

### Confidence Thresholds

- **High** (≥80%): Green badge
- **Medium** (50-79%): Yellow badge
- **Low** (<50%): Red badge

## PDF Export with Watermarks

### Export Function

```typescript
const handleExportPDF = async () => {
  const response = await fetch(
    `/api/cockpit/${companyId}/export-boardroom-pdf`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        view: currentView,
        includeEvidence: showEvidenceOverlay,
        timestamp: new Date().toISOString(),
      }),
    }
  );
};
```

### Watermark Requirements

- **Timestamp**: Date and time of export
- **Evidence ID**: Unique identifier for audit trail
- **Evidence Hash**: Content verification
- **Company Info**: Company name and ID

## Performance Requirements

| Metric | Target | Notes |
|--------|--------|-------|
| View switch | < 100ms | Measured via `performance.now()` |
| SSE reconnect | < 5s (p95) | Exponential backoff |
| Offline load | < 2.0s | IndexedDB retrieval |
| Refresh rate | 60s | Configurable |

## Accessibility

### ARIA Support

- All interactive elements have `aria-label`
- Connection status uses `role="status"`
- Evidence overlay uses `role="dialog"`
- Keyboard controls documented in UI

### Screen Reader Announcements

```html
<div role="status" aria-live="polite">
  {connectionStatus === 'sse' && 'Live updates connected'}
</div>
```

## Internationalization

Boardroom Live supports all configured languages:
- English (en)
- Ukrainian (uk)
- Norwegian (no)
- Arabic (ar) - RTL
- Hebrew (he) - RTL

### RTL Support

Arabic and Hebrew use right-to-left layout via `/src/styles/rtl.css`:

```css
[lang="ar"], [lang="he"] {
  direction: rtl;
}
```

## Troubleshooting

### SSE Not Connecting

1. Check feature flag: `PUBLIC_FEATURE_COCKPIT_BOARDROOM_LIVE`
2. Verify SSE endpoint: `/api/sse/cockpit-live/{companyId}`
3. Check browser console for CORS errors
4. Fallback to polling should activate automatically

### Offline Snapshot Not Loading

1. Check IndexedDB in browser DevTools
2. Verify snapshot age (max 7 days)
3. Clear old snapshots: `clearAllSnapshots()`

### PDF Export Failing

1. Verify `EXPORT_DATA` permission
2. Check backend PDF generation service
3. Review watermarking implementation

## API Endpoints

### Live Metrics

```
GET /api/cockpit/{companyId}/live-metrics
```

**Response**:
```json
{
  "dashboard": {
    "participants": 1250,
    "volunteers": 890,
    "sessions": 456,
    ...
  },
  "evidence": [
    {
      "id": "ev-123",
      "metric": "Participants",
      "value": 1250,
      "source": "Database",
      "timestamp": "2025-11-16T10:30:00Z",
      "confidence": 0.95
    }
  ]
}
```

### SSE Stream

```
GET /api/sse/cockpit-live/{companyId}
```

**Event Format**:
```
event: metrics-update
data: {"dashboard": {...}, "evidence": [...]}
id: msg-12345
```

### PDF Export

```
POST /api/cockpit/{companyId}/export-boardroom-pdf
Content-Type: application/json

{
  "view": "dashboard",
  "includeEvidence": true,
  "timestamp": "2025-11-16T10:30:00Z"
}
```

**Response**: PDF binary with watermarks

## Security Considerations

1. **RBAC**: All endpoints enforce `VIEW_DASHBOARD` permission
2. **Tenant Isolation**: CompanyId scoped to authenticated user
3. **Rate Limiting**: PDF exports limited to prevent abuse
4. **Evidence Integrity**: Hash-based verification for exports

## Testing

### E2E Tests

```bash
pnpm e2e:run tests/e2e/boardroom-live.spec.ts
```

**Coverage**:
- ✅ Enter/exit boardroom mode
- ✅ SSE connection and fallback
- ✅ View navigation with keyboard
- ✅ Evidence overlay toggle
- ✅ Offline snapshot loading
- ✅ PDF export (if permitted)

### Performance Tests

```bash
pnpm k6:run tests/load/cockpit-boardroom.js
```

**Targets**:
- p95 ≤ 500ms @ 100 concurrent users

## Migration Notes

### From Previous Boardroom Mode

The original `BoardroomMode.tsx` component has been enhanced with:
- SSE integration (new)
- Evidence overlay (new)
- Offline snapshots (new)
- Presenter controls (enhanced)

### Breaking Changes

None - fully backward compatible.

## Future Enhancements

- [ ] Multi-screen support (presenter + audience displays)
- [ ] Custom dashboard layouts
- [ ] Voice control integration
- [ ] Recording/playback for presentations
- [ ] Collaborative annotations

## Support

For issues or questions:
- Documentation: `/docs/cockpit/`
- API Docs: `/docs/api/`
- GitHub Issues: https://github.com/anthropics/claude-code/issues

---

**Last Updated**: 2025-11-16
**Phase**: H3-A
**Version**: 1.0.0
