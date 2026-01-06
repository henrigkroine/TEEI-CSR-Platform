/**
 * Prometheus Metrics for Impact-In Service
 *
 * Exposes metrics for monitoring:
 * - Delivery success/failure rates by platform
 * - Delivery latency/duration
 * - Retry attempts
 * - Webhook verification success/failure
 * - API rate limiting
 *
 * Ref: Mission § Prometheus metrics (deliveries_total, failures_total, latency_ms)
 */

import { register, Counter, Histogram, Gauge } from 'prom-client';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('impact-in:metrics');

/**
 * Delivery metrics
 */
export const deliveriesTotal = new Counter({
  name: 'impact_in_deliveries_total',
  help: 'Total number of impact data deliveries attempted',
  labelNames: ['platform', 'status', 'company_id'],
  registers: [register],
});

export const deliveryDuration = new Histogram({
  name: 'impact_in_delivery_duration_seconds',
  help: 'Duration of impact data deliveries in seconds',
  labelNames: ['platform', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const deliveryRetries = new Histogram({
  name: 'impact_in_delivery_retries',
  help: 'Number of retry attempts for failed deliveries',
  labelNames: ['platform'],
  buckets: [0, 1, 2, 3, 4, 5, 10],
  registers: [register],
});

export const deliveryFailuresTotal = new Counter({
  name: 'impact_in_delivery_failures_total',
  help: 'Total number of failed deliveries',
  labelNames: ['platform', 'error_type', 'company_id'],
  registers: [register],
});

/**
 * Webhook metrics
 */
export const webhooksReceived = new Counter({
  name: 'impact_in_webhooks_received_total',
  help: 'Total number of webhooks received',
  labelNames: ['platform', 'verified'],
  registers: [register],
});

export const webhookVerificationFailures = new Counter({
  name: 'impact_in_webhook_verification_failures_total',
  help: 'Total number of webhook verification failures',
  labelNames: ['platform', 'reason'],
  registers: [register],
});

/**
 * OAuth/Token metrics
 */
export const oauthTokenRefreshes = new Counter({
  name: 'impact_in_oauth_token_refreshes_total',
  help: 'Total number of OAuth token refreshes',
  labelNames: ['platform', 'status'],
  registers: [register],
});

export const oauthTokenAge = new Gauge({
  name: 'impact_in_oauth_token_age_seconds',
  help: 'Age of current OAuth token in seconds',
  labelNames: ['platform'],
  registers: [register],
});

/**
 * Rate limiting metrics
 */
export const rateLimitHits = new Counter({
  name: 'impact_in_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['platform', 'company_id'],
  registers: [register],
});

export const rateLimitRemaining = new Gauge({
  name: 'impact_in_rate_limit_remaining',
  help: 'Remaining API quota',
  labelNames: ['platform', 'company_id'],
  registers: [register],
});

/**
 * API Key metrics
 */
export const apiKeyUsage = new Counter({
  name: 'api_gateway_api_key_usage_total',
  help: 'Total number of API key authentications',
  labelNames: ['company_id', 'key_prefix', 'success'],
  registers: [register],
});

export const apiKeyCreated = new Counter({
  name: 'api_gateway_api_key_created_total',
  help: 'Total number of API keys created',
  labelNames: ['company_id'],
  registers: [register],
});

export const apiKeyRevoked = new Counter({
  name: 'api_gateway_api_key_revoked_total',
  help: 'Total number of API keys revoked',
  labelNames: ['company_id', 'reason'],
  registers: [register],
});

/**
 * DSAR metrics
 */
export const dsarRequestsTotal = new Counter({
  name: 'dsar_requests_total',
  help: 'Total number of DSAR requests',
  labelNames: ['request_type', 'status'],
  registers: [register],
});

export const dsarProcessingDuration = new Histogram({
  name: 'dsar_processing_duration_seconds',
  help: 'Duration of DSAR request processing in seconds',
  labelNames: ['request_type'],
  buckets: [1, 5, 10, 30, 60, 300, 600, 1800],
  registers: [register],
});

export const dsarDataSourcesProcessed = new Counter({
  name: 'dsar_data_sources_processed_total',
  help: 'Total number of data sources processed in DSAR requests',
  labelNames: ['request_type', 'source', 'status'],
  registers: [register],
});

/**
 * Consent metrics
 */
export const consentUpdates = new Counter({
  name: 'consent_updates_total',
  help: 'Total number of consent updates',
  labelNames: ['consent_type', 'granted'],
  registers: [register],
});

/**
 * Helper functions for recording metrics
 */

export function recordDeliverySuccess(
  platform: string,
  companyId: string,
  durationSeconds: number,
  retryCount: number
): void {
  deliveriesTotal.inc({ platform, status: 'success', company_id: companyId });
  deliveryDuration.observe({ platform, status: 'success' }, durationSeconds);
  if (retryCount > 0) {
    deliveryRetries.observe({ platform }, retryCount);
  }
  logger.debug({ platform, companyId, durationSeconds, retryCount }, 'Delivery success recorded');
}

export function recordDeliveryFailure(
  platform: string,
  companyId: string,
  errorType: string,
  durationSeconds: number,
  retryCount: number
): void {
  deliveriesTotal.inc({ platform, status: 'failed', company_id: companyId });
  deliveryFailuresTotal.inc({ platform, error_type: errorType, company_id: companyId });
  deliveryDuration.observe({ platform, status: 'failed' }, durationSeconds);
  deliveryRetries.observe({ platform }, retryCount);
  logger.debug({ platform, companyId, errorType, durationSeconds, retryCount }, 'Delivery failure recorded');
}

export function recordWebhookReceived(platform: string, verified: boolean, reason?: string): void {
  webhooksReceived.inc({ platform, verified: verified.toString() });
  if (!verified && reason) {
    webhookVerificationFailures.inc({ platform, reason });
  }
  logger.debug({ platform, verified, reason }, 'Webhook received recorded');
}

export function recordOAuthTokenRefresh(platform: string, success: boolean): void {
  oauthTokenRefreshes.inc({ platform, status: success ? 'success' : 'failed' });
  logger.debug({ platform, success }, 'OAuth token refresh recorded');
}

export function updateOAuthTokenAge(platform: string, ageSeconds: number): void {
  oauthTokenAge.set({ platform }, ageSeconds);
}

export function recordRateLimitHit(platform: string, companyId: string, remaining: number): void {
  rateLimitHits.inc({ platform, company_id: companyId });
  rateLimitRemaining.set({ platform, company_id: companyId }, remaining);
  logger.debug({ platform, companyId, remaining }, 'Rate limit hit recorded');
}

export function updateRateLimitRemaining(platform: string, companyId: string, remaining: number): void {
  rateLimitRemaining.set({ platform, company_id: companyId }, remaining);
}

export function recordApiKeyUsage(companyId: string, keyPrefix: string, success: boolean): void {
  apiKeyUsage.inc({ company_id: companyId, key_prefix: keyPrefix, success: success.toString() });
}

export function recordApiKeyCreated(companyId: string): void {
  apiKeyCreated.inc({ company_id: companyId });
}

export function recordApiKeyRevoked(companyId: string, reason: string): void {
  apiKeyRevoked.inc({ company_id: companyId, reason });
}

export function recordDsarRequest(requestType: string, status: string): void {
  dsarRequestsTotal.inc({ request_type: requestType, status });
}

export function recordDsarProcessingDuration(requestType: string, durationSeconds: number): void {
  dsarProcessingDuration.observe({ request_type: requestType }, durationSeconds);
}

export function recordDsarDataSourceProcessed(
  requestType: string,
  source: string,
  status: string
): void {
  dsarDataSourcesProcessed.inc({ request_type: requestType, source, status });
}

export function recordConsentUpdate(consentType: string, granted: boolean): void {
  consentUpdates.inc({ consent_type: consentType, granted: granted.toString() });
}

/**
 * Get metrics endpoint handler
 */
export async function getMetrics(): Promise<string> {
  return await register.metrics();
}

/**
 * Clear all metrics (useful for testing)
 */
export function clearMetrics(): void {
  register.clear();
  logger.info('All metrics cleared');
}

/**
 * Initialize default metrics (CPU, memory, etc.)
 */
export function initializeDefaultMetrics(): void {
  const { collectDefaultMetrics } = require('prom-client');
  collectDefaultMetrics({ register });
  logger.info('Default metrics initialized');
}

/**
 * Example usage:
 *
 * ```typescript
 * // Record successful delivery
 * recordDeliverySuccess('benevity', 'company-123', 2.5, 1);
 *
 * // Record failed delivery
 * recordDeliveryFailure('goodera', 'company-456', 'NETWORK_ERROR', 5.0, 3);
 *
 * // Record webhook
 * recordWebhookReceived('workday', true);
 *
 * // Expose metrics endpoint
 * fastify.get('/metrics', async (request, reply) => {
 *   reply.type('text/plain').send(await getMetrics());
 * });
 * ```
 */
