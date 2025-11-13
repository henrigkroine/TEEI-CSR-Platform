# TEEI Website & Corp Cockpit Integration - Routing Setup

## Architecture Overview

```
User Request → Cloudflare Worker → Route Decision
                     ↓
        ┌────────────┴───────────────────────────────────┐
        ↓                                                ↓
   TEEI Website                                   Corp Cockpit
   (theeducationalequalityinstitute.org/*)       (dashboard.theeducationalequalityinstitute.org/*)
```

## Environments

### Production
- **Main Site**: `https://theeducationalequalityinstitute.org`
- **Dashboard**: `https://dashboard.theeducationalequalityinstitute.org`
- **Cookie Domain**: `.theeducationalequalityinstitute.org`

### Staging
- **Main Site**: `https://staging.teei.no`
- **Dashboard**: `https://dashboard.staging.teei.no`
- **Static Assets**: `https://static-staging.teei.no`
- **Cookie Domain**: `.teei.no`

### Local Development
- **Main Site**: `http://localhost:3000`
- **Dashboard**: `http://localhost:4321`
- **Cookie Domain**: `localhost`

## Routing Strategy

### Option 1: Subdomain (Recommended for Production)
- **Main Site**: `theeducationalequalityinstitute.org` → TEEI Website
- **Dashboard**: `dashboard.theeducationalequalityinstitute.org` → Corp Cockpit

### Option 2: Path-based (Easier for Development)
- **Main Site**: `theeducationalequalityinstitute.org/*` → TEEI Website
- **Dashboard**: `theeducationalequalityinstitute.org/dashboard/*` → Corp Cockpit (proxy)

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

#### Production DNS (theeducationalequalityinstitute.org)

**For dashboard.theeducationalequalityinstitute.org:**
1. Go to Cloudflare DNS settings
2. Add CNAME record:
   - Type: `CNAME`
   - Name: `dashboard`
   - Target: `corp-cockpit.teei-csr-platform.workers.dev`
   - Proxy: Enabled (orange cloud)

**For theeducationalequalityinstitute.org:**
1. Add CNAME record:
   - Type: `CNAME`
   - Name: `@` (root)
   - Target: `teei-website.pages.dev`
   - Proxy: Enabled

#### Staging DNS (teei.no)

**For dashboard.staging.teei.no:**
1. Go to Cloudflare DNS settings
2. Add CNAME record:
   - Type: `CNAME`
   - Name: `dashboard.staging`
   - Target: `corp-cockpit-staging.teei-csr-platform.workers.dev`
   - Proxy: Enabled (orange cloud)

**For staging.teei.no:**
1. Add CNAME record:
   - Type: `CNAME`
   - Name: `staging`
   - Target: `teei-website-staging.pages.dev`
   - Proxy: Enabled

### 3. Deployment Configuration

#### TEEI Website (Existing)
```bash
# Production: https://theeducationalequalityinstitute.org
# Staging: https://staging.teei.no
# Already deployed to Cloudflare Pages
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

#### Production
```env
# Environment
NODE_ENV=production

# JWT Authentication (MUST be the same in both apps)
JWT_SECRET=your-shared-secret-key-min-32-chars

# Cookie Domain
COOKIE_DOMAIN=.theeducationalequalityinstitute.org

# Database connection
DATABASE_URL=postgresql://user:pass@host:5432/teei_csr

# API Gateway
API_GATEWAY_URL=https://api.theeducationalequalityinstitute.org

# CORS Origins
ALLOWED_ORIGINS=https://theeducationalequalityinstitute.org,https://dashboard.theeducationalequalityinstitute.org
```

#### Staging
```env
# Environment
NODE_ENV=staging

# JWT Authentication (MUST be the same in both apps)
JWT_SECRET=your-shared-secret-key-min-32-chars

# Cookie Domain
COOKIE_DOMAIN=.teei.no

# Database connection
DATABASE_URL=postgresql://user:pass@host:5432/teei_csr_staging

# API Gateway
API_GATEWAY_URL=https://api.staging.teei.no

# CORS Origins
ALLOWED_ORIGINS=https://staging.teei.no,https://dashboard.staging.teei.no
```

### 5. Cookie Configuration

The shared auth package sets cookies with environment-specific domains:

#### Production
- **Domain**: `.theeducationalequalityinstitute.org`
- **Path**: `/`
- **SameSite**: `Lax`
- **Secure**: `true`
- **HttpOnly**: `true`

#### Staging
- **Domain**: `.teei.no`
- **Path**: `/`
- **SameSite**: `Lax`
- **Secure**: `true`
- **HttpOnly**: `true`

This allows authentication to work seamlessly across both apps in each environment.

### 6. Integration Flow

#### Production Flow
```
1. User visits theeducationalequalityinstitute.org
2. User clicks "Dashboard" (or "Login" for corporate users)
3. User logs in → JWT cookie set with domain .theeducationalequalityinstitute.org
4. User clicks "Dashboard" → redirects to dashboard.theeducationalequalityinstitute.org
5. Dashboard reads JWT cookie (same domain)
6. User is authenticated automatically
```

#### Staging Flow
```
1. User visits staging.teei.no
2. User clicks "Dashboard"
3. User logs in → JWT cookie set with domain .teei.no
4. User clicks "Dashboard" → redirects to dashboard.staging.teei.no
5. Dashboard reads JWT cookie (same domain)
6. User is authenticated automatically
```

### 7. Cross-App Navigation

#### Production

**From TEEI Website to Dashboard:**
```html
<a href="https://dashboard.theeducationalequalityinstitute.org">Dashboard</a>
```

**From Dashboard back to Main Site:**
```html
<a href="https://theeducationalequalityinstitute.org">Back to Main Site</a>
```

#### Staging

**From TEEI Website to Dashboard:**
```html
<a href="https://dashboard.staging.teei.no">Dashboard</a>
```

**From Dashboard back to Main Site:**
```html
<a href="https://staging.teei.no">Back to Main Site</a>
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

1. **JWT Secret**: MUST be the same across both apps in each environment
2. **Cookie Domain**:
   - Production: `.theeducationalequalityinstitute.org`
   - Staging: `.teei.no`
   - Local: `localhost`
3. **HTTPS Only**: Enforce HTTPS in production and staging
4. **CORS**: Configure properly if using API calls between apps
5. **CSP Headers**: Update Content Security Policy to allow both domains
6. **Environment Isolation**: Staging and production use separate databases and secrets

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
