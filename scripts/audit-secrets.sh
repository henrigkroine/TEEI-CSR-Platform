#!/usr/bin/env bash

#
# Credential Audit Script
#
# Scans the codebase for hardcoded credentials, API keys, and secrets
# Run this regularly to ensure no sensitive data is committed
#
# Usage: ./scripts/audit-secrets.sh [--fix]
#

set -e

echo "🔍 Auditing codebase for secrets and credentials..."
echo ""

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Counters
ISSUES_FOUND=0
WARNINGS_FOUND=0

# Temporary file for results
RESULTS_FILE=$(mktemp)

# Patterns to search for
declare -A PATTERNS=(
  ["password_assignment"]="password\s*=\s*['\"].*['\"]"
  ["api_key_assignment"]="api_key\s*=\s*['\"].*['\"]"
  ["secret_assignment"]="secret\s*=\s*['\"].*['\"]"
  ["token_assignment"]="token\s*=\s*['\"].*['\"]"
  ["hardcoded_jwt"]="eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"
  ["aws_key"]="AKIA[0-9A-Z]{16}"
  ["private_key_begin"]="-----BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY-----"
  ["demo_email"]="admin@acme\.com|viewer@acme\.com|manager@acme\.com"
  ["demo_password"]="admin123|viewer123|manager123"
  ["placeholder_password"]="password123|test123|changeme"
)

# Directories to scan
SCAN_DIRS="apps services packages"

# Exclude patterns
EXCLUDE_PATTERN="\.(test|spec)\.(ts|js)$|node_modules|\.git|dist|build|coverage"

echo "Scanning directories: $SCAN_DIRS"
echo ""

# Scan for each pattern
for name in "${!PATTERNS[@]}"; do
  pattern="${PATTERNS[$name]}"

  echo "Checking for: $name..."

  # Search with grep
  results=$(grep -r -E -i "$pattern" $SCAN_DIRS 2>/dev/null | grep -v -E "$EXCLUDE_PATTERN" || true)

  if [ -n "$results" ]; then
    # Check if results have proper markers
    unmarked=$(echo "$results" | grep -v -E "//.*DEV|//.*TEST|//.*DEMO|\(Demo\)|\.example\.|\.template\." || true)

    if [ -n "$unmarked" ]; then
      echo -e "${RED}❌ CRITICAL: Found $name without proper markers:${NC}"
      echo "$unmarked" | head -5
      echo "$unmarked" >> "$RESULTS_FILE"
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
      echo ""
    else
      echo -e "${YELLOW}⚠️  WARNING: Found $name (properly marked as dev/test):${NC}"
      echo "$results" | head -3
      WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
      echo ""
    fi
  fi
done

# Check for environment variable usage instead of hardcoding
echo "Checking for proper environment variable usage..."
echo ""

# Files that should use env vars but might not
echo "Files with database connections:"
db_files=$(grep -r -l "postgresql://\|mysql://\|mongodb://" $SCAN_DIRS 2>/dev/null | grep -v -E "$EXCLUDE_PATTERN" || true)

if [ -n "$db_files" ]; then
  for file in $db_files; do
    # Check if they use process.env or import.meta.env
    if ! grep -q "process\.env\|import\.meta\.env" "$file"; then
      echo -e "${RED}❌ File may have hardcoded DB connection: $file${NC}"
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
  done
fi

# Check for .env files not in .gitignore
echo ""
echo "Checking .env file handling..."
if [ -f ".env" ] && ! grep -q "^\.env$" .gitignore 2>/dev/null; then
  echo -e "${RED}❌ CRITICAL: .env file exists but not in .gitignore${NC}"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check for demo data markers
echo ""
echo "Checking for demo data markers..."
demo_files=$(grep -r -l "MOCK_USERS\|seedDatabase\|demo.*data" $SCAN_DIRS 2>/dev/null | grep -v -E "$EXCLUDE_PATTERN" || true)

if [ -n "$demo_files" ]; then
  for file in $demo_files; do
    # Check if file has environment check
    if ! grep -q "NODE_ENV\|USE_MOCK\|ALLOW_DEMO" "$file"; then
      echo -e "${YELLOW}⚠️  File has demo data without environment check: $file${NC}"
      WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    fi
  done
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "AUDIT SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ISSUES_FOUND -eq 0 ] && [ $WARNINGS_FOUND -eq 0 ]; then
  echo -e "${GREEN}✅ No secrets or credentials found${NC}"
  echo ""
  exit 0
elif [ $ISSUES_FOUND -eq 0 ]; then
  echo -e "${YELLOW}⚠️  $WARNINGS_FOUND warning(s) found${NC}"
  echo "These are properly marked as dev/test data, but review them before production."
  echo ""
  exit 0
else
  echo -e "${RED}❌ $ISSUES_FOUND critical issue(s) found${NC}"
  echo -e "${YELLOW}⚠️  $WARNINGS_FOUND warning(s) found${NC}"
  echo ""
  echo "CRITICAL ISSUES MUST BE FIXED:"
  echo "1. Remove hardcoded credentials"
  echo "2. Use environment variables instead"
  echo "3. Add proper markers (// DEV ONLY, (Demo), etc.) if development data"
  echo "4. Move test data to .test. or .spec. files"
  echo ""
  echo "Full results saved to: $RESULTS_FILE"
  echo ""
  exit 1
fi
