/**
 * Benevity Connector
 * Pushes impact data to Benevity's CSR platform with HMAC signature authentication
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/Integrations Lead/Benevity Mapper
 */

import { request } from 'undici';
import { generateBenevitySignature } from '../lib/signature.js';
import { retryWithBackoff } from '../lib/retry.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('impact-in:benevity');

export interface BenevityConfig {
  apiUrl: string;
  apiKey: string;
  signatureSecret: string;
}

export interface ImpactEvent {
  eventId: string;
  companyId: string;
  userId: string;
  eventType: string; // 'volunteer_hours', 'donation', 'course_completion', etc.
  timestamp: string;
  value: number;
  unit: string; // 'hours', 'USD', 'courses', etc.
  metadata?: Record<string, any>;
}

export interface BenevityDeliveryResult {
  success: boolean;
  deliveryId: string;
  providerResponse?: any;
  error?: string;
  attemptCount: number;
}

/**
 * Map internal impact events to Benevity's schema v1.0
 */
function mapToBenevitySchema(event: ImpactEvent): Record<string, any> {
  return {
    schema_version: 'v1.0',
    event: {
      id: event.eventId,
      type: event.eventType,
      timestamp: event.timestamp,
      user: {
        external_id: event.userId,
        company_id: event.companyId,
      },
      impact: {
        value: event.value,
        unit: event.unit,
        metadata: event.metadata || {},
      },
    },
  };
}

/**
 * Benevity Connector Class
 */
export class BenevityConnector {
  private config: BenevityConfig;

  constructor(config: BenevityConfig) {
    this.config = config;
  }

  /**
   * Deliver impact event to Benevity
   */
  async deliver(event: ImpactEvent, deliveryId: string): Promise<BenevityDeliveryResult> {
    logger.info('Delivering to Benevity', { eventId: event.eventId, deliveryId });

    let attemptCount = 0;

    try {
      const result = await retryWithBackoff(
        async () => {
          attemptCount++;
          return await this.sendToBenevity(event, deliveryId);
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 10000,
        },
        (context) => {
          logger.warn('Retrying Benevity delivery', {
            attempt: context.attempt,
            error: context.lastError?.message,
          });
        }
      );

      return {
        success: true,
        deliveryId,
        providerResponse: result,
        attemptCount,
      };
    } catch (error: any) {
      logger.error('Benevity delivery failed', {
        eventId: event.eventId,
        deliveryId,
        error: error.message,
        attemptCount,
      });

      return {
        success: false,
        deliveryId,
        error: error.message,
        attemptCount,
      };
    }
  }

  /**
   * Send event to Benevity API with signature
   */
  private async sendToBenevity(event: ImpactEvent, deliveryId: string): Promise<any> {
    const payload = mapToBenevitySchema(event);

    // Generate HMAC-SHA256 signature
    const signature = generateBenevitySignature(payload, this.config.signatureSecret);

    const url = `${this.config.apiUrl}/api/v1/impact-events`;

    logger.debug('Sending to Benevity', { url, deliveryId });

    const response = await request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
        'X-Benevity-Signature': signature,
        'X-Idempotency-Key': deliveryId,
      },
      body: JSON.stringify(payload),
    });

    const statusCode = response.statusCode;
    const body = await response.body.json();

    if (statusCode >= 200 && statusCode < 300) {
      logger.info('Benevity delivery successful', { deliveryId, statusCode });
      return body;
    }

    // Handle errors
    const errorMessage = body.error || body.message || 'Unknown error';
    logger.error('Benevity API error', { deliveryId, statusCode, error: errorMessage });

    const error: any = new Error(`Benevity API error: ${errorMessage}`);
    error.statusCode = statusCode;
    error.response = body;

    throw error;
  }

  /**
   * Validate configuration
   */
  static validateConfig(config: Partial<BenevityConfig>): BenevityConfig {
    if (!config.apiUrl) {
      throw new Error('Benevity API URL is required');
    }
    if (!config.apiKey) {
      throw new Error('Benevity API key is required');
    }
    if (!config.signatureSecret) {
      throw new Error('Benevity signature secret is required');
    }

    return config as BenevityConfig;
  }

  /**
   * Test connection to Benevity API
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${this.config.apiUrl}/api/v1/health`;

      const response = await request(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.config.apiKey,
        },
      });

      const statusCode = response.statusCode;

      if (statusCode >= 200 && statusCode < 300) {
        logger.info('Benevity connection test successful');
        return { success: true };
      }

      return { success: false, error: `HTTP ${statusCode}` };
    } catch (error: any) {
      logger.error('Benevity connection test failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }
}

/**
 * Create Benevity connector from environment variables
 */
export function createBenevityConnector(): BenevityConnector {
  const config = BenevityConnector.validateConfig({
    apiUrl: process.env.BENEVITY_API_URL,
    apiKey: process.env.BENEVITY_API_KEY,
    signatureSecret: process.env.BENEVITY_SIGNATURE_SECRET,
  });

  return new BenevityConnector(config);
}
