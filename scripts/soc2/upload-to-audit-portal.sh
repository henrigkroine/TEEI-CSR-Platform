#!/bin/bash
# Upload SOC2 Evidence Bundle to Secure Auditor Portal
# Uses secure transfer methods (SFTP, S3, or auditor-specific API)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-/home/user/TEEI-CSR-Platform/ops/soc2/evidence-binder}"
QUARTER="${QUARTER:-$(date +%Y-Q$(($(date +%-m)/3+1)))}"

# Auditor portal configuration (customize per auditor)
UPLOAD_METHOD="${UPLOAD_METHOD:-s3}"  # s3, sftp, or api
S3_BUCKET="${S3_BUCKET:-teei-soc2-evidence-auditor}"
SFTP_HOST="${SFTP_HOST:-sftp.auditor.com}"
SFTP_USER="${SFTP_USER:-teei-evidence}"
API_ENDPOINT="${API_ENDPOINT:-https://api.auditor.com/v1/evidence}"

echo "=== SOC2 Evidence Upload ==="
echo "Quarter: $QUARTER"
echo "Upload Method: $UPLOAD_METHOD"

BUNDLE_FILE="$OUTPUT_DIR/$QUARTER/soc2-evidence-bundle-$QUARTER.tar.gz"
SIGNATURE_FILE="$BUNDLE_FILE.asc"
MANIFEST_FILE="$OUTPUT_DIR/$QUARTER/MANIFEST.json"

# Verify bundle exists
if [ ! -f "$BUNDLE_FILE" ]; then
  echo "ERROR: Evidence bundle not found: $BUNDLE_FILE"
  echo "Run collect-quarterly-evidence.sh first."
  exit 1
fi

# Verify signature exists
if [ ! -f "$SIGNATURE_FILE" ]; then
  echo "ERROR: Signature file not found: $SIGNATURE_FILE"
  exit 1
fi

# Verify signature before upload
echo "Verifying bundle signature..."
if gpg --verify "$SIGNATURE_FILE" "$BUNDLE_FILE" 2>&1 | grep -q "Good signature"; then
  echo "✓ Signature verified"
else
  echo "✗ Signature verification failed!"
  echo "Bundle may be tampered. Aborting upload."
  exit 1
fi

case "$UPLOAD_METHOD" in
  s3)
    echo "Uploading to S3 bucket: $S3_BUCKET..."

    if ! command -v aws &> /dev/null; then
      echo "ERROR: AWS CLI not found"
      exit 1
    fi

    # Upload bundle
    aws s3 cp "$BUNDLE_FILE" \
      "s3://$S3_BUCKET/$QUARTER/$(basename "$BUNDLE_FILE")" \
      --storage-class STANDARD_IA \
      --metadata "quarter=$QUARTER,uploaded=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --sse AES256

    # Upload signature
    aws s3 cp "$SIGNATURE_FILE" \
      "s3://$S3_BUCKET/$QUARTER/$(basename "$SIGNATURE_FILE")" \
      --storage-class STANDARD_IA \
      --sse AES256

    # Upload manifest
    aws s3 cp "$MANIFEST_FILE" \
      "s3://$S3_BUCKET/$QUARTER/$(basename "$MANIFEST_FILE")" \
      --storage-class STANDARD_IA \
      --sse AES256

    # Generate presigned URL for auditor (valid for 7 days)
    PRESIGNED_URL=$(aws s3 presign \
      "s3://$S3_BUCKET/$QUARTER/$(basename "$BUNDLE_FILE")" \
      --expires-in 604800)

    echo ""
    echo "✓ Upload successful"
    echo "Bundle URL (valid 7 days): $PRESIGNED_URL"
    ;;

  sftp)
    echo "Uploading via SFTP to: $SFTP_HOST..."

    if ! command -v sftp &> /dev/null; then
      echo "ERROR: SFTP not found"
      exit 1
    fi

    # Create SFTP batch file
    BATCH_FILE=$(mktemp)
    cat > "$BATCH_FILE" <<SFTP
mkdir $QUARTER
cd $QUARTER
put $BUNDLE_FILE
put $SIGNATURE_FILE
put $MANIFEST_FILE
bye
SFTP

    # Upload
    sftp -b "$BATCH_FILE" "$SFTP_USER@$SFTP_HOST"
    rm -f "$BATCH_FILE"

    echo "✓ Upload successful"
    ;;

  api)
    echo "Uploading via API to: $API_ENDPOINT..."

    if ! command -v curl &> /dev/null; then
      echo "ERROR: curl not found"
      exit 1
    fi

    # Upload bundle
    RESPONSE=$(curl -X POST "$API_ENDPOINT/upload" \
      -H "Authorization: Bearer ${AUDITOR_API_TOKEN}" \
      -F "quarter=$QUARTER" \
      -F "bundle=@$BUNDLE_FILE" \
      -F "signature=@$SIGNATURE_FILE" \
      -F "manifest=@$MANIFEST_FILE" \
      -w "%{http_code}" \
      -o /tmp/upload-response.json)

    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "201" ]; then
      echo "✓ Upload successful"
      cat /tmp/upload-response.json
    else
      echo "✗ Upload failed (HTTP $RESPONSE)"
      cat /tmp/upload-response.json
      exit 1
    fi
    ;;

  *)
    echo "ERROR: Unknown upload method: $UPLOAD_METHOD"
    echo "Supported methods: s3, sftp, api"
    exit 1
    ;;
esac

# Record upload event
UPLOAD_LOG="$OUTPUT_DIR/$QUARTER/upload-log.txt"
cat >> "$UPLOAD_LOG" <<EOF
=== Evidence Upload ===
Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Quarter: $QUARTER
Method: $UPLOAD_METHOD
Bundle: $(basename "$BUNDLE_FILE")
Size: $(du -h "$BUNDLE_FILE" | cut -f1)
Signature Verified: Yes
Uploaded By: $(whoami)
Status: SUCCESS

EOF

echo ""
echo "Upload log: $UPLOAD_LOG"

# Send notification email
if command -v mail &> /dev/null; then
  cat <<EMAIL | mail -s "SOC2 Evidence Uploaded - $QUARTER" \
    dpo@teei-csr.com,compliance@teei-csr.com,auditor@audit-firm.com
SOC2 Type II Evidence Upload Notification

Quarter: $QUARTER
Upload Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Upload Method: $UPLOAD_METHOD

Evidence Bundle:
- File: $(basename "$BUNDLE_FILE")
- Size: $(du -h "$BUNDLE_FILE" | cut -f1)
- Signature: Verified

The evidence bundle is now available for audit review.

Access Details:
$(if [ "$UPLOAD_METHOD" = "s3" ]; then
  echo "S3 Bucket: $S3_BUCKET/$QUARTER/"
  echo "Presigned URL: $PRESIGNED_URL"
elif [ "$UPLOAD_METHOD" = "sftp" ]; then
  echo "SFTP: $SFTP_HOST/$QUARTER/"
else
  echo "API: $API_ENDPOINT"
fi)

Next Steps:
1. Auditor to verify bundle signature
2. Schedule evidence review meeting
3. Address any findings or questions

For questions, contact:
- DPO: dpo@teei-csr.com
- Compliance: compliance@teei-csr.com

This is an automated notification from the TEEI SOC2 Evidence System.
EMAIL
fi

echo ""
echo "✓ Evidence upload complete"
echo "Auditor has been notified"

exit 0
