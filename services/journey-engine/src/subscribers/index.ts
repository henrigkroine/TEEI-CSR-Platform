import type { EventBus } from '@teei/shared-utils';
import { createServiceLogger } from '@teei/shared-utils';
import { setupBuddySubscribers } from './buddy.js';
import { setupKintellSubscribers } from './kintell.js';
import { setupUpskillingSubscribers } from './upskilling.js';
import { syncDefaultRules } from './rules-loader.js';

const logger = createServiceLogger('journey-engine:subscribers');

/**
 * Setup all event subscribers
 */
export async function setupSubscribers(eventBus: EventBus): Promise<void> {
  logger.info('Setting up event subscribers...');

  // Sync default rules to database first
  await syncDefaultRules();

  // Setup subscribers for each service
  await setupBuddySubscribers(eventBus);
  await setupKintellSubscribers(eventBus);
  await setupUpskillingSubscribers(eventBus);

  logger.info('All event subscribers setup complete');
}
