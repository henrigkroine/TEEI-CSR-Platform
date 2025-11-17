# TEEI Trust Center

Public-facing trust center for the TEEI CSR Platform, providing transparency around security, privacy, compliance, and AI practices.

## Overview

The Trust Center is built with **Astro 5** and serves as a central hub for:

- **System Status**: Real-time uptime and performance monitoring
- **Security**: Certifications, compliance standards, and security practices
- **Privacy**: GDPR compliance, data handling, and privacy principles
- **AI Transparency**: AI model usage, ethical practices, and data policies
- **Sub-processors**: Third-party services and data processors
- **Incident History**: Transparency log of security incidents and resolutions

## Tech Stack

- **Framework**: Astro 5 (SSR with Node.js adapter)
- **UI**: React 18 (islands architecture)
- **Styling**: TailwindCSS 3.4
- **TypeScript**: 5.3+
- **i18n**: Multi-locale support (en, es, fr, uk, no)

## Development

```bash
# Install dependencies (from monorepo root)
pnpm install

# Run dev server (port 4322)
pnpm --filter @teei/trust-center dev

# Build for production
pnpm --filter @teei/trust-center build

# Preview production build
pnpm --filter @teei/trust-center preview

# Type checking
pnpm --filter @teei/trust-center typecheck

# Linting
pnpm --filter @teei/trust-center lint
pnpm --filter @teei/trust-center lint:fix
```

## File Structure

```
apps/trust-center/
├── src/
│   ├── components/
│   │   └── trust/           # React components for trust center features
│   ├── layouts/
│   │   └── TrustLayout.astro # Main layout with nav and footer
│   ├── pages/
│   │   ├── index.astro      # Landing page
│   │   ├── status.astro     # System status page
│   │   ├── security.astro   # Security practices page
│   │   ├── privacy.astro    # Privacy policy page
│   │   ├── ai-transparency.astro
│   │   ├── sub-processors.astro
│   │   └── incidents.astro  # Incident history page
│   └── styles/
│       └── global.css       # Global styles and CSS variables
├── public/                  # Static assets
├── astro.config.mjs         # Astro configuration
├── tailwind.config.mjs      # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
└── package.json
```

## Pages

### Home (`/`)
Landing page with overview and links to all trust center sections.

### Status (`/status`)
Real-time service status, uptime metrics, and system health indicators.

### Security (`/security`)
- Certifications (SOC 2, ISO 27001, GDPR)
- Security practices (encryption, access control, infrastructure)
- Vulnerability reporting contact

### Privacy (`/privacy`)
- Privacy principles (data minimization, purpose limitation, transparency)
- GDPR compliance and user data rights
- Data processing and retention policies
- Cookie and tracking information

### AI Transparency (`/ai-transparency`)
- AI use cases (Q2Q pipeline, Gen-AI reporting, safety moderation)
- Ethical AI principles (human oversight, transparency, bias mitigation)
- Model training policies and data usage
- AI audits and governance

### Sub-processors (`/sub-processors`)
Complete list of third-party services with:
- Infrastructure providers (AWS, Cloudflare)
- AI/ML services (OpenAI, Anthropic)
- Analytics and monitoring tools
- Communication services
- Data processing agreements (DPAs)

### Incidents (`/incidents`)
- Incident classification system (P0-P3)
- Response timeline and communication channels
- Historical log of service disruptions
- Security incident reporting contact

## Accessibility

All pages follow **WCAG 2.2 Level AA** standards:

- Semantic HTML structure
- Skip links for keyboard navigation
- Focus indicators with sufficient contrast
- ARIA labels and landmarks
- Touch targets ≥44x44px (WCAG 2.5.8)
- Screen reader friendly content

## Security Features

- **CSP (Content Security Policy)**: Nonce-based script execution
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Trusted Types**: Protection against DOM-based XSS
- **TLS 1.3**: All connections encrypted in transit

## Internationalization (i18n)

Configured for multi-locale support:
- English (en) - default
- Spanish (es)
- French (fr)
- Norwegian (no)
- Ukrainian (uk)

Localization files will be added to `src/i18n/` in future iterations.

## Next Steps for Implementation

1. **Status Integration**: Connect to real-time monitoring APIs
2. **Dynamic Content**: Fetch live uptime data and incident logs
3. **Subscription**: Email alerts for status updates
4. **Certificate Display**: Auto-update compliance certifications
5. **Sub-processor Updates**: Automated change notifications
6. **API Documentation**: Link to public API docs
7. **Contact Forms**: Add structured forms for privacy/security inquiries

## Deployment

The Trust Center will be deployed as a standalone service:

- **Domain**: `trust.teei-platform.com`
- **CDN**: Cloudflare (caching + DDoS protection)
- **Hosting**: AWS (same regions as main platform)
- **CI/CD**: GitHub Actions with automated deployment

## Compliance Notes

- All content reviewed by Legal and Security teams
- Privacy policy last updated: [DATE]
- Sub-processor list maintained by Compliance team
- Incident log updated within 24 hours of resolution

## License

PROPRIETARY - TEEI Platform
