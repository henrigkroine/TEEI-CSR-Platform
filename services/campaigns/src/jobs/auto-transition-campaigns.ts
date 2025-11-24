/**
 * Auto-Transition Campaigns Cron Job
 *
 * Runs hourly to check for campaigns eligible for automatic state transitions:
 * - planned/recruiting → active (when startDate reached)
 * - active → completed (when endDate reached)
 *
 * Also checks capacity alerts for active campaigns.
 *
 * SWARM 6: Agent 3.4 (campaign-lifecycle-manager)
 * Reference: /docs/CAMPAIGN_LIFECYCLE.md
 *
 * Schedule: Hourly (cron: 0 * * * *)
 */

import { autoTransitionCheck, checkCapacityAlerts } from '../lib/lifecycle-manager.js';

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log auto-transition results to audit table
 *
 * TODO: Integrate with centralized audit/logging service
 */
async function logAutoTransitionRun(
  result: Awaited<ReturnType<typeof autoTransitionCheck>>,
  capacityResult: Awaited<ReturnType<typeof checkCapacityAlerts>>
): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    jobName: 'auto-transition-campaigns',
    campaignsChecked: result.campaignsChecked,
    campaignsTransitioned: result.campaignsTransitioned,
    capacityCampaignsChecked: capacityResult.campaignsChecked,
    capacityAlertsTriggered: capacityResult.nearCapacity + capacityResult.overCapacity,
    transitions: result.transitions,
    errors: result.errors,
    capacityAlerts: capacityResult.alerts,
  };

  console.log('[Auto-Transition Job] Audit log:', JSON.stringify(logEntry, null, 2));

  // TODO: Store in audit_logs table or send to monitoring service
  // await db.insert(auditLogs).values({
  //   eventType: 'campaign_auto_transition',
  //   eventData: logEntry,
  //   timestamp: new Date(),
  // });
}

// ============================================================================
// MAIN JOB FUNCTION
// ============================================================================

/**
 * Main cron job execution function
 *
 * Called by scheduler (e.g., node-cron, Kubernetes CronJob, etc.)
 */
export async function runAutoTransitionJob(): Promise<void> {
  const startTime = Date.now();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('[Auto-Transition Job] Starting at', new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════');

  try {
    // 1. Run auto-transition check
    console.log('\n[Step 1/2] Checking campaign state transitions...');
    const transitionResult = await autoTransitionCheck(false); // Execute (not dry run)

    console.log(
      `✓ Transitions: ${transitionResult.campaignsTransitioned}/${transitionResult.campaignsChecked} campaigns`
    );

    if (transitionResult.transitions.length > 0) {
      console.log('\nTransitioned campaigns:');
      transitionResult.transitions.forEach((t) => {
        console.log(
          `  - ${t.campaignName} (${t.campaignId}): ${t.from} → ${t.to} [${t.reason}]`
        );
      });
    }

    if (transitionResult.errors.length > 0) {
      console.warn('\n⚠️  Errors during transitions:');
      transitionResult.errors.forEach((e) => {
        console.warn(`  - Campaign ${e.campaignId}: ${e.error}`);
      });
    }

    // 2. Check capacity alerts
    console.log('\n[Step 2/2] Checking campaign capacity alerts...');
    const capacityResult = await checkCapacityAlerts();

    console.log(
      `✓ Capacity: ${capacityResult.campaignsChecked} campaigns checked, ${capacityResult.nearCapacity} near capacity, ${capacityResult.overCapacity} over capacity`
    );

    if (capacityResult.alerts.length > 0) {
      console.log('\nCapacity alerts triggered:');
      capacityResult.alerts.forEach((a) => {
        const emoji = a.alert === 'over' ? '🔴' : '🟡';
        console.log(
          `  ${emoji} ${a.campaignName} (${a.campaignId}): ${(a.utilization * 100).toFixed(1)}% capacity (${a.alert})`
        );
      });

      // TODO: Send alert notifications
      // - Email to CS team for near capacity (upsell opportunity)
      // - Urgent alert to admin for over capacity (expansion needed)
      console.log('\n📧 TODO: Send alert notifications to CS team/admins');
    }

    // 3. Log results
    await logAutoTransitionRun(transitionResult, capacityResult);

    const duration = Date.now() - startTime;
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`[Auto-Transition Job] Completed in ${duration}ms`);
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('[Auto-Transition Job] FATAL ERROR:', error);
    const duration = Date.now() - startTime;
    console.log(`[Auto-Transition Job] Failed after ${duration}ms\n`);

    // TODO: Send error notification to on-call
    throw error;
  }
}

// ============================================================================
// STANDALONE EXECUTION
// ============================================================================

/**
 * Allow running job directly (for testing or manual execution)
 *
 * Usage:
 *   tsx src/jobs/auto-transition-campaigns.ts
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('[Auto-Transition Job] Running in standalone mode...\n');

  runAutoTransitionJob()
    .then(() => {
      console.log('[Auto-Transition Job] Standalone execution complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Auto-Transition Job] Standalone execution failed:', error);
      process.exit(1);
    });
}

// ============================================================================
// EXPORTS
// ============================================================================

export { runAutoTransitionJob };
export default runAutoTransitionJob;
