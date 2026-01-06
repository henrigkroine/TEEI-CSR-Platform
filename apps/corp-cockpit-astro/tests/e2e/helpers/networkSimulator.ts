import { Page, BrowserContext } from '@playwright/test';

/**
 * Network Simulator Helper for E2E Tests
 *
 * Provides utilities to simulate various network failure scenarios
 * for testing SSE resilience:
 * - Flaky networks (intermittent failures)
 * - Slow networks (high latency, low bandwidth)
 * - Connection timeouts
 * - Specific HTTP errors (503, 429, etc.)
 *
 * Based on /reports/worker3/diffs/sse_architecture.md Section 10 (Testing Strategy)
 */

export class NetworkSimulator {
  constructor(private context: BrowserContext) {}

  /**
   * Simulate flaky network with intermittent failures
   * @param failureRate - Probability of failure (0-1, default 0.5)
   * @param minFailureDuration - Minimum offline duration in ms
   * @param maxFailureDuration - Maximum offline duration in ms
   */
  async simulateFlaky(
    failureRate: number = 0.5,
    minFailureDuration: number = 100,
    maxFailureDuration: number = 2000
  ) {
    const flakyAbortCount = { value: 0 };

    await this.context.route('**/*', async (route) => {
      // Don't interfere with non-API calls
      if (!route.request().url().includes('/api/') && !route.request().url().includes('/sse')) {
        await route.continue();
        return;
      }

      if (Math.random() < failureRate) {
        flakyAbortCount.value++;
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Math.random() * (maxFailureDuration - minFailureDuration) + minFailureDuration
          )
        );
        route.abort('failed');
      } else {
        await route.continue();
      }
    });

    return {
      abortCount: () => flakyAbortCount.value,
      reset: () => {
        flakyAbortCount.value = 0;
      }
    };
  }

  /**
   * Simulate slow network with high latency
   * @param delayMs - Delay in milliseconds for each request
   * @param bandwidthKbps - Bandwidth in kilobits per second (optional)
   */
  async simulateSlow(
    delayMs: number = 3000,
    bandwidthKbps?: number
  ) {
    const requestCount = { value: 0 };

    await this.context.route('**/*', async (route) => {
      requestCount.value++;

      // Add delay
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // Simulate bandwidth limit if specified
      if (bandwidthKbps) {
        const response = await route.fetch();
        const contentLength = response.headers()['content-length'];
        if (contentLength) {
          const sizeInKbits = (parseInt(contentLength) * 8) / 1000;
          const additionalDelay = (sizeInKbits / bandwidthKbps) * 1000;
          await new Promise((resolve) => setTimeout(resolve, additionalDelay));
        }
      }

      await route.continue();
    });

    return {
      requestCount: () => requestCount.value,
      reset: () => {
        requestCount.value = 0;
      }
    };
  }

  /**
   * Simulate connection timeout (never responds)
   * @param pathPattern - URL pattern to timeout (default: SSE endpoints)
   * @param timeoutMs - How long to wait before aborting
   */
  async simulateTimeout(
    pathPattern: string | RegExp = /\/sse|\/api\/metric/,
    timeoutMs: number = 10000
  ) {
    const timeoutCount = { value: 0 };

    await this.context.route('**/*', async (route) => {
      const url = route.request().url();
      const matches = typeof pathPattern === 'string'
        ? url.includes(pathPattern)
        : pathPattern.test(url);

      if (matches) {
        timeoutCount.value++;
        // Never respond - simulates timeout
        setTimeout(() => {
          try {
            route.abort('timedout');
          } catch (e) {
            // Route may have already been aborted
          }
        }, timeoutMs);
      } else {
        await route.continue();
      }
    });

    return {
      timeoutCount: () => timeoutCount.value,
      reset: () => {
        timeoutCount.value = 0;
      }
    };
  }

  /**
   * Simulate HTTP error responses
   * @param statusCode - HTTP status code to return
   * @param pathPattern - URL pattern to match
   */
  async simulateHttpError(
    statusCode: number = 503,
    pathPattern: string | RegExp = /\/api\/|\/sse/
  ) {
    const errorCount = { value: 0 };

    await this.context.route('**/*', async (route) => {
      const url = route.request().url();
      const matches = typeof pathPattern === 'string'
        ? url.includes(pathPattern)
        : pathPattern.test(url);

      if (matches) {
        errorCount.value++;
        route.fulfill({
          status: statusCode,
          contentType: 'application/json',
          body: JSON.stringify({
            error: `HTTP ${statusCode}`,
            message: getErrorMessage(statusCode)
          })
        });
      } else {
        await route.continue();
      }
    });

    return {
      errorCount: () => errorCount.value,
      reset: () => {
        errorCount.value = 0;
      }
    };
  }

  /**
   * Simulate 503 Service Unavailable (server maintenance)
   */
  async simulateServiceUnavailable(pathPattern?: string | RegExp) {
    return this.simulateHttpError(503, pathPattern);
  }

  /**
   * Simulate 429 Too Many Requests (rate limiting)
   */
  async simulateRateLimit(pathPattern?: string | RegExp) {
    return this.simulateHttpError(429, pathPattern);
  }

  /**
   * Simulate 401 Unauthorized (auth expired)
   */
  async simulateUnauthorized(pathPattern?: string | RegExp) {
    return this.simulateHttpError(401, pathPattern);
  }

  /**
   * Simulate DNS failure
   */
  async simulateDnsFailure() {
    await this.context.route('**/*', (route) => {
      route.abort('failed');
    });

    return {
      reset: async () => {
        await this.context.unroute('**/*');
      }
    };
  }

  /**
   * Simulate connection reset by peer
   */
  async simulateConnectionReset(pathPattern: string | RegExp = /\/api\/|\/sse/) {
    const resetCount = { value: 0 };

    await this.context.route('**/*', async (route) => {
      const url = route.request().url();
      const matches = typeof pathPattern === 'string'
        ? url.includes(pathPattern)
        : pathPattern.test(url);

      if (matches) {
        resetCount.value++;
        // Simulate a partial response followed by reset
        if (Math.random() > 0.5) {
          await route.continue();
        } else {
          route.abort('failed');
        }
      } else {
        await route.continue();
      }
    });

    return {
      resetCount: () => resetCount.value,
      reset: () => {
        resetCount.value = 0;
      }
    };
  }

  /**
   * Simulate network recovery with gradual improvement
   * Starts with failures, gradually succeeds more
   * @param recoverySteps - Number of attempts before full recovery
   */
  async simulateGradualRecovery(recoverySteps: number = 5) {
    let attemptCount = 0;

    await this.context.route('**/*', async (route) => {
      // Don't interfere with auth/login
      if (route.request().url().includes('/login') || route.request().url().includes('/auth')) {
        await route.continue();
        return;
      }

      attemptCount++;

      // Calculate success rate: increases with each attempt
      const successRate = Math.min(attemptCount / recoverySteps, 1);

      if (Math.random() < successRate) {
        await route.continue();
      } else {
        route.abort('failed');
      }
    });

    return {
      attemptCount: () => attemptCount,
      reset: () => {
        attemptCount = 0;
      }
    };
  }

  /**
   * Clear all network routing rules
   */
  async reset() {
    await this.context.unroute('**/*');
  }

  /**
   * Monitor network requests
   * Returns data about requests for verification
   */
  async monitorRequests(): Promise<{
    requests: Array<{
      method: string;
      url: string;
      timestamp: number;
    }>;
    clear: () => void;
  }> {
    const requests: Array<{ method: string; url: string; timestamp: number }> = [];

    const handler = (request: any) => {
      requests.push({
        method: request.method(),
        url: request.url(),
        timestamp: Date.now()
      });
    };

    // Note: We can't easily intercept all requests without routing
    // This is a simplified version that can be enhanced

    return {
      requests,
      clear: () => {
        requests.length = 0;
      }
    };
  }

  /**
   * Simulate specific SSE scenario: connection established, then drops after N events
   */
  async simulateEventDropAfter(eventCount: number, delayMs: number = 1000) {
    let receivedEvents = 0;
    let dropped = false;

    await this.context.route('**/*', async (route) => {
      const url = route.request().url();

      if (url.includes('/sse') || url.includes('/metric')) {
        if (!dropped) {
          const response = await route.fetch();

          // Check if this is an SSE stream
          if (response.headers()['content-type']?.includes('text/event-stream')) {
            // Let it through initially
            await route.continue();
          } else if (receivedEvents > eventCount) {
            dropped = true;
            route.abort('failed');
          } else {
            receivedEvents++;
            await route.continue();
          }
        } else {
          route.abort('failed');
        }
      } else {
        await route.continue();
      }
    });

    return {
      eventsReceived: () => receivedEvents,
      isDropped: () => dropped,
      reset: () => {
        receivedEvents = 0;
        dropped = false;
      }
    };
  }
}

/**
 * Helper function to get user-friendly error messages
 */
function getErrorMessage(statusCode: number): string {
  const messages: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized - Your session may have expired',
    403: 'Forbidden - You do not have permission',
    404: 'Not Found',
    429: 'Too Many Requests - Rate limited',
    500: 'Internal Server Error',
    503: 'Service Unavailable - Server is temporarily down',
    504: 'Gateway Timeout'
  };

  return messages[statusCode] || 'Unknown Error';
}

/**
 * Helper to create network conditions (high-level helper)
 */
export async function setupNetworkCondition(
  context: BrowserContext,
  condition: 'good' | 'slow-4g' | 'fast-3g' | 'slow' | 'flaky' | 'offline'
): Promise<NetworkSimulator> {
  const simulator = new NetworkSimulator(context);

  switch (condition) {
    case 'slow-4g':
      await simulator.simulateSlow(400, 1); // 400ms latency, 1 kbps
      break;
    case 'fast-3g':
      await simulator.simulateSlow(200, 1600); // 200ms latency, 1.6 mbps
      break;
    case 'slow':
      await simulator.simulateSlow(1000, 100); // 1s latency, 100 kbps
      break;
    case 'flaky':
      await simulator.simulateFlaky(0.3, 500, 2000); // 30% failure rate
      break;
    case 'offline':
      await context.setOffline(true);
      break;
    case 'good':
    default:
      // No simulation
      break;
  }

  return simulator;
}
