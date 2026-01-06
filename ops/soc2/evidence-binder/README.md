# SOC2 Evidence Binder

This directory contains SOC2 Type II compliance evidence collected quarterly for audit purposes.

## Directory Structure

```
evidence-binder/
├── 2025-Q1/
│   ├── access-reviews/          # CC6.1-6.3 evidence
│   ├── change-management/       # CC8.1 evidence
│   ├── key-rotation/           # CC6.1, CC7.2 evidence
│   ├── gdpr-compliance/        # GDPR attestation
│   ├── signatures/             # GPG signatures
│   ├── SHA256SUMS              # File checksums
│   ├── SHA256SUMS.asc          # Signed checksums
│   ├── MANIFEST.json           # Bundle metadata
│   └── soc2-evidence-bundle-2025-Q1.tar.gz
├── 2025-Q2/
└── ...
```

## Evidence Types

### Access Reviews (CC6.1-6.3)
- **Control**: Logical and Physical Access Controls
- **Frequency**: Monthly, bundled quarterly
- **Contents**:
  - User access report (CSV)
  - ServiceAccount inventory
  - RBAC role bindings
  - Last login timestamps
  - Orphaned account detection

### Change Management (CC8.1)
- **Control**: Change Management Process
- **Frequency**: Continuous, reported quarterly
- **Contents**:
  - Git commit history
  - PR approval trail
  - JIRA ticket linkage
  - Deployment logs
  - Rollback tracking

### Key Rotation (CC6.1, CC7.2)
- **Control**: Access Controls, Security Monitoring
- **Frequency**: Quarterly rotation, continuous tracking
- **Contents**:
  - Secret rotation timeline
  - Certificate renewal logs
  - Vault secret versions
  - Auto-rotation status

### GDPR Compliance
- **Regulation**: GDPR Articles 32, 44, 46
- **Frequency**: Continuous monitoring, quarterly attestation
- **Contents**:
  - Data residency attestation
  - Cross-region access violations
  - PII access audit trail
  - Zero-violation certification

## Collection Schedule

Evidence is automatically collected on:
- **Q1**: January 1st
- **Q2**: April 1st
- **Q3**: July 1st
- **Q4**: October 1st

Cron job: `0 0 1 1,4,7,10 * /home/user/TEEI-CSR-Platform/scripts/soc2/collect-quarterly-evidence.sh`

## Manual Collection

To manually collect evidence for the current quarter:

```bash
cd /home/user/TEEI-CSR-Platform/scripts/soc2
./collect-quarterly-evidence.sh
```

To collect for a specific quarter:

```bash
QUARTER=2025-Q1 ./collect-quarterly-evidence.sh
```

## Evidence Verification

To verify evidence bundle integrity:

```bash
cd /home/user/TEEI-CSR-Platform/ops/soc2/evidence-binder/2025-Q1

# Verify bundle signature
gpg --verify soc2-evidence-bundle-2025-Q1.tar.gz.asc \
             soc2-evidence-bundle-2025-Q1.tar.gz

# Verify file checksums
gpg --verify SHA256SUMS.asc SHA256SUMS
sha256sum -c SHA256SUMS
```

Expected output:
```
gpg: Good signature from "TEEI SOC2 Evidence Signer <soc2-evidence@teei-csr.com>"
```

## Upload to Auditor

To upload evidence bundle to auditor portal:

```bash
cd /home/user/TEEI-CSR-Platform/scripts/soc2
./upload-to-audit-portal.sh
```

Configure upload method via environment variables:
```bash
# S3 Upload
UPLOAD_METHOD=s3 S3_BUCKET=my-evidence-bucket ./upload-to-audit-portal.sh

# SFTP Upload
UPLOAD_METHOD=sftp SFTP_HOST=auditor.com SFTP_USER=teei ./upload-to-audit-portal.sh

# API Upload
UPLOAD_METHOD=api API_ENDPOINT=https://api.auditor.com/v1/evidence ./upload-to-audit-portal.sh
```

## Retention Policy

- **Active Evidence**: 2 years in hot storage
- **Archive**: 7 years in cold storage (S3 Glacier)
- **Compliance Requirement**: Maintain evidence for duration of SOC2 certification + 7 years

## Security

- All evidence files are cryptographically signed with GPG
- Bundle tampering will be detected during verification
- Evidence stored with AES-256 encryption at rest
- Access restricted to compliance team and auditors

## SOC2 Controls Coverage

| Control | Description | Evidence Source |
|---------|-------------|-----------------|
| CC6.1 | Logical and Physical Access Controls | Access Reviews, Key Rotation |
| CC6.2 | Prior to Issuing System Credentials | Access Reviews |
| CC6.3 | Removes Access When Appropriate | Access Reviews (orphaned accounts) |
| CC7.2 | System Monitoring | Key Rotation, SIEM logs |
| CC8.1 | Change Management Process | Change Management Log |
| CC9.1 | Availability | Backup logs, uptime metrics |

## Contacts

- **DPO**: dpo@teei-csr.com
- **Compliance Team**: compliance@teei-csr.com
- **Security Team**: security@teei-csr.com
- **External Auditor**: auditor@audit-firm.com

## Troubleshooting

### Evidence Collection Fails

Check the collection log:
```bash
tail -f /home/user/TEEI-CSR-Platform/ops/soc2/evidence-binder/2025-Q1/collection-log-*.txt
```

Common issues:
- OpenSearch SIEM not accessible
- Insufficient Kubernetes permissions
- GPG key not configured

### Signature Verification Fails

Import the public key:
```bash
gpg --import signatures/public-key.asc
```

Re-verify:
```bash
gpg --verify SHA256SUMS.asc SHA256SUMS
```

### Upload Fails

Check credentials and connectivity:
```bash
# S3
aws s3 ls s3://teei-soc2-evidence-auditor/

# SFTP
sftp user@auditor.com

# API
curl -H "Authorization: Bearer $AUDITOR_API_TOKEN" https://api.auditor.com/v1/evidence/ping
```

## Automation

Evidence collection is fully automated via:

1. **Kubernetes CronJob**: Runs collection script quarterly
2. **SIEM Integration**: Real-time event capture
3. **Prometheus Metrics**: Collection status tracking
4. **Alert Routing**: Failures trigger PagerDuty alerts
5. **Grafana Dashboard**: SOC2 compliance visibility

Monitor collection status:
- Dashboard: https://grafana.teei-csr.com/d/soc2-compliance
- Prometheus: `soc2_evidence_collected{quarter="2025-Q1"}`

## Documentation

For detailed SIEM and SOC2 architecture:
- [/docs/SIEM_SOC2.md](/docs/SIEM_SOC2.md)
- [/k8s/base/siem/README.md](/k8s/base/siem/README.md)
