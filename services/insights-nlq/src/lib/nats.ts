/**
 * NATS Event Bus Client for Insights NLQ Service (Optional)
 *
 * Provides event publishing for query analytics and feedback.
 */

import { connect, NatsConnection, JsMsg, StringCodec } from 'nats';
import { config } from '../config.js';

let nc: NatsConnection | null = null;
const sc = StringCodec();

/**
 * Initialize NATS connection
 */
export async function initNats(): Promise<void> {
  if (nc) {
    return; // Already initialized
  }

  nc = await connect({
    servers: config.nats.url,
    maxReconnectAttempts: config.nats.reconnectAttempts,
    reconnect: true,
  });

  // Handle connection events
  (async () => {
    for await (const status of nc!.status()) {
      console.log(`NATS connection status: ${status.type}`);
    }
  })().catch((err) => {
    console.error('NATS status error:', err);
  });

  console.log('NATS connected');
}

/**
 * Get NATS connection
 */
export function getNats(): NatsConnection {
  if (!nc) {
    throw new Error('NATS not initialized. Call initNats() first.');
  }
  return nc;
}

/**
 * Close NATS connection
 */
export async function closeNats(): Promise<void> {
  if (nc) {
    await nc.drain();
    await nc.close();
    nc = null;
  }
}

/**
 * Health check for NATS
 */
export async function healthCheck(): Promise<boolean> {
  if (!nc) {
    return false;
  }

  try {
    return !nc.isClosed();
  } catch (error) {
    return false;
  }
}

/**
 * Publish query event
 */
export async function publishQueryEvent(event: {
  type: 'query_executed' | 'query_failed' | 'feedback_received';
  queryId: string;
  userId?: string;
  companyId?: string;
  question?: string;
  executionTime?: number;
  cached?: boolean;
  error?: string;
}): Promise<void> {
  if (!nc) {
    console.warn('NATS not initialized, skipping event publish');
    return;
  }

  try {
    const subject = `nlq.${event.type}`;
    const data = sc.encode(JSON.stringify(event));
    await nc.publish(subject, data);
  } catch (error) {
    console.error('Failed to publish NATS event:', error);
  }
}
