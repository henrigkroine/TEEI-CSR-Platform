/**
 * TEEI Platform TypeScript SDK
 * Auto-generated from OpenAPI v1 specifications
 *
 * @packageDocumentation
 */

export * from './types';
export { TEEIClient, TEEIAPIError, ClientConfig } from './client';
export { ReportingService } from './reporting';
export { AnalyticsService } from './analytics';
export { ImpactInService } from './impact-in';
export { NotificationsService } from './notifications';

import { TEEIClient, ClientConfig } from './client';
import { ReportingService } from './reporting';
import { AnalyticsService } from './analytics';
import { ImpactInService } from './impact-in';
import { NotificationsService } from './notifications';

/**
 * Main TEEI Platform SDK class
 *
 * Provides access to all TEEI Platform services:
 * - Reporting: Gen-AI powered report generation
 * - Analytics: ClickHouse-powered analytics
 * - Impact-In: External platform integrations
 * - Notifications: Multi-channel notifications
 *
 * @example
 * ```typescript
 * import { TEEISDK } from '@teei/sdk';
 *
 * const sdk = new TEEISDK({
 *   baseURL: 'https://api.teei.io/v1',
 *   token: 'your-jwt-token',
 * });
 *
 * // Generate AI report
 * const report = await sdk.reporting.generateReport({
 *   companyId: '550e8400-e29b-41d4-a716-446655440000',
 *   period: { start: '2024-01-01', end: '2024-12-31' },
 *   sections: ['impact-summary'],
 * });
 *
 * // Query trends
 * const trends = await sdk.analytics.getTrends({
 *   companyId: '550e8400-e29b-41d4-a716-446655440000',
 *   metrics: 'participants,sessions',
 *   startDate: '2024-01-01',
 *   endDate: '2024-12-31',
 *   interval: 'month',
 * });
 *
 * // Send notification
 * await sdk.notifications.send({
 *   type: 'email',
 *   templateId: 'report-ready',
 *   recipient: 'user@example.com',
 *   subject: 'Your Report is Ready',
 *   payload: { reportUrl: 'https://...' },
 * });
 * ```
 */
export class TEEISDK {
  private client: TEEIClient;

  /**
   * Reporting service instance
   * Gen-AI powered report generation with citations
   */
  public readonly reporting: ReportingService;

  /**
   * Analytics service instance
   * ClickHouse-powered analytics (trends, cohorts, funnels, benchmarks)
   */
  public readonly analytics: AnalyticsService;

  /**
   * Impact-In service instance
   * External platform integrations with delivery tracking
   */
  public readonly impactIn: ImpactInService;

  /**
   * Notifications service instance
   * Multi-channel notifications (email, SMS, push)
   */
  public readonly notifications: NotificationsService;

  /**
   * Create a new TEEI SDK instance
   *
   * @param config - SDK configuration
   */
  constructor(config: ClientConfig) {
    this.client = new TEEIClient(config);

    // Initialize service instances
    this.reporting = new ReportingService(this.client);
    this.analytics = new AnalyticsService(this.client);
    this.impactIn = new ImpactInService(this.client);
    this.notifications = new NotificationsService(this.client);
  }

  /**
   * Update the authentication token
   *
   * @param token - New JWT token
   *
   * @example
   * ```typescript
   * sdk.setToken('new-jwt-token');
   * ```
   */
  setToken(token: string): void {
    this.client.setToken(token);
  }

  /**
   * Remove the authentication token
   *
   * @example
   * ```typescript
   * sdk.clearToken();
   * ```
   */
  clearToken(): void {
    this.client.clearToken();
  }

  /**
   * Get the underlying HTTP client for advanced usage
   *
   * @returns TEEIClient instance
   */
  getClient(): TEEIClient {
    return this.client;
  }
}

/**
 * Create a new TEEI SDK instance
 *
 * @param config - SDK configuration
 * @returns TEEI SDK instance
 *
 * @example
 * ```typescript
 * import { createSDK } from '@teei/sdk';
 *
 * const sdk = createSDK({
 *   baseURL: 'https://api.teei.io/v1',
 *   token: process.env.TEEI_API_TOKEN,
 *   timeout: 30000,
 *   debug: true,
 * });
 * ```
 */
export function createSDK(config: ClientConfig): TEEISDK {
  return new TEEISDK(config);
}

// Default export
export default TEEISDK;
