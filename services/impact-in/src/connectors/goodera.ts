/**
 * Goodera Connector
 * Pushes impact data to Goodera's CSR platform with OAuth 2.0 authentication
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/Integrations Lead/Goodera Mapper
 */

import { request } from 'undici';
import { retryWithBackoff, parseRetryAfter } from '../lib/retry.js';
import { createServiceLogger } from '@teei/shared-utils';
import { db } from '@teei/shared-schema';
import { impactProviderTokens } from '@teei/shared-schema';
import { eq, and } from 'drizzle-orm';

const logger = createServiceLogger('impact-in:goodera');

export interface GooderaConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
}

export interface ImpactEvent {
  eventId: string;
  companyId: string;
  userId: string;
  eventType: string;
  timestamp: string;
  outcomeScores?: Record<string, number>;
  metadata?: Record<string, any>;
}

export interface GooderaDeliveryResult {
  success: boolean;
  deliveryId: string;
  providerResponse?: any;
  error?: string;
  attemptCount: number;
}

/**
 * Map internal outcome scores to Goodera's "impact dimensions" v2.1
 */
function mapToGooderaSchema(event: ImpactEvent): Record<string, any> {
  // Map outcome_scores to Goodera's impact dimensions
  const impactDimensions = event.outcomeScores
    ? Object.entries(event.outcomeScores).map(([dimension, score]) => ({
        dimension_name: dimension,
        score: score,
        scale: 'normalized_0_1',
      }))
    : [];

  return {
    schema_version: 'v2.1',
    event: {
      external_id: event.eventId,
      event_type: event.eventType,
      timestamp: event.timestamp,
      participant: {
        external_user_id: event.userId,
      },
      impact: {
        dimensions: impactDimensions,
        metadata: event.metadata || {},
      },
    },
  };
}

/**
 * Goodera Connector Class with OAuth 2.0
 */
export class GooderaConnector {
  private config: GooderaConfig;
  private companyId: string;
  private rateLimitRemaining: number = 100;
  private rateLimitReset: number = 0;

  constructor(config: GooderaConfig, companyId: string) {
    this.config = config;
    this.companyId = companyId;
  }

  /**
   * Deliver impact event to Goodera
   */
  async deliver(event: ImpactEvent, deliveryId: string): Promise<GooderaDeliveryResult> {
    logger.info('Delivering to Goodera', { eventId: event.eventId, deliveryId });

    let attemptCount = 0;

    try {
      // Get or refresh access token
      const accessToken = await this.getAccessToken();

      const result = await retryWithBackoff(
        async () => {
          attemptCount++;
          return await this.sendToGoodera(event, deliveryId, accessToken);
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 30000,
        },
        (context) => {
          logger.warn('Retrying Goodera delivery', {
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
      logger.error('Goodera delivery failed', {
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
   * Get or refresh OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token in database
    const tokenRecord = await db
      .select()
      .from(impactProviderTokens)
      .where(
        and(
          eq(impactProviderTokens.companyId, this.companyId),
          eq(impactProviderTokens.provider, 'goodera')
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    const now = new Date();

    // If token exists and is not expired, use it
    if (tokenRecord && tokenRecord.expiresAt > now) {
      logger.debug('Using cached Goodera access token');
      return tokenRecord.accessToken;
    }

    // Otherwise, refresh or obtain new token
    logger.info('Obtaining new Goodera access token');

    if (tokenRecord?.refreshToken) {
      return await this.refreshAccessToken(tokenRecord.refreshToken);
    } else {
      return await this.obtainAccessToken();
    }
  }

  /**
   * Obtain new access token using client credentials flow
   */
  private async obtainAccessToken(): Promise<string> {
    const response = await request(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }).toString(),
    });

    const statusCode = response.statusCode;
    const body: any = await response.body.json();

    if (statusCode !== 200) {
      throw new Error(`Failed to obtain Goodera access token: ${body.error || 'Unknown error'}`);
    }

    const { access_token, refresh_token, expires_in, token_type } = body;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Store token in database
    await db
      .insert(impactProviderTokens)
      .values({
        companyId: this.companyId,
        provider: 'goodera',
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenType: token_type || 'Bearer',
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [impactProviderTokens.companyId, impactProviderTokens.provider],
        set: {
          accessToken: access_token,
          refreshToken: refresh_token,
          tokenType: token_type || 'Bearer',
          expiresAt,
          updatedAt: new Date(),
        },
      });

    logger.info('Goodera access token obtained', { expiresAt });

    return access_token;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(refreshToken: string): Promise<string> {
    const response = await request(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }).toString(),
    });

    const statusCode = response.statusCode;
    const body: any = await response.body.json();

    if (statusCode !== 200) {
      logger.warn('Failed to refresh Goodera token, obtaining new one');
      return await this.obtainAccessToken();
    }

    const { access_token, refresh_token, expires_in, token_type } = body;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Update token in database
    await db
      .update(impactProviderTokens)
      .set({
        accessToken: access_token,
        refreshToken: refresh_token || refreshToken,
        tokenType: token_type || 'Bearer',
        expiresAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(impactProviderTokens.companyId, this.companyId),
          eq(impactProviderTokens.provider, 'goodera')
        )
      );

    logger.info('Goodera access token refreshed', { expiresAt });

    return access_token;
  }

  /**
   * Send event to Goodera API with OAuth token
   */
  private async sendToGoodera(
    event: ImpactEvent,
    deliveryId: string,
    accessToken: string
  ): Promise<any> {
    // Check rate limit
    if (this.rateLimitRemaining <= 0 && Date.now() < this.rateLimitReset) {
      const waitMs = this.rateLimitReset - Date.now();
      logger.warn('Rate limit reached, waiting', { waitMs });
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    const payload = mapToGooderaSchema(event);
    const url = `${this.config.apiUrl}/v2/events/impact`;

    logger.debug('Sending to Goodera', { url, deliveryId });

    const response = await request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Idempotency-Key': deliveryId,
      },
      body: JSON.stringify(payload),
    });

    const statusCode = response.statusCode;
    const body = await response.body.json();

    // Update rate limit tracking
    const headers = response.headers;
    if (headers['x-ratelimit-remaining']) {
      this.rateLimitRemaining = parseInt(headers['x-ratelimit-remaining'] as string, 10);
    }
    if (headers['x-ratelimit-reset']) {
      this.rateLimitReset = parseInt(headers['x-ratelimit-reset'] as string, 10) * 1000;
    }

    if (statusCode >= 200 && statusCode < 300) {
      logger.info('Goodera delivery successful', { deliveryId, statusCode });
      return body;
    }

    // Handle errors
    const errorMessage = body.error || body.message || 'Unknown error';
    logger.error('Goodera API error', { deliveryId, statusCode, error: errorMessage });

    const error: any = new Error(`Goodera API error: ${errorMessage}`);
    error.statusCode = statusCode;
    error.response = body;
    error.headers = headers;

    throw error;
  }

  /**
   * Validate configuration
   */
  static validateConfig(config: Partial<GooderaConfig>): GooderaConfig {
    if (!config.apiUrl) {
      throw new Error('Goodera API URL is required');
    }
    if (!config.clientId) {
      throw new Error('Goodera client ID is required');
    }
    if (!config.clientSecret) {
      throw new Error('Goodera client secret is required');
    }
    if (!config.tokenUrl) {
      throw new Error('Goodera token URL is required');
    }

    return config as GooderaConfig;
  }

  /**
   * Test connection to Goodera API
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `${this.config.apiUrl}/v2/health`;

      const response = await request(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const statusCode = response.statusCode;

      if (statusCode >= 200 && statusCode < 300) {
        logger.info('Goodera connection test successful');
        return { success: true };
      }

      return { success: false, error: `HTTP ${statusCode}` };
    } catch (error: any) {
      logger.error('Goodera connection test failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }
}

/**
 * Create Goodera connector from environment variables
 */
export function createGooderaConnector(companyId: string): GooderaConnector {
  const config = GooderaConnector.validateConfig({
    apiUrl: process.env.GOODERA_API_URL,
    clientId: process.env.GOODERA_CLIENT_ID,
    clientSecret: process.env.GOODERA_CLIENT_SECRET,
    tokenUrl: process.env.GOODERA_TOKEN_URL || 'https://api.goodera.com/oauth/token',
  });

  return new GooderaConnector(config, companyId);
}
