#!/bin/bash
###############################################################################
# SBOM Generation Script
#
# Generates Software Bill of Materials (SBOM) for Docker images using Syft
# Output format: SPDX JSON (industry standard)
#
# Usage: ./generate.sh <IMAGE> <SERVICE> <VERSION>
# Example: ./generate.sh ghcr.io/teei/api-gateway:v1.0.0 api-gateway v1.0.0
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
    echo "Usage: $0 <IMAGE> <SERVICE> <VERSION>"
    echo "Example: $0 ghcr.io/teei/api-gateway:v1.0.0 api-gateway v1.0.0"
    exit 1
fi

IMAGE=$1
SERVICE=$2
VERSION=$3

echo -e "${GREEN}=== SBOM Generation ===${NC}"
echo "Image:   $IMAGE"
echo "Service: $SERVICE"
echo "Version: $VERSION"
echo ""

# Output file
OUTPUT_FILE="sbom-${SERVICE}-${VERSION}.spdx.json"
echo -e "${YELLOW}Generating SBOM to: ${OUTPUT_FILE}${NC}"

# Check if Syft is installed
if ! command -v syft &> /dev/null; then
    echo -e "${RED}Error: Syft is not installed${NC}"
    echo "Install with: curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin"
    exit 1
fi

# Generate SBOM using Syft
# - Scans all layers of the Docker image
# - Includes OS packages (apk, dpkg, rpm) and application dependencies (npm, pip, go, etc.)
# - Output format: SPDX JSON (ISO/IEC 5962:2021 standard)
echo -e "${YELLOW}Running Syft scan...${NC}"
syft packages "$IMAGE" \
    --output spdx-json \
    --file "$OUTPUT_FILE" \
    --quiet

# Validate SBOM was created
if [ ! -f "$OUTPUT_FILE" ]; then
    echo -e "${RED}Error: SBOM generation failed${NC}"
    exit 1
fi

# Get file size and package count
FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
PACKAGE_COUNT=$(jq '.packages | length' "$OUTPUT_FILE" 2>/dev/null || echo "unknown")

echo -e "${GREEN}✓ SBOM generated successfully${NC}"
echo "  File: $OUTPUT_FILE"
echo "  Size: $FILE_SIZE"
echo "  Packages: $PACKAGE_COUNT"
echo ""

# Display top-level dependencies summary
echo -e "${YELLOW}Package Summary:${NC}"
jq -r '.packages[] | "\(.name) - \(.versionInfo)"' "$OUTPUT_FILE" | sort | head -20
echo ""

# Generate metadata file
METADATA_FILE="sbom-${SERVICE}-${VERSION}.metadata.json"
cat > "$METADATA_FILE" <<EOF
{
  "service": "$SERVICE",
  "version": "$VERSION",
  "image": "$IMAGE",
  "sbom_format": "spdx-json",
  "sbom_version": "2.3",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "tool": "syft",
  "package_count": $PACKAGE_COUNT,
  "file_size_bytes": $(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE")
}
EOF

echo -e "${GREEN}✓ Metadata saved to: ${METADATA_FILE}${NC}"
echo ""
echo -e "${GREEN}=== SBOM Generation Complete ===${NC}"
