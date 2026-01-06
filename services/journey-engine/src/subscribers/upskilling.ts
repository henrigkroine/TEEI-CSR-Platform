import type { EventBus } from '@teei/shared-utils';
import { createServiceLogger } from '@teei/shared-utils';
import { fetchParticipantContext, clearContextCache } from '../utils/profile.js';
import { loadActiveRules } from './rules-loader.js';
import { evaluateAllRules } from '../rules/engine.js';

const logger = createServiceLogger('journey-engine:upskilling-subscriber');

/**
 * Subscribe to Upskilling service events
 */
export async function setupUpskillingSubscribers(eventBus: EventBus): Promise<void> {
  // Subscribe to upskilling.course.completed
  await eventBus.subscribe(
    'upskilling.course.completed',
    async (event: any) => {
      logger.info(
        { eventId: event.id, userId: event.data.userId },
        'Upskilling course completed'
      );

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
        logger.error({ error, eventId: event.id }, 'Error processing upskilling.course.completed');
      }
    },
    { queue: 'journey-engine' }
  );

  // Subscribe to upskilling.credential.issued
  await eventBus.subscribe(
    'upskilling.credential.issued',
    async (event: any) => {
      logger.info(
        { eventId: event.id, userId: event.data.userId },
        'Upskilling credential issued'
      );

      try {
        clearContextCache(event.data.userId);
        const context = await fetchParticipantContext(event.data.userId);
        const rules = await loadActiveRules();
        await evaluateAllRules(rules, context);
      } catch (error) {
        logger.error({ error, eventId: event.id }, 'Error processing upskilling.credential.issued');
      }
    },
    { queue: 'journey-engine' }
  );

  logger.info('Upskilling subscribers setup complete');
}
