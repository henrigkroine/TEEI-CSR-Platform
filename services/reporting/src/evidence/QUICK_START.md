# Evidence Ledger - Quick Start Guide

## 1. Setup (One-time)

### Apply Database Migration

```bash
psql $DATABASE_URL -f packages/shared-schema/migrations/0043_evidence_ledger.sql
```

### Set Environment Variables

```bash
# Generate secret key
export LEDGER_SECRET_KEY=$(openssl rand -base64 48)

# Set database URL (if not already set)
export DATABASE_URL="postgresql://user:password@localhost:5432/teei"
```

## 2. Basic Usage

### Import

```typescript
import { createEvidenceLedger } from './evidence/ledger';

const ledger = createEvidenceLedger();
```

### Add Citation

```typescript
await ledger.append({
  reportId: 'report-uuid',
  citationId: 'citation-uuid',
  action: 'ADDED',
  citationText: 'Your evidence text here',
  editor: userId,
  metadata: { reason: 'Initial generation', requestId: 'req-123' }
});
```

### Verify Integrity

```typescript
const result = await ledger.verifyIntegrity(reportId);
console.log(`Valid: ${result.valid}, Errors: ${result.errors.length}`);
```

### Detect Tampering

```typescript
const tamperLogs = await ledger.detectTampering(reportId);
if (tamperLogs.length > 0) {
  console.warn('⚠ Tampering detected!', tamperLogs);
}
```

## 3. Run Tests

```bash
pnpm test services/reporting/src/evidence/__tests__/ledger.test.ts
```

## 4. Run Example

```bash
pnpm tsx services/reporting/src/evidence/example.ts
```

## 5. API Reference

| Method | Description | Returns |
|--------|-------------|---------|
| `append(entry)` | Add new ledger entry | `Promise<LedgerEntry>` |
| `getEntries(reportId)` | Get all entries for report | `Promise<LedgerEntry[]>` |
| `verifyIntegrity(reportId)` | Verify hash chain & signatures | `Promise<VerificationResult>` |
| `detectTampering(reportId)` | Detect tampering attempts | `Promise<TamperLog[]>` |

## 6. Action Types

- `ADDED` - Citation added to report
- `MODIFIED` - Citation text changed
- `REMOVED` - Citation deleted from report

## 7. Security

- ✅ Hash chain (SHA-256) links all entries
- ✅ HMAC signatures (HMAC-SHA256) prevent tampering
- ✅ Append-only (database triggers prevent UPDATE/DELETE)
- ✅ NO PII stored (only IDs and hashes)

## 8. Troubleshooting

| Error | Solution |
|-------|----------|
| "DATABASE_URL not set" | Export DATABASE_URL environment variable |
| "LEDGER_SECRET_KEY not set" | Export LEDGER_SECRET_KEY (min 32 chars) |
| "Secret key must be at least 32 characters" | Generate with `openssl rand -base64 48` |
| "Hash chain broken" | Run `detectTampering()` to identify affected entries |
| "Invalid signature" | Check secret key hasn't changed |

## 9. Full Documentation

- README: `/services/reporting/src/evidence/README.md`
- Implementation: `/services/reporting/EVIDENCE_LEDGER_IMPLEMENTATION.md`
- Example: `/services/reporting/src/evidence/example.ts`
- Tests: `/services/reporting/src/evidence/__tests__/ledger.test.ts`
