# White-Label Branding & Theming

**Worker 17** | **Status**: ✅ Phase 1 Complete

## Overview

The TEEI CSR Platform supports comprehensive white-label branding, allowing each tenant to customize:

- **Visual Identity**: Colors, typography, spacing, shadows, border radii
- **Brand Assets**: Logos, favicons, watermarks for exports
- **Custom Domains**: Subdomain mapping for white-label routing
- **Dark Mode**: Automatic dark mode support with custom overrides
- **WCAG Compliance**: Automatic contrast validation (AA/AAA)
- **Branded Exports**: Theme tokens applied to PPTX/PDF exports

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Tenant Domain                        │
│               (acme.teei-csr.com)                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               API Gateway Middleware                    │
│          (Tenant Resolution by Domain)                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Branding Service Layer                     │
│   ┌──────────────┬──────────────┬──────────────┐       │
│   │   Themes     │    Assets    │   Domains    │       │
│   │   CRUD       │    Upload    │   Verify     │       │
│   └──────────────┴──────────────┴──────────────┘       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  PostgreSQL                             │
│  ┌─────────────┬──────────────┬───────────────────┐    │
│  │branding_    │branding_     │branding_domains   │    │
│  │themes       │assets        │                   │    │
│  └─────────────┴──────────────┴───────────────────┘    │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                Frontend Applications                     │
│  ┌──────────────────────┬──────────────────────┐        │
│  │  Cockpit (Astro)     │  Trust Center        │        │
│  │  - Theme Engine      │  - Theme Injection   │        │
│  │  - Admin UI          │  - Static Export     │        │
│  └──────────────────────┴──────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

## Database Schema

### branding_themes
Stores per-tenant branding configurations with theme tokens.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to companies |
| name | VARCHAR(255) | Theme name |
| is_active | BOOLEAN | Only one active theme per tenant |
| tokens_json | JSONB | Complete theme token set |
| created_by | UUID | User who created |
| updated_by | UUID | User who last updated |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### branding_assets
Stores brand assets (logos, favicons, watermarks).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| theme_id | UUID | Foreign key to branding_themes |
| kind | ENUM | logo, favicon, watermark, hero_image |
| url | TEXT | CDN URL or S3 path |
| hash | VARCHAR(64) | SHA-256 hash for integrity |
| mime_type | VARCHAR(100) | MIME type |
| size | VARCHAR(50) | Human-readable size |
| width | VARCHAR(50) | Image width in px |
| height | VARCHAR(50) | Image height in px |
| metadata | JSONB | Additional metadata |
| uploaded_by | UUID | User who uploaded |
| created_at | TIMESTAMPTZ | Upload timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### branding_domains (optional)
Maps custom subdomains to tenants for white-label routing.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to companies |
| domain | VARCHAR(255) | Domain (e.g., acme.teei-csr.com) |
| is_verified | BOOLEAN | Verification status |
| verification_token | VARCHAR(255) | Token for DNS verification |
| verified_at | TIMESTAMPTZ | Verification timestamp |
| created_by | UUID | User who added domain |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### branding_audit_log
Tracks all changes to themes, assets, and domains.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to companies |
| resource_type | VARCHAR(50) | theme, asset, domain |
| resource_id | UUID | ID of affected resource |
| action | VARCHAR(50) | created, updated, deleted, etc. |
| changes | JSONB | Diff of changes |
| performed_by | UUID | User who performed action |
| ip_address | VARCHAR(45) | IPv4 or IPv6 |
| user_agent | TEXT | User agent string |
| performed_at | TIMESTAMPTZ | Action timestamp |

## Theme Token Structure

### Color Tokens
All colors must pass WCAG AA contrast requirements (4.5:1 for normal text).

```typescript
{
  colors: {
    // Brand colors
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    primaryActive: '#1e40af',
    primaryForeground: '#ffffff', // Text on primary (WCAG AA)

    secondary: '#1e40af',
    secondaryHover: '#1e3a8a',
    secondaryActive: '#1e3a8a',
    secondaryForeground: '#ffffff',

    accent: '#047857',
    accentHover: '#065f46',
    accentActive: '#064e3b',
    accentForeground: '#ffffff',

    // Neutral colors
    background: '#ffffff',
    foreground: '#111827',
    muted: '#f5f5f5',
    mutedForeground: '#6b7280',

    border: '#d1d5db',
    borderHover: '#9ca3af',

    // Semantic colors
    success: '#047857',
    successForeground: '#ffffff',
    warning: '#b45309',
    warningForeground: '#ffffff',
    error: '#dc2626',
    errorForeground: '#ffffff',
    info: '#2563eb',
    infoForeground: '#ffffff',

    // Chart colors (colorblind-safe palette)
    chart1: '#2563eb',
    chart2: '#047857',
    chart3: '#b45309',
    chart4: '#7c3aed',
    chart5: '#dc2626',
    chart6: '#0891b2',
  }
}
```

### Typography Tokens

```typescript
{
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilyHeading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilyMono: 'Menlo, Monaco, "Courier New", monospace',

    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
    },

    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },

    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },

    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
    },
  }
}
```

### Spacing, Radii, Shadows

```typescript
{
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
    '4xl': '6rem',   // 96px
  },

  radii: {
    none: '0',
    sm: '0.125rem',  // 2px
    base: '0.25rem', // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    '2xl': '1rem',   // 16px
    full: '9999px',  // Fully rounded
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    none: 'none',
  }
}
```

## API Endpoints

See [OpenAPI Specification](../../packages/openapi/branding.yaml) for complete API documentation.

### Theme Management
- `GET /api/branding/themes` - List themes
- `POST /api/branding/themes` - Create theme (admin)
- `GET /api/branding/themes/:id` - Get theme details
- `PATCH /api/branding/themes/:id` - Update theme (admin)
- `DELETE /api/branding/themes/:id` - Delete theme (admin)
- `POST /api/branding/themes/:id/activate` - Activate theme (admin)

### Asset Management
- `GET /api/branding/themes/:id/assets` - List assets
- `POST /api/branding/themes/:id/assets` - Upload asset (admin)
- `DELETE /api/branding/assets/:id` - Delete asset (admin)

### Domain Management
- `GET /api/branding/domains` - List custom domains
- `POST /api/branding/domains` - Add domain (admin)
- `POST /api/branding/domains/:id/verify` - Verify domain ownership
- `DELETE /api/branding/domains/:id` - Remove domain (admin)

## Admin UI Usage

See [Admin Guide](./admin-guide.md) for detailed instructions.

## Security Considerations

### SVG Sanitization
All uploaded SVG files are sanitized to prevent XSS attacks:
- Dangerous elements removed: `<script>`, `<iframe>`, `<embed>`, `<object>`
- Event handlers stripped: `onclick`, `onload`, etc.
- External resources blocked: `javascript:`, `data:` URIs in dangerous contexts

### Asset Integrity
- SHA-256 hash calculated for all uploaded assets
- Subresource Integrity (SRI) support for CDN-hosted assets
- MIME type validation on upload

### Access Control
- Theme creation/editing: Company admin role required
- Asset upload: Company admin role required
- Domain management: Company admin role required
- Theme viewing: All authenticated users

### Audit Logging
All branding changes are logged to `branding_audit_log`:
- Action performed (created, updated, deleted, etc.)
- User who performed action
- IP address and user agent
- Before/after diff for updates

## Performance

### Caching Strategy
- **Client-side**: SessionStorage cache (5-minute TTL)
- **Server-side**: ETag support for theme payloads
- **CDN**: Cache-Control headers for asset URLs
- **Invalidation**: Theme cache cleared on update

### Performance Targets
- Theme injection: ≤5ms p95 latency
- Asset uploads: ≤25MB max size, streaming upload
- API response times: ≤120ms p95

## WCAG Compliance

All themes are validated for WCAG 2.1 Level AA compliance:
- **Contrast ratio**: ≥4.5:1 for normal text
- **Large text**: ≥3:1 for 18pt+ or 14pt+ bold
- **Auto-fix**: Automatic contrast correction available in Admin UI
- **Validation**: Real-time contrast checking during theme editing

## Dark Mode

Dark mode is supported with optional color overrides:
- Automatic system preference detection
- User preference persistence (localStorage)
- Smooth transitions between light/dark modes
- Separate dark mode color palette (optional)

## Integration

### Cockpit (Astro)
```typescript
import { initTheme } from '@/theme';

// Initialize theme on page load
await initTheme(tenantId, 'light');
```

### Trust Center
```typescript
import { applyThemeTokens } from '@/theme';

// Apply theme tokens
applyThemeTokens(tokens, darkMode, 'light');
```

### React Components
```tsx
import { ThemeProvider, useTheme } from '@/theme';

function App() {
  return (
    <ThemeProvider tenantId={tenantId}>
      <MyComponent />
    </ThemeProvider>
  );
}

function MyComponent() {
  const { tokens, colorScheme, toggleColorScheme } = useTheme();
  // Use theme...
}
```

## Future Enhancements

- [ ] Branded email templates
- [ ] Multi-theme support (multiple active themes per tenant)
- [ ] Theme marketplace (preset themes)
- [ ] Advanced font upload (custom fonts)
- [ ] Theme versioning and rollback
- [ ] A/B testing for themes

## References

- [Admin Guide](./admin-guide.md)
- [Token Reference](./token-reference.md)
- [PPTX Theming](./pptx-theming.md)
- [OpenAPI Specification](../../packages/openapi/branding.yaml)
