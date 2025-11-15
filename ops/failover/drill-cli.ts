#!/usr/bin/env node
/**
 * Failover Drill CLI
 * Command-line interface for executing and monitoring failover drills
 */

import { FailoverController, DrillExecution } from './failover-controller';
import * as fs from 'fs';

interface CliArgs {
  command: string;
  drill?: string;
  drillId?: string;
  dryRun?: boolean;
  timeout?: number;
  json?: boolean;
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
      (parsed as any)[camelKey] = value === 'true' ? true : value === 'false' ? false : value || true;
    }
  }

  return parsed;
}

async function main() {
  const args = parseArgs();
  const controller = new FailoverController();

  try {
    switch (args.command) {
      case 'start':
        await handleStart(controller, args);
        break;

      case 'monitor':
        await handleMonitor(controller, args);
        break;

      case 'status':
        await handleStatus(controller, args);
        break;

      case 'report':
        await handleReport(controller, args);
        break;

      case 'list':
        await handleList(controller, args);
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

async function handleStart(controller: FailoverController, args: CliArgs): Promise<void> {
  if (!args.drill) {
    throw new Error('Missing required argument: --drill');
  }

  console.log(`🚀 Starting failover drill: ${args.drill}`);

  if (args.dryRun) {
    console.log(`🔍 DRY RUN MODE - No actual changes will be made`);
  } else {
    console.log(`⚠️  LIVE MODE - Real infrastructure changes will occur`);
  }

  const execution = await controller.startDrill(args.drill);

  // Write drill ID to file for CI/CD
  fs.writeFileSync('/tmp/drill-id.txt', execution.id);

  console.log(`✅ Drill started: ${execution.id}`);
}

async function handleMonitor(controller: FailoverController, args: CliArgs): Promise<void> {
  if (!args.drillId) {
    throw new Error('Missing required argument: --drill-id');
  }

  const timeout = (args.timeout || 30) * 60 * 1000; // minutes to ms
  const checkInterval = 10000; // 10 seconds

  console.log(`👀 Monitoring drill ${args.drillId}...`);

  const endTime = Date.now() + timeout;

  while (Date.now() < endTime) {
    const execution = controller.getExecution(args.drillId);
    if (!execution) {
      throw new Error(`Drill ${args.drillId} not found`);
    }

    if (execution.status === 'completed') {
      console.log(`✅ Drill completed successfully`);
      break;
    }

    if (execution.status === 'failed' || execution.status === 'rolled_back') {
      console.log(`❌ Drill ${execution.status}`);
      process.exit(1);
    }

    // Show progress
    const currentStep = execution.steps[execution.currentStep];
    console.log(
      `Step ${execution.currentStep + 1}/${execution.steps.length}: ${currentStep.stepName} [${currentStep.status}]`
    );

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
}

async function handleStatus(controller: FailoverController, args: CliArgs): Promise<void> {
  if (!args.drillId) {
    throw new Error('Missing required argument: --drill-id');
  }

  const execution = controller.getExecution(args.drillId);
  if (!execution) {
    throw new Error(`Drill ${args.drillId} not found`);
  }

  if (args.json) {
    console.log(JSON.stringify(execution, null, 2));
  } else {
    printDrillStatus(execution);
  }
}

async function handleReport(controller: FailoverController, args: CliArgs): Promise<void> {
  if (!args.drillId) {
    throw new Error('Missing required argument: --drill-id');
  }

  const execution = controller.getExecution(args.drillId);
  if (!execution) {
    throw new Error(`Drill ${args.drillId} not found`);
  }

  console.log(`### Drill Execution Report\n`);
  console.log(`**Drill:** ${execution.drillName}`);
  console.log(`**Status:** ${execution.status}`);
  console.log(`**Started:** ${execution.startedAt.toISOString()}`);

  if (execution.completedAt) {
    const duration = execution.completedAt.getTime() - execution.startedAt.getTime();
    console.log(`**Completed:** ${execution.completedAt.toISOString()}`);
    console.log(`**Duration:** ${Math.round(duration / 1000)}s`);
  }

  console.log(`\n### Steps\n`);
  console.log(`| Step | Status | Duration |`);
  console.log(`|------|--------|----------|`);

  for (const step of execution.steps) {
    const duration = step.completedAt && step.startedAt
      ? Math.round((step.completedAt.getTime() - step.startedAt.getTime()) / 1000)
      : '-';

    const emoji = step.status === 'completed' ? '✅' :
                  step.status === 'failed' ? '❌' :
                  step.status === 'running' ? '🔄' : '⏸️';

    console.log(`| ${emoji} ${step.stepName} | ${step.status} | ${duration}s |`);
  }

  // Add incident ID if exists
  if (execution.incidentId) {
    console.log(`\n**Status Page Incident:** ${execution.incidentId}`);
  }
}

async function handleList(controller: FailoverController, args: CliArgs): Promise<void> {
  const executions = controller.listExecutions();

  if (executions.length === 0) {
    console.log('No drill executions found');
    return;
  }

  console.log(`\nDrill Executions (${executions.length}):\n`);

  for (const execution of executions) {
    console.log(`ID: ${execution.id}`);
    console.log(`  Drill: ${execution.drillName}`);
    console.log(`  Status: ${execution.status}`);
    console.log(`  Started: ${execution.startedAt.toISOString()}`);
    console.log(`  Step: ${execution.currentStep + 1}/${execution.steps.length}`);
    console.log('');
  }
}

function printDrillStatus(execution: DrillExecution): void {
  console.log(`\nFailover Drill Status\n`);
  console.log(`ID: ${execution.id}`);
  console.log(`Drill: ${execution.drillName}`);
  console.log(`Status: ${execution.status}`);
  console.log(`Started: ${execution.startedAt.toISOString()}`);

  if (execution.completedAt) {
    console.log(`Completed: ${execution.completedAt.toISOString()}`);
  }

  console.log(`\nProgress: ${execution.currentStep + 1}/${execution.steps.length} steps`);

  console.log(`\nSteps:`);
  for (let i = 0; i < execution.steps.length; i++) {
    const step = execution.steps[i];
    const prefix = i === execution.currentStep ? '→' : i < execution.currentStep ? '✓' : ' ';
    console.log(`  ${prefix} ${step.stepName}: ${step.status}`);

    if (step.error) {
      console.log(`    Error: ${step.error}`);
    }
  }

  if (execution.incidentId) {
    console.log(`\nIncident ID: ${execution.incidentId}`);
  }
}

function printHelp(): void {
  console.log(`
Failover Drill CLI

Usage:
  drill-cli <command> [options]

Commands:
  start       Start a failover drill
  monitor     Monitor drill execution
  status      Get drill status
  report      Generate drill report
  list        List all drill executions
  help        Show this help message

Options:
  --drill=<name>          Drill scenario name (required for start)
  --drill-id=<id>         Drill execution ID (required for monitor, status, report)
  --dry-run               Dry run mode (no actual changes)
  --timeout=<minutes>     Monitoring timeout in minutes (default: 30)
  --json                  Output as JSON

Examples:
  drill-cli start --drill=planned_regional_failover --dry-run=true
  drill-cli monitor --drill-id=drill-xyz --timeout=20
  drill-cli status --drill-id=drill-xyz --json
  drill-cli report --drill-id=drill-xyz
  drill-cli list
`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
