import { connect, NatsConnection, StringCodec, Subscription } from 'nats';
import type { EventType, EventEnvelope, DomainEvent } from '@teei/event-contracts';
import { logger } from './logger.js';
import { randomUUID } from 'crypto';

const sc = StringCodec();

export class EventBus {
  private nc: NatsConnection | null = null;
  private subscriptions: Map<string, Subscription> = new Map();

  constructor(private natsUrl: string = process.env.NATS_URL || 'nats://localhost:4222') {}

  async connect(): Promise<void> {
    try {
      logger.info({ natsUrl: this.natsUrl }, 'Connecting to NATS...');
      this.nc = await connect({
        servers: this.natsUrl,
        maxReconnectAttempts: -1, // Infinite reconnect
        reconnectTimeWait: 2000,
      });
      logger.info('Connected to NATS');

      // Handle connection events
      (async () => {
        if (!this.nc) return;
        for await (const status of this.nc.status()) {
          logger.info({ type: status.type, data: status.data }, 'NATS status update');
        }
      })();
    } catch (error) {
      logger.error({ error }, 'Failed to connect to NATS');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.nc) {
      // Unsubscribe all
      for (const [subject, subscription] of this.subscriptions.entries()) {
        subscription.unsubscribe();
        logger.info({ subject }, 'Unsubscribed from subject');
      }
      this.subscriptions.clear();

      await this.nc.drain();
      logger.info('Disconnected from NATS');
    }
  }

  /**
   * Publish an event to the event bus
   */
  async publish<T extends DomainEvent>(event: T): Promise<void> {
    if (!this.nc) {
      throw new Error('Event bus not connected');
    }

    const subject = event.type.replace(/\./g, '.'); // Already in correct format
    const envelope: EventEnvelope = {
      type: event.type,
      data: event.data,
      metadata: {
        id: event.id,
        version: event.version,
        timestamp: event.timestamp,
        correlationId: event.correlationId,
        causationId: event.causationId,
        metadata: event.metadata,
      },
    };

    try {
      this.nc.publish(subject, sc.encode(JSON.stringify(envelope)));
      logger.debug({ subject, eventId: event.id }, 'Event published');
    } catch (error) {
      logger.error({ error, subject, eventId: event.id }, 'Failed to publish event');
      throw error;
    }
  }

  /**
   * Subscribe to events of a specific type
   */
  async subscribe<T extends DomainEvent>(
    eventType: EventType,
    handler: (event: T) => Promise<void> | void,
    options?: {
      queue?: string; // Queue group for load balancing
    }
  ): Promise<void> {
    if (!this.nc) {
      throw new Error('Event bus not connected');
    }

    const subject = eventType;
    const sub = this.nc.subscribe(subject, { queue: options?.queue });

    logger.info({ subject, queue: options?.queue }, 'Subscribed to event');

    // Store subscription
    this.subscriptions.set(subject, sub);

    // Process messages
    (async () => {
      for await (const msg of sub) {
        try {
          const envelope: EventEnvelope = JSON.parse(sc.decode(msg.data));
          const event = {
            type: envelope.type,
            data: envelope.data,
            ...envelope.metadata,
          } as T;

          await handler(event);
        } catch (error) {
          logger.error({ error, subject }, 'Error processing event');
        }
      }
    })();
  }

  /**
   * Create a new event with base metadata
   */
  createEvent<T extends DomainEvent>(
    type: EventType,
    data: T['data'],
    options?: {
      correlationId?: string;
      causationId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Omit<T, 'data'> & { data: T['data'] } {
    return {
      id: randomUUID(),
      type,
      version: 'v1',
      timestamp: new Date().toISOString(),
      correlationId: options?.correlationId,
      causationId: options?.causationId,
      metadata: options?.metadata,
      data,
    } as unknown as Omit<T, 'data'> & { data: T['data'] };
  }
}

// Singleton instance
let eventBusInstance: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus();
  }
  return eventBusInstance;
}
