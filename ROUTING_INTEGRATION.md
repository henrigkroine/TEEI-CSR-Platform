# TEEI Website & Corp Cockpit Integration - Routing Setup

## Architecture Overview

```
User Request → Cloudflare Worker → Route Decision
                     ↓
        ┌────────────┴───────────┐
        ↓                        ↓
   TEEI Website          Corp Cockpit
   (teei.io/*)          (teei.io/dashboard/*)
```

## Routing Strategy

### Option 1: Subdomain (Recommended for Production)
- **Main Site**: `teei.io` → TEEI Website
- **Dashboard**: `dashboard.teei.io` → Corp Cockpit

### Option 2: Path-based (Easier for Development)
- **Main Site**: `teei.io/*` → TEEI Website
- **Dashboard**: `teei.io/dashboard/*` → Corp Cockpit (proxy)

## Implementation

### 1. Cloudflare Worker Router (Path-based)

Create a worker that routes traffic based on path:

```javascript
// workers/router/index.ts
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Route dashboard requests to Corp Cockpit
    if (url.pathname.startsWith('/dashboard')) {
      return fetch(new Request(
        `https://corp-cockpit.teei-csr-platform.workers.dev${url.pathname}`,
        {
          method: request.method,
          headers: request.headers,
          body: request.body,
        }
      ));
    }

    // Route everything else to main website
    return fetch(new Request(
      `https://teei-website.pages.dev${url.pathname}`,
      {
        method: request.method,
        headers: request.headers,
        body: request.body,
      }
    ));
  }
};
```

### 2. Cloudflare DNS Setup (Subdomain)

**For dashboard.teei.io:**
1. Go to Cloudflare DNS settings
2. Add CNAME record:
   - Type: `CNAME`
   - Name: `dashboard`
   - Target: `corp-cockpit.teei-csr-platform.workers.dev`
   - Proxy: Enabled (orange cloud)

**For teei.io:**
1. Add CNAME record:
   - Type: `CNAME`
   - Name: `@` (root)
   - Target: `teei-website.pages.dev`
   - Proxy: Enabled

### 3. Deployment Configuration

#### TEEI Website (Existing)
```bash
# Already deployed to Cloudflare Pages
# Base URL: https://teei.io
```

#### Corp Cockpit
```bash
cd D:\Dev\VS Projects\TEEI\TEEI_CSR_Platform\apps\corp-cockpit-astro

# Build for production
pnpm build

# Deploy to Cloudflare Workers (Node.js adapter)
wrangler deploy

# Or deploy to Cloudflare Pages (static adapter)
pnpm astro build
wrangler pages deploy dist
```

### 4. Environment Variables

Both apps need these shared environment variables:

```env
# JWT Authentication (MUST be the same in both apps)
JWT_SECRET=your-shared-secret-key-min-32-chars

# Database connection
DATABASE_URL=postgresql://user:pass@host:5432/teei_csr

# API Gateway
API_GATEWAY_URL=https://api.teei.io

# CORS Origins
ALLOWED_ORIGINS=https://teei.io,https://dashboard.teei.io
```

### 5. Cookie Configuration

The shared auth package sets cookies with:
- **Domain**: `.teei.io` (works for both `teei.io` and `dashboard.teei.io`)
- **Path**: `/`
- **SameSite**: `Lax`
- **Secure**: `true` (production only)
- **HttpOnly**: `true`

This allows authentication to work seamlessly across both apps.

### 6. Integration Flow

```
1. User visits teei.io
2. User clicks "Dashboard" (or "Login" for corporate users)
3. User logs in → JWT cookie set with domain .teei.io
4. User clicks "Dashboard" → redirects to dashboard.teei.io
5. Dashboard reads JWT cookie (same domain)
6. User is authenticated automatically
```

### 7. Cross-App Navigation

#### From TEEI Website to Dashboard:

```html
<!-- Add to navigation in TEEI Website -->
<a href="https://dashboard.teei.io">Dashboard</a>

<!-- Or path-based -->
<a href="/dashboard">Dashboard</a>
```

#### From Dashboard back to Main Site:

```html
<!-- Add to dashboard navigation -->
<a href="https://teei.io">Back to Main Site</a>
```

## Testing Locally

### Terminal 1: Run TEEI Website
```bash
cd "D:\Dev\VS Projects\TEEI\TEEI - Website"
npm run dev
# Runs on http://localhost:3000
```

### Terminal 2: Run Corp Cockpit
```bash
cd "D:\Dev\VS Projects\TEEI\TEEI_CSR_Platform\apps\corp-cockpit-astro"
pnpm dev
# Runs on http://localhost:4321
```

### Terminal 3: Run Local Router (Optional)
```bash
# Create simple proxy for local testing
# Forwards /dashboard/* to localhost:4321
# Forwards /* to localhost:3000
```

## Security Considerations

1. **JWT Secret**: MUST be the same across both apps
2. **Cookie Domain**: Set to `.teei.io` in production
3. **HTTPS Only**: Enforce HTTPS in production
4. **CORS**: Configure properly if using API calls between apps
5. **CSP Headers**: Update Content Security Policy to allow both domains

## Deployment Checklist

- [ ] Set JWT_SECRET environment variable (same in both apps)
- [ ] Configure DNS records (subdomain or path-based routing)
- [ ] Deploy TEEI Website to Cloudflare Pages
- [ ] Deploy Corp Cockpit to Cloudflare Workers/Pages
- [ ] Test authentication flow between apps
- [ ] Verify cookie sharing works
- [ ] Add navigation links between apps
- [ ] Test logout flow
- [ ] Verify role-based access control
- [ ] Test on mobile devices

## Next Steps

1. ✅ Created shared-auth package
2. ✅ Updated corp-cockpit middleware
3. 🔄 Create router worker (if using path-based)
4. 🔄 Add login/logout pages to TEEI Website
5. 🔄 Deploy both apps
6. 🔄 Test end-to-end authentication
