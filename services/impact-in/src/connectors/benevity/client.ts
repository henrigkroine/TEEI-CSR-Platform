import type { BenevityImpactPayload } from './mapper.js';
import crypto from 'crypto';
import { Redis } from 'ioredis';

export interface BenevityConfig {
  apiKey: string;
  webhookUrl: string;
  webhookSecret?: string; // For signature verification
  mockMode?: boolean;
  redis?: Redis; // For idempotency caching
}

export interface BenevityResponse {
  success: boolean;
  transactionId?: string;
  message?: string;
  error?: string;
  fromCache?: boolean; // Indicates if response came from cache
}

/**
 * Benevity API client with retry logic, idempotency, and webhook verification
 */
export class BenevityClient {
  private config: BenevityConfig;
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second
  private cacheTTL = 86400; // 24 hours in seconds

  constructor(config: BenevityConfig) {
    this.config = config;
  }

  /**
   * Generate deterministic idempotency key from payload
   */
  private generateIdempotencyKey(payload: BenevityImpactPayload): string {
    // Create stable hash from payload (company + period + metrics)
    const keyData = JSON.stringify({
      orgId: payload.organizationId,
      period: payload.reportingPeriod,
      metrics: payload.metrics?.map(m => ({ name: m.name, value: m.value })).sort((a, b) => a.name.localeCompare(b.name))
    });

    return crypto.createHash('sha256').update(keyData).digest('hex');
  }

  /**
   * Send impact data to Benevity API with idempotency support
   * @param payload The impact data payload
   * @param customIdempotencyKey Optional custom key (auto-generated if not provided)
   */
  async sendImpactData(
    payload: BenevityImpactPayload,
    customIdempotencyKey?: string
  ): Promise<BenevityResponse> {
    // Mock mode for testing
    if (this.config.mockMode) {
      return this.mockSendImpactData(payload);
    }

    // Generate or use provided idempotency key
    const idempotencyKey = customIdempotencyKey || this.generateIdempotencyKey(payload);

    // Check cache for existing response (idempotent behavior)
    if (this.config.redis) {
      try {
        const cacheKey = `idempotency:benevity:${idempotencyKey}`;
        const cached = await this.config.redis.get(cacheKey);

        if (cached) {
          const cachedResponse = JSON.parse(cached);
          console.log(`[Benevity] Returning cached response for idempotency key: ${idempotencyKey.substring(0, 8)}...`);
          return { ...cachedResponse, fromCache: true };
        }
      } catch (cacheError) {
        console.warn('[Benevity] Cache read failed, proceeding with API call:', cacheError);
      }
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
            'Idempotency-Key': idempotencyKey, // RFC idempotency header
            'X-Request-ID': crypto.randomUUID() // For request tracing
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Benevity API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const successResponse: BenevityResponse = {
          success: true,
          transactionId: data.transactionId || data.id,
          message: data.message || 'Impact data sent successfully',
          fromCache: false
        };

        // Cache successful response for 24 hours
        if (this.config.redis) {
          try {
            const cacheKey = `idempotency:benevity:${idempotencyKey}`;
            await this.config.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(successResponse));
            console.log(`[Benevity] Cached successful response for ${this.cacheTTL}s`);
          } catch (cacheError) {
            console.warn('[Benevity] Cache write failed (non-fatal):', cacheError);
          }
        }

        return successResponse;
      } catch (error) {
        lastError = error as Error;

        // If this is not the last attempt, wait before retrying
        if (attempt < this.maxRetries - 1) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          console.warn(`[Benevity] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    console.error(`[Benevity] All ${this.maxRetries} attempts failed:`, lastError);
    return {
      success: false,
      error: lastError?.message || 'Unknown error occurred',
      fromCache: false
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

  /**
   * Verify webhook signature from Benevity
   * Benevity sends webhooks with HMAC-SHA256 signature for security
   *
   * @param rawPayload The raw JSON string payload (must be exact, before parsing)
   * @param signature The signature from X-Benevity-Signature header
   * @returns true if signature is valid
   */
  verifyWebhookSignature(rawPayload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      console.warn('[Benevity] Webhook secret not configured, skipping signature verification');
      return true; // Don't fail if secret not configured (for backward compatibility)
    }

    try {
      // Generate expected signature using HMAC-SHA256
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(rawPayload)
        .digest('hex');

      // Timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('[Benevity] Signature verification error:', error);
      return false;
    }
  }

  /**
   * Verify webhook signature from Express/Fastify request
   * Helper for webhook handlers
   *
   * Usage:
   *   fastify.post('/webhooks/benevity', async (request, reply) => {
   *     const rawBody = JSON.stringify(request.body);
   *     const signature = request.headers['x-benevity-signature'];
   *
   *     if (!client.verifyWebhookRequest(rawBody, signature)) {
   *       return reply.code(401).send({ error: 'Invalid signature' });
   *     }
   *     // Process webhook...
   *   });
   */
  verifyWebhookRequest(rawPayload: string, signatureHeader: string | string[] | undefined): boolean {
    if (!signatureHeader) {
      console.warn('[Benevity] Missing X-Benevity-Signature header');
      return false;
    }

    // Handle array of headers (shouldn't happen, but be safe)
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

    // Extract signature from potential "sha256=<sig>" format
    const signatureValue = signature.startsWith('sha256=')
      ? signature.substring(7)
      : signature;

    return this.verifyWebhookSignature(rawPayload, signatureValue);
  }

  /**
   * Parse and verify incoming webhook from Benevity
   * Combines parsing + signature verification
   *
   * @returns Parsed webhook data or null if invalid
   */
  parseWebhook<T = any>(
    rawPayload: string,
    signatureHeader: string | string[] | undefined
  ): T | null {
    // Verify signature first
    if (!this.verifyWebhookRequest(rawPayload, signatureHeader)) {
      console.error('[Benevity] Webhook signature verification failed');
      return null;
    }

    try {
      return JSON.parse(rawPayload) as T;
    } catch (error) {
      console.error('[Benevity] Failed to parse webhook JSON:', error);
      return null;
    }
  }
}
