# Login System Investigation Report

**Date**: 2025-01-27  
**Status**: ⚠️ **PARTIALLY WORKING** (Mock auth only, broken in production)

---

## Executive Summary

The login system is **functional in development mode only** using hardcoded mock users. It will **fail in production** because:

1. ❌ Form submits to wrong endpoint (`/api/auth/login` vs `/api/login`)
2. ❌ No real database authentication (uses mock users only)
3. ❌ No password hashing/verification against database
4. ⚠️ Uses plain JSON session cookies (not JWT from shared-auth package)
5. ✅ Middleware properly validates sessions and protects routes
6. ✅ Logout endpoint exists and clears cookies

---

## Current Authentication Flow

### 1. Login Page
- **File**: `apps/corp-cockpit-astro/src/pages/login.astro`
- **Issue**: Form action points to `/api/auth/login` but endpoint is `/api/login`
- **Status**: ❌ **BROKEN** - Form submission will fail

### 2. Login API Endpoint
- **File**: `apps/corp-cockpit-astro/src/pages/api/login.ts`
- **Current Implementation**:
  - ✅ Only works when `USE_MOCK_AUTH = true` (DEV mode only)
  - ❌ Returns 503 error in production
  - ❌ Uses hardcoded mock users (admin@acme.com, viewer@acme.com, manager@acme.com)
  - ✅ Creates session cookie with proper security flags (httpOnly, secure, sameSite)
  - ⚠️ Uses plain JSON session (not JWT)

**Mock Users**:
```typescript
- admin@acme.com / admin123 (ADMIN role)
- viewer@acme.com / viewer123 (VIEWER role)
- manager@acme.com / manager123 (MANAGER role)
```

### 3. Authentication Middleware
- **File**: `apps/corp-cockpit-astro/src/middleware/auth.ts`
- **Status**: ✅ **WORKING**
- **Functionality**:
  - Validates session cookie exists
  - Parses JSON session from cookie
  - Validates session structure (userId, companyId, role)
  - Checks session expiration
  - Attaches user to `Astro.locals` for downstream use
  - Redirects to `/login` if session invalid

### 4. Session Storage
- **Cookie Name**: `session`
- **Format**: Plain JSON (not JWT)
- **Security**:
  - ✅ `httpOnly: true` (not accessible via JavaScript)
  - ✅ `secure: true` in production (HTTPS only)
  - ✅ `sameSite: 'lax'` (CSRF protection)
  - ✅ `maxAge: 7 days`
- **Content**: `{ sessionId, userId, email, name, companyId, role, createdAt, expiresAt, ipAddress }`

### 5. Logout
- **File**: `apps/corp-cockpit-astro/src/pages/api/logout.ts`
- **Status**: ✅ **WORKING**
- **Functionality**: Deletes session cookie

---

## Database Schema

### Users Table
- **File**: `packages/shared-schema/src/schema/users.ts`
- **Password Field**: ✅ `passwordHash` column exists (nullable, for SSO users)
- **Migration**: ✅ `0001_add_password_hash.sql` exists
- **Status**: Schema ready, but **not used** by login endpoint

---

## Issues Found

### Critical Issues (Block Production)

1. **Form Action Mismatch** ❌
   - Form submits to: `/api/auth/login`
   - Actual endpoint: `/api/login`
   - **Impact**: Login form submission fails with 404

2. **No Real Authentication** ❌
   - Login endpoint uses hardcoded mock users
   - No database lookup
   - No password verification against `passwordHash` column
   - **Impact**: Cannot authenticate real users

3. **Production Block** ❌
   - `USE_MOCK_AUTH` is `false` in production
   - Login endpoint returns 503 error
   - **Impact**: Login completely broken in production

### Medium Issues

4. **No Password Hashing** ⚠️
   - Mock users store plaintext passwords
   - No bcrypt verification
   - **Impact**: Security risk if real auth is added without hashing

5. **Session Format Mismatch** ⚠️
   - Uses plain JSON cookies instead of JWT
   - `packages/shared-auth` exists with JWT support but not integrated
   - **Impact**: Inconsistent auth system, harder to scale

6. **No Company Lookup** ⚠️
   - Mock users hardcode `company_id`
   - Real users need lookup via `company_users` junction table
   - **Impact**: Multi-tenant auth won't work correctly

---

## What Works

✅ **Middleware Protection**: Routes are properly protected  
✅ **Session Validation**: Expired/invalid sessions are caught  
✅ **Cookie Security**: Proper httpOnly, secure, sameSite flags  
✅ **Logout**: Properly clears session  
✅ **Database Schema**: `passwordHash` column exists and ready  

---

## Recommended Fixes

### Priority 1: Make Login Work (Minimum Viable)

1. **Fix Form Action** (5 min)
   - Change form action from `/api/auth/login` to `/api/login`

2. **Implement Database Auth** (2-3 hours)
   - Add bcrypt dependency: `pnpm add bcryptjs @types/bcryptjs`
   - Query `users` table by email
   - Verify password against `passwordHash` using bcrypt
   - Lookup user's company via `company_users` table
   - Return proper session on success

3. **Remove Mock Auth Block** (5 min)
   - Allow real auth to work in all environments
   - Keep mock as fallback for development/testing

### Priority 2: Security Hardening

4. **Use JWT Instead of JSON Cookies** (4-6 hours)
   - Integrate `packages/shared-auth` JWT package
   - Replace JSON session with JWT tokens
   - Update middleware to verify JWT

5. **Add Rate Limiting** (1-2 hours)
   - Limit login attempts per IP
   - Prevent brute force attacks

6. **Add Password Reset** (4-6 hours)
   - Forgot password flow
   - Email verification
   - Secure token generation

---

## Testing Status

### E2E Tests
- **File**: `apps/corp-cockpit-astro/tests/e2e/auth.spec.ts`
- **Status**: ✅ Tests exist but use mock users
- **Coverage**: Login, logout, session validation, protected routes

### Manual Testing
To test current (mock) login:
```bash
# Start dev server
pnpm --filter @teei/corp-cockpit-astro dev

# Navigate to http://localhost:4321/login
# Use credentials:
# - admin@acme.com / admin123
# - viewer@acme.com / viewer123
# - manager@acme.com / manager123
```

---

## Security Concerns

1. ⚠️ **Plaintext Passwords in Mock**: Mock users store plaintext (acceptable for dev only)
2. ⚠️ **No Rate Limiting**: Login endpoint vulnerable to brute force
3. ⚠️ **No CSRF Protection**: Form submission lacks CSRF tokens (mitigated by sameSite cookie)
4. ⚠️ **Session Not Signed**: JSON session not cryptographically signed (could be tampered)
5. ✅ **HttpOnly Cookies**: Prevents XSS cookie theft
6. ✅ **Secure Flag**: Enforces HTTPS in production

---

## Next Steps

1. **Immediate**: Fix form action URL
2. **Short-term**: Implement database authentication
3. **Medium-term**: Migrate to JWT-based auth
4. **Long-term**: Add SSO support (SAML/OIDC) as per Worker 3 plan

---

## Related Files

- Login Page: `apps/corp-cockpit-astro/src/pages/login.astro`
- Login API: `apps/corp-cockpit-astro/src/pages/api/login.ts`
- Auth Middleware: `apps/corp-cockpit-astro/src/middleware/auth.ts`
- Logout API: `apps/corp-cockpit-astro/src/pages/api/logout.ts`
- Shared Auth Package: `packages/shared-auth/`
- Users Schema: `packages/shared-schema/src/schema/users.ts`
- Implementation Plan: `IMPLEMENT_AUTH.md`



