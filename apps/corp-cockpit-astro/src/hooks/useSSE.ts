/**
 * React Hook for SSE (Server-Sent Events) Management
 *
 * Simple hook for managing SSE connections with state tracking.
 * Provides direct access to SSE client state and methods.
 *
 * @module useSSE
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { SSEClient, type SSEEvent, type SSEError, type ConnectionState } from '../utils/sseClient';

export interface UseSSEOptions {
  /** SSE endpoint URL */
  url: string;
  /** Company ID for tenant-scoped events */
  companyId: string;
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Base delay for exponential backoff in ms (default: 2000) */
  baseDelay?: number;
  /** Max delay for exponential backoff in ms (default: 32000) */
  maxDelay?: number;
}

export interface UseSSEReturn {
  /** Current connection state */
  state: ConnectionState;
  /** Latest event data */
  data: any | null;
  /** Last error that occurred */
  error: SSEError | null;
  /** Whether currently connected */
  isConnected: boolean;
  /** Current retry attempt (0 if connected) */
  retryAttempt: number;
  /** Max retry attempts */
  maxRetries: number;
  /** Last event ID (for resume) */
  lastEventId: string | null;
  /** Manually connect */
  connect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
  /** Manual reconnect (resets retry counter) */
  reconnect: () => void;
  /** Subscribe to events */
  on: (handler: (event: SSEEvent) => void) => () => void;
}

/**
 * Hook for managing SSE connection
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { state, data, error, retryAttempt, reconnect } = useSSE({
 *     url: '/api/sse/metrics',
 *     companyId: 'acme-corp',
 *   });
 *
 *   if (state === 'failed') {
 *     return <button onClick={reconnect}>Retry Connection</button>;
 *   }
 *
 *   return <div>State: {state}, Data: {JSON.stringify(data)}</div>;
 * }
 * ```
 */
export function useSSE(options: UseSSEOptions): UseSSEReturn {
  const {
    url,
    companyId,
    autoConnect = true,
    maxReconnectAttempts = 10,
    baseDelay = 2000,
    maxDelay = 32000,
  } = options;

  // State
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<SSEError | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  // Refs
  const clientRef = useRef<SSEClient | null>(null);
  const eventHandlersRef = useRef<Set<(event: SSEEvent) => void>>(new Set());

  /**
   * Initialize SSE client
   */
  const initializeClient = useCallback(() => {
    if (clientRef.current) {
      return clientRef.current;
    }

    const client = new SSEClient({
      url,
      companyId,
      maxReconnectAttempts,
      baseDelay,
      maxDelay,
      onEvent: (event: SSEEvent) => {
        setData(event.data);
        setError(null); // Clear error on successful event

        // Notify all subscribers
        eventHandlersRef.current.forEach((handler) => {
          try {
            handler(event);
          } catch (err) {
            console.error('[useSSE] Event handler error:', err);
          }
        });
      },
      onError: (sseError: SSEError) => {
        setError(sseError);
      },
      onStateChange: (newState: ConnectionState) => {
        setState(newState);
        setRetryAttempt(client.getRetryAttempt());
        setLastEventId(client.getLastEventId());
      },
      onConnect: () => {
        setError(null);
        setRetryAttempt(0);
      },
      onDisconnect: () => {
        // Keep last data and error state
      },
    });

    clientRef.current = client;
    return client;
  }, [url, companyId, maxReconnectAttempts, baseDelay, maxDelay]);

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(() => {
    const client = initializeClient();
    client.connect();
  }, [initializeClient]);

  /**
   * Disconnect from SSE endpoint
   */
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  }, []);

  /**
   * Manual reconnect (resets retry counter)
   */
  const reconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.reconnect();
    } else {
      connect();
    }
  }, [connect]);

  /**
   * Subscribe to SSE events
   */
  const on = useCallback((handler: (event: SSEEvent) => void) => {
    eventHandlersRef.current.add(handler);

    // Return unsubscribe function
    return () => {
      eventHandlersRef.current.delete(handler);
    };
  }, []);

  /**
   * Auto-connect on mount, disconnect on unmount
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    data,
    error,
    isConnected: state === 'connected',
    retryAttempt,
    maxRetries: maxReconnectAttempts,
    lastEventId,
    connect,
    disconnect,
    reconnect,
    on,
  };
}

/**
 * Hook for subscribing to specific event types
 *
 * @example
 * ```tsx
 * function MetricsDashboard() {
 *   const sse = useSSE({ url: '/api/sse/metrics', companyId: 'acme' });
 *
 *   useSSEEvent(sse, (event) => {
 *     if (event.type === 'metric_update') {
 *       console.log('Metric updated:', event.data);
 *     }
 *   });
 *
 *   return <ConnectionStatus state={sse.state} />;
 * }
 * ```
 */
export function useSSEEvent(
  sse: UseSSEReturn,
  handler: (event: SSEEvent) => void
): void {
  useEffect(() => {
    const unsubscribe = sse.on(handler);
    return unsubscribe;
  }, [sse, handler]);
}
