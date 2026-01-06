import type { WorkdayPayload } from './mapper.js';

export interface WorkdayConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  apiUrl: string;
  mockMode?: boolean;
}

export interface WorkdayResponse {
  success: boolean;
  transactionId?: string;
  message?: string;
  error?: string;
  activitiesProcessed?: number;
  enrollmentsProcessed?: number;
}

export interface WorkdayAuthToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * Workday API client with OAuth 2.0 authentication and retry logic
 */
export class WorkdayClient {
  private config: WorkdayConfig;
  private authToken: WorkdayAuthToken | null = null;
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second

  constructor(config: WorkdayConfig) {
    this.config = config;
  }

  /**
   * Send volunteer and program data to Workday API
   */
  async sendVolunteerData(payload: WorkdayPayload): Promise<WorkdayResponse> {
    if (this.config.mockMode) {
      return this.mockSendVolunteerData(payload);
    }

    // Ensure we have a valid token
    await this.ensureValidToken();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.config.apiUrl}/volunteer-management/v1/activities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken?.accessToken}`,
            'X-Workday-Tenant': this.config.tenantId,
          },
          body: JSON.stringify(payload),
        });

        if (response.status === 401) {
          // Token expired, refresh and retry
          this.authToken = null;
          await this.ensureValidToken();
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Workday API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        return {
          success: true,
          transactionId: data.transactionId || data.id,
          message: data.message || 'Volunteer data sent successfully',
          activitiesProcessed: payload.volunteerActivities.length,
          enrollmentsProcessed: payload.programEnrollments.length,
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
   * Ensure we have a valid OAuth token
   */
  private async ensureValidToken(): Promise<void> {
    // Check if we have a token that's still valid
    if (this.authToken && Date.now() < this.authToken.expiresAt) {
      return;
    }

    // Fetch new token
    try {
      const response = await fetch(`${this.config.apiUrl}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          scope: 'volunteer_management',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to obtain OAuth token: ${response.status}`);
      }

      const data = await response.json();
      this.authToken = {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000) - 60000, // Subtract 1 minute for safety
      };
    } catch (error) {
      throw new Error(`OAuth authentication failed: ${(error as Error).message}`);
    }
  }

  /**
   * Mock implementation for testing
   */
  private async mockSendVolunteerData(payload: WorkdayPayload): Promise<WorkdayResponse> {
    // Simulate network delay
    await this.sleep(100);

    if (!payload.organizationId || !payload.volunteerActivities || payload.volunteerActivities.length === 0) {
      return {
        success: false,
        error: 'Invalid payload: missing required fields',
      };
    }

    return {
      success: true,
      transactionId: `mock-workday-${Date.now()}`,
      message: 'Mock: Volunteer data sent successfully to Workday',
      activitiesProcessed: payload.volunteerActivities.length,
      enrollmentsProcessed: payload.programEnrollments.length,
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
      // Test token acquisition
      await this.ensureValidToken();
      return this.authToken !== null;
    } catch {
      return false;
    }
  }
}
