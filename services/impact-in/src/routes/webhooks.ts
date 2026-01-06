import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BenevityClient } from '../connectors/benevity/client.js';
import { GooderaClient } from '../connectors/goodera/client.js';
import { WorkdayClient } from '../connectors/workday/client.js';
import { logDeliveryWebhookReceived, updateDeliveryStatus } from '../delivery-log.js';
import { z } from 'zod';

const logger = console; // Use shared logger in production

/**
 * Webhook payload schemas
 */
const BenevityWebhookSchema = z.object({
  event_type: z.enum(['delivery.success', 'delivery.failed', 'delivery.retry']),
  transaction_id: z.string(),
  organization_id: z.string(),
  status: z.string(),
  timestamp: z.string(),
  error_message: z.string().optional(),
});

const GooderaWebhookSchema = z.object({
  eventType: z.enum(['data.received', 'data.processed', 'data.failed']),
  transactionId: z.string(),
  projectId: z.string(),
  status: z.enum(['success', 'failed', 'processing']),
  recordsProcessed: z.number().int().optional(),
  error: z.string().optional(),
  timestamp: z.string(),
});

const WorkdayWebhookSchema = z.object({
  eventType: z.enum(['activity.created', 'activity.updated', 'enrollment.confirmed']),
  activityId: z.string().optional(),
  enrollmentId: z.string().optional(),
  status: z.enum(['success', 'error']),
  message: z.string().optional(),
  timestamp: z.string(),
});

/**
 * Register webhook routes for Impact-In connectors
 */
export async function registerWebhookRoutes(fastify: FastifyInstance) {
  /**
   * POST /webhooks/benevity
   * Receive status updates from Benevity
   */
  fastify.post('/webhooks/benevity', async (request: FastifyRequest, reply: FastifyReply) => {
    const rawBody = JSON.stringify(request.body);
    const signature = request.headers['x-benevity-signature'] as string;

    // Initialize client (in production, get from DI container)
    const client = new BenevityClient({
      apiKey: process.env.BENEVITY_API_KEY || 'mock-key',
      webhookUrl: process.env.BENEVITY_WEBHOOK_URL || 'https://api.benevity.com',
      webhookSecret: process.env.BENEVITY_WEBHOOK_SECRET,
      mockMode: process.env.NODE_ENV === 'development',
    });

    // Verify webhook signature
    if (!client.verifyWebhookRequest(rawBody, signature)) {
      logger.error('[Benevity Webhook] Signature verification failed');
      return reply.code(401).send({ error: 'Invalid signature' });
    }

    // Parse and validate webhook payload
    let webhook: z.infer<typeof BenevityWebhookSchema>;
    try {
      webhook = BenevityWebhookSchema.parse(request.body);
    } catch (error) {
      logger.error('[Benevity Webhook] Invalid payload:', error);
      return reply.code(400).send({ error: 'Invalid webhook payload' });
    }

    // Log webhook receipt
    await logDeliveryWebhookReceived({
      platform: 'benevity',
      transactionId: webhook.transaction_id,
      eventType: webhook.event_type,
      payload: webhook,
    });

    // Update delivery status based on event
    const statusMap: Record<string, 'pending' | 'success' | 'failed' | 'retrying'> = {
      'delivery.success': 'success',
      'delivery.failed': 'failed',
      'delivery.retry': 'retrying',
    };

    await updateDeliveryStatus({
      platform: 'benevity',
      transactionId: webhook.transaction_id,
      status: statusMap[webhook.event_type] || 'failed',
      errorMessage: webhook.error_message,
      webhookTimestamp: new Date(webhook.timestamp),
    });

    logger.info('[Benevity Webhook] Processed successfully', {
      transactionId: webhook.transaction_id,
      eventType: webhook.event_type,
      status: webhook.status,
    });

    return reply.code(200).send({ received: true });
  });

  /**
   * POST /webhooks/goodera
   * Receive status updates from Goodera
   */
  fastify.post('/webhooks/goodera', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-goodera-signature'] as string;

    // Verify signature using HMAC-SHA256 (similar to Benevity)
    const webhookSecret = process.env.GOODERA_WEBHOOK_SECRET;
    if (webhookSecret) {
      const crypto = await import('crypto');
      const rawBody = JSON.stringify(request.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        logger.error('[Goodera Webhook] Signature verification failed');
        return reply.code(401).send({ error: 'Invalid signature' });
      }
    }

    // Parse and validate webhook payload
    let webhook: z.infer<typeof GooderaWebhookSchema>;
    try {
      webhook = GooderaWebhookSchema.parse(request.body);
    } catch (error) {
      logger.error('[Goodera Webhook] Invalid payload:', error);
      return reply.code(400).send({ error: 'Invalid webhook payload' });
    }

    // Log webhook receipt
    await logDeliveryWebhookReceived({
      platform: 'goodera',
      transactionId: webhook.transactionId,
      eventType: webhook.eventType,
      payload: webhook,
    });

    // Update delivery status
    const statusMap: Record<string, 'pending' | 'success' | 'failed' | 'retrying'> = {
      'data.received': 'pending',
      'data.processed': 'success',
      'data.failed': 'failed',
    };

    await updateDeliveryStatus({
      platform: 'goodera',
      transactionId: webhook.transactionId,
      status: statusMap[webhook.eventType] || 'failed',
      errorMessage: webhook.error,
      webhookTimestamp: new Date(webhook.timestamp),
      metadata: {
        recordsProcessed: webhook.recordsProcessed,
      },
    });

    logger.info('[Goodera Webhook] Processed successfully', {
      transactionId: webhook.transactionId,
      eventType: webhook.eventType,
      recordsProcessed: webhook.recordsProcessed,
    });

    return reply.code(200).send({ received: true });
  });

  /**
   * POST /webhooks/workday
   * Receive status updates from Workday
   */
  fastify.post('/webhooks/workday', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-workday-signature'] as string;

    // Verify Workday webhook signature
    const webhookSecret = process.env.WORKDAY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const crypto = await import('crypto');
      const rawBody = JSON.stringify(request.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== `sha256=${expectedSignature}`) {
        logger.error('[Workday Webhook] Signature verification failed');
        return reply.code(401).send({ error: 'Invalid signature' });
      }
    }

    // Parse and validate webhook payload
    let webhook: z.infer<typeof WorkdayWebhookSchema>;
    try {
      webhook = WorkdayWebhookSchema.parse(request.body);
    } catch (error) {
      logger.error('[Workday Webhook] Invalid payload:', error);
      return reply.code(400).send({ error: 'Invalid webhook payload' });
    }

    // Log webhook receipt
    await logDeliveryWebhookReceived({
      platform: 'workday',
      transactionId: webhook.activityId || webhook.enrollmentId || 'unknown',
      eventType: webhook.eventType,
      payload: webhook,
    });

    // Update delivery status
    const status = webhook.status === 'success' ? 'success' : 'failed';
    await updateDeliveryStatus({
      platform: 'workday',
      transactionId: webhook.activityId || webhook.enrollmentId || 'unknown',
      status,
      errorMessage: webhook.status === 'error' ? webhook.message : undefined,
      webhookTimestamp: new Date(webhook.timestamp),
    });

    logger.info('[Workday Webhook] Processed successfully', {
      eventType: webhook.eventType,
      status: webhook.status,
    });

    return reply.code(200).send({ received: true });
  });

  /**
   * GET /webhooks/health
   * Health check for webhook endpoints
   */
  fastify.get('/webhooks/health', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({
      status: 'healthy',
      webhooks: {
        benevity: {
          enabled: !!process.env.BENEVITY_WEBHOOK_SECRET,
          signatureVerification: !!process.env.BENEVITY_WEBHOOK_SECRET,
        },
        goodera: {
          enabled: !!process.env.GOODERA_WEBHOOK_SECRET,
          signatureVerification: !!process.env.GOODERA_WEBHOOK_SECRET,
        },
        workday: {
          enabled: !!process.env.WORKDAY_WEBHOOK_SECRET,
          signatureVerification: !!process.env.WORKDAY_WEBHOOK_SECRET,
        },
      },
    });
  });
}
