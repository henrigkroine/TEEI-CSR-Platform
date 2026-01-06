#!/bin/bash
###############################################################################
# SBOM Publishing Script
#
# Uploads SBOM and metadata to S3 with proper tagging and retention
# Target: s3://teei-sbom/{service}/{version}/
#
# Usage: ./publish.sh <SERVICE> <VERSION> <SBOM_FILE>
# Example: ./publish.sh api-gateway v1.0.0 sbom-api-gateway-v1.0.0.spdx.json
###############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Input validation
if [ $# -ne 3 ]; then
    echo -e "${RED}Error: Invalid number of arguments${NC}"
    echo "Usage: $0 <SERVICE> <VERSION> <SBOM_FILE>"
    echo "Example: $0 api-gateway v1.0.0 sbom-api-gateway-v1.0.0.spdx.json"
    exit 1
fi

SERVICE=$1
VERSION=$2
SBOM_FILE=$3

# Configuration
S3_BUCKET="${SBOM_S3_BUCKET:-teei-sbom}"
RETENTION_DAYS="${SBOM_RETENTION_DAYS:-730}" # 2 years
BUILD_DATE=$(date -u +%Y-%m-%d)
GIT_SHA="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo 'unknown')}"

echo -e "${GREEN}=== SBOM Publishing ===${NC}"
echo "Service:        $SERVICE"
echo "Version:        $VERSION"
echo "SBOM File:      $SBOM_FILE"
echo "S3 Bucket:      s3://$S3_BUCKET"
echo "Retention:      $RETENTION_DAYS days"
echo ""

# Validate SBOM file exists
if [ ! -f "$SBOM_FILE" ]; then
    echo -e "${RED}Error: SBOM file not found: $SBOM_FILE${NC}"
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# S3 paths
S3_PREFIX="s3://${S3_BUCKET}/${SERVICE}/${VERSION}"
S3_SBOM_PATH="${S3_PREFIX}/sbom.json"
METADATA_FILE="${SBOM_FILE%.spdx.json}.metadata.json"

echo -e "${YELLOW}Uploading SBOM to S3...${NC}"

# Upload SBOM with tags and lifecycle policy
aws s3 cp "$SBOM_FILE" "$S3_SBOM_PATH" \
    --metadata "service=$SERVICE,version=$VERSION,build-date=$BUILD_DATE,git-sha=$GIT_SHA" \
    --tagging "service=$SERVICE&version=$VERSION&build-date=$BUILD_DATE&type=sbom&retention-days=$RETENTION_DAYS" \
    --content-type "application/json" \
    --no-progress

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SBOM uploaded successfully${NC}"
    echo "  URL: $S3_SBOM_PATH"
else
    echo -e "${RED}Error: SBOM upload failed${NC}"
    exit 1
fi

# Upload metadata if it exists
if [ -f "$METADATA_FILE" ]; then
    echo -e "${YELLOW}Uploading metadata...${NC}"
    S3_METADATA_PATH="${S3_PREFIX}/metadata.json"

    aws s3 cp "$METADATA_FILE" "$S3_METADATA_PATH" \
        --metadata "service=$SERVICE,version=$VERSION,build-date=$BUILD_DATE" \
        --tagging "service=$SERVICE&version=$VERSION&build-date=$BUILD_DATE&type=metadata" \
        --content-type "application/json" \
        --no-progress

    echo -e "${GREEN}✓ Metadata uploaded successfully${NC}"
    echo "  URL: $S3_METADATA_PATH"
fi

# Generate presigned URL for 7-day access
echo -e "${YELLOW}Generating presigned URL (7-day expiry)...${NC}"
PRESIGNED_URL=$(aws s3 presign "$S3_SBOM_PATH" --expires-in 604800)
echo -e "${GREEN}Presigned URL:${NC}"
echo "$PRESIGNED_URL"
echo ""

# Verify upload
echo -e "${YELLOW}Verifying S3 upload...${NC}"
aws s3 ls "$S3_PREFIX/" --recursive

# Set lifecycle policy for retention
echo -e "${YELLOW}Applying lifecycle policy (${RETENTION_DAYS} days retention)...${NC}"
LIFECYCLE_POLICY=$(cat <<EOF
{
  "Rules": [
    {
      "Id": "SBOM-Retention-Policy",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "${SERVICE}/"
      },
      "Expiration": {
        "Days": $RETENTION_DAYS
      },
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    }
  ]
}
EOF
)

# Note: This requires proper S3 bucket permissions
# In production, lifecycle policies should be managed via Terraform/CloudFormation
echo "$LIFECYCLE_POLICY" > /tmp/lifecycle-policy.json
aws s3api put-bucket-lifecycle-configuration \
    --bucket "$S3_BUCKET" \
    --lifecycle-configuration file:///tmp/lifecycle-policy.json \
    2>/dev/null || echo -e "${YELLOW}Note: Lifecycle policy requires bucket owner permissions${NC}"

rm -f /tmp/lifecycle-policy.json

echo ""
echo -e "${GREEN}=== SBOM Publishing Complete ===${NC}"
echo ""
echo "Access the SBOM:"
echo "  AWS CLI:  aws s3 cp $S3_SBOM_PATH ."
echo "  Public:   $PRESIGNED_URL"
echo ""
echo "SBOM Details:"
echo "  Service:  $SERVICE"
echo "  Version:  $VERSION"
echo "  Git SHA:  $GIT_SHA"
echo "  Expires:  $(date -d "+$RETENTION_DAYS days" +%Y-%m-%d 2>/dev/null || date -v +${RETENTION_DAYS}d +%Y-%m-%d)"
