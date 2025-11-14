import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('notifications:sendgrid');

/**
 * Email payload for SendGrid
 */
export interface EmailPayload {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: 'attachment' | 'inline';
  }>;
  customArgs?: Record<string, string>;
  trackingSettings?: {
    clickTracking?: { enable: boolean };
    openTracking?: { enable: boolean };
  };
}

/**
 * SendGrid send result
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Initialize SendGrid client
 */
export function initializeSendGrid(): void {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    logger.warn('SENDGRID_API_KEY not configured - email sending will fail');
    return;
  }

  sgMail.setApiKey(apiKey);
  logger.info('SendGrid client initialized');
}

/**
 * Send email via SendGrid
 */
export async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  try {
    const from = payload.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@teei-platform.com';
    const fromName = process.env.SENDGRID_FROM_NAME || 'TEEI Platform';

    const msg: MailDataRequired = {
      to: payload.to,
      from: {
        email: from,
        name: fromName,
      },
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo,
      attachments: payload.attachments,
      customArgs: payload.customArgs,
      trackingSettings: payload.trackingSettings || {
        clickTracking: { enable: true },
        openTracking: { enable: true },
      },
    };

    const [response] = await sgMail.send(msg);

    logger.info('Email sent successfully', {
      to: payload.to,
      subject: payload.subject,
      messageId: response.headers['x-message-id'],
      statusCode: response.statusCode,
    });

    return {
      success: true,
      messageId: response.headers['x-message-id'] as string,
    };
  } catch (error: any) {
    logger.error('Failed to send email', {
      to: payload.to,
      subject: payload.subject,
      error: error.message,
      response: error.response?.body,
    });

    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Verify SendGrid API key and configuration
 */
export async function verifySendGridConfig(): Promise<{
  configured: boolean;
  error?: string;
}> {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    return {
      configured: false,
      error: 'SENDGRID_API_KEY not set',
    };
  }

  try {
    // SendGrid doesn't have a dedicated health check endpoint
    // We just verify the API key is set
    return {
      configured: true,
    };
  } catch (error: any) {
    return {
      configured: false,
      error: error.message,
    };
  }
}

/**
 * Parse SendGrid webhook event
 * Handles delivery receipts (delivered, opened, clicked, bounced, etc.)
 */
export interface WebhookEvent {
  email: string;
  timestamp: number;
  event: 'delivered' | 'open' | 'click' | 'bounce' | 'dropped' | 'spamreport' | 'unsubscribe';
  'smtp-id'?: string;
  sg_event_id: string;
  sg_message_id: string;
  useragent?: string;
  ip?: string;
  url?: string;
  reason?: string;
  status?: string;
  [key: string]: any;
}

/**
 * Process SendGrid webhook event
 */
export function processSendGridWebhook(event: WebhookEvent): {
  notificationId?: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
} {
  // Extract notification ID from custom args if present
  const notificationId = event.notification_id || event.sg_message_id;

  // Map SendGrid event types to our event types
  const eventTypeMap: Record<string, string> = {
    delivered: 'delivered',
    open: 'opened',
    click: 'clicked',
    bounce: 'bounced',
    dropped: 'bounced',
    spamreport: 'spam',
    unsubscribe: 'unsubscribed',
  };

  const eventType = eventTypeMap[event.event] || event.event;

  return {
    notificationId,
    eventType,
    eventData: {
      email: event.email,
      sgEventId: event.sg_event_id,
      sgMessageId: event.sg_message_id,
      userAgent: event.useragent,
      ip: event.ip,
      url: event.url,
      reason: event.reason,
      status: event.status,
      originalEvent: event.event,
    },
    timestamp: new Date(event.timestamp * 1000),
  };
}

// Initialize on module load
initializeSendGrid();
