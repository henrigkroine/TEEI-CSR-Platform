# Evidence Ledger

Append-only tamper-evident ledger for tracking evidence/citation modifications in reports.

## Features

- **Append-only**: Entries cannot be updated or deleted (enforced at database level)
- **Hash chaining**: Each entry links to the previous via SHA-256 hash
- **HMAC signatures**: Cryptographic signatures for authentication
- **Tamper detection**: Detect and log any tampering attempts
- **Privacy-first**: NO PII stored (only IDs and hashes)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Evidence Ledger                          │
├─────────────────────────────────────────────────────────────┤
│  Entry 1                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ id: uuid-1                                          │   │
│  │ reportId: report-1                                  │   │
│  │ citationId: citation-1                              │   │
│  │ action: ADDED                                       │   │
│  │ contentHash: sha256(citation text)                  │   │
│  │ previousHash: null  ← First entry                   │   │
│  │ signature: hmac(entry data)                         │   │
│  │ editor: user-123                                    │   │
│  │ timestamp: 2025-11-17T10:00:00Z                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                        ↓                                    │
│  Entry 2                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ id: uuid-2                                          │   │
│  │ reportId: report-1                                  │   │
│  │ citationId: citation-2                              │   │
│  │ action: ADDED                                       │   │
│  │ contentHash: sha256(citation text)                  │   │
│  │ previousHash: sha256(Entry 1) ← Chain link          │   │
│  │ signature: hmac(entry data)                         │   │
│  │ editor: user-123                                    │   │
│  │ timestamp: 2025-11-17T10:01:00Z                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                        ↓                                    │
│  Entry 3 ...                                                │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Initialize

```typescript
import { createEvidenceLedger } from './evidence/ledger';

// From environment variables
const ledger = createEvidenceLedger();

// Or manually
import { EvidenceLedger } from './evidence/ledger';
const ledger = new EvidenceLedger(
  process.env.DATABASE_URL,
  process.env.LEDGER_SECRET_KEY
);
```

### Append Entry

```typescript
// When a citation is added to a report
const entry = await ledger.append({
  reportId: report.id,
  citationId: citation.id,
  action: 'ADDED',
  citationText: citation.text, // Used for hashing only, NOT stored
  editor: userId,
  metadata: {
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    reason: 'Initial report generation',
    requestId: request.id,
  },
});

console.log('Ledger entry created:', entry.id);
console.log('Content hash:', entry.contentHash);
console.log('Signature:', entry.signature);
```

### Track Modifications

```typescript
// When a citation is modified
await ledger.append({
  reportId: report.id,
  citationId: citation.id,
  action: 'MODIFIED',
  citationText: updatedCitation.text,
  editor: userId,
  metadata: {
    reason: 'Manual edit by user',
    requestId: request.id,
  },
});

// When a citation is removed
await ledger.append({
  reportId: report.id,
  citationId: citation.id,
  action: 'REMOVED',
  citationText: '', // Empty for removed citations
  editor: userId,
  metadata: {
    reason: 'Citation no longer relevant',
    requestId: request.id,
  },
});
```

### Retrieve Entries

```typescript
// Get all entries for a report (chronological order)
const entries = await ledger.getEntries(reportId);

entries.forEach(entry => {
  console.log(`${entry.timestamp}: ${entry.action} citation ${entry.citationId} by ${entry.editor}`);
});
```

### Verify Integrity

```typescript
// Verify hash chain and signatures
const result = await ledger.verifyIntegrity(reportId);

if (result.valid) {
  console.log(`✓ Ledger valid: ${result.verifiedEntries}/${result.totalEntries} entries verified`);
} else {
  console.error(`✗ Ledger integrity compromised!`);
  result.errors.forEach(error => console.error(`  - ${error}`));
}
```

### Detect Tampering

```typescript
// Detect and log tampering attempts
const tamperLogs = await ledger.detectTampering(reportId);

if (tamperLogs.length === 0) {
  console.log('No tampering detected');
} else {
  console.warn(`⚠ Tampering detected: ${tamperLogs.length} issues`);

  tamperLogs.forEach(log => {
    console.warn(`Entry ${log.entryId} (${log.timestamp}):`);
    console.warn(`  Type: ${log.tamperType}`);
    console.warn(`  Details: ${log.details}`);
    console.warn(`  Affected entry:`, log.affectedEntry);
  });
}
```

## Integration Example

### In Report Generation Service

```typescript
import { createEvidenceLedger } from './evidence/ledger';
import { createCitationExtractor } from './lib/citations';

const ledger = createEvidenceLedger();
const citationExtractor = createCitationExtractor();

async function generateReport(companyId: string, periodStart: Date, periodEnd: Date) {
  // Extract evidence
  const evidence = await citationExtractor.extractEvidence(
    companyId,
    periodStart,
    periodEnd
  );

  // Generate report content
  const reportId = generateUUID();
  const content = await generateReportContent(evidence);

  // Log all citations to ledger
  for (const snippet of evidence) {
    await ledger.append({
      reportId,
      citationId: snippet.id,
      action: 'ADDED',
      citationText: snippet.text,
      editor: 'system',
      metadata: {
        reason: 'Initial report generation',
        requestId: requestId,
      },
    });
  }

  return { reportId, content };
}
```

### In Audit Service

```typescript
import { createEvidenceLedger } from './evidence/ledger';

const ledger = createEvidenceLedger();

async function auditReport(reportId: string) {
  // Verify integrity
  const integrity = await ledger.verifyIntegrity(reportId);

  if (!integrity.valid) {
    // Alert on tampering
    const tamperLogs = await ledger.detectTampering(reportId);

    await sendSecurityAlert({
      severity: 'CRITICAL',
      type: 'EVIDENCE_TAMPERING',
      reportId,
      tamperCount: tamperLogs.length,
      details: tamperLogs,
    });

    return {
      status: 'COMPROMISED',
      tamperLogs,
    };
  }

  // Get modification history
  const entries = await ledger.getEntries(reportId);

  return {
    status: 'VALID',
    totalModifications: entries.length,
    timeline: entries.map(e => ({
      timestamp: e.timestamp,
      action: e.action,
      editor: e.editor,
    })),
  };
}
```

## Security Considerations

### Secret Key Management

- **NEVER commit secret key to git**
- Use environment variables or secrets manager
- Rotate keys regularly (requires re-signing all entries)
- Minimum 32 characters for security

```bash
# Generate secure secret key
openssl rand -base64 48

# Set environment variable
export LEDGER_SECRET_KEY="<generated-key>"
```

### Privacy

- **NO PII stored**: Only user IDs, never emails or names
- Citation text is hashed, never stored in ledger
- Metadata contains only technical data (IP, user agent, request ID)

### Immutability

- Database triggers prevent UPDATE/DELETE on ledger table
- Hash chain ensures chronological integrity
- HMAC signatures ensure authenticity

## Database Schema

```sql
CREATE TABLE evidence_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL,
  citation_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('ADDED', 'MODIFIED', 'REMOVED')),
  content_hash VARCHAR(64) NOT NULL,
  previous_hash VARCHAR(64),
  signature VARCHAR(64) NOT NULL,
  editor VARCHAR(100) NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_evidence_ledger_report_id ON evidence_ledger(report_id);
CREATE INDEX idx_evidence_ledger_citation_id ON evidence_ledger(citation_id);
CREATE INDEX idx_evidence_ledger_timestamp ON evidence_ledger(timestamp);

-- Append-only enforcement
CREATE TRIGGER trigger_prevent_evidence_ledger_update
  BEFORE UPDATE ON evidence_ledger
  FOR EACH ROW EXECUTE FUNCTION prevent_evidence_ledger_modification();

CREATE TRIGGER trigger_prevent_evidence_ledger_delete
  BEFORE DELETE ON evidence_ledger
  FOR EACH ROW EXECUTE FUNCTION prevent_evidence_ledger_modification();
```

## Testing

```bash
# Run tests
pnpm test services/reporting/src/evidence/__tests__/ledger.test.ts

# Run tests with coverage
pnpm test:coverage services/reporting/src/evidence/__tests__/ledger.test.ts
```

Target: ≥90% coverage

## Performance

- **Append**: O(1) with single previous entry lookup
- **Get entries**: O(n) where n = number of entries for report
- **Verify integrity**: O(n) where n = number of entries
- **Detect tampering**: O(n) where n = number of entries

Indexes ensure fast lookups by report_id and citation_id.

## Monitoring

### Metrics to Track

- Ledger append rate (entries/second)
- Integrity verification failures
- Tampering detection alerts
- Hash chain length (entries per report)

### Alerts

- **CRITICAL**: Tampering detected in ledger
- **WARNING**: Integrity verification failed
- **INFO**: High append rate (potential abuse)

## Troubleshooting

### Signature Verification Fails

**Cause**: Secret key changed or entry data modified

**Solution**:
1. Check LEDGER_SECRET_KEY environment variable
2. Verify key hasn't changed since entry creation
3. If key rotation needed, contact security team

### Hash Chain Broken

**Cause**: Entry modified or deleted outside ledger API

**Solution**:
1. Run integrity verification to identify broken link
2. Check database audit logs for unauthorized access
3. Restore from backup if tampering confirmed

### Append-only Constraint Error

**Cause**: Attempted UPDATE or DELETE on ledger table

**Solution**:
1. Never directly modify ledger table
2. Use ledger.append() API only
3. Contact compliance team if entry must be removed

## Future Enhancements

- [ ] Merkle tree for efficient batch verification
- [ ] Multi-signature support for critical reports
- [ ] Ledger export for external audit
- [ ] Blockchain anchoring for additional integrity proof
- [ ] Ledger compaction for historical reports

## References

- [NIST Blockchain Technology Overview](https://nvlpubs.nist.gov/nistpubs/ir/2018/NIST.IR.8202.pdf)
- [SHA-256 Specification](https://tools.ietf.org/html/rfc6234)
- [HMAC-SHA256 Specification](https://tools.ietf.org/html/rfc2104)
