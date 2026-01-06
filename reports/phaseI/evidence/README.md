# Phase I Evidence Bundle

This directory contains evidence artifacts for Phase I GA Cutover validation.

## Contents

Evidence will be collected during actual deployment execution:

- **cutover-YYYYMMDD-HHMMSS/**: Pre/post cutover state captures
- **dr-test/**: DR failover drill evidence (RTO/RPO validation)
- **security/**: Security scan results, SBOMs, attestations

## Collection Scripts

Evidence is automatically collected by:

1. `scripts/dr/failover.sh` - DR drill evidence
2. `scripts/soc2/generate.sh` - Security scan evidence
3. Runbook procedures in `docs/runbooks/Runbook_GA_Cutover.md`

## Integrity

All evidence bundles include:
- SHA256 hashes (`evidence.sha256`)
- GPG signatures (`evidence.sha256.sig`)
- Timestamps (ISO 8601 UTC)

## Validation

To verify evidence integrity:

```bash
cd evidence/<bundle>/
sha256sum -c evidence.sha256
gpg --verify evidence.sha256.sig evidence.sha256
```
