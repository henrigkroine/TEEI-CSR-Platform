# Trust Center Documentation

## Overview

The TEEI Trust Center is a public transparency portal that provides stakeholders with real-time access to system status, security artifacts, privacy documentation, and AI model governance. It serves as the central hub for building trust through transparency, demonstrating our commitment to data protection, security, and ethical AI practices.

## Purpose

The Trust Center provides:
- **Real-time System Status**: Live SLO metrics, uptime tracking, and incident history
- **Security Transparency**: SBOM (Software Bill of Materials), SLSA provenance, security audits
- **Privacy Documentation**: DPA (Data Processing Agreement), ROPA (Record of Processing Activities), DPIA (Data Protection Impact Assessment)
- **AI Model Transparency**: Model cards, oversight procedures, evidence gates, and citation validation
- **Sub-processor Registry**: Complete list of third-party processors with compliance details
- **Incident History**: Public incident log with resolution timelines and impact assessments

## Architecture

### Application Structure

```
apps/trust-center/
├── src/
│   ├── pages/
│   │   ├── index.astro              # Trust Center home
│   │   ├── status.astro             # System status dashboard
│   │   ├── security.astro           # Security artifacts
│   │   ├── privacy.astro            # Privacy documentation
│   │   ├── ai-transparency.astro    # AI model governance
│   │   ├── sub-processors.astro     # Sub-processor registry
│   │   └── incidents.astro          # Incident history
│   ├── layouts/
│   │   └── TrustLayout.astro        # Shared layout
│   └── styles/
│       └── global.css               # Global styles
├── public/
│   └── index.html                   # Static fallback
├── tests/
│   └── e2e/
│       ├── trust-center.spec.ts     # E2E tests
│       └── evidence-api.spec.ts     # API integration tests
├── astro.config.mjs                 # Astro configuration
├── tailwind.config.mjs              # Tailwind CSS config
└── package.json
```

### API Routes

The Trust Center integrates with backend APIs for dynamic data:

**API Gateway Routes**:
- `GET /v1/trust/status` - System status and SLOs
- `GET /v1/trust/evidence/:reportId` - Evidence lineage for reports
- `GET /v1/trust/ledger/:reportId` - Evidence ledger with tamper detection
- `GET /v1/trust/policies` - Data retention and residency policies (public)

**Service Routes**:
- Reporting Service: `/trust/v1/*` - Evidence and ledger endpoints
- API Gateway: `/v1/trust/*` - Public-facing proxy with rate limiting

## Setup

### Prerequisites

- Node.js 18+ (recommended: 20 LTS)
- pnpm 8+
- PostgreSQL 14+ (for local development)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/TEEI-CSR-Platform.git
cd TEEI-CSR-Platform

# Install dependencies
pnpm install

# Navigate to Trust Center app
cd apps/trust-center

# Install app-specific dependencies
pnpm install
```

### Environment Variables

Create `.env` file in `apps/trust-center/`:

```bash
# API Endpoints
PUBLIC_API_GATEWAY_URL=https://api.teei.io/v1
PUBLIC_TRUST_API_URL=https://api.teei.io/v1/trust

# Feature Flags
PUBLIC_FEATURE_TRUST_CENTER=true
PUBLIC_FEATURE_EVIDENCE_GATES=true

# Analytics (optional)
PUBLIC_ANALYTICS_ID=G-XXXXXXXXXX

# Environment
PUBLIC_ENV=development
```

### Development

```bash
# Start development server
pnpm dev

# Open browser
open http://localhost:4321
```

The development server includes:
- Hot module replacement (HMR)
- TypeScript type checking
- Astro component dev mode
- Tailwind CSS JIT compilation

### Build

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

Build output:
- Static HTML pages in `dist/`
- Server-side API routes in `dist/server/`
- Optimized assets (CSS, JS, images)

## Deployment

### Static Export with Server Functions

The Trust Center uses Astro's hybrid rendering:
- Static pages for content
- Server-side API routes for dynamic data
- Edge-compatible server functions

### Deployment Targets

**Vercel** (Recommended):
```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel --prod
```

**Netlify**:
```bash
# Install Netlify CLI
pnpm add -g netlify-cli

# Build and deploy
netlify deploy --prod --dir=dist
```

**Node.js Server**:
```bash
# Build
pnpm build

# Start server
node dist/server/entry.mjs
```

**Docker**:
```bash
# Build image
docker build -t teei-trust-center .

# Run container
docker run -p 3000:3000 teei-trust-center
```

### CDN Configuration

For optimal performance, configure CDN caching:

```nginx
# Cache static assets (1 year)
location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Cache HTML pages (1 hour)
location ~* \.html$ {
    expires 1h;
    add_header Cache-Control "public, must-revalidate";
}

# No cache for API routes
location /api/ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

## Pages Overview

### 1. Status Dashboard (`/status`)

**Features**:
- Real-time SLO metrics (uptime, latency, error rate)
- Service health indicators
- Historical uptime data (7-day, 30-day, 90-day)
- Incident alerts and notifications

**Data Source**: `/v1/trust/status` API

### 2. Security Artifacts (`/security`)

**Features**:
- SBOM (Software Bill of Materials) download
- SLSA provenance verification
- Security audit reports
- Vulnerability disclosure policy
- Penetration test summaries
- Compliance certifications (SOC 2, ISO 27001)

**Data Source**: Static files + `/v1/trust/security` API

### 3. Privacy Documentation (`/privacy`)

**Features**:
- Data Processing Agreement (DPA) download
- Record of Processing Activities (ROPA)
- Data Protection Impact Assessment (DPIA)
- Privacy policy
- Cookie policy
- Data retention schedules

**Data Source**: `/v1/trust/policies` API + static documents

### 4. AI Transparency (`/ai-transparency`)

**Features**:
- Model cards for Q2Q AI, NLQ Insights, and Copilot
- Evidence gates enforcement details
- Citation validation methodology
- Model training data sources
- Bias mitigation strategies
- Human oversight procedures
- Model performance metrics

**Data Source**: Static content + `/v1/trust/ai-transparency` API

### 5. Sub-processor Registry (`/sub-processors`)

**Features**:
- Complete list of sub-processors
- Data processing purposes
- Data categories processed
- Geographic locations
- Compliance attestations
- Alternative options (where applicable)

**Data Source**: `/v1/trust/sub-processors` API

### 6. Incident History (`/incidents`)

**Features**:
- Public incident log
- Incident timelines with resolution details
- Impact assessments (affected users, services)
- Post-mortem reports (for major incidents)
- Remediation actions taken
- Prevention measures implemented

**Data Source**: `/v1/trust/incidents` API

## WCAG 2.2 AA Compliance

The Trust Center meets WCAG 2.2 AA accessibility standards:

### Testing Tools

- **Axe DevTools**: Automated accessibility scanning
- **Lighthouse CI**: Performance and accessibility audits (score ≥95)
- **Pa11y-CI**: CI/CD accessibility testing
- **Manual Testing**: Keyboard navigation and screen reader testing

### Accessibility Features

1. **Semantic HTML**: Proper heading hierarchy (h1-h6)
2. **ARIA Labels**: Descriptive labels for interactive elements
3. **Keyboard Navigation**: Full keyboard support (Tab, Enter, Escape)
4. **Color Contrast**: WCAG AAA contrast ratios (7:1 for body text)
5. **Focus Indicators**: Visible focus states for all interactive elements
6. **Screen Reader Support**: Tested with NVDA, JAWS, VoiceOver
7. **Skip Links**: Skip to main content navigation
8. **Alt Text**: Descriptive alt text for all images
9. **Responsive Design**: Mobile-first, accessible on all devices

### CI/CD Accessibility Gates

```yaml
# .github/workflows/ci.yml
- name: Run Pa11y-CI
  run: pnpm pa11y-ci --config .pa11yci.json

- name: Lighthouse CI
  run: pnpm lhci autorun
  # Fails if accessibility score < 95
```

## Performance Targets

| Metric | Target | Measured By |
|--------|--------|-------------|
| First Contentful Paint (FCP) | < 1.0s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | Core Web Vitals |
| Time to Interactive (TTI) | < 3.0s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Core Web Vitals |
| Total Blocking Time (TBT) | < 200ms | Lighthouse |

## Security Considerations

### Content Security Policy (CSP)

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'nonce-{random}';
  img-src 'self' data: https:;
  connect-src 'self' https://api.teei.io;
  font-src 'self';
  frame-ancestors 'none';
```

### HTTPS Only

All Trust Center pages enforce HTTPS:
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### No Sensitive Data

The Trust Center is a public portal and must never expose:
- User credentials
- API keys or secrets
- Personal identifiable information (PII)
- Internal IP addresses or infrastructure details

## API Documentation

See comprehensive API documentation at:
- [Trust API Endpoints](../api/trust-endpoints.md)
- [Trust API Examples](../trust-api-examples.md)

## Testing

### Unit Tests

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage
```

### E2E Tests

```bash
# Run E2E tests (Playwright)
pnpm e2e:run

# Run in UI mode
pnpm e2e:ui
```

### Accessibility Tests

```bash
# Run Pa11y-CI
pnpm pa11y-ci

# Run Lighthouse CI
pnpm lhci autorun
```

## Monitoring & Observability

### Metrics to Track

1. **Page Load Performance**:
   - Core Web Vitals (LCP, FID, CLS)
   - Time to First Byte (TTFB)
   - Page load time by route

2. **API Performance**:
   - Response time (p50, p95, p99)
   - Error rate by endpoint
   - Rate limit hits

3. **Accessibility**:
   - Lighthouse accessibility score
   - Pa11y violation count
   - WCAG compliance score

4. **User Engagement**:
   - Page views by route
   - Time on page
   - Bounce rate

### Logging

All Trust Center requests are logged with:
- Request ID (`x-request-id` header)
- Timestamp
- HTTP method and path
- Response status code
- Response time
- User agent (no PII)

## Troubleshooting

### Build Failures

**Problem**: `pnpm build` fails with TypeScript errors

**Solution**:
```bash
# Clear cache
rm -rf .astro node_modules/.cache

# Reinstall dependencies
pnpm install

# Rebuild
pnpm build
```

### API Connection Issues

**Problem**: Trust Center cannot connect to API Gateway

**Solution**:
1. Verify `PUBLIC_API_GATEWAY_URL` in `.env`
2. Check network connectivity: `curl https://api.teei.io/v1/trust/status`
3. Review CORS configuration in API Gateway
4. Check API Gateway logs for errors

### Accessibility Failures

**Problem**: Pa11y-CI reports violations

**Solution**:
1. Run Pa11y locally: `pnpm pa11y-ci`
2. Review violations in `pa11y-report.html`
3. Fix HTML semantic issues
4. Add missing ARIA labels
5. Re-run tests to verify

## Related Documentation

- [Evidence Gates Implementation](./evidence-gates.md)
- [Evidence Ledger](./evidence-ledger.md)
- [Deployment Guide](./deployment.md)
- [Trust API Endpoints](../api/trust-endpoints.md)
- [Executive Packs](../cockpit/executive_packs.md)
- [Boardroom Live Guide](../cockpit/BOARDROOM_LIVE_GUIDE.md)

## Support

For assistance with the Trust Center:
- **Documentation**: `/docs/trust-center/`
- **API Docs**: `/docs/api/trust-endpoints.md`
- **GitHub Issues**: https://github.com/your-org/TEEI-CSR-Platform/issues
- **Support Email**: support@teei.io

---

**Last Updated**: November 2025
**Version**: 1.0.0
**Maintained By**: Agent 5.1 - Technical Writer
