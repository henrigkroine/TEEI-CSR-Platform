/**
 * SSE (Server-Sent Events) Client for Real-Time Dashboard Updates
 *
 * Features:
 * - 6-state FSM for robust connection lifecycle
 * - Exponential backoff with jitter (2s → 32s, max 10 retries)
 * - Last-Event-ID resume for gap-free event streaming
 * - localStorage persistence across page reloads
 * - Event queuing when offline
 * - Integration with offline storage (IndexedDB)
 * - Type-safe event handling
 *
 * @module sseClient
 */

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'failed';

export interface SSEError {
  message: string;
  code?: string;
  timestamp: number;
  retryable: boolean;
}

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
  onError?: (error: SSEError) => void;
  onStateChange?: (newState: ConnectionState, oldState: ConnectionState) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  maxReconnectAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private options: Required<SSEClientOptions>;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: number | null = null;
  private messageBuffer: SSEEvent[] = [];
  private lastEventId: string | null = null;
  private eventCount = 0;
  private readonly STORAGE_KEY_PREFIX = 'teei-sse-lastEventId';
  private readonly CONNECT_TIMEOUT = 5000; // 5s timeout for connection
  private connectTimeoutId: number | null = null;

  constructor(options: SSEClientOptions) {
    this.options = {
      maxReconnectAttempts: 10,
      baseDelay: 2000, // 2 seconds
      maxDelay: 32000, // 32 seconds
      onEvent: () => {},
      onError: () => {},
      onStateChange: () => {},
      onConnect: () => {},
      onDisconnect: () => {},
      ...options,
    };

    // Restore lastEventId from localStorage on initialization
    this.restoreLastEventId();
  }

  /**
   * Connect to SSE endpoint
   */
  connect(): void {
    if (this.eventSource && this.state !== 'disconnected' && this.state !== 'failed') {
      console.warn('[SSE] Already connected or connecting');
      return;
    }

    try {
      this.setState('connecting');

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

      // Set connection timeout
      this.connectTimeoutId = window.setTimeout(() => {
        if (this.state === 'connecting') {
          console.error('[SSE] Connection timeout');
          this.handleConnectionTimeout();
        }
      }, this.CONNECT_TIMEOUT);

      console.log('[SSE] Connecting to:', url.toString());
    } catch (error) {
      console.error('[SSE] Connection error:', error);
      const sseError: SSEError = {
        message: (error as Error).message || 'Connection error',
        code: 'CONNECTION_ERROR',
        timestamp: Date.now(),
        retryable: true,
      };
      this.options.onError(sseError);
      this.setState('error');
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

    if (this.connectTimeoutId) {
      clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.setState('disconnected');
    this.options.onDisconnect();
    console.log('[SSE] Disconnected');
  }

  /**
   * Get connection status
   */
  get connected(): boolean {
    return this.state === 'connected';
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.state;
  }

  /**
   * Get last event ID
   */
  getLastEventId(): string | null {
    return this.lastEventId;
  }

  /**
   * Get retry attempt count
   */
  getRetryAttempt(): number {
    return this.reconnectAttempts;
  }

  /**
   * Get max retry attempts
   */
  getMaxRetries(): number {
    return this.options.maxReconnectAttempts;
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

    // Clear connection timeout
    if (this.connectTimeoutId) {
      clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = null;
    }

    this.setState('connected');
    this.reconnectAttempts = 0;
    this.options.onConnect();

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

    // Clear connection timeout if it's still pending
    if (this.connectTimeoutId) {
      clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = null;
    }

    const sseError: SSEError = {
      message: 'SSE connection error',
      code: 'CONNECTION_ERROR',
      timestamp: Date.now(),
      retryable: true,
    };
    this.options.onError(sseError);

    // EventSource automatically reconnects on error, but we'll handle manual reconnection
    if (
      this.eventSource &&
      this.eventSource.readyState === EventSource.CLOSED
    ) {
      this.eventSource = null;

      // Only transition to error if not already reconnecting
      if (this.state === 'connected' || this.state === 'connecting') {
        this.setState('error');
      }

      this.scheduleReconnect();
    }
  }

  private handleConnectionTimeout(): void {
    console.error('[SSE] Connection timeout after 5 seconds');

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    const timeoutError: SSEError = {
      message: 'Connection timeout',
      code: 'TIMEOUT',
      timestamp: Date.now(),
      retryable: true,
    };
    this.options.onError(timeoutError);
    this.setState('error');
    this.scheduleReconnect();
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

      // Update and persist lastEventId
      if (sseEvent.id) {
        this.lastEventId = sseEvent.id;
        this.persistLastEventId(sseEvent.id);
      }

      this.eventCount++;
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

      // Update and persist lastEventId
      if (sseEvent.id) {
        this.lastEventId = sseEvent.id;
        this.persistLastEventId(sseEvent.id);
      }

      this.eventCount++;
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
      const failedError: SSEError = {
        message: 'Max reconnection attempts reached',
        code: 'MAX_RETRIES_EXCEEDED',
        timestamp: Date.now(),
        retryable: false,
      };
      this.options.onError(failedError);
      this.setState('failed');
      return;
    }

    const delay = this.calculateBackoff();
    this.setState('reconnecting');

    console.log(
      `[SSE] Scheduling reconnect (attempt ${this.reconnectAttempts + 1}/${
        this.options.maxReconnectAttempts
      }) in ${Math.round(delay)}ms`
    );

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Calculate exponential backoff delay with jitter
   * Formula: delay = min(baseDelay × 2^attempt + jitter, maxDelay)
   */
  private calculateBackoff(): number {
    const baseDelay = this.options.baseDelay; // 2000ms
    const maxDelay = this.options.maxDelay;   // 32000ms

    // Exponential: 2s, 4s, 8s, 16s, 32s, 32s, ...
    const exponentialDelay = baseDelay * Math.pow(2, this.reconnectAttempts);
    const cappedDelay = Math.min(exponentialDelay, maxDelay);

    // Add jitter: 0-1000ms random
    const jitter = Math.random() * 1000;

    return cappedDelay + jitter;
  }

  /**
   * Manual reconnect (resets retry counter)
   */
  reconnect(): void {
    console.log('[SSE] Manual reconnect requested');

    // Cancel any pending reconnection
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Reset retry counter
    this.reconnectAttempts = 0;

    // Disconnect and reconnect
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.connect();
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
   * State Management
   */

  private setState(newState: ConnectionState): void {
    const oldState = this.state;
    if (oldState === newState) {
      return; // No change
    }

    this.state = newState;
    console.log(`[SSE] State transition: ${oldState} → ${newState}`);

    // Notify state change listeners
    this.options.onStateChange(newState, oldState);

    // Emit custom event for components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sse:state-change', {
          detail: { state: newState, oldState, companyId: this.options.companyId },
        })
      );
    }
  }

  /**
   * Last-Event-ID Persistence
   */

  private persistLastEventId(eventId: string): void {
    try {
      const storageKey = `${this.STORAGE_KEY_PREFIX}-${this.options.companyId}`;
      localStorage.setItem(storageKey, eventId);
    } catch (error) {
      console.error('[SSE] Failed to persist lastEventId:', error);
    }
  }

  private restoreLastEventId(): void {
    try {
      const storageKey = `${this.STORAGE_KEY_PREFIX}-${this.options.companyId}`;
      const storedId = localStorage.getItem(storageKey);
      if (storedId) {
        this.lastEventId = storedId;
        console.log('[SSE] Restored lastEventId from localStorage:', storedId);
      }
    } catch (error) {
      console.error('[SSE] Failed to restore lastEventId:', error);
    }
  }

  /**
   * Utilities
   */

  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
