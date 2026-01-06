import { connect, StringCodec } from 'nats';
import { logger } from './logger.js';
import { randomUUID } from 'crypto';
const sc = StringCodec();
export class EventBus {
    natsUrl;
    nc = null;
    subscriptions = new Map();
    constructor(natsUrl = process.env.NATS_URL || 'nats://localhost:4222') {
        this.natsUrl = natsUrl;
    }
    async connect() {
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
                if (!this.nc)
                    return;
                for await (const status of this.nc.status()) {
                    logger.info({ type: status.type, data: status.data }, 'NATS status update');
                }
            })();
        }
        catch (error) {
            logger.error({ error }, 'Failed to connect to NATS');
            throw error;
        }
    }
    async disconnect() {
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
    async publish(event) {
        if (!this.nc) {
            throw new Error('Event bus not connected');
        }
        const subject = event.type.replace(/\./g, '.'); // Already in correct format
        const envelope = {
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
        }
        catch (error) {
            logger.error({ error, subject, eventId: event.id }, 'Failed to publish event');
            throw error;
        }
    }
    /**
     * Subscribe to events of a specific type
     */
    async subscribe(eventType, handler, options) {
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
                    const envelope = JSON.parse(sc.decode(msg.data));
                    const event = {
                        type: envelope.type,
                        data: envelope.data,
                        ...envelope.metadata,
                    };
                    await handler(event);
                }
                catch (error) {
                    logger.error({ error, subject }, 'Error processing event');
                }
            }
        })();
    }
    /**
     * Create a new event with base metadata
     */
    createEvent(type, data, options) {
        return {
            id: randomUUID(),
            type,
            version: 'v1',
            timestamp: new Date().toISOString(),
            correlationId: options?.correlationId,
            causationId: options?.causationId,
            metadata: options?.metadata,
            data,
        };
    }
}
// Singleton instance
let eventBusInstance = null;
export function getEventBus() {
    if (!eventBusInstance) {
        eventBusInstance = new EventBus();
    }
    return eventBusInstance;
}
//# sourceMappingURL=event-bus.js.map