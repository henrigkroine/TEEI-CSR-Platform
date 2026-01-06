# SBOM & SLSA-3 Quick Start Guide

## Overview
This repository now has automated SBOM generation and SLSA-3 attestation for all container images.

## What You Get Automatically

Every time you push to `main` or `develop`:

1. ✅ **Docker images built** and pushed to ghcr.io
2. ✅ **Trivy security scan** (builds fail on HIGH/CRITICAL vulnerabilities)
3. ✅ **SBOM generated** in SPDX JSON format
4. ✅ **SBOM uploaded** to S3 (2-year retention)
5. ✅ **Image signed** with Cosign (keyless)
6. ✅ **SLSA-3 provenance** attached to image
7. ✅ **Transparency log** entry in Rekor

## Quick Reference

### Verify an Image
```bash
# Verify signature
cosign verify ghcr.io/teei/api-gateway:latest

# Verify SLSA attestation
cosign verify-attestation --type slsaprovenance ghcr.io/teei/api-gateway:latest

# View provenance details
cosign verify-attestation --type slsaprovenance ghcr.io/teei/api-gateway:latest \
  | jq -r '.payload' | base64 -d | jq .
```

### Download SBOM
```bash
# From S3 (requires AWS credentials)
aws s3 cp s3://teei-sbom/api-gateway/latest/sbom.json .

# View packages
jq '.packages[] | {name, version: .versionInfo}' sbom.json | head -20
```

### Manual SBOM Generation
```bash
# Generate SBOM locally
./ops/sbom/generate.sh ghcr.io/teei/api-gateway:latest api-gateway latest

# Publish to S3 (requires AWS credentials)
./ops/sbom/publish.sh api-gateway latest sbom-api-gateway-latest.spdx.json
```

### Manual Signing
```bash
# Sign an image
./ops/slsa/attest-build.sh \
  ghcr.io/teei/api-gateway \
  sha256:abc123... \
  api-gateway \
  v1.0.0
```

## GitHub Actions Workflow

The workflow runs automatically but you can also trigger it manually:

1. Go to **Actions** → **Build, Scan, and Attest Container Images**
2. Click **Run workflow**
3. Optionally specify a service to build (leave empty for all changed services)

## Required Secrets

Before first run, configure these GitHub secrets:

| Secret | Purpose | How to Get |
|--------|---------|------------|
| `AWS_SBOM_ROLE_ARN` | S3 upload permission | Create IAM role with S3 write access |
| `GITHUB_TOKEN` | Built-in | Automatically available |

## S3 Bucket Setup

Create the SBOM bucket:

```bash
# Create bucket
aws s3 mb s3://teei-sbom --region us-east-1

# Set lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket teei-sbom \
  --lifecycle-configuration file://ops/sbom/lifecycle-policy.json
```

## Troubleshooting

### Build fails with "HIGH/CRITICAL vulnerabilities"
- Check Trivy report in GitHub Actions artifacts
- Update vulnerable dependencies in package.json/requirements.txt/go.mod
- Re-run workflow

### SBOM upload fails
- Verify `AWS_SBOM_ROLE_ARN` is set in GitHub secrets
- Check IAM role has `s3:PutObject` permission
- Verify bucket exists: `aws s3 ls s3://teei-sbom`

### Cosign signature verification fails
- Ensure you're using keyless mode: `export COSIGN_EXPERIMENTAL=true`
- Check image digest is correct (not tag)
- Verify Rekor transparency log: https://search.sigstore.dev/

## Learn More

- [Full Report](/home/user/TEEI-CSR-Platform/reports/worker1_phaseJ/sbom_slsa_summary.md)
- [SLSA Framework](https://slsa.dev/)
- [Sigstore Documentation](https://docs.sigstore.dev/)
- [SPDX Specification](https://spdx.dev/)

## Support

For questions or issues:
- Slack: #supply-chain-security
- GitHub Issues: Label with `security` and `sbom`
- Email: security@teei.io
