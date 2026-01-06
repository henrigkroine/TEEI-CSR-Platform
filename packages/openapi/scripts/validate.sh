#!/bin/bash
set -e

# OpenAPI Validation Script
# Validates all OpenAPI specs using swagger-cli and checks for schema conflicts

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENAPI_DIR="$(dirname "$SCRIPT_DIR")"
V1_FINAL_DIR="$OPENAPI_DIR/v1-final"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for errors
ERRORS=0

echo "=================================================="
echo "OpenAPI Specification Validation"
echo "=================================================="
echo ""

# Check if swagger-cli is installed
if ! command -v swagger-cli &> /dev/null; then
    echo -e "${YELLOW}WARNING: swagger-cli not found. Installing via npx...${NC}"
    echo ""
fi

# Function to validate a single spec
validate_spec() {
    local spec_file=$1
    local spec_name=$(basename "$spec_file")

    echo -n "Validating $spec_name... "

    if npx --yes @apidevtools/swagger-cli validate "$spec_file" 2>&1 | grep -q "is valid"; then
        echo -e "${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        npx --yes @apidevtools/swagger-cli validate "$spec_file"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Validate individual specs
echo "Validating individual specifications..."
echo "--------------------------------------------------"

for spec in "$V1_FINAL_DIR"/*.yaml; do
    # Skip merged.yaml for individual validation (will validate separately)
    if [[ "$(basename "$spec")" == "merged.yaml" ]]; then
        continue
    fi
    validate_spec "$spec"
done

echo ""

# Validate merged spec
echo "Validating merged specification..."
echo "--------------------------------------------------"
validate_spec "$V1_FINAL_DIR/merged.yaml"

echo ""

# Check for schema conflicts (duplicate operationIds)
echo "Checking for schema conflicts..."
echo "--------------------------------------------------"

echo -n "Checking for duplicate operationIds... "
DUPLICATE_OPS=$(grep -h "operationId:" "$V1_FINAL_DIR"/trust.yaml "$V1_FINAL_DIR"/deck.yaml "$V1_FINAL_DIR"/analytics.yaml "$V1_FINAL_DIR"/reporting.yaml "$V1_FINAL_DIR"/impact-in.yaml "$V1_FINAL_DIR"/notifications.yaml 2>/dev/null | sort | uniq -d)

if [ -z "$DUPLICATE_OPS" ]; then
    echo -e "${GREEN}✓ No duplicates${NC}"
else
    echo -e "${RED}✗ Duplicates found:${NC}"
    echo "$DUPLICATE_OPS"
    ERRORS=$((ERRORS + 1))
fi

# Check for duplicate paths
echo -n "Checking for duplicate paths... "
DUPLICATE_PATHS=$(grep -h "^  /" "$V1_FINAL_DIR"/trust.yaml "$V1_FINAL_DIR"/deck.yaml "$V1_FINAL_DIR"/analytics.yaml "$V1_FINAL_DIR"/reporting.yaml "$V1_FINAL_DIR"/impact-in.yaml "$V1_FINAL_DIR"/notifications.yaml 2>/dev/null | sort | uniq -d)

if [ -z "$DUPLICATE_PATHS" ]; then
    echo -e "${GREEN}✓ No duplicates${NC}"
else
    echo -e "${RED}✗ Duplicates found:${NC}"
    echo "$DUPLICATE_PATHS"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check for required security schemes
echo "Checking security schemes..."
echo "--------------------------------------------------"

for spec in "$V1_FINAL_DIR"/trust.yaml "$V1_FINAL_DIR"/deck.yaml; do
    spec_name=$(basename "$spec")
    echo -n "Checking $spec_name for bearerAuth... "

    if grep -q "bearerAuth:" "$spec"; then
        echo -e "${GREEN}✓ Found${NC}"
    else
        echo -e "${RED}✗ Missing${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# Summary
echo "=================================================="
echo "Validation Summary"
echo "=================================================="

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All validations passed!${NC}"
    echo ""
    echo "Validated specs:"
    echo "  - trust.yaml"
    echo "  - deck.yaml"
    echo "  - analytics.yaml"
    echo "  - reporting.yaml"
    echo "  - impact-in.yaml"
    echo "  - notifications.yaml"
    echo "  - merged.yaml"
    echo ""
    exit 0
else
    echo -e "${RED}✗ $ERRORS validation error(s) found${NC}"
    echo ""
    echo "Please fix the errors and run validation again."
    exit 1
fi
