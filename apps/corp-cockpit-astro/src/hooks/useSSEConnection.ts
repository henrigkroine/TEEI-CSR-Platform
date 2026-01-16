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
  createSSEClient,
  type SSEEvent,
  type SSEError,
  type ConnectionState,
} from '../utils/sseClient';
import { PollingClient, createPollingClient, type PollingState } from '../utils/pollingClient';

import { PollingClient, createPollingClient, type PollingState } from '../utils/pollingClient';

export interface UseSSEConnectionOptions {
  /** Company ID for tenant-scoped events */
  companyId: string;
  /** Event channel to subscribe to */
  channel: string;
  /** SSE endpoint URL (default: /api/sse/dashboard) - Note: Polling is used by default */
  url?: string;
  /** Enable automatic connection on mount (default: true) */
  autoConnect?: boolean;
  /** Use polling instead of SSE (default: true for Cloudflare compatibility) */
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
    url = '/api/polling/dashboard', // Default to polling endpoint
    autoConnect = true,
    enablePollingFallback = true, // Default to true (use polling)
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
  const pollingClientRef = useRef<PollingClient | null>(null);
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
    if (pollingClientRef.current) {
      return; // Already polling
    }

    setIsPolling(true);
    setState('connected'); // Treat polling as connected

    // Use polling endpoint instead of SSE
    const pollingUrl = url.replace('/sse/', '/polling/') || '/api/polling/dashboard';

    pollingClientRef.current = createPollingClient({
      url: pollingUrl,
      companyId,
      pollInterval: pollingInterval,
      lastEventId: lastEventId,
      onEvent: (event) => {
        // Convert polling event to SSE event format
        const sseEvent: SSEEvent = {
          id: event.id,
          type: event.type as any,
          timestamp: event.timestamp,
          companyId: event.companyId,
          data: event.data,
        };
        handleMessage(sseEvent);
      },
      onError: (error) => {
        const sseError: SSEError = {
          message: error.message,
          code: 'POLL_ERROR',
          timestamp: Date.now(),
          retryable: true,
        };
        handleError(sseError);
      },
      onStateChange: (pollingState: PollingState) => {
        // Map polling states to SSE states
        if (pollingState === 'polling') {
          setState('connected');
        } else if (pollingState === 'error') {
          setState('error');
        } else if (pollingState === 'disconnected') {
          setState('disconnected');
        }
      },
    });

    pollingClientRef.current.start();
  }, [companyId, channel, pollingInterval, url, lastEventId, handleMessage, handleError]);

  /**
   * Stop polling fallback
   */
  const stopPolling = useCallback(() => {
    if (pollingClientRef.current) {
      pollingClientRef.current.stop();
      pollingClientRef.current = null;
      setIsPolling(false);
    }
  }, []);

  /**
   * Connect to SSE (or polling if enabled)
   */
  const connect = useCallback(() => {
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

    // Use polling by default (better for Cloudflare Pages)
    // SSE can be enabled later if needed via Cloudflare Workers
    if (enablePollingFallback) {
      startPolling();
      return;
    }

    // Fallback to SSE if polling is disabled
    stopPolling();

    // Create SSE client if not exists
    if (!sseClientRef.current) {
      sseClientRef.current = createSSEClient({
        url,
        companyId,
        onEvent: handleMessage,
        onError: (sseError) => {
          handleError(sseError);
          // Auto-fallback to polling on SSE error
          if (enablePollingFallback && !sseError.retryable) {
            startPolling();
          }
        },
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
    enablePollingFallback,
    handleConnectionChange,
    handleMessage,
    handleError,
    stopPolling,
    startPolling,
  ]);

  /**
   * Disconnect from SSE/Polling
   */
  const disconnect = useCallback(() => {
    if (sseClientRef.current) {
      sseClientRef.current.disconnect();
      sseClientRef.current = null;
    }
    stopPolling();
    setState('disconnected');
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
