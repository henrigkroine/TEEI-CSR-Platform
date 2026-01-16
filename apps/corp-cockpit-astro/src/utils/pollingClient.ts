/**
 * Polling Client for Real-Time Dashboard Updates
 * 
 * Replaces SSE with periodic polling for better Cloudflare Pages compatibility.
 * Features:
 * - Configurable polling interval
 * - Exponential backoff on errors
 * - Last event ID tracking
 * - Automatic retry logic
 */

export type PollingState = 'disconnected' | 'polling' | 'paused' | 'error';

export interface PollingEvent {
  id: string;
  type: string;
  timestamp: number;
  companyId: string;
  data: any;
}

export interface PollingClientOptions {
  url: string;
  companyId: string;
  pollInterval?: number; // Default: 5000ms (5 seconds)
  onEvent?: (event: PollingEvent) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: PollingState) => void;
  lastEventId?: string | null;
}

export class PollingClient {
  private options: Required<Omit<PollingClientOptions, 'lastEventId'>> & { lastEventId: string | null };
  private state: PollingState = 'disconnected';
  private pollIntervalId: number | null = null;
  private errorCount = 0;
  private readonly MAX_ERRORS = 5;
  private readonly BACKOFF_MULTIPLIER = 1.5;
  private currentInterval: number;

  constructor(options: PollingClientOptions) {
    this.currentInterval = options.pollInterval || 5000;
    this.options = {
      url: options.url,
      companyId: options.companyId,
      pollInterval: options.pollInterval || 5000,
      onEvent: options.onEvent || (() => {}),
      onError: options.onError || (() => {}),
      onStateChange: options.onStateChange || (() => {}),
      lastEventId: options.lastEventId || null,
    };
  }

  /**
   * Start polling
   */
  start(): void {
    if (this.state === 'polling') {
      console.warn('[Polling] Already polling');
      return;
    }

    if (!this.options.companyId || this.options.companyId === 'undefined') {
      console.error('[Polling] Invalid companyId:', this.options.companyId);
      this.setState('error');
      return;
    }

    this.setState('polling');
    this.errorCount = 0;
    this.currentInterval = this.options.pollInterval;
    this.poll();
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.pollIntervalId !== null) {
      clearTimeout(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    this.setState('disconnected');
  }

  /**
   * Pause polling (temporary stop)
   */
  pause(): void {
    if (this.pollIntervalId !== null) {
      clearTimeout(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    this.setState('paused');
  }

  /**
   * Resume polling after pause
   */
  resume(): void {
    if (this.state === 'paused') {
      this.start();
    }
  }

  /**
   * Perform a single poll
   */
  private async poll(): Promise<void> {
    try {
      const url = new URL(this.options.url, typeof window !== 'undefined' ? window.location.origin : '');
      url.searchParams.set('companyId', this.options.companyId);
      if (this.options.lastEventId) {
        url.searchParams.set('lastEventId', this.options.lastEventId);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle array of events or single event
      const events: PollingEvent[] = Array.isArray(data.events) ? data.events : data.event ? [data.event] : [];

      // Process events
      for (const event of events) {
        if (event.id && event.id !== this.options.lastEventId) {
          this.options.lastEventId = event.id;
          this.options.onEvent(event);
        }
      }

      // Reset error count on success
      this.errorCount = 0;
      this.currentInterval = this.options.pollInterval;

      // Schedule next poll
      this.scheduleNextPoll();
    } catch (error) {
      this.errorCount++;
      const err = error instanceof Error ? error : new Error('Unknown polling error');
      this.options.onError(err);

      // Exponential backoff on errors
      if (this.errorCount < this.MAX_ERRORS) {
        this.currentInterval = Math.min(
          this.currentInterval * this.BACKOFF_MULTIPLIER,
          this.options.pollInterval * 10 // Max 10x the base interval
        );
        this.scheduleNextPoll();
      } else {
        // Too many errors, stop polling
        console.error('[Polling] Too many errors, stopping');
        this.setState('error');
      }
    }
  }

  /**
   * Schedule the next poll
   */
  private scheduleNextPoll(): void {
    if (this.state !== 'polling') {
      return;
    }

    this.pollIntervalId = window.setTimeout(() => {
      this.poll();
    }, this.currentInterval);
  }

  /**
   * Update state and notify listeners
   */
  private setState(newState: PollingState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.options.onStateChange(newState);
    }
  }

  /**
   * Get current state
   */
  getState(): PollingState {
    return this.state;
  }

  /**
   * Get last event ID
   */
  getLastEventId(): string | null {
    return this.options.lastEventId;
  }

  /**
   * Update last event ID
   */
  setLastEventId(eventId: string): void {
    this.options.lastEventId = eventId;
  }
}

/**
 * Create a polling client instance
 */
export function createPollingClient(options: PollingClientOptions): PollingClient {
  return new PollingClient(options);
}
