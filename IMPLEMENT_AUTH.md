# Implementation Plan: Real Authentication System

## Status
**Current State**: 
- Frontend uses mock authentication.
- Backend (`unified-profile`) has no login endpoints.
- Database (`users` table) has no password field.
- "Auth Service" mentioned in reports is missing.

**Goal**: Implement a production-ready authentication system with local email/password login and JWT issuance.

## Phase 1: Database Updates
1.  **Modify Schema**:
    - Update `packages/shared-schema/src/schema/users.ts` to add `passwordHash` (varchar, nullable for SSO users).
2.  **Create Migration**:
    - Run `pnpm db:generate` or manually create migration file to add the column.
3.  **Apply Migration**:
    - Run `pnpm db:migrate`.
4.  **Update Seeds**:
    - Update `packages/shared-schema/src/seed/index.ts` to include hashed passwords for test users (admin, alice, bob).

## Phase 2: Backend Implementation (Unified Profile Service)
*Note: We will implement Auth within `unified-profile` for now as it owns the `users` table, as per `MULTI_AGENT_PLAN.md`.*

1.  **Install Dependencies**:
    - `bcryptjs` (for hashing).
    - `@fastify/jwt` (already there, ensure it's configured for signing).
2.  **Create Auth Routes**:
    - `POST /v1/auth/login`: Validate credentials, return JWT.
    - `POST /v1/auth/register`: Create new user with password.
    - `POST /v1/auth/refresh`: Refresh token (optional for MVP).
    - `POST /v1/auth/logout`: Invalidate token (if using blacklist/redis).
3.  **Implement Auth Logic**:
    - Service layer to handle password verification and token generation.
    - Use `packages/shared-auth` if applicable, or standard Fastify JWT.

## Phase 3: API Gateway Configuration
1.  **Update Proxy Rules**:
    - Ensure `/v1/auth/*` is proxied to `unified-profile` (or expose it via `profile` routes like `/v1/profile/auth`).
    - Currently `/v1/profile` is proxied. We can add `/v1/auth` pointing to `unified-profile` as well.

## Phase 4: Frontend Integration
1.  **Remove Mock**:
    - Disable `USE_MOCK_AUTH` in `apps/corp-cockpit-astro`.
2.  **Update Login API**:
    - Modify `src/pages/api/login.ts` to call the API Gateway's `/v1/auth/login` endpoint.
    - Store the returned JWT in an HTTP-only cookie.
3.  **Handle Session**:
    - Ensure middleware validates the JWT from the cookie.

## Phase 5: Testing
1.  **Unit Tests**: Test auth service logic.
2.  **Integration Tests**: Test login flow via API Gateway.
3.  **E2E Tests**: Update Playwright tests to perform real login.
