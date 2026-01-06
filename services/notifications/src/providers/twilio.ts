import { createServiceLogger } from '@teei/shared-utils';
import { logNotificationAttempt } from '../lib/audit-logger.js';

const logger = createServiceLogger('notifications:twilio');

// Twilio SDK imports (dynamic to allow optional dependency)
let twilioClient: any = null;

/**
 * SMS payload for Twilio
 */
export interface SmsPayload {
  to: string; // Phone number in E.164 format (+1234567890)
  from?: string; // Twilio phone number
  body: string; // Message text (max 1600 characters)
  statusCallback?: string; // Webhook URL for delivery status
  customArgs?: Record<string, string>;
  tenantId: string; // Required for audit logging
  userId?: string; // Optional user ID for audit
}

/**
 * SMS send result
 */
export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  segments?: number; // Number of SMS segments (billable units)
}

/**
 * Initialize Twilio client
 */
export function initializeTwilio(): void {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !phoneNumber) {
    logger.warn('Twilio credentials not configured - SMS sending will be stubbed');
    logger.info('To enable SMS notifications:');
    logger.info('  1. Sign up for Twilio account at https://www.twilio.com');
    logger.info('  2. Get Account SID and Auth Token');
    logger.info('  3. Purchase a phone number');
    logger.info('  4. Set environment variables:');
    logger.info('     - TWILIO_ACCOUNT_SID');
    logger.info('     - TWILIO_AUTH_TOKEN');
    logger.info('     - TWILIO_PHONE_NUMBER');
    logger.info('  5. Install package: npm install twilio');
    return;
  }

  try {
    // Dynamic import to allow optional dependency
    const twilio = require('twilio');
    twilioClient = twilio(accountSid, authToken);
    logger.info('Twilio SMS client initialized', {
      phoneNumber,
      accountSid: `${accountSid.substring(0, 8)}...`,
    });
  } catch (error: any) {
    logger.error('Failed to initialize Twilio client', {
      error: error.message,
    });
    logger.warn('Make sure twilio npm package is installed: npm install twilio');
  }
}

/**
 * Validate E.164 phone number format
 */
export function validateE164PhoneNumber(phoneNumber: string): {
  valid: boolean;
  error?: string;
} {
  // E.164 format: +[country code][number]
  // Example: +12345678900 (US), +4412345678900 (UK), +4712345678 (NO)
  const e164Regex = /^\+[1-9]\d{1,14}$/;

  if (!e164Regex.test(phoneNumber)) {
    return {
      valid: false,
      error: 'Phone number must be in E.164 format (e.g., +12345678900)',
    };
  }

  return { valid: true };
}

/**
 * Send SMS via Twilio
 */
export async function sendSms(payload: SmsPayload): Promise<SmsSendResult> {
  // Validate phone number
  const validation = validateE164PhoneNumber(payload.to);
  if (!validation.valid) {
    logger.error('Invalid phone number format', {
      to: payload.to,
      error: validation.error,
    });

    logNotificationAttempt({
      notificationId: `sms-${Date.now()}`,
      tenantId: payload.tenantId,
      channel: 'sms',
      recipient: payload.to,
      status: 'failed',
      errorMessage: validation.error,
      userId: payload.userId,
    });

    return {
      success: false,
      error: validation.error,
    };
  }

  // Validate message length (Twilio allows up to 1600 chars)
  if (payload.body.length > 1600) {
    const error = `SMS body exceeds 1600 characters (${payload.body.length} chars)`;
    logger.error('SMS body too long', { bodyLength: payload.body.length });

    logNotificationAttempt({
      notificationId: `sms-${Date.now()}`,
      tenantId: payload.tenantId,
      channel: 'sms',
      recipient: payload.to,
      status: 'failed',
      errorMessage: error,
      userId: payload.userId,
    });

    return {
      success: false,
      error,
    };
  }

  // If Twilio client not initialized, return stub response
  if (!twilioClient) {
    logger.warn('Twilio client not initialized - returning stub response');

    const messageId = `mock-sms-${Date.now()}`;

    logNotificationAttempt({
      notificationId: messageId,
      tenantId: payload.tenantId,
      channel: 'sms',
      recipient: payload.to,
      status: 'sent',
      metadata: {
        bodyLength: payload.body.length,
        stub: true,
      },
      userId: payload.userId,
    });

    // Return success in development mode only
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        messageId,
        segments: Math.ceil(payload.body.length / 160),
      };
    }

    return {
      success: false,
      error: 'Twilio provider not configured',
    };
  }

  try {
    const from = payload.from || process.env.TWILIO_PHONE_NUMBER;
    const statusCallback = payload.statusCallback || process.env.TWILIO_STATUS_CALLBACK_URL;

    const message = await twilioClient.messages.create({
      body: payload.body,
      from,
      to: payload.to,
      statusCallback,
      // Pass custom args for webhook processing
      ...(payload.customArgs && {
        messagingServiceSid: undefined, // Custom args not supported with messaging service
      }),
    });

    logger.info('SMS sent successfully', {
      to: payload.to,
      messageId: message.sid,
      segments: message.numSegments,
      status: message.status,
      price: message.price,
      priceUnit: message.priceUnit,
    });

    logNotificationAttempt({
      notificationId: message.sid,
      tenantId: payload.tenantId,
      channel: 'sms',
      recipient: payload.to,
      status: message.status === 'queued' || message.status === 'sent' ? 'sent' : 'failed',
      metadata: {
        segments: message.numSegments,
        price: message.price,
        priceUnit: message.priceUnit,
        direction: message.direction,
      },
      userId: payload.userId,
    });

    return {
      success: true,
      messageId: message.sid,
      segments: message.numSegments,
    };
  } catch (error: any) {
    logger.error('Failed to send SMS', {
      to: payload.to,
      error: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
    });

    logNotificationAttempt({
      notificationId: `sms-failed-${Date.now()}`,
      tenantId: payload.tenantId,
      channel: 'sms',
      recipient: payload.to,
      status: 'failed',
      errorMessage: `${error.code}: ${error.message}`,
      metadata: {
        moreInfo: error.moreInfo,
      },
      userId: payload.userId,
    });

    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Verify Twilio configuration
 */
export async function verifyTwilioConfig(): Promise<{
  configured: boolean;
  error?: string;
  accountInfo?: any;
}> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !phoneNumber) {
    return {
      configured: false,
      error: 'Twilio credentials not configured (missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER)',
    };
  }

  if (!twilioClient) {
    return {
      configured: false,
      error: 'Twilio client not initialized (npm package may not be installed)',
    };
  }

  try {
    // Fetch account info to verify credentials
    const account = await twilioClient.api.accounts(accountSid).fetch();

    return {
      configured: true,
      accountInfo: {
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
      },
    };
  } catch (error: any) {
    return {
      configured: false,
      error: `Twilio verification failed: ${error.message}`,
    };
  }
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
 * Process Twilio webhook event
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

/**
 * Calculate SMS segments (for pricing estimation)
 */
export function calculateSmsSegments(body: string): {
  segments: number;
  encoding: 'GSM-7' | 'UCS-2';
  characters: number;
} {
  // Check if message contains non-GSM characters (requires UCS-2 encoding)
  const gsmRegex = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà]*$/;
  const encoding = gsmRegex.test(body) ? 'GSM-7' : 'UCS-2';

  const maxSegmentSize = encoding === 'GSM-7' ? 160 : 70;
  const maxConcatSegmentSize = encoding === 'GSM-7' ? 153 : 67;

  const characters = body.length;

  let segments: number;
  if (characters <= maxSegmentSize) {
    segments = 1;
  } else {
    segments = Math.ceil(characters / maxConcatSegmentSize);
  }

  return { segments, encoding, characters };
}

// Initialize on module load
initializeTwilio();
