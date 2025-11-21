# Regulatory Packs: CSRD/GRI/SDG Compliance System

**Version:** 1.0.0
**Last Updated:** 2025-11-17
**Owner:** Worker 13 - Regulatory Packs Team

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Standards Registry](#standards-registry)
4. [Evidence Mapping](#evidence-mapping)
5. [Pack Generation](#pack-generation)
6. [API Reference](#api-reference)
7. [UI Components](#ui-components)
8. [PDF Export](#pdf-export)
9. [Testing](#testing)
10. [Framework Versioning](#framework-versioning)
11. [Upgrade Path](#upgrade-path)

---

## Overview

The Regulatory Packs system generates compliance reports for multiple sustainability and ESG frameworks:

- **CSRD** (Corporate Sustainability Reporting Directive) – EU sustainability reporting with ESRS standards
- **GRI** (Global Reporting Initiative) – Universal and topic-specific sustainability standards
- **SDG** (Sustainable Development Goals) – UN global development targets

### Key Features

✅ **Multi-framework support** – Generate packs for one or more frameworks
✅ **Evidence-based disclosures** – Automatic mapping from Q2Q evidence and metrics
✅ **Completeness scoring** – Real-time assessment of disclosure completeness
✅ **Gap analysis** – Identifies missing data with actionable recommendations
✅ **PDF export** – Professional annexes with TOC, page numbers, and footnotes
✅ **Machine-readable** – JSON export for integration with other systems
✅ **Versioned standards** – Track framework version changes over time

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Corp Cockpit (Frontend)                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Regulatory Pack Builder UI                          │   │
│  │  - Framework Selector                                │   │
│  │  - Scope Configuration                               │   │
│  │  - Completeness Preview                              │   │
│  │  - Export Actions                                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Reporting Service (Backend)                │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Regulatory    │  │ Generator    │  │ PDF Renderer    │  │
│  │ Routes        │→ │ Service      │→ │                 │  │
│  │ (Fastify)     │  │              │  │ (Playwright +   │  │
│  └───────────────┘  └──────────────┘  │  pdf-lib)       │  │
│                           │            └─────────────────┘  │
│                           ↓                                  │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Mapper        │  │ Validator    │  │ Standards       │  │
│  │ Service       │  │              │  │ Registry        │  │
│  │               │  │              │  │ (JSON files)    │  │
│  └───────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Evidence Query
                            ↓
┌─────────────────────────────────────────────────────────────┐
│               Database (PostgreSQL/ClickHouse)               │
│  - Q2Q Evidence Snippets                                     │
│  - Outcome Scores (SROI, VIS)                                │
│  - Program Enrollment Data                                   │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
services/reporting/src/
├── srs/                              # Standards Reporting System
│   ├── registry/                     # Framework definitions (JSON)
│   │   ├── csrd-esrs.json            # CSRD ESRS topics
│   │   ├── gri-standards.json        # GRI disclosures
│   │   └── sdg-targets.json          # SDG targets
│   ├── mapper.ts                     # Evidence-to-disclosure mapping
│   ├── generator.ts                  # Pack generation orchestration
│   ├── validator.ts                  # Pre-submit validation
│   └── pdf-renderer.ts               # PDF generation
├── routes/
│   └── regulatory.ts                 # API endpoints
└── templates/
    └── annex/
        └── pack-main.hbs             # Main PDF template

apps/corp-cockpit-astro/src/
└── features/
    └── regulatory/
        ├── RegulatoryPackBuilder.tsx # Main UI component
        └── components/
            ├── FrameworkSelector.tsx
            ├── ScopeConfiguration.tsx
            ├── CompletenessPreview.tsx
            ├── ExportActions.tsx
            └── PacksList.tsx

packages/shared-types/src/
└── regulatory.ts                     # Zod schemas & TypeScript types
```

---

## Standards Registry

### JSON Format

Each framework is defined in a versioned JSON file with structured disclosures.

#### CSRD ESRS Structure

```json
{
  "version": "2023-11",
  "name": "CSRD ESRS",
  "topics": [
    {
      "id": "ESRS-E1",
      "name": "Climate change",
      "category": "environmental",
      "disclosures": [
        {
          "id": "E1-1",
          "title": "Transition plan for climate change mitigation",
          "mandatory": true,
          "dataPoints": [
            {
              "id": "E1-1-DP1",
              "name": "Climate transition plan description",
              "type": "narrative",
              "required": true
            }
          ]
        }
      ]
    }
  ]
}
```

#### GRI Structure

```json
{
  "version": "2021",
  "name": "GRI Universal and Topic-Specific Standards",
  "disclosures": [
    {
      "id": "GRI-2-1",
      "title": "Organizational details",
      "standard": "GRI 2: General Disclosures 2021",
      "category": "universal",
      "requirements": [
        {
          "id": "GRI-2-1-a",
          "text": "Name of the organization",
          "type": "narrative"
        }
      ],
      "sdgMappings": ["SDG-8"]
    }
  ]
}
```

#### SDG Structure

```json
{
  "version": "2015",
  "name": "UN Sustainable Development Goals",
  "targets": [
    {
      "goal": 8,
      "goalName": "Decent Work and Economic Growth",
      "target": "8.5",
      "targetText": "Full employment and decent work...",
      "indicators": [
        {
          "id": "8.5.1",
          "description": "Average hourly earnings...",
          "tier": "II"
        }
      ]
    }
  ]
}
```

### Supported Frameworks

| Framework | Version    | Topics/Disclosures | Mandatory Count |
|-----------|------------|-------------------|-----------------|
| CSRD      | 2023-11    | 3 topics (E1, S1, G1), 10 disclosures | 10 |
| GRI       | 2021       | 9 disclosures (universal + topic-specific) | 2 |
| SDG       | 2015       | 12 targets across 7 goals | 0 |

---

## Evidence Mapping

### Mapping Algorithm

The mapper uses a **keyword-based relevance scoring** algorithm to match evidence to disclosure requirements:

1. **Extract keywords** from requirement description
2. **Count keyword matches** in evidence text
3. **Apply category boost** (e.g., environmental evidence → ESRS-E1)
4. **Apply metric boost** (quantitative requirements → metrics evidence)
5. **Calculate relevance score** (0.0 – 1.0)

### Relevance Threshold

- **Minimum**: 0.3 (30% keyword match)
- **Good**: 0.5–0.7 (50–70% match)
- **Excellent**: 0.8+ (80%+ match)

### Completeness Calculation

For each disclosure:

```typescript
completenessScore = (
  (coveredRequiredDataPoints / totalRequiredDataPoints) * 0.7 +
  (coveredOptionalDataPoints / totalOptionalDataPoints) * 0.3
)
```

- **Required fields** weighted 70%
- **Optional fields** weighted 30%

### Status Determination

| Completeness | Status  | Badge Color |
|--------------|---------|-------------|
| 0%           | Missing | Red         |
| 1–49%        | Partial | Orange      |
| 50–99%       | Partial | Orange      |
| 100%         | Complete| Green       |

---

## Pack Generation

### Request Flow

```
1. User submits GeneratePackRequest
   ↓
2. Validator runs pre-submit checks
   ↓
3. Generator creates pack with status='generating'
   ↓
4. Mapper fetches evidence for period and scope
   ↓
5. Mapper calculates disclosure completeness
   ↓
6. Generator builds sections per framework
   ↓
7. Generator aggregates gaps
   ↓
8. Generator calculates summary
   ↓
9. Pack status set to 'ready'
```

### Performance Targets

- **P95 generation time**: ≤8s for 200-page annex
- **Memory bounded**: ≤512MB per pack generation
- **Streaming**: Large PDFs streamed, not buffered

### Validation Rules

#### Pre-Submit Checks

- ✅ **Period validation**: Start before end, ≤2 years duration
- ✅ **Framework validation**: At least one valid framework selected
- ✅ **Company ID**: Valid UUID format
- ⚠️ **Stale metrics**: Warning if includeStale=true
- ⚠️ **Minimum evidence**: Warning if evidence count <10

#### Error Codes

| Code                | Severity | Description |
|---------------------|----------|-------------|
| `INVALID_PERIOD`    | error    | Period dates invalid or too long |
| `INSUFFICIENT_DATA` | error    | No frameworks or invalid selection |
| `MISSING_EVIDENCE`  | error    | No evidence found for period |
| `STALE_METRICS`     | warning  | Metrics >90 days old included |
| `MISSING_MANDATORY` | error    | Mandatory disclosures lack data |

---

## API Reference

### POST /v1/regulatory/packs

Generate a new regulatory pack.

**Request Body:**

```json
{
  "companyId": "uuid",
  "period": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "frameworks": ["CSRD", "GRI", "SDG"],
  "evidenceScope": {
    "programs": ["buddy", "mentorship"],
    "metrics": ["sroi", "vis"],
    "includeStale": false
  },
  "options": {
    "language": "en",
    "includeGaps": true,
    "pdfOptions": {
      "includeTOC": true,
      "includeFootnotes": true,
      "watermark": true
    }
  }
}
```

**Response (202 Accepted):**

```json
{
  "packId": "uuid",
  "status": "generating",
  "message": "Pack generation started",
  "estimatedCompletionTime": 30
}
```

---

### GET /v1/regulatory/packs/:id

Get pack details as JSON.

**Response (200 OK):**

```json
{
  "id": "uuid",
  "companyId": "uuid",
  "period": { "start": "2024-01-01", "end": "2024-12-31" },
  "frameworks": ["CSRD", "GRI"],
  "status": "ready",
  "summary": {
    "totalDisclosures": 15,
    "completedDisclosures": 10,
    "partialDisclosures": 3,
    "missingDisclosures": 2,
    "overallCompleteness": 0.78,
    "byFramework": [...],
    "criticalGaps": 2
  },
  "sections": [...],
  "gaps": [...],
  "metadata": {...}
}
```

---

### GET /v1/regulatory/packs/:id/pdf

Export pack as PDF.

**Response (200 OK):**

- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename="regulatory-pack-{id}.pdf"`

---

### GET /v1/regulatory/packs?companyId={uuid}

List all packs for a company.

**Response (200 OK):**

```json
{
  "packs": [
    {
      "id": "uuid",
      "companyId": "uuid",
      "frameworks": ["CSRD"],
      "period": { "start": "...", "end": "..." },
      "status": "ready",
      "completeness": 0.85,
      "generatedAt": "2024-11-17T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

## UI Components

### RegulatoryPackBuilder

Main component orchestrating pack creation.

**Features:**
- Framework selection
- Period configuration
- Evidence scope filters
- Generation trigger
- Pack preview
- Export actions
- Pack history

---

### FrameworkSelector

Multi-select for CSRD/GRI/SDG.

**UX:** Card-based selection with checkmarks

---

### ScopeConfiguration

Filter evidence by programs, metrics, staleness.

**UX:** Chips for programs, checkboxes for metrics

---

### CompletenessPreview

Real-time pack summary with status chips.

**Displays:**
- Overall completeness bar
- Metrics grid (total, completed, partial, missing)
- Framework breakdown
- Critical gaps alert

---

### ExportActions

PDF and JSON export buttons.

**Constraints:**
- Disabled unless pack status = 'ready'
- PDF download via browser
- JSON download as blob

---

### PacksList

Table of previously generated packs.

**Actions:** Load pack to re-view or re-export

---

## PDF Export

### Pipeline

1. **Render to HTML** (Handlebars template)
2. **Convert to PDF** (Playwright headless browser)
3. **Add metadata** (pdf-lib)
4. **Stream to client**

### Template Structure

- **Cover Page**: Title, frameworks, period, metadata
- **Executive Summary**: Metrics grid, completeness bar, critical gaps
- **Table of Contents**: Auto-generated from sections
- **Sections**: One page per disclosure with:
  - Framework badge
  - Disclosure title & status
  - Narrative content
  - Data tables
  - Evidence citations
- **Gaps Page**: All identified gaps with severity and actions
- **Footnotes**: Evidence reference index

### PDF Features

✅ Page numbers (auto-generated)
✅ Table of contents with page links
✅ Footnotes with evidence IDs
✅ Color-coded frameworks
✅ Status badges
✅ Watermarking (optional)
✅ PDF metadata (title, author, keywords)

---

## Testing

### Unit Tests

**File:** `services/reporting/src/srs/__tests__/mapper.test.ts`

**Coverage Target:** ≥90%

**Test Cases:**
- Evidence relevance scoring
- Completeness calculation
- Gap identification
- Framework-specific mapping

**Run:** `pnpm -w test:mapper`

---

### Snapshot Tests

**File:** `services/reporting/src/srs/__tests__/pdf-renderer.test.ts`

**Purpose:** Ensure PDF output consistency

**Test Cases:**
- Cover page rendering
- TOC generation
- Section formatting
- Footnote placement

**Run:** `pnpm -w test:pdf-snapshot`

---

### Contract Tests

**File:** `services/reporting/src/routes/__tests__/regulatory.test.ts`

**Purpose:** Validate API request/response schemas

**Test Cases:**
- POST /regulatory/packs (202 response)
- GET /regulatory/packs/:id (200 response)
- GET /regulatory/packs/:id/pdf (PDF download)
- Validation errors (400 response)

**Run:** `pnpm -w test:regulatory-api`

---

### E2E Tests

**File:** `apps/corp-cockpit-astro/src/features/regulatory/__tests__/e2e.test.ts`

**Purpose:** Full user flow testing

**Test Cases:**
- Generate pack with multiple frameworks
- Preview completeness
- Export PDF
- Export JSON
- Load previous pack

**Run:** `pnpm -w test:e2e:regulatory`

---

## Framework Versioning

### Version Schema

Format: `{FRAMEWORK}-{YEAR}-{MONTH}`

Examples:
- `CSRD-2023-11` (November 2023 ESRS)
- `GRI-2021` (GRI Universal Standards 2021)
- `SDG-2015` (Original UN SDGs)

### Version Storage

Each pack includes `metadata.version` with all framework versions:

```json
{
  "metadata": {
    "version": "CSRD-2023-11,GRI-2021,SDG-2015"
  }
}
```

### Deprecation Policy

- **Minor updates** (data point additions): No deprecation, backward compatible
- **Major updates** (structural changes): 12-month deprecation window
- **Deprecated registries** marked with `"deprecated": true` flag

---

## Upgrade Path

### Adding a New Framework

1. **Create registry JSON** in `services/reporting/src/srs/registry/{framework}.json`
2. **Add mapper function** in `services/reporting/src/srs/mapper.ts`
3. **Update `FrameworkType` enum** in `packages/shared-types/src/regulatory.ts`
4. **Add to `FRAMEWORKS` array** in `FrameworkSelector.tsx`
5. **Add section builder** in `services/reporting/src/srs/generator.ts`
6. **Write tests** for new framework
7. **Update docs** with new framework details

### Updating an Existing Framework

1. **Copy current registry** to `{framework}-{version}.json.bak`
2. **Update registry JSON** with new disclosures/data points
3. **Increment version** in JSON `version` field
4. **Update mapper** if scoring logic changes
5. **Run regression tests** on existing packs
6. **Document breaking changes** in CHANGELOG.md

### Backward Compatibility

- **Pack regeneration**: Old packs can be regenerated with updated registries
- **Version mismatch**: Display warning if pack uses deprecated version
- **Data migration**: Not required – packs are immutable snapshots

---

## Performance Optimization

### Caching

- **Registry files**: Loaded once at startup, cached in memory
- **Evidence queries**: Results cached per company/period (15 min TTL)
- **PDF templates**: Compiled once, reused

### Streaming

- **Large PDFs**: Streamed directly to response, not buffered
- **Evidence batching**: Fetch in chunks of 1000 records

### Concurrency

- **Framework mapping**: Run in parallel for multi-framework packs
- **Section building**: Parallelized per disclosure

---

## Security

### Access Control

- **Company ID validation**: Ensure user has access to company
- **Tenant scoping**: All queries scoped to tenant
- **Rate limiting**: 10 req/min per company for pack generation

### Data Redaction

- **PII removal**: Evidence snippets pre-redacted before mapping
- **Sensitive metrics**: Excluded from export unless user has `export:sensitive` permission

---

## Monitoring & Observability

### Metrics

- `regulatory_pack_generation_duration_seconds` (histogram)
- `regulatory_pack_generation_total` (counter)
- `regulatory_pack_generation_errors_total` (counter)
- `regulatory_pack_completeness_score` (gauge)

### Logging

- Pack generation started/completed (INFO)
- Validation errors (WARN)
- Mapper errors (ERROR)
- PDF rendering failures (ERROR)

### Alerts

- **Pack generation failures** >5% (critical)
- **Generation time** >30s p95 (warning)
- **Evidence fetch timeout** (warning)

---

## Troubleshooting

### Pack stuck in 'generating' status

**Cause:** Background job failed without updating status
**Fix:** Check logs for errors; retry generation

### PDF export fails

**Cause:** Playwright browser crash or template error
**Fix:** Check `pdfRenderer` logs; verify template syntax

### Low completeness scores

**Cause:** Insufficient evidence or poor keyword matching
**Fix:** Adjust relevance threshold or improve evidence tagging

### Validation errors

**Cause:** Invalid request payload
**Fix:** Check request against schemas in `shared-types/regulatory.ts`

---

## Roadmap

### Phase 2 Features

- [ ] TCFD (Task Force on Climate-related Financial Disclosures)
- [ ] SASB (Sustainability Accounting Standards Board)
- [ ] Multi-entity consolidation
- [ ] Narrative AI generation with LLM
- [ ] Evidence gap auto-fill suggestions
- [ ] Approval workflows for packs
- [ ] Version diffing (compare two packs)

---

## Contact & Support

**Team:** Worker 13 - Regulatory Packs
**Slack:** #worker-13-regulatory
**Docs:** [Internal Wiki](https://wiki.teei.io/worker13)
**Issues:** [GitHub](https://github.com/TEEI-CSR-Platform/issues)

---

**End of Documentation**
