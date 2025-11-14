/**
 * Impact-In Service Client
 * External platform integrations with delivery tracking and replay
 */

import { TEEIClient } from './client';
import {
  ListDeliveriesQuery,
  DeliveryListResponse,
  DeliveryDetailResponse,
  ReplayResponse,
  BulkReplayRequest,
  BulkReplayResponse,
  StatsResponse,
} from './types';

export class ImpactInService {
  constructor(private client: TEEIClient) {}

  /**
   * List deliveries with filtering and pagination
   *
   * Returns delivery history with support for filtering by company, provider, status, and date range.
   *
   * @param query - List deliveries query parameters
   * @returns Paginated list of deliveries
   *
   * @example
   * ```typescript
   * const deliveries = await sdk.impactIn.listDeliveries({
   *   companyId: '550e8400-e29b-41d4-a716-446655440000',
   *   provider: 'benevity',
   *   status: 'success',
   *   page: 1,
   *   limit: 20,
   * });
   *
   * console.log(`Total: ${deliveries.pagination.total}`);
   * deliveries.data.forEach(d => {
   *   console.log(`${d.provider}: ${d.status} (${d.attemptCount} attempts)`);
   * });
   * ```
   */
  async listDeliveries(query?: ListDeliveriesQuery): Promise<DeliveryListResponse> {
    return this.client.get<DeliveryListResponse>('/impact-in/deliveries', { params: query });
  }

  /**
   * Get single delivery by ID
   *
   * Returns detailed information about a specific delivery.
   *
   * @param id - Delivery ID
   * @returns Delivery details
   *
   * @example
   * ```typescript
   * const delivery = await sdk.impactIn.getDelivery('650e8400-e29b-41d4-a716-446655440000');
   * console.log(`Status: ${delivery.data.status}`);
   * console.log(`Provider: ${delivery.data.provider}`);
   * console.log(`Attempts: ${delivery.data.attemptCount}`);
   * ```
   */
  async getDelivery(id: string): Promise<DeliveryDetailResponse> {
    return this.client.get<DeliveryDetailResponse>(`/impact-in/deliveries/${id}`);
  }

  /**
   * Retry a failed delivery
   *
   * Manually retry a failed delivery (status must be 'failed').
   *
   * @param id - Delivery ID to replay
   * @returns Replay result with new status
   *
   * @example
   * ```typescript
   * const result = await sdk.impactIn.replayDelivery('650e8400-e29b-41d4-a716-446655440000');
   * if (result.success) {
   *   console.log(`Delivery replayed: ${result.newStatus}`);
   * } else {
   *   console.error(`Replay failed: ${result.error}`);
   * }
   * ```
   */
  async replayDelivery(id: string): Promise<ReplayResponse> {
    return this.client.post<ReplayResponse>(`/impact-in/deliveries/${id}/replay`);
  }

  /**
   * Retry multiple failed deliveries
   *
   * Batch replay up to 100 deliveries.
   *
   * @param request - Bulk replay request with delivery IDs
   * @returns Summary and individual results
   *
   * @example
   * ```typescript
   * const result = await sdk.impactIn.bulkReplay({
   *   ids: [
   *     '650e8400-e29b-41d4-a716-446655440001',
   *     '650e8400-e29b-41d4-a716-446655440002',
   *   ],
   * });
   *
   * console.log(`Successful: ${result.summary.successful}/${result.summary.total}`);
   * ```
   */
  async bulkReplay(request: BulkReplayRequest): Promise<BulkReplayResponse> {
    return this.client.post<BulkReplayResponse>('/impact-in/deliveries/bulk-replay', request);
  }

  /**
   * Retry all failed deliveries for a company
   *
   * Automatically retry all failed deliveries (max 100).
   *
   * @param companyId - Company ID
   * @param provider - Optional provider filter
   * @returns Summary and individual results
   *
   * @example
   * ```typescript
   * const result = await sdk.impactIn.retryAllFailed(
   *   '550e8400-e29b-41d4-a716-446655440000',
   *   'benevity'
   * );
   *
   * console.log(`Retried: ${result.summary.total} deliveries`);
   * console.log(`Success rate: ${(result.summary.successful / result.summary.total * 100).toFixed(1)}%`);
   * ```
   */
  async retryAllFailed(companyId: string, provider?: string): Promise<BulkReplayResponse> {
    return this.client.post<BulkReplayResponse>('/impact-in/deliveries/retry-all-failed', {
      companyId,
      provider,
    });
  }

  /**
   * Get delivery statistics
   *
   * Returns aggregated statistics by provider and status.
   *
   * @param companyId - Optional company ID filter
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Delivery statistics
   *
   * @example
   * ```typescript
   * const stats = await sdk.impactIn.getStats('550e8400-e29b-41d4-a716-446655440000');
   * console.log(`Total deliveries: ${stats.data.overall.total}`);
   * console.log(`Success rate: ${(stats.data.overall.successful / stats.data.overall.total * 100).toFixed(1)}%`);
   *
   * stats.data.byProvider.forEach(p => {
   *   console.log(`${p.provider} (${p.status}): ${p.count}`);
   * });
   * ```
   */
  async getStats(companyId?: string, startDate?: string, endDate?: string): Promise<StatsResponse> {
    return this.client.get<StatsResponse>('/impact-in/stats', {
      params: { companyId, startDate, endDate },
    });
  }
}
