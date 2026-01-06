# Redirect Loop Fix

## Problem
Infinite redirect loop between `/` and `/home` caused by Astro's i18n routing.

## Solution Applied

1. **Disabled `prefixDefaultLocale`** in `astro.config.mjs` to prevent automatic redirects
2. **Created `/home.astro`** route that redirects to `/en`
3. **Updated `/index.astro`** to redirect to `/en` (or `/en/cockpit/{tenantId}`)
4. **Added middleware** to catch `/` and `/home` requests and redirect to `/en`

## Changes Made

- `apps/corp-cockpit-astro/astro.config.mjs`: Set `prefixDefaultLocale: false`
- `apps/corp-cockpit-astro/src/pages/index.astro`: Redirects to `/en`
- `apps/corp-cockpit-astro/src/pages/home.astro`: Redirects to `/en`
- `apps/corp-cockpit-astro/src/middleware.ts`: Added root redirect handler

## Next Steps

**RESTART THE DEV SERVER** for changes to take effect:

```bash
# Stop current server (Ctrl+C)
# Then restart:
pnpm --filter @teei/corp-cockpit-astro dev

# Or, if you're supervising via PM2:
pnpm dlx pm2 restart teei-csr-platform
pnpm dlx pm2 restart teei-astro   # if you manage the Astro dev server as a separate PM2 process
```

After restart, test:
- `http://localhost:6509/` → Should redirect to `/en`
- `http://localhost:6509/home` → Should redirect to `/en`
- `http://localhost:6509/en` → Should show tenant selector or dashboard

> If you temporarily moved the cockpit to a different port (e.g. `http://127.0.0.1:5000/en`), run the same checks on that port instead.


