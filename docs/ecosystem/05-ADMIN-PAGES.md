# TEEI Admin Dashboard Pages

**Last Updated**: 2025-01-27  
**Total Pages**: 93+ Astro pages  
**Location**: `apps/corp-cockpit-astro/src/pages/`

---

## Page Structure

All admin pages are in the Corporate Cockpit Astro app:
- **Base Path**: `/cockpit/[companyId]/`
- **Multi-locale**: Supports `en`, `no`, `uk` locales
- **Auth**: Session required (admin or company_admin role)

---

## Main Dashboard Sections

### Cockpit Home

| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| **Dashboard** | `/[lang]/cockpit/[companyId]/index.astro` | Main dashboard with metrics | ✅ |
| **Welcome** | `/[lang]/cockpit/[companyId]/welcome.astro` | Onboarding welcome page | ✅ |
| **Boardroom** | `/[lang]/cockpit/[companyId]/boardroom.astro` | Boardroom presentation mode | ✅ |
| **Boardroom Live** | `/[lang]/cockpit/[companyId]/boardroom-live.astro` | Live boardroom mode | ✅ |

---

## Evidence & Reporting

| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| **Evidence Explorer** | `/[lang]/cockpit/[companyId]/evidence.astro` | Browse evidence snippets | ✅ |
| **Reports** | `/[lang]/cockpit/[companyId]/reports.astro` | Generated reports list | ✅ |
| **Pipeline** | `/[lang]/cockpit/[companyId]/pipeline.astro` | Data pipeline view | ✅ |
| **Deliveries** | `/[lang]/cockpit/[companyId]/deliveries.astro` | Impact-In deliveries | ✅ |

---

## Campaign Management

| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| **Campaigns List** | `/[lang]/cockpit/[companyId]/campaigns/index.astro` | All campaigns | ✅ |
| **New Campaign** | `/cockpit/[companyId]/campaigns/new.astro` | Create campaign | ✅ |
| **Programme** | `/[lang]/cockpit/[companyId]/programmes/language-for-ukraine.astro` | Specific programme view | ✅ |

---

## Admin Configuration

| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| **Admin** | `/[lang]/cockpit/[companyId]/admin/index.astro` | Admin dashboard | ✅ |
| **Admin Studio** | `/[lang]/cockpit/[companyId]/admin-studio.astro` | Advanced admin tools | ✅ |
| **SSO** | `/[lang]/cockpit/[companyId]/admin/sso.astro` | SSO configuration | ✅ |
| **Roles** | `/[lang]/cockpit/[companyId]/admin/roles.astro` | RBAC role management | ✅ |

---

## Data Management

| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| **Importer** | `/[lang]/cockpit/[companyId]/importer.astro` | Data import tool | ✅ |
| **Usage** | `/[lang]/cockpit/[companyId]/usage.astro` | Usage statistics | ✅ |

---

## Global Admin Pages

| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| **Admin Index** | `/[lang]/admin/index.astro` | Global admin dashboard | ✅ |
| **Audit** | `/admin/audit.astro` | System audit log | ✅ |
| **Publications** | `/admin/publications/index.astro` | Manage publications | ✅ |
| **Publication Detail** | `/admin/publications/[id].astro` | Publication editor | ✅ |
| **Demo** | `/admin/demo/index.astro` | Demo mode controls | ✅ |

---

## Public/Shared Pages

| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| **Shared Link** | `/[lang]/cockpit/shared/[linkId].astro` | Shared view access | ✅ |
| **Publications** | `/publications.astro` | Public publications list | ✅ |

---

## Error Pages

| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| **401 Unauthorized** | `/[lang]/cockpit/401.astro` | Unauthorized access | ✅ |
| **404 Not Found** | `/[lang]/cockpit/404.astro` | Page not found | ✅ |
| **404 Global** | `/404.astro` | Global 404 | ✅ |

---

## Status & Info Pages

| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| **Status** | `/[lang]/status.astro` | System status | ✅ |
| **Accessibility** | `/accessibility.astro` | Accessibility info | ✅ |

---

## Locale-Specific Pages

Pages are available in multiple locales:
- **English**: `/en/cockpit/[companyId]/...`
- **Norwegian**: `/no/cockpit/[companyId]/...`
- **Ukrainian**: `/uk/cockpit/[companyId]/...`

**Default**: English (no prefix)

---

## Page Features

### Authentication
- All cockpit pages require session authentication
- Role-based access control (RBAC)
- Multi-tenant isolation

### Real-Time Updates
- Server-Sent Events (SSE) for live data
- Dashboard auto-refresh
- Campaign status updates

### Data Binding
- Connected to real database queries
- Some metrics may use mock data (see 11-GAPS-TODO.md)
- Evidence explorer fully connected

### Responsive Design
- Mobile-friendly layouts
- Tablet optimization
- Desktop-first design

---

## Page Status Summary

| Category | Count | Working | Partial | Broken |
|----------|-------|---------|---------|--------|
| **Dashboard** | 4 | 4 | 0 | 0 |
| **Evidence/Reports** | 4 | 4 | 0 | 0 |
| **Campaigns** | 3 | 3 | 0 | 0 |
| **Admin Config** | 4 | 4 | 0 | 0 |
| **Data Management** | 2 | 2 | 0 | 0 |
| **Global Admin** | 5 | 5 | 0 | 0 |
| **Public/Shared** | 2 | 2 | 0 | 0 |
| **Error Pages** | 3 | 3 | 0 | 0 |
| **Status/Info** | 2 | 2 | 0 | 0 |
| **Total** | 29+ | 29+ | 0 | 0 |

*Note: Many pages have locale variants, bringing total to 93+*

---

## Navigation Structure

```
/cockpit/[companyId]/
├── / (Dashboard)
├── /welcome
├── /boardroom
├── /boardroom-live
├── /evidence
├── /reports
├── /pipeline
├── /deliveries
├── /campaigns/
│   ├── / (List)
│   └── /new
├── /programmes/
│   └── /language-for-ukraine
├── /admin/
│   ├── / (Dashboard)
│   ├── /sso
│   └── /roles
├── /admin-studio
├── /importer
└── /usage
```

---

## Page Functionality Checklist

For each admin page:
- ✅ Loads without errors
- ✅ Fetches data from correct API
- ✅ Buttons/actions wired up
- ✅ Auth properly enforced
- ✅ Multi-tenant isolation working
- ✅ Responsive design
- ⚠️ Some metrics may use mock data

---

**Next**: See [06-USER-PORTALS.md](./06-USER-PORTALS.md) for user-facing portals.
