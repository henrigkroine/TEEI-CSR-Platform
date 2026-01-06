# Boardroom Live Guide (Phase H3-A)

## Overview

Boardroom Live is a full-featured presentation mode for the TEEI Corporate Cockpit, optimized for executive presentations on large displays, boardrooms, and projector screens.

## Features

### 🎯 Core Capabilities

1. **Full-Screen Presentation Mode**
   - Immersive, distraction-free interface
   - Optimized for 4K and ultra-wide displays
   - Auto-scaling typography (1.5x base size)
   - Dark theme for reduced eye strain

2. **Live Updates via SSE**
   - Real-time metric updates
   - Automatic reconnection with event replay
   - Connection status indicators
   - Offline/online mode detection

3. **Evidence Overlay**
   - Toggle evidence citations on/off (Alt+E)
   - Hover to see full evidence details
   - Evidence ID badges on metrics
   - Confidence scores and lineage
   - Source attribution

4. **Offline Snapshot**
   - Export static HTML for offline viewing
   - Embed all styles and convert charts to images
   - Watermarking support
   - Metadata preservation
   - Print-to-PDF capability

5. **Presenter Controls**
   - Auto-hide after 5s of inactivity
   - Keyboard shortcuts for navigation
   - Remote control support (Logitech Spotlight, etc.)
   - Presentation timer
   - Slide cycling

## Getting Started

### Access Boardroom Live

Navigate to:
```
/{lang}/cockpit/{companyId}/boardroom-live
```

### Feature Flag

Ensure the feature flag is enabled:
```bash
PUBLIC_FEATURE_FLAGS=COCKPIT_BOARDROOM_LIVE
```

### Permissions

Requires `VIEW_DASHBOARD` permission.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Space** or **→** | Next slide |
| **←** | Previous slide |
| **Home** | First slide |
| **End** | Last slide |
| **1-9** | Jump to specific slide |
| **P** or **B** | Pause/Resume auto-cycle |
| **F** or **F11** | Toggle fullscreen |
| **Alt+E** | Toggle evidence overlay |
| **S** | Take offline snapshot |
| **R** | Reset presentation timer |
| **H** or **?** | Show help overlay |
| **Esc** | Exit boardroom mode |

## Evidence Overlay

### Enabling Evidence

Press **Alt+E** or click the "Show Evidence" button to toggle the evidence overlay.

### Evidence Details

Hover over any evidence badge to see:
- Evidence ID
- Source and type
- Confidence score (0-100%)
- Collection timestamp
- Description
- Lineage chain

### Evidence Types

- 📊 **Survey** - User surveys and feedback
- 📄 **Document** - PDF/Word documents
- 🔌 **API** - External API data
- 🧮 **Calculation** - Computed values
- ✍️ **Manual** - Manual data entry

## Offline Snapshot

### Creating a Snapshot

1. Press **S** key or click "Snapshot" button in presenter controls
2. Snapshot is generated (target: < 2.0s)
3. HTML file is automatically downloaded
4. File includes:
   - Current dashboard state
   - All inline styles
   - Charts as PNG images
   - Watermark
   - Metadata

### Snapshot Metadata

Each snapshot includes:
```json
{
  "timestamp": "2025-11-16T10:30:00Z",
  "companyId": "acme-corp",
  "title": "TEEI Corporate Cockpit",
  "url": "https://teei.app/en/cockpit/acme-corp/boardroom-live",
  "dataIncluded": {
    "evidence": true,
    "lineage": true,
    "charts": 4,
    "metrics": 12
  },
  "watermark": "TEEI Corporate Cockpit • 11/16/2025, 10:30:00 AM"
}
```

### Export to PDF

1. Create snapshot first
2. Click "PDF" in the snapshot download dialog
3. Browser print dialog opens
4. Select "Save as PDF"
5. PDF preserves:
   - Colors (print-color-adjust: exact)
   - Watermark
   - Evidence citations
   - All formatting

## Presenter Controls

### Auto-Hide Behavior

Controls automatically hide after 5 seconds of mouse inactivity. Move your mouse or press any key to show them again.

### Timer

- Starts automatically when boardroom mode is entered
- Format: HH:MM:SS
- Press **R** to reset
- Persists across slide changes

### Auto-Cycle

- Enable/disable with **P** or **B** key
- Default interval: 30 seconds per slide
- Configurable in props
- Pauses on user interaction

### Status Indicators

- **Green dot** - Live (SSE connected)
- **Yellow dot** - Paused
- **Red dot** - Offline/Disconnected

## Performance Targets (AC)

| Metric | Target | Measurement |
|--------|--------|-------------|
| View switch | < 100ms | Performance.now() diff |
| SSE reconnect | < 5s (p95) | Connection state change |
| Offline snapshot load | < 2.0s | DOMContentLoaded event |
| Snapshot generation | < 2.0s | createSnapshot() duration |

## Architecture

### Component Hierarchy

```
boardroom-live.astro
└── BoardroomLiveView.tsx
    ├── EvidenceOverlay.tsx
    │   └── EvidenceBadge.tsx (per metric)
    └── PresenterControls.tsx
```

### SSE Integration

```typescript
// SSE client with resume capability
createSSEResumeClient({
  url: '/api/sse/dashboard',
  companyId: 'acme-corp',
  channel: 'boardroom-live',
  onMessage: (event) => {
    // Handle dashboard updates
  },
  onConnectionChange: (state) => {
    // Update UI based on connection state
  }
})
```

### Offline Snapshot Process

```typescript
// 1. Clone DOM
const html = document.documentElement.cloneNode(true)

// 2. Convert canvas to images
canvas.toDataURL('image/png', 0.9)

// 3. Inline CSS
inlineStyles(html)

// 4. Add watermark
addWatermark(html, watermarkText)

// 5. Serialize and download
const blob = new Blob([htmlString], { type: 'text/html' })
```

## Customization

### Slide Configuration

```tsx
const views: DashboardView[] = [
  {
    id: 'kpis',
    title: 'Key Performance Indicators',
    component: <KPIView companyId={companyId} />
  },
  // Add more views...
]
```

### Evidence Sources

```tsx
const evidence: EvidenceItem[] = [
  {
    id: 'EV-001',
    type: 'survey',
    source: 'Employee Engagement Survey Q4 2024',
    confidence: 0.95,
    timestamp: '2024-11-15T10:00:00Z',
    verified: true,
    lineage: ['SRC-001', 'PROC-002']
  }
]
<<<<<<< HEAD
=======
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
>>>>>>> origin/claude/worker5-data-trust-catalog-01MP5u1wgV11fa33LqqEQWbp
```

## Troubleshooting

### SSE Connection Issues

**Problem**: "Disconnected from live updates" banner

**Solutions**:
1. Check network connectivity
2. Verify SSE endpoint is reachable: `/api/sse/dashboard`
3. Check browser console for CORS errors
4. Ensure firewall allows EventSource connections
5. Check SSE service is running: `pnpm -w dev`

### Snapshot Generation Fails

**Problem**: Snapshot download doesn't start

**Solutions**:
1. Check browser console for errors
2. Ensure canvas elements can be converted (CORS)
3. Verify popup blocker isn't blocking download
4. Check available disk space
5. Try in different browser (Chrome/Firefox/Edge)

### Fullscreen Not Working

**Problem**: F key doesn't trigger fullscreen

**Solutions**:
1. User gesture required - click first
2. Check browser permissions
3. Try F11 instead
4. Some browsers block fullscreen on iframes

### Evidence Not Showing

**Problem**: Evidence badges don't appear

**Solutions**:
1. Press Alt+E to enable overlay
2. Check evidence data is loaded
3. Verify metrics have evidence IDs
4. Check console for React errors

## Best Practices

### For Presenters

1. **Test Before Presenting**
   - Load boardroom mode before meeting
   - Verify all slides load correctly
   - Check SSE connection is stable
   - Test fullscreen and controls

2. **During Presentation**
   - Use presenter remote for navigation
   - Enable evidence overlay for Q&A
   - Pause auto-cycle during discussion
   - Take snapshot for distribution after

3. **For Large Displays**
   - Use 4K resolution (3840x2160) for best quality
   - Enable auto-cycle for lobby displays
   - Adjust refresh interval based on content
   - Consider audience distance for font sizing

### For Administrators

1. **Configure SSE Endpoint**
   ```bash
   PUBLIC_SSE_ENDPOINT=https://your-domain.com/api/sse/dashboard
   ```

2. **Enable Feature Flag**
   ```bash
   PUBLIC_FEATURE_FLAGS=COCKPIT_BOARDROOM_LIVE
   ```

3. **Monitor Performance**
   - Check SSE connection health
   - Monitor snapshot generation times
   - Track view switch performance
   - Review error logs

4. **Security**
   - Ensure RBAC permissions are enforced
   - Audit snapshot downloads
   - Monitor embed token usage
   - Review evidence data access

## API Reference

### SSE Events

**Channel**: `boardroom-live`

**Event Types**:
- `dashboard-update` - Metric updates
- `evidence-update` - New evidence available
- `heartbeat` - Keep-alive (every 30s)

**Message Format**:
```json
{
  "type": "dashboard-update",
  "data": {
    "metrics": [...],
    "evidence": [...],
    "timestamp": "2025-11-16T10:30:00Z"
  }
}
```

### Snapshot API

```typescript
interface SnapshotOptions {
  companyId: string;
  includeEvidence?: boolean;
  includeLineage?: boolean;
  watermark?: string;
  imageQuality?: number; // 0-1
  includeTimestamp?: boolean;
  filename?: string;
}

// Create and download snapshot
const result = await downloadSnapshot(options);
```

## Future Enhancements

Planned for future phases:

- [ ] Multi-presenter mode (presenter + audience view)
- [ ] Voice control integration
- [ ] Live annotation during presentation
- [ ] Collaborative Q&A overlay
- [ ] Recording/replay capability
- [ ] Scheduled auto-updates
- [ ] Custom branding per company
- [ ] Accessibility enhancements (WCAG 2.2 AAA)
<<<<<<< HEAD
=======
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
>>>>>>> origin/claude/worker5-data-trust-catalog-01MP5u1wgV11fa33LqqEQWbp

## Support

For issues or questions:
- GitHub Issues: https://github.com/teei/cockpit/issues
- Documentation: https://docs.teei.app/cockpit
- Support Email: support@teei.app
<<<<<<< HEAD
=======
- Documentation: `/docs/cockpit/`
- API Docs: `/docs/api/`
- GitHub Issues: https://github.com/anthropics/claude-code/issues

---

**Last Updated**: 2025-11-16
**Phase**: H3-A
**Version**: 1.0.0
>>>>>>> origin/claude/worker5-data-trust-catalog-01MP5u1wgV11fa33LqqEQWbp
