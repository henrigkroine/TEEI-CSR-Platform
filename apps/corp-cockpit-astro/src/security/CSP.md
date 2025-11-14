# Content Security Policy (CSP) - Worker 3 Phase D

## Overview
This document defines the Content Security Policy for the TEEI Corporate Cockpit application, implementing strict CSP Level 3 compliance with zero tolerance for inline scripts and unsafe evaluations.

## Current CSP Policy (Pre-Phase D)

**Status**: No CSP headers configured (implicit default)

**Risks**:
- No XSS protection at CSP level
- Inline scripts allowed by default
- No restrictions on resource loading
- Vulnerable to code injection attacks
- No monitoring of policy violations

## Target Strict CSP Policy (Phase D)

### Policy Directives

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{NONCE}';
  style-src 'self' 'nonce-{NONCE}';
  img-src 'self' data: https:;
  connect-src 'self' wss: https:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
  block-all-mixed-content;
  require-trusted-types-for 'script';
  trusted-types default dompurify;
  report-uri /api/csp-reports;
```

### Directive Explanations

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'self'` | Default policy for all resource types |
| `script-src` | `'self' 'nonce-{NONCE}'` | Only scripts from same origin or with valid nonce |
| `style-src` | `'self' 'nonce-{NONCE}'` | Only styles from same origin or with valid nonce |
| `img-src` | `'self' data: https:` | Images from same origin, data URIs, or HTTPS |
| `connect-src` | `'self' wss: https:` | XHR/Fetch/WebSocket to same origin or secure protocols |
| `font-src` | `'self'` | Fonts only from same origin |
| `object-src` | `'none'` | No plugins (Flash, Java, etc.) |
| `base-uri` | `'self'` | Restrict `<base>` tag to same origin |
| `form-action` | `'self'` | Forms can only submit to same origin |
| `frame-ancestors` | `'none'` | Prevent clickjacking (X-Frame-Options: DENY) |
| `upgrade-insecure-requests` | (flag) | Auto-upgrade HTTP to HTTPS |
| `block-all-mixed-content` | (flag) | Block mixed content loading |
| `require-trusted-types-for` | `'script'` | Enforce Trusted Types for DOM sinks |
| `trusted-types` | `default dompurify` | Allowed Trusted Types policies |
| `report-uri` | `/api/csp-reports` | Violation reporting endpoint |

### Strict Policy Characteristics

✅ **NO** `unsafe-inline` - All inline scripts prohibited
✅ **NO** `unsafe-eval` - No dynamic code evaluation
✅ **NO** `unsafe-hashes` - No hash-based inline script allowances
✅ **Nonce-based** - Cryptographic nonces for legitimate scripts
✅ **Trusted Types** - DOM XSS protection via type enforcement

## Migration Plan

### Phase 1: Audit (Completed)
- [x] Scan all `.astro` files for inline scripts
- [x] Identify inline event handlers (`onclick`, `onload`, etc.)
- [x] Document all inline script locations
- [x] Assess migration complexity

**Findings**:
- 11+ files with inline `<script>` tags
- 1 inline event handler (`onclick`)
- Service worker registration inline
- Export button handlers inline
- Chart initialization scripts inline

### Phase 2: Migrate Inline Scripts (In Progress)
1. **Service Worker Registration**
   - File: `BaseLayout.astro` (lines 56-73)
   - Action: Move to `/src/client/init/serviceWorker.ts`
   - Status: ⏳ Pending

2. **Export Button Handlers**
   - File: `index.astro` (lines 292-318)
   - Action: Move to `/src/client/init/exportHandlers.ts`
   - Status: ⏳ Pending

3. **Inline Event Handlers**
   - File: `index.astro` (line 196)
   - Action: Replace `onclick` with addEventListener
   - Status: ⏳ Pending

4. **Chart Initialization**
   - Files: Multiple pages with chart scripts
   - Action: Move to `/src/client/init/charts.ts`
   - Status: ⏳ Pending

5. **Other Page Scripts**
   - Files: `trends.astro`, `q2q.astro`, partner pages, etc.
   - Action: Extract to modular external scripts
   - Status: ⏳ Pending

### Phase 3: Implement Nonce Strategy
- [x] Define nonce generation strategy (Worker 1 gateway)
- [ ] Add nonce to Astro response headers
- [ ] Pass nonce to all script/style tags
- [ ] Coordinate with Worker 1 for gateway nonce injection

### Phase 4: Testing & Validation
- [ ] Test CSP in report-only mode
- [ ] Monitor CSP violation reports
- [ ] Fix any remaining violations
- [ ] Enable enforcement mode
- [ ] Validate no functionality breaks

### Phase 5: Production Deployment
- [ ] Deploy to staging environment
- [ ] Run automated CSP compliance tests
- [ ] Performance testing with CSP enabled
- [ ] Deploy to production with monitoring
- [ ] Monitor violation reports for 7 days

## Nonce Generation Strategy

### Requirements
- Nonce MUST be cryptographically random (at least 128 bits)
- Nonce MUST be unique per HTTP response
- Nonce MUST NOT be reused across requests
- Nonce MUST be base64-encoded

### Implementation

**Location**: Worker 1 Gateway (upstream)

**Algorithm**:
```typescript
import { randomBytes } from 'crypto';

function generateCSPNonce(): string {
  return randomBytes(16).toString('base64');
}
```

**Integration Points**:
1. **Gateway Middleware**: Generate nonce per request
2. **Response Header**: Inject nonce into CSP header
3. **HTML Injection**: Pass nonce to Astro via custom header
4. **Template Access**: Make nonce available in Astro.locals

**Astro Integration**:
```astro
---
const nonce = Astro.locals.cspNonce || '';
---

<script nonce={nonce} src="/client/init/app.js"></script>
<style nonce={nonce}>
  /* Critical CSS */
</style>
```

### Nonce Lifecycle
1. Request arrives at Worker 1 gateway
2. Gateway generates fresh nonce
3. Gateway adds `Content-Security-Policy` header with nonce
4. Gateway forwards nonce to Astro in `X-CSP-Nonce` header
5. Astro middleware extracts nonce to `Astro.locals.cspNonce`
6. Templates use nonce for script/style tags
7. Browser validates nonce on resource execution

## Worker 1 Gateway Alignment

### Coordination Points
1. **CSP Header Generation**: Worker 1 responsible
2. **Nonce Injection**: Worker 1 generates, Astro consumes
3. **Reporting Endpoint**: Worker 1 proxies to Worker 3
4. **Policy Sync**: Regular reviews between teams

### Gateway Configuration Example
```typescript
// Worker 1: gateway/middleware/csp.ts
export function cspMiddleware(req: Request): Response {
  const nonce = generateCSPNonce();

  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: https:",
    "connect-src 'self' wss: https:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "require-trusted-types-for 'script'",
    "trusted-types default dompurify",
    "report-uri /api/csp-reports"
  ].join('; ');

  const headers = new Headers();
  headers.set('Content-Security-Policy', cspHeader);
  headers.set('X-CSP-Nonce', nonce);

  return next(req, { headers });
}
```

## External Script Exceptions

### Analytics (If Required)
**Domain**: `https://analytics.teei.io` (hypothetical)
**Justification**: Business requirement for user behavior tracking
**CSP Addition**: `script-src 'self' 'nonce-{NONCE}' https://analytics.teei.io`
**Status**: ❌ Not currently used

### CDN Resources (If Required)
**Domain**: `https://cdn.teei.io` (hypothetical)
**Justification**: Static asset delivery optimization
**CSP Addition**: `script-src 'self' 'nonce-{NONCE}' https://cdn.teei.io`
**Status**: ❌ Not currently used

### Third-Party Libraries
**Current Status**: All libraries bundled via Vite (no external CDN dependencies)
**Policy**: Prefer bundling over CDN for security and reliability

## Known Exceptions and Justifications

### 1. Data URIs for Images
**Directive**: `img-src 'self' data: https:`
**Justification**: Required for:
- SVG icons in UI components
- Base64-encoded chart images
- Dynamic image generation

### 2. HTTPS for Connections
**Directive**: `connect-src 'self' wss: https:`
**Justification**: Required for:
- WebSocket connections to real-time services
- API calls to external TEEI services (Impact-In, etc.)
- Future SSO integrations

### 3. Trusted Types Policies
**Directive**: `trusted-types default dompurify`
**Justification**:
- `default`: Main application policy for DOM manipulation
- `dompurify`: Third-party sanitization library policy

## Monitoring and Reporting

### Violation Report Structure
```json
{
  "csp-report": {
    "document-uri": "https://cockpit.teei.io/dashboard",
    "referrer": "",
    "violated-directive": "script-src-elem",
    "effective-directive": "script-src-elem",
    "original-policy": "default-src 'self'; script-src 'self' 'nonce-abc123'",
    "blocked-uri": "inline",
    "status-code": 200,
    "script-sample": "window.location.reload()"
  }
}
```

### Reporting Endpoint
**URL**: `/api/csp-reports`
**Method**: POST
**Handler**: `/services/reporting/routes/csp-reports.ts`
**Logging**: Forward to Worker 1 observability stack

### Alert Thresholds
- **Critical**: Any violation in production (after stabilization period)
- **Warning**: > 10 violations per hour in staging
- **Info**: Unique violation patterns (not seen before)

## CSP Testing Strategy

### 1. Browser DevTools
- Open Console (F12)
- Look for CSP violation warnings
- Verify nonces are correctly applied

### 2. CSP Evaluator
**Tool**: [Google CSP Evaluator](https://csp-evaluator.withgoogle.com/)
**Usage**: Paste policy, analyze security score
**Target**: "No known bypasses found" (green score)

### 3. Automated Tests
**Framework**: Playwright
**Tests**:
- Verify CSP header present
- Validate nonce values are unique
- Check no inline script violations
- Test Trusted Types enforcement

### 4. Report-Only Mode
**Phase**: Initial deployment
**Header**: `Content-Security-Policy-Report-Only`
**Duration**: 7 days minimum
**Action**: Monitor violations, fix, then enforce

## Rollback Plan

### Trigger Conditions
- Critical functionality broken (auth, payments, etc.)
- High violation rate (> 1000/hour) after fixes
- Vendor library incompatibility discovered

### Rollback Procedure
1. Switch to `Content-Security-Policy-Report-Only` header
2. Deploy hotfix removing Trusted Types enforcement
3. Investigate root cause
4. Re-plan migration with new findings
5. Re-deploy with fixes

### Rollback SLA
- Detection: < 5 minutes (monitoring alerts)
- Decision: < 15 minutes (incident commander)
- Execution: < 10 minutes (automated rollback)
- Total: < 30 minutes from incident to rollback

## Success Metrics

✅ **Policy Strength**: CSP Evaluator score "No known bypasses"
✅ **Zero Inline Scripts**: No `<script>` tags without `src` or `nonce`
✅ **Zero Inline Event Handlers**: No `onclick`, `onload`, etc.
✅ **Trusted Types Active**: `require-trusted-types-for 'script'` enforced
✅ **Violation Rate**: < 10 violations/day in production (after stabilization)
✅ **Functionality**: No regressions in core features
✅ **Performance**: < 5ms overhead per request

## References

- [CSP Level 3 Specification](https://www.w3.org/TR/CSP3/)
- [Trusted Types Specification](https://w3c.github.io/trusted-types/dist/spec/)
- [Google CSP Guide](https://csp.withgoogle.com/docs/index.html)
- [MDN CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)

## Maintenance

### Regular Reviews
- **Frequency**: Quarterly
- **Owner**: perf-a11y-lead
- **Scope**: Policy effectiveness, new directives, vendor changes

### Update Triggers
- New third-party integrations
- Change in asset hosting strategy
- Discovery of new XSS vectors
- Browser CSP feature updates

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-14
**Owner**: csp-engineer, sri-assets-engineer
**Status**: Phase D Implementation
