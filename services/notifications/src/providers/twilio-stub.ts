import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('notifications:twilio-stub');

/**
 * SMS payload for Twilio
 */
export interface SmsPayload {
  to: string; // Phone number in E.164 format (+1234567890)
  from?: string; // Twilio phone number
  body: string; // Message text (max 1600 characters)
  statusCallback?: string; // Webhook URL for delivery status
  customArgs?: Record<string, string>;
}

/**
 * SMS send result
 */
export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Initialize Twilio client (stub for future implementation)
 */
export function initializeTwilio(): void {
  logger.info('Twilio SMS provider stub initialized');
  logger.info('To enable SMS notifications:');
  logger.info('  1. Sign up for Twilio account at https://www.twilio.com');
  logger.info('  2. Get Account SID and Auth Token');
  logger.info('  3. Purchase a phone number');
  logger.info('  4. Set environment variables:');
  logger.info('     - TWILIO_ACCOUNT_SID');
  logger.info('     - TWILIO_AUTH_TOKEN');
  logger.info('     - TWILIO_PHONE_NUMBER');
  logger.info('  5. Install package: npm install twilio');
  logger.info('  6. Implement sendSms() function below');
}

/**
 * Send SMS via Twilio (stub implementation)
 */
export async function sendSms(payload: SmsPayload): Promise<SmsSendResult> {
  logger.warn('SMS sending not implemented - this is a stub');
  logger.info('SMS would be sent with payload:', {
    to: payload.to,
    bodyLength: payload.body.length,
  });

  // Return mock success for development
  if (process.env.NODE_ENV === 'development') {
    return {
      success: true,
      messageId: `mock-sms-${Date.now()}`,
    };
  }

  return {
    success: false,
    error: 'SMS provider not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.',
  };
}

/**
 * Verify Twilio configuration
 */
export async function verifyTwilioConfig(): Promise<{
  configured: boolean;
  error?: string;
}> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !phoneNumber) {
    return {
      configured: false,
      error: 'Twilio credentials not configured',
    };
  }

  return {
    configured: true,
  };
}

/**
 * Parse Twilio webhook event
 */
export interface TwilioWebhookEvent {
  MessageSid: string;
  MessageStatus: 'queued' | 'sent' | 'delivered' | 'undelivered' | 'failed';
  To: string;
  From: string;
  Body: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  [key: string]: any;
}

/**
 * Process Twilio webhook event (stub)
 */
export function processTwilioWebhook(event: TwilioWebhookEvent): {
  notificationId?: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
} {
  const eventTypeMap: Record<string, string> = {
    queued: 'queued',
    sent: 'sent',
    delivered: 'delivered',
    undelivered: 'failed',
    failed: 'failed',
  };

  return {
    notificationId: event.MessageSid,
    eventType: eventTypeMap[event.MessageStatus] || event.MessageStatus,
    eventData: {
      to: event.To,
      from: event.From,
      status: event.MessageStatus,
      errorCode: event.ErrorCode,
      errorMessage: event.ErrorMessage,
    },
    timestamp: new Date(),
  };
}

// Initialize on module load
initializeTwilio();
