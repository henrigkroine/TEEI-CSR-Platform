# Security Best Practices & Implementation Guide

**Version**: 1.0 (Phase D)
**Date**: 2025-11-14
**Owner**: Agent Security Engineer (Phase D)
**Status**: ✅ IMPLEMENTED

---

## Overview

This document covers the security architecture and best practices for the TEEI CSR Platform, with a focus on Phase D implementations: CSP (Content Security Policy), Trusted Types, SRI (Subresource Integrity), SSO/SCIM, and general hardening.

---

## Content Security Policy (CSP)

### Overview

CSP mitigates XSS (Cross-Site Scripting) attacks by controlling which resources (scripts, styles, images) the browser is allowed to load.

### CSP Configuration

**Astro Middleware**: `apps/corp-cockpit-astro/src/middleware/security.ts`

```typescript
export function onRequest(context, next) {
  const response = next();

  response.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",  // For WebAssembly (if needed)
    "style-src 'self' 'unsafe-inline'",       // Inline styles for critical CSS
    "img-src 'self' data: https://*.s3.amazonaws.com",  // Allow S3 images
    "font-src 'self'",
    "connect-src 'self' wss://platform.example.com", // SSE/WebSocket
    "frame-ancestors 'none'",                 // Prevent clickjacking
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"               // Force HTTPS
  ].join('; '));

  return response;
}
```

### CSP Directives Explained

| Directive | Value | Purpose |
|-----------|-------|---------|
| **default-src** | 'self' | Only load resources from same origin |
| **script-src** | 'self' 'wasm-unsafe-eval' | Allow own scripts + WASM |
| **style-src** | 'self' 'unsafe-inline' | Allow own styles + inline styles |
| **img-src** | 'self' data: https://*.s3.amazonaws.com | Allow images from self, data URIs, S3 |
| **connect-src** | 'self' wss:// | Allow API calls and SSE to same origin + WebSocket |
| **frame-ancestors** | 'none' | Prevent embedding in iframes (clickjacking) |
| **base-uri** | 'self' | Prevent base tag hijacking |
| **form-action** | 'self' | Forms can only submit to same origin |
| **upgrade-insecure-requests** | - | Automatically upgrade HTTP to HTTPS |

### CSP Violation Reporting

**Report-To Endpoint**: `/api/csp-report`

Add to CSP header:
```
Content-Security-Policy: ...; report-uri /api/csp-report; report-to csp-endpoint
Report-To: {"group":"csp-endpoint","max_age":10886400,"endpoints":[{"url":"/api/csp-report"}]}
```

**Handler**: `services/api/src/routes/cspReport.ts`

```typescript
app.post('/api/csp-report', async (req, res) => {
  const report = req.body;

  // Log to monitoring (Datadog, Sentry, etc.)
  logger.warn('CSP Violation', {
    documentUri: report['document-uri'],
    violatedDirective: report['violated-directive'],
    blockedUri: report['blocked-uri'],
    sourceFile: report['source-file'],
    lineNumber: report['line-number']
  });

  // Store in database for analysis
  await db.insert('csp_violations', {
    document_uri: report['document-uri'],
    violated_directive: report['violated-directive'],
    blocked_uri: report['blocked-uri'],
    timestamp: new Date()
  });

  res.status(204).send();
});
```

### CSP Testing

**Tools**:
- **CSP Evaluator**: https://csp-evaluator.withgoogle.com/
- **Report URI**: https://report-uri.com/home/generate
- **Browser DevTools**: Console shows CSP violations

**Manual Test**:
1. Open dashboard in browser
2. Open DevTools Console
3. Try injecting script: `<script>alert('XSS')</script>`
4. Verify CSP blocks it with error: "Refused to execute inline script"

---

## Trusted Types

### Overview

Trusted Types prevent DOM XSS by requiring all DOM sinks (innerHTML, eval, etc.) to use sanitized values.

### Trusted Types Policy

**Astro Component**: `apps/corp-cockpit-astro/src/lib/trustedTypes.ts`

```typescript
// Create a Trusted Types policy
let trustedTypesPolicy: TrustedTypePolicy | null = null;

if (typeof window !== 'undefined' && window.trustedTypes) {
  trustedTypesPolicy = window.trustedTypes.createPolicy('default', {
    createHTML: (input: string) => {
      // Sanitize HTML using DOMPurify
      return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
        ALLOWED_ATTR: ['href', 'target', 'rel']
      });
    },
    createScript: (input: string) => {
      // Block all dynamic scripts (strict policy)
      throw new Error('Dynamic script creation is not allowed');
    },
    createScriptURL: (input: string) => {
      // Only allow scripts from same origin
      const url = new URL(input, document.baseURI);
      if (url.origin === location.origin) {
        return input;
      }
      throw new Error('Script URL must be from same origin');
    }
  });
}

// Export safe setter functions
export function setInnerHTML(element: HTMLElement, html: string) {
  if (trustedTypesPolicy) {
    element.innerHTML = trustedTypesPolicy.createHTML(html) as unknown as string;
  } else {
    // Fallback to DOMPurify without Trusted Types
    element.innerHTML = DOMPurify.sanitize(html);
  }
}

export function createScriptElement(src: string): HTMLScriptElement {
  const script = document.createElement('script');
  if (trustedTypesPolicy) {
    script.src = trustedTypesPolicy.createScriptURL(src) as unknown as string;
  } else {
    // Validate URL manually
    const url = new URL(src, document.baseURI);
    if (url.origin !== location.origin) {
      throw new Error('Script URL must be from same origin');
    }
    script.src = src;
  }
  return script;
}
```

### Enforcing Trusted Types

**CSP Header Addition**:
```
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types default
```

**Effect**:
- Any `innerHTML = ...` without Trusted Types will throw error
- Any `eval()` or `new Function()` will throw error
- Forces developers to use `setInnerHTML()` wrapper

### Trusted Types Testing

**Unit Test**: `apps/corp-cockpit-astro/tests/unit/trustedTypes.test.ts`

```typescript
describe('Trusted Types', () => {
  it('should sanitize HTML input', () => {
    const element = document.createElement('div');
    const maliciousHTML = '<img src=x onerror=alert(1)>';

    setInnerHTML(element, maliciousHTML);

    // XSS payload should be stripped
    expect(element.innerHTML).not.toContain('onerror');
    expect(element.innerHTML).toBe('<img src="x">');
  });

  it('should block external script URLs', () => {
    expect(() => {
      createScriptElement('https://evil.com/malicious.js');
    }).toThrow('Script URL must be from same origin');
  });
});
```

---

## Subresource Integrity (SRI)

### Overview

SRI ensures that CDN-loaded resources (e.g., analytics libraries) haven't been tampered with.

### SRI Implementation

**Astro Layout**: `apps/corp-cockpit-astro/src/layouts/Base.astro`

```astro
---
// Generate SRI hashes for critical scripts
const criticalScripts = [
  {
    src: 'https://cdn.example.com/analytics.js',
    integrity: 'sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/ux...', // Full hash
    crossorigin: 'anonymous'
  }
];
---

<html>
  <head>
    {criticalScripts.map(script => (
      <script
        src={script.src}
        integrity={script.integrity}
        crossorigin={script.crossorigin}
      ></script>
    ))}
  </head>
</html>
```

### Generating SRI Hashes

**Command Line**:
```bash
# Download script
curl https://cdn.example.com/analytics.js > analytics.js

# Generate SHA-384 hash
openssl dgst -sha384 -binary analytics.js | openssl base64 -A

# Output: oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/ux...
```

**Automated Script**: `scripts/generate-sri.sh`

```bash
#!/bin/bash
# Generate SRI hashes for all CDN resources

CDN_RESOURCES=(
  "https://cdn.example.com/analytics.js"
  "https://cdn.example.com/charts.js"
)

for url in "${CDN_RESOURCES[@]}"; do
  echo "Generating SRI for $url"
  integrity=$(curl -sS "$url" | openssl dgst -sha384 -binary | openssl base64 -A)
  echo "  integrity=\"sha384-$integrity\""
done
```

### SRI Best Practices

1. **Use SHA-384 or SHA-512** (SHA-256 is minimum, but weaker)
2. **Always include `crossorigin="anonymous"`** (required for CORS)
3. **Store hashes in version control** (not generated at build time)
4. **Update hashes when CDN resources update**
5. **Monitor SRI failures** (CSP reports will flag mismatches)

---

## SSO (Single Sign-On) Security

### SAML 2.0

**Security Considerations**:

1. **Certificate Validation**:
   ```typescript
   // Validate IdP certificate
   const cert = await validateCertificate(idpCertificate);
   if (cert.expired || cert.revoked) {
     throw new Error('IdP certificate is invalid');
   }
   ```

2. **Signature Verification**:
   ```typescript
   // Verify SAML assertion signature
   const verified = await verifySAMLSignature(assertion, idpPublicKey);
   if (!verified) {
     throw new Error('SAML assertion signature verification failed');
   }
   ```

3. **Replay Attack Prevention**:
   ```typescript
   // Store assertion IDs in Redis (with TTL)
   const assertionId = assertion.ID;
   const exists = await redis.get(`saml:assertion:${assertionId}`);
   if (exists) {
     throw new Error('SAML assertion replay detected');
   }
   await redis.setex(`saml:assertion:${assertionId}`, 300, '1'); // 5 min TTL
   ```

4. **Timestamp Validation**:
   ```typescript
   // Verify NotBefore and NotOnOrAfter
   const now = new Date();
   if (now < assertion.NotBefore || now > assertion.NotOnOrAfter) {
     throw new Error('SAML assertion expired');
   }
   ```

### OpenID Connect (OIDC)

**Security Considerations**:

1. **State Parameter** (CSRF Protection):
   ```typescript
   // Generate random state
   const state = crypto.randomBytes(32).toString('hex');
   await redis.setex(`oidc:state:${state}`, 300, userId); // 5 min TTL

   // Verify state in callback
   const storedUserId = await redis.get(`oidc:state:${state}`);
   if (!storedUserId) {
     throw new Error('Invalid state parameter');
   }
   ```

2. **Nonce** (Replay Protection):
   ```typescript
   // Include nonce in ID token
   const nonce = crypto.randomBytes(32).toString('hex');
   const authUrl = `${issuer}/authorize?...&nonce=${nonce}`;

   // Verify nonce in callback
   const idToken = jwt.decode(token);
   if (idToken.nonce !== nonce) {
     throw new Error('Nonce mismatch');
   }
   ```

3. **PKCE** (Public Client Protection):
   ```typescript
   // Generate code verifier and challenge
   const codeVerifier = crypto.randomBytes(32).toString('base64url');
   const codeChallenge = crypto.createHash('sha256')
     .update(codeVerifier)
     .digest('base64url');

   // Send challenge in auth request
   const authUrl = `${issuer}/authorize?...&code_challenge=${codeChallenge}&code_challenge_method=S256`;

   // Send verifier in token request
   const tokenRequest = { code, code_verifier: codeVerifier };
   ```

---

## SCIM Security

### Authentication

**Bearer Token**:
- Generate cryptographically random tokens (32 bytes)
- Hash tokens before storing (bcrypt or Argon2)
- Use rate limiting (10 requests/min per token)
- Rotate tokens quarterly or after breach

**Example**:
```typescript
// Generate token
const token = crypto.randomBytes(32).toString('hex');
const hash = await bcrypt.hash(token, 12);

// Store hash in database
await db.insert('scim_tokens', { token_hash: hash, partner_id });

// Return token to partner (only once)
return { token }; // Partner must store securely
```

### Authorization

**Role-Based Access Control**:
- **SUPER_ADMIN**: Full SCIM access (create, read, update, delete)
- **PARTNER_ADMIN**: Read-only SCIM access
- **Regular users**: No SCIM access

**Endpoint Protection**:
```typescript
app.use('/scim/v2/*', async (req, res, next) => {
  // Verify bearer token
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization' });
  }

  // Hash and compare
  const scimToken = await db.findOne('scim_tokens', {
    where: { token_hash: await bcrypt.hash(token, 12) }
  });

  if (!scimToken) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Check role
  const user = await db.findOne('users', { where: { id: scimToken.user_id } });
  if (user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  next();
});
```

### Rate Limiting

**Implementation**: `services/api/src/middleware/rateLimiter.ts`

```typescript
import rateLimit from 'express-rate-limit';

export const scimRateLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 10,                    // 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

app.use('/scim/v2/*', scimRateLimiter);
```

---

## Additional Security Measures

### 1. HTTPS Enforcement

**Astro Middleware**: Force HTTPS redirect

```typescript
export function onRequest(context, next) {
  if (context.url.protocol !== 'https:' && import.meta.env.PROD) {
    return Response.redirect(`https://${context.url.host}${context.url.pathname}`, 301);
  }
  return next();
}
```

### 2. Secure Headers

**Middleware**: `apps/corp-cockpit-astro/src/middleware/security.ts`

```typescript
export function onRequest(context, next) {
  const response = next();

  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  return response;
}
```

### 3. Password Requirements

**Validation**: `services/api/src/utils/passwordValidator.ts`

```typescript
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check against common passwords (use have-i-been-pwned API)
  // const breached = await checkBreachedPassword(password);
  // if (breached) {
  //   errors.push('Password has been found in data breaches');
  // }

  return { valid: errors.length === 0, errors };
}
```

### 4. Session Management

**Configuration**:
```typescript
app.use(session({
  secret: process.env.SESSION_SECRET, // 256-bit random key
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,              // HTTPS only
    httpOnly: true,            // No JavaScript access
    sameSite: 'strict',        // CSRF protection
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  },
  store: new RedisStore({
    client: redisClient,
    ttl: 86400               // 24 hours
  })
}));
```

### 5. Input Validation

**Validation Library**: Use Zod for schema validation

```typescript
import { z } from 'zod';

const reportSchema = z.object({
  title: z.string().min(1).max(200),
  period: z.string().regex(/^\d{4}-Q[1-4]$/),
  type: z.enum(['quarterly', 'annual']),
  description: z.string().max(2000).optional()
});

app.post('/reports', async (req, res) => {
  try {
    const validated = reportSchema.parse(req.body);
    // Process validated data
  } catch (error) {
    res.status(400).json({ error: error.errors });
  }
});
```

---

## Security Testing

### 1. Static Analysis

**Tools**:
- **Snyk**: Dependency vulnerability scanning
- **ESLint**: JavaScript/TypeScript linting
- **Semgrep**: Security-focused static analysis

**CI Integration**:
```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]
jobs:
  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### 2. Dynamic Analysis

**Tools**:
- **OWASP ZAP**: Web application security scanner
- **Burp Suite**: Manual penetration testing
- **Nuclei**: Vulnerability scanner with templates

**Example Scan**:
```bash
# Run OWASP ZAP baseline scan
docker run -v $(pwd):/zap/wrk/:rw -t owasp/zap2docker-stable zap-baseline.py \
  -t https://platform.example.com \
  -r zap-report.html
```

### 3. Dependency Audits

**npm audit**:
```bash
npm audit --audit-level=moderate
```

**Automated PRs**: Enable Dependabot or Renovate to auto-update dependencies

---

## Incident Response

### Security Breach Playbook

1. **Detection**: Security alert triggered (CSP violation, unusual login, etc.)
2. **Containment**:
   - Rotate compromised credentials immediately
   - Block attacker IP addresses (WAF)
   - Disable affected user accounts
3. **Investigation**:
   - Review audit logs
   - Identify scope of breach (data, users, duration)
   - Preserve evidence for forensics
4. **Notification**:
   - Notify affected users within 72 hours (GDPR requirement)
   - Report to regulators if PII exposed
   - Publish incident report (transparency)
5. **Remediation**:
   - Patch vulnerabilities
   - Review and update security policies
   - Conduct post-mortem

---

## References

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- CSP Reference: https://content-security-policy.com/
- Trusted Types: https://web.dev/trusted-types/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- CIS Benchmarks: https://www.cisecurity.org/cis-benchmarks/

---

**Document Status**: ✅ IMPLEMENTED (Phase D)
**Last Updated**: 2025-11-14
**Owner**: Agent Security Engineer

## Implementation Summary

All security features documented above have been implemented in Phase D:
- CSP enforcement (`apps/corp-cockpit-astro/src/middleware/security.ts`)
- Trusted Types integration (`apps/corp-cockpit-astro/src/lib/trustedTypes.ts`)
- SRI for CDN resources (`apps/corp-cockpit-astro/src/layouts/Base.astro`)
- SSO/SCIM security hardening (`services/auth/src/sso.ts`, `services/auth/src/scim.ts`)
- Comprehensive security testing suite
- See `reports/w3_phaseD_csp_trusted_types.md` and `reports/w3_phaseD_sso_scim_ux.md` for full implementation details
