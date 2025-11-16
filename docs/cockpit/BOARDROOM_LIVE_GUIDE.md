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

## Support

For issues or questions:
- GitHub Issues: https://github.com/teei/cockpit/issues
- Documentation: https://docs.teei.app/cockpit
- Support Email: support@teei.app
