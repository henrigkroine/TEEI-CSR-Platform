import type { EventBus } from '@teei/shared-utils';
import { createServiceLogger } from '@teei/shared-utils';
import { fetchParticipantContext, clearContextCache } from '../utils/profile.js';
import { loadActiveRules } from './rules-loader.js';
import { evaluateAllRules } from '../rules/engine.js';

const logger = createServiceLogger('journey-engine:kintell-subscriber');

/**
 * Subscribe to Kintell service events
 */
export async function setupKintellSubscribers(eventBus: EventBus): Promise<void> {
  // Subscribe to kintell.session.completed
  await eventBus.subscribe(
    'kintell.session.completed',
    async (event: any) => {
      logger.info({ eventId: event.id, userId: event.data.userId }, 'Kintell session completed');

      try {
        // Clear cache to get fresh data
        clearContextCache(event.data.userId);

        // Fetch context
        const context = await fetchParticipantContext(event.data.userId);

        // Load active rules
        const rules = await loadActiveRules();

        // Evaluate all rules
        await evaluateAllRules(rules, context);
      } catch (error) {
        logger.error({ error, eventId: event.id }, 'Error processing kintell.session.completed');
      }
    },
    { queue: 'journey-engine' }
  );

  // Subscribe to kintell.rating.created
  await eventBus.subscribe(
    'kintell.rating.created',
    async (event: any) => {
      logger.info({ eventId: event.id, userId: event.data.userId }, 'Kintell rating created');

      try {
        clearContextCache(event.data.userId);
        const context = await fetchParticipantContext(event.data.userId);
        const rules = await loadActiveRules();
        await evaluateAllRules(rules, context);
      } catch (error) {
        logger.error({ error, eventId: event.id }, 'Error processing kintell.rating.created');
      }
    },
    { queue: 'journey-engine' }
  );

  logger.info('Kintell subscribers setup complete');
}
