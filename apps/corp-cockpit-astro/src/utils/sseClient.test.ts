/**
 * SSE Client Tests
 *
 * Tests for SSE client with exponential backoff and resume support
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SSEClient, PollingFallback, type ConnectionState } from './sseClient';

// Mock EventSource
class MockEventSource {
  public url: string;
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = 0;
  private listeners: Map<string, ((event: MessageEvent) => void)[]> = new Map();

  constructor(url: string) {
    this.url = url;
    this.readyState = 0; // CONNECTING
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  close(): void {
    this.readyState = 2; // CLOSED
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = 1; // OPEN
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: string, eventType: string = 'message', lastEventId: string = ''): void {
    const event = new MessageEvent(eventType, {
      data,
      lastEventId,
    });
    if (this.onmessage) {
      this.onmessage(event);
    }
    // Trigger custom event listeners
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Replace global EventSource
(global as any).EventSource = MockEventSource;

describe('SSEClient', () => {
  let client: SSEClient;
  let mockEventSource: MockEventSource;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Intercept EventSource creation
    const OriginalEventSource = (global as any).EventSource;
    (global as any).EventSource = vi.fn((url: string) => {
      mockEventSource = new OriginalEventSource(url);
      return mockEventSource;
    });
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
    vi.useRealTimers();
  });

  describe('Connection Management', () => {
    it('should connect to SSE endpoint', () => {
      const onConnectionChange = vi.fn();

      client = new SSEClient({
        companyId: 'test-company',
        channel: 'dashboard-updates',
        onConnectionChange,
      });

      client.connect();

      expect(onConnectionChange).toHaveBeenCalledWith('connecting');
      expect(mockEventSource).toBeDefined();
      expect(mockEventSource.url).toContain('companyId=test-company');
      expect(mockEventSource.url).toContain('channel=dashboard-updates');
    });

    it('should transition to connected state on open', () => {
      const onConnectionChange = vi.fn();

      client = new SSEClient({
        companyId: 'test-company',
        channel: 'dashboard-updates',
        onConnectionChange,
      });

      client.connect();
      mockEventSource.simulateOpen();

      expect(onConnectionChange).toHaveBeenCalledWith('connected');
      expect(client.getState()).toBe('connected');
    });

    it('should disconnect properly', () => {
      const onConnectionChange = vi.fn();

      client = new SSEClient({
        companyId: 'test-company',
        channel: 'dashboard-updates',
        onConnectionChange,
      });

      client.connect();
      mockEventSource.simulateOpen();
      client.disconnect();

      expect(onConnectionChange).toHaveBeenCalledWith('disconnected');
      expect(client.getState()).toBe('disconnected');
      expect(mockEventSource.readyState).toBe(2); // CLOSED
    });

    it('should not reconnect after manual disconnect', () => {
      const onConnectionChange = vi.fn();

      client = new SSEClient({
        companyId: 'test-company',
        channel: 'dashboard-updates',
        onConnectionChange,
      });

      client.connect();
      mockEventSource.simulateOpen();
      client.disconnect();

      // Simulate error after disconnect
      mockEventSource.simulateError();

      // Should not attempt reconnect
      expect(onConnectionChange).not.toHaveBeenCalledWith('reconnecting');
    });
  });

  describe('Message Handling', () => {
    it('should receive and parse messages', () => {
      const onMessage = vi.fn();

      client = new SSEClient({
        companyId: 'test-company',
        channel: 'dashboard-updates',
        onMessage,
      });

      client.connect();
      mockEventSource.simulateOpen();

      const testData = { metric: 'SROI', value: 2.5 };
      mockEventSource.simulateMessage(
        JSON.stringify(testData),
        'dashboard-update',
        'event-123'
      );

      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'event-123',
          type: 'dashboard-update',
          data: testData,
        })
      );
    });

    it('should store last event ID', () => {
      const onMessage = vi.fn();

      client = new SSEClient({
        companyId: 'test-company',
        channel: 'dashboard-updates',
        onMessage,
      });

      client.connect();
      mockEventSource.simulateOpen();

      mockEventSource.simulateMessage(
        JSON.stringify({ test: 'data' }),
        'message',
        'event-456'
      );

      expect(client.getLastEventId()).toBe('event-456');
    });

    it('should handle invalid JSON gracefully', () => {
      const onMessage = vi.fn();
      const onError = vi.fn();

      client = new SSEClient({
        companyId: 'test-company',
        channel: 'dashboard-updates',
        onMessage,
        onError,
      });

      client.connect();
      mockEventSource.simulateOpen();

      mockEventSource.simulateMessage('invalid json', 'message');

      expect(onMessage).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'PARSE_ERROR',
          retryable: false,
        })
      );
    });
  });

  describe('Exponential Backoff', () => {
    it('should retry with exponential backoff on error', () => {
      const onConnectionChange = vi.fn();

      client = new SSEClient({
        companyId: 'test-company',
        channel: 'dashboard-updates',
        initialRetryDelay: 1000,
        maxRetries: 3,
        onConnectionChange,
      });

      client.connect();
      mockEventSource.simulateError();

      expect(onConnectionChange).toHaveBeenCalledWith('reconnecting');

      // First retry after 1000ms
      vi.advanceTimersByTime(1000);
      expect((global as any).EventSource).toHaveBeenCalledTimes(2);

      // Simulate error again
      mockEventSource.simulateError();

      // Second retry after 2000ms (exponential backoff)
      vi.advanceTimersByTime(2000);
      expect((global as any).EventSource).toHaveBeenCalledTimes(3);
    });

    it('should respect max retry delay', () => {
      const onConnectionChange = vi.fn();

      client = new SSEClient({
        companyId: 'test-company',
        channel: 'dashboard-updates',
        initialRetryDelay: 1000,
        maxRetryDelay: 5000,
        maxRetries: 10,
        onConnectionChange,
      });

      client.connect();

      // Simulate multiple errors
      for (let i = 0; i < 5; i++) {
        mockEventSource.simulateError();
        vi.runAllTimers(); // Fast-forward all timers
      }

      // Should not exceed maxRetryDelay
      expect(onConnectionChange).toHaveBeenCalledWith('reconnecting');
    });

    it('should fail after max retries', () => {
      const onConnectionChange = vi.fn();
      const onError = vi.fn();

      client = new SSEClient({
        companyId: 'test-company',
        channel: 'dashboard-updates',
        initialRetryDelay: 100,
        maxRetries: 2,
        onConnectionChange,
        onError,
      });

      client.connect();

      // Exceed max retries
      for (let i = 0; i < 3; i++) {
        mockEventSource.simulateError();
        vi.runAllTimers();
      }

      expect(onConnectionChange).toHaveBeenCalledWith('failed');
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MAX_RETRIES_EXCEEDED',
          retryable: false,
        })
      );
    });

    it('should reset retry count on successful connection', () => {
      const onConnectionChange = vi.fn();

      client = new SSEClient({
        companyId: 'test-company',
        channel: 'dashboard-updates',
        initialRetryDelay: 1000,
        maxRetries: 3,
        onConnectionChange,
      });

      client.connect();
      mockEventSource.simulateError();

      // First retry
      vi.advanceTimersByTime(1000);

      // Successful connection
      mockEventSource.simulateOpen();

      // Error again
      mockEventSource.simulateError();

      // Should start from initial delay again
      vi.advanceTimersByTime(1000);
      expect((global as any).EventSource).toHaveBeenCalledTimes(3);
    });
  });

  describe('Resume Support', () => {
    it('should include last event ID in URL on reconnect', () => {
      const onMessage = vi.fn();

      client = new SSEClient({
        companyId: 'test-company',
        channel: 'dashboard-updates',
        onMessage,
      });

      client.connect();
      mockEventSource.simulateOpen();

      // Receive event
      mockEventSource.simulateMessage(
        JSON.stringify({ test: 'data' }),
        'message',
        'event-123'
      );

      // Disconnect and reconnect
      mockEventSource.simulateError();
      vi.advanceTimersByTime(1000);

      // Check URL includes lastEventId
      expect(mockEventSource.url).toContain('lastEventId=event-123');
    });
  });
});

describe('PollingFallback', () => {
  let fallback: PollingFallback;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    if (fallback) {
      fallback.stop();
    }
    vi.useRealTimers();
  });

  it('should poll at specified interval', async () => {
    const onMessage = vi.fn();

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });

    fallback = new PollingFallback({
      companyId: 'test-company',
      channel: 'dashboard-updates',
      pollInterval: 5000,
      onMessage,
      onError: vi.fn(),
    });

    fallback.start();

    // First poll
    vi.advanceTimersByTime(5000);
    await vi.runAllTimersAsync();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'poll',
        data: { data: 'test' },
      })
    );

    // Second poll
    vi.advanceTimersByTime(5000);
    await vi.runAllTimersAsync();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle poll errors gracefully', async () => {
    const onError = vi.fn();

    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    fallback = new PollingFallback({
      companyId: 'test-company',
      channel: 'dashboard-updates',
      pollInterval: 5000,
      onMessage: vi.fn(),
      onError,
    });

    fallback.start();

    vi.advanceTimersByTime(5000);
    await vi.runAllTimersAsync();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'POLL_ERROR',
        retryable: true,
      })
    );
  });

  it('should stop polling when stop() is called', () => {
    fallback = new PollingFallback({
      companyId: 'test-company',
      channel: 'dashboard-updates',
      pollInterval: 5000,
      onMessage: vi.fn(),
      onError: vi.fn(),
    });

    fallback.start();
    fallback.stop();

    vi.advanceTimersByTime(10000);

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
