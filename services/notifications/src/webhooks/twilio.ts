import { Request, Response } from 'express';
import { createServiceLogger } from '@teei/shared-utils';
import { processTwilioWebhook, TwilioWebhookEvent } from '../providers/twilio.js';
import { logNotificationAttempt } from '../lib/audit-logger.js';

const logger = createServiceLogger('notifications:webhooks:twilio');

/**
 * Twilio webhook endpoint handler
 * Receives SMS delivery status updates
 *
 * Setup: Configure webhook in Twilio console or via API
 * URL: https://your-domain.com/notifications/webhooks/twilio
 * Method: POST
 * Events: Message status changes (queued, sent, delivered, failed, undelivered)
 */
export async function handleTwilioWebhook(req: Request, res: Response): Promise<void> {
  try {
    const event: TwilioWebhookEvent = req.body;

    logger.info('Received Twilio webhook event', {
      messageSid: event.MessageSid,
      status: event.MessageStatus,
      to: event.To,
    });

    // Verify webhook signature (recommended)
    const signatureValid = verifyTwilioWebhookSignature(req);
    if (!signatureValid) {
      logger.error('Invalid Twilio webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const processed = processTwilioWebhook(event);

    // Map Twilio status to audit log status
    const statusMap: Record<string, string> = {
      queued: 'queued',
      sent: 'sent',
      delivered: 'delivered',
      failed: 'failed',
      undelivered: 'failed',
    };

    // Extract tenant/user IDs from custom parameters if present
    // (You would pass these when creating the message)
    const tenantId = req.body.tenant_id || req.body.TenantId || 'unknown';
    const userId = req.body.user_id || req.body.UserId || undefined;

    // Log to audit trail
    logNotificationAttempt({
      notificationId: processed.notificationId || event.MessageSid,
      tenantId,
      channel: 'sms',
      recipient: processed.eventData.to,
      status: statusMap[processed.eventType] || 'failed',
      metadata: {
        twilioStatus: processed.eventData.status,
        from: processed.eventData.from,
        errorCode: processed.eventData.errorCode,
      },
      errorMessage: processed.eventData.errorMessage,
      userId,
    });

    // Handle failed/undelivered messages
    if (event.MessageStatus === 'failed' || event.MessageStatus === 'undelivered') {
      logger.warn('SMS delivery failed', {
        messageSid: event.MessageSid,
        to: event.To,
        errorCode: event.ErrorCode,
        errorMessage: event.ErrorMessage,
      });

      // TODO: Implement retry logic or alert admin
      // Example: if error code indicates invalid number, mark recipient as unreachable
    }

    // Twilio expects 200 OK response
    res.status(200).send('OK');
  } catch (error: any) {
    logger.error('Twilio webhook handler error', {
      error: error.message,
      stack: error.stack,
    });

    // Return 200 even on error to prevent Twilio retries
    res.status(200).json({ error: 'Processing error, logged for review' });
  }
}

/**
 * Verify Twilio webhook signature
 * Prevents unauthorized webhook calls
 *
 * See: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function verifyTwilioWebhookSignature(req: Request): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    logger.warn('TWILIO_AUTH_TOKEN not set - skipping signature verification');
    return true; // Allow requests if verification not configured
  }

  try {
    // Dynamic import to allow optional dependency
    const twilio = require('twilio');

    const twilioSignature = req.headers['x-twilio-signature'] as string;
    if (!twilioSignature) {
      logger.error('Missing X-Twilio-Signature header');
      return false;
    }

    // Construct full URL (protocol + host + path)
    const protocol = req.secure ? 'https' : 'http';
    const host = req.get('host');
    const url = `${protocol}://${host}${req.originalUrl}`;

    // Twilio sends POST data as URL-encoded form
    const params = req.body;

    // Validate signature
    const isValid = twilio.validateRequest(authToken, twilioSignature, url, params);

    if (!isValid) {
      logger.error('Twilio signature validation failed', {
        url,
        signatureReceived: twilioSignature,
      });
    }

    return isValid;
  } catch (error: any) {
    logger.error('Twilio signature verification error', {
      error: error.message,
    });
    return false;
  }
}

/**
 * Get SMS delivery rate for a tenant
 */
export function getSmsDeliveryRate(tenantId: string, period: 'day' | 'week' | 'month'): {
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
} {
  // TODO: Query audit logs or database
  // For now, return mock data
  return {
    sent: 100,
    delivered: 95,
    failed: 5,
    deliveryRate: 0.95,
  };
}
