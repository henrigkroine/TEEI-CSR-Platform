/**
 * CSR Platform API Client for E2E Tests
 *
 * Provides typed interface to CSR Platform API
 * Used for assertions, event verification, and data validation
 */

export interface EventEnvelope {
  type: string;
  data: any;
  metadata: {
    id: string;
    version: string;
    timestamp: string;
    correlationId: string;
    causationId?: string;
  };
}

export class CSRPlatformAPI {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = process.env.API_GATEWAY_URL || 'http://localhost:3017') {
    this.baseUrl = baseUrl;
  }

  /**
   * Authenticate with CSR Platform
   */
  async authenticate(email: string, password: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.authToken = data.token || data.accessToken;
  }

  /**
   * Get unified profile by user ID
   */
  async getUnifiedProfile(userId: string): Promise<any> {
    const response = await this.request(`/v1/profiles/${userId}`);
    return response.json();
  }

  /**
   * Wait for specific event to be published
   */
  async waitForEvent(
    eventType: string,
    criteria: Record<string, any>,
    options: { timeout?: number; pollInterval?: number } = {}
  ): Promise<EventEnvelope> {
    const timeout = options.timeout || 10000;
    const pollInterval = options.pollInterval || 500;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const events = await this.getEventsByType(eventType, { limit: 100 });

      const matchingEvent = events.find((event: EventEnvelope) => {
        return Object.entries(criteria).every(([key, value]) => {
          return event.data[key] === value;
        });
      });

      if (matchingEvent) {
        return matchingEvent;
      }

      await this.sleep(pollInterval);
    }

    throw new Error(
      `Timeout waiting for event ${eventType} with criteria ${JSON.stringify(criteria)}`
    );
  }

  /**
   * Get events by type
   */
  async getEventsByType(
    eventType: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<EventEnvelope[]> {
    const params = new URLSearchParams({
      type: eventType,
      limit: (options.limit || 100).toString(),
      offset: (options.offset || 0).toString()
    });

    const response = await this.request(`/v1/events?${params}`);
    return response.json();
  }

  /**
   * Get all events for a user
   */
  async getEventsByUser(userId: string, options: { limit?: number } = {}): Promise<EventEnvelope[]> {
    const params = new URLSearchParams({
      userId,
      limit: (options.limit || 100).toString()
    });

    const response = await this.request(`/v1/events?${params}`);
    return response.json();
  }

  /**
   * Get recent events across all types
   */
  async getRecentEvents(options: { limit?: number } = {}): Promise<EventEnvelope[]> {
    const params = new URLSearchParams({
      limit: (options.limit || 100).toString(),
      sort: 'desc'
    });

    const response = await this.request(`/v1/events?${params}`);
    return response.json();
  }

  /**
   * Publish event directly (for testing)
   */
  async publishEvent(
    eventType: string,
    data: any,
    correlationId?: string
  ): Promise<EventEnvelope> {
    const response = await this.request('/v1/events', {
      method: 'POST',
      body: JSON.stringify({
        type: eventType,
        data,
        correlationId
      })
    });

    return response.json();
  }

  /**
   * Get analytics metrics
   */
  async getMetrics(options: {
    startDate?: string;
    endDate?: string;
    metricTypes?: string[];
  } = {}): Promise<any> {
    const params = new URLSearchParams();

    if (options.startDate) params.set('startDate', options.startDate);
    if (options.endDate) params.set('endDate', options.endDate);
    if (options.metricTypes) {
      options.metricTypes.forEach(type => params.append('metricType', type));
    }

    const response = await this.request(`/v1/analytics/metrics?${params}`);
    return response.json();
  }

  /**
   * Calculate SROI for a user or organization
   */
  async calculateSROI(options: {
    userId?: string;
    organizationId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    const response = await this.request('/v1/analytics/sroi', {
      method: 'POST',
      body: JSON.stringify(options)
    });

    return response.json();
  }

  /**
   * Disable webhook endpoint (for resilience testing)
   */
  async disableWebhookEndpoint(): Promise<void> {
    await this.request('/v1/admin/webhooks/disable', {
      method: 'POST'
    });
  }

  /**
   * Enable webhook endpoint (for resilience testing)
   */
  async enableWebhookEndpoint(): Promise<void> {
    await this.request('/v1/admin/webhooks/enable', {
      method: 'POST'
    });
  }

  /**
   * Wait for metric to update
   */
  async waitForMetricUpdate(
    metricType: string,
    expectedValue: number,
    options: { timeout?: number; pollInterval?: number } = {}
  ): Promise<void> {
    const timeout = options.timeout || 10000;
    const pollInterval = options.pollInterval || 500;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const metrics = await this.getMetrics({ metricTypes: [metricType] });
      const metric = metrics.find((m: any) => m.type === metricType);

      if (metric && metric.value >= expectedValue) {
        return;
      }

      await this.sleep(pollInterval);
    }

    throw new Error(
      `Timeout waiting for metric ${metricType} to reach ${expectedValue}`
    );
  }

  /**
   * Check health endpoint
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Make authenticated request
   */
  private async request(path: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request failed (${response.status}): ${errorText}`);
    }

    return response;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
