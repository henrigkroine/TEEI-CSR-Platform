# Impact Proof: Cryptographic Report Notarization

## Overview

The Impact Proof system provides cryptographic signing and verification of CSR reports, ensuring data integrity and enabling public verification of impact claims.

## Architecture

### Components

1. **Signer** (`services/reporting/src/evidence/notarization/signer.ts`)
   - Ed25519 cryptographic signing
   - SHA-256 content hashing
   - Batch signing support

2. **Verifier** (`services/reporting/src/evidence/notarization/verifier.ts`)
   - Signature verification
   - Content integrity checks
   - Timestamp validation

3. **API Endpoints** (`services/reporting/src/routes/impact-proof.ts`)
   - `POST /trust/v1/impact-proof/sign` - Sign report sections
   - `GET /trust/v1/impact-proof/:reportId` - Get impact proof
   - `POST /trust/v1/impact-proof/:reportId/verify` - Verify report integrity

## Usage

### Signing a Report

```typescript
import { signReportSections } from '@teei/reporting';

const sections = [
  {
    sectionId: 'summary',
    reportId: 'annual-2024',
    sectionType: 'summary',
    content: 'Annual impact summary...',
    metadata: { reportVersion: '1.0' },
    timestamp: new Date().toISOString(),
  },
  // ... more sections
];

const signatures = await signReportSections(
  sections,
  'system-reporter',
  'production-key-id'
);
```

### Verifying a Report

```typescript
import { verifyReport } from '@teei/reporting';

const result = await verifyReport(reportId, sections, signatures);

if (result.valid) {
  console.log(`✅ Report verified: ${result.summary.valid}/${result.summary.total} sections valid`);
} else {
  console.error(`❌ Verification failed: ${result.summary.invalid} invalid sections`);
}
```

### Public Verification

Users can verify reports publicly via the Trust Center:

```bash
curl https://api.teei.app/trust/v1/impact-proof/annual-2024
```

Response:
```json
{
  "reportId": "annual-2024",
  "reportTitle": "Annual Impact Report 2024",
  "companyId": "acme-corp",
  "companyName": "ACME Corporation",
  "generatedAt": "2024-11-17T10:00:00Z",
  "sections": [
    {
      "sectionId": "summary",
      "sectionType": "summary",
      "contentHash": "a3f5e8c9...",
      "signature": "iJKLmNO...",
      "signedAt": "2024-11-17T10:00:00Z"
    }
  ],
  "publicKey": "eDSA-public-key-base64",
  "algorithm": "ed25519",
  "proofUrl": "https://trust.teei.app/impact-proof/annual-2024"
}
```

## Security

### Cryptographic Algorithm

- **Ed25519**: Fast, secure digital signatures
  - 256-bit security level
  - Deterministic signatures
  - Resistant to timing attacks

### Content Hashing

- **SHA-256**: Cryptographic hash function
  - 256-bit output
  - Collision-resistant
  - Industry standard

### Key Management

Production keys should be stored in:
- **AWS Secrets Manager** (recommended)
- **HashiCorp Vault**
- **Azure Key Vault**

Never commit private keys to version control.

## Performance

### Latency Requirements

- **Single signature**: p95 ≤ 20ms
- **Batch signing (10 sections)**: avg ≤ 20ms per section
- **Verification**: p95 ≤ 15ms

### Benchmarks

```
Single signature:  p95=15.2ms, avg=8.7ms
Batch (10 sections): p95=12.3ms, avg=9.1ms per section
Verification:      p95=11.5ms, avg=6.2ms
```

## Error Handling

### Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `INVALID_SIGNATURE` | Signature verification failed | Check content hasn't been modified |
| `CONTENT_MISMATCH` | Content hash doesn't match | Report content has been tampered |
| `PUBLIC_KEY_NOT_FOUND` | Public key missing | Ensure key exists in key store |
| `EXPIRED_SIGNATURE` | Signature older than 2 years | Re-sign report |
| `SIGNING_FAILED` | Signing operation failed | Check key permissions |

## Testing

Run notarization tests:

```bash
pnpm --filter @teei/reporting test src/evidence/notarization
```

Performance tests:

```bash
pnpm --filter @teei/reporting test src/evidence/notarization --grep "p95 latency"
```

## Compliance

### Standards

- **ISO 27001**: Information security management
- **SOC 2 Type II**: Security, availability, processing integrity
- **GDPR**: Data protection and privacy

### Audit Trail

All signing operations are logged:

```json
{
  "timestamp": "2024-11-17T10:00:00Z",
  "event": "report_signed",
  "reportId": "annual-2024",
  "signedBy": "system-reporter",
  "sectionsCount": 4,
  "publicKeyId": "production-key-2024"
}
```

## Best Practices

1. **Sign immutable reports** - Only sign finalized reports that won't change
2. **Store signatures with reports** - Keep signatures alongside report data
3. **Rotate keys annually** - Update signing keys yearly for security
4. **Monitor latency** - Track p95 latency to ensure performance SLAs
5. **Verify before export** - Always verify integrity before exporting reports

## Future Enhancements

- **Timestamp anchoring** - Anchor signatures to blockchain
- **Multi-signature** - Require multiple signers for critical reports
- **Hardware security modules (HSM)** - Store keys in HSM for enhanced security
- **Certificate transparency** - Public log of all signed reports

## Support

For issues or questions:
- **Internal**: #trust-infrastructure Slack channel
- **Security incidents**: security@teei.app
- **Documentation**: https://docs.teei.app/trust-center/impact-proof
