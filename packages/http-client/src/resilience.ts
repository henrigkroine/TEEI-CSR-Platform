/**
 * Resilience SDK for HTTP Calls
 *
 * Implements circuit breaker pattern, timeouts, retries, and bulkheads
 * for fault-tolerant inter-service communication.
 */

import { request, Dispatcher } from 'undici';
import pRetry, { AbortError } from 'p-retry';
import pino from 'pino';

const logger = pino({ name: 'resilience' });

/**
 * Circuit Breaker State
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, rejecting requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Resilience Configuration
 */
export interface ResilienceConfig {
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Retry delay factor (exponential backoff multiplier) */
  retryFactor: number;
  /** Circuit breaker failure threshold */
  failureThreshold: number;
  /** Circuit breaker success threshold (for half-open state) */
  successThreshold: number;
  /** Circuit breaker open duration in milliseconds */
  openDurationMs: number;
  /** Circuit breaker monitoring window in milliseconds */
  windowMs: number;
  /** Bulkhead max concurrent requests */
  maxConcurrentRequests: number;
  /** Enable detailed logging */
  verbose: boolean;
}

const DEFAULT_CONFIG: ResilienceConfig = {
  timeoutMs: 5000,
  maxRetries: 3,
  retryFactor: 2,
  failureThreshold: 5,
  successThreshold: 2,
  openDurationMs: 60000,
  windowMs: 60000,
  maxConcurrentRequests: 100,
  verbose: false,
};

/**
 * HTTP Request Options
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
}

/**
 * Circuit Breaker Statistics
 */
interface CircuitStats {
  failures: number;
  successes: number;
  lastFailureTime?: number;
  consecutiveSuccesses: number;
  state: CircuitState;
}

/**
 * Bulkhead Semaphore
 */
class Bulkhead {
  private current: number = 0;
  private max: number;
  private queue: Array<() => void> = [];

  constructor(max: number) {
    this.max = max;
  }

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return;
    }

    // Wait in queue
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.current--;

    const next = this.queue.shift();
    if (next) {
      this.current++;
      next();
    }
  }

  getStats() {
    return {
      current: this.current,
      max: this.max,
      queued: this.queue.length,
    };
  }
}

/**
 * Resilient HTTP Client
 */
export class ResilientHttpClient {
  private config: ResilienceConfig;
  private circuits: Map<string, CircuitStats> = new Map();
  private bulkheads: Map<string, Bulkhead> = new Map();

  constructor(config: Partial<ResilienceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Make a resilient HTTP request
   */
  async request<T = any>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const serviceKey = this.getServiceKey(url);

    // Check circuit breaker
    this.checkCircuit(serviceKey);

    // Acquire bulkhead permit
    const bulkhead = this.getBulkhead(serviceKey);
    await bulkhead.acquire();

    try {
      // Execute request with retry logic
      const result = await pRetry(
        async () => {
          return await this.executeRequest<T>(url, options);
        },
        {
          retries: this.config.maxRetries,
          factor: this.config.retryFactor,
          minTimeout: 1000,
          maxTimeout: 10000,
          onFailedAttempt: (error) => {
            if (this.config.verbose) {
              logger.warn(
                {
                  url,
                  attempt: error.attemptNumber,
                  retriesLeft: error.retriesLeft,
                },
                'Request failed, retrying'
              );
            }

            // Don't retry on client errors (4xx)
            if (error.message.includes('4')) {
              throw new AbortError(error.message);
            }
          },
        }
      );

      // Record success
      this.recordSuccess(serviceKey);

      return result;
    } catch (error) {
      // Record failure
      this.recordFailure(serviceKey);
      throw error;
    } finally {
      // Release bulkhead permit
      bulkhead.release();
    }
  }

  /**
   * Execute HTTP request with timeout
   */
  private async executeRequest<T>(
    url: string,
    options: RequestOptions
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      // Build request URL with query params
      const requestUrl = options.query
        ? `${url}?${new URLSearchParams(options.query)}`
        : url;

      // Prepare request options
      const requestOptions: Partial<Dispatcher.RequestOptions> = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      };

      // Add body for non-GET requests
      if (options.body && options.method !== 'GET') {
        requestOptions.body = JSON.stringify(options.body);
      }

      // Execute request
      const response = await request(requestUrl, requestOptions);

      clearTimeout(timeoutId);

      // Check response status
      if (response.statusCode >= 400) {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusCode >= 500 ? 'Server Error' : 'Client Error'}`);
      }

      // Parse response body
      const body = await response.body.text();
      return body ? JSON.parse(body) : (null as unknown as T);
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout
      if ((error as any).name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeoutMs}ms`);
      }

      throw error;
    }
  }

  /**
   * Check circuit breaker state
   */
  private checkCircuit(serviceKey: string): void {
    const circuit = this.getCircuit(serviceKey);

    if (circuit.state === CircuitState.OPEN) {
      const timeSinceLastFailure = Date.now() - (circuit.lastFailureTime || 0);

      if (timeSinceLastFailure >= this.config.openDurationMs) {
        // Transition to half-open
        circuit.state = CircuitState.HALF_OPEN;
        circuit.consecutiveSuccesses = 0;
        logger.info({ serviceKey }, 'Circuit breaker: OPEN → HALF_OPEN');
      } else {
        throw new Error(`Circuit breaker is OPEN for ${serviceKey}`);
      }
    }
  }

  /**
   * Record successful request
   */
  private recordSuccess(serviceKey: string): void {
    const circuit = this.getCircuit(serviceKey);
    circuit.successes++;

    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.consecutiveSuccesses++;

      if (circuit.consecutiveSuccesses >= this.config.successThreshold) {
        // Transition to closed
        circuit.state = CircuitState.CLOSED;
        circuit.failures = 0;
        circuit.consecutiveSuccesses = 0;
        logger.info({ serviceKey }, 'Circuit breaker: HALF_OPEN → CLOSED');
      }
    }

    // Reset window if needed
    this.maybeResetWindow(circuit);
  }

  /**
   * Record failed request
   */
  private recordFailure(serviceKey: string): void {
    const circuit = this.getCircuit(serviceKey);
    circuit.failures++;
    circuit.lastFailureTime = Date.now();

    if (circuit.state === CircuitState.HALF_OPEN) {
      // Transition back to open
      circuit.state = CircuitState.OPEN;
      logger.warn({ serviceKey }, 'Circuit breaker: HALF_OPEN → OPEN');
    } else if (circuit.failures >= this.config.failureThreshold) {
      // Transition to open
      circuit.state = CircuitState.OPEN;
      logger.error({ serviceKey, failures: circuit.failures }, 'Circuit breaker: CLOSED → OPEN');
    }

    this.maybeResetWindow(circuit);
  }

  /**
   * Reset circuit statistics window
   */
  private maybeResetWindow(circuit: CircuitStats): void {
    if (circuit.lastFailureTime) {
      const elapsed = Date.now() - circuit.lastFailureTime;
      if (elapsed >= this.config.windowMs) {
        circuit.failures = 0;
        circuit.successes = 0;
      }
    }
  }

  /**
   * Get or create circuit breaker for service
   */
  private getCircuit(serviceKey: string): CircuitStats {
    if (!this.circuits.has(serviceKey)) {
      this.circuits.set(serviceKey, {
        failures: 0,
        successes: 0,
        consecutiveSuccesses: 0,
        state: CircuitState.CLOSED,
      });
    }
    return this.circuits.get(serviceKey)!;
  }

  /**
   * Get or create bulkhead for service
   */
  private getBulkhead(serviceKey: string): Bulkhead {
    if (!this.bulkheads.has(serviceKey)) {
      this.bulkheads.set(serviceKey, new Bulkhead(this.config.maxConcurrentRequests));
    }
    return this.bulkheads.get(serviceKey)!;
  }

  /**
   * Extract service key from URL
   */
  private getServiceKey(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      return url.split('/')[0] || url;
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitStats(url?: string): Record<string, CircuitStats> | CircuitStats {
    if (url) {
      const serviceKey = this.getServiceKey(url);
      return this.getCircuit(serviceKey);
    }

    const stats: Record<string, CircuitStats> = {};
    this.circuits.forEach((circuit, key) => {
      stats[key] = circuit;
    });
    return stats;
  }

  /**
   * Get bulkhead statistics
   */
  getBulkheadStats(url?: string) {
    if (url) {
      const serviceKey = this.getServiceKey(url);
      return this.getBulkhead(serviceKey).getStats();
    }

    const stats: Record<string, any> = {};
    this.bulkheads.forEach((bulkhead, key) => {
      stats[key] = bulkhead.getStats();
    });
    return stats;
  }

  /**
   * Reset circuit breaker for a service
   */
  resetCircuit(url: string): void {
    const serviceKey = this.getServiceKey(url);
    this.circuits.delete(serviceKey);
    logger.info({ serviceKey }, 'Circuit breaker reset');
  }

  /**
   * Manually open circuit
   */
  openCircuit(url: string): void {
    const serviceKey = this.getServiceKey(url);
    const circuit = this.getCircuit(serviceKey);
    circuit.state = CircuitState.OPEN;
    circuit.lastFailureTime = Date.now();
    logger.warn({ serviceKey }, 'Circuit breaker manually opened');
  }

  /**
   * Manually close circuit
   */
  closeCircuit(url: string): void {
    const serviceKey = this.getServiceKey(url);
    const circuit = this.getCircuit(serviceKey);
    circuit.state = CircuitState.CLOSED;
    circuit.failures = 0;
    circuit.successes = 0;
    logger.info({ serviceKey }, 'Circuit breaker manually closed');
  }
}

/**
 * Convenience methods
 */
export class HttpClient extends ResilientHttpClient {
  async get<T = any>(url: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  async post<T = any>(url: string, body: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'POST', body });
  }

  async put<T = any>(url: string, body: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'PUT', body });
  }

  async delete<T = any>(url: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  async patch<T = any>(url: string, body: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'PATCH', body });
  }
}

/**
 * Create a default HTTP client instance
 */
export function createHttpClient(config: Partial<ResilienceConfig> = {}): HttpClient {
  return new HttpClient(config);
}
