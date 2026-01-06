# Content Security Policy (CSP) & Trusted Types Guide

## Overview

This document explains the Content Security Policy (CSP) and Trusted Types implementation in the TEEI Corporate Cockpit platform. These security measures protect against Cross-Site Scripting (XSS) attacks and other code injection vulnerabilities.

## Table of Contents

- [What is CSP?](#what-is-csp)
- [What are Trusted Types?](#what-are-trusted-types)
- [Our Implementation](#our-implementation)
- [CSP Policy Details](#csp-policy-details)
- [Using Trusted Types](#using-trusted-types)
- [Subresource Integrity (SRI)](#subresource-integrity-sri)
- [Troubleshooting CSP Violations](#troubleshooting-csp-violations)
- [Best Practices](#best-practices)

---

## What is CSP?

Content Security Policy (CSP) is a security standard that helps prevent XSS attacks, clickjacking, and other code injection attacks by controlling which resources can be loaded and executed on a web page.

### Key Benefits

- **XSS Prevention**: Blocks execution of malicious scripts
- **Clickjacking Protection**: Prevents embedding in malicious iframes
- **Data Exfiltration Prevention**: Controls where data can be sent
- **Mixed Content Protection**: Enforces HTTPS-only resources

---

## What are Trusted Types?

Trusted Types is a browser API that prevents DOM-based XSS by requiring explicit sanitization of strings before they're used in dangerous DOM sinks (like `innerHTML`, `eval`, etc.).

### Key Benefits

- **DOM XSS Prevention**: Blocks unsafe DOM manipulation
- **Type Safety**: Enforces sanitization at runtime
- **Developer Guidance**: Highlights dangerous code patterns

---

## Our Implementation

### Architecture

```
┌─────────────────┐
│  Astro Frontend │ ← CSP headers + nonce injection
└────────┬────────┘
         │
         ├─ Trusted Types Policy (trustedTypes.ts)
         └─ CSP violation reporting
                  │
                  ↓
┌─────────────────┐
│ Reporting API   │ ← CSP middleware + violation handler
└─────────────────┘
         │
         ↓
┌─────────────────┐
│   Worker-1      │ ← Centralized logging
└─────────────────┘
```

### Components

1. **CSP Middleware** (`services/reporting/src/middleware/csp.ts`)
   - Generates cryptographic nonces
   - Builds CSP headers
   - Sets security headers

2. **Trusted Types Policy** (`apps/corp-cockpit-astro/src/utils/trustedTypes.ts`)
   - Defines sanitization rules
   - Provides helper functions
   - Type-safe DOM manipulation

3. **CSP Report Handler** (`services/reporting/src/routes/csp.ts`)
   - Receives violation reports
   - Filters false positives
   - Forwards to Worker-1

4. **SRI Generator** (`scripts/generate-sri.js`)
   - Calculates integrity hashes
   - Updates HTML files
   - Validates third-party scripts

---

## CSP Policy Details

### Current Policy

```
Content-Security-Policy:
  default-src 'self';
  script-src 'nonce-{random}' 'strict-dynamic' https:;
  style-src 'nonce-{random}' 'self';
  img-src 'self' data: blob: https:;
  font-src 'self' data:;
  connect-src 'self' https://api.teei-platform.com wss://api.teei-platform.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
  block-all-mixed-content;
  report-uri /api/csp-report;
```

### Directive Breakdown

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'self'` | Only allow resources from same origin |
| `script-src` | `'nonce-{random}' 'strict-dynamic' https:` | Only allow scripts with nonce or dynamically loaded |
| `style-src` | `'nonce-{random}' 'self'` | Only allow styles with nonce or from same origin |
| `img-src` | `'self' data: blob: https:` | Allow images from self, data URIs, blobs, HTTPS |
| `font-src` | `'self' data:` | Allow fonts from self and data URIs |
| `connect-src` | `'self' https://api...` | Allow API connections to specified endpoints |
| `frame-src` | `'none'` | Disallow all iframes |
| `object-src` | `'none'` | Disallow plugins (Flash, Java) |
| `base-uri` | `'self'` | Prevent base tag injection |
| `form-action` | `'self'` | Forms can only submit to same origin |
| `frame-ancestors` | `'none'` | Prevent embedding in iframes (clickjacking) |
| `upgrade-insecure-requests` | - | Force HTTPS for all resources |
| `block-all-mixed-content` | - | Block HTTP resources on HTTPS pages |
| `report-uri` | `/api/csp-report` | Send violations to our endpoint |

### Why No `unsafe-inline` or `unsafe-eval`?

These directives are **explicitly forbidden** because they defeat the purpose of CSP:

- ❌ `'unsafe-inline'`: Allows any inline script/style (opens XSS vector)
- ❌ `'unsafe-eval'`: Allows `eval()` and similar functions (dangerous)

Instead, we use:
- ✅ **Nonces**: Cryptographically secure tokens for inline scripts
- ✅ **`strict-dynamic`**: Allows dynamically loaded scripts from trusted sources

---

## Using Trusted Types

### Initialization

Trusted Types must be initialized on app startup:

```typescript
import { initTrustedTypesPolicy } from './utils/trustedTypes';

// In your app initialization
initTrustedTypesPolicy();
```

### Sanitizing HTML

**❌ WRONG** (Blocked by Trusted Types):
```typescript
element.innerHTML = userInput; // TypeError: This assignment is blocked
```

**✅ CORRECT**:
```typescript
import { sanitizeHTML, safeSetInnerHTML } from './utils/trustedTypes';

// Option 1: Direct assignment with sanitization
element.innerHTML = sanitizeHTML(userInput);

// Option 2: Helper function
safeSetInnerHTML(element, userInput);
```

### Loading External Scripts

**❌ WRONG**:
```typescript
const script = document.createElement('script');
script.src = url; // TypeError: This assignment is blocked
document.body.appendChild(script);
```

**✅ CORRECT**:
```typescript
import { sanitizeScriptURL, safeSetScriptSrc } from './utils/trustedTypes';

const script = document.createElement('script');
safeSetScriptSrc(script, url); // Validates URL and sets src
document.body.appendChild(script);
```

### Creating Safe Links

**❌ WRONG**:
```typescript
anchor.href = userInput; // Vulnerable to javascript: URLs
```

**✅ CORRECT**:
```typescript
import { createSafeAnchor } from './utils/trustedTypes';

const anchor = createSafeAnchor(sanitizedUrl, 'Click here');
// Automatically blocks javascript: and data: protocols
```

### Allowed HTML Tags

The sanitizer allows these tags:
- **Text**: `p`, `br`, `span`, `div`, `strong`, `em`, `u`, `s`
- **Headings**: `h1`, `h2`, `h3`, `h4`, `h5`, `h6`
- **Lists**: `ul`, `ol`, `li`
- **Tables**: `table`, `thead`, `tbody`, `tr`, `th`, `td`
- **Code**: `blockquote`, `code`, `pre`
- **Links**: `a` (with sanitized `href`)

All other tags are **removed**.

### Forbidden Attributes

These attributes are **automatically removed**:
- `on*` (onclick, onload, etc.)
- `javascript:` in `href`
- `data:` in `href` (except for images)

---

## Subresource Integrity (SRI)

SRI ensures that third-party scripts haven't been tampered with.

### Generating SRI Hashes

```bash
# Generate hashes for common CDN scripts
node scripts/generate-sri.js

# Generate hashes for specific URLs
node scripts/generate-sri.js --urls="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"

# Update specific HTML file
node scripts/generate-sri.js --file="public/index.html"
```

### Using SRI in HTML

```html
<!-- ✅ CORRECT: With SRI -->
<script
  src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"
  integrity="sha384-abcdef123456..."
  crossorigin="anonymous"
></script>

<!-- ❌ WRONG: Without SRI (blocked by CSP) -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

### Updating Hashes

When updating third-party libraries:

1. Update the URL in your HTML
2. Run `node scripts/generate-sri.js`
3. The script automatically updates integrity attributes

---

## Troubleshooting CSP Violations

### Viewing Violations

CSP violations are logged to:
1. **Browser Console**: Check DevTools Console
2. **Reporting API**: `POST /api/csp-report`
3. **Worker-1**: Centralized logging service

### Common Violations

#### 1. Inline Script Blocked

**Error**:
```
Refused to execute inline script because it violates CSP directive 'script-src'
```

**Solution**:
```html
<!-- ❌ WRONG -->
<script>
  console.log('Hello');
</script>

<!-- ✅ CORRECT: Use nonce -->
<script nonce="{cspNonce}">
  console.log('Hello');
</script>
```

In Astro templates, access the nonce via `Astro.locals.cspNonce`:
```astro
<script nonce={Astro.locals.cspNonce}>
  console.log('Hello');
</script>
```

#### 2. Inline Style Blocked

**Error**:
```
Refused to apply inline style because it violates CSP directive 'style-src'
```

**Solution**:
```html
<!-- ❌ WRONG -->
<div style="color: red;">Text</div>

<!-- ✅ CORRECT: Use external CSS or nonce -->
<style nonce="{cspNonce}">
  .red-text { color: red; }
</style>
<div class="red-text">Text</div>
```

#### 3. Third-Party Script Blocked

**Error**:
```
Refused to load script 'https://example.com/script.js' because it violates CSP
```

**Solution**:
1. Add SRI hash:
   ```bash
   node scripts/generate-sri.js --urls="https://example.com/script.js"
   ```
2. Update HTML with integrity attribute
3. If necessary, add origin to `script-src` (requires security review)

#### 4. DOM XSS Violation

**Error**:
```
This document requires 'TrustedHTML' assignment
```

**Solution**:
```typescript
// ❌ WRONG
element.innerHTML = data;

// ✅ CORRECT
import { sanitizeHTML } from './utils/trustedTypes';
element.innerHTML = sanitizeHTML(data);
```

### Monitoring Dashboard

View violation statistics at:
```
GET /api/csp-report/stats
```

Response:
```json
{
  "total": 42,
  "bySeverity": {
    "critical": 5,
    "high": 10,
    "medium": 15,
    "low": 12
  },
  "byDirective": {
    "script-src": 20,
    "style-src": 10,
    "img-src": 8,
    "connect-src": 4
  }
}
```

---

## Best Practices

### Development

1. **Always Use Nonces**
   - Never use inline scripts without nonces
   - Request nonce from middleware: `Astro.locals.cspNonce`

2. **Sanitize User Input**
   - Never trust user input
   - Always use `sanitizeHTML()` for user-generated content

3. **Validate External Resources**
   - Use SRI for all third-party scripts
   - Regularly update SRI hashes when libraries update

4. **Test CSP Changes**
   - Use `Content-Security-Policy-Report-Only` for testing
   - Monitor violation reports before enforcing

### Production

1. **Monitor Violations**
   - Set up alerts for critical violations
   - Review violation reports weekly

2. **Keep Policies Strict**
   - Never add `unsafe-inline` or `unsafe-eval`
   - Minimize allowed origins

3. **Update Dependencies**
   - Keep third-party libraries up to date
   - Regenerate SRI hashes after updates

4. **Audit Regularly**
   - Review CSP policy quarterly
   - Remove unused directives

### Code Review Checklist

- [ ] No `innerHTML` without `sanitizeHTML()`
- [ ] No inline scripts without nonces
- [ ] Third-party scripts have SRI hashes
- [ ] No `eval()` or `Function()` usage
- [ ] Forms submit to same origin only
- [ ] Event handlers are attached via code, not inline

---

## Additional Resources

### Specifications

- [CSP Level 3](https://www.w3.org/TR/CSP3/)
- [Trusted Types](https://w3c.github.io/webappsec-trusted-types/dist/spec/)
- [SRI Specification](https://www.w3.org/TR/SRI/)

### Tools

- [CSP Evaluator](https://csp-evaluator.withgoogle.com/) - Validate CSP policies
- [Report URI](https://report-uri.com/) - CSP reporting service
- [Mozilla Observatory](https://observatory.mozilla.org/) - Security scanner

### Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| CSP Level 3 | ✅ 59+ | ✅ 58+ | ✅ 15+ | ✅ 79+ |
| Trusted Types | ✅ 83+ | ❌ | ❌ | ✅ 83+ |
| SRI | ✅ 45+ | ✅ 43+ | ✅ 11.1+ | ✅ 17+ |

**Note**: Trusted Types gracefully degrades in unsupported browsers.

---

## Support

For questions or issues:

1. Check CSP violation logs: `/api/csp-report/stats`
2. Review this guide
3. Contact the security team: security@teei-platform.com

---

**Document Version**: 1.0
**Last Updated**: 2025-11-14
**Owner**: QA Compliance Lead
