#!/usr/bin/env node
/**
 * FinOps CLI
 * Command-line interface for cost tracking and reporting
 */

import { getCostExporter, CostExporter } from './cost-exporter';

interface CliArgs {
  command: string;
  startDate?: string;
  endDate?: string;
  tenant?: string;
  month?: string;
  format?: 'csv' | 'json' | 'pdf';
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: CliArgs = {
    command: args[0] || 'help'
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      (parsed as any)[camelKey] = value || true;
    }
  }

  return parsed;
}

async function main() {
  const args = parseArgs();
  const exporter = getCostExporter();

  try {
    switch (args.command) {
      case 'ingest':
        await handleIngest(exporter, args);
        break;

      case 'allocate':
        await handleAllocate(exporter);
        break;

      case 'anomalies':
        await handleAnomalies(exporter);
        break;

      case 'tenant':
        await handleTenant(exporter, args);
        break;

      case 'export-prometheus':
        await handleExportPrometheus(exporter);
        break;

      case 'report':
        await handleReport(exporter, args);
        break;

      case 'help':
      default:
        printHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

async function handleIngest(exporter: CostExporter, args: CliArgs): Promise<void> {
  const startDate = args.startDate ? new Date(args.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = args.endDate ? new Date(args.endDate) : new Date();

  console.log(`📥 Ingesting cost data from ${startDate.toISOString()} to ${endDate.toISOString()}...`);

  await Promise.all([
    exporter.ingestAWSCosts(startDate, endDate),
    exporter.ingestAzureCosts(startDate, endDate),
    exporter.ingestGCPCosts(startDate, endDate)
  ]);

  const metrics = exporter.getMetrics();
  console.log(`✅ Ingested ${metrics.length} cost records`);
}

async function handleAllocate(exporter: CostExporter): Promise<void> {
  console.log(`📊 Calculating tenant cost allocations...`);

  const allocations = exporter.calculateTenantAllocations();

  console.log(`\nTenant Cost Allocations (${allocations.size} tenants):\n`);

  const sortedAllocations = Array.from(allocations.values())
    .sort((a, b) => b.totalCost - a.totalCost);

  for (const allocation of sortedAllocations) {
    console.log(`${allocation.tenant}:`);
    console.log(`  Total Cost: $${allocation.totalCost.toFixed(2)}`);
    console.log(`  Forecast: $${allocation.forecast.toFixed(2)}`);
    console.log(`  Anomaly: ${allocation.anomalyDetected ? '⚠️  Yes' : '✅ No'}`);
    console.log(`  Top Services:`);

    for (const service of allocation.breakdown.slice(0, 3)) {
      console.log(`    - ${service.service}: $${service.cost.toFixed(2)} (${service.percentage.toFixed(1)}%)`);
    }

    console.log('');
  }
}

async function handleAnomalies(exporter: CostExporter): Promise<void> {
  console.log(`🔍 Detecting cost anomalies...`);

  const anomalies = exporter.getAnomalies();

  if (anomalies.length === 0) {
    console.log(`✅ No anomalies detected`);
    return;
  }

  console.log(`\n⚠️  Found ${anomalies.length} cost anomalies:\n`);

  for (const anomaly of anomalies) {
    const emoji = anomaly.severity === 'critical' ? '🚨' : '⚠️';

    console.log(`${emoji} ${anomaly.tenant} - ${anomaly.service}`);
    console.log(`  Actual: $${anomaly.actualCost.toFixed(2)}`);
    console.log(`  Expected: $${anomaly.expectedCost.toFixed(2)}`);
    console.log(`  Deviation: ${anomaly.deviation.toFixed(1)}%`);
    console.log(`  Severity: ${anomaly.severity}`);
    console.log('');
  }
}

async function handleTenant(exporter: CostExporter, args: CliArgs): Promise<void> {
  if (!args.tenant) {
    throw new Error('Missing required argument: --tenant');
  }

  const allocation = exporter.getTenantAllocation(args.tenant);

  if (!allocation) {
    throw new Error(`Tenant ${args.tenant} not found`);
  }

  console.log(`\nCost Allocation for ${args.tenant}:\n`);
  console.log(`Total Cost: $${allocation.totalCost.toFixed(2)}`);
  console.log(`Forecast: $${allocation.forecast.toFixed(2)}`);
  console.log(`Anomaly Detected: ${allocation.anomalyDetected ? 'Yes' : 'No'}`);
  console.log(`\nService Breakdown:\n`);

  for (const service of allocation.breakdown) {
    const bar = '█'.repeat(Math.floor(service.percentage / 2));
    console.log(`  ${service.service.padEnd(20)} $${service.cost.toFixed(2).padStart(10)} (${service.percentage.toFixed(1)}%) ${bar}`);
  }
}

async function handleExportPrometheus(exporter: CostExporter): Promise<void> {
  console.log(`📤 Exporting metrics to Prometheus...`);

  await exporter.exportToPrometheus();

  console.log(`✅ Metrics exported successfully`);
}

async function handleReport(exporter: CostExporter, args: CliArgs): Promise<void> {
  const month = args.month || new Date().toISOString().slice(0, 7);
  const format = args.format || 'json';

  console.log(`📄 Generating monthly report for ${month} (${format})...`);

  const reportPath = await exporter.exportMonthlyReport(month, format);

  console.log(`✅ Report saved to: ${reportPath}`);
}

function printHelp(): void {
  console.log(`
FinOps CLI - Cloud Cost Tracking & Allocation

Usage:
  finops-cli <command> [options]

Commands:
  ingest              Ingest cost data from cloud providers
  allocate            Calculate tenant cost allocations
  anomalies           Detect cost anomalies
  tenant              Get cost allocation for specific tenant
  export-prometheus   Export metrics to Prometheus
  report              Generate monthly cost report
  help                Show this help message

Options:
  --start-date=<date>     Start date (ISO format, default: 30 days ago)
  --end-date=<date>       End date (ISO format, default: now)
  --tenant=<name>         Tenant name (required for tenant command)
  --month=<YYYY-MM>       Month for report (default: current month)
  --format=<csv|json|pdf> Report format (default: json)

Examples:
  finops-cli ingest --start-date=2025-01-01 --end-date=2025-01-31
  finops-cli allocate
  finops-cli anomalies
  finops-cli tenant --tenant=acme-corp
  finops-cli export-prometheus
  finops-cli report --month=2025-01 --format=csv
`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
