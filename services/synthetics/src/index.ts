/**
 * Synthetics Service - Main Orchestrator
 *
 * Runs all synthetic monitors for pilot tenant routes
 * Schedules execution every 5 minutes
 * Aggregates metrics and exports to OTel/Grafana
 *
 * @module synthetics
 */

import * as cron from 'node-cron';
import { initializeOTel } from '@teei/observability';

// Import all monitors
import { monitorAllTenants as monitorTenantLogins } from '../pilot-routes/tenant-login.js';
import { monitorAllDashboards } from '../pilot-routes/dashboard-load.js';
import { monitorAllReportGeneration } from '../pilot-routes/report-generation.js';
import { monitorAllPDFExports } from '../pilot-routes/export-pdf.js';
import { monitorAllApprovalWorkflows } from '../pilot-routes/approval-workflow.js';
import { monitorAllEvidenceExplorers } from '../pilot-routes/evidence-explorer.js';

/**
 * Initialize OpenTelemetry for all monitors
 */
function initializeMonitoring(): void {
  initializeOTel({
    serviceName: 'teei-synthetics',
    serviceVersion: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    exporterType: 'otlp',
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    enableMetrics: true,
    enableTracing: true,
    sampleRate: 1.0, // Sample all synthetic monitoring traffic
    attributes: {
      'service.type': 'synthetic-monitoring',
      'deployment.environment': process.env.DEPLOYMENT_ENV || 'pilot',
    },
  });

  console.log('✓ OpenTelemetry initialized for synthetic monitoring');
}

/**
 * Run all synthetic monitors
 */
async function runAllMonitors(): Promise<void> {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 SYNTHETIC MONITORING CYCLE - ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  const results = await Promise.allSettled([
    monitorTenantLogins(),
    monitorAllDashboards(),
    monitorAllReportGeneration(),
    monitorAllPDFExports(),
    monitorAllApprovalWorkflows(),
    monitorAllEvidenceExplorers(),
  ]);

  // Count successes and failures
  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 MONITORING CYCLE COMPLETE');
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Monitors Succeeded: ${succeeded}/6`);
  console.log(`   Monitors Failed: ${failed}/6`);
  console.log('='.repeat(80));

  // Log failures
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const monitorNames = [
        'Tenant Login',
        'Dashboard Load',
        'Report Generation',
        'PDF Export',
        'Approval Workflow',
        'Evidence Explorer',
      ];
      console.error(`❌ ${monitorNames[index]} monitor failed:`, result.reason);
    }
  });
}

/**
 * Schedule monitors to run every 5 minutes
 */
function scheduleMonitors(): void {
  // Run every 5 minutes: */5 * * * *
  const schedule = process.env.MONITOR_SCHEDULE || '*/5 * * * *';

  console.log(`⏰ Scheduling synthetic monitors with cron: ${schedule}`);

  cron.schedule(schedule, async () => {
    try {
      await runAllMonitors();
    } catch (error) {
      console.error('Error running monitors:', error);
    }
  });

  console.log('✓ Monitors scheduled successfully');
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log('🚀 Starting TEEI Synthetic Monitoring Service');
  console.log(`   Node Version: ${process.version}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`   OTel Endpoint: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318'}`);

  // Initialize observability
  initializeMonitoring();

  // Run monitors immediately on startup
  console.log('\n🏃 Running initial monitoring cycle...');
  await runAllMonitors();

  // Schedule recurring execution
  scheduleMonitors();

  console.log('\n✓ Synthetic monitoring service is running');
  console.log('  Press Ctrl+C to stop');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down synthetic monitoring service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down synthetic monitoring service...');
  process.exit(0);
});

// Start the service
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runAllMonitors, scheduleMonitors };
