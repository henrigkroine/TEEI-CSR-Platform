/**
 * Notifications Service Client
 * Multi-channel notifications (email, SMS, push) with quotas and webhooks
 */

import { TEEIClient } from './client';
import {
  SendNotificationRequest,
  SendNotificationResponse,
  ScheduleNotificationRequest,
  ScheduleNotificationResponse,
  CancelNotificationResponse,
  NotificationHistoryQuery,
  NotificationHistoryResponse,
  NotificationDetailResponse,
  QuotaResponse,
} from './types';

export class NotificationsService {
  constructor(private client: TEEIClient) {}

  /**
   * Send notification immediately
   *
   * Queue a notification for immediate delivery via email, SMS, or push.
   *
   * @param request - Notification send request
   * @returns Notification queued response with notification ID
   *
   * @example
   * ```typescript
   * const result = await sdk.notifications.send({
   *   companyId: '550e8400-e29b-41d4-a716-446655440000',
   *   type: 'email',
   *   templateId: 'report-ready',
   *   recipient: 'user@example.com',
   *   subject: 'Your Q4 Impact Report is Ready',
   *   payload: {
   *     userName: 'John Doe',
   *     reportUrl: 'https://app.teei.io/reports/rpt_123',
   *   },
   * });
   *
   * console.log(`Notification queued: ${result.notificationId}`);
   * ```
   */
  async send(request: SendNotificationRequest): Promise<SendNotificationResponse> {
    return this.client.post<SendNotificationResponse>('/notifications/send', request);
  }

  /**
   * Schedule notification for future delivery
   *
   * Schedule a notification to be sent at a specific future time.
   *
   * @param request - Schedule notification request
   * @returns Scheduled notification response
   *
   * @example
   * ```typescript
   * const result = await sdk.notifications.schedule({
   *   companyId: '550e8400-e29b-41d4-a716-446655440000',
   *   type: 'email',
   *   templateId: 'weekly-digest',
   *   recipient: 'admin@example.com',
   *   subject: 'Weekly Impact Digest',
   *   payload: {
   *     weekStart: '2024-11-11',
   *     weekEnd: '2024-11-17',
   *   },
   *   scheduledAt: '2024-11-18T09:00:00Z',
   * });
   *
   * console.log(`Notification scheduled for: ${result.scheduledAt}`);
   * ```
   */
  async schedule(request: ScheduleNotificationRequest): Promise<ScheduleNotificationResponse> {
    return this.client.post<ScheduleNotificationResponse>('/notifications/schedule', request);
  }

  /**
   * Cancel scheduled notification
   *
   * Cancel a notification that hasn't been sent yet.
   *
   * @param id - Notification ID
   * @returns Cancellation confirmation
   *
   * @example
   * ```typescript
   * const result = await sdk.notifications.cancel('ntf_7f8a9b0c1d2e3f4a');
   * console.log(result.message); // "Notification cancelled successfully"
   * ```
   */
  async cancel(id: string): Promise<CancelNotificationResponse> {
    return this.client.delete<CancelNotificationResponse>(`/notifications/${id}/cancel`);
  }

  /**
   * Query notification history
   *
   * Retrieve notification history with filtering and pagination.
   *
   * @param query - Notification history query parameters
   * @returns Paginated notification history
   *
   * @example
   * ```typescript
   * const history = await sdk.notifications.getHistory({
   *   companyId: '550e8400-e29b-41d4-a716-446655440000',
   *   type: 'email',
   *   status: 'sent',
   *   limit: 50,
   *   offset: 0,
   * });
   *
   * console.log(`Total notifications: ${history.pagination.total}`);
   * history.notifications.forEach(n => {
   *   console.log(`${n.type} to ${n.recipient}: ${n.status}`);
   * });
   * ```
   */
  async getHistory(query?: NotificationHistoryQuery): Promise<NotificationHistoryResponse> {
    return this.client.get<NotificationHistoryResponse>('/notifications/history', {
      params: query,
    });
  }

  /**
   * Get notification details with delivery receipts
   *
   * Retrieve detailed information about a notification including delivery receipts.
   *
   * @param id - Notification ID
   * @returns Notification details with delivery receipts
   *
   * @example
   * ```typescript
   * const details = await sdk.notifications.getDetails('ntf_7f8a9b0c1d2e3f4a');
   * console.log(`Status: ${details.notification.status}`);
   * console.log(`Sent at: ${details.notification.sentAt}`);
   * console.log(`Delivery receipts: ${details.deliveryReceipts.length}`);
   *
   * details.deliveryReceipts.forEach(receipt => {
   *   console.log(`${receipt.eventType} at ${receipt.receivedAt}`);
   * });
   * ```
   */
  async getDetails(id: string): Promise<NotificationDetailResponse> {
    return this.client.get<NotificationDetailResponse>(`/notifications/${id}`);
  }

  /**
   * Check remaining quota
   *
   * Check notification quota status for a company.
   *
   * @param companyId - Company ID
   * @returns Quota status for all channels
   *
   * @example
   * ```typescript
   * const quota = await sdk.notifications.getQuota('550e8400-e29b-41d4-a716-446655440000');
   *
   * console.log(`Email: ${quota.quotas.email.remaining}/${quota.quotas.email.limit} remaining`);
   * console.log(`SMS: ${quota.quotas.sms.remaining}/${quota.quotas.sms.limit} remaining`);
   * console.log(`Push: ${quota.quotas.push.remaining}/${quota.quotas.push.limit} remaining`);
   * console.log(`Resets at: ${quota.quotas.email.resetAt}`);
   * ```
   */
  async getQuota(companyId: string): Promise<QuotaResponse> {
    return this.client.get<QuotaResponse>('/notifications/quota', {
      params: { companyId },
    });
  }
}
