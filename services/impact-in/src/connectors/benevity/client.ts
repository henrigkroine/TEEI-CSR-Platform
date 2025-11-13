import type { BenevityImpactPayload } from './mapper.js';

export interface BenevityConfig {
  apiKey: string;
  webhookUrl: string;
  mockMode?: boolean;
}

export interface BenevityResponse {
  success: boolean;
  transactionId?: string;
  message?: string;
  error?: string;
}

/**
 * Benevity API client with retry logic and exponential backoff
 */
export class BenevityClient {
  private config: BenevityConfig;
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second

  constructor(config: BenevityConfig) {
    this.config = config;
  }

  /**
   * Send impact data to Benevity API
   */
  async sendImpactData(payload: BenevityImpactPayload): Promise<BenevityResponse> {
    // Mock mode for testing
    if (this.config.mockMode) {
      return this.mockSendImpactData(payload);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'X-API-Version': '1.0',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Benevity API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        return {
          success: true,
          transactionId: data.transactionId || data.id,
          message: data.message || 'Impact data sent successfully',
        };
      } catch (error) {
        lastError = error as Error;

        // If this is not the last attempt, wait before retrying
        if (attempt < this.maxRetries - 1) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    return {
      success: false,
      error: lastError?.message || 'Unknown error occurred',
    };
  }

  /**
   * Mock implementation for testing
   */
  private async mockSendImpactData(payload: BenevityImpactPayload): Promise<BenevityResponse> {
    // Simulate network delay
    await this.sleep(100);

    // Validate payload has required fields
    if (!payload.organizationId || !payload.metrics || payload.metrics.length === 0) {
      return {
        success: false,
        error: 'Invalid payload: missing required fields',
      };
    }

    return {
      success: true,
      transactionId: `mock-txn-${Date.now()}`,
      message: 'Mock: Impact data sent successfully to Benevity',
    };
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck(): Promise<boolean> {
    if (this.config.mockMode) {
      return true;
    }

    try {
      // Attempt a simple request to verify connectivity
      // In production, this would be a dedicated health endpoint
      const response = await fetch(this.config.webhookUrl.replace(/\/api\/.*$/, '/health'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
