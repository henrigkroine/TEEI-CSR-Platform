#!/bin/bash

# Export Tests Runner
# Convenient script to run export tests with various options

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Export System Test Suite Runner${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Parse command line arguments
MODE=${1:-all}

case $MODE in
  all)
    echo -e "${GREEN}Running all export tests...${NC}\n"
    pnpm test tests/exports.test.ts
    ;;

  pdf)
    echo -e "${GREEN}Running PDF export tests only...${NC}\n"
    pnpm test tests/exports.test.ts -t "PDF Export"
    ;;

  charts)
    echo -e "${GREEN}Running chart rendering tests only...${NC}\n"
    pnpm test tests/exports.test.ts -t "Chart Rendering"
    ;;

  tenant)
    echo -e "${GREEN}Running multi-tenant isolation tests only...${NC}\n"
    pnpm test tests/exports.test.ts -t "Multi-Tenant Isolation"
    ;;

  csv)
    echo -e "${GREEN}Running CSV/JSON export tests only...${NC}\n"
    pnpm test tests/exports.test.ts -t "CSV/JSON"
    ;;

  audit)
    echo -e "${GREEN}Running audit logging tests only...${NC}\n"
    pnpm test tests/exports.test.ts -t "Export Audit Logging"
    ;;

  error)
    echo -e "${GREEN}Running error handling tests only...${NC}\n"
    pnpm test tests/exports.test.ts -t "Error Handling"
    ;;

  perf)
    echo -e "${GREEN}Running performance tests only...${NC}\n"
    pnpm test tests/exports.test.ts -t "Performance"
    ;;

  benchmark)
    echo -e "${GREEN}Running performance benchmarks...${NC}\n"
    tsx tests/exportPerformance.benchmark.ts
    ;;

  coverage)
    echo -e "${GREEN}Running tests with coverage report...${NC}\n"
    pnpm test tests/exports.test.ts --coverage
    ;;

  watch)
    echo -e "${GREEN}Running tests in watch mode...${NC}\n"
    pnpm test tests/exports.test.ts --watch
    ;;

  ci)
    echo -e "${GREEN}Running tests in CI mode (with coverage)...${NC}\n"
    pnpm test tests/exports.test.ts --coverage --reporter=verbose
    ;;

  help)
    echo "Usage: ./run-export-tests.sh [mode]"
    echo ""
    echo "Modes:"
    echo "  all        - Run all export tests (default)"
    echo "  pdf        - Run PDF export tests only"
    echo "  charts     - Run chart rendering tests only"
    echo "  tenant     - Run multi-tenant isolation tests only"
    echo "  csv        - Run CSV/JSON export tests only"
    echo "  audit      - Run audit logging tests only"
    echo "  error      - Run error handling tests only"
    echo "  perf       - Run performance tests only"
    echo "  benchmark  - Run performance benchmarks"
    echo "  coverage   - Run tests with coverage report"
    echo "  watch      - Run tests in watch mode"
    echo "  ci         - Run tests in CI mode"
    echo "  help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./run-export-tests.sh pdf"
    echo "  ./run-export-tests.sh benchmark"
    echo "  ./run-export-tests.sh coverage"
    exit 0
    ;;

  *)
    echo -e "${RED}Unknown mode: $MODE${NC}"
    echo "Run './run-export-tests.sh help' for usage information"
    exit 1
    ;;
esac

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Tests completed${NC}\n"
