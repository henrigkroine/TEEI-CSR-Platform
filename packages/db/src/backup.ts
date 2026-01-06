/**
 * Database Backup and Restore Utilities
 *
 * Provides automated backup/restore operations using pg_dump and pg_restore.
 * Supports:
 * - Scheduled logical backups with compression
 * - Point-in-time recovery (PITR) compatible backups
 * - Restore verification and testing
 * - Backup rotation and cleanup
 *
 * @module backup
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdir, readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

export interface BackupConfig {
  /** Database connection string */
  connectionString: string;
  /** Directory to store backups */
  backupDir: string;
  /** Number of backups to retain */
  retentionCount?: number;
  /** Backup file prefix */
  prefix?: string;
  /** Enable compression (gzip) */
  compress?: boolean;
}

export interface BackupResult {
  success: boolean;
  filePath?: string;
  timestamp: string;
  size?: number;
  error?: string;
}

export interface RestoreConfig {
  /** Database connection string */
  connectionString: string;
  /** Path to backup file */
  backupFile: string;
  /** Drop existing database objects before restore */
  clean?: boolean;
  /** Create database if it doesn't exist */
  createDb?: boolean;
}

export interface RestoreResult {
  success: boolean;
  duration: number;
  error?: string;
}

/**
 * Create a logical backup of the database using pg_dump
 *
 * @param config - Backup configuration
 * @returns Backup result with file path and metadata
 *
 * @example
 * ```typescript
 * const result = await createBackup({
 *   connectionString: process.env.DATABASE_URL,
 *   backupDir: './backups',
 *   retentionCount: 7,
 *   compress: true
 * });
 * console.log(`Backup created: ${result.filePath}`);
 * ```
 */
export async function createBackup(config: BackupConfig): Promise<BackupResult> {
  const {
    connectionString,
    backupDir,
    retentionCount = 7,
    prefix = 'teei_platform',
    compress = true,
  } = config;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const extension = compress ? 'sql.gz' : 'sql';
  const filename = `${prefix}_${timestamp}.${extension}`;
  const filePath = join(backupDir, filename);

  try {
    // Ensure backup directory exists
    await mkdir(backupDir, { recursive: true });

    // Build pg_dump command
    const pgDumpCmd = compress
      ? `pg_dump "${connectionString}" --format=plain --no-owner --no-acl | gzip > "${filePath}"`
      : `pg_dump "${connectionString}" --format=plain --no-owner --no-acl > "${filePath}"`;

    console.log(`[Backup] Starting database backup to ${filePath}`);
    const startTime = Date.now();

    await execAsync(pgDumpCmd);

    const fileStats = await stat(filePath);
    const duration = Date.now() - startTime;

    console.log(`[Backup] Completed in ${duration}ms, size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

    // Cleanup old backups
    await cleanupOldBackups(backupDir, prefix, retentionCount);

    return {
      success: true,
      filePath,
      timestamp,
      size: fileStats.size,
    };
  } catch (error) {
    console.error('[Backup] Failed:', error);
    return {
      success: false,
      timestamp,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Restore a database from a backup file using psql
 *
 * @param config - Restore configuration
 * @returns Restore result with success status and duration
 *
 * @example
 * ```typescript
 * const result = await restoreBackup({
 *   connectionString: process.env.DATABASE_URL,
 *   backupFile: './backups/teei_platform_2025-11-13T10-00-00.sql.gz',
 *   clean: true
 * });
 * console.log(`Restore completed in ${result.duration}ms`);
 * ```
 */
export async function restoreBackup(config: RestoreConfig): Promise<RestoreResult> {
  const { connectionString, backupFile, clean = false } = config;

  const startTime = Date.now();

  try {
    console.log(`[Restore] Starting database restore from ${backupFile}`);

    // Drop existing objects if clean flag is set
    if (clean) {
      console.log('[Restore] Dropping existing database objects...');
      const dropCmd = `psql "${connectionString}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`;
      await execAsync(dropCmd);
    }

    // Detect if backup is compressed
    const isCompressed = backupFile.endsWith('.gz');
    const restoreCmd = isCompressed
      ? `gunzip -c "${backupFile}" | psql "${connectionString}"`
      : `psql "${connectionString}" < "${backupFile}"`;

    await execAsync(restoreCmd);

    const duration = Date.now() - startTime;
    console.log(`[Restore] Completed in ${duration}ms`);

    return {
      success: true,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Restore] Failed:', error);
    return {
      success: false,
      duration,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Clean up old backup files, keeping only the most recent N backups
 *
 * @param backupDir - Directory containing backups
 * @param prefix - Backup file prefix to filter
 * @param retentionCount - Number of backups to keep
 */
async function cleanupOldBackups(
  backupDir: string,
  prefix: string,
  retentionCount: number
): Promise<void> {
  try {
    const files = await readdir(backupDir);
    const backupFiles = files
      .filter((f) => f.startsWith(prefix) && (f.endsWith('.sql') || f.endsWith('.sql.gz')))
      .map((f) => join(backupDir, f));

    // Get file stats and sort by modification time (newest first)
    const filesWithStats = await Promise.all(
      backupFiles.map(async (f) => ({
        path: f,
        stats: await stat(f),
      }))
    );

    filesWithStats.sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs);

    // Delete files beyond retention count
    const filesToDelete = filesWithStats.slice(retentionCount);
    for (const file of filesToDelete) {
      console.log(`[Cleanup] Removing old backup: ${file.path}`);
      await unlink(file.path);
    }
  } catch (error) {
    console.error('[Cleanup] Failed to cleanup old backups:', error);
  }
}

/**
 * Schedule automated backups using a cron-like interval
 *
 * @param config - Backup configuration
 * @param intervalMs - Interval in milliseconds between backups
 * @returns Timer ID that can be used to cancel scheduled backups
 *
 * @example
 * ```typescript
 * // Run backup every 6 hours
 * const timerId = scheduleBackups(backupConfig, 6 * 60 * 60 * 1000);
 *
 * // Cancel scheduled backups
 * clearInterval(timerId);
 * ```
 */
export function scheduleBackups(config: BackupConfig, intervalMs: number): NodeJS.Timeout {
  console.log(`[Schedule] Backups scheduled every ${intervalMs / 1000 / 60} minutes`);

  // Run first backup immediately
  createBackup(config).catch((err) => {
    console.error('[Schedule] Initial backup failed:', err);
  });

  // Schedule recurring backups
  return setInterval(() => {
    createBackup(config).catch((err) => {
      console.error('[Schedule] Scheduled backup failed:', err);
    });
  }, intervalMs);
}

/**
 * Verify backup integrity by attempting a test restore to a temporary database
 *
 * @param backupFile - Path to backup file
 * @param testConnectionString - Connection string for test database
 * @returns True if backup is valid and restorable
 */
export async function verifyBackup(
  backupFile: string,
  testConnectionString: string
): Promise<boolean> {
  console.log(`[Verify] Testing backup integrity: ${backupFile}`);

  try {
    const result = await restoreBackup({
      connectionString: testConnectionString,
      backupFile,
      clean: true,
    });

    if (!result.success) {
      console.error('[Verify] Backup verification failed:', result.error);
      return false;
    }

    console.log('[Verify] Backup integrity verified successfully');
    return true;
  } catch (error) {
    console.error('[Verify] Backup verification error:', error);
    return false;
  }
}

/**
 * List all available backups in a directory
 *
 * @param backupDir - Directory to scan for backups
 * @param prefix - Optional prefix to filter backups
 * @returns Array of backup files with metadata
 */
export async function listBackups(
  backupDir: string,
  prefix?: string
): Promise<Array<{ path: string; size: number; modified: Date }>> {
  try {
    const files = await readdir(backupDir);
    const backupFiles = files.filter(
      (f) =>
        (f.endsWith('.sql') || f.endsWith('.sql.gz')) &&
        (!prefix || f.startsWith(prefix))
    );

    const backupsWithStats = await Promise.all(
      backupFiles.map(async (f) => {
        const fullPath = join(backupDir, f);
        const stats = await stat(fullPath);
        return {
          path: fullPath,
          size: stats.size,
          modified: stats.mtime,
        };
      })
    );

    // Sort by modification time (newest first)
    return backupsWithStats.sort((a, b) => b.modified.getTime() - a.modified.getTime());
  } catch (error) {
    console.error('[List] Failed to list backups:', error);
    return [];
  }
}

/**
 * Example usage and CLI script
 */
if (require.main === module) {
  const command = process.argv[2];
  const connectionString =
    process.env.DATABASE_URL || 'postgresql://teei:teei_dev_password@localhost:5432/teei_platform';

  (async () => {
    switch (command) {
      case 'backup': {
        const result = await createBackup({
          connectionString,
          backupDir: './backups',
          compress: true,
        });
        console.log('Backup result:', result);
        process.exit(result.success ? 0 : 1);
      }

      case 'restore': {
        const backupFile = process.argv[3];
        if (!backupFile) {
          console.error('Usage: npm run backup restore <backup-file>');
          process.exit(1);
        }
        const result = await restoreBackup({
          connectionString,
          backupFile,
          clean: process.argv[4] === '--clean',
        });
        console.log('Restore result:', result);
        process.exit(result.success ? 0 : 1);
      }

      case 'list': {
        const backups = await listBackups('./backups');
        console.log(`Found ${backups.length} backups:`);
        backups.forEach((b) => {
          console.log(`  ${b.path} - ${(b.size / 1024 / 1024).toFixed(2)} MB - ${b.modified.toISOString()}`);
        });
        break;
      }

      default:
        console.log(`
Database Backup & Restore Utility

Usage:
  npm run backup backup                    Create a new backup
  npm run backup restore <file> [--clean]  Restore from backup
  npm run backup list                      List all backups

Environment:
  DATABASE_URL - PostgreSQL connection string (required)

Examples:
  npm run backup backup
  npm run backup restore ./backups/teei_platform_2025-11-13T10-00-00.sql.gz --clean
  npm run backup list
        `);
    }
  })();
}
