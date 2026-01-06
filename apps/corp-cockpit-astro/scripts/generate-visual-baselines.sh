#!/bin/bash

###############################################################################
# Visual Regression Baseline Generation Script
#
# This script helps generate and manage visual regression test baselines
# for the Corporate Cockpit.
#
# Usage:
#   ./scripts/generate-visual-baselines.sh [options]
#
# Options:
#   --browser <name>    Generate baselines for specific browser (chromium|firefox|webkit)
#   --viewport <size>   Generate baselines for specific viewport (desktop|tablet|mobile)
#   --suite <name>      Generate baselines for specific test suite
#   --docker            Use Docker to match CI environment
#   --help              Show this help message
#
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BROWSER=""
VIEWPORT=""
SUITE=""
USE_DOCKER=false

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

###############################################################################
# Functions
###############################################################################

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Visual Regression Baseline Generator${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_help() {
    cat << EOF
Usage: ./scripts/generate-visual-baselines.sh [options]

Options:
  --browser <name>    Generate baselines for specific browser
                      Valid: chromium, firefox, webkit
                      Default: all browsers

  --viewport <size>   Generate baselines for specific viewport
                      Valid: desktop, tablet, mobile
                      Default: all viewports

  --suite <name>      Generate baselines for specific test suite
                      Examples: "Dashboard Widgets", "Evidence Explorer"
                      Default: all suites

  --docker            Use Docker to match CI environment
                      Recommended for baseline generation

  --help              Show this help message

Examples:
  # Generate all baselines
  ./scripts/generate-visual-baselines.sh

  # Generate baselines for Chromium only
  ./scripts/generate-visual-baselines.sh --browser chromium

  # Generate baselines for mobile viewport
  ./scripts/generate-visual-baselines.sh --viewport mobile

  # Generate baselines using Docker (matches CI)
  ./scripts/generate-visual-baselines.sh --docker

  # Generate baselines for specific test suite
  ./scripts/generate-visual-baselines.sh --suite "Dashboard Widgets"

  # Combined options
  ./scripts/generate-visual-baselines.sh --browser chromium --viewport desktop --docker

EOF
}

check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"

    # Check if pnpm is installed
    if ! command -v pnpm &> /dev/null; then
        echo -e "${RED}Error: pnpm is not installed${NC}"
        echo "Install with: npm install -g pnpm"
        exit 1
    fi

    # Check if Docker is needed and available
    if [ "$USE_DOCKER" = true ]; then
        if ! command -v docker &> /dev/null; then
            echo -e "${RED}Error: Docker is not installed${NC}"
            echo "Install Docker or run without --docker flag"
            exit 1
        fi
    fi

    echo -e "${GREEN}✓ Prerequisites met${NC}"
    echo ""
}

install_dependencies() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    cd "$PROJECT_DIR"

    if [ ! -d "node_modules" ]; then
        pnpm install
    fi

    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
}

install_browsers() {
    echo -e "${YELLOW}Installing Playwright browsers...${NC}"
    cd "$PROJECT_DIR"

    pnpm exec playwright install

    echo -e "${GREEN}✓ Browsers installed${NC}"
    echo ""
}

build_test_command() {
    local cmd="pnpm exec playwright test visual-comprehensive --update-snapshots"

    # Add browser filter
    if [ -n "$BROWSER" ]; then
        cmd="$cmd --project=$BROWSER"
    fi

    # Add viewport filter (grep)
    if [ -n "$VIEWPORT" ]; then
        cmd="$cmd --grep \"$VIEWPORT\""
    fi

    # Add suite filter (grep)
    if [ -n "$SUITE" ]; then
        cmd="$cmd --grep \"$SUITE\""
    fi

    echo "$cmd"
}

generate_baselines_local() {
    echo -e "${YELLOW}Generating baselines locally...${NC}"
    cd "$PROJECT_DIR"

    local cmd=$(build_test_command)
    echo -e "${BLUE}Running: $cmd${NC}"
    echo ""

    eval "$cmd"

    echo ""
    echo -e "${GREEN}✓ Baselines generated successfully${NC}"
}

generate_baselines_docker() {
    echo -e "${YELLOW}Generating baselines in Docker...${NC}"
    cd "$PROJECT_DIR"

    local docker_image="mcr.microsoft.com/playwright:v1.40.0-jammy"
    local cmd=$(build_test_command)

    echo -e "${BLUE}Using Docker image: $docker_image${NC}"
    echo -e "${BLUE}Running: $cmd${NC}"
    echo ""

    docker run --rm \
        -v "$(pwd):/work" \
        -w /work \
        "$docker_image" \
        /bin/bash -c "pnpm install && $cmd"

    echo ""
    echo -e "${GREEN}✓ Baselines generated in Docker${NC}"
}

show_summary() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Summary${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Count snapshots
    local snapshot_dir="$PROJECT_DIR/tests/e2e/snapshots"

    if [ -d "$snapshot_dir" ]; then
        echo ""
        echo "Snapshot Statistics:"
        echo ""

        for browser in chromium firefox webkit; do
            if [ -d "$snapshot_dir/$browser" ]; then
                local count=$(find "$snapshot_dir/$browser" -name "*.png" 2>/dev/null | wc -l)
                local size=$(du -sh "$snapshot_dir/$browser" 2>/dev/null | cut -f1)
                echo -e "  ${browser}: ${GREEN}${count}${NC} snapshots (${size})"
            fi
        done

        echo ""
        echo "Total directory size: $(du -sh "$snapshot_dir" 2>/dev/null | cut -f1)"
    fi

    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "  1. Review the generated snapshots"
    echo "  2. Run tests to verify: pnpm exec playwright test visual-comprehensive"
    echo "  3. Commit the baseline images: git add tests/e2e/snapshots/"
    echo "  4. Document changes in your commit message"
    echo ""
}

###############################################################################
# Main Script
###############################################################################

main() {
    print_header

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --browser)
                BROWSER="$2"
                shift 2
                ;;
            --viewport)
                VIEWPORT="$2"
                shift 2
                ;;
            --suite)
                SUITE="$2"
                shift 2
                ;;
            --docker)
                USE_DOCKER=true
                shift
                ;;
            --help)
                print_help
                exit 0
                ;;
            *)
                echo -e "${RED}Error: Unknown option $1${NC}"
                echo ""
                print_help
                exit 1
                ;;
        esac
    done

    # Validate browser option
    if [ -n "$BROWSER" ] && [[ ! "$BROWSER" =~ ^(chromium|firefox|webkit)$ ]]; then
        echo -e "${RED}Error: Invalid browser '$BROWSER'${NC}"
        echo "Valid options: chromium, firefox, webkit"
        exit 1
    fi

    # Validate viewport option
    if [ -n "$VIEWPORT" ] && [[ ! "$VIEWPORT" =~ ^(desktop|tablet|mobile)$ ]]; then
        echo -e "${RED}Error: Invalid viewport '$VIEWPORT'${NC}"
        echo "Valid options: desktop, tablet, mobile"
        exit 1
    fi

    # Show configuration
    echo "Configuration:"
    echo "  Browser:  ${BROWSER:-all}"
    echo "  Viewport: ${VIEWPORT:-all}"
    echo "  Suite:    ${SUITE:-all}"
    echo "  Docker:   ${USE_DOCKER}"
    echo ""

    # Execute
    check_prerequisites

    if [ "$USE_DOCKER" = false ]; then
        install_dependencies
        install_browsers
        generate_baselines_local
    else
        generate_baselines_docker
    fi

    show_summary
}

# Run main function
main "$@"
