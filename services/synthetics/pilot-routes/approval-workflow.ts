/**
 * Synthetic Monitor: Approval Workflow
 *
 * Monitors approval submission flow for pilot tenants
 * - Tests report draft → review → approve lifecycle
 * - Validates version diff generation
 * - Monitors approval API endpoints
 * - Tracks workflow state transitions (< 2s target)
 *
 * Runs every 5 minutes for all pilot tenants
 * Alerts on 2 consecutive failures or state corruption
 *
 * @module synthetics/pilot-routes/approval-workflow
 */

import { initializeOTel, traceAsync, addSpanAttributes } from '@teei/observability';
import axios, { AxiosError } from 'axios';

export interface ApprovalWorkflowMetrics {
  timestamp: number;
  tenantId: string;
  workflowId: string;
  success: boolean;

  // Workflow stages timing
  draftCreationTime: number;
  reviewSubmissionTime: number;
  approvalTime: number;
  versionDiffTime: number;
  totalWorkflowTime: number;

  // State validation
  stateTransitionsValid: boolean;
  versionDiffGenerated: boolean;
  auditTrailPresent: boolean;
  notificationsSent: boolean;

  // Performance gate
  withinPerformanceGate: boolean; // < 2s per transition

  currentState?: string;
  error?: string;
}

export interface WorkflowTransition {
  from: string;
  to: string;
  timestamp: number;
  actor: string;
  comment?: string;
}

const PERFORMANCE_GATE = {
  DRAFT_CREATION: 1000, // 1 second
  REVIEW_SUBMISSION: 2000, // 2 seconds
  APPROVAL: 2000, // 2 seconds
  VERSION_DIFF: 1500, // 1.5 seconds
};

const WORKFLOW_STATES = {
  DRAFT: 'draft',
  REVIEW: 'in_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
};

// Track consecutive failures
const failureCount = new Map<string, number>();

/**
 * Monitor approval workflow for a single tenant
 */
export async function monitorApprovalWorkflow(
  tenantId: string,
  baseUrl: string,
  consecutiveFailureThreshold = 2
): Promise<ApprovalWorkflowMetrics> {
  return traceAsync(
    'synthetic.approval_workflow',
    async (_span) => {
      addSpanAttributes({
        'tenant.id': tenantId,
        'monitor.route': 'approval-workflow',
      });

      const timestamp = Date.now();
      const workflowId = `synthetic-wf-${Date.now()}`;

      let metrics: ApprovalWorkflowMetrics = {
        timestamp,
        tenantId,
        workflowId,
        success: false,
        draftCreationTime: 0,
        reviewSubmissionTime: 0,
        approvalTime: 0,
        versionDiffTime: 0,
        totalWorkflowTime: 0,
        stateTransitionsValid: false,
        versionDiffGenerated: false,
        auditTrailPresent: false,
        notificationsSent: false,
        withinPerformanceGate: false,
      };

      const transitions: WorkflowTransition[] = [];

      try {
        const workflowStart = Date.now();

        // Step 1: Create draft report
        const draftStart = Date.now();
        const draftResponse = await axios.post(
          `${baseUrl}/api/reports/draft`,
          {
            title: 'Synthetic Monitor Test Report',
            type: 'governance-report',
            content: {
              summary: 'Test report for approval workflow monitoring',
            },
            metadata: {
              syntheticMonitor: true,
              workflowId,
            },
          },
          {
            timeout: 5000,
            headers: {
              'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (draftResponse.status !== 201) {
          throw new Error(`Draft creation returned status ${draftResponse.status}`);
        }

        const draftEnd = Date.now();
        metrics.draftCreationTime = draftEnd - draftStart;

        const reportId = draftResponse.data.reportId || draftResponse.data.id;
        const currentState = draftResponse.data.state || draftResponse.data.status;

        if (currentState !== WORKFLOW_STATES.DRAFT) {
          throw new Error(`Invalid initial state: ${currentState} (expected: ${WORKFLOW_STATES.DRAFT})`);
        }

        transitions.push({
          from: 'none',
          to: WORKFLOW_STATES.DRAFT,
          timestamp: draftEnd,
          actor: 'synthetic-monitor',
        });

        // Step 2: Submit for review
        const reviewStart = Date.now();
        const reviewResponse = await axios.post(
          `${baseUrl}/api/reports/${reportId}/submit-review`,
          {
            reviewers: ['reviewer-1@test.com'],
            comment: 'Submitting for approval - synthetic test',
          },
          {
            timeout: 5000,
            headers: {
              'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (reviewResponse.status !== 200) {
          throw new Error(`Review submission returned status ${reviewResponse.status}`);
        }

        const reviewEnd = Date.now();
        metrics.reviewSubmissionTime = reviewEnd - reviewStart;

        const reviewState = reviewResponse.data.state || reviewResponse.data.status;

        if (reviewState !== WORKFLOW_STATES.REVIEW) {
          throw new Error(`Invalid review state: ${reviewState} (expected: ${WORKFLOW_STATES.REVIEW})`);
        }

        transitions.push({
          from: WORKFLOW_STATES.DRAFT,
          to: WORKFLOW_STATES.REVIEW,
          timestamp: reviewEnd,
          actor: 'synthetic-monitor',
        });

        // Step 3: Request version diff
        const diffStart = Date.now();
        const diffResponse = await axios.get(
          `${baseUrl}/api/reports/${reportId}/version-diff`,
          {
            timeout: 3000,
            headers: {
              'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
            },
          }
        );

        const diffEnd = Date.now();
        metrics.versionDiffTime = diffEnd - diffStart;
        metrics.versionDiffGenerated = diffResponse.status === 200 && !!diffResponse.data.diff;

        // Step 4: Approve report
        const approvalStart = Date.now();
        const approvalResponse = await axios.post(
          `${baseUrl}/api/reports/${reportId}/approve`,
          {
            approved: true,
            comment: 'Approved - synthetic test',
          },
          {
            timeout: 5000,
            headers: {
              'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (approvalResponse.status !== 200) {
          throw new Error(`Approval returned status ${approvalResponse.status}`);
        }

        const approvalEnd = Date.now();
        metrics.approvalTime = approvalEnd - approvalStart;

        const approvedState = approvalResponse.data.state || approvalResponse.data.status;

        if (approvedState !== WORKFLOW_STATES.APPROVED) {
          throw new Error(`Invalid approved state: ${approvedState} (expected: ${WORKFLOW_STATES.APPROVED})`);
        }

        transitions.push({
          from: WORKFLOW_STATES.REVIEW,
          to: WORKFLOW_STATES.APPROVED,
          timestamp: approvalEnd,
          actor: 'synthetic-monitor',
        });

        // Step 5: Verify audit trail
        const auditResponse = await axios.get(
          `${baseUrl}/api/reports/${reportId}/audit-trail`,
          {
            timeout: 2000,
            headers: {
              'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
            },
          }
        );

        metrics.auditTrailPresent =
          auditResponse.status === 200 &&
          Array.isArray(auditResponse.data.trail) &&
          auditResponse.data.trail.length >= 3; // At least 3 state transitions

        // Step 6: Check if notifications were queued
        metrics.notificationsSent =
          approvalResponse.data.notificationsQueued === true ||
          approvalResponse.data.notifications?.length > 0;

        // Calculate total workflow time
        const workflowEnd = Date.now();
        metrics.totalWorkflowTime = workflowEnd - workflowStart;
        metrics.currentState = approvedState;

        // Validate state transitions
        const expectedTransitions = [
          { from: 'none', to: WORKFLOW_STATES.DRAFT },
          { from: WORKFLOW_STATES.DRAFT, to: WORKFLOW_STATES.REVIEW },
          { from: WORKFLOW_STATES.REVIEW, to: WORKFLOW_STATES.APPROVED },
        ];

        metrics.stateTransitionsValid = transitions.length === expectedTransitions.length &&
          transitions.every((t, i) =>
            t.from === expectedTransitions[i].from &&
            t.to === expectedTransitions[i].to
          );

        // Check performance gates
        const performanceViolations: string[] = [];

        if (metrics.draftCreationTime > PERFORMANCE_GATE.DRAFT_CREATION) {
          performanceViolations.push(
            `Draft creation: ${metrics.draftCreationTime}ms > ${PERFORMANCE_GATE.DRAFT_CREATION}ms`
          );
        }

        if (metrics.reviewSubmissionTime > PERFORMANCE_GATE.REVIEW_SUBMISSION) {
          performanceViolations.push(
            `Review submission: ${metrics.reviewSubmissionTime}ms > ${PERFORMANCE_GATE.REVIEW_SUBMISSION}ms`
          );
        }

        if (metrics.approvalTime > PERFORMANCE_GATE.APPROVAL) {
          performanceViolations.push(
            `Approval: ${metrics.approvalTime}ms > ${PERFORMANCE_GATE.APPROVAL}ms`
          );
        }

        if (metrics.versionDiffTime > PERFORMANCE_GATE.VERSION_DIFF) {
          performanceViolations.push(
            `Version diff: ${metrics.versionDiffTime}ms > ${PERFORMANCE_GATE.VERSION_DIFF}ms`
          );
        }

        metrics.withinPerformanceGate = performanceViolations.length === 0;

        if (performanceViolations.length > 0) {
          console.warn(`⚠️  Performance violations for ${tenantId}:`);
          performanceViolations.forEach((v) => console.warn(`   - ${v}`));

          addSpanAttributes({
            'monitor.performance_violations': performanceViolations.join(', '),
            'monitor.severity': 'warning',
          });
        }

        // Quality checks
        const qualityIssues: string[] = [];

        if (!metrics.versionDiffGenerated) {
          qualityIssues.push('Version diff not generated');
        }

        if (!metrics.auditTrailPresent) {
          qualityIssues.push('Audit trail incomplete');
        }

        if (!metrics.notificationsSent) {
          qualityIssues.push('Notifications not sent');
        }

        if (qualityIssues.length > 0) {
          console.warn(`⚠️  Quality issues for ${tenantId}:`);
          qualityIssues.forEach((issue) => console.warn(`   - ${issue}`));
        }

        // Cleanup: Delete test report
        try {
          await axios.delete(`${baseUrl}/api/reports/${reportId}`, {
            timeout: 2000,
            headers: {
              'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
            },
          });
        } catch (cleanupError) {
          console.warn(`⚠️  Failed to cleanup test report ${reportId}`);
        }

        // Mark success
        metrics.success = true;
        failureCount.set(tenantId, 0);

        // Record metrics to span
        addSpanAttributes({
          'monitor.success': true,
          'monitor.total_time_ms': metrics.totalWorkflowTime,
          'monitor.draft_time_ms': metrics.draftCreationTime,
          'monitor.review_time_ms': metrics.reviewSubmissionTime,
          'monitor.approval_time_ms': metrics.approvalTime,
          'monitor.diff_time_ms': metrics.versionDiffTime,
          'monitor.transitions_valid': metrics.stateTransitionsValid,
          'monitor.version_diff_generated': metrics.versionDiffGenerated,
          'monitor.audit_trail_present': metrics.auditTrailPresent,
          'monitor.within_gate': metrics.withinPerformanceGate,
        });

        const gateStatus = metrics.withinPerformanceGate ? '✅' : '⚠️';
        console.log(
          `${gateStatus} Tenant ${tenantId} approval workflow: ${metrics.totalWorkflowTime}ms (${transitions.length} transitions)`
        );

        return metrics;
      } catch (error) {
        const errorMessage = error instanceof AxiosError
          ? `${error.message} (${error.code || error.response?.status})`
          : error instanceof Error
          ? error.message
          : 'Unknown error';

        metrics.error = errorMessage;
        metrics.success = false;

        // Track consecutive failures
        const currentFailures = (failureCount.get(tenantId) || 0) + 1;
        failureCount.set(tenantId, currentFailures);

        // Alert on threshold breach
        if (currentFailures >= consecutiveFailureThreshold) {
          console.error(
            `🚨 ALERT: Tenant ${tenantId} approval workflow has ${currentFailures} consecutive failures!`
          );
          await sendAlert(tenantId, workflowId, currentFailures, errorMessage);
        } else {
          console.error(
            `❌ Tenant ${tenantId} approval workflow failed (${currentFailures}/${consecutiveFailureThreshold}): ${errorMessage}`
          );
        }

        // Record failure
        addSpanAttributes({
          'monitor.success': false,
          'monitor.error': errorMessage,
          'monitor.consecutive_failures': currentFailures,
        });

        return metrics;
      }
    },
    {
      'monitor.type': 'synthetic',
      'monitor.route': 'approval-workflow',
      'monitor.interval_minutes': 5,
    }
  );
}

/**
 * Send alert notification
 */
async function sendAlert(
  tenantId: string,
  workflowId: string,
  failureCount: number,
  error: string
): Promise<void> {
  const alertPayload = {
    timestamp: new Date().toISOString(),
    severity: 'critical',
    monitor: 'approval-workflow',
    tenantId,
    workflowId,
    consecutiveFailures: failureCount,
    error,
    actionRequired: 'Investigate approval workflow service and state machine',
  };

  console.error('SYNTHETIC_MONITOR_ALERT', JSON.stringify(alertPayload, null, 2));
}

/**
 * Monitor all pilot tenants
 */
export async function monitorAllApprovalWorkflows(): Promise<ApprovalWorkflowMetrics[]> {
  const pilotTenants = [
    { id: 'acme-corp', url: 'https://acme.teei-platform.com' },
    { id: 'globex-inc', url: 'https://globex.teei-platform.com' },
    { id: 'initech-ltd', url: 'https://initech.teei-platform.com' },
  ];

  console.log(`🔍 Starting approval workflow monitoring for ${pilotTenants.length} pilot tenants...`);

  const results = await Promise.allSettled(
    pilotTenants.map((tenant) => monitorApprovalWorkflow(tenant.id, tenant.url))
  );

  const metrics: ApprovalWorkflowMetrics[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        timestamp: Date.now(),
        tenantId: pilotTenants[index].id,
        workflowId: `failed-${Date.now()}`,
        success: false,
        draftCreationTime: 0,
        reviewSubmissionTime: 0,
        approvalTime: 0,
        versionDiffTime: 0,
        totalWorkflowTime: 0,
        stateTransitionsValid: false,
        versionDiffGenerated: false,
        auditTrailPresent: false,
        notificationsSent: false,
        withinPerformanceGate: false,
        error: result.reason?.message || 'Monitor execution failed',
      };
    }
  });

  // Aggregate stats
  const successCount = metrics.filter((m) => m.success).length;
  const gateCompliant = metrics.filter((m) => m.withinPerformanceGate).length;
  const avgWorkflowTime = metrics.reduce((sum, m) => sum + m.totalWorkflowTime, 0) / metrics.length;

  console.log(`📊 Approval Workflow Summary:`);
  console.log(`   - Total Tests: ${metrics.length}`);
  console.log(`   - Successful: ${successCount}`);
  console.log(`   - Performance Gate Compliant: ${gateCompliant}/${metrics.length}`);
  console.log(`   - Avg Workflow Time: ${avgWorkflowTime.toFixed(0)}ms`);

  return metrics;
}

/**
 * Scheduled monitor execution
 */
export async function runScheduledMonitor(): Promise<void> {
  initializeOTel({
    serviceName: 'synthetics-approval-workflow',
    environment: process.env.NODE_ENV || 'production',
    exporterType: 'otlp',
  });

  await monitorAllApprovalWorkflows();
  console.log(`✓ Approval workflow monitoring complete at ${new Date().toISOString()}`);
}

if (require.main === module) {
  runScheduledMonitor().catch((error) => {
    console.error('Approval workflow monitor failed:', error);
    process.exit(1);
  });
}
