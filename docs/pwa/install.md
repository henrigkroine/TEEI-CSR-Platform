# PWA Installation Guide

## Overview

The TEEI Corporate Cockpit is a Progressive Web App (PWA) that can be installed on your device for a native app-like experience with offline capabilities.

## Benefits of Installing

- **Offline Access**: View cached dashboards and board packs without an internet connection
- **Faster Performance**: Pre-cached assets load instantly
- **Native Experience**: Runs in standalone mode without browser UI
- **Background Sync**: Export jobs queue when offline and sync automatically when reconnected
- **Push Notifications**: Receive real-time alerts for reports, approvals, and budgets (coming soon)
- **Home Screen Icon**: Quick access from your device's home screen

---

## Installation Instructions

### Desktop (Chrome/Edge)

1. **Navigate** to the TEEI Cockpit dashboard
2. **Look for** the install icon (⬇️) in the address bar
3. **Click** the install button when prompted
4. **OR** click the three-dot menu → "Install TEEI Cockpit"
5. **Confirm** the installation in the dialog
6. The app will open in a standalone window

**Keyboard Shortcut**: You can also press `Ctrl/Cmd + Shift + A` to open the install prompt.

### Mobile (Android)

1. **Open** Chrome browser and navigate to TEEI Cockpit
2. **Tap** the three-dot menu (⋮)
3. **Select** "Add to Home screen" or "Install app"
4. **Confirm** the installation
5. The app icon will appear on your home screen

**Auto-Prompt**: On supported Android devices, a banner will appear after 30 seconds prompting you to install.

### Mobile (iOS/Safari)

1. **Open** Safari and navigate to TEEI Cockpit
2. **Tap** the Share button (□↑)
3. **Scroll down** and select "Add to Home Screen"
4. **Edit** the name if desired
5. **Tap** "Add" to confirm
6. The app icon will appear on your home screen

**Note**: iOS does not support automatic install prompts. You must manually add to home screen.

---

## Verifying Installation

After installation, verify the PWA is working correctly:

1. **Check** that the app opens in standalone mode (no browser UI)
2. **Navigate** to Settings → PWA Status
3. **Confirm** the following indicators:
   - ✅ Service Worker: Registered
   - ✅ Cache Status: Active
   - ✅ Offline Support: Enabled

---

## Managing the Installed App

### Updating the App

The PWA automatically checks for updates every 60 seconds when running. When an update is available:

1. A notification will appear: "New version available"
2. Click "Update" to install the new version
3. The app will reload with the updated version

**Manual Update**: Go to Settings → About → Check for Updates

### Uninstalling

#### Desktop
- Open the installed app
- Click the three-dot menu → "Uninstall TEEI Cockpit"
- **OR** go to `chrome://apps`, right-click the app, and select "Remove from Chrome"

#### Android
- Long-press the app icon
- Drag to "Uninstall" or tap "App info" → "Uninstall"

#### iOS
- Long-press the app icon
- Tap "Remove App" → "Delete App"

---

## Offline Capabilities

### What Works Offline

✅ **Dashboard**: Cached metrics and charts (if previously loaded)
✅ **Board Packs**: Reports marked "Available Offline"
✅ **Export Queue**: Export jobs queue and sync when back online
✅ **Navigation**: All app navigation and UI
✅ **Settings**: View and modify local settings

### What Requires Connection

❌ **Live Data**: Real-time SSE updates
❌ **New Reports**: Creating or editing reports
❌ **User Management**: SCIM sync, role changes
❌ **API Calls**: Any server-side operations

### Making Board Packs Available Offline

1. **Navigate** to a report or board pack
2. **Click** "Make Available Offline" button
3. **Wait** for download to complete (progress shown)
4. **Access** offline via `/offline/:packId` or from Offline Packs Manager

**Storage Limit**: 150 MB total, 10 packs maximum (LRU eviction)

---

## Troubleshooting

### Install Button Not Showing

**Causes:**
- Already installed
- Using unsupported browser (must be Chrome, Edge, or Samsung Internet)
- Site not served over HTTPS
- Dismissed install prompt (resets after 7 days)

**Solution:**
- Check if already installed
- Use a supported browser
- Clear site data and reload
- Wait 7 days or manually add to home screen

### Service Worker Not Registered

**Symptoms:**
- Offline mode not working
- Slow performance
- No caching

**Solution:**
1. Open DevTools (F12)
2. Go to Application → Service Workers
3. Check for errors in console
4. Unregister and reload page
5. If persists, contact support with console logs

### Offline Data Not Available

**Causes:**
- Cache cleared
- Storage quota exceeded
- Pack expired (30-day TTL)

**Solution:**
1. Check storage usage in Settings → Offline Packs
2. Delete old packs to free space
3. Re-download required packs when online

### Background Sync Not Working

**Symptoms:**
- Export jobs not syncing when back online
- Pending exports stuck

**Solution:**
1. Check Settings → Export Queue
2. Manually trigger sync via "Sync Now" button
3. If failed, retry individual exports
4. Clear completed exports to free queue

---

## Best Practices

### For Boardroom Presentations

1. **Download** board packs 24 hours before presentation
2. **Test** offline access by enabling Airplane Mode
3. **Verify** all slides and images loaded correctly
4. **Bring** backup (PDF export) just in case

### For Regular Use

1. **Install** the PWA for best performance
2. **Allow** notifications for real-time updates (coming soon)
3. **Regularly** clear completed exports to save storage
4. **Update** offline packs monthly or before expiry

### Storage Management

1. **Monitor** storage usage in Settings → Offline Packs
2. **Delete** old packs you no longer need
3. **Prioritize** most important reports for offline access
4. **Expect** LRU eviction when limit reached (oldest packs deleted first)

---

## Technical Details

### Caching Strategies

- **Shell Assets** (HTML, CSS, JS): Stale-while-revalidate
- **Static Assets** (images, fonts): Cache-first
- **API Responses**: Network-first with offline fallback
- **Board Packs**: Cache-first (fully prefetched)

### Cache Versions

Cache version: `v1` (updates automatically)

### Service Worker Scope

- Scope: `/` (entire app)
- Update check interval: 60 seconds
- Claim clients: Immediate on activation

### Background Sync

- Max retries: 5
- Retry delay: Exponential backoff (2s, 4s, 8s, 16s, 32s)
- Success rate target: ≥99% within 5 retries

---

## Browser Support

| Browser | Install | Offline | Background Sync | Push (coming soon) |
|---------|---------|---------|-----------------|-------------------|
| Chrome 90+ | ✅ | ✅ | ✅ | ✅ |
| Edge 90+ | ✅ | ✅ | ✅ | ✅ |
| Safari 15+ | ⚠️ Manual | ✅ | ❌ | ❌ |
| Firefox 90+ | ❌ | ✅ | ❌ | ✅ |
| Samsung Internet | ✅ | ✅ | ✅ | ✅ |

⚠️ = Limited support | ❌ = Not supported

---

## Security & Privacy

- **HTTPS Only**: PWA requires secure connection
- **No Auth Tokens in SW**: Service worker cannot access authentication tokens
- **CSP Compliant**: Content Security Policy enforced
- **SRI Hashes**: Subresource Integrity for all cached assets
- **No PII in Cache**: Personal data never cached

---

## Support

If you encounter issues with the PWA:

1. Check this guide for troubleshooting steps
2. Review browser console for errors (F12)
3. Contact IT support with:
   - Browser version
   - Device type
   - Error message/screenshot
   - Steps to reproduce

For feature requests or bugs, file an issue on GitHub: [TEEI-CSR-Platform/issues](https://github.com/anthropics/TEEI-CSR-Platform/issues)
