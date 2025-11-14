#!/bin/bash

#############################################################
# E2E Test Runner Script
# Starts all services and runs E2E tests
#############################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== TEEI E2E Test Runner ===${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi

# Parse arguments
RUN_MODE=${1:-"full"}  # full, quick, or visual
BROWSER=${2:-"chromium"}  # chromium, firefox, webkit, or all

echo "Run mode: $RUN_MODE"
echo "Browser: $BROWSER"
echo ""

# Start Docker Compose environment
echo -e "${YELLOW}Starting Docker Compose environment...${NC}"
docker-compose -f docker-compose.e2e.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
timeout 120 bash -c '
  until docker-compose -f docker-compose.e2e.yml ps | grep -q "healthy"; do
    echo "Waiting for services..."
    sleep 2
  done
'

echo -e "${GREEN}✓ All services are healthy${NC}"
echo ""

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
export DATABASE_URL="postgresql://teei_test:teei_test_password@localhost:5433/teei_e2e"
pnpm db:migrate

# Install Playwright browsers if needed
if [ ! -d "$HOME/.cache/ms-playwright" ]; then
  echo -e "${YELLOW}Installing Playwright browsers...${NC}"
  pnpm exec playwright install
fi

# Set environment variables
export BUDDY_SYSTEM_URL="http://localhost:3001"
export CSR_PLATFORM_URL="http://localhost:4321"
export API_GATEWAY_URL="http://localhost:3000"
export BUDDY_CONNECTOR_URL="http://localhost:3010"
export BUDDY_WEBHOOK_SECRET="test-webhook-secret-buddy-e2e"

# Run tests based on mode
case $RUN_MODE in
  "full")
    echo -e "${YELLOW}Running full E2E test suite...${NC}"
    if [ "$BROWSER" = "all" ]; then
      pnpm exec playwright test tests/e2e/
    else
      pnpm exec playwright test tests/e2e/ --project=$BROWSER
    fi
    ;;

  "quick")
    echo -e "${YELLOW}Running quick E2E tests (smoke tests only)...${NC}"
    pnpm exec playwright test tests/e2e/ --grep "@smoke" --project=$BROWSER
    ;;

  "visual")
    echo -e "${YELLOW}Running visual regression tests...${NC}"
    pnpm exec playwright test tests/e2e/visual-regression.spec.ts --project=$BROWSER
    ;;

  "integration")
    echo -e "${YELLOW}Running integration tests only...${NC}"
    pnpm exec playwright test tests/e2e/buddy-integration.spec.ts --project=$BROWSER
    ;;

  "webhook")
    echo -e "${YELLOW}Running webhook tests only...${NC}"
    pnpm exec playwright test tests/e2e/webhook-integration.spec.ts --project=$BROWSER
    ;;

  *)
    echo -e "${RED}Unknown run mode: $RUN_MODE${NC}"
    echo "Available modes: full, quick, visual, integration, webhook"
    exit 1
    ;;
esac

TEST_EXIT_CODE=$?

# Show test results
echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
else
  echo -e "${RED}✗ Some tests failed${NC}"
fi

# Generate HTML report
if [ -d "playwright-report" ]; then
  echo ""
  echo -e "${YELLOW}Generating HTML report...${NC}"
  pnpm exec playwright show-report --host 0.0.0.0 &
  REPORT_PID=$!
  echo "Report server started at http://localhost:9323"
  echo "Press Ctrl+C to stop and cleanup"

  # Wait for user interrupt
  trap "echo ''; echo 'Stopping report server...'; kill $REPORT_PID 2>/dev/null; exit 0" INT
  wait $REPORT_PID
fi

# Cleanup function
cleanup() {
  echo ""
  echo -e "${YELLOW}Cleaning up...${NC}"
  docker-compose -f docker-compose.e2e.yml down -v
  echo -e "${GREEN}✓ Cleanup complete${NC}"
}

# Register cleanup on exit
trap cleanup EXIT

exit $TEST_EXIT_CODE
