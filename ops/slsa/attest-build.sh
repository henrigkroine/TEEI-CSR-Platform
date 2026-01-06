#!/bin/bash
###############################################################################
# SLSA-3 Build Attestation Script
#
# Signs container images with Cosign and attaches SLSA Level 3 provenance
# SLSA (Supply-chain Levels for Software Artifacts) provides build integrity
#
# Usage: ./attest-build.sh <IMAGE> <DIGEST> <SERVICE> <VERSION>
# Example: ./attest-build.sh ghcr.io/teei/api-gateway sha256:abc123... api-gateway v1.0.0
###############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Input validation
if [ $# -ne 4 ]; then
    echo -e "${RED}Error: Invalid number of arguments${NC}"
    echo "Usage: $0 <IMAGE> <DIGEST> <SERVICE> <VERSION>"
    echo "Example: $0 ghcr.io/teei/api-gateway sha256:abc123... api-gateway v1.0.0"
    exit 1
fi

IMAGE=$1
DIGEST=$2
SERVICE=$3
VERSION=$4

# Build identifiers
GIT_SHA="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo 'unknown')}"
GIT_REF="${GITHUB_REF:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')}"
BUILD_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
BUILDER="${GITHUB_ACTOR:-$(whoami)}"
WORKFLOW_NAME="${GITHUB_WORKFLOW:-manual}"
RUN_ID="${GITHUB_RUN_ID:-local}"
REPOSITORY="${GITHUB_REPOSITORY:-teei/csr-platform}"

echo -e "${GREEN}=== SLSA-3 Build Attestation ===${NC}"
echo "Image:      $IMAGE"
echo "Digest:     $DIGEST"
echo "Service:    $SERVICE"
echo "Version:    $VERSION"
echo "Git SHA:    $GIT_SHA"
echo "Builder:    $BUILDER"
echo ""

# Check if Cosign is installed
if ! command -v cosign &> /dev/null; then
    echo -e "${RED}Error: Cosign is not installed${NC}"
    echo "Install with: go install github.com/sigstore/cosign/cmd/cosign@latest"
    exit 1
fi

# Full image reference with digest
IMAGE_DIGEST="${IMAGE}@${DIGEST}"

###############################################################################
# Step 1: Generate SLSA Provenance Predicate
###############################################################################
echo -e "${YELLOW}Generating SLSA provenance predicate...${NC}"

PROVENANCE_FILE="slsa-provenance-${SERVICE}-${VERSION}.json"

cat > "$PROVENANCE_FILE" <<EOF
{
  "_type": "https://in-toto.io/Statement/v0.1",
  "predicateType": "https://slsa.dev/provenance/v0.2",
  "subject": [
    {
      "name": "${IMAGE}",
      "digest": {
        "sha256": "${DIGEST#sha256:}"
      }
    }
  ],
  "predicate": {
    "builder": {
      "id": "https://github.com/${REPOSITORY}/actions/workflows/${WORKFLOW_NAME}"
    },
    "buildType": "https://github.com/Attestations/GitHubActionsWorkflow@v1",
    "invocation": {
      "configSource": {
        "uri": "git+https://github.com/${REPOSITORY}@refs/heads/${GIT_REF#refs/heads/}",
        "digest": {
          "sha1": "$GIT_SHA"
        },
        "entryPoint": ".github/workflows/build-and-attest.yml"
      },
      "parameters": {
        "service": "$SERVICE",
        "version": "$VERSION"
      },
      "environment": {
        "github_actor": "$BUILDER",
        "github_run_id": "$RUN_ID",
        "github_ref": "$GIT_REF"
      }
    },
    "buildConfig": {
      "service": "$SERVICE",
      "version": "$VERSION",
      "dockerfile": "services/${SERVICE}/Dockerfile"
    },
    "metadata": {
      "buildInvocationId": "$RUN_ID",
      "buildStartedOn": "$BUILD_TIMESTAMP",
      "buildFinishedOn": "$BUILD_TIMESTAMP",
      "completeness": {
        "parameters": true,
        "environment": true,
        "materials": true
      },
      "reproducible": false
    },
    "materials": [
      {
        "uri": "git+https://github.com/${REPOSITORY}@${GIT_SHA}",
        "digest": {
          "sha1": "$GIT_SHA"
        }
      }
    ]
  }
}
EOF

echo -e "${GREEN}✓ SLSA provenance generated${NC}"
echo "  File: $PROVENANCE_FILE"

# Validate JSON
if ! jq empty "$PROVENANCE_FILE" 2>/dev/null; then
    echo -e "${RED}Error: Invalid JSON in provenance file${NC}"
    exit 1
fi

###############################################################################
# Step 2: Sign the Image with Cosign (Keyless)
###############################################################################
echo -e "${YELLOW}Signing image with Cosign (keyless)...${NC}"

# Using COSIGN_EXPERIMENTAL=true for keyless signing with Sigstore
# This uses Fulcio (certificate authority) and Rekor (transparency log)
export COSIGN_EXPERIMENTAL=${COSIGN_EXPERIMENTAL:-true}

# Sign the image
if [ "$COSIGN_EXPERIMENTAL" = "true" ]; then
    echo -e "${YELLOW}Using keyless signing (Sigstore Fulcio + Rekor)${NC}"
    cosign sign --yes "$IMAGE_DIGEST" 2>&1 | tee cosign-sign.log
else
    echo -e "${YELLOW}Using key-based signing${NC}"
    if [ ! -f "cosign.key" ]; then
        echo -e "${RED}Error: cosign.key not found${NC}"
        echo "Generate with: cosign generate-key-pair"
        exit 1
    fi
    cosign sign --key cosign.key "$IMAGE_DIGEST" 2>&1 | tee cosign-sign.log
fi

echo -e "${GREEN}✓ Image signed successfully${NC}"

###############################################################################
# Step 3: Attach SLSA Provenance Attestation
###############################################################################
echo -e "${YELLOW}Attaching SLSA provenance attestation...${NC}"

if [ "$COSIGN_EXPERIMENTAL" = "true" ]; then
    cosign attest --yes \
        --predicate "$PROVENANCE_FILE" \
        --type slsaprovenance \
        "$IMAGE_DIGEST" 2>&1 | tee cosign-attest.log
else
    cosign attest --yes \
        --predicate "$PROVENANCE_FILE" \
        --type slsaprovenance \
        --key cosign.key \
        "$IMAGE_DIGEST" 2>&1 | tee cosign-attest.log
fi

echo -e "${GREEN}✓ SLSA provenance attached${NC}"

###############################################################################
# Step 4: Verify Signature and Attestation
###############################################################################
echo -e "${YELLOW}Verifying signature and attestation...${NC}"

echo "Verifying signature..."
if [ "$COSIGN_EXPERIMENTAL" = "true" ]; then
    cosign verify "$IMAGE_DIGEST" | jq . > cosign-verify.json
else
    cosign verify --key cosign.pub "$IMAGE_DIGEST" | jq . > cosign-verify.json
fi

echo "Verifying attestation..."
if [ "$COSIGN_EXPERIMENTAL" = "true" ]; then
    cosign verify-attestation --type slsaprovenance "$IMAGE_DIGEST" | jq . > cosign-verify-attestation.json
else
    cosign verify-attestation --type slsaprovenance --key cosign.pub "$IMAGE_DIGEST" | jq . > cosign-verify-attestation.json
fi

echo -e "${GREEN}✓ Verification complete${NC}"

###############################################################################
# Summary
###############################################################################
echo ""
echo -e "${GREEN}=== SLSA-3 Attestation Complete ===${NC}"
echo ""
echo "Signed Image:"
echo "  Image:  $IMAGE_DIGEST"
echo ""
echo "Provenance Details:"
echo "  Git SHA:    $GIT_SHA"
echo "  Builder:    $BUILDER"
echo "  Workflow:   $WORKFLOW_NAME"
echo "  Run ID:     $RUN_ID"
echo "  Timestamp:  $BUILD_TIMESTAMP"
echo ""
echo "Verification Commands:"
echo "  Verify signature:"
if [ "$COSIGN_EXPERIMENTAL" = "true" ]; then
    echo "    cosign verify $IMAGE_DIGEST"
else
    echo "    cosign verify --key cosign.pub $IMAGE_DIGEST"
fi
echo ""
echo "  Verify attestation:"
if [ "$COSIGN_EXPERIMENTAL" = "true" ]; then
    echo "    cosign verify-attestation --type slsaprovenance $IMAGE_DIGEST"
else
    echo "    cosign verify-attestation --type slsaprovenance --key cosign.pub $IMAGE_DIGEST"
fi
echo ""
echo "  View provenance:"
echo "    cosign verify-attestation --type slsaprovenance $IMAGE_DIGEST | jq -r .payload | base64 -d | jq ."
echo ""

# Save summary
SUMMARY_FILE="slsa-attestation-summary-${SERVICE}-${VERSION}.json"
cat > "$SUMMARY_FILE" <<EOF
{
  "service": "$SERVICE",
  "version": "$VERSION",
  "image": "$IMAGE",
  "digest": "$DIGEST",
  "git_sha": "$GIT_SHA",
  "git_ref": "$GIT_REF",
  "builder": "$BUILDER",
  "workflow": "$WORKFLOW_NAME",
  "run_id": "$RUN_ID",
  "timestamp": "$BUILD_TIMESTAMP",
  "slsa_level": "3",
  "cosign_keyless": $([ "$COSIGN_EXPERIMENTAL" = "true" ] && echo "true" || echo "false"),
  "provenance_file": "$PROVENANCE_FILE",
  "verification_commands": {
    "verify_signature": "cosign verify $IMAGE_DIGEST",
    "verify_attestation": "cosign verify-attestation --type slsaprovenance $IMAGE_DIGEST"
  }
}
EOF

echo -e "${GREEN}Summary saved to: $SUMMARY_FILE${NC}"
