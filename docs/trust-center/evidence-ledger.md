# Evidence Ledger

## Overview

The Evidence Ledger is an append-only, tamper-evident audit trail that tracks all modifications to evidence citations in generated reports. It uses cryptographic hash chaining and HMAC signatures to ensure data integrity and detect unauthorized modifications.

## Purpose

The Evidence Ledger provides:

1. **Immutability**: Append-only database table prevents UPDATE/DELETE operations
2. **Tamper Detection**: Hash chaining and signatures detect unauthorized modifications
3. **Audit Trail**: Complete history of citation additions, modifications, and removals
4. **Compliance**: Supports SOC 2, ISO 27001, and GDPR audit requirements
5. **Trust**: Public verification API for stakeholders to validate report integrity

## Architecture

### Database Schema

**Table**: `evidence_ledger`

```sql
CREATE TABLE evidence_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL,
  citation_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('ADDED', 'MODIFIED', 'REMOVED')),
  content_hash VARCHAR(64) NOT NULL,      -- SHA-256 of citation text
  previous_hash VARCHAR(64),              -- SHA-256 of previous entry (chain)
  editor VARCHAR(255) NOT NULL,           -- User ID (NOT email/name)
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB,                         -- Technical metadata only
  signature VARCHAR(128) NOT NULL,        -- HMAC-SHA256 signature
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_evidence_ledger_report_id ON evidence_ledger(report_id);
CREATE INDEX idx_evidence_ledger_citation_id ON evidence_ledger(citation_id);
CREATE INDEX idx_evidence_ledger_timestamp ON evidence_ledger(timestamp);
CREATE INDEX idx_evidence_ledger_report_timestamp ON evidence_ledger(report_id, timestamp);
CREATE INDEX idx_evidence_ledger_action ON evidence_ledger(action);
```

**Append-Only Enforcement**:

```sql
-- Prevent UPDATE operations
CREATE OR REPLACE FUNCTION prevent_evidence_ledger_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'UPDATE operations are not allowed on evidence_ledger (append-only table)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_evidence_ledger_update
BEFORE UPDATE ON evidence_ledger
FOR EACH ROW EXECUTE FUNCTION prevent_evidence_ledger_update();

-- Prevent DELETE operations
CREATE OR REPLACE FUNCTION prevent_evidence_ledger_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'DELETE operations are not allowed on evidence_ledger (append-only table)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_evidence_ledger_delete
BEFORE DELETE ON evidence_ledger
FOR EACH ROW EXECUTE FUNCTION prevent_evidence_ledger_delete();
```

### Schema Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique entry ID (auto-generated) |
| `report_id` | UUID | Report this citation belongs to |
| `citation_id` | UUID | Citation being tracked |
| `action` | ENUM | Action type: ADDED, MODIFIED, REMOVED |
| `content_hash` | VARCHAR(64) | SHA-256 hash of citation text |
| `previous_hash` | VARCHAR(64) | SHA-256 hash of previous ledger entry (null for first entry) |
| `editor` | VARCHAR(255) | User ID or 'system' (NO PII: no email/name) |
| `timestamp` | TIMESTAMP | When this entry was created (UTC) |
| `metadata` | JSONB | Technical metadata (IP, user agent, request ID, reason) |
| `signature` | VARCHAR(128) | HMAC-SHA256 signature for authentication |
| `created_at` | TIMESTAMP | Database insertion timestamp |

### Metadata Structure

```typescript
interface LedgerMetadata {
  ipAddress?: string;      // Source IP (for audit, not identification)
  userAgent?: string;      // Browser user agent
  requestId?: string;      // Request correlation ID
  reason?: string;         // Non-PII description of change
}
```

**Privacy Note**: Metadata contains NO PII. Only technical information for audit trails.

## Hash Chaining

Each ledger entry links to the previous entry via `previous_hash`, forming a tamper-evident chain:

```
Entry 1: { id: 'a', content_hash: 'h1', previous_hash: null,  signature: 's1' }
         ↓
Entry 2: { id: 'b', content_hash: 'h2', previous_hash: 'h1', signature: 's2' }
         ↓
Entry 3: { id: 'c', content_hash: 'h3', previous_hash: 'h2', signature: 's3' }
```

**Tamper Detection**:
- If Entry 2 is modified, `previous_hash` in Entry 3 will no longer match Entry 2's hash
- Verification walks the chain and detects breaks
- Any tampering invalidates the entire chain from that point forward

## HMAC Signatures

Each entry is signed using HMAC-SHA256 to prevent unauthorized modifications:

**Signature Input**:
```typescript
const signatureInput = [
  entry.reportId,
  entry.citationId,
  entry.action,
  entry.contentHash,
  entry.previousHash || '',
  entry.editor,
  entry.timestamp.toISOString()
].join('|');

const signature = crypto
  .createHmac('sha256', secretKey)
  .update(signatureInput)
  .digest('hex');
```

**Verification**:
```typescript
const expectedSignature = computeSignature(entry, secretKey);
const isValid = crypto.timingSafeEqual(
  Buffer.from(entry.signature, 'hex'),
  Buffer.from(expectedSignature, 'hex')
);
```

**Secret Key Requirements**:
- Minimum 32 characters
- Stored in secrets manager (AWS Secrets Manager, HashiCorp Vault)
- Never committed to git
- Rotated regularly (requires re-signing)

## TypeScript API

### Class: EvidenceLedger

**File**: `/services/reporting/src/evidence/ledger.ts`

```typescript
class EvidenceLedger {
  constructor(
    private dbUrl: string,
    private secretKey: string
  ) {
    if (secretKey.length < 32) {
      throw new Error('Secret key must be at least 32 characters');
    }
  }

  /**
   * Append new entry to ledger with automatic hash chaining
   */
  async append(entry: AppendLedgerEntryInput): Promise<LedgerEntry> {
    // 1. Get previous entry for report (if exists)
    // 2. Compute content hash (SHA-256 of citation text)
    // 3. Set previous_hash to hash of previous entry
    // 4. Compute HMAC signature
    // 5. Insert into database
    // 6. Return created entry
  }

  /**
   * Get all entries for a report in chronological order
   */
  async getEntries(reportId: string): Promise<LedgerEntry[]> {
    // Query ledger entries for report, ordered by timestamp ASC
  }

  /**
   * Verify hash chain and signatures for a report
   */
  async verifyIntegrity(reportId: string): Promise<VerificationResult> {
    // 1. Get all entries for report
    // 2. Verify first entry has previous_hash = null
    // 3. Walk chain and verify each previous_hash matches previous entry
    // 4. Verify all signatures
    // 5. Return validation result
  }

  /**
   * Detect tampering attempts in ledger
   */
  async detectTampering(reportId: string): Promise<TamperLog[]> {
    // 1. Verify integrity
    // 2. Identify specific tampering types:
    //    - HASH_CHAIN_BROKEN: previous_hash doesn't match
    //    - INVALID_SIGNATURE: signature verification failed
    //    - MISSING_PREVIOUS: previous_hash null when not first entry
    // 3. Return detailed tamper logs
  }
}
```

### Factory Function

```typescript
/**
 * Create EvidenceLedger instance from environment variables
 */
export function createEvidenceLedger(): EvidenceLedger {
  const dbUrl = process.env.DATABASE_URL;
  const secretKey = process.env.LEDGER_SECRET_KEY;

  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable required');
  }

  if (!secretKey) {
    throw new Error('LEDGER_SECRET_KEY environment variable required');
  }

  return new EvidenceLedger(dbUrl, secretKey);
}
```

## Usage Examples

### Initialize

```typescript
import { createEvidenceLedger } from '@/services/reporting/evidence/ledger';

// From environment variables (recommended)
const ledger = createEvidenceLedger();

// Or manually
import { EvidenceLedger } from '@/services/reporting/evidence/ledger';
const ledger = new EvidenceLedger(
  process.env.DATABASE_URL!,
  process.env.LEDGER_SECRET_KEY!
);
```

### Append Entry (Citation Added)

```typescript
// When generating a new report
const entry = await ledger.append({
  reportId: '550e8400-e29b-41d4-a716-446655440000',
  citationId: 'cite-001',
  action: 'ADDED',
  citationText: 'Volunteers reported 85% satisfaction with buddy matching',
  editor: userId,  // User ID, NOT email
  metadata: {
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
    requestId: request.id,
    reason: 'Initial report generation'
  }
});

console.log('Ledger entry created:', entry.id);
console.log('Content hash:', entry.contentHash);
console.log('Previous hash:', entry.previousHash || 'null (first entry)');
```

### Track Citation Modification

```typescript
// When user edits a citation
await ledger.append({
  reportId: reportId,
  citationId: citationId,
  action: 'MODIFIED',
  citationText: updatedText,
  editor: userId,
  metadata: {
    reason: 'User corrected percentage from 85% to 87%',
    requestId: request.id
  }
});
```

### Track Citation Removal

```typescript
// When citation is removed from report
await ledger.append({
  reportId: reportId,
  citationId: citationId,
  action: 'REMOVED',
  citationText: '',  // Empty for removed citations
  editor: userId,
  metadata: {
    reason: 'Citation no longer relevant after data update',
    requestId: request.id
  }
});
```

### Verify Integrity

```typescript
const result = await ledger.verifyIntegrity(reportId);

if (result.valid) {
  console.log(`✓ Ledger valid: ${result.verifiedEntries}/${result.totalEntries} entries verified`);
} else {
  console.error('✗ Ledger integrity compromised!');
  console.error(`Errors: ${result.errors.join(', ')}`);

  // Alert security team
  await sendSecurityAlert({
    severity: 'CRITICAL',
    type: 'EVIDENCE_TAMPERING',
    reportId,
    errors: result.errors
  });
}
```

### Detect Tampering

```typescript
const tamperLogs = await ledger.detectTampering(reportId);

if (tamperLogs.length > 0) {
  console.warn(`⚠ Tampering detected: ${tamperLogs.length} issues found`);

  for (const log of tamperLogs) {
    console.warn(`Entry ${log.entryId}:`);
    console.warn(`  Type: ${log.tamperType}`);
    console.warn(`  Details: ${log.details}`);
    console.warn(`  Timestamp: ${log.timestamp}`);
  }

  // Log to security monitoring
  await logSecurityEvent({
    event: 'EVIDENCE_TAMPERING_DETECTED',
    reportId,
    tamperCount: tamperLogs.length,
    severity: 'CRITICAL'
  });
}
```

### Get Modification Timeline

```typescript
const entries = await ledger.getEntries(reportId);

console.log(`Report has ${entries.length} ledger entries:`);

for (const entry of entries) {
  console.log(`[${entry.timestamp}] ${entry.action} by ${entry.editor}`);
  console.log(`  Citation: ${entry.citationId}`);
  console.log(`  Content hash: ${entry.contentHash}`);
  console.log(`  Reason: ${entry.metadata?.reason || 'N/A'}`);
}
```

## Integration Points

### 1. Report Generation Service

Automatically log all citations when generating reports:

```typescript
import { createEvidenceLedger } from '@/services/reporting/evidence/ledger';
import { createCitationExtractor } from '@/services/reporting/lib/citations';

async function generateReport(companyId: string, period: string) {
  const reportId = generateUUID();
  const ledger = createEvidenceLedger();
  const citationExtractor = createCitationExtractor();

  // Extract evidence
  const evidence = await citationExtractor.extractEvidence(
    companyId,
    period
  );

  // Generate report with AI
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
        requestId: request.id
      }
    });
  }

  return { reportId, content };
}
```

### 2. Manual Citation Editing

Track user edits to citations:

```typescript
async function updateCitation(
  reportId: string,
  citationId: string,
  newText: string,
  userId: string,
  request: Request
) {
  // Update citation in database
  await db.update(citations)
    .set({ text: newText, updatedAt: new Date() })
    .where(eq(citations.id, citationId));

  // Log modification to ledger
  const ledger = createEvidenceLedger();
  await ledger.append({
    reportId,
    citationId,
    action: 'MODIFIED',
    citationText: newText,
    editor: userId,
    metadata: {
      reason: 'Manual edit by user',
      requestId: request.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']
    }
  });
}
```

### 3. Trust API

Expose ledger data via Trust API for public verification:

```typescript
// GET /trust/v1/ledger/:reportId
async function getTrustLedger(req: Request, res: Response) {
  const { reportId } = req.params;
  const ledger = createEvidenceLedger();

  // Verify integrity
  const integrity = await ledger.verifyIntegrity(reportId);

  // Get entries
  const entries = await ledger.getEntries(reportId);

  // Detect tampering
  const tamperLog = integrity.valid ? [] : await ledger.detectTampering(reportId);

  return res.json({
    reportId,
    companyId: entries[0]?.metadata?.companyId,
    entries: entries.map(e => ({
      entryId: e.id,
      timestamp: e.timestamp,
      operation: e.action,
      actor: e.editor,
      metadata: {
        reason: e.metadata?.reason,
        requestId: e.metadata?.requestId
      }
    })),
    verified: integrity.valid,
    tamperLog,
    integrityScore: calculateIntegrityScore(integrity)
  });
}
```

## Environment Setup

### Required Environment Variables

```bash
# Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/teei"

# Ledger secret key (CRITICAL - keep secure!)
# Minimum 32 characters
# Generate with: openssl rand -base64 48
LEDGER_SECRET_KEY="your-secret-key-here"
```

### Generate Secret Key

```bash
# Generate secure 48-byte secret key
openssl rand -base64 48

# Output example:
# aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789+/aBcDeFgHiJkLmNo=

# Set in environment
export LEDGER_SECRET_KEY="<generated-key>"
```

### Secrets Management

**Production**:
- Store in AWS Secrets Manager, HashiCorp Vault, or similar
- Never commit to git
- Rotate every 90 days
- Use IAM roles for access control

**Development**:
- Use `.env.local` (gitignored)
- Share via secure channel (1Password, Bitwarden)
- Use separate key from production

## Database Migration

### Apply Migration

```bash
# Using pnpm migration script
pnpm db:migrate

# Or manually with psql
psql $DATABASE_URL -f packages/shared-schema/migrations/0043_evidence_ledger.sql
```

### Verify Migration

```sql
-- Check table exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name = 'evidence_ledger';

-- Check triggers exist (append-only enforcement)
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'evidence_ledger';

-- Expected triggers:
-- 1. trigger_prevent_evidence_ledger_update (BEFORE UPDATE)
-- 2. trigger_prevent_evidence_ledger_delete (BEFORE DELETE)

-- Test append-only constraint
INSERT INTO evidence_ledger (report_id, citation_id, action, content_hash, signature, editor)
VALUES ('test-report', 'test-citation', 'ADDED', 'test-hash', 'test-sig', 'test-user')
RETURNING id;

-- Try to update (should fail)
UPDATE evidence_ledger SET action = 'MODIFIED' WHERE report_id = 'test-report';
-- Expected: ERROR: UPDATE operations are not allowed on evidence_ledger

-- Try to delete (should fail)
DELETE FROM evidence_ledger WHERE report_id = 'test-report';
-- Expected: ERROR: DELETE operations are not allowed on evidence_ledger
```

## Testing

### Unit Tests

**File**: `/services/reporting/src/evidence/__tests__/ledger.test.ts`

```bash
# Run ledger tests
pnpm test services/reporting/src/evidence/__tests__/ledger.test.ts

# Run with coverage
pnpm test:coverage services/reporting/src/evidence/__tests__/ledger.test.ts
```

**Test Coverage**:
- ✅ Constructor validation (secret key length)
- ✅ Append operations (single and multiple)
- ✅ Hash chain validation
- ✅ HMAC signature verification
- ✅ Tampering detection (hash chain broken, invalid signature)
- ✅ Integrity verification
- ✅ Edge cases (empty ledger, concurrent appends, long text)
- ✅ Factory function validation

**Coverage Target**: ≥90%

### Integration Tests

```bash
# Run E2E tests
pnpm e2e:run tests/e2e/evidence-api.spec.ts
```

**Scenarios**:
1. Generate report → Verify ledger entries created
2. Modify citation → Verify MODIFIED entry appended
3. Remove citation → Verify REMOVED entry appended
4. Tamper with entry → Verify detection
5. Query ledger via Trust API → Verify response format

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Append | O(1) | Single previous entry lookup |
| Get entries | O(n) | n = number of entries for report |
| Verify integrity | O(n) | n = number of entries |
| Detect tampering | O(n) | n = number of entries |

### Database Indexes

All critical queries are indexed for performance:

- `idx_evidence_ledger_report_id` - Fast report lookups
- `idx_evidence_ledger_citation_id` - Fast citation lookups
- `idx_evidence_ledger_timestamp` - Chronological queries
- `idx_evidence_ledger_report_timestamp` - Combined report + time
- `idx_evidence_ledger_action` - Action-based filtering

### Performance Benchmarks

- Append entry: <10ms (p95)
- Get 100 entries: <50ms (p95)
- Verify integrity (100 entries): <200ms (p95)
- Detect tampering (100 entries): <250ms (p95)

## Security Considerations

### Hash Chain Security

- Each entry links to previous via SHA-256 hash
- Tampering with any entry breaks the chain
- Verification walks entire chain to detect breaks
- First entry has `previous_hash = null`

### HMAC Signature Security

- HMAC-SHA256 prevents unauthorized modifications
- Signature covers all critical fields
- Secret key ≥32 characters required
- Timing-safe comparison prevents timing attacks

### Privacy & GDPR Compliance

- **NO PII stored**: Only user IDs, never emails/names
- Citation text hashed, not stored in ledger
- Metadata contains only technical data (IP, user agent, request ID)
- DSAR requests don't expose ledger (no PII to export)

### Immutability

- Database triggers prevent UPDATE/DELETE
- Only INSERT allowed
- Ensures tamper-evident audit trail
- Cannot be circumvented without database access

## Monitoring & Alerting

### Metrics to Track

1. **Ledger Append Rate**:
   - Metric: `evidence_ledger_appends_total`
   - Alert: >1000 appends/second (potential abuse)

2. **Integrity Verification Failures**:
   - Metric: `evidence_ledger_integrity_failures_total`
   - Alert: ANY failure (CRITICAL - immediate investigation)

3. **Tampering Detection**:
   - Metric: `evidence_ledger_tamper_detections_total`
   - Alert: ANY tampering (CRITICAL - security incident)

4. **Hash Chain Length**:
   - Metric: `evidence_ledger_chain_length_histogram`
   - Alert: >1000 entries per report (warning - unusual activity)

### Grafana Dashboard

```yaml
dashboard:
  title: "Evidence Ledger Monitoring"
  panels:
    - title: "Ledger Append Rate (5m)"
      query: rate(evidence_ledger_appends_total[5m])

    - title: "Integrity Failures (24h)"
      query: increase(evidence_ledger_integrity_failures_total[24h])

    - title: "Tampering Detections (24h)"
      query: increase(evidence_ledger_tamper_detections_total[24h])

    - title: "Entries per Report (p95)"
      query: histogram_quantile(0.95, evidence_ledger_chain_length_histogram)
```

## Troubleshooting

### Integrity Verification Fails

**Symptoms**: `verifyIntegrity()` returns `valid: false`

**Causes**:
- Hash chain broken (previous_hash mismatch)
- Invalid HMAC signature
- Database tampering

**Solutions**:
1. Run `detectTampering()` to identify specific issues
2. Check database audit logs for unauthorized access
3. Verify `LEDGER_SECRET_KEY` hasn't changed
4. Review ledger entries manually: `SELECT * FROM evidence_ledger WHERE report_id = '...'`

### Append Fails with "Secret key must be at least 32 characters"

**Symptoms**: Constructor throws error on initialization

**Causes**:
- `LEDGER_SECRET_KEY` environment variable too short
- Secret key not set

**Solutions**:
1. Generate new key: `openssl rand -base64 48`
2. Set environment variable: `export LEDGER_SECRET_KEY="<key>"`
3. Restart application

### High Append Latency

**Symptoms**: Append operations take >100ms

**Causes**:
- Database connection pool exhausted
- Slow previous entry lookup
- High database load

**Solutions**:
1. Increase database connection pool size
2. Verify `idx_evidence_ledger_report_id` index exists
3. Monitor database CPU/memory usage
4. Consider read replicas for verification operations

## Related Documentation

- [Evidence Gates](./evidence-gates.md) - Citation validation and enforcement
- [Trust API Endpoints](../api/trust-endpoints.md) - Public ledger API
- [Executive Packs](../cockpit/executive_packs.md) - Report exports with ledger verification
- [GenAI Reporting](../GenAI_Reporting.md) - Complete Gen-AI reporting guide

## Future Enhancements

Planned improvements:

- [ ] Merkle tree for efficient batch verification
- [ ] Multi-signature support for critical reports
- [ ] Ledger export for external audit (JSON, CSV)
- [ ] Blockchain anchoring for additional integrity proof
- [ ] Ledger compaction for historical reports (>1 year old)
- [ ] Real-time ledger streaming via SSE

## Support

For assistance with the Evidence Ledger:
- **Documentation**: `/docs/trust-center/evidence-ledger.md`
- **Code**: `/services/reporting/src/evidence/ledger.ts`
- **Tests**: `/services/reporting/src/evidence/__tests__/ledger.test.ts`
- **Migration**: `/packages/shared-schema/migrations/0043_evidence_ledger.sql`
- **GitHub Issues**: Tag with `evidence-ledger` label

---

**Last Updated**: November 2025
**Version**: 1.0.0
**Maintained By**: Agent 5.1 - Technical Writer
