import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('notifications:fcm-stub');

/**
 * Push notification payload for FCM
 */
export interface PushPayload {
  token: string; // Device FCM token
  title: string;
  body: string;
  data?: Record<string, string>; // Custom data payload
  imageUrl?: string;
  actionUrl?: string;
  badge?: number;
  sound?: string;
  priority?: 'high' | 'normal';
  timeToLive?: number; // In seconds
}

/**
 * Push notification send result
 */
export interface PushSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Initialize Firebase Cloud Messaging client (stub for future implementation)
 */
export function initializeFCM(): void {
  logger.info('FCM push notification provider stub initialized');
  logger.info('To enable push notifications:');
  logger.info('  1. Create Firebase project at https://console.firebase.google.com');
  logger.info('  2. Download service account JSON key');
  logger.info('  3. Set environment variable:');
  logger.info('     - FIREBASE_SERVICE_ACCOUNT_JSON (path to JSON file)');
  logger.info('  4. Install package: npm install firebase-admin');
  logger.info('  5. Implement sendPush() function below');
  logger.info('  6. Collect device FCM tokens from mobile apps');
}

/**
 * Send push notification via FCM (stub implementation)
 */
export async function sendPush(payload: PushPayload): Promise<PushSendResult> {
  logger.warn('Push notification sending not implemented - this is a stub');
  logger.info('Push notification would be sent with payload:', {
    token: `${payload.token.substring(0, 20)}...`,
    title: payload.title,
    bodyLength: payload.body.length,
  });

  // Return mock success for development
  if (process.env.NODE_ENV === 'development') {
    return {
      success: true,
      messageId: `mock-push-${Date.now()}`,
    };
  }

  return {
    success: false,
    error: 'FCM provider not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON environment variable.',
  };
}

/**
 * Send push notification to multiple devices (batch)
 */
export async function sendPushBatch(
  tokens: string[],
  payload: Omit<PushPayload, 'token'>
): Promise<{
  successCount: number;
  failureCount: number;
  results: PushSendResult[];
}> {
  logger.warn('Batch push notification not implemented - this is a stub');

  const results = tokens.map((token) => ({
    success: process.env.NODE_ENV === 'development',
    messageId: `mock-push-${Date.now()}-${token.substring(0, 8)}`,
  }));

  return {
    successCount: results.filter((r) => r.success).length,
    failureCount: results.filter((r) => !r.success).length,
    results,
  };
}

/**
 * Verify FCM configuration
 */
export async function verifyFCMConfig(): Promise<{
  configured: boolean;
  error?: string;
}> {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountPath) {
    return {
      configured: false,
      error: 'Firebase service account not configured',
    };
  }

  return {
    configured: true,
  };
}

/**
 * Subscribe device token to topic (for topic-based notifications)
 */
export async function subscribeToTopic(
  tokens: string[],
  topic: string
): Promise<{ successCount: number; failureCount: number }> {
  logger.warn('Topic subscription not implemented - this is a stub');
  logger.info(`Would subscribe ${tokens.length} tokens to topic: ${topic}`);

  return {
    successCount: process.env.NODE_ENV === 'development' ? tokens.length : 0,
    failureCount: process.env.NODE_ENV === 'development' ? 0 : tokens.length,
  };
}

/**
 * Unsubscribe device token from topic
 */
export async function unsubscribeFromTopic(
  tokens: string[],
  topic: string
): Promise<{ successCount: number; failureCount: number }> {
  logger.warn('Topic unsubscription not implemented - this is a stub');
  logger.info(`Would unsubscribe ${tokens.length} tokens from topic: ${topic}`);

  return {
    successCount: process.env.NODE_ENV === 'development' ? tokens.length : 0,
    failureCount: process.env.NODE_ENV === 'development' ? 0 : tokens.length,
  };
}

/**
 * Validate FCM device token format
 */
export function validateFCMToken(token: string): boolean {
  // Basic validation - FCM tokens are typically 152+ characters
  return token.length >= 140 && /^[a-zA-Z0-9_-]+$/.test(token);
}

// Initialize on module load
initializeFCM();
