#!/usr/bin/env tsx
/**
 * CLI script to list demo tenants
 * Usage: pnpm demo:list
 */

import { parseArgs } from 'util';

const { values } = parseArgs({
  options: {
    api: { type: 'string', default: 'http://localhost:3000/v1' },
  },
});

async function listDemoTenants() {
  try {
    const response = await fetch(`${values.api}/demo/tenants`);

    if (!response.ok) {
      throw new Error('Failed to list demo tenants');
    }

    const data = await response.json();
    const tenants = data.tenants || [];

    if (tenants.length === 0) {
      console.log('No demo tenants found.');
      return;
    }

    console.log(`\n📋 Demo Tenants (${tenants.length}):\n`);

    for (const tenant of tenants) {
      console.log(`🏢 ${tenant.tenantId}`);
      console.log(`   Status: ${tenant.status}`);
      console.log(`   Size: ${tenant.size}`);
      console.log(`   Regions: ${tenant.regions.join(', ')}`);
      if (tenant.seedStats) {
        console.log(`   Events: ${tenant.seedStats.eventsCreated.toLocaleString()}`);
        console.log(`   Users: ${tenant.seedStats.usersCreated}`);
      }
      console.log(`   Created: ${new Date(tenant.createdAt).toLocaleString()}`);
      console.log(`   Expires: ${new Date(tenant.expiresAt).toLocaleString()}`);
      console.log('');
    }
  } catch (error) {
    console.error('❌ Failed to list demo tenants:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

listDemoTenants();
