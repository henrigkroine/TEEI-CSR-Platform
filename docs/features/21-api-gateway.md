---
id: 21
key: api-gateway
name: API Gateway
category: Platform
status: production
lastReviewed: 2025-01-27
---

# API Gateway

## 1. Summary

- Unified API gateway providing single entry point for all platform services with authentication, authorization, and rate limiting.
- Features JWT authentication (RS256 with JWKS), OIDC SSO (Google/Azure), RBAC middleware (4 roles), rate limiting (WAF), reverse proxy to services, health check aggregation, and tenant-scoped routing.
- Provides centralized request routing, CORS handling, and GDPR privacy endpoints.
- Used by all clients (web, mobile, external APIs) for secure access to platform services.

## 2. Current Status

- Overall status: `production`

- Fully implemented API Gateway service (port 3000) with 49 files (48 TypeScript, 1 SQL). Core features include RS256 JWT validation with JWKS, OIDC SSO (Google/Azure), RBAC middleware (4 roles: admin, company_admin, participant, volunteer), rate limiting (WAF), reverse proxy to services, health check aggregation, tenant-scoped routing, and GDPR privacy endpoints (stubs). Service includes 12 versioned endpoints with comprehensive middleware for auth, rate limiting, and tenant scoping.

- Documentation includes `TENANT_MIDDLEWARE.md` for middleware guide and `docs/api/` with 2 markdown files. Observability includes Grafana dashboard for API Gateway metrics.

## 3. What's Next

- Add request throttling per tenant for fair usage enforcement.
- Implement API key management for external clients and third-party integrations.
- Enhance OAuth 2.0 client credentials flow (currently stub).
- Add webhook signature validation for inbound webhooks.

## 4. Code & Files

Backend / services:
- `services/api-gateway/` - Gateway service (49 files: 48 *.ts, 1 *.sql)
- `services/api-gateway/src/routes/` - Gateway routes (48 *.ts files)
- `services/api-gateway/src/middleware/` - Auth, rate limiting middleware
- `services/api-gateway/src/middleware/rbac.ts` - Role-based access control
- `services/api-gateway/src/middleware/tenantScope.ts` - Tenant isolation

Frontend / UI:
- No separate UI (gateway is backend service)

Shared / schema / docs:
- `TENANT_MIDDLEWARE.md` - Middleware documentation
- `docs/api/` - API documentation (2 *.md files)

## 5. Dependencies

Consumes:
- Identity & SSO for authentication
- Redis for rate limiting
- All backend services for reverse proxy routing

Provides:
- Unified API access for all clients
- Authentication and authorization for all requests
- Rate limiting and throttling for service protection

## 6. Notes

- Single entry point ensures consistent authentication and authorization across all services.
- RBAC middleware enforces role-based access with 4 roles (admin, company_admin, participant, volunteer).
- Tenant-scoped routing ensures data isolation between companies.
- Health check aggregation provides service status monitoring.
- Rate limiting protects services from abuse and ensures fair usage.



