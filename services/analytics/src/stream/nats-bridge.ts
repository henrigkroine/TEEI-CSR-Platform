/**
 * NATS to SSE Bridge
 * Subscribes to NATS events and routes them to appropriate SSE clients
 * Handles backpressure and company-scoped routing
 */

import { getEventBus, createServiceLogger } from '@teei/shared-utils';
import type { JsMsg } from 'nats';
import { broadcastToCompany, SSE_EVENT_TYPES, type SSEEventType } from './sse.js';
import { saveEventForReplay } from './replay.js';

const logger = createServiceLogger('nats-bridge');

// NATS subjects to subscribe to
const SUBSCRIBED_SUBJECTS = ['metrics.*', 'journey.*', 'q2q.*'];

// Event type mapping from NATS subject to SSE event type
const SUBJECT_TO_EVENT_TYPE: Record<string, SSEEventType> = {
  'metrics.calculated': SSE_EVENT_TYPES.METRIC_UPDATED,
  'metrics.updated': SSE_EVENT_TYPES.METRIC_UPDATED,
  'journey.flag_updated': SSE_EVENT_TYPES.JOURNEY_FLAG_UPDATED,
  'journey.transition': SSE_EVENT_TYPES.JOURNEY_FLAG_UPDATED,
  'q2q.analyzed': SSE_EVENT_TYPES.VIS_UPDATED,
  'q2q.scored': SSE_EVENT_TYPES.VIS_UPDATED,
};

interface NATSEventPayload {
  companyId: string;
  [key: string]: any;
}

/**
 * Transform NATS event to SSE format
 */
function transformToSSE(subject: string, payload: NATSEventPayload): {
  eventType: SSEEventType;
  data: any;
} | null {
  // Map subject to event type
  const eventType = SUBJECT_TO_EVENT_TYPE[subject];
  if (!eventType) {
    // Check for wildcard matches
    if (subject.startsWith('metrics.')) {
      return {
        eventType: SSE_EVENT_TYPES.METRIC_UPDATED,
        data: payload,
      };
    } else if (subject.startsWith('journey.')) {
      return {
        eventType: SSE_EVENT_TYPES.JOURNEY_FLAG_UPDATED,
        data: payload,
      };
    } else if (subject.startsWith('q2q.')) {
      return {
        eventType: SSE_EVENT_TYPES.VIS_UPDATED,
        data: payload,
      };
    }

    logger.debug({ subject }, 'No SSE event type mapping found for subject');
    return null;
  }

  return {
    eventType,
    data: payload,
  };
}

/**
 * Process NATS message and route to SSE clients
 */
async function processNATSMessage(msg: JsMsg): Promise<void> {
  try {
    const subject = msg.subject;
    const payload = msg.json<NATSEventPayload>();

    // Extract company ID from payload
    const companyId = payload.companyId;
    if (!companyId) {
      logger.warn({ subject, payload }, 'NATS message missing companyId, skipping SSE broadcast');
      msg.ack();
      return;
    }

    // Transform to SSE format
    const sseEvent = transformToSSE(subject, payload);
    if (!sseEvent) {
      msg.ack();
      return;
    }

    // Generate event ID (use NATS sequence or generate one)
    const eventId = `${subject}-${msg.seq}-${Date.now()}`;

    // Save event for replay (24-hour retention)
    try {
      await saveEventForReplay(eventId, companyId, sseEvent.eventType, sseEvent.data);
    } catch (error) {
      logger.error({ error, eventId, companyId }, 'Failed to save event for replay');
      // Don't fail the broadcast if replay save fails
    }

    // Broadcast to all connections for this company
    const recipientCount = broadcastToCompany(companyId, eventId, sseEvent.eventType, sseEvent.data);

    logger.debug(
      {
        subject,
        eventId,
        companyId,
        eventType: sseEvent.eventType,
        recipients: recipientCount,
      },
      'NATS event routed to SSE clients'
    );

    // Acknowledge message
    msg.ack();
  } catch (error) {
    logger.error({ error, subject: msg.subject }, 'Failed to process NATS message');
    // NAK with delay to retry later
    msg.nak(5000); // Retry after 5 seconds
  }
}

/**
 * Initialize NATS to SSE bridge
 * Subscribe to relevant NATS subjects and start routing to SSE
 */
export async function initNATSBridge(): Promise<void> {
  const eventBus = getEventBus();

  // Ensure connection is established
  if (!eventBus.isConnected()) {
    logger.info('Event bus not connected, establishing connection...');
    await eventBus.connect();
  }

  logger.info({ subjects: SUBSCRIBED_SUBJECTS }, 'Initializing NATS to SSE bridge');

  // Subscribe to each subject pattern
  for (const subjectPattern of SUBSCRIBED_SUBJECTS) {
    try {
      // Create durable consumer for each subject pattern
      const consumerName = `sse-bridge-${subjectPattern.replace('*', 'wildcard')}`;

      logger.info({ subjectPattern, consumerName }, 'Creating NATS subscription');

      // Subscribe with consumer options
      await eventBus.subscribe(
        subjectPattern,
        async (msg) => {
          await processNATSMessage(msg);
        },
        {
          durable: consumerName,
          deliverSubject: `sse.${subjectPattern}`,
          ackWait: 30000, // 30 seconds
          maxDeliver: 3, // Retry up to 3 times
        }
      );

      logger.info({ subjectPattern, consumerName }, 'NATS subscription established');
    } catch (error) {
      logger.error({ error, subjectPattern }, 'Failed to subscribe to NATS subject');
      throw error;
    }
  }

  logger.info('NATS to SSE bridge initialized successfully');
}

/**
 * Shutdown NATS bridge
 */
export async function shutdownNATSBridge(): Promise<void> {
  logger.info('Shutting down NATS to SSE bridge');

  // EventBus will handle unsubscribing when disconnecting
  const eventBus = getEventBus();
  await eventBus.disconnect();

  logger.info('NATS to SSE bridge shut down');
}
