/**
 * Track Seat Usage Cron Job
 *
 * SWARM 6: Agent 5.1 - billing-integrator
 *
 * Runs hourly to:
 * 1. Collect current volunteer counts per campaign
 * 2. Create billing usage records for seat consumption
 * 3. Handle idempotency to prevent duplicate charges
 * 4. Support all pricing models (seats, bundle, IAAS, etc.)
 *
 * Job Details:
 * - Frequency: Hourly (configurable via SEAT_USAGE_CRON_INTERVAL)
 * - Scope: All active campaigns with volunteer seats
 * - Idempotency: Uses deduplicationKey to prevent duplicates
 * - Billing: Creates usage records in billingUsageRecords table
 *
 * Flow:
 * 1. Query campaigns with current_volunteers > 0
 * 2. For each campaign, create usage event
 * 3. BillingIntegrator.trackCampaignUsage() handles deduplication
 * 4. Log successful tracking + any failures
 * 5. Update job execution metrics
 */

import postgres from 'postgres';
import { createBillingIntegrator } from '../lib/billing-integrator.js';
import type { UsageTrackingEvent } from '../lib/billing-integrator.js';

// ============================================================================
// TYPES & CONFIG
// ============================================================================

interface JobContext {
  sql: postgres.Sql;
  startTime: Date;
  jobId: string;
}

interface JobResult {
  success: boolean;
  jobId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  campaignsProcessed: number;
  usageRecordsCreated: number;
  duplicatesDetected: number;
  errors: Array<{
    campaignId: string;
    error: string;
  }>;
}

// ============================================================================
// SEAT USAGE TRACKING JOB
// ============================================================================

/**
 * Main job function - tracks seat usage for all active campaigns
 */
export async function trackSeatUsageJob(sql: postgres.Sql): Promise<JobResult> {
  const jobId = `seat-usage-${Date.now()}`;
  const context: JobContext = {
    sql,
    startTime: new Date(),
    jobId
  };

  console.log(`[${jobId}] Starting seat usage tracking job`);

  const result: JobResult = {
    success: true,
    jobId,
    startTime: context.startTime,
    endTime: new Date(),
    duration: 0,
    campaignsProcessed: 0,
    usageRecordsCreated: 0,
    duplicatesDetected: 0,
    errors: []
  };

  try {
    const integrator = createBillingIntegrator(sql);

    // Get all active campaigns with volunteers
    const campaigns = await sql`
      SELECT
        id,
        name,
        company_id,
        current_volunteers,
        target_volunteers,
        pricing_model,
        status,
        start_date,
        end_date
      FROM campaigns
      WHERE
        is_active = true
        AND status IN ('active', 'recruiting')
        AND current_volunteers > 0
      ORDER BY id ASC
    `;

    console.log(`[${jobId}] Found ${campaigns.length} active campaigns with volunteers`);

    // Process each campaign
    for (const campaign of campaigns) {
      try {
        result.campaignsProcessed++;

        // Create usage tracking event for current volunteer count
        const usageEvent: UsageTrackingEvent = {
          campaignId: campaign.id,
          eventType: 'seat_usage',
          quantity: campaign.current_volunteers,
          timestamp: new Date(),
          metadata: {
            campaignName: campaign.name,
            pricingModel: campaign.pricing_model,
            targetVolunteers: campaign.target_volunteers,
            utilizationPercent: (campaign.current_volunteers / campaign.target_volunteers) * 100,
            jobId: context.jobId
          }
        };

        // Track usage via BillingIntegrator
        const trackingResult = await integrator.trackCampaignUsage(usageEvent);

        if (trackingResult.success) {
          if (trackingResult.isDuplicate) {
            result.duplicatesDetected++;
            console.log(
              `[${jobId}] Campaign ${campaign.id}: Duplicate seat usage record detected (already tracked)`
            );
          } else {
            result.usageRecordsCreated++;
            console.log(`[${jobId}] Campaign ${campaign.id}: Seat usage record created (${campaign.current_volunteers} seats)`);
          }
        } else {
          result.errors.push({
            campaignId: campaign.id,
            error: trackingResult.reason || 'Unknown error'
          });
          console.error(`[${jobId}] Campaign ${campaign.id}: Failed to track usage - ${trackingResult.reason}`);
        }
      } catch (error) {
        result.errors.push({
          campaignId: campaign.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`[${jobId}] Campaign ${campaign.id}: Exception during processing`, error);
        result.success = false;
      }
    }

    // Log summary
    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();

    console.log(`[${jobId}] Job completed in ${result.duration}ms`);
    console.log(`[${jobId}] Summary: ${result.campaignsProcessed} campaigns, ${result.usageRecordsCreated} records created, ${result.duplicatesDetected} duplicates, ${result.errors.length} errors`);

    // Log errors
    if (result.errors.length > 0) {
      console.error(`[${jobId}] Errors encountered:`, result.errors);
    }

    return result;
  } catch (error) {
    result.success = false;
    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();
    result.errors.push({
      campaignId: 'system',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    console.error(`[${jobId}] Job failed with error:`, error);
    return result;
  }
}

/**
 * Optional: Store job result in database for auditing
 */
export async function saveJobResult(sql: postgres.Sql, result: JobResult): Promise<void> {
  try {
    await sql`
      INSERT INTO job_executions (
        job_name,
        job_id,
        status,
        started_at,
        ended_at,
        duration_ms,
        records_processed,
        records_created,
        errors_count,
        result_data
      ) VALUES (
        'track_seat_usage',
        ${result.jobId},
        ${result.success ? 'success' : 'failed'},
        ${result.startTime},
        ${result.endTime},
        ${result.duration},
        ${result.campaignsProcessed},
        ${result.usageRecordsCreated},
        ${result.errors.length},
        ${JSON.stringify(result)}
      )
    `;
  } catch (error) {
    console.error('Failed to save job execution result:', error);
    // Don't throw - this is non-critical
  }
}

// ============================================================================
// CRON SCHEDULE HANDLER (for cron runner)
// ============================================================================

/**
 * Handler for cron runner - exports default handler
 * Usage with node-cron or similar:
 *
 * ```
 * import cron from 'node-cron';
 * import { trackSeatUsageJob } from './track-seat-usage.js';
 * import { getSqlClient } from '../db/connection.js';
 *
 * // Run hourly
 * cron.schedule('0 * * * *', async () => {
 *   const sql = getSqlClient();
 *   await trackSeatUsageJob(sql);
 * });
 * ```
 */
export default trackSeatUsageJob;
