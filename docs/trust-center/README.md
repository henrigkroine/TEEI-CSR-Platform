# Trust Center & Evidence Gates

## Overview

The TEEI Platform Trust Center provides public transparency for security, privacy, and AI governance. This implementation includes:

1. **Public Trust Center** (`apps/trust-center`) - Astro-based static site
2. **Evidence Gates** - AI-generated content validation with strict citation requirements
3. **Evidence Ledger** - Append-only tamper-proof audit log (SHA-256 digests)
4. **Trust APIs** - Public endpoints for status, evidence, and policies
5. **OpenLineage Emitters** - Data lineage tracking for compliance

## Architecture

### Trust Center App

**Location**: `apps/trust-center/`

**Pages**:
- `/` - System status (uptime, SLOs, performance metrics)
- `/security` - Certifications, SBOM, SLSA provenance, vulnerability management
- `/privacy` - GDPR compliance, DPA, ROPA, DPIA, data residency
- `/ai-transparency` - AI Act compliance, model cards, human oversight, evidence gates
- `/subprocessors` - Third-party processor list (infrastructure, AI models, security)
- `/incidents` - Historical incident log with root cause analysis

**Tech Stack**:
- Astro 4.0 (static site generation)
- Tailwind CSS
- WCAG 2.2 AA compliant
- `/status.json` API integration

### Evidence Gates

**Location**: `services/reporting/src/routes/gen-reports.ts`

**Enforcement**:
- Blocks report generation if no evidence found for period (`422_EVIDENCE_REQUIRED`)
- Validates ≥1 citation per paragraph (configurable)
- Validates citation density ≥0.5 per 100 words (configurable)
- Returns `422_EVIDENCE_REQUIRED` on validation failure

**Citation Validator**: `services/reporting/src/lib/citations.ts`

**Configuration**:
```typescript
{
  minCitationsPerParagraph: 1,
  minCitationDensity: 0.5, // Per 100 words
  strictValidation: true   // Enforce gates
}
```

### Evidence Ledger

**Location**: `services/reporting/src/evidence/ledger.ts`

**Schema**: `packages/shared-schema/src/schema/evidence_ledger.ts`

**Features**:
- Append-only (no updates/deletes)
- SHA-256 content digests
- Chain integrity via `previousDigest`
- Tamper detection (automated verification)
- No PII in ledger entries
- 5+ year retention (AI Act Article 12)

**Usage**:
```typescript
const ledger = createEvidenceLedger();

// Append entry
await ledger.append({
  evidenceId: 'uuid',
  evidenceType: 'citation',
  companyId: 'uuid',
  content: 'text to hash',
  eventType: 'cited',
  reportId: 'uuid',
});

// Verify integrity
const result = await ledger.verify(evidenceId, expectedContent);
```

**API**:
- `append(entry)` - Add new entry (only way to modify)
- `verify(evidenceId, content?)` - Verify chain integrity
- `getHistory(evidenceId)` - Get all versions
- `getReportEvidence(reportId)` - Get evidence for report
- `getTamperedEvidence(companyId?)` - Get tampered items

### Trust APIs

**Location**: `services/api-gateway/src/routes/trust.ts`

**Endpoints**:

#### `GET /trust/v1/status` (Public)
Returns system status, uptime, SLOs, performance metrics for Trust Center.

Response:
```json
{
  "status": "operational",
  "uptime": 99.95,
  "latencyP95": 245,
  "lcp": 1.2,
  "errorRate": 0.02,
  "errorBudget": 78.5,
  "services": [...]
}
```

Cache: 30 seconds

#### `GET /trust/v1/evidence/:reportId` (Authenticated)
Returns evidence citations used in a report.

#### `GET /trust/v1/ledger/:reportId` (Authenticated)
Returns evidence ledger entries for a report (tamper-proof audit trail).

#### `GET /trust/v1/policies` (Public)
Returns data residency and privacy policy summaries.

Response:
```json
{
  "dataResidency": {
    "EU": { "primary": "EU-WEST-1", "backup": "EU-CENTRAL-1", "regulation": "GDPR" },
    ...
  },
  "retentionPolicies": { ... },
  "privacyRights": { ... }
}
```

Cache: 1 hour

### OpenLineage Emitters

**Location**: `packages/observability/src/openlineage.ts`

**Usage**:
```typescript
import { createOpenLineageEmitter, OpenLineageEmitter } from '@teei/observability';

const emitter = createOpenLineageEmitter('teei.reporting');

// Start job
await emitter.emitStart({
  runId: 'uuid',
  jobName: 'generate_report',
  inputs: [
    OpenLineageEmitter.dataset({
      namespace: 'postgres://teei-db',
      name: 'evidence_snippets',
      schema: { fields: [...] },
      quality: { rowCount: 1000 },
    }),
  ],
});

// Complete job
await emitter.emitComplete({
  runId: 'uuid',
  jobName: 'generate_report',
  outputs: [
    OpenLineageEmitter.dataset({
      namespace: 'postgres://teei-db',
      name: 'report_lineage',
    }),
  ],
});

// Fail job
await emitter.emitFail({
  runId: 'uuid',
  jobName: 'generate_report',
  error: new Error('Failed'),
});
```

**Event Types**:
- `START` - Job execution started
- `COMPLETE` - Job completed successfully
- `FAIL` - Job failed

**Sink**: ClickHouse `lineage_events` table (TODO: implement sink)

## Deployment

### Trust Center

```bash
cd apps/trust-center
pnpm install
pnpm build
pnpm preview
```

Static export: `apps/trust-center/dist/`

Deploy to: `https://trust.teei.io`

### API Gateway

Trust APIs are exposed via `services/api-gateway` on `/trust/v1/*` endpoints.

No additional deployment needed - included in standard gateway deployment.

## Testing

### Unit Tests

```bash
# Evidence Ledger
cd services/reporting
pnpm test src/evidence/ledger.test.ts

# Citation Validator
pnpm test src/lib/citations.test.ts
```

Coverage target: ≥90%

### E2E Tests

```bash
cd apps/trust-center
pnpm test:e2e tests/trust-center.spec.ts
```

Covers:
- Status page loading
- Navigation between pages
- WCAG 2.2 AA compliance
- /status.json API integration

### Performance Tests

```bash
# k6 smoke test for /status.json
k6 run tests/status-json.k6.js --vus 10 --duration 30s
```

Target: p95 latency ≤50ms

### Accessibility

```bash
cd apps/trust-center
pnpm test:a11y
```

WCAG 2.2 AA compliance enforced via pa11y-ci.

## Security

### No PII in Ledger

Evidence Ledger stores:
- UUIDs (evidenceId, companyId, reportId, editorId)
- Content digests (SHA-256), not content
- Anonymized IP addresses (hashed)
- No user names, emails, or personal data

### SBOM & Provenance

- SBOM generated per build (CycloneDX + SPDX formats)
- SLSA Provenance Level 3
- Images signed with Cosign/Sigstore
- Available at: `/api/v1/sbom/latest`, `/api/v1/provenance/latest`

### Image Signing

All container images signed:
```bash
cosign verify --key cosign.pub registry.teei.io/services/reporting:latest
```

## Compliance

### AI Act (EU)

- **Article 13**: AI system transparency disclosure (AI Transparency page)
- **Article 12**: Record keeping ≥5 years (Evidence Ledger retention)
- **Risk Classification**: Limited Risk (Q2Q Pipeline), Low Risk (Report Generation)

### GDPR

- **Article 15**: DSAR processing (Privacy page)
- **Article 17**: Right to erasure (DSAR hooks)
- **Article 28**: DPA with SCCs (downloadable DPA)
- **Article 30**: ROPA maintained (downloadable ROPA)

### SOC 2 Type II

- Control evidence: Evidence Ledger provides audit trail
- Change management: Ledger tracks all evidence edits
- Access controls: Editor IDs logged (no PII)

## Monitoring

### Grafana Dashboards

**Trust Center SLOs**:
- Availability ≥99.9% (Trust Center uptime)
- Latency p95 ≤1s (API Gateway `/trust/v1/status`)
- Error rate ≤0.1%

**Evidence Gates**:
- `422_EVIDENCE_REQUIRED` rate
- Citation validation failure rate
- Evidence Ledger append latency

**Alerts**:
- Trust Center down (PagerDuty)
- Evidence Ledger tamper detected (P1 alert)
- SBOM generation failed (P2 alert)

## Roadmap

### Phase 1 (Complete)
- ✅ Trust Center app with 6 pages
- ✅ Evidence Gates enforcement (422 response)
- ✅ Evidence Ledger (SHA-256, append-only)
- ✅ Trust APIs in gateway
- ✅ OpenLineage emitter framework

### Phase 2 (TODO)
- Implement ClickHouse sink for OpenLineage events
- Add OpenLineage emitters to all services (analytics, impact-calculator, q2q-ai)
- Implement full SBOM + provenance API endpoints
- Add ledger verification CI job (detect tampering)

### Phase 3 (TODO)
- Catalog UI in Corporate Cockpit (/catalog page)
- Dataset freshness badges
- Lineage sparkline visualization
- Drill-through: metric → evidence → Evidence Explorer

## References

- [GenAI Reporting Guide](../GenAI_Reporting.md) - AI report generation with citations
- [Evidence Lineage](../Evidence_Lineage.md) - Provenance tracking
- [GDPR Compliance](../GDPR_Compliance.md) - Privacy compliance
- [Model Governance](../Model_Governance.md) - AI model cards and oversight
- [MULTI_AGENT_PLAN](../MULTI_AGENT_PLAN.md) - Multi-agent orchestration structure
