import type { EventType, DomainEvent } from '@teei/event-contracts';
export declare class EventBus {
    private natsUrl;
    private nc;
    private subscriptions;
    constructor(natsUrl?: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * Publish an event to the event bus
     */
    publish<T extends DomainEvent>(event: T): Promise<void>;
    /**
     * Subscribe to events of a specific type
     */
    subscribe<T extends DomainEvent>(eventType: EventType, handler: (event: T) => Promise<void> | void, options?: {
        queue?: string;
    }): Promise<void>;
    /**
     * Create a new event with base metadata
     */
    createEvent<T extends DomainEvent>(type: EventType, data: T['data'], options?: {
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
    }): Omit<T, 'data'> & {
        data: T['data'];
    };
}
export declare function getEventBus(): EventBus;
//# sourceMappingURL=event-bus.d.ts.map