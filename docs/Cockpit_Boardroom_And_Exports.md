# Corporate Cockpit: Boardroom Mode & Executive Exports

**Version**: 1.0
**Last Updated**: 2025-11-15
**Phase**: F - Executive UX & Reporting Finish

---

## Overview

This document provides comprehensive guidance on using and administering the Corporate Cockpit's executive presentation features: **Boardroom Mode** and **Executive Report Exports** (PowerPoint).

### Key Features

1. **Boardroom Mode**: Full-screen auto-cycling dashboard for large displays
2. **PPTX Export**: PowerPoint generation with evidence lineage
3. **Share Links**: Secure sharing with PII redaction
4. **Dark Mode**: Professional dark theme with WCAG AA compliance
5. **Offline Support**: Cached data for uninterrupted presentations

---

## Table of Contents

1. [Boardroom Mode](#boardroom-mode)
2. [PPTX Export](#pptx-export)
3. [Share Links](#share-links)
4. [Dark Mode](#dark-mode)
5. [Performance Optimizations](#performance-optimizations)
6. [Troubleshooting](#troubleshooting)

---

## Boardroom Mode

### What is Boardroom Mode?

Boardroom Mode is a full-screen presentation view designed for large displays in executive meetings, boardrooms, and public demonstrations. It features:

- **Auto-Cycling Dashboards**: Rotates through key metrics every 30 seconds
- **Real-Time Updates**: Live SSE connection with status indicator
- **Offline Resilience**: Falls back to cached data when disconnected
- **Keyboard Controls**: Spacebar (pause/resume), Arrows (navigation), Esc (exit)
- **Professional Display**: No navigation bars, maximized content area

### Accessing Boardroom Mode

**URL Pattern**:
```
/{locale}/cockpit/{companyId}/boardroom
```

**Examples**:
```
https://cockpit.teei.io/en/cockpit/acme-corp/boardroom
https://cockpit.teei.io/uk/cockpit/acme-corp/boardroom
https://cockpit.teei.io/no/cockpit/acme-corp/boardroom
```

**Query Parameters**:
- `interval` - Cycle interval in milliseconds (default: 30000)
- `autoStart` - Auto-start cycling (default: true)
- `sseUrl` - Custom SSE endpoint (default: /api/sse)

**Example**:
```
/en/cockpit/acme-corp/boardroom?interval=60000&autoStart=false
```

### Widget Rotation

Boardroom Mode cycles through 4 dashboard widgets:

1. **At-a-Glance Metrics**: SROI, beneficiaries, volunteer hours, social value
2. **SROI Deep Dive**: Social ROI trends, investment breakdown, outcome attribution
3. **VIS Scores**: Volunteer Impact Score by dimension (belonging, confidence, etc.)
4. **Q2Q Insights**: Qualitative-to-Quantitative evidence highlights

### Controls

#### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Spacebar** | Pause/resume auto-cycling |
| **Left Arrow** | Previous widget |
| **Right Arrow** | Next widget |
| **Escape** | Exit boardroom mode (returns to main cockpit) |

#### Mouse Controls

- **Auto-hide**: Controls fade after 3 seconds of inactivity
- **Show on hover**: Move mouse to reveal controls
- **Click controls**: Pause/Resume, Previous, Next, Exit buttons

### Connection Status

**Status Indicators**:

- **🟢 Live**: Real-time SSE connection active
- **🟡 Connecting**: Attempting to connect/reconnect
- **🔴 Offline**: No connection, showing cached data
- **⚫ Failed**: Connection failed after max retries

**Stale Data Warning**:

If offline for >5 minutes, a banner appears:
```
⚠️ STALE DATA - Last updated 12 minutes ago
```

### Offline Support

**IndexedDB Cache**:
- Stores last successful dataset per company
- 7-day expiration policy
- Fallback when SSE disconnected
- Displays cache age in stale banner

**Cache Management**:
- Auto-refresh when connection restored
- Manual refresh: Exit and re-enter boardroom mode

### Setup for Physical Boardrooms

**Hardware Recommendations**:
- Large display: 50"+ 4K TV or projector
- Chrome/Edge browser in kiosk mode
- Stable network connection (or local caching enabled)
- Wireless keyboard for controls (optional)

**Browser Kiosk Mode (Chrome)**:
```bash
# Windows
chrome.exe --kiosk https://cockpit.teei.io/en/cockpit/{companyId}/boardroom

# macOS
open -a "Google Chrome" --args --kiosk https://cockpit.teei.io/en/cockpit/{companyId}/boardroom

# Linux
google-chrome --kiosk https://cockpit.teei.io/en/cockpit/{companyId}/boardroom
```

**Recommended Settings**:
- Disable screensaver
- Disable automatic updates
- Enable auto-login (if dedicated machine)
- Set boardroom URL as browser startup page

---

## PPTX Export

### Overview

Generate professional PowerPoint presentations with evidence-backed narratives, charts, and tenant branding.

### Features

1. **Evidence Lineage**: All claims cite source evidence IDs in slide notes
2. **Tenant Branding**: Logo and colors from company theme
3. **Chart Embedding**: Server-rendered charts as high-quality images
4. **Watermarking**: Status-based watermarks (DRAFT, APPROVED, etc.)
5. **Multi-Language Support**: EN, UK, NO locales

### Generating a PPTX Report

**From Reports Page**:

1. Navigate to `/en/cockpit/{companyId}/reports`
2. Click **"Export to PowerPoint"** button
3. Configure export options:
   - **Narrative Tone**: Formal, Professional, Conversational
   - **Narrative Length**: Brief, Standard, Detailed
   - **Audience**: Board, Investors, Partners, Public
   - **Include Evidence Appendix**: Yes/No
   - **Watermark**: Custom text (optional)
4. Click **"Generate PPTX"**
5. Monitor progress (status updates via polling)
6. Download when complete

**Expected Generation Time**: 5-15 seconds for 10-slide deck

### Slide Types

PPTX exports include the following slide types:

1. **Title Slide**: Company name, report title, period, logo
2. **At-a-Glance Table**: Key metrics summary
3. **Content Slides**: Narrative sections with bullet points
4. **Chart Slides**: Bar, line, pie, area charts
5. **Data Tables**: Tabular data with formatting
6. **Two-Column Slides**: Side-by-side comparisons
7. **Image Slides**: Embedded screenshots or diagrams

### Evidence Lineage in Slide Notes

**What is Evidence Lineage?**

Every narrative claim in the PPTX is backed by source evidence, which appears in PowerPoint's **slide notes** (not visible during presentation).

**Example Slide Note**:
```
Evidence Citations:

1. [EV-001] | Total Volunteer Hours | Value: 1,250 | Source: Benevity Integration | Collected: Dec 1, 2024
2. [EV-002] | Cultural Integration Score | Value: 7.8 | Source: Manual Entry | Collected: Nov 15, 2024
3. [EV-003] | Job Readiness Score | Value: 8.2 | Source: Manual Entry | Collected: Nov 30, 2024
```

**Viewing Slide Notes**:
- **PowerPoint**: View → Notes Page
- **Google Slides**: View → Show Speaker Notes
- **Keynote**: View → Show Presenter Notes

### Watermarking

Watermarks are automatically applied based on report approval status:

| Approval Status | Watermark |
|----------------|-----------|
| **DRAFT** | Large "DRAFT" text, 45° rotation |
| **PENDING APPROVAL** | "PENDING APPROVAL" text |
| **REJECTED** | "REJECTED" text |
| **APPROVED** | No watermark |
| **Custom** | User-specified text |

### Tenant Branding

**Theme Application**:
- **Primary Color**: Slide titles
- **Secondary Color**: Body text and bullets
- **Accent Color**: Captions and metadata
- **Logo**: Embedded on title slide (top-right)

**WCAG Compliance**:
All theme colors are validated for WCAG AA contrast before application.

### API Reference

**Submit PPTX Job**:
```typescript
POST /companies/{companyId}/exports/presentations
{
  "format": "pptx",
  "period": "2024-Q4",
  "narrative": {
    "tone": "formal",
    "length": "standard",
    "audience": "board",
    "promptInstructions": "Focus on quantitative outcomes"
  },
  "watermark": {
    "enabled": false,
    "text": ""
  },
  "includeEvidenceAppendix": true
}
```

**Poll Job Status**:
```typescript
GET /exports/{exportId}/status

Response:
{
  "exportId": "exp-123",
  "status": "completed",
  "progress": 100,
  "downloadUrl": "/exports/exp-123/download?format=pptx"
}
```

**Download PPTX**:
```typescript
GET /exports/{exportId}/download?format=pptx
→ Binary PPTX file (application/vnd.openxmlformats-officedocument.presentationml.presentation)
```

---

## Share Links

### Overview

Share reports and dashboards securely with external stakeholders using time-limited, signed URLs with automatic PII redaction.

### Creating a Share Link

1. Navigate to **Saved Views** or **Reports**
2. Click **"Share"** button
3. Configure sharing options:
   - **Expiration**: 7 days, 30 days, custom
   - **Include Sensitive Data**: Yes/No (default: No)
4. Click **"Generate Share Link"**
5. Copy link and share via email/Slack/Teams

**Example Share URL**:
```
https://cockpit.teei.io/share/abc123xyz789
```

### Security Features

1. **HMAC-SHA256 Signing**: Tamper-proof URLs
2. **Time-To-Live (TTL)**: Auto-expiration (1-90 days)
3. **PII Redaction**: Automatic removal of sensitive data
4. **Access Logging**: Every access tracked with IP/user-agent
5. **Read-Only Mode**: No editing or export capabilities
6. **Watermarking**: "SHARED VIA LINK - DO NOT DISTRIBUTE"

### PII Redaction Modes

#### Standard Mode (Default)

**Redacted**:
- Email addresses
- Phone numbers
- Full names
- User IDs
- SSN, credit cards, addresses

**Preserved**:
- SROI scores
- VIS scores
- Participant counts
- Completion rates
- Aggregated metrics

#### Sensitive Data Mode (Optional)

**Redacted**:
- SSN, credit cards, addresses

**Preserved**:
- Names (for attribution)
- User IDs (for tracking)
- Individual-level data

**Warning**: Use sensitive data mode only for trusted recipients.

### Managing Share Links

**List Active Links**:
```
GET /companies/{companyId}/share-links
```

**Revoke Link**:
```
DELETE /companies/{companyId}/share-links/{linkId}
```

**View Access Log**:
```sql
SELECT * FROM share_link_access_log
WHERE link_id = 'abc123'
ORDER BY accessed_at DESC;
```

### Access Expired/Revoked Links

**Expired Link**:
```
HTTP 403 Forbidden
{
  "error": "This share link has expired. Please request a new link."
}
```

**Revoked Link**:
```
HTTP 410 Gone
{
  "error": "This share link has been revoked."
}
```

---

## Dark Mode

### Overview

Professional dark theme with WCAG AA compliance for comfortable viewing in low-light environments and boardrooms.

### Activating Dark Mode

**Method 1: Theme Toggle**
1. Click **theme toggle** button in header (Sun/Moon icon)
2. Select **"Dark"**

**Method 2: System Preference**
1. Click theme toggle
2. Select **"Auto"** (follows system dark mode setting)

**Method 3: Persistence**
- Theme preference saved per tenant in localStorage
- Persists across browser sessions

### Theme Presets (Dark Variants)

All 5 theme presets support dark mode:

1. **Corporate Blue (Dark)**: Professional tech aesthetic
2. **Healthcare Green (Dark)**: Calming, sustainable
3. **Finance Gold (Dark)**: Sophisticated, premium
4. **Modern Neutral (Dark)**: Minimalist grayscale
5. **Community Purple (Dark)**: Warm, inclusive

### WCAG Compliance

All dark theme colors meet **WCAG 2.2 Level AA** standards:

- **Text contrast**: ≥4.5:1
- **Large text contrast**: ≥3.0:1
- **Non-text contrast**: ≥3.0:1
- **72% of colors**: WCAG AAA (≥7.0:1)

### Dark Mode Features

- **Smooth Transitions**: 0.3s fade (respects `prefers-reduced-motion`)
- **Chart Compatibility**: Auto-adjusted color palettes
- **Focus States**: High-contrast focus indicators
- **No White Flash**: Pre-render theme detection

### API Reference

**Get Current Theme**:
```typescript
const { mode, preset } = useTheme();
// mode: 'light' | 'dark' | 'auto'
// preset: 'corporate_blue' | 'healthcare_green' | ...
```

**Change Theme**:
```typescript
const { setMode, setPreset } = useTheme();
setMode('dark');
setPreset('corporate_blue');
```

---

## Performance Optimizations

### ETag Caching

**What is ETag Caching?**

ETags (Entity Tags) reduce bandwidth by returning `304 Not Modified` responses when data hasn't changed.

**Cached Endpoints**:
- `GET /companies/:id/at-a-glance` (5 min cache)
- `GET /companies/:id/outcomes` (5 min cache)
- `GET /companies/:id/sroi` (1 hour cache)
- `GET /companies/:id/vis` (1 hour cache)
- `GET /companies/:id/reports` (5 min cache)

**Expected Savings**: 25-50% bandwidth reduction

**Cache Headers**:
```
ETag: W/"abc123"
Cache-Control: private, max-age=300
```

**Client Behavior**:
```
# First request
GET /companies/abc/metrics
→ 200 OK, ETag: W/"abc123", body: {...}

# Second request
GET /companies/abc/metrics
Headers: If-None-Match: W/"abc123"
→ 304 Not Modified (no body)
```

### Web Vitals Monitoring

**Metrics Collected**:
- **LCP** (Largest Contentful Paint): ≤2.5s
- **INP** (Interaction to Next Paint): ≤200ms
- **CLS** (Cumulative Layout Shift): ≤0.1
- **TTFB** (Time to First Byte): ≤800ms
- **FCP** (First Contentful Paint): ≤1.8s

**Collection Method**:
- Production-only (skips dev mode)
- 10% sampling rate
- Sent to `/api/analytics/web-vitals`
- Route attribution included

**Viewing Metrics**:
```sql
SELECT
  route,
  AVG(lcp) as avg_lcp,
  AVG(inp) as avg_inp,
  AVG(cls) as avg_cls
FROM web_vitals
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY route
ORDER BY avg_lcp DESC;
```

### Performance Budgets

**Lighthouse CI Budgets**:
- FCP: ≤2.0s
- LCP: ≤2.5s
- TBT: ≤300ms
- CLS: ≤0.1
- Performance Score: ≥90/100

**Enforcement**: CI fails if budgets exceeded

---

## Troubleshooting

### Boardroom Mode Issues

**Problem**: Auto-cycle not working
- **Solution**: Check browser console for errors, verify `interval` query param

**Problem**: SSE connection fails
- **Solution**: Check network tab, verify `/api/sse` endpoint accessible

**Problem**: Stale data banner appears immediately
- **Solution**: Check IndexedDB for cached data, clear cache and reload

**Problem**: Keyboard shortcuts not working
- **Solution**: Click on page to ensure focus, disable browser extensions

### PPTX Export Issues

**Problem**: Export job stuck at "Processing"
- **Solution**: Check backend logs, verify chart renderer service running

**Problem**: Downloaded PPTX won't open
- **Solution**: Verify file size >100KB, try downloading again, check browser download settings

**Problem**: Evidence lineage not in slide notes
- **Solution**: Verify `includeEvidenceAppendix: true` in request, check PowerPoint notes view

**Problem**: Theme colors incorrect
- **Solution**: Verify company theme configured, check theme API endpoint

### Share Link Issues

**Problem**: Share link returns 403 Forbidden
- **Solution**: Check expiration date, verify link not revoked

**Problem**: PII visible in shared view
- **Solution**: Verify `includes_sensitive_data: false`, check redaction logs

**Problem**: Share link not accessible (401 Unauthorized)
- **Solution**: Share links are public - no auth required. Check browser cookies/cache.

### Dark Mode Issues

**Problem**: Dark mode not persisting
- **Solution**: Check localStorage, verify `theme-mode-{companyId}` key exists

**Problem**: Charts not updating with theme
- **Solution**: Hard refresh page, clear browser cache, verify theme context provider wraps charts

**Problem**: Text unreadable in dark mode
- **Solution**: Report contrast issue, check WCAG validation script results

### Performance Issues

**Problem**: ETag cache not working
- **Solution**: Check Redis connection, verify `If-None-Match` header sent by client

**Problem**: Web vitals not collected
- **Solution**: Verify production environment, check 10% sampling (may not fire every time)

**Problem**: Lighthouse budgets failing in CI
- **Solution**: Run local Lighthouse audit, identify specific performance regression

---

## Contact & Support

For technical support or feature requests:
- **Email**: support@teei.io
- **Slack**: #corporate-cockpit-support
- **Documentation**: https://docs.teei.io/cockpit

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Authors**: Worker 3 Tech Lead (Phase F Implementation)
