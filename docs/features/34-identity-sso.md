---
id: 34
key: identity-sso
name: Identity & SSO
category: Platform
status: in-progress
lastReviewed: 2025-01-27
---

# Identity & SSO

## 1. Summary

- Single Sign-On and identity management system for enterprise authentication and user provisioning.
- Features SAML/OIDC SSO, SCIM provisioning, role management, and identity federation.
- Provides enterprise-grade authentication with support for major identity providers.
- Used by enterprise customers for secure authentication and user management.

## 2. Current Status

- Overall status: `in-progress`

- Partially implemented Identity & SSO with identity components (`apps/corp-cockpit-astro/src/components/identity/` with 5 TypeScript files) and identity API (`apps/corp-cockpit-astro/src/api/identity.ts`). Core features include SAML/OIDC SSO, SCIM provisioning, and role management. UI exists but backend integration may be incomplete. Documentation may exist in `docs/identity/` for identity documentation.

- API Gateway includes OIDC SSO (Google/Azure) support, but full SSO implementation may need completion.

## 3. What's Next

- Complete SAML/OIDC SSO backend implementation.
- Add SCIM provisioning endpoints for user synchronization.
- Implement identity provider configuration UI.
- Add SSO testing and validation tools.

## 4. Code & Files

Backend / services:
- `services/api-gateway/src/middleware/auth.ts` - Authentication middleware
- `apps/corp-cockpit-astro/src/api/identity.ts` - Identity API

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/identity/` - Identity components (5 *.tsx files)

Shared / schema / docs:
- `docs/identity/` - Identity documentation (if exists)

## 5. Dependencies

Consumes:
- API Gateway for authentication
- Identity providers (SAML/OIDC)
- SCIM providers for user provisioning

Provides:
- SSO authentication for enterprise customers
- User provisioning for automated user management
- Role management for access control

## 6. Notes

- SAML/OIDC SSO enables enterprise authentication with major identity providers.
- SCIM provisioning automates user synchronization from HR systems.
- Role management ensures proper access control across the platform.
- Identity federation allows seamless authentication across systems.
- Backend integration may need completion for full SSO functionality.



