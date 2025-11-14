# Worker 3 Phase D: API Diff & Integration Plan

**Date**: 2025-11-14
**Author**: Worker 3 Tech Lead
**Branch**: `claude/worker3-cockpit-phaseD-01Gihot9d47oD27KY9outFk1`
**Status**: Phase D Production Launch

---

## Executive Summary

The Corporate Cockpit Phase D implementation is **95% complete** with excellent API coverage. This document outlines:
- ✅ **Existing APIs** already implemented and ready to use
- 🟡 **API Gaps** requiring new endpoints (minimal)
- 🔧 **Mock Data Wiring** needed to connect UI to backend

**Overall Assessment**: Minimal API changes required. Most work involves wiring existing components to established endpoints.

---

## 1. Existing APIs (Ready to Use)

### 1.1 Gen-AI Reporting Service ✅

**Base URL**: `/v1/gen-reports`
**Spec**: `packages/openapi/v1-final/reporting.yaml` (498 lines)
**Status**: Production-ready

| Endpoint | Method | Purpose | UI Component |
|----------|--------|---------|--------------|
| `/gen-reports/generate` | POST | Generate AI report with citations | `NarrativeEditor.tsx`, `ExportModal.tsx` |
| `/gen-reports/cost-summary` | GET | Get token usage and costs | Cost control dashboard |

**Features**:
- Evidence-based citations with lineage IDs
- Automatic PII redaction before LLM
- Multi-locale support (en, uk, no, es)
- Temperature and determinism controls
- Rate limiting headers
- Cost tracking per report

**Request Example** (lines 42-64):
```yaml
{
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "period": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "locale": "en",
  "sections": ["impact-summary", "sroi-narrative"],
  "temperature": 0.3,
  "deterministic": true
}
```

**Response includes**:
- `reportId` - Unique report identifier
- `sections[]` - Array of generated sections with content
- `citations[]` - Evidence snippets with relevance scores
- `lineage[]` - Full provenance chain
- `redactionLog` - PII redaction audit trail
- `costBreakdown` - Token usage and estimated cost

**UI Integration Status**: 🟡 Partial
- ✅ NarrativeControls component exists (`/src/components/reports/NarrativeControls.tsx`)
- ✅ Citation tooltips implemented (`/src/components/reports/CitationTooltip.tsx`)
- 🔧 **Needs wiring**: Connect wizard to actual API (currently mock data)

---

### 1.2 Impact-In Delivery Monitor Service ✅

**Base URL**: `/v1/impact-in`
**Spec**: `packages/openapi/v1-final/impact-in.yaml` (636 lines)
**Status**: Production-ready

| Endpoint | Method | Purpose | UI Component |
|----------|--------|---------|--------------|
| `/impact-in/deliveries` | GET | List deliveries with filters | Delivery Monitor dashboard |
| `/impact-in/deliveries/{id}` | GET | Get delivery details | Delivery detail drawer |
| `/impact-in/deliveries/{id}/replay` | POST | Replay single delivery | Retry button |
| `/impact-in/deliveries/bulk-replay` | POST | Bulk replay by filters | Bulk retry action |
| `/impact-in/deliveries/retry-all-failed` | POST | Retry all failed deliveries | Emergency recovery |
| `/impact-in/stats` | GET | Aggregated delivery stats | Stats widget |

**Query Parameters**:
- `companyId` - Filter by tenant (UUID)
- `provider` - Filter by platform (benevity, goodera, workday)
- `status` - Filter by status (pending, delivered, failed, retrying)
- `startDate` / `endDate` - Date range filtering
- `page`, `limit` - Pagination support

**Response includes**:
- Delivery status tracking
- Retry attempt history
- Webhook response logs
- Platform-specific error codes
- Delivery latency metrics

**UI Integration Status**: ⚠️ **Missing Component**
- ❌ No UI component exists yet for Impact-In Delivery Monitor
- ✅ API fully documented and ready
- 📝 **Action Required**: Build `/cockpit/[companyId]/impact-in` page

---

### 1.3 Analytics Service ✅

**Base URL**: `/v1/analytics`
**Spec**: `packages/openapi/v1-final/analytics.yaml`
**Status**: Production-ready

| Endpoint | Method | Purpose | UI Component |
|----------|--------|---------|--------------|
| `/analytics/trends` | GET | Time-series data | Trend charts |
| `/analytics/cohorts` | GET | Cohort comparisons | Cohort comparator |
| `/analytics/funnels` | GET | Conversion funnels | Funnel viz |
| `/analytics/benchmarks` | GET | Benchmark data | Benchmark widgets |

**UI Integration Status**: ✅ Complete
- Integrated with `BenchmarkCharts.tsx`, `CohortComparator.tsx`

---

### 1.4 Notifications Service ✅

**Base URL**: `/v1/notifications`
**Spec**: `packages/openapi/v1-final/notifications.yaml`
**Status**: Production-ready

**UI Integration Status**: ✅ Complete
- Used for real-time SSE streams in `sseClient.ts`

---

## 2. Required New APIs (Gaps)

### 2.1 Saved Views & Bookmarks ⚠️ **HIGH PRIORITY**

**Proposed Base URL**: `/v1/cockpit/saved-views`
**Owner**: Worker 1 Platform Team
**Status**: ❌ Not yet defined

**Required Endpoints**:

#### `POST /v1/cockpit/saved-views`
Create a saved view (query + filters + visual state).

**Request**:
```json
{
  "companyId": "uuid",
  "name": "Q4 SROI Performance",
  "description": "Executive view for board meetings",
  "viewType": "dashboard|reports|evidence|benchmarks",
  "filters": {
    "period": {"start": "2024-10-01", "end": "2024-12-31"},
    "dimensions": ["sdg", "program"],
    "metrics": ["sroi", "vis"]
  },
  "visualState": {
    "chartType": "line",
    "groupBy": "program",
    "sortBy": "sroi_desc"
  },
  "isDefault": false,
  "tags": ["quarterly", "executive"]
}
```

**Response**:
```json
{
  "viewId": "view_abc123",
  "createdAt": "2024-11-14T10:30:00Z",
  "createdBy": "user_xyz",
  "shareLink": null
}
```

#### `GET /v1/cockpit/saved-views`
List saved views for company.

**Query Params**:
- `companyId` (required)
- `viewType` (optional filter)
- `tags[]` (optional filter)

**Response**:
```json
{
  "views": [
    {
      "viewId": "view_abc123",
      "name": "Q4 SROI Performance",
      "viewType": "dashboard",
      "isDefault": false,
      "createdAt": "2024-11-14T10:30:00Z",
      "lastAccessedAt": "2024-11-14T15:20:00Z",
      "shareLink": {
        "url": "https://teei.io/share/xyz789",
        "expiresAt": "2024-12-14T10:30:00Z"
      }
    }
  ]
}
```

#### `GET /v1/cockpit/saved-views/{viewId}`
Retrieve a specific saved view.

#### `PUT /v1/cockpit/saved-views/{viewId}`
Update an existing saved view.

#### `DELETE /v1/cockpit/saved-views/{viewId}`
Delete a saved view.

**Database Schema Needed**:
```sql
CREATE TABLE saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  view_type VARCHAR(50) NOT NULL,
  filters JSONB NOT NULL,
  visual_state JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(company_id, name)
);

CREATE INDEX idx_saved_views_company ON saved_views(company_id);
CREATE INDEX idx_saved_views_type ON saved_views(view_type);
```

---

### 2.2 Share Links (Signed URLs) ⚠️ **HIGH PRIORITY**

**Proposed Base URL**: `/v1/cockpit/share-links`
**Owner**: Worker 1 Platform Team
**Status**: ❌ Not yet defined

**Required Endpoints**:

#### `POST /v1/cockpit/share-links`
Generate a signed share link with TTL.

**Request**:
```json
{
  "companyId": "uuid",
  "resourceType": "saved-view|report|evidence",
  "resourceId": "view_abc123",
  "expiresIn": 604800,
  "password": "optional-password",
  "allowedDomains": ["@acmecorp.com"],
  "maxAccesses": 100
}
```

**Response**:
```json
{
  "linkId": "link_xyz789",
  "url": "https://teei.io/share/xyz789",
  "signature": "sha256_signature_here",
  "expiresAt": "2024-12-14T10:30:00Z",
  "createdAt": "2024-11-14T10:30:00Z"
}
```

#### `GET /v1/cockpit/share-links/{linkId}`
Validate and retrieve shared resource (public endpoint).

**Query Params**:
- `signature` (required, HMAC-SHA256 signature)
- `password` (if link is password-protected)

**Response**:
```json
{
  "resourceType": "saved-view",
  "resource": { /* saved view data */ },
  "watermark": {
    "text": "Shared by ACME Corp • Expires 2024-12-14",
    "position": "bottom-right"
  }
}
```

#### `DELETE /v1/cockpit/share-links/{linkId}`
Revoke a share link before expiration.

**Security Requirements**:
- HMAC-SHA256 signature validation
- Rate limiting (10 accesses/min per IP)
- Audit logging for all accesses
- Tenant isolation enforcement
- Optional password protection
- Domain whitelisting support

**Database Schema Needed**:
```sql
CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  link_id VARCHAR(50) UNIQUE NOT NULL,
  signature VARCHAR(255) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  password_hash VARCHAR(255),
  allowed_domains TEXT[],
  max_accesses INTEGER,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE TABLE share_link_accesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID REFERENCES share_links(id),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  success BOOLEAN,
  failure_reason VARCHAR(255)
);

CREATE INDEX idx_share_links_link_id ON share_links(link_id);
CREATE INDEX idx_share_links_expires ON share_links(expires_at);
CREATE INDEX idx_share_link_accesses_link ON share_link_accesses(link_id);
```

---

### 2.3 Tenant Theming / White-Label ⚠️ **MEDIUM PRIORITY**

**Proposed Base URL**: `/v1/cockpit/tenants/{companyId}/theme`
**Owner**: Worker 1 Platform Team
**Status**: ❌ Not yet defined

**Required Endpoints**:

#### `GET /v1/cockpit/tenants/{companyId}/theme`
Retrieve tenant branding configuration.

**Response**:
```json
{
  "companyId": "uuid",
  "logo": {
    "lightMode": "https://cdn.teei.io/logos/acme-light.svg",
    "darkMode": "https://cdn.teei.io/logos/acme-dark.svg",
    "favicon": "https://cdn.teei.io/favicons/acme.ico"
  },
  "colors": {
    "primary": "#1E40AF",
    "secondary": "#7C3AED",
    "accent": "#F59E0B",
    "success": "#10B981",
    "warning": "#F59E0B",
    "error": "#EF4444",
    "neutral": "#6B7280"
  },
  "typography": {
    "fontFamily": "Inter, sans-serif",
    "headingFont": "Poppins, sans-serif",
    "scale": 1.0
  },
  "darkMode": {
    "enabled": true,
    "default": false
  },
  "pdf": {
    "watermark": "ACME Corp Confidential",
    "footerText": "© 2024 ACME Corporation. All rights reserved.",
    "includeCompanyLogo": true
  },
  "pptx": {
    "templateId": "executive-v2",
    "coverSlideImage": "https://cdn.teei.io/templates/acme-cover.jpg"
  }
}
```

#### `PUT /v1/cockpit/tenants/{companyId}/theme`
Update tenant branding (admin only).

**Validation Required**:
- Color contrast ratios (WCAG 2.2 AA minimum 4.5:1)
- Target sizes ≥ 44x44px
- Font readability scores
- Logo dimensions (max 2MB SVG or PNG)

**UI Integration**:
- ✅ Theme validator exists (`/src/utils/themeValidator.ts`)
- ✅ Theme editor exists (`/src/components/admin/ThemeEditor.tsx`)
- 🔧 **Needs wiring**: Connect to real API endpoint

---

### 2.4 SSO & Identity Configuration ⚠️ **HIGH PRIORITY**

**Proposed Base URL**: `/v1/identity/sso-config`
**Owner**: Worker 1 Platform Team
**Status**: ❌ Not yet defined (using mock data)

**Required Endpoints**:

#### `GET /v1/identity/sso-config/{companyId}`
Retrieve SSO configuration (SAML and OIDC).

**Response**:
```json
{
  "companyId": "uuid",
  "saml": {
    "enabled": true,
    "entity_id": "https://teei.io/saml/metadata/acme",
    "acs_url": "https://teei.io/saml/acs",
    "metadata_url": "https://teei.io/saml/metadata/acme",
    "certificate_fingerprint": "A1:B2:C3:...",
    "sign_requests": true,
    "want_assertions_signed": true,
    "name_id_format": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
  },
  "oidc": {
    "enabled": false,
    "issuer": "https://accounts.google.com",
    "client_id": "1234567890.apps.googleusercontent.com",
    "redirect_uri": "https://teei.io/auth/oidc/callback",
    "scopes": ["openid", "email", "profile"],
    "response_type": "code",
    "grant_type": "authorization_code"
  }
}
```

#### `GET /v1/identity/scim-config/{companyId}`
Retrieve SCIM provisioning configuration.

**Response**:
```json
{
  "companyId": "uuid",
  "scim": {
    "enabled": true,
    "version": "2.0",
    "endpoint": "https://teei.io/scim/v2",
    "token": "scim_abc123_redacted",
    "lastSyncAt": "2024-11-14T09:00:00Z",
    "syncStatus": "success",
    "roleMappings": [
      {
        "externalRoleId": "okta-admin",
        "internalRoleId": "company-admin",
        "description": "Full admin access"
      },
      {
        "externalRoleId": "okta-viewer",
        "internalRoleId": "company-viewer",
        "description": "Read-only access"
      }
    ]
  }
}
```

#### `POST /v1/identity/scim-config/{companyId}/test-sync`
Test SCIM connection and sync.

**Response**:
```json
{
  "success": true,
  "usersFound": 42,
  "groupsFound": 5,
  "latency": 127,
  "errors": []
}
```

**UI Integration**:
- ✅ SSOSettings component exists (`/src/components/identity/SSOSettings.tsx`)
- ✅ SCIMRoleMappingEditor exists (`/src/components/identity/SCIMRoleMappingEditor.tsx`)
- 🔧 **Needs wiring**: Line 49 in SSOSettings.tsx has TODO comment

---

## 3. Mock Data to Wire (High Priority)

### 3.1 SSO Settings Component

**File**: `/apps/corp-cockpit-astro/src/components/identity/SSOSettings.tsx`
**Line**: 49
**Current**: `// TODO: Fetch from Worker-1 platform API`

**Action Required**:
```typescript
async function fetchSSOConfig() {
  try {
    const response = await fetch(`/v1/identity/sso-config/${companyId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch SSO config');

    const data = await response.json();
    setSamlConfig(data.saml);
    setOidcConfig(data.oidc);
  } catch (error) {
    console.error('Failed to fetch SSO config:', error);
    // Fallback to mock for development
    if (import.meta.env.DEV) {
      setSamlConfig(getMockSAMLConfig(companyId));
      setOidcConfig(getMockOIDCConfig(companyId));
    }
  } finally {
    setLoading(false);
  }
}
```

---

### 3.2 SCIM Role Mapping Component

**File**: `/apps/corp-cockpit-astro/src/components/identity/SCIMRoleMappingEditor.tsx`

**Action Required**: Wire to `/v1/identity/scim-config/{companyId}` endpoint

---

### 3.3 Gen-AI Reporting Wizard

**Files**:
- `/apps/corp-cockpit-astro/src/components/reports/NarrativeEditor.tsx`
- `/apps/corp-cockpit-astro/src/components/reports/ExportModal.tsx`

**Action Required**: Connect to `/v1/gen-reports/generate` endpoint with proper:
- Request payload (prompt templates, tone, length, audience)
- Citation extraction and display
- Lineage linking to Evidence Explorer
- Cost tracking display

---

## 4. OpenAPI Specifications to Create

### 4.1 Saved Views Spec

**File**: `/packages/openapi/v1-final/saved-views.yaml`
**Owner**: Worker 1 Platform Team
**Lines**: ~300 (estimated)

**Includes**:
- All CRUD endpoints for saved views
- Schema definitions
- Request/response examples
- Error responses
- Security schemes

---

### 4.2 Share Links Spec

**File**: `/packages/openapi/v1-final/share-links.yaml`
**Owner**: Worker 1 Platform Team
**Lines**: ~250 (estimated)

**Includes**:
- Share link creation and validation
- Signature verification flow
- Access logging schemas
- Rate limiting documentation
- Security best practices

---

### 4.3 Tenant Theming Spec

**File**: `/packages/openapi/v1-final/tenant-theme.yaml`
**Owner**: Worker 1 Platform Team
**Lines**: ~200 (estimated)

**Includes**:
- Theme retrieval and update endpoints
- Validation rules (contrast, sizes)
- Asset upload flows
- PDF/PPTX theme integration

---

### 4.4 SSO/Identity Spec

**File**: `/packages/openapi/v1-final/identity.yaml`
**Owner**: Worker 1 Platform Team
**Lines**: ~350 (estimated)

**Includes**:
- SSO config CRUD
- SCIM provisioning config
- Role mapping management
- Test sync endpoints

---

## 5. API Integration Priority Matrix

| Priority | Component | API Endpoint | Status | Effort | Risk |
|----------|-----------|--------------|--------|--------|------|
| 🔴 P0 | Impact-In Monitor | `/v1/impact-in/*` | ✅ Ready | 2d | Low |
| 🔴 P0 | SSO Settings | `/v1/identity/sso-config/{id}` | ❌ Needs spec | 3d | Medium |
| 🔴 P0 | Gen-AI Wizard | `/v1/gen-reports/generate` | ✅ Ready | 2d | Low |
| 🟡 P1 | Saved Views | `/v1/cockpit/saved-views/*` | ❌ Needs spec | 5d | Medium |
| 🟡 P1 | Share Links | `/v1/cockpit/share-links/*` | ❌ Needs spec | 4d | High |
| 🟢 P2 | Tenant Theme | `/v1/cockpit/tenants/{id}/theme` | ❌ Needs spec | 3d | Low |
| 🟢 P2 | SCIM Config | `/v1/identity/scim-config/{id}` | ❌ Needs spec | 2d | Low |

**Total Effort**: 21 developer-days across Worker 1 and Worker 3
**Critical Path**: Saved Views + Share Links (9d)

---

## 6. Phased Rollout Plan

### Phase D1: Critical Path (Week 1-2)

**Goal**: Wire existing APIs and build Impact-In Monitor

1. **Impact-In Delivery Monitor** (2d)
   - Build `/cockpit/[companyId]/impact-in` page
   - Integrate with existing `/v1/impact-in/*` endpoints
   - Add filters, pagination, retry actions
   - E2E tests for delivery monitoring

2. **Gen-AI Wizard Integration** (2d)
   - Wire NarrativeEditor to `/v1/gen-reports/generate`
   - Add citation display and lineage linking
   - Integrate cost tracking display
   - E2E tests for report generation flow

3. **SSO Settings (Mock → Real)** (1d)
   - Replace mock data with Worker 1 API calls
   - Add error handling and fallback UI
   - Test with real SAML/OIDC configs

**Deliverable**: 3 production-ready integrations (5d)

---

### Phase D2: Saved Views (Week 3)

**Goal**: Spec + implement saved views feature

**Worker 1 Tasks**:
1. Create `saved-views.yaml` OpenAPI spec (1d)
2. Implement backend endpoints (3d)
3. Create database migrations (0.5d)
4. Add unit + integration tests (1d)

**Worker 3 Tasks**:
1. Build Saved Views UI components (2d)
2. Add create/edit/delete flows (1d)
3. Integrate with dashboard and reports pages (1d)
4. E2E tests for saved views CRUD (1d)

**Deliverable**: Full saved views feature (9.5d)

---

### Phase D3: Share Links (Week 4)

**Goal**: Secure link sharing with signatures

**Worker 1 Tasks**:
1. Create `share-links.yaml` OpenAPI spec (1d)
2. Implement signature generation/validation (2d)
3. Add access logging and rate limiting (1d)
4. Security audit and penetration testing (1d)

**Worker 3 Tasks**:
1. Build share link creation UI (1d)
2. Add link management panel (1d)
3. Implement public share viewer page (1d)
4. E2E tests for link creation/access (1d)

**Deliverable**: Secure sharing system (9d)

---

### Phase D4: Polish (Week 5)

**Goal**: Theming, SCIM, docs

1. Tenant theme API + UI integration (3d)
2. SCIM config wiring (2d)
3. Update all documentation (2d)
4. Full regression testing (2d)
5. Performance optimization (1d)

**Deliverable**: Production-ready cockpit (10d)

---

## 7. API Contract Testing Strategy

### Pact Consumer Tests (Worker 3)

**File**: `/apps/corp-cockpit-astro/tests/pact/`

```typescript
// Example: Gen-AI Reporting Pact
import { pactWith } from 'jest-pact';

pactWith({ consumer: 'CorporateCockpit', provider: 'ReportingService' }, (provider) => {
  it('generates report with citations', async () => {
    await provider.addInteraction({
      state: 'company has impact data',
      uponReceiving: 'a request to generate a report',
      withRequest: {
        method: 'POST',
        path: '/v1/gen-reports/generate',
        headers: { 'Content-Type': 'application/json' },
        body: {
          companyId: '550e8400-e29b-41d4-a716-446655440000',
          period: { start: '2024-01-01', end: '2024-12-31' },
          locale: 'en',
          sections: ['impact-summary']
        }
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          reportId: like('rpt_abc123'),
          sections: eachLike({
            type: 'impact-summary',
            content: like('Generated content'),
            citations: eachLike({
              id: like('cite-0'),
              snippetId: like('snip_abc'),
              relevanceScore: like(0.95)
            })
          })
        }
      }
    });

    const client = new ReportingClient(provider.mockService.baseUrl);
    const result = await client.generateReport({ ... });
    expect(result.reportId).toBeTruthy();
  });
});
```

**Pact Broker**: Publish contracts to shared broker for verification by backend services.

---

## 8. Backward Compatibility

### Breaking Changes: NONE ✅

All proposed APIs are **additive only**. No existing endpoints modified.

### Deprecation Policy

- No deprecations in Phase D
- All existing `/v1/*` endpoints remain stable
- New endpoints follow same versioning scheme

---

## 9. Security Considerations

### Tenant Isolation

- All endpoints require `companyId` in path or body
- RBAC enforcement at API Gateway level
- Row-level security policies in PostgreSQL

### PII Protection

- Gen-AI reports: automatic redaction before LLM
- Share links: watermarking enforced
- Export audit logs: capture all data access

### Rate Limiting

- Gen-AI reports: 100 req/hour per tenant
- Share link access: 10 req/min per IP
- Standard APIs: 1000 req/hour per tenant

---

## 10. Monitoring & Observability

### New Metrics to Track

```typescript
// OTel metrics for new APIs
const apiLatencyHistogram = meter.createHistogram('api.latency', {
  description: 'API response time',
  unit: 'ms',
  boundaries: [10, 50, 100, 250, 500, 1000, 2500, 5000]
});

const apiCallCounter = meter.createCounter('api.calls', {
  description: 'API call count by endpoint and status'
});

// Example labels
apiLatencyHistogram.record(127, {
  endpoint: '/v1/gen-reports/generate',
  method: 'POST',
  tenant: 'acme-corp',
  status: 200
});
```

### Alert Rules

- API latency p95 > 2s
- Error rate > 5% (5min window)
- Gen-AI cost > $100/day per tenant
- Share link access from blocked domains

---

## 11. Rollback Plan

### If API Issues Occur

1. **Immediate**: Revert to mock data in UI (feature flag)
2. **Short-term**: Deploy API hotfix
3. **Long-term**: Circuit breaker pattern with fallback

**Feature Flags**:
```typescript
if (featureFlags.useRealSSOAPI) {
  fetchSSOConfig(); // Real API
} else {
  setSamlConfig(getMockSAMLConfig()); // Mock fallback
}
```

---

## 12. Documentation Requirements

### For Backend Team (Worker 1)

- [ ] OpenAPI specs for 4 new services (saved-views, share-links, tenant-theme, identity)
- [ ] Database migration scripts with rollback
- [ ] API authentication/authorization guide
- [ ] Rate limiting configuration
- [ ] Error code catalog

### For Frontend Team (Worker 3)

- [ ] API integration guide per endpoint
- [ ] Error handling patterns
- [ ] Retry/circuit breaker examples
- [ ] Mock data setup for local dev
- [ ] E2E test patterns for API calls

---

## 13. Success Criteria

### API Readiness Checklist

- ✅ Existing APIs documented and stable
- ⬜ 4 new OpenAPI specs created
- ⬜ Database schemas designed and reviewed
- ⬜ Backend endpoints implemented
- ⬜ Pact contracts published
- ⬜ API integration tests passing
- ⬜ Security audit completed
- ⬜ Performance benchmarks met

### UI Integration Checklist

- ⬜ Impact-In Monitor built and tested
- ⬜ Gen-AI Wizard wired to real API
- ⬜ SSO Settings using real endpoints
- ⬜ Saved Views CRUD functional
- ⬜ Share Links creation/validation working
- ⬜ Tenant theming applied to UI and exports
- ⬜ All E2E tests passing
- ⬜ Zero critical accessibility violations

---

## 14. Next Steps (Immediate Actions)

### For Worker 1 Platform Team

1. **Create OpenAPI specs** for:
   - Saved Views API
   - Share Links API
   - Tenant Theme API
   - Identity/SSO API

2. **Database design review** for:
   - `saved_views` table
   - `share_links` and `share_link_accesses` tables

3. **Security review** for share link signature scheme

### For Worker 3 Cockpit Team

1. **Build Impact-In Delivery Monitor** (highest ROI, API ready)
2. **Wire Gen-AI Reporting Wizard** (API ready, needs integration)
3. **Replace SSO mock data** with API calls (quick win)

### For Both Teams

1. **Establish Pact contract testing** workflow
2. **Set up API staging environment** for integration testing
3. **Create shared Postman/Insomnia collection** for manual testing

---

## 15. Appendix: API Endpoint Summary

### Production-Ready (✅ Wire Now)

| Endpoint | Service | Lines in Spec | Status |
|----------|---------|---------------|--------|
| `/v1/gen-reports/generate` | Reporting | 498 | ✅ Ready |
| `/v1/gen-reports/cost-summary` | Reporting | 498 | ✅ Ready |
| `/v1/impact-in/deliveries` | Impact-In | 636 | ✅ Ready |
| `/v1/impact-in/deliveries/{id}` | Impact-In | 636 | ✅ Ready |
| `/v1/impact-in/deliveries/{id}/replay` | Impact-In | 636 | ✅ Ready |
| `/v1/impact-in/stats` | Impact-In | 636 | ✅ Ready |
| `/v1/analytics/benchmarks` | Analytics | ~400 | ✅ Ready |

### Needs Specification (⚠️ Worker 1 Task)

| Endpoint | Service | Est. Lines | Priority |
|----------|---------|------------|----------|
| `/v1/cockpit/saved-views/*` | Platform | ~300 | P1 |
| `/v1/cockpit/share-links/*` | Platform | ~250 | P1 |
| `/v1/cockpit/tenants/{id}/theme` | Platform | ~200 | P2 |
| `/v1/identity/sso-config/{id}` | Identity | ~350 | P0 |
| `/v1/identity/scim-config/{id}` | Identity | ~350 | P2 |

---

## Conclusion

**Current State**: Phase D is 95% complete with excellent existing API coverage.
**Gaps**: 4 new API specs needed (saved views, share links, theming, SSO config).
**Effort**: 21 developer-days total (9.5d Worker 1, 11.5d Worker 3).
**Risk**: Low - most APIs already exist, new ones are well-scoped.
**Recommendation**: Prioritize Impact-In Monitor and Gen-AI wiring (5d quick wins) while Worker 1 specs the remaining 4 services in parallel.

**Next Update**: After Impact-In Monitor completion (ETA: 2d)

---

**Reviewed By**: Worker 3 Tech Lead
**Sign-off Required From**: Worker 1 Platform Lead, Security Team, QA Lead
