# TEEI Website & Corp Cockpit Integration Summary

## ✅ What We've Done

### 1. Created Shared Authentication Package
**Location**: `packages/shared-auth/`

This package provides:
- **JWT Token Management** (`jwt.ts`) - Create, verify, decode tokens
- **Session Management** (`session.ts`) - Get auth context, create/destroy sessions
- **Type Definitions** (`types.ts`) - Shared types for auth across both apps
- **Middleware** (`middleware.ts`) - Astro middleware helpers

**Key Features**:
- Works with Astro cookies API
- Sets cookies with domain `.teei.io` (works for both main site and dashboard)
- Role-based access control (RBAC)
- 7-day session expiration
- Secure, HttpOnly cookies

### 2. Updated Corp Cockpit Middleware
**File**: `apps/corp-cockpit-astro/src/middleware.ts`

**Changes**:
- ✅ Now uses `@teei/shared-auth` package
- ✅ Reads JWT from shared cookie
- ✅ Validates user roles (company_admin, teei_staff, super_admin)
- ✅ Protects all dashboard routes
- ✅ Returns 401/403 for API routes, redirects for web routes

### 3. Documentation Created
- **ROUTING_INTEGRATION.md** - Complete routing setup guide
- **INTEGRATION_SUMMARY.md** - This file

## 🔧 How It Works

### Authentication Flow

```
1. User logs in on teei.io/login
   ↓
2. JWT token created with shared secret
   ↓
3. Cookie set with domain=.teei.io
   ↓
4. User navigates to dashboard.teei.io
   ↓
5. Corp Cockpit reads cookie (same domain!)
   ↓
6. JWT verified with same secret
   ↓
7. User authenticated automatically
```

### Routing Options

**Option A: Subdomain (Recommended)**
- Main Site: `teei.io`
- Dashboard: `dashboard.teei.io`

**Option B: Path-based**
- Main Site: `teei.io/*`
- Dashboard: `teei.io/dashboard/*` (proxied to corp-cockpit)

## 📋 Next Steps for Full Integration

### Step 1: Add Auth to TEEI Website
1. Install shared-auth package in TEEI Website
2. Create `/login` page
3. Create `/logout` endpoint
4. Add "Dashboard" link in navigation (for corporate users)

### Step 2: Environment Setup
```env
# Add to both apps
JWT_SECRET=your-super-secret-key-minimum-32-characters
DATABASE_URL=postgresql://...
```

### Step 3: Deploy Configuration

**TEEI Website**:
- Already deployed to Cloudflare Pages
- Add environment variables in Cloudflare dashboard

**Corp Cockpit**:
```bash
cd apps/corp-cockpit-astro
pnpm build
wrangler deploy
```

### Step 4: DNS Configuration
1. Point `dashboard.teei.io` to Corp Cockpit deployment
2. Verify cookie domain is set to `.teei.io`

### Step 5: Testing
- [ ] Login on main site
- [ ] Navigate to dashboard
- [ ] Verify authentication works
- [ ] Test logout from both apps
- [ ] Verify roles work correctly

## 🔐 Security Features

1. **Shared JWT Secret** - Same secret across both apps
2. **HttpOnly Cookies** - Cannot be accessed by JavaScript
3. **Secure Flag** - HTTPS only in production
4. **SameSite=Lax** - CSRF protection
5. **Role-Based Access** - Only company admins+ can access dashboard
6. **Token Expiration** - 7-day max session length

## 📦 Package Structure

```
packages/shared-auth/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts          # Main exports
    ├── types.ts          # Shared types
    ├── jwt.ts            # Token management
    ├── session.ts        # Session management
    └── middleware.ts     # Astro middleware helpers
```

## 🚀 Quick Start

### Install Dependencies
```bash
cd D:\Dev\VS Projects\TEEI\TEEI_CSR_Platform
pnpm install
```

### Run Corp Cockpit Locally
```bash
cd apps/corp-cockpit-astro
pnpm dev
# Opens on http://localhost:4321
```

### Test Authentication
1. Create a mock login endpoint
2. Generate a JWT token
3. Set it in cookies
4. Navigate to protected routes
5. Verify middleware works

## 💡 Benefits of This Approach

1. **Single Sign-On (SSO)** - Login once, access both apps
2. **Code Reuse** - Shared auth logic, no duplication
3. **Type Safety** - TypeScript types shared across apps
4. **Maintainability** - Update auth logic in one place
5. **Security** - Consistent security policies
6. **Developer Experience** - Easy to understand and extend

## 📖 Usage Example

### In Corp Cockpit Pages

```typescript
---
import { getAuthContext } from '@teei/shared-auth/session';

const auth = await getAuthContext(Astro.cookies);

if (!auth.isAuthenticated) {
  return Astro.redirect('/login');
}

if (!auth.hasRole('company_admin')) {
  return Astro.redirect('/unauthorized');
}

const user = auth.user;
---

<h1>Welcome, {user.name}!</h1>
<p>Company ID: {user.companyId}</p>
```

### In TEEI Website (Future)

```typescript
---
import { getAuthContext } from '@teei/shared-auth/session';

const auth = await getAuthContext(Astro.cookies);
---

<nav>
  {auth.isAuthenticated && auth.hasRole('company_admin') && (
    <a href="https://dashboard.teei.io">Dashboard</a>
  )}
</nav>
```

## 🎯 Current Status

- ✅ Shared auth package created
- ✅ Corp Cockpit middleware updated
- ✅ Documentation written
- ✅ Routing strategy defined
- 🔄 Login page creation (pending)
- 🔄 TEEI Website integration (pending)
- 🔄 Deployment configuration (pending)
- 🔄 End-to-end testing (pending)

## 📝 Files Changed

1. `packages/shared-auth/` - NEW package
2. `apps/corp-cockpit-astro/src/middleware.ts` - UPDATED
3. `apps/corp-cockpit-astro/package.json` - UPDATED (added dependency)
4. `ROUTING_INTEGRATION.md` - NEW documentation
5. `INTEGRATION_SUMMARY.md` - NEW documentation

---

**Ready to proceed with full integration!** 🚀