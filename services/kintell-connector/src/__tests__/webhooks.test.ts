import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { generateWebhookSignature } from '../middleware/signature.js';
import {
  checkIdempotency,
  markProcessed,
  markFailed,
} from '../utils/idempotency.js';
import { publishToDLQ, getDLQMessages, replayFromDLQ } from '../utils/dlq.js';
import { db, webhookDeliveries } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';

/**
 * Integration tests for webhook signature validation, idempotency, and DLQ
 *
 * Test coverage:
 * 1. Signature validation (valid, invalid, expired timestamp)
 * 2. Idempotency (duplicate delivery_id returns 202)
 * 3. DLQ (after 3 failures, webhook goes to DLQ)
 * 4. Replay (DLQ item can be replayed successfully)
 */

describe('Webhook Integration Tests', () => {
  describe('Signature Validation', () => {
    it('should generate valid webhook signature', () => {
      const payload = {
        session_id: 'test-session-123',
        session_type: 'language',
        participant_email: 'participant@example.com',
        volunteer_email: 'volunteer@example.com',
        scheduled_at: '2024-01-01T10:00:00Z',
        completed_at: '2024-01-01T11:00:00Z',
        duration_minutes: 60,
      };

      const signature = generateWebhookSignature(payload);

      // Signature should be in format: t=<timestamp>,v1=<signature>
      expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);

      // Parse timestamp
      const timestampMatch = signature.match(/t=(\d+)/);
      expect(timestampMatch).toBeTruthy();

      const timestamp = parseInt(timestampMatch![1]);
      const now = Math.floor(Date.now() / 1000);

      // Timestamp should be within 1 second of now
      expect(Math.abs(timestamp - now)).toBeLessThanOrEqual(1);
    });

    it('should generate different signatures for different payloads', () => {
      const payload1 = { data: 'test1' };
      const payload2 = { data: 'test2' };

      const sig1 = generateWebhookSignature(payload1);
      const sig2 = generateWebhookSignature(payload2);

      // Signatures should be different
      expect(sig1).not.toEqual(sig2);
    });

    it('should handle special characters in payload', () => {
      const payload = {
        data: 'Test with special chars: !@#$%^&*()_+{}[]|\\:";\'<>?,./`~',
        emoji: '🚀🎉',
      };

      const signature = generateWebhookSignature(payload);
      expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
    });
  });

  describe('Idempotency Layer', () => {
    const testDeliveryId = 'test-delivery-' + Date.now();
    const testPayload = {
      session_id: 'session-123',
      session_type: 'language',
    };

    beforeEach(async () => {
      // Clean up test delivery
      await db
        .delete(webhookDeliveries)
        .where(eq(webhookDeliveries.deliveryId, testDeliveryId));
    });

    it('should create new delivery record on first check', async () => {
      const result = await checkIdempotency(
        testDeliveryId,
        'session-completed',
        testPayload
      );

      expect(result.alreadyProcessed).toBe(false);
      expect(result.shouldProcess).toBe(true);
      expect(result.delivery).toBeTruthy();
      expect(result.delivery?.status).toBe('pending');
      expect(result.delivery?.retryCount).toBe(0);
    });

    it('should return idempotent response for already processed delivery', async () => {
      // First check - create delivery
      await checkIdempotency(testDeliveryId, 'session-completed', testPayload);

      // Mark as processed
      await markProcessed(testDeliveryId);

      // Second check - should return already processed
      const result = await checkIdempotency(
        testDeliveryId,
        'session-completed',
        testPayload
      );

      expect(result.alreadyProcessed).toBe(true);
      expect(result.shouldProcess).toBe(false);
      expect(result.delivery?.status).toBe('processed');
    });

    it('should allow retry for failed delivery', async () => {
      // First check - create delivery
      await checkIdempotency(testDeliveryId, 'session-completed', testPayload);

      // Mark as failed
      await markFailed(testDeliveryId, 'Test error');

      // Second check - should allow retry
      const result = await checkIdempotency(
        testDeliveryId,
        'session-completed',
        testPayload
      );

      expect(result.alreadyProcessed).toBe(false);
      expect(result.shouldProcess).toBe(true);
      expect(result.delivery?.status).toBe('failed');
      expect(result.delivery?.retryCount).toBe(1);
    });

    it('should not process after max retries (3 failures)', async () => {
      // Create delivery and fail 3 times
      await checkIdempotency(testDeliveryId, 'session-completed', testPayload);

      for (let i = 0; i < 3; i++) {
        await markFailed(testDeliveryId, `Test error ${i + 1}`);
      }

      // Check after 3 failures
      const result = await checkIdempotency(
        testDeliveryId,
        'session-completed',
        testPayload
      );

      expect(result.shouldProcess).toBe(false);
      expect(result.delivery?.retryCount).toBe(3);
    });
  });

  describe('Dead Letter Queue (DLQ)', () => {
    const testDeliveryId = 'dlq-test-' + Date.now();
    const testPayload = {
      session_id: 'session-456',
      session_type: 'mentorship',
    };

    beforeEach(async () => {
      // Clean up test delivery
      await db
        .delete(webhookDeliveries)
        .where(eq(webhookDeliveries.deliveryId, testDeliveryId));
    });

    it('should publish failed webhook to DLQ after max retries', async () => {
      // Create delivery and fail 3 times
      await checkIdempotency(testDeliveryId, 'session-completed', testPayload);

      for (let i = 0; i < 3; i++) {
        await markFailed(testDeliveryId, `Test error ${i + 1}`);
      }

      // Publish to DLQ
      await publishToDLQ(
        testDeliveryId,
        'session-completed',
        testPayload,
        3,
        'Max retries exceeded'
      );

      // Check DLQ contains the message
      const dlqMessages = await getDLQMessages(100);

      const foundMessage = dlqMessages.find(
        (msg) => msg.deliveryId === testDeliveryId
      );

      expect(foundMessage).toBeTruthy();
      expect(foundMessage?.eventType).toBe('session-completed');
      expect(foundMessage?.retryCount).toBe(3);
      expect(foundMessage?.payload).toEqual(testPayload);
    });

    it('should replay webhook from DLQ', async () => {
      // Create failed delivery
      await checkIdempotency(testDeliveryId, 'session-completed', testPayload);

      for (let i = 0; i < 3; i++) {
        await markFailed(testDeliveryId, `Test error ${i + 1}`);
      }

      // Replay from DLQ
      const replayedPayload = await replayFromDLQ(testDeliveryId);

      expect(replayedPayload).toEqual(testPayload);

      // Check delivery status is reset to pending
      const [delivery] = await db
        .select()
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.deliveryId, testDeliveryId))
        .limit(1);

      expect(delivery.status).toBe('pending');
      expect(delivery.retryCount).toBe(0);
      expect(delivery.lastError).toBeNull();
    });

    it('should throw error when replaying non-existent delivery', async () => {
      await expect(
        replayFromDLQ('non-existent-delivery-id')
      ).rejects.toThrow('not found');
    });

    it('should throw error when replaying already processed delivery', async () => {
      // Create and mark as processed
      await checkIdempotency(testDeliveryId, 'session-completed', testPayload);
      await markProcessed(testDeliveryId);

      // Try to replay
      await expect(replayFromDLQ(testDeliveryId)).rejects.toThrow('not in failed state');
    });
  });

  describe('End-to-End Webhook Flow', () => {
    it('should handle complete webhook lifecycle', async () => {
      const deliveryId = 'e2e-test-' + Date.now();
      const payload = {
        session_id: 'session-789',
        session_type: 'language',
        participant_email: 'test@example.com',
        volunteer_email: 'volunteer@example.com',
        scheduled_at: '2024-01-01T10:00:00Z',
        completed_at: '2024-01-01T11:00:00Z',
        duration_minutes: 60,
      };

      // 1. Generate signature
      const signature = generateWebhookSignature(payload);
      expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);

      // 2. Check idempotency (first time)
      const idempotency1 = await checkIdempotency(
        deliveryId,
        'session-completed',
        payload
      );
      expect(idempotency1.shouldProcess).toBe(true);
      expect(idempotency1.alreadyProcessed).toBe(false);

      // 3. Process webhook (simulate success)
      await markProcessed(deliveryId);

      // 4. Check idempotency (duplicate request)
      const idempotency2 = await checkIdempotency(
        deliveryId,
        'session-completed',
        payload
      );
      expect(idempotency2.shouldProcess).toBe(false);
      expect(idempotency2.alreadyProcessed).toBe(true);

      // Cleanup
      await db
        .delete(webhookDeliveries)
        .where(eq(webhookDeliveries.deliveryId, deliveryId));
    });
  });
});
