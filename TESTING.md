# TEEI Corporate Cockpit - Testing Documentation

**Phase D Deliverable K: Comprehensive Testing Suite**

## Overview

This document describes the comprehensive testing infrastructure for the TEEI Corporate Cockpit, including E2E tests, visual regression, Storybook component library, and API documentation.

---

## Table of Contents

1. [E2E Tests (Playwright)](#e2e-tests-playwright)
2. [Visual Regression (Chromatic)](#visual-regression-chromatic)
3. [Component Library (Storybook)](#component-library-storybook)
4. [API Documentation](#api-documentation)
5. [CI/CD Integration](#cicd-integration)
6. [Coverage Requirements](#coverage-requirements)
7. [Running Tests Locally](#running-tests-locally)

---

## E2E Tests (Playwright)

### Test Coverage

We have **10+ critical E2E test suites** covering all major user flows:

1. **Authentication & Login** (`tests/e2e/01-login.spec.ts`)
   - SSO integration
   - MFA enrollment
   - Session management
   - Password reset

2. **Dashboard Loading** (`tests/e2e/02-dashboard.spec.ts`)
   - Widget rendering
   - SSE real-time updates
   - Offline caching
   - Core Web Vitals

3. **Reports** (`tests/e2e/03-reports.spec.ts`)
   - Report generation
   - PDF/PPTX export
   - Narrative editor
   - Executive templates

4. **Approvals** (`tests/e2e/04-approvals.spec.ts`)
   - Workflow state machine
   - Version history
   - Comment threads
   - Watermarking

5. **Evidence Explorer** (`tests/e2e/05-evidence.spec.ts`)
   - Document viewer
   - Lineage visualization
   - PII redaction
   - Upload/download

6. **Benchmarks** (`tests/e2e/06-benchmarks.spec.ts`)
   - Cohort selection
   - Comparison charts
   - Percentile rankings
   - Industry filters

7. **PWA Features** (`tests/e2e/07-pwa.spec.ts`)
   - Service worker
   - Offline mode
   - Install prompt
   - SSE replay

8. **Governance** (`tests/e2e/08-governance.spec.ts`)
   - Consent management
   - DSAR requests
   - Export logs
   - Retention policies

9. **Accessibility** (`tests/e2e/09-accessibility.spec.ts`)
   - WCAG 2.2 AAA compliance
   - Keyboard navigation
   - Screen reader support
   - Focus management

10. **SSO & Admin** (`tests/e2e/10-sso-admin.spec.ts`)
    - SSO settings display
    - Role mapping
    - SCIM status
    - Session management

### Multi-Browser Testing

Tests run on:
- ✅ Chromium (Desktop & Mobile)
- ✅ Firefox
- ✅ WebKit (Safari)
- ✅ Mobile devices (iOS & Android)

### Running E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI mode
pnpm test:e2e:ui

# Run specific browser
pnpm test:e2e --project=chromium

# Debug mode
pnpm test:e2e:debug

# View HTML report
pnpm test:e2e:report
```

### Configuration

See `playwright.config.ts` for full configuration including:
- Multiple viewports (1920x1080, mobile, tablet)
- Screenshot on failure
- Video recording on failure
- Retry logic for CI
- Parallel execution

---

## Visual Regression (Chromatic)

### What is Tested

Chromatic captures visual snapshots of:
- All Storybook components (50+ stories)
- Different states (hover, focus, disabled)
- Multiple viewport sizes
- Dark/light themes

### Configuration

See `.chromatic.yml` for configuration:
```yaml
buildScriptName: build-storybook
exitZeroOnChanges: true
onlyChanged: true  # TurboSnap
delay: 300  # Wait for animations
```

### Running Visual Tests

```bash
# Publish to Chromatic
pnpm chromatic

# Build Storybook only
pnpm build-storybook
```

### CI Integration

Visual regression runs automatically on PRs:
- Compares against base branch
- Detects UI changes
- Requires approval for changes
- Auto-accepts on main branch

---

## Component Library (Storybook)

### Component Coverage

**65+ components across 10 categories:**

#### Widgets (10 components)
- AtAGlance
- SROIPanel
- VISPanel
- Q2QFeed
- ExportButtons
- MetricCard
- ChartWidget
- StatisticCard
- ProgressIndicator
- TrendBadge

#### Approvals (8 components)
- ApprovalWorkflowPanel
- CommentThread
- VersionHistory
- DiffViewer
- WatermarkPreview
- StatusBadge
- ApprovalTimeline
- ReviewerCard

#### Benchmarks (6 components)
- BenchmarkCharts
- CohortSelector
- PercentileIndicator
- ComparisonTable
- IndustryFilter
- MetricComparison

#### Identity & Access (10 components)
- SSOSettings
- RoleMappingTable
- SCIMStatus
- MFAEnrollment
- LoginForm
- PasswordReset
- SessionManager
- RoleSelector
- PermissionMatrix
- SecuritySettings

#### Governance (8 components)
- ConsentManager
- DSARStatus
- ExportLogsViewer
- RetentionPolicies
- AuditLogTable
- PrivacySettings
- DataCategoryCard
- ComplianceBadge

#### PWA (4 components)
- InstallPrompt
- OfflineIndicator
- SyncStatus
- UpdateNotification

#### Accessibility (4 components)
- ScreenReaderAnnouncer
- FocusManager
- SkipLinks
- KeyboardShortcuts

#### Reports (6 components)
- ReportGenerationModal
- NarrativeEditor
- TemplateSelector
- ExportOptions
- ReportPreview
- ChartEmbedder

#### Status (3 components)
- StatusPage
- HealthIndicator
- SLOMetrics

#### Common UI (6 components)
- Button (7 variants)
- Input (4 variants)
- Modal (2 variants)
- Toast (4 variants)
- Tooltip (2 variants)
- Select

### Running Storybook

```bash
# Start Storybook dev server
pnpm storybook

# Build static Storybook
pnpm build-storybook

# Preview built Storybook
npx http-server storybook-static
```

### Storybook Addons

- **@storybook/addon-essentials**: Controls, docs, actions
- **@storybook/addon-a11y**: Accessibility testing
- **@storybook/addon-interactions**: Interactive testing
- **@storybook/addon-coverage**: Code coverage
- **@chromatic-com/storybook**: Visual regression integration

---

## API Documentation

### OpenAPI Schema

Comprehensive OpenAPI 3.0 schema at `services/reporting/src/openapi.json`

**Endpoints documented:**
- Health checks
- Company metrics
- Report management
- Approval workflow
- Evidence explorer
- Benchmarks & cohorts
- Governance (GDPR)
- SSE events

### Interactive Docs

Swagger UI available at: `http://localhost:3018/docs`

### Postman Collection

Complete Postman collection: `postman/TEEI-Cockpit.postman_collection.json`

**Includes:**
- All API endpoints (40+ requests)
- Example request bodies
- Environment variables
- Test scripts
- Collection variables

### Using Postman Collection

```bash
# Import collection
1. Open Postman
2. Import > File > Select postman/TEEI-Cockpit.postman_collection.json

# Or run with Newman (CLI)
npx newman run postman/TEEI-Cockpit.postman_collection.json \
  --environment postman/local.postman_environment.json
```

---

## CI/CD Integration

### GitHub Actions Workflow

See `.github/workflows/tests.yml`

**Jobs:**
1. **Lint & TypeCheck** - Code quality
2. **Unit Tests** - Component tests with coverage
3. **E2E Tests** - Playwright on 3 browsers
4. **Storybook Tests** - Build verification
5. **Visual Regression** - Chromatic on PRs
6. **Lighthouse CI** - Performance budgets
7. **API Tests** - Newman/Postman validation
8. **Coverage Report** - Aggregated results
9. **Quality Gate** - Pass/fail checks

### Required Secrets

```bash
# .env or GitHub Secrets
CHROMATIC_PROJECT_TOKEN=your-token
CODECOV_TOKEN=your-token
```

### CI Test Commands

```bash
# Run all tests like CI does
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:unit
pnpm test:e2e
pnpm build-storybook
```

---

## Coverage Requirements

### Targets

- ✅ **Unit + E2E Coverage**: >80%
- ✅ **E2E Critical Paths**: 10+ flows
- ✅ **Visual Components**: 50+ stories
- ✅ **API Endpoints**: 100% documented
- ✅ **Accessibility**: WCAG 2.2 AA (AAA target)
- ✅ **Performance**: Lighthouse >90

### Measuring Coverage

```bash
# Unit test coverage
pnpm test:coverage

# View coverage report
open coverage/lcov-report/index.html

# E2E coverage (via Playwright)
# Coverage automatically collected during E2E runs
```

---

## Running Tests Locally

### Prerequisites

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install
```

### Quick Start

```bash
# 1. Run all tests
pnpm test

# 2. Run E2E tests
pnpm test:e2e

# 3. Start Storybook
pnpm storybook

# 4. Run visual regression
pnpm chromatic

# 5. Validate API
cd services/reporting
pnpm dev
# Visit http://localhost:3018/docs
```

### Debugging Tests

```bash
# Debug E2E tests
pnpm test:e2e:debug

# Run specific test file
pnpm test:e2e tests/e2e/01-login.spec.ts

# Run with headed browser
pnpm test:e2e --headed

# Generate trace
pnpm test:e2e --trace on
```

---

## Best Practices

### Writing E2E Tests

1. Use data-testid attributes for selectors
2. Wait for explicit conditions, not timeouts
3. Test user behavior, not implementation
4. Keep tests isolated and independent
5. Use Page Object Model for complex flows

### Writing Stories

1. One story per component state
2. Use controls for interactive props
3. Document props with JSDoc
4. Include accessibility tests
5. Add play functions for interactions

### API Testing

1. Include example requests in OpenAPI
2. Use schemas for validation
3. Document error responses
4. Include authentication examples
5. Keep Postman collection in sync

---

## Troubleshooting

### Common Issues

**E2E tests failing locally:**
```bash
# Clear cache and reinstall
pnpm clean
pnpm install
pnpm exec playwright install
```

**Storybook build errors:**
```bash
# Clear Storybook cache
rm -rf node_modules/.cache/storybook
pnpm build-storybook
```

**Chromatic timeout:**
```bash
# Check your CHROMATIC_PROJECT_TOKEN
echo $CHROMATIC_PROJECT_TOKEN
```

**Newman failing:**
```bash
# Check services are running
curl http://localhost:3018/health
```

---

## Resources

- [Playwright Docs](https://playwright.dev)
- [Storybook Docs](https://storybook.js.org)
- [Chromatic Docs](https://www.chromatic.com/docs)
- [OpenAPI Spec](https://swagger.io/specification/)
- [Newman CLI](https://learning.postman.com/docs/collections/using-newman-cli/)

---

## Support

For questions or issues with the testing infrastructure, contact:
- **QA Lead**: qa-compliance-lead@teei.example
- **TECH-LEAD**: claude@teei.example

---

**Last Updated**: 2025-11-14
**Deliverable**: Phase D.K - Docs, Demos, Tests
**Status**: ✅ Complete
