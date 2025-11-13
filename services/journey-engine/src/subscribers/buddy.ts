import type { EventBus } from '@teei/shared-utils';
import { createServiceLogger } from '@teei/shared-utils';
import { fetchParticipantContext, clearContextCache } from '../utils/profile.js';
import { loadActiveRules } from './rules-loader.js';
import { evaluateAllRules } from '../rules/engine.js';

const logger = createServiceLogger('journey-engine:buddy-subscriber');

/**
 * Subscribe to Buddy service events
 */
export async function setupBuddySubscribers(eventBus: EventBus): Promise<void> {
  // Subscribe to buddy.match.created
  await eventBus.subscribe(
    'buddy.match.created',
    async (event: any) => {
      logger.info({ eventId: event.id, userId: event.data.userId }, 'Buddy match created');

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
        logger.error({ error, eventId: event.id }, 'Error processing buddy.match.created');
      }
    },
    { queue: 'journey-engine' }
  );

  // Subscribe to buddy.event.logged
  await eventBus.subscribe(
    'buddy.event.logged',
    async (event: any) => {
      logger.info({ eventId: event.id, userId: event.data.userId }, 'Buddy event logged');

      try {
        clearContextCache(event.data.userId);
        const context = await fetchParticipantContext(event.data.userId);
        const rules = await loadActiveRules();
        await evaluateAllRules(rules, context);
      } catch (error) {
        logger.error({ error, eventId: event.id }, 'Error processing buddy.event.logged');
      }
    },
    { queue: 'journey-engine' }
  );

  // Subscribe to buddy.checkin.completed
  await eventBus.subscribe(
    'buddy.checkin.completed',
    async (event: any) => {
      logger.info({ eventId: event.id, userId: event.data.userId }, 'Buddy checkin completed');

      try {
        clearContextCache(event.data.userId);
        const context = await fetchParticipantContext(event.data.userId);
        const rules = await loadActiveRules();
        await evaluateAllRules(rules, context);
      } catch (error) {
        logger.error({ error, eventId: event.id }, 'Error processing buddy.checkin.completed');
      }
    },
    { queue: 'journey-engine' }
  );

  // Subscribe to buddy.feedback.submitted
  await eventBus.subscribe(
    'buddy.feedback.submitted',
    async (event: any) => {
      logger.info({ eventId: event.id, userId: event.data.userId }, 'Buddy feedback submitted');

      try {
        clearContextCache(event.data.userId);
        const context = await fetchParticipantContext(event.data.userId);
        const rules = await loadActiveRules();
        await evaluateAllRules(rules, context);
      } catch (error) {
        logger.error({ error, eventId: event.id }, 'Error processing buddy.feedback.submitted');
      }
    },
    { queue: 'journey-engine' }
  );

  logger.info('Buddy subscribers setup complete');
}
