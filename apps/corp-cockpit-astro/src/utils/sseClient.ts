/**
 * SSE Client with Exponential Backoff & Resume Support
 *
 * Provides resilient real-time updates for dashboard widgets with:
 * - Exponential backoff on connection failures
 * - Automatic reconnection with max retry limits
 * - Last-event-ID resume logic to prevent data loss
 * - Company-scoped channel subscription
 * - Graceful fallback to polling on SSE failure
 *
 * @module sseClient
 */

export interface SSEClientOptions {
  /** Company ID for tenant-scoped events */
  companyId: string;
  /** Event channel to subscribe to (e.g., 'dashboard-updates', 'evidence-updates') */
  channel: string;
  /** Initial retry delay in milliseconds (default: 1000) */
  initialRetryDelay?: number;
  /** Maximum retry delay in milliseconds (default: 30000) */
  maxRetryDelay?: number;
  /** Maximum number of retry attempts (default: 10) */
  maxRetries?: number;
  /** Callback for connection state changes */
  onConnectionChange?: (state: ConnectionState) => void;
  /** Callback for received messages */
  onMessage?: (event: SSEEvent) => void;
  /** Callback for errors */
  onError?: (error: SSEError) => void;
}

export interface SSEEvent {
  id: string;
  type: string;
  data: unknown;
  timestamp: string;
}

export interface SSEError {
  message: string;
  code: string;
  retryable: boolean;
  retryAfter?: number;
}

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

export class SSEClient {
  private eventSource: EventSource | null = null;
  private options: Required<SSEClientOptions>;
  private state: ConnectionState = 'disconnected';
  private retryCount = 0;
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private lastEventId: string | null = null;
  private isManualClose = false;

  constructor(options: SSEClientOptions) {
    this.options = {
      initialRetryDelay: 1000,
      maxRetryDelay: 30000,
      maxRetries: 10,
      onConnectionChange: () => {},
      onMessage: () => {},
      onError: () => {},
      ...options,
    };
  }

  /**
   * Connect to SSE endpoint
   */
  public connect(): void {
    if (this.state === 'connected' || this.state === 'connecting') {
      console.warn('[SSEClient] Already connected or connecting');
      return;
    }

    this.isManualClose = false;
    this.setState('connecting');

    try {
      // Build SSE URL with company scope and channel
      const url = this.buildSSEUrl();

      // Create EventSource with last event ID for resume support
      this.eventSource = new EventSource(url);

      // Set up event listeners
      this.eventSource.onopen = () => {
        console.log('[SSEClient] Connected to SSE endpoint');
        this.setState('connected');
        this.retryCount = 0; // Reset retry counter on successful connection
      };

      this.eventSource.onmessage = (event: MessageEvent) => {
        this.handleMessage(event);
      };

      this.eventSource.onerror = (error: Event) => {
        this.handleError(error);
      };

      // Listen for custom event types
      this.eventSource.addEventListener('dashboard-update', (event: MessageEvent) => {
        this.handleMessage(event);
      });

      this.eventSource.addEventListener('evidence-update', (event: MessageEvent) => {
        this.handleMessage(event);
      });

    } catch (error) {
      console.error('[SSEClient] Failed to create EventSource:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from SSE endpoint
   */
  public disconnect(): void {
    this.isManualClose = true;

    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.setState('disconnected');
    console.log('[SSEClient] Disconnected from SSE endpoint');
  }

  /**
   * Get current connection state
   */
  public getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get last received event ID
   */
  public getLastEventId(): string | null {
    return this.lastEventId;
  }

  /**
   * Build SSE endpoint URL with query parameters
   */
  private buildSSEUrl(): string {
    const baseUrl = import.meta.env.PUBLIC_REPORTING_SERVICE_URL || '/api';
    const params = new URLSearchParams({
      companyId: this.options.companyId,
      channel: this.options.channel,
    });

    // Add last event ID for resume support
    if (this.lastEventId) {
      params.append('lastEventId', this.lastEventId);
    }

    return `${baseUrl}/sse/stream?${params.toString()}`;
  }

  /**
   * Handle incoming SSE message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      // Parse event data
      const data = JSON.parse(event.data);

      // Store last event ID for resume
      if (event.lastEventId) {
        this.lastEventId = event.lastEventId;
      }

      const sseEvent: SSEEvent = {
        id: event.lastEventId || crypto.randomUUID(),
        type: event.type || 'message',
        data,
        timestamp: new Date().toISOString(),
      };

      // Emit to callback
      this.options.onMessage(sseEvent);

    } catch (error) {
      console.error('[SSEClient] Failed to parse message:', error);
      this.options.onError({
        message: 'Failed to parse SSE message',
        code: 'PARSE_ERROR',
        retryable: false,
      });
    }
  }

  /**
   * Handle SSE connection errors
   */
  private handleError(error: Event): void {
    console.error('[SSEClient] Connection error:', error);

    // Don't reconnect if manually closed
    if (this.isManualClose) {
      return;
    }

    // Close existing connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    const sseError: SSEError = {
      message: 'SSE connection failed',
      code: 'CONNECTION_ERROR',
      retryable: this.retryCount < this.options.maxRetries,
    };

    this.options.onError(sseError);

    // Schedule reconnection if retryable
    if (sseError.retryable) {
      this.scheduleReconnect();
    } else {
      this.setState('failed');
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.retryCount >= this.options.maxRetries) {
      console.error('[SSEClient] Max retries exceeded');
      this.setState('failed');
      this.options.onError({
        message: 'Max reconnection attempts exceeded',
        code: 'MAX_RETRIES_EXCEEDED',
        retryable: false,
      });
      return;
    }

    this.retryCount++;
    this.setState('reconnecting');

    // Calculate exponential backoff delay
    const delay = Math.min(
      this.options.initialRetryDelay * Math.pow(2, this.retryCount - 1),
      this.options.maxRetryDelay
    );

    console.log(`[SSEClient] Reconnecting in ${delay}ms (attempt ${this.retryCount}/${this.options.maxRetries})`);

    this.retryTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Update connection state and notify callback
   */
  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.options.onConnectionChange(state);
    }
  }
}

/**
 * Create SSE client instance
 */
export function createSSEClient(options: SSEClientOptions): SSEClient {
  return new SSEClient(options);
}

/**
 * Polling fallback for environments that don't support SSE
 */
export class PollingFallback {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private options: {
    companyId: string;
    channel: string;
    pollInterval: number;
    onMessage: (event: SSEEvent) => void;
    onError: (error: SSEError) => void;
  };

  constructor(options: {
    companyId: string;
    channel: string;
    pollInterval?: number;
    onMessage: (event: SSEEvent) => void;
    onError: (error: SSEError) => void;
  }) {
    this.options = {
      pollInterval: 5000, // Default 5 seconds
      ...options,
    };
  }

  /**
   * Start polling
   */
  public start(): void {
    if (this.intervalId) {
      console.warn('[PollingFallback] Already polling');
      return;
    }

    console.log(`[PollingFallback] Starting polling (interval: ${this.options.pollInterval}ms)`);

    this.intervalId = setInterval(async () => {
      try {
        const baseUrl = import.meta.env.PUBLIC_REPORTING_SERVICE_URL || '/api';
        const url = `${baseUrl}/updates?companyId=${this.options.companyId}&channel=${this.options.channel}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Emit as SSE event
        this.options.onMessage({
          id: crypto.randomUUID(),
          type: 'poll',
          data,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        console.error('[PollingFallback] Poll failed:', error);
        this.options.onError({
          message: error instanceof Error ? error.message : 'Poll failed',
          code: 'POLL_ERROR',
          retryable: true,
        });
      }
    }, this.options.pollInterval);
  }

  /**
   * Stop polling
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[PollingFallback] Stopped polling');
    }
  }
}
