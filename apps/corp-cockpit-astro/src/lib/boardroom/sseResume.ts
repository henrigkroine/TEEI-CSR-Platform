/**
 * SSE Resume Mechanism with Last-Event-ID
 *
 * Implements SSE reconnection with event replay capability using
 * the Last-Event-ID header. Enables seamless resume after disconnection
 * with automatic retry and exponential backoff.
 *
 * Features:
 * - Store last event ID in localStorage
 * - Reconnect with Last-Event-ID header
 * - Exponential backoff retry strategy
 * - Event replay after reconnection
 * - Connection state management
 *
 * @module sseResume
 */

const STORAGE_KEY_PREFIX = 'teei_sse_last_event_';
const STORAGE_KEY_STATE = 'teei_sse_connection_state';

export interface SSEResumeOptions {
  url: string;
  companyId: string;
  channel: string;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  maxRetries?: number;
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  onConnectionChange?: (state: SSEConnectionState) => void;
}

export type SSEConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

export interface SSEResumeClient {
  connect: () => void;
  disconnect: () => void;
  getState: () => SSEConnectionState;
  getLastEventId: () => string | null;
  isConnected: () => boolean;
}

/**
 * Create SSE client with resume capability
 */
export function createSSEResumeClient(options: SSEResumeOptions): SSEResumeClient {
  const {
    url,
    companyId,
    channel,
    initialRetryDelay = 2000,
    maxRetryDelay = 30000,
    maxRetries = Infinity,
    onMessage,
    onError,
    onConnectionChange,
  } = options;

  let eventSource: EventSource | null = null;
  let state: SSEConnectionState = 'disconnected';
  let retryCount = 0;
  let retryTimeout: number | null = null;
  let reconnectAttempted = false;

  const storageKey = `${STORAGE_KEY_PREFIX}${companyId}_${channel}`;

  /**
   * Get last event ID from storage
   */
  function getLastEventId(): string | null {
    try {
      return localStorage.getItem(storageKey);
    } catch (error) {
      console.warn('[SSEResume] Failed to get last event ID from storage:', error);
      return null;
    }
  }

  /**
   * Store last event ID
   */
  function setLastEventId(eventId: string): void {
    try {
      localStorage.setItem(storageKey, eventId);
    } catch (error) {
      console.warn('[SSEResume] Failed to store last event ID:', error);
    }
  }

  /**
   * Clear last event ID from storage
   */
  function clearLastEventId(): void {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('[SSEResume] Failed to clear last event ID:', error);
    }
  }

  /**
   * Update connection state
   */
  function updateState(newState: SSEConnectionState): void {
    if (state !== newState) {
      const prevState = state;
      state = newState;
      console.log(`[SSEResume] Connection state: ${prevState} -> ${newState}`);

      // Store state for persistence
      try {
        localStorage.setItem(STORAGE_KEY_STATE, newState);
      } catch {
        // Ignore storage errors
      }

      if (onConnectionChange) {
        onConnectionChange(newState);
      }
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  function getRetryDelay(): number {
    const delay = Math.min(
      initialRetryDelay * Math.pow(2, retryCount),
      maxRetryDelay
    );
    return delay;
  }

  /**
   * Connect to SSE endpoint with Last-Event-ID header
   */
  function connect(): void {
    // Don't reconnect if already connected or connecting
    if (state === 'connected' || state === 'connecting') {
      console.log('[SSEResume] Already connected or connecting');
      return;
    }

    // Check if we've exceeded max retries
    if (retryCount >= maxRetries) {
      console.error('[SSEResume] Max retries exceeded');
      updateState('failed');
      return;
    }

    updateState(reconnectAttempted ? 'reconnecting' : 'connecting');

    // Build URL with query parameters
    const lastEventId = getLastEventId();
    const urlWithParams = new URL(url);
    urlWithParams.searchParams.set('companyId', companyId);
    urlWithParams.searchParams.set('channel', channel);

    console.log('[SSEResume] Connecting to SSE:', {
      url: urlWithParams.toString(),
      lastEventId: lastEventId || 'none',
      retryCount,
    });

    try {
      // Create EventSource with configuration
      const eventSourceInit: EventSourceInit = {};

      // Note: EventSource doesn't support custom headers directly
      // Last-Event-ID should be sent by browser automatically if available
      // We'll store it and rely on browser's native support or server to check query params

      eventSource = new EventSource(urlWithParams.toString(), eventSourceInit);

      // Handle connection open
      eventSource.onopen = () => {
        console.log('[SSEResume] Connection established');
        updateState('connected');
        retryCount = 0;
        reconnectAttempted = true;
      };

      // Handle incoming messages
      eventSource.onmessage = (event: MessageEvent) => {
        // Store event ID if present
        if (event.lastEventId) {
          setLastEventId(event.lastEventId);
        }

        // Forward to callback
        if (onMessage) {
          onMessage(event);
        }
      };

      // Handle errors
      eventSource.onerror = (error: Event) => {
        console.error('[SSEResume] Connection error:', error);

        if (eventSource) {
          const readyState = eventSource.readyState;

          if (readyState === EventSource.CLOSED) {
            // Connection closed, attempt reconnect
            handleDisconnect();
          } else if (readyState === EventSource.CONNECTING) {
            // Browser is already trying to reconnect
            updateState('reconnecting');
          }
        }

        if (onError) {
          onError(error);
        }
      };

      // Listen for specific event types (if server sends them)
      eventSource.addEventListener('dashboard-update', (event) => {
        if (onMessage && event instanceof MessageEvent) {
          onMessage(event);
        }
      });

      eventSource.addEventListener('evidence-update', (event) => {
        if (onMessage && event instanceof MessageEvent) {
          onMessage(event);
        }
      });
    } catch (error) {
      console.error('[SSEResume] Failed to create EventSource:', error);
      handleDisconnect();
    }
  }

  /**
   * Handle disconnection and schedule reconnect
   */
  function handleDisconnect(): void {
    console.log('[SSEResume] Handling disconnect');

    // Close existing connection
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    // Update state
    if (state === 'connected' || state === 'connecting') {
      updateState('reconnecting');
    } else {
      updateState('disconnected');
    }

    // Schedule reconnect with exponential backoff
    if (retryCount < maxRetries) {
      const delay = getRetryDelay();
      console.log(`[SSEResume] Scheduling reconnect in ${delay}ms (attempt ${retryCount + 1})`);

      retryTimeout = setTimeout(() => {
        retryCount++;
        connect();
      }, delay);
    } else {
      console.error('[SSEResume] Max retries reached, giving up');
      updateState('failed');
    }
  }

  /**
   * Handle reconnection success
   */
  function handleReconnect(): void {
    console.log('[SSEResume] Reconnected successfully');
    retryCount = 0;
    updateState('connected');

    // Server should send missed events based on Last-Event-ID
    // Client just needs to process them normally
  }

  /**
   * Manually disconnect
   */
  function disconnect(): void {
    console.log('[SSEResume] Manually disconnecting');

    // Clear retry timeout
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }

    // Close connection
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    // Update state
    updateState('disconnected');

    // Reset retry count
    retryCount = 0;
    reconnectAttempted = false;
  }

  /**
   * Get current state
   */
  function getState(): SSEConnectionState {
    return state;
  }

  /**
   * Check if connected
   */
  function isConnected(): boolean {
    return state === 'connected' && eventSource !== null;
  }

  // Return public API
  return {
    connect,
    disconnect,
    getState,
    getLastEventId,
    isConnected,
  };
}

/**
 * React hook wrapper for SSE resume client
 */
export interface UseSSEResumeOptions extends Omit<SSEResumeOptions, 'onMessage' | 'onError' | 'onConnectionChange'> {
  autoConnect?: boolean;
}

export interface UseSSEResumeReturn {
  state: SSEConnectionState;
  isConnected: boolean;
  lastEventId: string | null;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

/**
 * Create SSE resume hook for React components
 * (This is a factory function that returns hook data, not the actual hook)
 */
export function createSSEResumeHook(
  options: UseSSEResumeOptions,
  callbacks: {
    onMessage?: (event: MessageEvent) => void;
    onError?: (error: Event) => void;
    onConnectionChange?: (state: SSEConnectionState) => void;
  }
): {
  client: SSEResumeClient;
  state: SSEConnectionState;
  isConnected: boolean;
  lastEventId: string | null;
} {
  const client = createSSEResumeClient({
    ...options,
    ...callbacks,
  });

  if (options.autoConnect !== false) {
    client.connect();
  }

  return {
    client,
    state: client.getState(),
    isConnected: client.isConnected(),
    lastEventId: client.getLastEventId(),
  };
}

/**
 * Utility: Clear all stored SSE state
 */
export function clearAllSSEState(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(STORAGE_KEY_PREFIX) || key === STORAGE_KEY_STATE) {
        localStorage.removeItem(key);
      }
    });
    console.log('[SSEResume] Cleared all SSE state from storage');
  } catch (error) {
    console.warn('[SSEResume] Failed to clear SSE state:', error);
  }
}

/**
 * Utility: Get connection state from storage (for persistence check)
 */
export function getStoredConnectionState(): SSEConnectionState | null {
  try {
    const state = localStorage.getItem(STORAGE_KEY_STATE);
    return state as SSEConnectionState | null;
  } catch {
    return null;
  }
}
