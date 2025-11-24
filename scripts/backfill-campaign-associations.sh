#!/bin/bash

# Backfill Campaign Associations
# SWARM 6: Agent 4.3 (ingestion-enhancer)
#
# Simple wrapper script for backfilling campaign associations

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

echo "Starting campaign association backfill..."
echo ""

# Execute the TypeScript backfill script
pnpm tsx "$SCRIPT_DIR/backfill-campaign-associations.ts" "$@"
