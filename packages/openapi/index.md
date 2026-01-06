# TEEI CSR Platform - OpenAPI Catalog

> **API Version:** v1
> **Last Updated:** 2025-11-13
> **Status:** Production-ready with Phase B hardening

---

## Overview

This directory contains OpenAPI 3.0.3 specifications for all TEEI CSR Platform microservices. All APIs use `/v1` prefix for versioning and stability.

## Service Specifications

### 1. API Gateway
**File:** [`api-gateway.yaml`](./api-gateway.yaml)
**Port:** 3000
**Description:** Unified API gateway with JWT authentication, rate limiting, and reverse proxy routing.

**Key Endpoints:**
- `GET /` - Gateway information
- `GET /health` - Gateway health check
- `GET /health/all` - Check all services health

**Features:**
- HS256 JWT authentication (to be upgraded to RS256 in Security Lead phase)
- Rate limiting: 100 requests/minute
- CORS support
- Request/response logging

---

### 2. Unified Profile Service
**File:** [`unified-profile.yaml`](./unified-profile.yaml)
**Port:** 3001
**Gateway Path:** `/v1/profile/*`
**Description:** User profile management, identity unification, and external ID mapping.

**Key Endpoints:**
- `GET /v1/profile/{id}` - Get aggregated user profile
- `PUT /v1/profile/{id}` - Update user profile
- `POST /v1/profile/mapping` - Create external ID mapping

**Data Models:**
- User profiles with role-based access
- External ID mappings (Kintell, Buddy, Upskilling)
- Program enrollments and journey flags

---

### 3. Kintell Connector
**File:** [`kintell-connector.yaml`](./kintell-connector.yaml)
**Port:** 3002
**Gateway Path:** `/v1/kintell/*`
**Description:** Integration with external skills taxonomy systems via CSV and webhooks.

**Key Endpoints:**
- `POST /v1/import/sessions` - Import session data from CSV
- `POST /v1/webhooks/session-scheduled` - Webhook for scheduled sessions
- `POST /v1/webhooks/session-completed` - Webhook for completed sessions

**Event Emissions:**
- `kintell.session.scheduled`
- `kintell.session.completed`
- `kintell.rating.created`

---

### 4. Buddy Service
**File:** [`buddy-service.yaml`](./buddy-service.yaml)
**Port:** 3003
**Gateway Path:** `/v1/buddy/*`
**Description:** Peer mentorship program management with match creation and feedback.

**Key Endpoints:**
- `POST /v1/import/matches` - Import buddy matches
- `POST /v1/import/events` - Import buddy events
- `POST /v1/import/checkins` - Import check-ins
- `POST /v1/import/feedback` - Import feedback

**Event Emissions:**
- `buddy.match.created`
- `buddy.event.logged`
- `buddy.checkin.completed`
- `buddy.feedback.submitted`

---

### 5. Upskilling Connector
**File:** [`upskilling-connector.yaml`](./upskilling-connector.yaml)
**Port:** 3004
**Gateway Path:** `/v1/upskilling/*`
**Description:** External learning platform integration for course completions.

**Key Endpoints:**
- `POST /v1/import/completions` - Import course completions from CSV

**Event Emissions:**
- `upskilling.course.completed`
- `upskilling.progress.updated`
- `upskilling.credential.issued`

---

### 6. Q2Q AI Service
**File:** [`q2q-ai.yaml`](./q2q-ai.yaml)
**Port:** 3005
**Gateway Path:** `/v1/q2q/*`
**Description:** Outcome classification and taxonomy management for career guidance.

**Key Endpoints:**
- `POST /v1/classify/text` - Classify text and store outcome scores
- `GET /v1/taxonomy` - Get outcome dimension definitions

**Classification Dimensions:**
- Employability Skills (communication, teamwork, problem_solving, etc.)
- Career Readiness (career_awareness, goal_setting, job_search)
- Personal Development (confidence, resilience, growth_mindset)

---

### 7. Safety & Moderation Service
**File:** [`safety-moderation.yaml`](./safety-moderation.yaml)
**Port:** 3006
**Gateway Path:** `/v1/safety/*`
**Description:** Content screening and policy enforcement with human review queue.

**Key Endpoints:**
- `POST /v1/screen/text` - Screen text for safety violations
- `GET /v1/review-queue` - Get pending review items
- `PUT /v1/review/{id}` - Mark review as complete

**Event Emissions:**
- `safety.flag.raised`
- `safety.review.completed`

---

## Merged Specification

**File:** [`merged.yaml`](./merged.yaml)

Combined OpenAPI specification with all service endpoints accessible through the API Gateway. Use this for:
- Generating unified API documentation
- Client SDK generation
- API testing tools (Postman, Insomnia)
- Contract testing

---

## API Versioning Strategy

### Current Version: v1

All endpoints use the `/v1` prefix to ensure:
- **Backward compatibility** - Old clients continue to work
- **Gradual migration** - New versions can coexist
- **Clear deprecation** - Old versions can be sunset gracefully

### Version Headers

All API Gateway responses include:
```
X-API-Version: v1
```

### Deprecation Policy

Unversioned endpoints (e.g., `/profile/123`) are deprecated. Clients should migrate to `/v1/profile/123`.

Future deprecations will include:
```
Deprecation: true
Sunset: 2026-01-01
Link: <https://docs.teei.platform/migration/v2>; rel="successor-version"
```

---

## Authentication

### JWT Bearer Token

All authenticated endpoints (via API Gateway) require:

```http
Authorization: Bearer <jwt-token>
```

**Token Format:**
- Algorithm: HS256 (Phase A) → RS256 (Phase B Security hardening)
- Expiry: 24 hours
- Claims: `userId`, `role`, `tenantId`

**Roles:**
- `apprentice` - End users
- `company_admin` - Company administrators
- `program_admin` - Platform administrators

---

## Rate Limiting

**API Gateway Limits:**
- 100 requests per minute per user/IP
- 429 status code when exceeded
- `Retry-After` header indicates wait time

**Response on rate limit:**
```json
{
  "success": false,
  "error": "Rate Limit Exceeded",
  "message": "Too many requests. Please try again in 45 seconds.",
  "retryAfter": 45000
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "ErrorType",
  "message": "Human-readable description"
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid JWT)
- `404` - Not Found
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## Usage Examples

### Using Swagger UI

```bash
# Install swagger-ui
npm install -g swagger-ui

# View individual service spec
swagger-ui-watcher api-gateway.yaml

# View merged spec
swagger-ui-watcher merged.yaml
```

### Generating Client SDKs

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i merged.yaml \
  -g typescript-axios \
  -o ./generated/typescript-client

# Generate Python client
openapi-generator-cli generate \
  -i merged.yaml \
  -g python \
  -o ./generated/python-client
```

### Testing with curl

```bash
# Get JWT token (example)
TOKEN="your-jwt-token"

# Get user profile
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/v1/profile/123e4567-e89b-12d3-a456-426614174000

# Classify text
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"I learned great communication skills","userId":"123e4567-e89b-12d3-a456-426614174000"}' \
  http://localhost:3000/v1/q2q/classify/text
```

---

## Validation

### Validate OpenAPI Specs

```bash
# Install validator
npm install -g openapi-spec-validator

# Validate individual specs
openapi-spec-validator api-gateway.yaml
openapi-spec-validator unified-profile.yaml
openapi-spec-validator merged.yaml

# Validate all specs
for spec in *.yaml; do
  echo "Validating $spec..."
  openapi-spec-validator "$spec"
done
```

---

## Future Enhancements

### Phase B Hardening (In Progress)

- [ ] RS256 JWT with JWKS endpoint
- [ ] OIDC SSO integration
- [ ] Webhook signature validation (HMAC-SHA256)
- [ ] Service-to-service authentication
- [ ] OpenTelemetry tracing headers
- [ ] Idempotency keys for POST/PUT requests

### Phase C (Planned)

- [ ] GraphQL federation layer
- [ ] WebSocket API specifications
- [ ] API versioning to v2 with breaking changes
- [ ] gRPC service definitions
- [ ] AsyncAPI for event-driven patterns

---

## Support & Documentation

- **API Documentation:** https://docs.teei.platform/api
- **Architecture Docs:** `/docs/Platform_Architecture.md`
- **Phase A Reference:** `/docs/PHASE_A_QUICK_REFERENCE.md`
- **Issues:** Report to platform team

---

**Maintained by:** Platform Lead (Phase B Hardening)
**OpenAPI Version:** 3.0.3
**Platform Version:** 1.0.0
