#!/bin/bash
# SOC2 Evidence Signing Script
# GPG-signs evidence bundles for tamper-proofing

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-/home/user/TEEI-CSR-Platform/ops/soc2/evidence-binder}"
QUARTER="${QUARTER:-$(date +%Y-Q$(($(date +%-m)/3+1)))}"
GPG_KEY_ID="${GPG_KEY_ID:-soc2-evidence@teei-csr.com}"

echo "=== SOC2 Evidence Signing ==="
echo "Quarter: $QUARTER"
echo "GPG Key: $GPG_KEY_ID"

# Check if GPG is available
if ! command -v gpg &> /dev/null; then
  echo "ERROR: GPG not found. Install gpg to sign evidence."
  exit 1
fi

# Check if evidence directory exists
if [ ! -d "$OUTPUT_DIR/$QUARTER" ]; then
  echo "ERROR: Evidence directory not found: $OUTPUT_DIR/$QUARTER"
  exit 1
fi

# Create signatures directory
mkdir -p "$OUTPUT_DIR/$QUARTER/signatures"

# Create evidence bundle
BUNDLE_FILE="$OUTPUT_DIR/$QUARTER/soc2-evidence-bundle-$QUARTER.tar.gz"
echo "Creating evidence bundle..."
tar -czf "$BUNDLE_FILE" \
  -C "$OUTPUT_DIR" \
  "$QUARTER/access-reviews" \
  "$QUARTER/change-management" \
  "$QUARTER/key-rotation" \
  "$QUARTER/gdpr-compliance" \
  2>/dev/null || true

# Generate checksums
echo "Generating checksums..."
CHECKSUMS_FILE="$OUTPUT_DIR/$QUARTER/SHA256SUMS"
cd "$OUTPUT_DIR/$QUARTER"

find . -type f \( -name "*.csv" -o -name "*.json" -o -name "*.txt" \) -exec sha256sum {} \; > "$CHECKSUMS_FILE"

# Sign the checksums file
echo "Signing checksums..."
gpg --default-key "$GPG_KEY_ID" \
    --armor \
    --detach-sign \
    --output "$CHECKSUMS_FILE.asc" \
    "$CHECKSUMS_FILE" 2>/dev/null || {
  echo "WARNING: GPG signing failed. Attempting to create key..."

  # Generate GPG key if it doesn't exist
  cat > /tmp/gpg-key-gen.txt <<GPGKEY
%no-protection
Key-Type: RSA
Key-Length: 4096
Name-Real: TEEI SOC2 Evidence Signer
Name-Email: $GPG_KEY_ID
Expire-Date: 2y
%commit
GPGKEY

  gpg --batch --gen-key /tmp/gpg-key-gen.txt 2>/dev/null || true
  rm -f /tmp/gpg-key-gen.txt

  # Retry signing
  gpg --default-key "$GPG_KEY_ID" \
      --armor \
      --detach-sign \
      --output "$CHECKSUMS_FILE.asc" \
      "$CHECKSUMS_FILE" 2>/dev/null || {
    echo "ERROR: Failed to sign evidence. Manual signing required."
    exit 1
  }
}

# Sign the entire bundle
echo "Signing evidence bundle..."
gpg --default-key "$GPG_KEY_ID" \
    --armor \
    --detach-sign \
    --output "$BUNDLE_FILE.asc" \
    "$BUNDLE_FILE"

# Export public key for auditors
GPG_PUBLIC_KEY="$OUTPUT_DIR/$QUARTER/signatures/public-key.asc"
gpg --armor --export "$GPG_KEY_ID" > "$GPG_PUBLIC_KEY"

# Generate signature verification instructions
cat > "$OUTPUT_DIR/$QUARTER/signatures/VERIFICATION.txt" <<EOF
=== SOC2 Evidence Bundle Verification ===

This evidence bundle has been cryptographically signed to ensure integrity
and prevent tampering.

Bundle: $(basename "$BUNDLE_FILE")
Quarter: $QUARTER
Signed: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Signer: $GPG_KEY_ID

VERIFICATION INSTRUCTIONS:

1. Import the public key:
   gpg --import public-key.asc

2. Verify the bundle signature:
   gpg --verify $(basename "$BUNDLE_FILE.asc") $(basename "$BUNDLE_FILE")

3. Verify individual file checksums:
   gpg --verify SHA256SUMS.asc SHA256SUMS
   sha256sum -c SHA256SUMS

Expected output:
   gpg: Good signature from "TEEI SOC2 Evidence Signer <$GPG_KEY_ID>"
   All files should show "OK" in checksum verification

SIGNATURE DETAILS:

Bundle Signature:
$(gpg --verify "$BUNDLE_FILE.asc" "$BUNDLE_FILE" 2>&1 | head -n5)

Checksums Signature:
$(gpg --verify "$CHECKSUMS_FILE.asc" "$CHECKSUMS_FILE" 2>&1 | head -n5)

FILE INVENTORY:

$(cd "$OUTPUT_DIR/$QUARTER" && find . -type f -name "*.csv" -o -name "*.json" -o -name "*.txt" | sort)

TAMPER DETECTION:

If verification fails, the evidence bundle has been tampered with and should
not be accepted for audit purposes. Contact security@teei-csr.com immediately.

CHAIN OF CUSTODY:

Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Signed By: Automated SOC2 Evidence Collector
GPG Key ID: $(gpg --list-keys "$GPG_KEY_ID" 2>/dev/null | grep -A1 "^pub" | tail -n1 | awk '{print $1}')
Storage: TEEI Secure Evidence Repository

For questions or verification issues, contact:
- DPO: dpo@teei-csr.com
- Security: security@teei-csr.com
- Compliance: compliance@teei-csr.com
EOF

# Generate manifest
cat > "$OUTPUT_DIR/$QUARTER/MANIFEST.json" <<EOF
{
  "evidence_bundle": {
    "quarter": "$QUARTER",
    "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "bundle_file": "$(basename "$BUNDLE_FILE")",
    "bundle_size_bytes": $(stat -f%z "$BUNDLE_FILE" 2>/dev/null || stat -c%s "$BUNDLE_FILE"),
    "signature_file": "$(basename "$BUNDLE_FILE.asc")",
    "gpg_key_id": "$GPG_KEY_ID"
  },
  "contents": {
    "access_reviews": $(find "$OUTPUT_DIR/$QUARTER/access-reviews" -type f | wc -l),
    "change_management": $(find "$OUTPUT_DIR/$QUARTER/change-management" -type f | wc -l),
    "key_rotation": $(find "$OUTPUT_DIR/$QUARTER/key-rotation" -type f | wc -l),
    "gdpr_compliance": $(find "$OUTPUT_DIR/$QUARTER/gdpr-compliance" -type f | wc -l)
  },
  "checksums": {
    "file": "SHA256SUMS",
    "signature": "SHA256SUMS.asc",
    "total_files": $(wc -l < "$CHECKSUMS_FILE")
  },
  "verification": {
    "instructions": "signatures/VERIFICATION.txt",
    "public_key": "signatures/public-key.asc"
  },
  "controls_covered": [
    "CC6.1: Logical and Physical Access Controls",
    "CC6.2: Prior to Issuing System Credentials",
    "CC6.3: Removes Access When Appropriate",
    "CC7.2: System Monitoring",
    "CC8.1: Change Management Process",
    "CC9.1: Availability",
    "GDPR: Data Residency Compliance"
  ]
}
EOF

echo ""
echo "=== Evidence Bundle Signed Successfully ==="
echo "Bundle: $BUNDLE_FILE"
echo "Size: $(du -h "$BUNDLE_FILE" | cut -f1)"
echo "Signature: $BUNDLE_FILE.asc"
echo "Public Key: $GPG_PUBLIC_KEY"
echo ""
echo "Verification command:"
echo "  gpg --verify $BUNDLE_FILE.asc $BUNDLE_FILE"
echo ""
echo "Files signed:"
echo "  - Evidence bundle: $(basename "$BUNDLE_FILE")"
echo "  - Checksums: SHA256SUMS"
echo "  - Total files: $(wc -l < "$CHECKSUMS_FILE")"
echo ""

# Record signing event
if command -v curl &> /dev/null && [ -n "${PUSHGATEWAY_URL:-}" ]; then
  cat <<METRICS | curl --data-binary @- "$PUSHGATEWAY_URL/metrics/job/soc2/instance/evidence-signing"
soc2_evidence_signed{quarter="$QUARTER"} 1
soc2_evidence_bundle_size_bytes{quarter="$QUARTER"} $(stat -f%z "$BUNDLE_FILE" 2>/dev/null || stat -c%s "$BUNDLE_FILE")
soc2_evidence_files_count{quarter="$QUARTER"} $(wc -l < "$CHECKSUMS_FILE")
METRICS
fi

exit 0
