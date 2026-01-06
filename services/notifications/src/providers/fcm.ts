import { createServiceLogger } from '@teei/shared-utils';
import { logNotificationAttempt } from '../lib/audit-logger.js';

const logger = createServiceLogger('notifications:fcm');

// Firebase Admin SDK (dynamic import to allow optional dependency)
let adminApp: any = null;
let messaging: any = null;

/**
 * Push notification payload for FCM
 */
export interface PushPayload {
  token?: string; // Single device FCM token
  tokens?: string[]; // Multiple device tokens (batch)
  topic?: string; // Topic name for topic-based messaging
  title: string;
  body: string;
  data?: Record<string, string>; // Custom data payload (all values must be strings)
  imageUrl?: string;
  actionUrl?: string; // Deep link or web URL
  badge?: number; // iOS badge count
  sound?: string; // Notification sound
  priority?: 'high' | 'normal';
  timeToLive?: number; // TTL in seconds
  tenantId: string; // Required for audit logging
  userId?: string; // Optional user ID for audit
}

/**
 * Push notification send result
 */
export interface PushSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  failureCount?: number;
  successCount?: number;
  results?: Array<{ success: boolean; messageId?: string; error?: string }>;
}

/**
 * Initialize Firebase Cloud Messaging
 */
export function initializeFCM(): void {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!serviceAccountPath && !serviceAccountBase64) {
    logger.warn('Firebase credentials not configured - push notifications will be stubbed');
    logger.info('To enable push notifications:');
    logger.info('  1. Create Firebase project at https://console.firebase.google.com');
    logger.info('  2. Download service account JSON key');
    logger.info('  3. Set environment variable:');
    logger.info('     - FIREBASE_SERVICE_ACCOUNT_JSON (path to JSON file)');
    logger.info('     OR');
    logger.info('     - FIREBASE_SERVICE_ACCOUNT_BASE64 (base64-encoded JSON)');
    logger.info('  4. Install package: npm install firebase-admin');
    logger.info('  5. Collect device FCM tokens from mobile/web apps');
    return;
  }

  try {
    // Dynamic import to allow optional dependency
    const admin = require('firebase-admin');

    let serviceAccount: any;

    if (serviceAccountBase64) {
      // Decode base64-encoded service account (useful for environment variables)
      const jsonString = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(jsonString);
    } else {
      // Load from file path
      serviceAccount = require(serviceAccountPath!);
    }

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    messaging = admin.messaging(adminApp);

    logger.info('Firebase Cloud Messaging initialized', {
      projectId: serviceAccount.project_id,
    });
  } catch (error: any) {
    logger.error('Failed to initialize Firebase Admin SDK', {
      error: error.message,
    });
    logger.warn('Make sure firebase-admin npm package is installed: npm install firebase-admin');
  }
}

/**
 * Validate FCM device token format
 */
export function validateFCMToken(token: string): boolean {
  // FCM tokens are typically 152+ characters, alphanumeric with dashes/underscores
  return token.length >= 140 && /^[a-zA-Z0-9_-]+$/.test(token);
}

/**
 * Send push notification via FCM (single device)
 */
export async function sendPush(payload: PushPayload): Promise<PushSendResult> {
  if (!payload.token && !payload.tokens && !payload.topic) {
    const error = 'Must provide either token, tokens, or topic';
    logger.error('Invalid FCM payload', { error });
    return { success: false, error };
  }

  // Validate tokens if provided
  if (payload.token && !validateFCMToken(payload.token)) {
    const error = 'Invalid FCM token format';
    logger.error(error, { tokenLength: payload.token.length });

    logNotificationAttempt({
      notificationId: `push-${Date.now()}`,
      tenantId: payload.tenantId,
      channel: 'push',
      recipient: payload.token,
      status: 'failed',
      errorMessage: error,
      userId: payload.userId,
    });

    return { success: false, error };
  }

  // If FCM not initialized, return stub response
  if (!messaging) {
    logger.warn('Firebase Cloud Messaging not initialized - returning stub response');

    const messageId = `mock-push-${Date.now()}`;
    const recipient = payload.token || payload.topic || 'batch';

    logNotificationAttempt({
      notificationId: messageId,
      tenantId: payload.tenantId,
      channel: 'push',
      recipient,
      metadata: {
        title: payload.title,
        stub: true,
      },
      status: 'sent',
      userId: payload.userId,
    });

    // Return success in development mode only
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        messageId,
      };
    }

    return {
      success: false,
      error: 'FCM provider not configured',
    };
  }

  try {
    // Build FCM message
    const message: any = {
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
      data: payload.data || {},
      ...(payload.token && { token: payload.token }),
      ...(payload.topic && { topic: payload.topic }),
      android: {
        priority: payload.priority || 'high',
        ttl: payload.timeToLive ? payload.timeToLive * 1000 : undefined,
        notification: {
          sound: payload.sound || 'default',
          ...(payload.actionUrl && { clickAction: payload.actionUrl }),
        },
      },
      apns: {
        payload: {
          aps: {
            badge: payload.badge,
            sound: payload.sound || 'default',
          },
        },
        fcmOptions: {
          ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
        },
      },
      webpush: {
        notification: {
          ...(payload.imageUrl && { image: payload.imageUrl }),
          ...(payload.actionUrl && {
            data: { url: payload.actionUrl },
            actions: [{ action: 'open', title: 'Open' }],
          }),
        },
      },
    };

    const response = await messaging.send(message);

    logger.info('Push notification sent successfully', {
      messageId: response,
      token: payload.token ? `${payload.token.substring(0, 20)}...` : undefined,
      topic: payload.topic,
      title: payload.title,
    });

    logNotificationAttempt({
      notificationId: response,
      tenantId: payload.tenantId,
      channel: 'push',
      recipient: payload.token || payload.topic || 'unknown',
      status: 'sent',
      metadata: {
        title: payload.title,
        body: payload.body,
      },
      userId: payload.userId,
    });

    return {
      success: true,
      messageId: response,
    };
  } catch (error: any) {
    logger.error('Failed to send push notification', {
      error: error.message,
      errorCode: error.code,
      token: payload.token ? `${payload.token.substring(0, 20)}...` : undefined,
    });

    logNotificationAttempt({
      notificationId: `push-failed-${Date.now()}`,
      tenantId: payload.tenantId,
      channel: 'push',
      recipient: payload.token || payload.topic || 'unknown',
      status: 'failed',
      errorMessage: `${error.code}: ${error.message}`,
      userId: payload.userId,
    });

    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Send push notification to multiple devices (batch)
 */
export async function sendPushBatch(
  tokens: string[],
  payload: Omit<PushPayload, 'token' | 'tokens'>
): Promise<PushSendResult> {
  if (!messaging) {
    logger.warn('Firebase Cloud Messaging not initialized - returning stub response');

    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        successCount: tokens.length,
        failureCount: 0,
      };
    }

    return {
      success: false,
      error: 'FCM provider not configured',
    };
  }

  // FCM supports up to 500 tokens per batch
  const batchSize = 500;
  const batches: string[][] = [];

  for (let i = 0; i < tokens.length; i += batchSize) {
    batches.push(tokens.slice(i, i + batchSize));
  }

  let totalSuccess = 0;
  let totalFailure = 0;
  const allResults: Array<{ success: boolean; messageId?: string; error?: string }> = [];

  for (const batch of batches) {
    try {
      const message: any = {
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
        },
        data: payload.data || {},
        tokens: batch,
        android: {
          priority: payload.priority || 'high',
        },
      };

      const response = await messaging.sendMulticast(message);

      totalSuccess += response.successCount;
      totalFailure += response.failureCount;

      // Log each result
      response.responses.forEach((res: any, idx: number) => {
        const result = {
          success: res.success,
          messageId: res.messageId,
          error: res.error?.message,
        };
        allResults.push(result);

        logNotificationAttempt({
          notificationId: res.messageId || `push-batch-${Date.now()}-${idx}`,
          tenantId: payload.tenantId,
          channel: 'push',
          recipient: batch[idx],
          status: res.success ? 'sent' : 'failed',
          errorMessage: res.error?.message,
          userId: payload.userId,
        });
      });

      logger.info('Batch push notifications sent', {
        successCount: response.successCount,
        failureCount: response.failureCount,
        batchSize: batch.length,
      });
    } catch (error: any) {
      logger.error('Failed to send batch push notifications', {
        error: error.message,
        batchSize: batch.length,
      });

      totalFailure += batch.length;
    }
  }

  return {
    success: totalSuccess > 0,
    successCount: totalSuccess,
    failureCount: totalFailure,
    results: allResults,
  };
}

/**
 * Subscribe device tokens to a topic
 */
export async function subscribeToTopic(tokens: string[], topic: string): Promise<{
  successCount: number;
  failureCount: number;
  errors?: Array<{ index: number; error: string }>;
}> {
  if (!messaging) {
    logger.warn('FCM not initialized - returning stub response');
    return {
      successCount: process.env.NODE_ENV === 'development' ? tokens.length : 0,
      failureCount: process.env.NODE_ENV === 'development' ? 0 : tokens.length,
    };
  }

  try {
    const response = await messaging.subscribeToTopic(tokens, topic);

    logger.info('Subscribed devices to topic', {
      topic,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      errors: response.errors,
    };
  } catch (error: any) {
    logger.error('Failed to subscribe to topic', {
      topic,
      error: error.message,
    });

    return {
      successCount: 0,
      failureCount: tokens.length,
    };
  }
}

/**
 * Unsubscribe device tokens from a topic
 */
export async function unsubscribeFromTopic(tokens: string[], topic: string): Promise<{
  successCount: number;
  failureCount: number;
}> {
  if (!messaging) {
    logger.warn('FCM not initialized - returning stub response');
    return {
      successCount: 0,
      failureCount: tokens.length,
    };
  }

  try {
    const response = await messaging.unsubscribeFromTopic(tokens, topic);

    logger.info('Unsubscribed devices from topic', {
      topic,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error: any) {
    logger.error('Failed to unsubscribe from topic', {
      topic,
      error: error.message,
    });

    return {
      successCount: 0,
      failureCount: tokens.length,
    };
  }
}

/**
 * Verify FCM configuration
 */
export async function verifyFCMConfig(): Promise<{
  configured: boolean;
  error?: string;
  projectId?: string;
}> {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!serviceAccountPath && !serviceAccountBase64) {
    return {
      configured: false,
      error: 'Firebase service account not configured',
    };
  }

  if (!adminApp || !messaging) {
    return {
      configured: false,
      error: 'Firebase Admin SDK not initialized (npm package may not be installed)',
    };
  }

  try {
    // Try to get project ID to verify configuration
    const projectId = adminApp.options.credential.projectId;

    return {
      configured: true,
      projectId,
    };
  } catch (error: any) {
    return {
      configured: false,
      error: `FCM verification failed: ${error.message}`,
    };
  }
}

// Initialize on module load
initializeFCM();
