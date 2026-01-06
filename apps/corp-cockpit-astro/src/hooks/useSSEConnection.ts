/**
 * React Hook for SSE Connection Management
 *
 * Provides a React-friendly interface to the SSE client with:
 * - Automatic lifecycle management (connect on mount, disconnect on unmount)
 * - Connection state tracking
 * - Message subscription with type safety
 * - Automatic fallback to polling on SSE failure
 *
 * @module useSSEConnection
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  SSEClient,
  // PollingFallback, // TODO: Implement PollingFallback or remove references
  createSSEClient,
  type SSEEvent,
  type SSEError,
  type ConnectionState,
} from '../utils/sseClient';

// Temporary stub for PollingFallback until implemented
class PollingFallback {
  constructor(options: any) {}
  start() {}
  stop() {}
}

export interface UseSSEConnectionOptions {
  /** Company ID for tenant-scoped events */
  companyId: string;
  /** Event channel to subscribe to */
  channel: string;
  /** SSE endpoint URL (default: /api/sse/dashboard) */
  url?: string;
  /** Enable automatic connection on mount (default: true) */
  autoConnect?: boolean;
  /** Enable polling fallback on SSE failure (default: true) */
  enablePollingFallback?: boolean;
  /** Polling interval in ms (default: 5000) */
  pollingInterval?: number;
  /** SSE retry options */
  retryOptions?: {
    initialDelay?: number;
    maxDelay?: number;
    maxRetries?: number;
  };
}

export interface UseSSEConnectionReturn {
  /** Current connection state */
  state: ConnectionState;
  /** Whether SSE is connected */
  isConnected: boolean;
  /** Whether using polling fallback */
  isPolling: boolean;
  /** Last received event ID */
  lastEventId: string | null;
  /** Last error */
  error: SSEError | null;
  /** Manually connect */
  connect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
  /** Subscribe to message events */
  subscribe: (handler: (event: SSEEvent) => void) => () => void;
}

/**
 * Hook for managing SSE connection with automatic fallback
 */
export function useSSEConnection(
  options: UseSSEConnectionOptions
): UseSSEConnectionReturn {
  const {
    companyId,
    channel,
    url = '/api/sse/dashboard',
    autoConnect = true,
    enablePollingFallback = true,
    pollingInterval = 5000,
    retryOptions = {},
  } = options;

  // State
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [isPolling, setIsPolling] = useState(false);
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [error, setError] = useState<SSEError | null>(null);

  // Refs
  const sseClientRef = useRef<SSEClient | null>(null);
  const pollingFallbackRef = useRef<PollingFallback | null>(null);
  const messageHandlersRef = useRef<Set<(event: SSEEvent) => void>>(new Set());

  /**
   * Handle incoming messages
   */
  const handleMessage = useCallback((event: SSEEvent) => {
    setLastEventId(event.id);
    setError(null); // Clear errors on successful message

    // Notify all subscribers
    messageHandlersRef.current.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        console.error('[useSSEConnection] Message handler error:', err);
      }
    });
  }, []);

  /**
   * Handle connection errors
   */
  const handleError = useCallback(
    (sseError: SSEError) => {
      setError(sseError);

      // If SSE failed permanently and polling fallback enabled, switch to polling
      if (
        !sseError.retryable &&
        enablePollingFallback &&
        !isPolling &&
        sseError.code !== 'POLL_ERROR'
      ) {
        console.log('[useSSEConnection] SSE failed, switching to polling fallback');
        startPolling();
      }
    },
    [enablePollingFallback, isPolling]
  );

  /**
   * Handle connection state changes
   */
  const handleConnectionChange = useCallback((newState: ConnectionState) => {
    setState(newState);
  }, []);

  /**
   * Start polling fallback
   */
  const startPolling = useCallback(() => {
    if (pollingFallbackRef.current) {
      return; // Already polling
    }

    setIsPolling(true);

    pollingFallbackRef.current = new PollingFallback({
      companyId,
      channel,
      pollInterval: pollingInterval,
      onMessage: handleMessage,
      onError: handleError,
    });

    pollingFallbackRef.current.start();
  }, [companyId, channel, pollingInterval, handleMessage, handleError]);

  /**
   * Stop polling fallback
   */
  const stopPolling = useCallback(() => {
    if (pollingFallbackRef.current) {
      pollingFallbackRef.current.stop();
      pollingFallbackRef.current = null;
      setIsPolling(false);
    }
  }, []);

  /**
   * Connect to SSE
   */
  const connect = useCallback(() => {
    // Stop polling if active
    stopPolling();

    // Validate companyId before connecting
    if (!companyId || companyId === 'undefined') {
      console.error('[useSSEConnection] Invalid companyId:', companyId);
      const invalidError: SSEError = {
        message: 'Invalid companyId provided',
        code: 'INVALID_COMPANY_ID',
        timestamp: Date.now(),
        retryable: false,
      };
      handleError(invalidError);
      return;
    }

    // Create SSE client if not exists
    if (!sseClientRef.current) {
      sseClientRef.current = createSSEClient({
        url,
        companyId,
        onEvent: handleMessage,
        onError: handleError,
        onStateChange: handleConnectionChange,
        onConnect: () => {
          setError(null);
        },
        onDisconnect: () => {
          // Keep last state
        },
        maxReconnectAttempts: retryOptions.maxRetries ?? 10,
        baseDelay: retryOptions.initialDelay ?? 2000,
        maxDelay: retryOptions.maxDelay ?? 32000,
      });
    }

    sseClientRef.current.connect();
  }, [
    companyId,
    channel,
    url,
    retryOptions,
    handleConnectionChange,
    handleMessage,
    handleError,
    stopPolling,
  ]);

  /**
   * Disconnect from SSE
   */
  const disconnect = useCallback(() => {
    if (sseClientRef.current) {
      sseClientRef.current.disconnect();
      sseClientRef.current = null;
    }
    stopPolling();
  }, [stopPolling]);

  /**
   * Subscribe to message events
   */
  const subscribe = useCallback((handler: (event: SSEEvent) => void) => {
    messageHandlersRef.current.add(handler);

    // Return unsubscribe function
    return () => {
      messageHandlersRef.current.delete(handler);
    };
  }, []);

  /**
   * Lifecycle: Auto-connect on mount, disconnect on unmount
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, channel, url, autoConnect]);

  return {
    state,
    isConnected: state === 'connected',
    isPolling,
    lastEventId,
    error,
    connect,
    disconnect,
    subscribe,
  };
}

/**
 * Hook for subscribing to specific message types
 */
export function useSSEMessage<T = unknown>(
  connection: UseSSEConnectionReturn,
  messageType: string,
  handler: (data: T, event: SSEEvent) => void
): void {
  useEffect(() => {
    const unsubscribe = connection.subscribe((event) => {
      if (event.type === messageType) {
        handler(event.data as T, event);
      }
    });

    return unsubscribe;
  }, [connection, messageType, handler]);
}

/**
 * Hook for dashboard updates
 */
export function useDashboardUpdates(
  companyId: string,
  onUpdate: (data: unknown) => void
) {
  const connection = useSSEConnection({
    companyId,
    channel: 'dashboard-updates',
  });

  useSSEMessage(connection, 'dashboard-update', (data) => {
    onUpdate(data);
  });

  return connection;
}

/**
 * Hook for evidence updates
 */
export function useEvidenceUpdates(
  companyId: string,
  onUpdate: (data: unknown) => void
) {
  const connection = useSSEConnection({
    companyId,
    channel: 'evidence-updates',
  });

  useSSEMessage(connection, 'evidence-update', (data) => {
    onUpdate(data);
  });

  return connection;
}
