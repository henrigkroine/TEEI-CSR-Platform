#!/usr/bin/env tsx
/**
 * CLI script to create demo tenant
 * Usage: pnpm demo:create --name acme --size medium --regions US,EU
 */

import { parseArgs } from 'util';

const { values } = parseArgs({
  options: {
    name: { type: 'string', short: 'n' },
    size: { type: 'string', short: 's', default: 'small' },
    regions: { type: 'string', short: 'r', default: 'US' },
    vertical: { type: 'string', short: 'v' },
    admin: { type: 'string', short: 'a' },
    locale: { type: 'string', short: 'l', default: 'en' },
    api: { type: 'string', default: 'http://localhost:3000/v1' },
  },
});

async function createDemoTenant() {
  if (!values.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }

  if (!values.admin) {
    console.error('Error: --admin email is required');
    process.exit(1);
  }

  const body = {
    tenantName: values.name,
    size: values.size,
    regions: values.regions?.split(',') || ['US'],
    vertical: values.vertical,
    adminEmail: values.admin,
    locale: values.locale,
    timeRangeMonths: 12,
    includeSeasonality: true,
  };

  console.log(`Creating demo tenant: demo-${values.name}...`);
  console.log(`Size: ${values.size}, Regions: ${values.regions}`);

  try {
    const response = await fetch(`${values.api}/demo/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create demo tenant');
    }

    const result = await response.json();

    console.log('\n✅ Demo tenant created successfully!');
    console.log(`Tenant ID: ${result.tenant.tenantId}`);
    console.log(`Status: ${result.tenant.status}`);
    console.log(`Events: ${result.seedResult.totalEvents.toLocaleString()}`);
    console.log(`Duration: ${(result.seedResult.totalDurationMs / 1000).toFixed(1)}s`);
  } catch (error) {
    console.error('\n❌ Failed to create demo tenant:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

createDemoTenant();
