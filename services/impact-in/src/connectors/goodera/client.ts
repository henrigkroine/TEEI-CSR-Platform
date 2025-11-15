import type { GooderaPayload, GooderaBatchPayload } from './mapper.js';
import { IdempotencyCache } from '../lib/idempotency.js';
import type { Redis } from 'ioredis';

export interface GooderaConfig {
  apiKey: string;
  apiUrl: string;
  mockMode?: boolean;
  redis?: Redis; // For idempotency caching
}

export interface GooderaResponse {
  success: boolean;
  recordsProcessed?: number;
  transactionId?: string;
  message?: string;
  error?: string;
  fromCache?: boolean; // Indicates if response came from cache
}

/**
 * Goodera API client with rate limiting, batch support, and idempotency
 */
export class GooderaClient {
  private config: GooderaConfig;
  private rateLimitDelay = 600; // 100 req/min = 600ms between requests
  private lastRequestTime = 0;
  private idempotencyCache: IdempotencyCache;

  constructor(config: GooderaConfig) {
    this.config = config;
    this.idempotencyCache = new IdempotencyCache({
      redis: config.redis,
      ttlSeconds: 86400, // 24 hours
      keyPrefix: 'idempotency',
    });
  }

  /**
   * Send single impact record to Goodera API with idempotency support
   */
  async sendImpactData(payload: GooderaPayload): Promise<GooderaResponse> {
    // Generate idempotency key from payload
    const idempotencyKey = this.idempotencyCache.generateKey('goodera', {
      projectId: payload.projectId,
      organizationId: payload.organizationId,
      reportingPeriod: payload.reportingPeriod,
      impactDimensions: payload.impactDimensions,
    });

    // Check cache for existing response (idempotent behavior)
    const cached = await this.idempotencyCache.checkCache<GooderaResponse>('goodera', idempotencyKey);
    if (cached) {
      console.log(`[Goodera] Returning cached response for key: ${idempotencyKey.substring(0, 12)}...`);
      return { ...cached.data, fromCache: true };
    }

    await this.enforceRateLimit();

    if (this.config.mockMode) {
      return this.mockSendImpactData(payload);
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/impact-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
          'X-API-Version': '1.0',
          'Idempotency-Key': idempotencyKey, // RFC idempotency header
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Goodera API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const successResponse: GooderaResponse = {
        success: true,
        recordsProcessed: 1,
        transactionId: data.transactionId || data.id,
        message: data.message || 'Impact data sent successfully',
        fromCache: false,
      };

      // Cache successful response
      await this.idempotencyCache.storeCache('goodera', idempotencyKey, successResponse);

      return successResponse;
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        fromCache: false,
      };
    }
  }

  /**
   * Send batch of impact records to Goodera API (max 100 records) with idempotency support
   */
  async sendBatchImpactData(batch: GooderaBatchPayload): Promise<GooderaResponse> {
    if (batch.records.length > 100) {
      return {
        success: false,
        error: 'Batch size exceeds maximum of 100 records',
        fromCache: false,
      };
    }

    // Generate idempotency key from batch payload
    const idempotencyKey = this.idempotencyCache.generateKey('goodera', {
      records: batch.records.map(r => ({
        projectId: r.projectId,
        organizationId: r.organizationId,
        reportingPeriod: r.reportingPeriod,
        impactDimensions: r.impactDimensions,
      })),
    });

    // Check cache for existing response
    const cached = await this.idempotencyCache.checkCache<GooderaResponse>('goodera', idempotencyKey);
    if (cached) {
      console.log(`[Goodera] Returning cached batch response for key: ${idempotencyKey.substring(0, 12)}...`);
      return { ...cached.data, fromCache: true };
    }

    await this.enforceRateLimit();

    if (this.config.mockMode) {
      return this.mockSendBatchImpactData(batch);
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/impact-data/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
          'X-API-Version': '1.0',
          'Idempotency-Key': idempotencyKey, // RFC idempotency header
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Goodera API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const successResponse: GooderaResponse = {
        success: true,
        recordsProcessed: batch.records.length,
        transactionId: data.transactionId || data.batchId,
        message: data.message || `Batch of ${batch.records.length} records processed successfully`,
        fromCache: false,
      };

      // Cache successful batch response
      await this.idempotencyCache.storeCache('goodera', idempotencyKey, successResponse);

      return successResponse;
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        fromCache: false,
      };
    }
  }

  /**
   * Enforce rate limiting (100 req/min)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Mock implementation for single record
   */
  private async mockSendImpactData(payload: GooderaPayload): Promise<GooderaResponse> {
    await this.sleep(50);

    if (!payload.projectId || !payload.impactDimensions || payload.impactDimensions.length === 0) {
      return {
        success: false,
        error: 'Invalid payload: missing required fields',
      };
    }

    return {
      success: true,
      recordsProcessed: 1,
      transactionId: `mock-goodera-${Date.now()}`,
      message: 'Mock: Impact data sent successfully to Goodera',
    };
  }

  /**
   * Mock implementation for batch
   */
  private async mockSendBatchImpactData(batch: GooderaBatchPayload): Promise<GooderaResponse> {
    await this.sleep(100);

    return {
      success: true,
      recordsProcessed: batch.records.length,
      transactionId: `mock-goodera-batch-${Date.now()}`,
      message: `Mock: Batch of ${batch.records.length} records sent successfully to Goodera`,
    };
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (this.config.mockMode) {
      return true;
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': this.config.apiKey,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
