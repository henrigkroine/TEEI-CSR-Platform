#!/usr/bin/env tsx
/**
 * CLI script to delete demo tenant
 * Usage: pnpm demo:teardown --tenant demo-acme --confirm
 */

import { parseArgs } from 'util';

const { values } = parseArgs({
  options: {
    tenant: { type: 'string', short: 't' },
    confirm: { type: 'boolean', short: 'y', default: false },
    api: { type: 'string', default: 'http://localhost:3000/v1' },
  },
});

async function deleteDemoTenant() {
  if (!values.tenant) {
    console.error('Error: --tenant is required');
    process.exit(1);
  }

  if (!values.confirm) {
    console.error('Error: --confirm flag required for safety');
    console.error(`Run: pnpm demo:teardown --tenant ${values.tenant} --confirm`);
    process.exit(1);
  }

  console.log(`Deleting demo tenant: ${values.tenant}...`);

  try {
    const response = await fetch(`${values.api}/demo/${values.tenant}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete demo tenant');
    }

    const result = await response.json();

    console.log('\n✅ Demo tenant deleted successfully!');
    console.log(`Resources deleted:`);
    console.log(`  Users: ${result.resourcesDeleted.users}`);
    console.log(`  Events: ${result.resourcesDeleted.events.toLocaleString()}`);
    console.log(`  Tiles: ${result.resourcesDeleted.tiles}`);
    console.log(`  Reports: ${result.resourcesDeleted.reports}`);
    console.log(`Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
  } catch (error) {
    console.error('\n❌ Failed to delete demo tenant:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

deleteDemoTenant();
