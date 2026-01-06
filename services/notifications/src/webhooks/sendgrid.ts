import { Request, Response } from 'express';
import { createServiceLogger } from '@teei/shared-utils';
import { processSendGridWebhook, WebhookEvent } from '../providers/sendgrid.js';
import { logNotificationAttempt } from '../lib/audit-logger.js';

const logger = createServiceLogger('notifications:webhooks:sendgrid');

/**
 * SendGrid webhook endpoint handler
 * Receives delivery status updates (delivered, opened, clicked, bounced, etc.)
 *
 * Setup: Configure webhook in SendGrid dashboard
 * URL: https://your-domain.com/notifications/webhooks/sendgrid
 * Events: Delivered, Opened, Clicked, Bounced, Dropped, Spam Report
 */
export async function handleSendGridWebhook(req: Request, res: Response): Promise<void> {
  try {
    // SendGrid sends events as an array
    const events: WebhookEvent[] = Array.isArray(req.body) ? req.body : [req.body];

    logger.info(`Received ${events.length} SendGrid webhook event(s)`);

    for (const event of events) {
      try {
        const processed = processSendGridWebhook(event);

        // Map SendGrid event to audit log status
        const statusMap: Record<string, string> = {
          delivered: 'delivered',
          opened: 'opened',
          clicked: 'clicked',
          bounced: 'bounced',
          spam: 'failed',
          unsubscribed: 'failed',
        };

        // Extract tenant ID from custom args (if present)
        const tenantId = event.tenant_id || event.company_id || 'unknown';
        const userId = event.user_id || undefined;

        // Log to audit trail
        logNotificationAttempt({
          notificationId: processed.notificationId || event.sg_message_id,
          tenantId,
          channel: 'email',
          recipient: processed.eventData.email,
          status: statusMap[processed.eventType] || 'failed',
          metadata: {
            sgEventId: processed.eventData.sgEventId,
            sgMessageId: processed.eventData.sgMessageId,
            userAgent: processed.eventData.userAgent,
            ip: processed.eventData.ip,
            url: processed.eventData.url,
          },
          errorMessage: processed.eventData.reason,
          userId,
        });

        // Here you could also:
        // - Update notification status in database
        // - Trigger follow-up actions (e.g., retry on bounce)
        // - Send analytics to monitoring system
        // - Alert on spam reports

        if (event.event === 'bounce' || event.event === 'dropped') {
          logger.warn('Email delivery failed', {
            email: event.email,
            reason: event.reason,
            status: event.status,
          });
        }

        if (event.event === 'spamreport') {
          logger.error('Spam report received', {
            email: event.email,
            sgMessageId: event.sg_message_id,
          });
          // TODO: Alert admin team
        }
      } catch (eventError: any) {
        logger.error('Failed to process SendGrid event', {
          error: eventError.message,
          event,
        });
      }
    }

    // SendGrid expects 200 OK response
    res.status(200).json({ received: events.length });
  } catch (error: any) {
    logger.error('SendGrid webhook handler error', {
      error: error.message,
      stack: error.stack,
    });

    // Return 200 even on error to prevent SendGrid retries
    // (log error for investigation instead)
    res.status(200).json({ error: 'Processing error, logged for review' });
  }
}

/**
 * Verify SendGrid webhook signature (optional but recommended)
 * Requires SENDGRID_WEBHOOK_VERIFICATION_KEY environment variable
 *
 * See: https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
 */
export function verifySendGridWebhookSignature(req: Request): boolean {
  const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;

  if (!verificationKey) {
    logger.warn('SENDGRID_WEBHOOK_VERIFICATION_KEY not set - skipping signature verification');
    return true; // Allow requests if verification not configured
  }

  const signature = req.headers['x-twilio-email-event-webhook-signature'] as string;
  const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] as string;

  if (!signature || !timestamp) {
    logger.error('Missing SendGrid webhook signature headers');
    return false;
  }

  // TODO: Implement ECDSA signature verification
  // For now, return true (implement in production)
  // See SendGrid docs for full implementation

  return true;
}
