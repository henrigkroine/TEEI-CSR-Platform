#!/usr/bin/env node
/**
 * Weekly Dashboard Publisher
 *
 * Aggregates model quality metrics from the past 7 days and generates a comprehensive report.
 *
 * Usage:
 *   pnpm tsx scripts/publish-weekly-dashboard.ts
 *   pnpm tsx scripts/publish-weekly-dashboard.ts --output reports/custom-report.md
 *   pnpm tsx scripts/publish-weekly-dashboard.ts --days 14
 *
 * Metrics included:
 * - Accuracy delta vs baseline per tenant
 * - Latency p95 by tenant
 * - Cost per request by tenant
 * - Drift alerts count
 * - Shadow eval results
 * - Canary rollout outcomes
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Types
// ============================================================================

interface WeeklyMetrics {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  tenants: TenantMetrics[];
  globalSummary: GlobalSummary;
  driftAlerts: DriftAlertSummary[];
  shadowEvals: ShadowEvalSummary[];
  rollouts: RolloutSummary[];
}

interface TenantMetrics {
  tenantId: string;
  tenantName: string;
  requests: number;

  // Accuracy
  accuracy: number;
  accuracyBaseline: number;
  accuracyDelta: number;

  // Latency
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;

  // Cost
  totalCost: number;
  costPerRequest: number;
  costDelta: number;

  // Quality
  driftAlertsCount: number;
  activeOverrideVersion: string;
}

interface GlobalSummary {
  totalRequests: number;
  totalCost: number;
  avgAccuracy: number;
  avgLatencyP95: number;
  totalDriftAlerts: number;
  activeRollouts: number;
  completedRollouts: number;
  abortedRollouts: number;
}

interface DriftAlertSummary {
  tenantId: string;
  label: string;
  language: string;
  psiScore: number;
  jsScore: number;
  severity: string;
  timestamp: string;
}

interface ShadowEvalSummary {
  tenantId: string;
  experimentId: string;
  sampleSize: number;
  accuracyControl: number;
  accuracyVariant: number;
  accuracyDelta: number;
  latencyDelta: number;
  winner: 'control' | 'variant' | 'tie';
}

interface RolloutSummary {
  tenantId: string;
  rolloutId: string;
  fromVersion: string;
  toVersion: string;
  finalPhase: string;
  outcome: 'completed' | 'aborted' | 'in_progress';
  startedAt: string;
  completedAt?: string;
}

// ============================================================================
// Data Collection (Mock - Replace with actual DB queries)
// ============================================================================

/**
 * Collect metrics from the past N days
 * In production, this would query:
 * - Q2Q evaluation results from database
 * - Drift checks from drift_checks table
 * - Rollout states from rollout_states table
 * - Cost tracking from cost_tracking table
 */
async function collectWeeklyMetrics(days: number = 7): Promise<WeeklyMetrics> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  console.info(`[WeeklyDashboard] Collecting metrics from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  // Mock data - replace with actual database queries
  const metrics: WeeklyMetrics = {
    period: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      days,
    },
    tenants: [
      {
        tenantId: 'acme-corp',
        tenantName: 'Acme Corporation',
        requests: 12450,
        accuracy: 0.89,
        accuracyBaseline: 0.87,
        accuracyDelta: 0.02,
        latencyP50: 245,
        latencyP95: 780,
        latencyP99: 1250,
        totalCost: 124.50,
        costPerRequest: 0.01,
        costDelta: -0.002,
        driftAlertsCount: 2,
        activeOverrideVersion: '1.2.3',
      },
      {
        tenantId: 'globex',
        tenantName: 'Globex Industries',
        requests: 8920,
        accuracy: 0.91,
        accuracyBaseline: 0.90,
        accuracyDelta: 0.01,
        latencyP50: 210,
        latencyP95: 650,
        latencyP99: 980,
        totalCost: 89.20,
        costPerRequest: 0.01,
        costDelta: 0.001,
        driftAlertsCount: 0,
        activeOverrideVersion: '2.0.1',
      },
      {
        tenantId: 'umbrella',
        tenantName: 'Umbrella Corp',
        requests: 15680,
        accuracy: 0.85,
        accuracyBaseline: 0.88,
        accuracyDelta: -0.03,
        latencyP50: 310,
        latencyP95: 920,
        latencyP99: 1450,
        totalCost: 188.16,
        costPerRequest: 0.012,
        costDelta: 0.003,
        driftAlertsCount: 5,
        activeOverrideVersion: '1.1.9',
      },
    ],
    globalSummary: {
      totalRequests: 37050,
      totalCost: 401.86,
      avgAccuracy: 0.883,
      avgLatencyP95: 783,
      totalDriftAlerts: 7,
      activeRollouts: 1,
      completedRollouts: 2,
      abortedRollouts: 0,
    },
    driftAlerts: [
      {
        tenantId: 'umbrella',
        label: 'confidence',
        language: 'en',
        psiScore: 0.25,
        jsScore: 0.11,
        severity: 'high',
        timestamp: '2025-11-14T10:30:00Z',
      },
      {
        tenantId: 'umbrella',
        label: 'belonging',
        language: 'en',
        psiScore: 0.31,
        jsScore: 0.14,
        severity: 'critical',
        timestamp: '2025-11-14T15:45:00Z',
      },
      {
        tenantId: 'acme-corp',
        label: 'job_readiness',
        language: 'no',
        psiScore: 0.22,
        jsScore: 0.09,
        severity: 'medium',
        timestamp: '2025-11-13T08:20:00Z',
      },
    ],
    shadowEvals: [
      {
        tenantId: 'acme-corp',
        experimentId: 'shadow-001',
        sampleSize: 500,
        accuracyControl: 0.87,
        accuracyVariant: 0.89,
        accuracyDelta: 0.02,
        latencyDelta: 0.05,
        winner: 'variant',
      },
      {
        tenantId: 'globex',
        experimentId: 'shadow-002',
        sampleSize: 450,
        accuracyControl: 0.90,
        accuracyVariant: 0.91,
        accuracyDelta: 0.01,
        latencyDelta: -0.02,
        winner: 'variant',
      },
    ],
    rollouts: [
      {
        tenantId: 'acme-corp',
        rolloutId: 'rollout-acme-corp-1699876543210',
        fromVersion: '1.2.2',
        toVersion: '1.2.3',
        finalPhase: 'complete',
        outcome: 'completed',
        startedAt: '2025-11-12T14:00:00Z',
        completedAt: '2025-11-13T16:30:00Z',
      },
      {
        tenantId: 'globex',
        rolloutId: 'rollout-globex-1699890123456',
        fromVersion: '2.0.0',
        toVersion: '2.0.1',
        finalPhase: 'complete',
        outcome: 'completed',
        startedAt: '2025-11-10T09:00:00Z',
        completedAt: '2025-11-11T12:15:00Z',
      },
      {
        tenantId: 'umbrella',
        rolloutId: 'rollout-umbrella-1699903456789',
        fromVersion: '1.1.9',
        toVersion: '1.2.0',
        finalPhase: 'phase2',
        outcome: 'in_progress',
        startedAt: '2025-11-14T11:00:00Z',
      },
    ],
  };

  console.info(`[WeeklyDashboard] Collected metrics for ${metrics.tenants.length} tenants`);

  return metrics;
}

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Generate markdown report
 */
function generateMarkdownReport(metrics: WeeklyMetrics): string {
  const lines: string[] = [];

  // Header
  lines.push('# Weekly Model Quality Dashboard');
  lines.push('');
  lines.push(`**Report Period**: ${metrics.period.startDate} to ${metrics.period.endDate} (${metrics.period.days} days)`);
  lines.push(`**Generated**: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Global Summary
  lines.push('## Global Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Requests | ${metrics.globalSummary.totalRequests.toLocaleString()} |`);
  lines.push(`| Total Cost | $${metrics.globalSummary.totalCost.toFixed(2)} |`);
  lines.push(`| Avg Accuracy | ${(metrics.globalSummary.avgAccuracy * 100).toFixed(2)}% |`);
  lines.push(`| Avg Latency P95 | ${metrics.globalSummary.avgLatencyP95}ms |`);
  lines.push(`| Total Drift Alerts | ${metrics.globalSummary.totalDriftAlerts} |`);
  lines.push(`| Active Rollouts | ${metrics.globalSummary.activeRollouts} |`);
  lines.push(`| Completed Rollouts | ${metrics.globalSummary.completedRollouts} |`);
  lines.push(`| Aborted Rollouts | ${metrics.globalSummary.abortedRollouts} |`);
  lines.push('');

  // Tenant Metrics
  lines.push('## Tenant Performance');
  lines.push('');
  lines.push('### Accuracy Delta vs Baseline');
  lines.push('');
  lines.push('| Tenant | Requests | Accuracy | Baseline | Delta | Status |');
  lines.push('|--------|----------|----------|----------|-------|--------|');

  for (const tenant of metrics.tenants) {
    const deltaPercent = (tenant.accuracyDelta * 100).toFixed(2);
    const status = tenant.accuracyDelta >= 0 ? '✅' : '⚠️';
    const sign = tenant.accuracyDelta >= 0 ? '+' : '';

    lines.push(
      `| ${tenant.tenantName} | ${tenant.requests.toLocaleString()} | ${(tenant.accuracy * 100).toFixed(2)}% | ${(tenant.accuracyBaseline * 100).toFixed(2)}% | ${sign}${deltaPercent}% | ${status} |`
    );
  }

  lines.push('');

  // Latency Metrics
  lines.push('### Latency Performance (P95)');
  lines.push('');
  lines.push('| Tenant | P50 | P95 | P99 | Status |');
  lines.push('|--------|-----|-----|-----|--------|');

  for (const tenant of metrics.tenants) {
    const status = tenant.latencyP95 < 800 ? '✅' : tenant.latencyP95 < 1200 ? '⚡' : '⚠️';
    lines.push(
      `| ${tenant.tenantName} | ${tenant.latencyP50}ms | ${tenant.latencyP95}ms | ${tenant.latencyP99}ms | ${status} |`
    );
  }

  lines.push('');

  // Cost Metrics
  lines.push('### Cost Analysis');
  lines.push('');
  lines.push('| Tenant | Total Cost | Cost/Request | Delta | Status |');
  lines.push('|--------|------------|--------------|-------|--------|');

  for (const tenant of metrics.tenants) {
    const deltaPercent = (tenant.costDelta * 100).toFixed(2);
    const status = tenant.costDelta <= 0 ? '✅' : tenant.costDelta < 0.005 ? '⚡' : '⚠️';
    const sign = tenant.costDelta >= 0 ? '+' : '';

    lines.push(
      `| ${tenant.tenantName} | $${tenant.totalCost.toFixed(2)} | $${tenant.costPerRequest.toFixed(4)} | ${sign}${deltaPercent}% | ${status} |`
    );
  }

  lines.push('');

  // Drift Alerts
  if (metrics.driftAlerts.length > 0) {
    lines.push('## Drift Alerts');
    lines.push('');
    lines.push('| Tenant | Label | Language | PSI | JS | Severity | Timestamp |');
    lines.push('|--------|-------|----------|-----|----|-----------| ----------|');

    for (const alert of metrics.driftAlerts) {
      const severityEmoji = alert.severity === 'critical' ? '🚨' : alert.severity === 'high' ? '⚠️' : 'ℹ️';
      lines.push(
        `| ${alert.tenantId} | ${alert.label} | ${alert.language} | ${alert.psiScore.toFixed(4)} | ${alert.jsScore.toFixed(4)} | ${severityEmoji} ${alert.severity} | ${alert.timestamp} |`
      );
    }

    lines.push('');
  }

  // Shadow Eval Results
  if (metrics.shadowEvals.length > 0) {
    lines.push('## Shadow Evaluation Results');
    lines.push('');
    lines.push('| Tenant | Experiment | Samples | Control Acc | Variant Acc | Delta | Winner |');
    lines.push('|--------|------------|---------|-------------|-------------|-------|--------|');

    for (const eval of metrics.shadowEvals) {
      const deltaPercent = (eval.accuracyDelta * 100).toFixed(2);
      const sign = eval.accuracyDelta >= 0 ? '+' : '';
      const winnerEmoji = eval.winner === 'variant' ? '🏆' : eval.winner === 'control' ? '📊' : '⚖️';

      lines.push(
        `| ${eval.tenantId} | ${eval.experimentId} | ${eval.sampleSize} | ${(eval.accuracyControl * 100).toFixed(2)}% | ${(eval.accuracyVariant * 100).toFixed(2)}% | ${sign}${deltaPercent}% | ${winnerEmoji} ${eval.winner} |`
      );
    }

    lines.push('');
  }

  // Canary Rollout Outcomes
  if (metrics.rollouts.length > 0) {
    lines.push('## Canary Rollout Outcomes');
    lines.push('');
    lines.push('| Tenant | From Version | To Version | Phase | Outcome | Started | Completed |');
    lines.push('|--------|--------------|------------|-------|---------|---------|-----------|');

    for (const rollout of metrics.rollouts) {
      const outcomeEmoji =
        rollout.outcome === 'completed' ? '✅' : rollout.outcome === 'aborted' ? '❌' : '⏳';
      const completed = rollout.completedAt || 'In Progress';

      lines.push(
        `| ${rollout.tenantId} | ${rollout.fromVersion} | ${rollout.toVersion} | ${rollout.finalPhase} | ${outcomeEmoji} ${rollout.outcome} | ${rollout.startedAt} | ${completed} |`
      );
    }

    lines.push('');
  }

  // Recommendations
  lines.push('## Recommendations');
  lines.push('');

  const recommendations: string[] = [];

  // Check for accuracy drops
  const accuracyDrops = metrics.tenants.filter(t => t.accuracyDelta < -0.02);
  if (accuracyDrops.length > 0) {
    recommendations.push(
      `⚠️  **Accuracy Drop**: ${accuracyDrops.map(t => t.tenantName).join(', ')} experienced >2% accuracy drop. Consider rollback or recalibration.`
    );
  }

  // Check for critical drift
  const criticalDrift = metrics.driftAlerts.filter(a => a.severity === 'critical');
  if (criticalDrift.length > 0) {
    recommendations.push(
      `🚨 **Critical Drift**: ${criticalDrift.length} critical drift alerts detected. Immediate investigation required.`
    );
  }

  // Check for cost increases
  const costIncreases = metrics.tenants.filter(t => t.costDelta > 0.005);
  if (costIncreases.length > 0) {
    recommendations.push(
      `💰 **Cost Increase**: ${costIncreases.map(t => t.tenantName).join(', ')} experienced >0.5% cost increase. Review model selection or caching strategy.`
    );
  }

  // Check for latency issues
  const latencyIssues = metrics.tenants.filter(t => t.latencyP95 > 1200);
  if (latencyIssues.length > 0) {
    recommendations.push(
      `⏱️  **Latency Issue**: ${latencyIssues.map(t => t.tenantName).join(', ')} exceeded 1200ms P95 latency. Investigate performance bottlenecks.`
    );
  }

  if (recommendations.length === 0) {
    lines.push('✅ All metrics are within acceptable ranges. No immediate action required.');
  } else {
    recommendations.forEach(rec => lines.push(`- ${rec}`));
  }

  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('**Next Steps**:');
  lines.push('1. Review drift alerts and investigate root causes');
  lines.push('2. Monitor in-progress rollouts for completion');
  lines.push('3. Address any accuracy or latency regressions');
  lines.push('4. Update tenant overrides as needed');
  lines.push('');

  return lines.join('\n');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  // Parse CLI args
  const args = process.argv.slice(2);
  const outputFlag = args.indexOf('--output');
  const daysFlag = args.indexOf('--days');

  const outputPath =
    outputFlag !== -1 && args[outputFlag + 1]
      ? args[outputFlag + 1]
      : 'reports/weekly_model_quality.md';

  const days =
    daysFlag !== -1 && args[daysFlag + 1] ? parseInt(args[daysFlag + 1], 10) : 7;

  console.info('[WeeklyDashboard] Starting dashboard generation...');
  console.info(`[WeeklyDashboard] Output: ${outputPath}`);
  console.info(`[WeeklyDashboard] Period: ${days} days`);

  // Collect metrics
  const metrics = await collectWeeklyMetrics(days);

  // Generate report
  const report = generateMarkdownReport(metrics);

  // Ensure reports directory exists
  const reportsDir = join(process.cwd(), 'reports');
  try {
    mkdirSync(reportsDir, { recursive: true });
  } catch (err) {
    // Directory already exists
  }

  // Write report
  const fullPath = join(process.cwd(), outputPath);
  writeFileSync(fullPath, report, 'utf-8');

  console.info(`[WeeklyDashboard] Report written to: ${fullPath}`);
  console.info(`[WeeklyDashboard] Dashboard generation complete!`);

  // Optional: Email the report
  // await emailReport(report);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('[WeeklyDashboard] Error:', error);
    process.exit(1);
  });
}

export { collectWeeklyMetrics, generateMarkdownReport };
