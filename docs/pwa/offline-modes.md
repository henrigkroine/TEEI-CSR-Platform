# PWA Offline Modes

## Overview

The TEEI Corporate Cockpit PWA supports three offline modes to ensure uninterrupted access to critical CSR data and reports.

---

## Offline Modes

### 1. **Cached Dashboard Mode**

**Description**: View previously loaded dashboard metrics and charts

**How It Works**:
- Dashboard data is automatically cached when viewed online
- Cache expires after 1 hour by default
- Stale-while-revalidate strategy: shows cached data while fetching fresh data in background

**Indicators**:
- 🔴 Offline banner at top of page
- 📅 "Last updated: X minutes ago" timestamp
- ⚠️ "Showing cached data" badge on metrics

**Limitations**:
- No real-time SSE updates
- Data may be stale (up to 1 hour old)
- Cannot create new reports or modify data

**Best For**: Quick reference to recent metrics during brief network outages

---

### 2. **Offline Board Pack Mode**

**Description**: Fully prefetched reports and presentations for offline viewing

**How It Works**:
- User explicitly downloads a board pack via "Make Available Offline" button
- All assets (slides, images, fonts, CSS, JS) are prefetched and cached
- Integrity hashes (SRI) ensure assets haven't been tampered with
- Packs stored in IndexedDB with 30-day expiration

**Setup**:
1. Navigate to a report or board pack
2. Click "Make Available Offline" button
3. Wait for download to complete (progress bar shown)
4. Access offline via `/offline/:packId`

**Indicators**:
- 🟢 "Available Offline" badge on report
- 🔒 "OFFLINE" watermark banner in viewer (read-only)
- 📦 Pack size and expiration date in Offline Packs Manager

**Limitations**:
- Read-only mode (no editing)
- Storage limit: 150 MB total, 10 packs maximum
- LRU eviction: oldest packs deleted when limit reached
- 30-day expiration (automatically deleted after 30 days)

**Best For**: Boardroom presentations, client meetings, travel with limited connectivity

---

### 3. **Export Queue Mode**

**Description**: Queue export jobs when offline and sync automatically when reconnected

**How It Works**:
- Export requests (PDF, CSV, XLSX, PPTX) are queued in IndexedDB when offline
- Background Sync API registers sync event
- On reconnection, exports are processed automatically
- Retry logic with exponential backoff (max 5 retries)
- Local notification on completion

**Setup**:
1. Request an export (e.g., "Export to PDF")
2. If offline, job is queued automatically
3. Banner shows: "Export queued, will sync when online"
4. Pending exports badge appears in nav bar

**Indicators**:
- 🟡 Pending exports badge (count)
- 📤 "Syncing exports..." notification when back online
- ✅ "Export complete" notification on success
- ❌ "Export failed" notification after max retries

**Retry Logic**:
- Attempt 1: Immediate (when back online)
- Attempt 2: 2 seconds delay
- Attempt 3: 4 seconds delay
- Attempt 4: 8 seconds delay
- Attempt 5: 16 seconds delay
- After 5 failures: marked as failed

**Limitations**:
- Max queue size: 50 exports (oldest deleted if exceeded)
- Max retries: 5
- Large exports may take longer to sync
- No progress updates while syncing (only completion notification)

**Best For**: Creating exports during travel, ensuring no work is lost due to connectivity issues

---

## Offline Indicators

### Global Indicators

**Offline Banner** (top of page):
```
🔴 You are currently offline. Some features may be unavailable.
[Dismiss]
```

**Connection Status Badge** (nav bar):
- 🟢 Online (hidden)
- 🟡 Reconnecting... (pulsing)
- 🔴 Offline (visible)

### Page-Specific Indicators

**Dashboard**:
- "Showing cached data" badge
- "Last updated: X minutes ago" timestamp
- Disabled "Create Report" button

**Reports**:
- "Available Offline" badge (green check)
- "Make Available Offline" button (if not cached)
- "Offline mode not available" message (if not cached)

**Settings**:
- Offline packs list with storage usage
- Export queue with pending count
- "Clear Cache" button (to free storage)

---

## Storage Management

### Storage Limits

| Resource | Limit | Eviction Policy |
|----------|-------|----------------|
| Board Packs | 150 MB total | LRU (Least Recently Used) |
| Pack Count | 10 packs max | LRU |
| Dashboard Cache | 10 MB | TTL (1 hour expiration) |
| Export Queue | 50 jobs | FIFO (oldest deleted) |

### Storage Usage Dashboard

View storage usage in **Settings → Offline Packs**:

```
Storage Usage
──────────────────────────────────────
Total Packs: 5
Storage Used: 87.3 MB / 150 MB
Oldest Pack: 12 days ago
Newest Pack: 2 days ago

[Clear All Packs] [Clear Completed Exports]
```

### Manual Storage Cleanup

**Clear Expired Packs**:
- Automatically deleted after 30 days
- Manual cleanup: Settings → Offline Packs → [Clear Expired]

**Clear Completed Exports**:
- Settings → Export Queue → [Clear Completed]
- Removes all exports with status "completed" or "failed"

**Clear All Cache**:
- Settings → Advanced → [Clear All Cache]
- Removes all cached data (board packs, dashboard cache, export queue)
- ⚠️ Warning: This cannot be undone

---

## Conflict Resolution

### Dashboard Data Conflicts

When reconnected, the app uses **server-wins** strategy:
- Server data always overwrites cached data
- No manual conflict resolution required

### Export Queue Conflicts

If an export was completed manually while offline:
- Duplicate detection: checks if export already exists
- If duplicate: removes from queue, no re-export
- If not: proceeds with export

---

## Offline Testing

### Enable Offline Mode (DevTools)

1. Open DevTools (F12)
2. Go to Network tab
3. Select "Offline" from throttling dropdown
4. Reload page

### Test Scenarios

**Test 1: Cached Dashboard**
1. Load dashboard while online
2. Enable offline mode
3. Reload page
4. Verify cached data displays with offline banner

**Test 2: Offline Board Pack**
1. Download a board pack while online
2. Enable offline mode
3. Navigate to `/offline/:packId`
4. Verify pack loads with "OFFLINE" watermark

**Test 3: Export Queue**
1. Enable offline mode
2. Request an export
3. Verify export queued (pending badge appears)
4. Disable offline mode
5. Verify export syncs automatically
6. Verify notification shows "Export complete"

---

## Best Practices

### For Dashboard Access

- **Load** dashboards while online to prime cache
- **Refresh** dashboards every hour to avoid stale data
- **Avoid** relying on cached dashboard for critical decisions

### For Board Packs

- **Download** 24 hours before offline use
- **Test** offline access before important presentations
- **Delete** old packs regularly to free storage
- **Prioritize** most important reports (10 pack limit)

### For Exports

- **Queue** exports when offline, don't wait
- **Monitor** pending exports badge
- **Retry** failed exports manually if needed
- **Clear** completed exports weekly

---

## Troubleshooting

### Offline Mode Not Working

**Symptom**: No offline banner, cached data not loading

**Causes**:
- Service worker not registered
- Cache quota exceeded
- Browser doesn't support service workers

**Solution**:
1. Check service worker status: Settings → PWA Status
2. Clear cache and reload
3. Use a supported browser (Chrome, Edge, Samsung Internet)

### Board Pack Not Available Offline

**Symptom**: "Offline mode not available" message

**Causes**:
- Pack not downloaded
- Pack expired (>30 days old)
- Pack evicted (storage limit reached)

**Solution**:
1. Check Offline Packs Manager: Settings → Offline Packs
2. Re-download pack if needed
3. Delete old packs to free storage

### Exports Not Syncing

**Symptom**: Pending exports badge stuck, no sync when online

**Causes**:
- Network still offline
- Export API down
- Max retries reached

**Solution**:
1. Verify network connection (check offline banner)
2. Check Export Queue: Settings → Export Queue
3. Manually retry failed exports
4. Contact support if API is down

---

## Technical Details

### Service Worker Lifecycle

```
Install → Activate → Fetch
   ↓         ↓        ↓
 Cache    Cleanup  Intercept
  Shell    Old     Requests
 Assets   Caches
```

### Caching Flow

```
Request
   ↓
Service Worker
   ↓
Cache Strategy?
   ├─ Shell Assets → Stale-while-revalidate
   ├─ Static Assets → Cache-first
   ├─ API Responses → Network-first
   └─ Board Packs → Cache-first (prefetched)
   ↓
Response
```

### Background Sync Flow

```
Export Request (Offline)
   ↓
Queue in IndexedDB
   ↓
Register sync event
   ↓
Wait for online
   ↓
Sync event fires
   ↓
Process export
   ↓
Retry if failed (max 5)
   ↓
Notification on complete
```

---

## Performance Metrics

### Offline Start Time

**Target**: <2.0 seconds on repeat visits

**Measured from**: Service worker activation to First Contentful Paint (FCP)

**Optimization**:
- Pre-cached shell assets
- Inline critical CSS
- Lazy-loaded non-critical JS

### Export Sync Success Rate

**Target**: ≥99% within 5 retries

**Measured from**: Export queued to completion or final failure

**Factors**:
- Network stability
- Export API availability
- Retry backoff strategy

---

## Browser Support

| Mode | Chrome | Edge | Safari | Firefox |
|------|--------|------|--------|---------|
| Cached Dashboard | ✅ | ✅ | ✅ | ✅ |
| Offline Board Packs | ✅ | ✅ | ✅ | ✅ |
| Export Queue (Background Sync) | ✅ | ✅ | ❌ | ❌ |

❌ = Fallback: immediate sync attempt, no background sync

---

## See Also

- [PWA Installation Guide](./install.md)
- [Push Notifications Guide](./push-notifications.md) (coming soon)
- [Service Worker API Reference](./service-worker-api.md) (coming soon)
