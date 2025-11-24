#!/usr/bin/env tsx

/**
 * Backfill Campaign Associations
 *
 * SWARM 6: Agent 4.3 (ingestion-enhancer)
 *
 * This script backfills historical data by associating existing sessions, matches,
 * and completions to campaigns based on user profile, company, and date matching.
 *
 * Usage:
 *   # Dry run (no database updates)
 *   pnpm tsx scripts/backfill-campaign-associations.ts --dry-run
 *
 *   # Backfill all data
 *   pnpm tsx scripts/backfill-campaign-associations.ts
 *
 *   # Backfill specific entity type
 *   pnpm tsx scripts/backfill-campaign-associations.ts --entity sessions
 *   pnpm tsx scripts/backfill-campaign-associations.ts --entity matches
 *   pnpm tsx scripts/backfill-campaign-associations.ts --entity completions
 *
 *   # Limit to specific company
 *   pnpm tsx scripts/backfill-campaign-associations.ts --company <company-id>
 *
 *   # Limit to date range
 *   pnpm tsx scripts/backfill-campaign-associations.ts --start-date 2024-01-01 --end-date 2024-12-31
 *
 *   # Resume from checkpoint
 *   pnpm tsx scripts/backfill-campaign-associations.ts --start-from 1000
 *
 *   # Batch size (default: 100)
 *   pnpm tsx scripts/backfill-campaign-associations.ts --batch-size 50
 */

import { parseArgs } from 'node:util';
import {
  backfillHistoricalSessions,
  backfillHistoricalMatches,
  backfillHistoricalCompletions,
  backfillAllHistoricalData,
  type BackfillOptions,
} from '../services/campaigns/src/lib/backfill-associations.js';

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

const { values } = parseArgs({
  options: {
    'dry-run': {
      type: 'boolean',
      default: false,
    },
    entity: {
      type: 'string',
      default: 'all',
    },
    company: {
      type: 'string',
    },
    'start-date': {
      type: 'string',
    },
    'end-date': {
      type: 'string',
    },
    'start-from': {
      type: 'string',
    },
    'batch-size': {
      type: 'string',
    },
    help: {
      type: 'boolean',
      default: false,
    },
  },
});

// ============================================================================
// HELP TEXT
// ============================================================================

if (values.help) {
  console.log(`
Backfill Campaign Associations

This script backfills historical data by associating existing sessions, matches,
and completions to campaigns based on user profile, company, and date matching.

Usage:
  pnpm tsx scripts/backfill-campaign-associations.ts [options]

Options:
  --dry-run              Don't write to database, just report what would be done
  --entity <type>        Entity type to backfill: sessions | matches | completions | all (default: all)
  --company <id>         Limit backfill to specific company ID
  --start-date <date>    Only backfill records after this date (YYYY-MM-DD)
  --end-date <date>      Only backfill records before this date (YYYY-MM-DD)
  --start-from <offset>  Resume from checkpoint (skip first N records)
  --batch-size <size>    Number of records to process per batch (default: 100)
  --help                 Show this help message

Examples:
  # Dry run to see what would happen
  pnpm tsx scripts/backfill-campaign-associations.ts --dry-run

  # Backfill all historical data
  pnpm tsx scripts/backfill-campaign-associations.ts

  # Backfill only Kintell sessions
  pnpm tsx scripts/backfill-campaign-associations.ts --entity sessions

  # Backfill for specific company
  pnpm tsx scripts/backfill-campaign-associations.ts --company abc-123-def-456

  # Backfill 2024 data only
  pnpm tsx scripts/backfill-campaign-associations.ts --start-date 2024-01-01 --end-date 2024-12-31
`);
  process.exit(0);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('=== Campaign Association Backfill ===\n');

  // Build options from CLI args
  const options: BackfillOptions = {
    dryRun: values['dry-run'] as boolean,
    companyId: values.company as string | undefined,
    startDate: values['start-date'] ? new Date(values['start-date'] as string) : undefined,
    endDate: values['end-date'] ? new Date(values['end-date'] as string) : undefined,
    startFrom: values['start-from'] ? parseInt(values['start-from'] as string, 10) : undefined,
    batchSize: values['batch-size'] ? parseInt(values['batch-size'] as string, 10) : undefined,
  };

  // Log configuration
  console.log('Configuration:');
  console.log(`  Entity Type: ${values.entity}`);
  console.log(`  Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
  if (options.companyId) console.log(`  Company ID: ${options.companyId}`);
  if (options.startDate) console.log(`  Start Date: ${options.startDate.toISOString().split('T')[0]}`);
  if (options.endDate) console.log(`  End Date: ${options.endDate.toISOString().split('T')[0]}`);
  if (options.startFrom) console.log(`  Start From: ${options.startFrom}`);
  if (options.batchSize) console.log(`  Batch Size: ${options.batchSize}`);
  console.log('\n');

  try {
    const entityType = values.entity as string;

    // Execute based on entity type
    if (entityType === 'all') {
      const results = await backfillAllHistoricalData(options);
      console.log('\n=== Summary ===');
      console.log(`Sessions associated: ${results.sessions}`);
      console.log(`Matches associated: ${results.matches}`);
      console.log(`Completions associated: ${results.completions}`);
      console.log(`Total: ${results.total}`);
    } else if (entityType === 'sessions') {
      const count = await backfillHistoricalSessions(options);
      console.log(`\nTotal sessions associated: ${count}`);
    } else if (entityType === 'matches') {
      const count = await backfillHistoricalMatches(options);
      console.log(`\nTotal matches associated: ${count}`);
    } else if (entityType === 'completions') {
      const count = await backfillHistoricalCompletions(options);
      console.log(`\nTotal completions associated: ${count}`);
    } else {
      console.error(`Unknown entity type: ${entityType}`);
      console.error('Valid types: sessions, matches, completions, all');
      process.exit(1);
    }

    console.log('\n✅ Backfill completed successfully!');

    if (options.dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No data was modified');
      console.log('Run without --dry-run to apply changes');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during backfill:', error);
    process.exit(1);
  }
}

// Run main function
main();
