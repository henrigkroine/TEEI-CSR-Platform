#!/usr/bin/env node
/**
 * Buddy Program Import CLI
 *
 * Command-line tool for importing Buddy Program export files into CSR Platform.
 * Orchestrates the full pipeline: parse → validate → transform → persist.
 *
 * Usage:
 *   pnpm buddy:import --file=/path/to/export.csv --program-id=<uuid>
 *   pnpm buddy:import --file=/path/to/export.json --program-id=<uuid> --format=json
 *   pnpm buddy:import --file=/path/to/export.xlsx --program-id=<uuid> --dry-run
 *
 * @module ingestion-buddy/cli/import-buddy
 * @agent Agent 14 (buddy-import-cli)
 */

import { createServiceLogger } from '@teei/shared-utils';
import {
  parseBuddyExport,
  extractAllRecords,
  getTotalRecordCount,
  getAllErrors as getParseErrors,
  validateParseQuality,
} from '../parsers';
import {
  validateAllEntities,
  getAggregateStats,
  formatValidationErrors,
} from '../validators';
import {
  transformUsersBatch,
  buildUserIdMapping,
  summarizeUserTransformations,
  transformActivitiesBatch,
  summarizeActivityTransformations,
  transformAchievementsBatch,
  summarizeAchievementTransformations,
} from '../transformers';
import {
  persistAllData,
  summarizePersistence,
} from '../persistors';

const logger = createServiceLogger('buddy-import-cli');

/**
 * CLI options
 */
interface ImportOptions {
  filePath: string;
  programId: string;
  format?: 'csv' | 'json' | 'xlsx' | 'auto';
  dryRun?: boolean;
  strictValidation?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Import pipeline statistics
 */
interface ImportStats {
  phase: string;
  status: 'success' | 'failed';
  duration: number; // milliseconds
  recordsProcessed: number;
  errors: number;
}

/**
 * Full import result
 */
interface ImportResult {
  success: boolean;
  stats: ImportStats[];
  totalDuration: number;
  summary: string;
}

/**
 * Parse CLI arguments
 */
function parseArgs(): ImportOptions {
  const args = process.argv.slice(2);
  const options: Partial<ImportOptions> = {};

  for (const arg of args) {
    const [key, value] = arg.split('=');

    switch (key) {
      case '--file':
        options.filePath = value;
        break;
      case '--program-id':
        options.programId = value;
        break;
      case '--format':
        options.format = value as 'csv' | 'json' | 'xlsx' | 'auto';
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--strict':
        options.strictValidation = true;
        break;
      case '--log-level':
        options.logLevel = value as 'debug' | 'info' | 'warn' | 'error';
        break;
      case '--help':
        printUsage();
        process.exit(0);
    }
  }

  // Validate required options
  if (!options.filePath || !options.programId) {
    console.error('Error: --file and --program-id are required');
    printUsage();
    process.exit(1);
  }

  return options as ImportOptions;
}

/**
 * Print CLI usage
 */
function printUsage(): void {
  console.log(`
Buddy Program Import CLI

Usage:
  pnpm buddy:import --file=<path> --program-id=<uuid> [options]

Required Arguments:
  --file=<path>           Path to Buddy export file (CSV, JSON, or XLSX)
  --program-id=<uuid>     Buddy Program ID in CSR system

Options:
  --format=<format>       File format (csv, json, xlsx, auto). Default: auto
  --dry-run               Parse and validate only (do not persist to database)
  --strict                Strict validation (fail on any validation errors)
  --log-level=<level>     Logging level (debug, info, warn, error). Default: info
  --help                  Show this help message

Examples:
  pnpm buddy:import --file=exports/buddy_users.csv --program-id=550e8400-e29b-41d4-a716-446655440000
  pnpm buddy:import --file=exports/buddy_full.json --program-id=550e8400-e29b-41d4-a716-446655440000 --format=json
  pnpm buddy:import --file=exports/buddy_all.xlsx --program-id=550e8400-e29b-41d4-a716-446655440000 --dry-run
`);
}

/**
 * Run the import pipeline
 */
async function runImport(options: ImportOptions): Promise<ImportResult> {
  const startTime = Date.now();
  const stats: ImportStats[] = [];

  logger.info(
    { filePath: options.filePath, programId: options.programId, dryRun: options.dryRun },
    'Starting Buddy import pipeline'
  );

  try {
    // ========== PHASE 1: PARSE ==========
    console.log('\n📁 Phase 1: Parsing export file...');
    const parseStart = Date.now();

    const parseResult = await parseBuddyExport({
      filePath: options.filePath,
      format: options.format || 'auto',
    });

    const totalRecords = getTotalRecordCount(parseResult.result);
    const parseErrors = getParseErrors(parseResult.result);
    const parseQuality = validateParseQuality(parseResult.result);

    stats.push({
      phase: 'parse',
      status: parseQuality.isValid ? 'success' : 'failed',
      duration: Date.now() - parseStart,
      recordsProcessed: totalRecords,
      errors: parseErrors.length,
    });

    console.log(`✅ Parsed ${totalRecords} records from ${parseResult.format.toUpperCase()} file`);
    if (parseErrors.length > 0) {
      console.warn(`⚠️  ${parseErrors.length} parsing errors`);
    }

    if (!parseQuality.isValid) {
      console.error('❌ Parse quality check failed:');
      parseQuality.warnings.forEach((w) => console.error(`   - ${w}`));
      if (options.strictValidation) {
        throw new Error('Parse quality check failed (strict mode)');
      }
    }

    // Extract all entities
    const allEntities = extractAllRecords(parseResult.result);

    // ========== PHASE 2: VALIDATE ==========
    console.log('\n✅ Phase 2: Validating records...');
    const validateStart = Date.now();

    const validationResults = validateAllEntities(allEntities, {
      logErrors: options.logLevel === 'debug',
      throwOnFailure: false,
    });

    const aggregateStats = getAggregateStats(validationResults);

    stats.push({
      phase: 'validate',
      status: aggregateStats.successRate >= 0.9 ? 'success' : 'failed',
      duration: Date.now() - validateStart,
      recordsProcessed: aggregateStats.totalRecords,
      errors: aggregateStats.invalidRecords,
    });

    console.log(`✅ Validated ${aggregateStats.totalRecords} records`);
    console.log(`   - Valid: ${aggregateStats.validRecords}`);
    console.log(`   - Invalid: ${aggregateStats.invalidRecords}`);
    console.log(`   - Success Rate: ${(aggregateStats.successRate * 100).toFixed(1)}%`);

    if (aggregateStats.successRate < 0.9) {
      console.warn('⚠️  Validation success rate < 90%');
      if (options.strictValidation) {
        throw new Error('Validation failed (strict mode)');
      }
    }

    // ========== PHASE 3: TRANSFORM ==========
    console.log('\n🔄 Phase 3: Transforming to CSR entities...');
    const transformStart = Date.now();

    // Transform users first (to build ID mapping)
    const userTransformResult = await transformUsersBatch(
      validationResults.users?.valid || []
    );

    console.log(summarizeUserTransformations(userTransformResult));

    const userIdMapping = buildUserIdMapping(userTransformResult.transformed);

    // Transform activities
    const activityTransformResult = transformActivitiesBatch(
      {
        events: validationResults.events?.valid || [],
        eventAttendance: validationResults.event_attendance?.valid || [],
        skillSessions: validationResults.skill_sessions?.valid || [],
        checkins: validationResults.checkins?.valid || [],
      },
      userIdMapping,
      options.programId
    );

    console.log(summarizeActivityTransformations(activityTransformResult));

    // Transform achievements
    const achievementTransformResult = transformAchievementsBatch(
      {
        milestones: validationResults.milestones?.valid || [],
        feedback: validationResults.feedback?.valid || [],
      },
      userIdMapping,
      options.programId
    );

    console.log(summarizeAchievementTransformations(achievementTransformResult));

    const totalTransformErrors =
      userTransformResult.errors.length +
      activityTransformResult.errors.length +
      achievementTransformResult.errors.length;

    stats.push({
      phase: 'transform',
      status: totalTransformErrors === 0 ? 'success' : 'failed',
      duration: Date.now() - transformStart,
      recordsProcessed:
        userTransformResult.stats.total +
        activityTransformResult.stats.totalActivities +
        achievementTransformResult.stats.totalOutcomes,
      errors: totalTransformErrors,
    });

    // ========== PHASE 4: PERSIST ==========
    if (options.dryRun) {
      console.log('\n🏃 Dry run mode: skipping database persistence');
      stats.push({
        phase: 'persist',
        status: 'success',
        duration: 0,
        recordsProcessed: 0,
        errors: 0,
      });
    } else {
      console.log('\n💾 Phase 4: Persisting to database...');
      const persistStart = Date.now();

      const persistResult = await persistAllData({
        users: userTransformResult.transformed,
        activities: activityTransformResult.activities,
        outcomes: achievementTransformResult.outcomes,
      });

      console.log(summarizePersistence(persistResult));

      stats.push({
        phase: 'persist',
        status: persistResult.totalErrors === 0 ? 'success' : 'failed',
        duration: Date.now() - persistStart,
        recordsProcessed: persistResult.totalInserted + persistResult.totalUpdated,
        errors: persistResult.totalErrors,
      });
    }

    // ========== SUMMARY ==========
    const totalDuration = Date.now() - startTime;
    const summary = generateSummary(stats, totalDuration, options.dryRun);

    console.log('\n' + summary);

    return {
      success: stats.every((s) => s.status === 'success'),
      stats,
      totalDuration,
      summary,
    };
  } catch (err: any) {
    const totalDuration = Date.now() - startTime;
    logger.error({ error: err.message, stack: err.stack }, 'Import pipeline failed');

    console.error(`\n❌ Import failed: ${err.message}`);

    return {
      success: false,
      stats,
      totalDuration,
      summary: `Import failed after ${(totalDuration / 1000).toFixed(1)}s: ${err.message}`,
    };
  }
}

/**
 * Generate import summary
 */
function generateSummary(stats: ImportStats[], totalDuration: number, dryRun: boolean): string {
  const lines: string[] = [
    '=' .repeat(60),
    '  BUDDY IMPORT SUMMARY',
    '='.repeat(60),
    '',
  ];

  for (const stat of stats) {
    const statusIcon = stat.status === 'success' ? '✅' : '❌';
    lines.push(
      `${statusIcon} ${stat.phase.toUpperCase()}: ${stat.recordsProcessed} records in ${(stat.duration / 1000).toFixed(1)}s (${stat.errors} errors)`
    );
  }

  lines.push('');
  lines.push(`Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);

  if (dryRun) {
    lines.push('\n⚠️  DRY RUN: No data was persisted to the database');
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const options = parseArgs();

  console.log('🚀 Buddy Program Import CLI\n');

  const result = await runImport(options);

  process.exit(result.success ? 0 : 1);
}

// Run CLI
if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
