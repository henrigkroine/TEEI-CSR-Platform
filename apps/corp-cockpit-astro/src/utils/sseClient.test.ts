/**
 * SSE Client Tests
 *
 * Comprehensive tests for SSE client with:
 * - 6-state FSM (disconnected, connecting, connected, reconnecting, error, failed)
 * - Exponential backoff with jitter (2s → 32s, max 10 retries)
 * - Last-Event-ID resume support
 * - localStorage persistence
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SSEClient, type ConnectionState } from './sseClient';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
(global as any).localStorage = localStorageMock;

// Mock EventSource
class MockEventSource {
  public url: string;
  public static CONNECTING = 0;
  public static OPEN = 1;
  public static CLOSED = 2;
  public readyState: number = MockEventSource.CONNECTING;
  private listeners: Map<string, Set<(event: any) => void>> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(type: string, listener: (event: any) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  close(): void {
    this.readyState = MockEventSource.CLOSED;
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = MockEventSource.OPEN;
    const event = new Event('open');
    this.listeners.get('open')?.forEach(fn => fn(event));
  }

  simulateMessage(data: string, eventType: string = 'message', lastEventId: string = ''): void {
    const event = new MessageEvent(eventType, { data, lastEventId });
    this.listeners.get(eventType)?.forEach(fn => fn(event));
  }

  simulateError(): void {
    this.readyState = MockEventSource.CLOSED;
    const event = new Event('error');
    this.listeners.get('error')?.forEach(fn => fn(event));
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
    localStorageMock.clear();

    // Intercept EventSource creation
    const OriginalMockEventSource = MockEventSource;
    (global as any).EventSource = vi.fn((url: string) => {
      mockEventSource = new OriginalMockEventSource(url);
      return mockEventSource;
    });
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
    vi.useRealTimers();
    localStorageMock.clear();
  });

  describe('State Machine (6 states)', () => {
    it('should start in disconnected state', () => {
      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
      });

      expect(client.getConnectionState()).toBe('disconnected');
    });

    it('should transition disconnected → connecting → connected', () => {
      const onStateChange = vi.fn();

      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
        onStateChange,
      });

      client.connect();
      expect(client.getConnectionState()).toBe('connecting');
      expect(onStateChange).toHaveBeenCalledWith('connecting', 'disconnected');

      mockEventSource.simulateOpen();
      expect(client.getConnectionState()).toBe('connected');
      expect(onStateChange).toHaveBeenCalledWith('connected', 'connecting');
    });

    it('should transition connected → error → reconnecting on connection loss', () => {
      const onStateChange = vi.fn();

      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
        onStateChange,
      });

      client.connect();
      mockEventSource.simulateOpen();
      expect(client.getConnectionState()).toBe('connected');

      mockEventSource.simulateError();
      expect(client.getConnectionState()).toBe('reconnecting');
      expect(onStateChange).toHaveBeenCalledWith('error', 'connected');
      expect(onStateChange).toHaveBeenCalledWith('reconnecting', 'error');
    });

    it('should transition to failed after max retries', () => {
      const onStateChange = vi.fn();
      const onError = vi.fn();

      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
        maxReconnectAttempts: 2,
        baseDelay: 100,
        onStateChange,
        onError,
      });

      client.connect();
      mockEventSource.simulateError();

      // Retry 1
      vi.advanceTimersByTime(200);
      mockEventSource.simulateError();

      // Retry 2
      vi.advanceTimersByTime(400);
      mockEventSource.simulateError();

      // Should fail after 2 retries
      expect(client.getConnectionState()).toBe('failed');
      expect(onStateChange).toHaveBeenCalledWith('failed', 'reconnecting');
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MAX_RETRIES_EXCEEDED',
          retryable: false,
        })
      );
    });

    it('should transition back to disconnected on manual disconnect', () => {
      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
      });

      client.connect();
      mockEventSource.simulateOpen();
      expect(client.getConnectionState()).toBe('connected');

      client.disconnect();
      expect(client.getConnectionState()).toBe('disconnected');
    });
  });

  describe('Message Handling', () => {
    it('should receive and parse messages', () => {
      const onEvent = vi.fn();

      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
        onEvent,
      });

      client.connect();
      mockEventSource.simulateOpen();

      const testData = { metric: 'SROI', value: 2.5 };
      mockEventSource.simulateMessage(
        JSON.stringify(testData),
        'metric_update',
        'evt-123'
      );

      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'evt-123',
          type: 'metric_update',
          data: testData,
          companyId: 'test-company',
        })
      );
    });

    it('should store and persist last event ID', () => {
      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
      });

      client.connect();
      mockEventSource.simulateOpen();

      mockEventSource.simulateMessage(
        JSON.stringify({ test: 'data' }),
        'message',
        'evt-456'
      );

      expect(client.getLastEventId()).toBe('evt-456');
      expect(localStorage.getItem('teei-sse-lastEventId-test-company')).toBe('evt-456');
    });

    it('should handle messages without lastEventId', () => {
      const onEvent = vi.fn();

      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
        onEvent,
      });

      client.connect();
      mockEventSource.simulateOpen();

      mockEventSource.simulateMessage(
        JSON.stringify({ test: 'data' }),
        'message'
      );

      expect(onEvent).toHaveBeenCalled();
      const eventId = onEvent.mock.calls[0][0].id;
      expect(eventId).toMatch(/^evt-\d+-[a-z0-9]+$/);
    });

    it('should handle invalid JSON gracefully', () => {
      const onEvent = vi.fn();

      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
        onEvent,
      });

      client.connect();
      mockEventSource.simulateOpen();

      mockEventSource.simulateMessage('invalid json', 'message');

      // Should not crash, just log error
      expect(onEvent).not.toHaveBeenCalled();
    });
  });

  describe('Exponential Backoff with Jitter', () => {
    it('should calculate correct backoff delays for all 10 attempts', () => {
      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
        baseDelay: 2000,
        maxDelay: 32000,
        maxReconnectAttempts: 10,
      });

      client.connect();

      // Test all 10 retry attempts
      for (let attempt = 0; attempt < 10; attempt++) {
        mockEventSource.simulateError();
        const retryAttempt = client.getRetryAttempt();
        expect(retryAttempt).toBe(attempt);

        // Calculate expected delay
        const expected = Math.min(2000 * Math.pow(2, attempt), 32000);

        // Fast-forward to next retry (add jitter buffer)
        vi.advanceTimersByTime(expected + 1000); // +1000ms for jitter
      }

      // After 10 attempts, should fail
      expect(client.getConnectionState()).toBe('failed');
    });

    it('should add jitter (0-1000ms) to backoff delays', () => {
      const delays: number[] = [];

      // Run multiple times to test jitter randomness
      for (let run = 0; run < 5; run++) {
        client = new SSEClient({
          url: '/api/sse',
          companyId: 'test-company',
          baseDelay: 2000,
          maxReconnectAttempts: 2,
        });

        client.connect();
        mockEventSource.simulateError();

        // Capture the delay by checking when reconnect happens
        let reconnected = false;
        for (let t = 2000; t <= 3000; t += 100) {
          vi.advanceTimersByTime(100);
          if ((global as any).EventSource.mock.calls.length > 1) {
            reconnected = true;
            delays.push(t);
            break;
          }
        }

        expect(reconnected).toBe(true);
        client.disconnect();
      }

      // Delays should vary (due to jitter)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });

    it('should cap delays at maxDelay (32s)', () => {
      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
        baseDelay: 2000,
        maxDelay: 32000,
        maxReconnectAttempts: 10,
      });

      client.connect();

      // Attempt 5: 2000 * 2^4 = 32000 (at cap)
      for (let i = 0; i < 5; i++) {
        mockEventSource.simulateError();
        vi.advanceTimersByTime(35000); // More than max + jitter
      }

      // Attempt 9: Should still be capped
      for (let i = 5; i < 9; i++) {
        mockEventSource.simulateError();
        vi.advanceTimersByTime(35000);
      }

      expect(client.getRetryAttempt()).toBe(9);
    });

    it('should reset retry counter on successful connection', () => {
      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
        baseDelay: 1000,
      });

      client.connect();
      mockEventSource.simulateError();
      expect(client.getRetryAttempt()).toBe(0);

      // Retry
      vi.advanceTimersByTime(2000);
      expect(client.getRetryAttempt()).toBe(1);

      // Successful connection
      mockEventSource.simulateOpen();
      expect(client.getRetryAttempt()).toBe(0);
    });

    it('should handle manual reconnect (resets retry counter)', () => {
      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
        baseDelay: 1000,
      });

      client.connect();
      mockEventSource.simulateError();
      vi.advanceTimersByTime(2000);
      expect(client.getRetryAttempt()).toBe(1);

      // Manual reconnect
      client.reconnect();
      expect(client.getRetryAttempt()).toBe(0);
      expect(client.getConnectionState()).toBe('connecting');
    });
  });

  describe('Last-Event-ID Resume', () => {
    it('should persist lastEventId to localStorage', () => {
      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
      });

      client.connect();
      mockEventSource.simulateOpen();

      mockEventSource.simulateMessage(
        JSON.stringify({ test: 'data' }),
        'message',
        'evt-resume-123'
      );

      expect(localStorage.getItem('teei-sse-lastEventId-test-company')).toBe('evt-resume-123');
    });

    it('should restore lastEventId from localStorage on initialization', () => {
      localStorage.setItem('teei-sse-lastEventId-test-company', 'evt-stored-456');

      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
      });

      expect(client.getLastEventId()).toBe('evt-stored-456');
    });

    it('should include lastEventId in reconnect URL', () => {
      localStorage.setItem('teei-sse-lastEventId-test-company', 'evt-789');

      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
      });

      client.connect();
      mockEventSource.simulateOpen();

      // Simulate error and reconnect
      mockEventSource.simulateError();
      vi.advanceTimersByTime(3000);

      // Check URL includes lastEventId
      expect(mockEventSource.url).toContain('lastEventId=evt-789');
    });

    it('should update lastEventId on each new event', () => {
      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
      });

      client.connect();
      mockEventSource.simulateOpen();

      mockEventSource.simulateMessage(JSON.stringify({}), 'message', 'evt-1');
      expect(client.getLastEventId()).toBe('evt-1');

      mockEventSource.simulateMessage(JSON.stringify({}), 'message', 'evt-2');
      expect(client.getLastEventId()).toBe('evt-2');

      mockEventSource.simulateMessage(JSON.stringify({}), 'message', 'evt-3');
      expect(client.getLastEventId()).toBe('evt-3');
    });
  });

  describe('Connection Timeout', () => {
    it('should timeout after 5 seconds if no open event', () => {
      const onError = vi.fn();

      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
        onError,
      });

      client.connect();
      expect(client.getConnectionState()).toBe('connecting');

      // Advance 5 seconds without open event
      vi.advanceTimersByTime(5000);

      expect(client.getConnectionState()).toBe('reconnecting');
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'TIMEOUT',
          retryable: true,
        })
      );
    });

    it('should not timeout if connection opens within 5 seconds', () => {
      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
      });

      client.connect();
      expect(client.getConnectionState()).toBe('connecting');

      // Open within 5 seconds
      vi.advanceTimersByTime(3000);
      mockEventSource.simulateOpen();

      expect(client.getConnectionState()).toBe('connected');

      // Advance past 5 seconds total
      vi.advanceTimersByTime(5000);
      expect(client.getConnectionState()).toBe('connected'); // Still connected
    });
  });

  describe('Public API', () => {
    it('should expose getConnectionState()', () => {
      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
      });

      expect(client.getConnectionState()).toBe('disconnected');
      client.connect();
      expect(client.getConnectionState()).toBe('connecting');
    });

    it('should expose getLastEventId()', () => {
      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
      });

      expect(client.getLastEventId()).toBeNull();

      client.connect();
      mockEventSource.simulateOpen();
      mockEventSource.simulateMessage(JSON.stringify({}), 'message', 'evt-xyz');

      expect(client.getLastEventId()).toBe('evt-xyz');
    });

    it('should expose getRetryAttempt()', () => {
      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
      });

      expect(client.getRetryAttempt()).toBe(0);

      client.connect();
      mockEventSource.simulateError();
      expect(client.getRetryAttempt()).toBe(0); // Not incremented until retry

      vi.advanceTimersByTime(3000);
      expect(client.getRetryAttempt()).toBe(1);
    });

    it('should expose getMaxRetries()', () => {
      client = new SSEClient({
        url: '/api/sse',
        companyId: 'test-company',
        maxReconnectAttempts: 5,
      });

      expect(client.getMaxRetries()).toBe(5);
    });
  });
});
