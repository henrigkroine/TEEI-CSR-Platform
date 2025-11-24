/**
 * Backfill Associations
 *
 * Backfill historical data associations for sessions, matches, and completions
 * that existed before the campaign system was implemented.
 *
 * SWARM 6: Agent 3.2 (activity-associator)
 *
 * Strategy:
 * - Process historical records in batches to avoid overwhelming the database
 * - Track progress and allow resuming from checkpoint
 * - Generate reports on association quality and manual review needs
 * - Handle errors gracefully and log issues for investigation
 */

import { db } from '@teei/shared-schema/db';
import {
  kintellSessions,
  buddyMatches,
  learningProgress,
  companies,
} from '@teei/shared-schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import {
  associateSessionToCampaign,
  associateBuddyMatchToCampaign,
  associateUpskillingCompletionToCampaign,
  getAssociationStats,
  type AssociationResult,
} from './activity-associator.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Backfill progress tracking
 */
export interface BackfillProgress {
  entityType: 'sessions' | 'matches' | 'completions';
  totalRecords: number;
  processedRecords: number;
  associatedRecords: number;
  failedRecords: number;
  reviewRequiredRecords: number;
  startTime: Date;
  endTime?: Date;
  averageConfidence: number;
}

/**
 * Backfill options
 */
export interface BackfillOptions {
  batchSize?: number; // Number of records to process per batch
  startFrom?: number; // Offset to start from (for resuming)
  dryRun?: boolean; // Don't write associations, just report
  companyId?: string; // Limit to specific company
  startDate?: Date; // Only backfill records after this date
  endDate?: Date; // Only backfill records before this date
}

/**
 * Association record for storage
 */
interface AssociationRecord {
  entityId: string;
  entityType: 'session' | 'match' | 'completion';
  campaignId: string | null;
  programInstanceId: string | null;
  confidence: number;
  matchReasons: string[];
  requiresReview: boolean;
  associatedAt: Date;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_BATCH_SIZE = 100;
const CHECKPOINT_INTERVAL = 500; // Log progress every N records

// ============================================================================
// MAIN BACKFILL FUNCTIONS
// ============================================================================

/**
 * Backfill historical Kintell sessions
 *
 * Associates sessions that don't yet have a programInstanceId to campaigns
 * based on user, company, and date matching.
 *
 * @param options - Backfill options
 * @returns Number of sessions associated
 */
export async function backfillHistoricalSessions(
  options: BackfillOptions = {}
): Promise<number> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    startFrom = 0,
    dryRun = false,
    companyId,
    startDate,
    endDate,
  } = options;

  console.log('Starting Kintell sessions backfill...');
  console.log('Options:', { batchSize, startFrom, dryRun, companyId, startDate, endDate });

  const progress: BackfillProgress = {
    entityType: 'sessions',
    totalRecords: 0,
    processedRecords: 0,
    associatedRecords: 0,
    failedRecords: 0,
    reviewRequiredRecords: 0,
    startTime: new Date(),
    averageConfidence: 0,
  };

  try {
    // Count total sessions to process
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(kintellSessions);

    // Build WHERE conditions
    const whereConditions = [];

    // Note: Assuming sessions don't have programInstanceId field yet
    // If they do, we'd filter: isNull(kintellSessions.programInstanceId)

    if (companyId) {
      // Need to join with users to get companyId
      // For simplicity, we'll process all and filter in memory
      // In production, this should be optimized with proper joins
    }

    if (startDate) {
      whereConditions.push(sql`${kintellSessions.completedAt} >= ${startDate.toISOString()}`);
    }

    if (endDate) {
      whereConditions.push(sql`${kintellSessions.completedAt} <= ${endDate.toISOString()}`);
    }

    const countResult = await countQuery.where(
      whereConditions.length > 0 ? and(...whereConditions) : undefined
    );
    progress.totalRecords = countResult[0]?.count || 0;

    console.log(`Total sessions to process: ${progress.totalRecords}`);

    if (progress.totalRecords === 0) {
      console.log('No sessions to backfill.');
      return 0;
    }

    // Process in batches
    let offset = startFrom;
    const associationResults: AssociationResult[] = [];

    while (offset < progress.totalRecords) {
      // Fetch batch of sessions
      const sessionsBatch = await db
        .select({
          id: kintellSessions.id,
          participantId: kintellSessions.participantId,
          volunteerId: kintellSessions.volunteerId,
          completedAt: kintellSessions.completedAt,
        })
        .from(kintellSessions)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .limit(batchSize)
        .offset(offset);

      if (sessionsBatch.length === 0) {
        break;
      }

      // Process each session in batch
      for (const session of sessionsBatch) {
        progress.processedRecords++;

        try {
          // Get participant's company (simplified - in production, join with users table)
          const participantCompanyId = await getUserCompanyId(session.participantId);

          if (!participantCompanyId) {
            console.warn(`No company found for participant ${session.participantId}`);
            progress.failedRecords++;
            continue;
          }

          // Filter by company if specified
          if (companyId && participantCompanyId !== companyId) {
            continue;
          }

          // Associate session to campaign
          const sessionDate = session.completedAt || new Date();
          const result = await associateSessionToCampaign(
            session.id,
            session.participantId,
            participantCompanyId,
            sessionDate
          );

          associationResults.push(result);

          if (result.campaignId) {
            progress.associatedRecords++;
          } else {
            progress.failedRecords++;
          }

          if (result.requiresReview) {
            progress.reviewRequiredRecords++;
          }

          // Store association if not dry run
          if (!dryRun && result.campaignId) {
            await storeSessionAssociation(session.id, result);
          }
        } catch (error) {
          console.error(`Error processing session ${session.id}:`, error);
          progress.failedRecords++;
        }

        // Log progress at checkpoints
        if (progress.processedRecords % CHECKPOINT_INTERVAL === 0) {
          console.log(
            `Progress: ${progress.processedRecords}/${progress.totalRecords} (${Math.round(
              (progress.processedRecords / progress.totalRecords) * 100
            )}%)`
          );
        }
      }

      offset += batchSize;
    }

    // Calculate final stats
    const stats = getAssociationStats(associationResults);
    progress.averageConfidence = stats.averageConfidence;
    progress.endTime = new Date();

    // Log summary
    console.log('\n=== Backfill Complete ===');
    console.log(`Total processed: ${progress.processedRecords}`);
    console.log(`Successfully associated: ${progress.associatedRecords}`);
    console.log(`Failed: ${progress.failedRecords}`);
    console.log(`Requires manual review: ${progress.reviewRequiredRecords}`);
    console.log(`Average confidence: ${progress.averageConfidence.toFixed(2)}%`);
    console.log(
      `Duration: ${Math.round((progress.endTime.getTime() - progress.startTime.getTime()) / 1000)}s`
    );

    return progress.associatedRecords;
  } catch (error) {
    console.error('Error in backfillHistoricalSessions:', error);
    throw error;
  }
}

/**
 * Backfill historical buddy matches
 *
 * Associates buddy matches that don't yet have a programInstanceId to campaigns.
 *
 * @param options - Backfill options
 * @returns Number of matches associated
 */
export async function backfillHistoricalMatches(
  options: BackfillOptions = {}
): Promise<number> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    startFrom = 0,
    dryRun = false,
    companyId,
    startDate,
    endDate,
  } = options;

  console.log('Starting buddy matches backfill...');
  console.log('Options:', { batchSize, startFrom, dryRun, companyId, startDate, endDate });

  const progress: BackfillProgress = {
    entityType: 'matches',
    totalRecords: 0,
    processedRecords: 0,
    associatedRecords: 0,
    failedRecords: 0,
    reviewRequiredRecords: 0,
    startTime: new Date(),
    averageConfidence: 0,
  };

  try {
    // Count total matches to process
    const whereConditions = [];

    if (startDate) {
      whereConditions.push(sql`${buddyMatches.matchedAt} >= ${startDate.toISOString()}`);
    }

    if (endDate) {
      whereConditions.push(sql`${buddyMatches.matchedAt} <= ${endDate.toISOString()}`);
    }

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(buddyMatches)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    progress.totalRecords = countResult[0]?.count || 0;

    console.log(`Total buddy matches to process: ${progress.totalRecords}`);

    if (progress.totalRecords === 0) {
      console.log('No buddy matches to backfill.');
      return 0;
    }

    // Process in batches
    let offset = startFrom;
    const associationResults: AssociationResult[] = [];

    while (offset < progress.totalRecords) {
      // Fetch batch of matches
      const matchesBatch = await db
        .select({
          id: buddyMatches.id,
          participantId: buddyMatches.participantId,
          buddyId: buddyMatches.buddyId,
          matchedAt: buddyMatches.matchedAt,
        })
        .from(buddyMatches)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .limit(batchSize)
        .offset(offset);

      if (matchesBatch.length === 0) {
        break;
      }

      // Process each match in batch
      for (const match of matchesBatch) {
        progress.processedRecords++;

        try {
          // Get participant's company
          const participantCompanyId = await getUserCompanyId(match.participantId);

          if (!participantCompanyId) {
            console.warn(`No company found for participant ${match.participantId}`);
            progress.failedRecords++;
            continue;
          }

          // Filter by company if specified
          if (companyId && participantCompanyId !== companyId) {
            continue;
          }

          // Associate match to campaign
          const matchDate = match.matchedAt || new Date();
          const result = await associateBuddyMatchToCampaign(
            match.id,
            match.participantId,
            match.buddyId,
            participantCompanyId,
            matchDate
          );

          associationResults.push(result);

          if (result.campaignId) {
            progress.associatedRecords++;
          } else {
            progress.failedRecords++;
          }

          if (result.requiresReview) {
            progress.reviewRequiredRecords++;
          }

          // Store association if not dry run
          if (!dryRun && result.campaignId) {
            await storeMatchAssociation(match.id, result);
          }
        } catch (error) {
          console.error(`Error processing match ${match.id}:`, error);
          progress.failedRecords++;
        }

        // Log progress at checkpoints
        if (progress.processedRecords % CHECKPOINT_INTERVAL === 0) {
          console.log(
            `Progress: ${progress.processedRecords}/${progress.totalRecords} (${Math.round(
              (progress.processedRecords / progress.totalRecords) * 100
            )}%)`
          );
        }
      }

      offset += batchSize;
    }

    // Calculate final stats
    const stats = getAssociationStats(associationResults);
    progress.averageConfidence = stats.averageConfidence;
    progress.endTime = new Date();

    // Log summary
    console.log('\n=== Backfill Complete ===');
    console.log(`Total processed: ${progress.processedRecords}`);
    console.log(`Successfully associated: ${progress.associatedRecords}`);
    console.log(`Failed: ${progress.failedRecords}`);
    console.log(`Requires manual review: ${progress.reviewRequiredRecords}`);
    console.log(`Average confidence: ${progress.averageConfidence.toFixed(2)}%`);
    console.log(
      `Duration: ${Math.round((progress.endTime.getTime() - progress.startTime.getTime()) / 1000)}s`
    );

    return progress.associatedRecords;
  } catch (error) {
    console.error('Error in backfillHistoricalMatches:', error);
    throw error;
  }
}

/**
 * Backfill historical upskilling completions
 *
 * Associates learning progress records to campaigns.
 *
 * @param options - Backfill options
 * @returns Number of completions associated
 */
export async function backfillHistoricalCompletions(
  options: BackfillOptions = {}
): Promise<number> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    startFrom = 0,
    dryRun = false,
    companyId,
    startDate,
    endDate,
  } = options;

  console.log('Starting upskilling completions backfill...');
  console.log('Options:', { batchSize, startFrom, dryRun, companyId, startDate, endDate });

  const progress: BackfillProgress = {
    entityType: 'completions',
    totalRecords: 0,
    processedRecords: 0,
    associatedRecords: 0,
    failedRecords: 0,
    reviewRequiredRecords: 0,
    startTime: new Date(),
    averageConfidence: 0,
  };

  try {
    // Count total completions to process (only completed courses)
    const whereConditions = [eq(learningProgress.status, 'completed')];

    if (startDate && learningProgress.completedAt) {
      whereConditions.push(sql`${learningProgress.completedAt} >= ${startDate.toISOString()}`);
    }

    if (endDate && learningProgress.completedAt) {
      whereConditions.push(sql`${learningProgress.completedAt} <= ${endDate.toISOString()}`);
    }

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(learningProgress)
      .where(and(...whereConditions));

    progress.totalRecords = countResult[0]?.count || 0;

    console.log(`Total completions to process: ${progress.totalRecords}`);

    if (progress.totalRecords === 0) {
      console.log('No completions to backfill.');
      return 0;
    }

    // Process in batches
    let offset = startFrom;
    const associationResults: AssociationResult[] = [];

    while (offset < progress.totalRecords) {
      // Fetch batch of completions
      const completionsBatch = await db
        .select({
          id: learningProgress.id,
          userId: learningProgress.userId,
          completedAt: learningProgress.completedAt,
        })
        .from(learningProgress)
        .where(and(...whereConditions))
        .limit(batchSize)
        .offset(offset);

      if (completionsBatch.length === 0) {
        break;
      }

      // Process each completion in batch
      for (const completion of completionsBatch) {
        progress.processedRecords++;

        try {
          // Get user's company
          const userCompanyId = await getUserCompanyId(completion.userId);

          if (!userCompanyId) {
            console.warn(`No company found for user ${completion.userId}`);
            progress.failedRecords++;
            continue;
          }

          // Filter by company if specified
          if (companyId && userCompanyId !== companyId) {
            continue;
          }

          // Associate completion to campaign
          const completionDate = completion.completedAt || new Date();
          const result = await associateUpskillingCompletionToCampaign(
            completion.id,
            completion.userId,
            userCompanyId,
            completionDate
          );

          associationResults.push(result);

          if (result.campaignId) {
            progress.associatedRecords++;
          } else {
            progress.failedRecords++;
          }

          if (result.requiresReview) {
            progress.reviewRequiredRecords++;
          }

          // Store association if not dry run
          if (!dryRun && result.campaignId) {
            await storeCompletionAssociation(completion.id, result);
          }
        } catch (error) {
          console.error(`Error processing completion ${completion.id}:`, error);
          progress.failedRecords++;
        }

        // Log progress at checkpoints
        if (progress.processedRecords % CHECKPOINT_INTERVAL === 0) {
          console.log(
            `Progress: ${progress.processedRecords}/${progress.totalRecords} (${Math.round(
              (progress.processedRecords / progress.totalRecords) * 100
            )}%)`
          );
        }
      }

      offset += batchSize;
    }

    // Calculate final stats
    const stats = getAssociationStats(associationResults);
    progress.averageConfidence = stats.averageConfidence;
    progress.endTime = new Date();

    // Log summary
    console.log('\n=== Backfill Complete ===');
    console.log(`Total processed: ${progress.processedRecords}`);
    console.log(`Successfully associated: ${progress.associatedRecords}`);
    console.log(`Failed: ${progress.failedRecords}`);
    console.log(`Requires manual review: ${progress.reviewRequiredRecords}`);
    console.log(`Average confidence: ${progress.averageConfidence.toFixed(2)}%`);
    console.log(
      `Duration: ${Math.round((progress.endTime.getTime() - progress.startTime.getTime()) / 1000)}s`
    );

    return progress.associatedRecords;
  } catch (error) {
    console.error('Error in backfillHistoricalCompletions:', error);
    throw error;
  }
}

/**
 * Backfill all historical data (sessions, matches, completions)
 *
 * @param options - Backfill options
 * @returns Total number of records associated
 */
export async function backfillAllHistoricalData(
  options: BackfillOptions = {}
): Promise<{
  sessions: number;
  matches: number;
  completions: number;
  total: number;
}> {
  console.log('=== Starting Full Historical Backfill ===\n');

  const sessionCount = await backfillHistoricalSessions(options);
  console.log('\n');

  const matchCount = await backfillHistoricalMatches(options);
  console.log('\n');

  const completionCount = await backfillHistoricalCompletions(options);
  console.log('\n');

  const total = sessionCount + matchCount + completionCount;

  console.log('=== Full Backfill Complete ===');
  console.log(`Total sessions associated: ${sessionCount}`);
  console.log(`Total matches associated: ${matchCount}`);
  console.log(`Total completions associated: ${completionCount}`);
  console.log(`Grand total: ${total}`);

  return {
    sessions: sessionCount,
    matches: matchCount,
    completions: completionCount,
    total,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get company ID for a user
 *
 * @param userId - User ID
 * @returns Company ID or null
 */
async function getUserCompanyId(userId: string): Promise<string | null> {
  try {
    const userRecord = await db
      .select({
        companyId: companies.id,
      })
      .from(users)
      .innerJoin(companies, eq(users.companyId, companies.id))
      .where(eq(users.id, userId))
      .limit(1);

    return userRecord.length > 0 ? userRecord[0].companyId : null;
  } catch (error) {
    console.error(`Error getting company ID for user ${userId}:`, error);
    return null;
  }
}

/**
 * Store session association - Update kintell_sessions table
 *
 * @param sessionId - Session ID
 * @param result - Association result
 */
async function storeSessionAssociation(
  sessionId: string,
  result: AssociationResult
): Promise<void> {
  try {
    // SWARM 6: Agent 4.3 - Update kintell_sessions with programInstanceId
    await db.update(kintellSessions)
      .set({ programInstanceId: result.programInstanceId })
      .where(eq(kintellSessions.id, sessionId));

    console.log(
      `Associated session ${sessionId} to campaign ${result.campaignId} (instance: ${result.programInstanceId})`
    );
  } catch (error) {
    console.error(`Error storing session association for ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Store match association - Update buddy_matches table
 *
 * @param matchId - Match ID
 * @param result - Association result
 */
async function storeMatchAssociation(
  matchId: string,
  result: AssociationResult
): Promise<void> {
  try {
    // SWARM 6: Agent 4.3 - Update buddy_matches with programInstanceId
    await db.update(buddyMatches)
      .set({ programInstanceId: result.programInstanceId })
      .where(eq(buddyMatches.id, matchId));

    console.log(
      `Associated buddy match ${matchId} to campaign ${result.campaignId} (instance: ${result.programInstanceId})`
    );
  } catch (error) {
    console.error(`Error storing match association for ${matchId}:`, error);
    throw error;
  }
}

/**
 * Store completion association - Update learning_progress table
 *
 * @param completionId - Completion ID
 * @param result - Association result
 */
async function storeCompletionAssociation(
  completionId: string,
  result: AssociationResult
): Promise<void> {
  try {
    // SWARM 6: Agent 4.3 - Update learning_progress with programInstanceId
    await db.update(learningProgress)
      .set({ programInstanceId: result.programInstanceId })
      .where(eq(learningProgress.id, completionId));

    console.log(
      `Associated completion ${completionId} to campaign ${result.campaignId} (instance: ${result.programInstanceId})`
    );
  } catch (error) {
    console.error(`Error storing completion association for ${completionId}:`, error);
    throw error;
  }
}
