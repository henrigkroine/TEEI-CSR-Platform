import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { outcomeScores, companies, users, programEnrollments } from '@teei/shared-schema';
import { gt, sql as drizzleSql } from 'drizzle-orm';
import { getClickHouseClient } from '../lib/clickhouse-client.js';
import { createServiceLogger } from '@teei/shared-utils';
import { invalidateAllAnalyticsCache } from '../lib/cache.js';
import { connect, StringCodec } from 'nats';

const logger = createServiceLogger('analytics:ingestion');

let db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL || 'postgres://teei:teei_dev_password@localhost:5432/teei_platform';
    const sql = postgres(connectionString);
    db = drizzle(sql);
  }
  return db;
}

interface SyncStatus {
  tableName: string;
  lastSyncedAt: Date;
  lastSyncedId: string;
  recordsSynced: number;
}

const BATCH_SIZE = 1000;
const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Get last sync status from ClickHouse
 */
async function getLastSyncStatus(tableName: string): Promise<SyncStatus | null> {
  try {
    const client = getClickHouseClient();
    const result = await client.query({
      query: `
        SELECT
          table_name,
          last_synced_at,
          last_synced_id,
          records_synced
        FROM sync_status
        WHERE table_name = {tableName: String}
        ORDER BY sync_timestamp DESC
        LIMIT 1
      `,
      query_params: { tableName },
      format: 'JSONEachRow',
    });

    const rows = await result.json<any>();
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      tableName: row.table_name,
      lastSyncedAt: new Date(row.last_synced_at),
      lastSyncedId: row.last_synced_id,
      recordsSynced: row.records_synced,
    };
  } catch (error) {
    logger.error('Failed to get last sync status', { tableName, error });
    return null;
  }
}

/**
 * Update sync status in ClickHouse
 */
async function updateSyncStatus(
  tableName: string,
  lastSyncedAt: Date,
  lastSyncedId: string,
  recordsSynced: number
): Promise<void> {
  try {
    const client = getClickHouseClient();
    await client.insert({
      table: 'sync_status',
      values: [{
        table_name: tableName,
        last_synced_at: lastSyncedAt.toISOString().replace('T', ' ').substring(0, 19),
        last_synced_id: lastSyncedId,
        records_synced: recordsSynced,
      }],
      format: 'JSONEachRow',
    });

    logger.debug('Updated sync status', { tableName, recordsSynced });
  } catch (error) {
    logger.error('Failed to update sync status', { tableName, error });
  }
}

/**
 * Sync outcome_scores from Postgres to ClickHouse
 */
export async function syncOutcomeScores(): Promise<number> {
  try {
    const database = getDb();
    const clickhouse = getClickHouseClient();

    // Get last sync status
    const lastSync = await getLastSyncStatus('outcome_scores');
    const lastSyncDate = lastSync?.lastSyncedAt || new Date(0);

    logger.info('Starting outcome_scores sync', { lastSyncDate });

    // Fetch new records from Postgres
    const newRecords = await database
      .select({
        id: outcomeScores.id,
        userId: outcomeScores.userId,
        companyId: outcomeScores.companyId,
        textId: outcomeScores.textId,
        textType: outcomeScores.textType,
        dimension: outcomeScores.dimension,
        score: outcomeScores.score,
        confidence: outcomeScores.confidence,
        modelVersion: outcomeScores.modelVersion,
        createdAt: outcomeScores.createdAt,
      })
      .from(outcomeScores)
      .where(gt(outcomeScores.createdAt, lastSyncDate))
      .orderBy(outcomeScores.createdAt)
      .limit(BATCH_SIZE);

    if (newRecords.length === 0) {
      logger.debug('No new outcome_scores to sync');
      return 0;
    }

    // Transform records for ClickHouse
    const chRecords = newRecords.map((record) => ({
      id: record.id,
      user_id: record.userId || '00000000-0000-0000-0000-000000000000',
      company_id: record.companyId || '00000000-0000-0000-0000-000000000000',
      text_id: record.textId,
      text_type: record.textType || '',
      dimension: record.dimension,
      score: parseFloat(record.score as string),
      confidence: record.confidence ? parseFloat(record.confidence as string) : 0,
      model_version: record.modelVersion || '',
      created_at: new Date(record.createdAt).toISOString().replace('T', ' ').substring(0, 19),
    }));

    // Insert into ClickHouse
    await clickhouse.insert({
      table: 'outcome_scores_ch',
      values: chRecords,
      format: 'JSONEachRow',
    });

    // Update sync status
    const lastRecord = newRecords[newRecords.length - 1];
    await updateSyncStatus(
      'outcome_scores',
      new Date(lastRecord.createdAt),
      lastRecord.id,
      newRecords.length
    );

    logger.info('Synced outcome_scores', { count: newRecords.length });
    return newRecords.length;
  } catch (error) {
    logger.error('Failed to sync outcome_scores', { error });
    throw error;
  }
}

/**
 * Sync companies metadata to ClickHouse
 */
export async function syncCompanies(): Promise<number> {
  try {
    const database = getDb();
    const clickhouse = getClickHouseClient();

    logger.info('Starting companies sync');

    // Fetch all companies from Postgres
    const companiesData = await database
      .select({
        id: companies.id,
        name: companies.name,
        industry: companies.industry,
        country: companies.country,
        createdAt: companies.createdAt,
      })
      .from(companies);

    if (companiesData.length === 0) {
      logger.debug('No companies to sync');
      return 0;
    }

    // Transform for ClickHouse
    const chRecords = companiesData.map((company) => ({
      id: company.id,
      name: company.name,
      industry: company.industry || '',
      country: company.country || '',
      employee_size: 'medium', // Default - this could be extended
      created_at: new Date(company.createdAt).toISOString().replace('T', ' ').substring(0, 19),
    }));

    // Insert into ClickHouse (will replace existing records)
    await clickhouse.insert({
      table: 'companies_ch',
      values: chRecords,
      format: 'JSONEachRow',
    });

    logger.info('Synced companies', { count: companiesData.length });
    return companiesData.length;
  } catch (error) {
    logger.error('Failed to sync companies', { error });
    throw error;
  }
}

/**
 * Sync user events for funnel analysis
 */
export async function syncUserEvents(): Promise<number> {
  try {
    const database = getDb();
    const clickhouse = getClickHouseClient();

    // Get last sync status
    const lastSync = await getLastSyncStatus('user_events');
    const lastSyncDate = lastSync?.lastSyncedAt || new Date(0);

    logger.info('Starting user_events sync', { lastSyncDate });

    // Fetch program enrollments as events
    const enrollments = await database
      .select({
        id: programEnrollments.id,
        userId: programEnrollments.userId,
        programType: programEnrollments.programType,
        enrolledAt: programEnrollments.enrolledAt,
        status: programEnrollments.status,
        completedAt: programEnrollments.completedAt,
      })
      .from(programEnrollments)
      .where(gt(programEnrollments.enrolledAt, lastSyncDate))
      .orderBy(programEnrollments.enrolledAt)
      .limit(BATCH_SIZE);

    if (enrollments.length === 0) {
      logger.debug('No new user events to sync');
      return 0;
    }

    // Transform to events
    const events: any[] = [];
    for (const enrollment of enrollments) {
      // Enrollment event
      events.push({
        id: enrollment.id,
        user_id: enrollment.userId,
        company_id: '00000000-0000-0000-0000-000000000000', // Would need to join for actual company
        event_type: 'enrolled',
        program_type: enrollment.programType,
        event_timestamp: new Date(enrollment.enrolledAt).toISOString().replace('T', ' ').substring(0, 19),
        metadata: JSON.stringify({ status: enrollment.status }),
      });

      // Completion event if completed
      if (enrollment.completedAt) {
        events.push({
          id: `${enrollment.id}_completed`,
          user_id: enrollment.userId,
          company_id: '00000000-0000-0000-0000-000000000000',
          event_type: 'program_completed',
          program_type: enrollment.programType,
          event_timestamp: new Date(enrollment.completedAt).toISOString().replace('T', ' ').substring(0, 19),
          metadata: JSON.stringify({ enrollment_id: enrollment.id }),
        });
      }
    }

    // Insert into ClickHouse
    if (events.length > 0) {
      await clickhouse.insert({
        table: 'user_events_ch',
        values: events,
        format: 'JSONEachRow',
      });

      // Update sync status
      const lastRecord = enrollments[enrollments.length - 1];
      await updateSyncStatus(
        'user_events',
        new Date(lastRecord.enrolledAt),
        lastRecord.id,
        events.length
      );
    }

    logger.info('Synced user events', { count: events.length });
    return events.length;
  } catch (error) {
    logger.error('Failed to sync user events', { error });
    throw error;
  }
}

/**
 * Perform full sync of all data
 */
export async function performFullSync(): Promise<{
  outcomeScores: number;
  companies: number;
  userEvents: number;
}> {
  const startTime = Date.now();
  logger.info('Starting full sync');

  try {
    const [outcomeScoresCount, companiesCount, userEventsCount] = await Promise.all([
      syncOutcomeScores(),
      syncCompanies(),
      syncUserEvents(),
    ]);

    const duration = Date.now() - startTime;
    logger.info('Full sync completed', {
      duration: `${duration}ms`,
      outcomeScores: outcomeScoresCount,
      companies: companiesCount,
      userEvents: userEventsCount,
    });

    // Invalidate all analytics cache after sync
    if (outcomeScoresCount > 0 || userEventsCount > 0) {
      await invalidateAllAnalyticsCache();
      logger.info('Invalidated analytics cache after sync');
    }

    // Publish sync completed event
    await publishSyncEvent({
      outcomeScores: outcomeScoresCount,
      companies: companiesCount,
      userEvents: userEventsCount,
      duration,
    });

    return {
      outcomeScores: outcomeScoresCount,
      companies: companiesCount,
      userEvents: userEventsCount,
    };
  } catch (error) {
    logger.error('Full sync failed', { error });
    throw error;
  }
}

/**
 * Publish sync event to NATS
 */
async function publishSyncEvent(data: any): Promise<void> {
  try {
    const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
    const nc = await connect({ servers: natsUrl });
    const sc = StringCodec();

    await nc.publish('analytics.synced', sc.encode(JSON.stringify({
      timestamp: new Date().toISOString(),
      ...data,
    })));

    await nc.close();
    logger.debug('Published analytics.synced event');
  } catch (error) {
    logger.error('Failed to publish sync event', { error });
    // Don't throw - this is non-critical
  }
}

/**
 * Start periodic sync scheduler
 */
export function startSyncScheduler(): NodeJS.Timeout {
  logger.info('Starting sync scheduler', { intervalMs: SYNC_INTERVAL_MS });

  // Run initial sync
  performFullSync().catch((error) => {
    logger.error('Initial sync failed', { error });
  });

  // Schedule periodic syncs
  return setInterval(() => {
    performFullSync().catch((error) => {
      logger.error('Scheduled sync failed', { error });
    });
  }, SYNC_INTERVAL_MS);
}

/**
 * Stop sync scheduler
 */
export function stopSyncScheduler(timer: NodeJS.Timeout): void {
  clearInterval(timer);
  logger.info('Stopped sync scheduler');
}
