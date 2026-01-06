---
id: 25
key: pwa-support
name: PWA Support
category: Platform
status: production
lastReviewed: 2025-01-27
---

# PWA Support

## 1. Summary

- Progressive Web App capabilities enabling offline access, app-like experience, and install prompts.
- Features offline support with service worker, app manifest for install prompts, and cached resources for offline access.
- Provides install prompts, offline banners, and service worker for background sync.
- Used by all users for mobile and desktop app-like experience with offline capabilities.

## 2. Current Status

- Overall status: `production`

- Fully implemented PWA support in Corporate Cockpit with service worker (`apps/corp-cockpit-astro/public/sw.js` and `apps/corp-cockpit-astro/src/sw.ts`), PWA manifest (`apps/corp-cockpit-astro/public/manifest.json`), PWA components (`apps/corp-cockpit-astro/src/components/pwa/` with 2 TypeScript files), and offline support (`apps/corp-cockpit-astro/src/features/offline/` with 6 files). Documentation includes `docs/pwa/` with 2 markdown files covering PWA implementation and offline strategies.

- Service worker provides offline caching, background sync, and push notification support. PWA manifest enables install prompts and app-like experience.

## 3. What's Next

- Enhance offline data synchronization with conflict resolution.
- Add push notification support for real-time alerts.
- Implement background sync for offline actions.
- Add app update notifications for new versions.

## 4. Code & Files

Backend / services:
- No backend service (frontend-only feature)

Frontend / UI:
- `apps/corp-cockpit-astro/public/sw.js` - Service worker
- `apps/corp-cockpit-astro/src/sw.ts` - Service worker TypeScript source
- `apps/corp-cockpit-astro/public/manifest.json` - PWA manifest
- `apps/corp-cockpit-astro/src/components/pwa/` - PWA components (2 *.tsx files)
- `apps/corp-cockpit-astro/src/features/offline/` - Offline support (6 files)

Shared / schema / docs:
- `docs/pwa/` - PWA documentation (2 *.md files)

## 5. Dependencies

Consumes:
- Service Worker API for offline capabilities
- Web App Manifest for install prompts
- Cache API for resource caching

Provides:
- Offline access for Corporate Cockpit
- App-like experience for mobile users
- Install prompts for easy access

## 6. Notes

- Service worker enables offline access and background sync.
- PWA manifest provides app metadata for install prompts.
- Offline support ensures functionality without internet connection.
- Install prompts make app easily accessible from home screen.
- Cached resources provide fast loading and offline access.



