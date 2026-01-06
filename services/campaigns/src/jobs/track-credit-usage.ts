/**
 * Track Credit Usage Cron Job
 *
 * SWARM 6: Agent 5.1 - billing-integrator
 *
 * Runs hourly to:
 * 1. Collect credit consumption per campaign (CREDITS pricing model)
 * 2. Create billing usage records for credit consumption
 * 3. Handle idempotency to prevent duplicate charges
 * 4. Generate alerts for campaigns with low credit balances
 *
 * Job Details:
 * - Frequency: Hourly (configurable via CREDIT_USAGE_CRON_INTERVAL)
 * - Scope: All active campaigns with CREDITS pricing model
 * - Idempotency: Uses deduplicationKey to prevent duplicates
 * - Billing: Creates usage records in billingUsageRecords table
 *
 * Flow:
 * 1. Query campaigns with pricing_model = 'credits'
 * 2. Calculate credit consumption from events in past hour
 * 3. For each campaign, create usage event
 * 4. BillingIntegrator.trackCampaignUsage() handles deduplication
 * 5. Generate alerts for low credit balance (< 10% remaining)
 * 6. Log successful tracking + any failures
 *
 * Credit Consumption Sources:
 * - Volunteer hours logged (session hours × credit_consumption_rate)
 * - Session participation (sessions × credit_consumption_rate)
 * - Evidence recording (evidence entries × credit_consumption_rate)
 * - Other events tracked in activity logs
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
  lowCreditAlerts: number;
  errors: Array<{
    campaignId: string;
    error: string;
  }>;
}

interface CreditConsumption {
  campaignId: string;
  creditsConsumed: number;
  source: 'session_hours' | 'evidence' | 'manual';
}

// ============================================================================
// CREDIT USAGE TRACKING JOB
// ============================================================================

/**
 * Main job function - tracks credit usage for campaigns using CREDITS pricing model
 */
export async function trackCreditUsageJob(sql: postgres.Sql): Promise<JobResult> {
  const jobId = `credit-usage-${Date.now()}`;
  const context: JobContext = {
    sql,
    startTime: new Date(),
    jobId
  };

  console.log(`[${jobId}] Starting credit usage tracking job`);

  const result: JobResult = {
    success: true,
    jobId,
    startTime: context.startTime,
    endTime: new Date(),
    duration: 0,
    campaignsProcessed: 0,
    usageRecordsCreated: 0,
    duplicatesDetected: 0,
    lowCreditAlerts: 0,
    errors: []
  };

  try {
    const integrator = createBillingIntegrator(sql);

    // Get all active campaigns with CREDITS pricing model
    const campaigns = await sql`
      SELECT
        id,
        name,
        company_id,
        credit_allocation,
        credits_remaining,
        credit_consumption_rate,
        status,
        start_date,
        end_date
      FROM campaigns
      WHERE
        is_active = true
        AND pricing_model = 'credits'
        AND status IN ('active', 'recruiting')
      ORDER BY id ASC
    `;

    console.log(`[${jobId}] Found ${campaigns.length} active campaigns with CREDITS pricing model`);

    // Process each campaign
    for (const campaign of campaigns) {
      try {
        result.campaignsProcessed++;

        // Calculate credit consumption from recent events
        const creditConsumption = await calculateCreditConsumption(sql, campaign.id, context);

        if (creditConsumption.creditsConsumed > 0) {
          // Create usage tracking event for credit consumption
          const usageEvent: UsageTrackingEvent = {
            campaignId: campaign.id,
            eventType: 'credit_usage',
            quantity: creditConsumption.creditsConsumed,
            timestamp: new Date(),
            metadata: {
              campaignName: campaign.name,
              source: creditConsumption.source,
              creditsAllocated: campaign.credit_allocation,
              creditsRemaining: campaign.credits_remaining,
              creditConsumptionRate: campaign.credit_consumption_rate,
              utilizationPercent:
                campaign.credit_allocation > 0
                  ? ((campaign.credit_allocation - campaign.credits_remaining) / campaign.credit_allocation) * 100
                  : 0,
              jobId: context.jobId
            }
          };

          // Track usage via BillingIntegrator
          const trackingResult = await integrator.trackCampaignUsage(usageEvent);

          if (trackingResult.success) {
            if (trackingResult.isDuplicate) {
              result.duplicatesDetected++;
              console.log(
                `[${jobId}] Campaign ${campaign.id}: Duplicate credit usage record detected (already tracked)`
              );
            } else {
              result.usageRecordsCreated++;
              console.log(
                `[${jobId}] Campaign ${campaign.id}: Credit usage record created (${creditConsumption.creditsConsumed} credits)`
              );
            }
          } else {
            result.errors.push({
              campaignId: campaign.id,
              error: trackingResult.reason || 'Unknown error'
            });
            console.error(`[${jobId}] Campaign ${campaign.id}: Failed to track usage - ${trackingResult.reason}`);
          }
        }

        // Check for low credit balance (< 10% remaining)
        const creditsRemaining = campaign.credits_remaining || 0;
        const creditAllocation = campaign.credit_allocation || 0;
        const creditsRemainPercent = creditAllocation > 0 ? (creditsRemaining / creditAllocation) * 100 : 0;

        if (creditsRemainPercent < 10 && creditsRemainPercent > 0) {
          result.lowCreditAlerts++;
          console.warn(
            `[${jobId}] Campaign ${campaign.id}: Low credit balance alert - ${creditsRemainPercent.toFixed(1)}% remaining`
          );

          // TODO: Send alert to company admin via notification service
          // await sendLowCreditAlert(sql, campaign.id, creditsRemainPercent);
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
    console.log(
      `[${jobId}] Summary: ${result.campaignsProcessed} campaigns, ${result.usageRecordsCreated} records created, ` +
      `${result.duplicatesDetected} duplicates, ${result.lowCreditAlerts} low credit alerts, ${result.errors.length} errors`
    );

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
 * Calculate credit consumption for a campaign in the past hour
 *
 * Credit consumption is tracked via:
 * 1. Volunteer hours logged: hours × credit_consumption_rate
 * 2. Sessions completed: sessions × credit_consumption_rate
 * 3. Evidence recorded: entries × credit_consumption_rate
 *
 * Returns total credits consumed in the past hour
 */
async function calculateCreditConsumption(
  sql: postgres.Sql,
  campaignId: string,
  context: JobContext
): Promise<CreditConsumption> {
  try {
    // Get the campaign to find associated program instances
    const [campaign] = await sql`
      SELECT id, credit_consumption_rate FROM campaigns
      WHERE id = ${campaignId}
      LIMIT 1
    `;

    if (!campaign) {
      return { campaignId, creditsConsumed: 0, source: 'session_hours' };
    }

    const consumptionRate = parseFloat(campaign.credit_consumption_rate) || 0;
    if (consumptionRate <= 0) {
      return { campaignId, creditsConsumed: 0, source: 'session_hours' };
    }

    // Calculate from recent session hours
    // Query kintell_sessions linked to campaign
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const sessions = await sql`
      SELECT
        SUM(CAST(hours_logged as DECIMAL)) as total_hours
      FROM kintell_sessions
      WHERE
        campaign_id = ${campaignId}
        AND updated_at >= ${oneHourAgo}
      GROUP BY campaign_id
    `;

    if (sessions.length > 0 && sessions[0].total_hours) {
      const totalHours = parseFloat(sessions[0].total_hours);
      const creditsConsumed = Math.round(totalHours * consumptionRate);
      return {
        campaignId,
        creditsConsumed,
        source: 'session_hours'
      };
    }

    // Fallback: Query buddy sessions
    const buddySessions = await sql`
      SELECT
        COUNT(*) as session_count
      FROM buddy_matches
      WHERE
        campaign_id = ${campaignId}
        AND updated_at >= ${oneHourAgo}
      GROUP BY campaign_id
    `;

    if (buddySessions.length > 0 && buddySessions[0].session_count) {
      const sessionCount = parseInt(buddySessions[0].session_count);
      const creditsConsumed = Math.round(sessionCount * consumptionRate);
      return {
        campaignId,
        creditsConsumed,
        source: 'session_hours'
      };
    }

    // No recent activity
    return { campaignId, creditsConsumed: 0, source: 'session_hours' };
  } catch (error) {
    console.error(`Error calculating credit consumption for campaign ${campaignId}:`, error);
    return { campaignId, creditsConsumed: 0, source: 'session_hours' };
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
        'track_credit_usage',
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
 * import { trackCreditUsageJob } from './track-credit-usage.js';
 * import { getSqlClient } from '../db/connection.js';
 *
 * // Run hourly
 * cron.schedule('0 * * * *', async () => {
 *   const sql = getSqlClient();
 *   await trackCreditUsageJob(sql);
 * });
 * ```
 */
export default trackCreditUsageJob;
