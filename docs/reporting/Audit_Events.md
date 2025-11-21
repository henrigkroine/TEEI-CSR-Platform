# Audit Events for Reporting Service

## Overview

The reporting service emits audit events for compliance tracking and forensic investigation. These events are published to NATS and persisted to the `audit_logs` table with a 6-year retention policy (GDPR Article 30 requirement).

## Event Types

### 1. Citation Edited Event (`reporting.citation.edited`)

**Emitted when**: A citation is added, modified, or removed in the evidence ledger.

**Schema**:
```typescript
{
  id: string (UUID)
  type: 'reporting.citation.edited'
  version: 'v1'
  timestamp: string (ISO datetime)
  data: {
    reportId: string (UUID)
    citationId: string (UUID)
    action: 'ADDED' | 'MODIFIED' | 'REMOVED'
    editor: string (UUID) // userId or 'system'
    previousHash?: string
    newHash: string
    metadata?: {
      ipAddress?: string
      userAgent?: string
      reason?: string
      requestId?: string
    }
  }
}
```

**Example**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "type": "reporting.citation.edited",
  "version": "v1",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "data": {
    "reportId": "223e4567-e89b-12d3-a456-426614174000",
    "citationId": "323e4567-e89b-12d3-a456-426614174000",
    "action": "ADDED",
    "editor": "user-123",
    "newHash": "abc123def456",
    "metadata": {
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0",
      "reason": "Initial report generation",
      "requestId": "req-123"
    }
  }
}
```

**NATS Subject**: `reporting.citation.edited`

**Retention**: 6 years (GDPR compliance)

---

### 2. Redaction Completed Event (`reporting.redaction.completed`)

**Emitted when**: PII redaction is completed on evidence snippets before LLM processing.

**Schema**:
```typescript
{
  id: string (UUID)
  type: 'reporting.redaction.completed'
  version: 'v1'
  timestamp: string (ISO datetime)
  data: {
    reportId: string (UUID)
    companyId: string (UUID)
    snippetsProcessed: number
    piiDetectedCount: number
    piiRemovedCount: number
    leaksDetected: number // Should always be 0 if successful
    success: boolean
    durationMs: number
    timestamp: string (ISO datetime)
  }
}
```

**Example**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "type": "reporting.redaction.completed",
  "version": "v1",
  "timestamp": "2025-11-17T10:31:00.000Z",
  "data": {
    "reportId": "223e4567-e89b-12d3-a456-426614174000",
    "companyId": "323e4567-e89b-12d3-a456-426614174000",
    "snippetsProcessed": 150,
    "piiDetectedCount": 25,
    "piiRemovedCount": 25,
    "leaksDetected": 0,
    "success": true,
    "durationMs": 1250,
    "timestamp": "2025-11-17T10:31:00.000Z"
  }
}
```

**NATS Subject**: `reporting.redaction.completed`

**Retention**: 6 years (GDPR compliance)

**Alerts**:
- If `leaksDetected > 0`: Critical alert (PII leak detected)
- If `success = false`: High priority alert (redaction failed)

---

### 3. Evidence Gate Violation Event (`reporting.evidence_gate.violation`)

**Emitted when**: A report fails citation validation due to insufficient evidence.

**Schema**:
```typescript
{
  id: string (UUID)
  type: 'reporting.evidence_gate.violation'
  version: 'v1'
  timestamp: string (ISO datetime)
  data: {
    reportId: string (UUID)
    companyId: string (UUID)
    violations: Array<{
      paragraph: string
      citationCount: number
      requiredCount: number
    }>
    totalCitationCount: number
    totalParagraphCount: number
    citationDensity: number
    rejected: boolean
    timestamp: string (ISO datetime)
  }
}
```

**Example**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "type": "reporting.evidence_gate.violation",
  "version": "v1",
  "timestamp": "2025-11-17T10:32:00.000Z",
  "data": {
    "reportId": "223e4567-e89b-12d3-a456-426614174000",
    "companyId": "323e4567-e89b-12d3-a456-426614174000",
    "violations": [
      {
        "paragraph": "Paragraph 1 without sufficient evidence...",
        "citationCount": 0,
        "requiredCount": 1
      },
      {
        "paragraph": "Paragraph 2 also lacking citations...",
        "citationCount": 0,
        "requiredCount": 1
      }
    ],
    "totalCitationCount": 5,
    "totalParagraphCount": 10,
    "citationDensity": 0.5,
    "rejected": true,
    "timestamp": "2025-11-17T10:32:00.000Z"
  }
}
```

**NATS Subject**: `reporting.evidence_gate.violation`

**Retention**: 6 years (GDPR compliance)

**Alerts**:
- If `rejected = true`: High priority alert (report generation blocked)
- If `citationDensity < 0.5`: Warning (low citation density)

---

## Integration Points

### 1. Evidence Ledger (`services/reporting/src/evidence/ledger.ts`)

The evidence ledger emits `CitationEditedEvent` every time a citation is added, modified, or removed:

```typescript
import { getAuditIntegration } from '../lib/audit-integration.js';

async append(input: AppendLedgerEntryInput): Promise<LedgerEntry> {
  // ... ledger append logic ...

  // Emit audit event
  const auditIntegration = getAuditIntegration();
  await auditIntegration.emitCitationEdited({
    reportId: input.reportId,
    citationId: input.citationId,
    action: input.action,
    editor: input.editor,
    previousHash: previousHash || undefined,
    newHash: contentHash,
    metadata: input.metadata,
  });

  return entry;
}
```

### 2. Report Generation (`services/reporting/src/routes/gen-reports.ts`)

The report generator emits:
- `RedactionCompletedEvent` after PII redaction
- `EvidenceGateViolationEvent` when citation validation fails

```typescript
import { getAuditIntegration } from '../lib/audit-integration.js';

// After redaction
const auditIntegration = getAuditIntegration();
await auditIntegration.emitRedactionCompleted({
  reportId: reportId,
  companyId: request.companyId,
  snippetsProcessed: evidenceSnippets.length,
  piiDetectedCount: totalRedactions,
  piiRemovedCount: totalRedactions,
  leaksDetected: 0,
  success: true,
  durationMs: redactionDurationMs,
});

// On citation validation failure
await auditIntegration.emitEvidenceGateViolation({
  reportId: reportId,
  companyId: request.companyId,
  violations: validation.violations,
  totalCitationCount: validation.citationCount,
  totalParagraphCount: validation.paragraphCount,
  citationDensity: validation.citationDensity,
  rejected: true,
});
```

---

## NATS Configuration

### Subject Routing

All reporting audit events are published to subjects matching the event type:
- `reporting.citation.edited`
- `reporting.redaction.completed`
- `reporting.evidence_gate.violation`

### Stream Configuration

Events are persisted to the `AUDIT_EVENTS` JetStream:

```bash
nats stream add AUDIT_EVENTS \
  --subjects "reporting.*" \
  --storage file \
  --retention limits \
  --max-age 6y \
  --replicas 3
```

### Consumer Groups

Multiple consumers can subscribe to audit events:

1. **Audit Logger** (`audit-logger-consumer`): Writes events to `audit_logs` table
2. **Alerting** (`audit-alerting-consumer`): Triggers alerts on critical events
3. **Analytics** (`audit-analytics-consumer`): Aggregates metrics for dashboards

---

## Error Handling

Audit event emission is **non-blocking**. If NATS is unavailable or event publishing fails:

1. The error is logged (warning level)
2. The operation continues normally
3. No exception is thrown

**Rationale**: Audit failures should never block core business operations (report generation).

**Monitoring**: Track audit event emission failures via:
- Prometheus metric: `audit_event_emission_failures_total`
- Grafana dashboard: "Reporting Service > Audit Health"
- Alert: Fire if failure rate > 5% over 5 minutes

---

## Security & Compliance

### NO PII in Events

**Critical**: Audit events MUST NOT contain PII. Only aggregated counts, IDs, and hashes.

❌ **Bad**:
```json
{
  "data": {
    "userName": "John Doe",
    "email": "john@example.com"
  }
}
```

✅ **Good**:
```json
{
  "data": {
    "editor": "user-123-uuid",
    "metadata": {
      "ipAddress": "192.168.1.1"
    }
  }
}
```

### GDPR Retention

All audit events are subject to a **6-year retention policy** per GDPR Article 30 (record-keeping requirements).

Retention is enforced at two levels:
1. **NATS Stream**: `--max-age 6y`
2. **Database**: `retention_until` column in `audit_logs` table

Automated purge job runs daily:
```typescript
await auditLogger.purgeExpiredLogs();
```

### Access Control

Audit event access is restricted to:
- **SRE/Operations team**: Read access for incident response
- **Compliance team**: Full access for audits
- **Data Protection Officer**: Full access for GDPR compliance

RBAC enforced via:
- NATS ACLs (subject-based)
- Database row-level security (company_id filtering)

---

## Testing

### Unit Tests

Event schema validation:
```bash
pnpm test packages/event-contracts/src/reporting/__tests__/reporting-events.test.ts
```

Audit integration tests:
```bash
pnpm test services/reporting/src/routes/__tests__/audit-events.test.ts
```

### Integration Tests

End-to-end audit event flow:
```bash
pnpm test:e2e tests/e2e/audit-events-flow.test.ts
```

Test coverage target: **≥90%**

---

## Monitoring & Alerting

### Grafana Dashboards

**Dashboard**: "Reporting Service > Audit Events"

**Panels**:
1. Audit Event Rate (events/sec by type)
2. Citation Edits (by action: ADDED/MODIFIED/REMOVED)
3. Redaction Success Rate (%)
4. Evidence Gate Violations (count over time)
5. PII Leaks Detected (should always be 0)
6. Event Emission Failures (error rate)

### Prometheus Metrics

```promql
# Event emission rate
rate(audit_events_emitted_total{service="reporting"}[5m])

# Redaction success rate
sum(rate(redaction_completed_total{success="true"}[5m])) /
sum(rate(redaction_completed_total[5m]))

# Evidence gate violation rate
rate(evidence_gate_violations_total{rejected="true"}[5m])

# PII leak detections (MUST be 0)
sum(redaction_leaks_detected_total)
```

### Alerts

```yaml
groups:
  - name: reporting_audit
    rules:
      - alert: PiiLeakDetected
        expr: redaction_leaks_detected_total > 0
        for: 1m
        severity: critical
        annotations:
          summary: "PII leak detected in redaction process"

      - alert: HighEvidenceGateViolationRate
        expr: rate(evidence_gate_violations_total{rejected="true"}[5m]) > 0.1
        for: 5m
        severity: warning
        annotations:
          summary: "High rate of evidence gate violations"

      - alert: AuditEventEmissionFailures
        expr: rate(audit_event_emission_failures_total[5m]) > 0.05
        for: 5m
        severity: warning
        annotations:
          summary: "Audit event emission failure rate above 5%"
```

---

## Runbook

### Investigating Citation Edits

1. Query NATS for citation edited events:
```bash
nats stream view AUDIT_EVENTS \
  --subject "reporting.citation.edited" \
  --since 1h
```

2. Query audit_logs table:
```sql
SELECT * FROM audit_logs
WHERE resource_type = 'citation'
  AND action IN ('CREATE', 'UPDATE', 'DELETE')
  AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

### Responding to PII Leak Alert

**CRITICAL**: PII leak detected in redaction process.

1. **Immediate**:
   - Stop all report generation (circuit breaker)
   - Notify DPO and security team
   - Isolate affected reports

2. **Investigation**:
   - Query redaction events with `leaksDetected > 0`
   - Review redaction rules in `/services/reporting/src/lib/redaction.ts`
   - Check for new PII patterns not covered by rules

3. **Remediation**:
   - Update redaction rules
   - Re-run redaction on affected snippets
   - Verify no PII in LLM provider logs
   - Update incident log

4. **Recovery**:
   - Deploy fix
   - Re-enable report generation
   - Monitor for 24 hours

### Troubleshooting Evidence Gate Violations

1. Check violation details:
```bash
nats stream view AUDIT_EVENTS \
  --subject "reporting.evidence_gate.violation" \
  --last 10
```

2. Analyze citation density trends:
```sql
SELECT
  DATE_TRUNC('hour', timestamp) AS hour,
  AVG((metadata->>'citationDensity')::float) AS avg_density,
  COUNT(*) AS violation_count
FROM audit_logs
WHERE action = 'EVIDENCE_GATE_VIOLATION'
GROUP BY hour
ORDER BY hour DESC;
```

3. Common causes:
   - Insufficient evidence data (run Q2Q pipeline)
   - LLM failing to include citations (adjust prompts)
   - Citation extraction regex failing (review `/services/reporting/src/lib/citations.ts`)

---

## References

- [Gen-AI Reporting Documentation](/docs/GenAI_Reporting.md)
- [Audit Logger SDK](/packages/compliance/src/audit-logger.ts)
- [Event Contracts](/packages/event-contracts/src/reporting/)
- [GDPR Article 30](https://gdpr-info.eu/art-30-gdpr/)
- [NATS JetStream Documentation](https://docs.nats.io/nats-concepts/jetstream)
