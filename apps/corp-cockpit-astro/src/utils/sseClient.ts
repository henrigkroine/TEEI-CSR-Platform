/**
 * SSE (Server-Sent Events) Client for Real-Time Dashboard Updates
 *
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Event queuing when offline
 * - Integration with offline storage (IndexedDB)
 * - Type-safe event handling
 */

export type SSEEventType =
  | 'metric_update'
  | 'report_generated'
  | 'evidence_added'
  | 'approval_status_changed'
  | 'user_activity'
  | 'system_notification';

export interface SSEEvent {
  id: string;
  type: SSEEventType;
  timestamp: number;
  companyId: string;
  data: any;
  retry?: number;
}

export interface SSEClientOptions {
  url: string;
  companyId: string;
  onEvent?: (event: SSEEvent) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private options: Required<SSEClientOptions>;
  private reconnectAttempts = 0;
  private reconnectTimeout: number | null = null;
  private isConnected = false;
  private messageBuffer: SSEEvent[] = [];
  private lastEventId: string | null = null;

  constructor(options: SSEClientOptions) {
    this.options = {
      maxReconnectAttempts: 10,
      reconnectInterval: 1000,
      onEvent: () => {},
      onError: () => {},
      onOpen: () => {},
      onClose: () => {},
      ...options,
    };
  }

  /**
   * Connect to SSE endpoint
   */
  connect(): void {
    if (this.eventSource) {
      console.warn('[SSE] Already connected');
      return;
    }

    try {
      const url = new URL(this.options.url);

      // Add company ID and last event ID to URL
      url.searchParams.set('companyId', this.options.companyId);
      if (this.lastEventId) {
        url.searchParams.set('lastEventId', this.lastEventId);
      }

      this.eventSource = new EventSource(url.toString());

      this.eventSource.addEventListener('open', this.handleOpen.bind(this));
      this.eventSource.addEventListener('error', this.handleError.bind(this));
      this.eventSource.addEventListener('message', this.handleMessage.bind(this));

      // Register custom event listeners
      const eventTypes: SSEEventType[] = [
        'metric_update',
        'report_generated',
        'evidence_added',
        'approval_status_changed',
        'user_activity',
        'system_notification',
      ];

      eventTypes.forEach((type) => {
        this.eventSource!.addEventListener(type, (e: MessageEvent) => {
          this.handleTypedEvent(type, e);
        });
      });

      console.log('[SSE] Connecting to:', url.toString());
    } catch (error) {
      console.error('[SSE] Connection error:', error);
      this.options.onError(error as Error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from SSE endpoint
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
      this.options.onClose();
      console.log('[SSE] Disconnected');
    }
  }

  /**
   * Get connection status
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Get buffered messages (for offline mode)
   */
  getBufferedMessages(): SSEEvent[] {
    return [...this.messageBuffer];
  }

  /**
   * Clear message buffer
   */
  clearBuffer(): void {
    this.messageBuffer = [];
  }

  /**
   * Event Handlers
   */

  private handleOpen(): void {
    console.log('[SSE] Connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.options.onOpen();

    // Flush buffered messages
    if (this.messageBuffer.length > 0) {
      console.log(`[SSE] Flushing ${this.messageBuffer.length} buffered messages`);
      this.messageBuffer.forEach((event) => {
        this.options.onEvent(event);
      });
      this.messageBuffer = [];
    }
  }

  private handleError(error: Event): void {
    console.error('[SSE] Error:', error);
    this.isConnected = false;

    const errorObj = new Error('SSE connection error');
    this.options.onError(errorObj);

    // EventSource automatically reconnects on error, but we'll handle manual reconnection
    if (
      this.eventSource &&
      this.eventSource.readyState === EventSource.CLOSED
    ) {
      this.eventSource = null;
      this.scheduleReconnect();
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      const sseEvent: SSEEvent = {
        id: event.lastEventId || this.generateEventId(),
        type: 'system_notification',
        timestamp: Date.now(),
        companyId: this.options.companyId,
        data: data,
      };

      this.lastEventId = sseEvent.id;
      this.processEvent(sseEvent);
    } catch (error) {
      console.error('[SSE] Failed to parse message:', error);
    }
  }

  private handleTypedEvent(type: SSEEventType, event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      const sseEvent: SSEEvent = {
        id: event.lastEventId || this.generateEventId(),
        type: type,
        timestamp: Date.now(),
        companyId: this.options.companyId,
        data: data,
      };

      this.lastEventId = sseEvent.id;
      this.processEvent(sseEvent);
    } catch (error) {
      console.error(`[SSE] Failed to parse ${type} event:`, error);
    }
  }

  private processEvent(event: SSEEvent): void {
    // If offline, buffer the event
    if (!navigator.onLine) {
      console.log('[SSE] Offline, buffering event:', event.id);
      this.messageBuffer.push(event);
      this.saveToOfflineStorage(event);
      return;
    }

    // Process event immediately
    this.options.onEvent(event);

    // Also save to offline storage for replay
    this.saveToOfflineStorage(event);
  }

  /**
   * Reconnection logic
   */

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('[SSE] Max reconnection attempts reached');
      this.options.onError(new Error('Max reconnection attempts reached'));
      return;
    }

    const delay = this.calculateBackoff();
    console.log(
      `[SSE] Scheduling reconnect (attempt ${this.reconnectAttempts + 1}/${
        this.options.maxReconnectAttempts
      }) in ${delay}ms`
    );

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private calculateBackoff(): number {
    // Exponential backoff with jitter
    const exponentialDelay =
      this.options.reconnectInterval * Math.pow(2, this.reconnectAttempts);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  /**
   * Offline storage integration
   */

  private async saveToOfflineStorage(event: SSEEvent): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');

      await store.add({
        ...event,
        storedAt: Date.now(),
      });

      console.log('[SSE] Event saved to offline storage:', event.id);
    } catch (error) {
      console.error('[SSE] Failed to save to offline storage:', error);
    }
  }

  private openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('teei-cockpit', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('events')) {
          const eventsStore = db.createObjectStore('events', {
            keyPath: 'id',
            autoIncrement: true,
          });
          eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
          eventsStore.createIndex('companyId', 'companyId', { unique: false });
        }
      };
    });
  }

  /**
   * Utilities
   */

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Hook-like factory for creating SSE clients
 */
export function createSSEClient(options: SSEClientOptions): SSEClient {
  return new SSEClient(options);
}

/**
 * Global SSE client instance (singleton pattern)
 */
let globalSSEClient: SSEClient | null = null;

export function getGlobalSSEClient(): SSEClient | null {
  return globalSSEClient;
}

export function setGlobalSSEClient(client: SSEClient): void {
  globalSSEClient = client;
}

export function clearGlobalSSEClient(): void {
  if (globalSSEClient) {
    globalSSEClient.disconnect();
    globalSSEClient = null;
  }
}
