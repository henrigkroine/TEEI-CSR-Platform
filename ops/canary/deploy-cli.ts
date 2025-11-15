#!/usr/bin/env node
/**
 * Canary Deployment CLI
 * Command-line interface for managing canary deployments
 */

import { getCanaryController, CanaryDeployment } from './controller';
import * as fs from 'fs';
import * as path from 'path';

interface CliArgs {
  command: string;
  service?: string;
  version?: string;
  region?: string;
  deploymentId?: string;
  autoPromote?: boolean;
  duration?: number;
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
      (parsed as any)[key] = value === 'true' ? true : value === 'false' ? false : value || true;
    }
  }

  return parsed;
}

async function main() {
  const args = parseArgs();
  const controller = getCanaryController();

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

      case 'metrics':
        await handleMetrics(controller, args);
        break;

      case 'rollback':
        await handleRollback(controller, args);
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

async function handleStart(controller: any, args: CliArgs): Promise<void> {
  if (!args.service || !args.version || !args.region) {
    throw new Error('Missing required arguments: --service, --version, --region');
  }

  console.log(`🚀 Starting canary deployment...`);
  console.log(`Service: ${args.service}`);
  console.log(`Version: ${args.version}`);
  console.log(`Region: ${args.region}`);

  const deployment = await controller.startDeployment({
    service: args.service,
    version: args.version,
    region: args.region
  });

  // Write deployment ID to file for CI/CD
  fs.writeFileSync('/tmp/canary-deployment-id.txt', deployment.id);

  console.log(`✅ Deployment started: ${deployment.id}`);
  console.log(`Current stage: 0 (${(deployment.currentWeight * 100).toFixed(0)}% traffic)`);

  // Start monitoring if auto-promote enabled
  if (args.autoPromote) {
    controller.startMonitoring();
    console.log(`👀 Monitoring enabled (auto-promote)`);
  }
}

async function handleMonitor(controller: any, args: CliArgs): Promise<void> {
  if (!args.deploymentId) {
    throw new Error('Missing required argument: --deployment-id');
  }

  const duration = args.duration || 60; // minutes
  const checkInterval = 30000; // 30 seconds

  console.log(`👀 Monitoring deployment ${args.deploymentId} for ${duration} minutes...`);

  controller.startMonitoring(checkInterval);

  // Monitor for specified duration
  const endTime = Date.now() + duration * 60 * 1000;

  while (Date.now() < endTime) {
    const deployment = controller.getDeployment(args.deploymentId);
    if (!deployment) {
      console.log(`❌ Deployment ${args.deploymentId} not found`);
      break;
    }

    if (deployment.status === 'completed') {
      console.log(`✅ Deployment completed successfully`);
      break;
    }

    if (deployment.status === 'rolled_back') {
      console.log(`❌ Deployment rolled back`);
      process.exit(1);
    }

    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, checkInterval));

    // Print progress
    console.log(
      `Stage ${deployment.currentStage}: ${(deployment.currentWeight * 100).toFixed(0)}% | ` +
      `Errors: ${(deployment.metrics.errorRate * 100).toFixed(2)}% | ` +
      `p95: ${deployment.metrics.latencyP95.toFixed(0)}ms | ` +
      `Budget: ${deployment.errorBudget.status}`
    );
  }

  controller.stopMonitoring();
}

async function handleStatus(controller: any, args: CliArgs): Promise<void> {
  if (!args.deploymentId) {
    throw new Error('Missing required argument: --deployment-id');
  }

  const deployment = controller.getDeployment(args.deploymentId);
  if (!deployment) {
    throw new Error(`Deployment ${args.deploymentId} not found`);
  }

  if (args.json) {
    console.log(JSON.stringify(deployment, null, 2));
  } else {
    printDeploymentStatus(deployment);
  }
}

async function handleMetrics(controller: any, args: CliArgs): Promise<void> {
  if (!args.deploymentId) {
    throw new Error('Missing required argument: --deployment-id');
  }

  const deployment = controller.getDeployment(args.deploymentId);
  if (!deployment) {
    throw new Error(`Deployment ${args.deploymentId} not found`);
  }

  console.log(`\n### Deployment Metrics\n`);
  console.log(`| Metric | Value |`);
  console.log(`|--------|-------|`);
  console.log(`| Request Count | ${deployment.metrics.requestCount.toLocaleString()} |`);
  console.log(`| Error Rate | ${(deployment.metrics.errorRate * 100).toFixed(2)}% |`);
  console.log(`| Latency p50 | ${deployment.metrics.latencyP50.toFixed(0)}ms |`);
  console.log(`| Latency p95 | ${deployment.metrics.latencyP95.toFixed(0)}ms |`);
  console.log(`| Latency p99 | ${deployment.metrics.latencyP99.toFixed(0)}ms |`);
  console.log(`| Availability | ${deployment.metrics.availability.toFixed(2)}% |`);
  console.log(`\n### Error Budget\n`);
  console.log(`| Metric | Value |`);
  console.log(`|--------|-------|`);
  console.log(`| Total Budget | ${deployment.errorBudget.total.toFixed(4)}% |`);
  console.log(`| Consumed | ${deployment.errorBudget.consumed.toFixed(4)}% |`);
  console.log(`| Remaining | ${deployment.errorBudget.remaining.toFixed(4)}% |`);
  console.log(`| Burn Rate | ${deployment.errorBudget.burnRate.toFixed(2)}x |`);
  console.log(`| Status | ${deployment.errorBudget.status} |`);
}

async function handleRollback(controller: any, args: CliArgs): Promise<void> {
  if (!args.deploymentId) {
    throw new Error('Missing required argument: --deployment-id');
  }

  console.log(`🔄 Rolling back deployment ${args.deploymentId}...`);

  await controller.rollback(args.deploymentId, 'Manual rollback via CLI');

  console.log(`✅ Deployment rolled back successfully`);
}

async function handleList(controller: any, args: CliArgs): Promise<void> {
  const deployments = controller.getActiveDeployments();

  if (deployments.length === 0) {
    console.log('No active canary deployments');
    return;
  }

  console.log(`\nActive Canary Deployments (${deployments.length}):\n`);

  for (const deployment of deployments) {
    console.log(`ID: ${deployment.id}`);
    console.log(`  Service: ${deployment.service}@${deployment.version}`);
    console.log(`  Region: ${deployment.region}`);
    console.log(`  Status: ${deployment.status}`);
    console.log(`  Stage: ${deployment.currentStage} (${(deployment.currentWeight * 100).toFixed(0)}% traffic)`);
    console.log(`  Error Budget: ${deployment.errorBudget.status}`);
    console.log('');
  }
}

function printDeploymentStatus(deployment: CanaryDeployment): void {
  console.log(`\nCanary Deployment Status\n`);
  console.log(`ID: ${deployment.id}`);
  console.log(`Service: ${deployment.service}@${deployment.version}`);
  console.log(`Region: ${deployment.region}`);
  console.log(`Status: ${deployment.status}`);
  console.log(`Stage: ${deployment.currentStage} (${(deployment.currentWeight * 100).toFixed(0)}% traffic)`);
  console.log(`Started: ${deployment.startedAt.toISOString()}`);
  console.log(`Last Transition: ${deployment.lastTransitionAt.toISOString()}`);

  if (deployment.completedAt) {
    console.log(`Completed: ${deployment.completedAt.toISOString()}`);
  }

  console.log(`\nMetrics:`);
  console.log(`  Requests: ${deployment.metrics.requestCount.toLocaleString()}`);
  console.log(`  Error Rate: ${(deployment.metrics.errorRate * 100).toFixed(2)}%`);
  console.log(`  p95 Latency: ${deployment.metrics.latencyP95.toFixed(0)}ms`);
  console.log(`  Availability: ${deployment.metrics.availability.toFixed(2)}%`);

  console.log(`\nError Budget:`);
  console.log(`  Status: ${deployment.errorBudget.status}`);
  console.log(`  Remaining: ${deployment.errorBudget.remaining.toFixed(4)}%`);
  console.log(`  Burn Rate: ${deployment.errorBudget.burnRate.toFixed(2)}x`);
}

function printHelp(): void {
  console.log(`
Canary Deployment CLI

Usage:
  deploy-cli <command> [options]

Commands:
  start       Start a canary deployment
  monitor     Monitor a deployment
  status      Get deployment status
  metrics     Get deployment metrics
  rollback    Rollback a deployment
  list        List active deployments
  help        Show this help message

Options:
  --service=<name>          Service name (required for start)
  --version=<tag>           Version/image tag (required for start)
  --region=<region>         Region (required for start)
  --deployment-id=<id>      Deployment ID (required for monitor, status, rollback)
  --auto-promote            Auto-promote on success (for start)
  --duration=<minutes>      Monitoring duration in minutes (default: 60)
  --json                    Output as JSON

Examples:
  deploy-cli start --service=api-gateway --version=v1.2.0 --region=us-east-1 --auto-promote=true
  deploy-cli monitor --deployment-id=abc123 --duration=30
  deploy-cli status --deployment-id=abc123 --json
  deploy-cli rollback --deployment-id=abc123
  deploy-cli list
`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
