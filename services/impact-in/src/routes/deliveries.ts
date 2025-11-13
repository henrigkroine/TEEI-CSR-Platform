import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  getDeliveryHistory,
  getDeliveryById,
  getFailedDeliveries,
  updateDeliveryStatus,
  type Platform
} from '../delivery-log.js';
import { BenevityClient } from '../connectors/benevity/client.js';
import { GooderaClient } from '../connectors/goodera/client.js';
import { WorkdayClient } from '../connectors/workday/client.js';

interface DeliveriesParams {
  companyId: string;
}

interface DeliveriesQuery {
  platform?: Platform;
  limit?: string;
}

interface ReplayParams {
  deliveryId: string;
}

export async function deliveriesRoutes(fastify: FastifyInstance) {
  /**
   * GET /deliveries/:companyId
   * Get delivery log/audit trail for a company
   */
  fastify.get<{
    Params: DeliveriesParams;
    Querystring: DeliveriesQuery;
  }>('/deliveries/:companyId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { companyId } = request.params as DeliveriesParams;
    const { platform, limit } = request.query as DeliveriesQuery;

    try {
      const deliveries = await getDeliveryHistory(
        companyId,
        platform,
        limit ? parseInt(limit) : 100
      );

      return reply.code(200).send({
        companyId,
        platform: platform || 'all',
        count: deliveries.length,
        deliveries,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch delivery history' });
    }
  });

  /**
   * POST /replay/:deliveryId
   * Replay a failed delivery
   */
  fastify.post<{
    Params: ReplayParams;
  }>('/replay/:deliveryId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { deliveryId } = request.params as ReplayParams;

    try {
      // Get the delivery record
      const delivery = await getDeliveryById(deliveryId);

      if (!delivery) {
        return reply.code(404).send({ error: 'Delivery not found' });
      }

      if (delivery.status === 'delivered') {
        return reply.code(400).send({
          error: 'Cannot replay a successful delivery',
          currentStatus: delivery.status
        });
      }

      if (delivery.retries >= 3) {
        return reply.code(400).send({
          error: 'Maximum retry limit reached',
          retries: delivery.retries
        });
      }

      // Update status to retrying
      await updateDeliveryStatus({
        deliveryId,
        status: 'retrying',
        retries: delivery.retries + 1,
      });

      // Get the payload from the sample
      const payload = delivery.payloadSample;

      let result: any;

      // Replay based on platform
      switch (delivery.platform) {
        case 'benevity':
          const benevityClient = new BenevityClient({
            apiKey: process.env.BENEVITY_API_KEY || '',
            webhookUrl: process.env.BENEVITY_WEBHOOK_URL || 'https://api.benevity.com/v1/impact',
            mockMode: process.env.BENEVITY_MOCK_MODE === 'true',
          });
          result = await benevityClient.sendImpactData(payload);
          break;

        case 'goodera':
          const gooderaClient = new GooderaClient({
            apiKey: process.env.GOODERA_API_KEY || '',
            apiUrl: process.env.GOODERA_API_URL || 'https://api.goodera.com/v1',
            mockMode: process.env.GOODERA_MOCK_MODE === 'true',
          });
          result = await gooderaClient.sendImpactData(payload);
          break;

        case 'workday':
          const workdayClient = new WorkdayClient({
            clientId: process.env.WORKDAY_CLIENT_ID || '',
            clientSecret: process.env.WORKDAY_CLIENT_SECRET || '',
            tenantId: process.env.WORKDAY_TENANT_ID || '',
            apiUrl: process.env.WORKDAY_API_URL || 'https://api.workday.com',
            mockMode: process.env.WORKDAY_MOCK_MODE === 'true',
          });
          result = await workdayClient.sendVolunteerData(payload);
          break;

        default:
          return reply.code(400).send({ error: 'Invalid platform' });
      }

      // Update delivery status based on result
      if (result.success) {
        await updateDeliveryStatus({
          deliveryId,
          status: 'delivered',
          retries: delivery.retries + 1,
        });
        return reply.code(200).send({
          success: true,
          deliveryId,
          platform: delivery.platform,
          retries: delivery.retries + 1,
          message: 'Delivery replayed successfully',
          transactionId: result.transactionId,
        });
      } else {
        await updateDeliveryStatus({
          deliveryId,
          status: 'failed',
          errorMsg: result.error,
          retries: delivery.retries + 1,
        });
        return reply.code(500).send({
          success: false,
          deliveryId,
          error: result.error,
          retries: delivery.retries + 1,
        });
      }
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to replay delivery' });
    }
  });

  /**
   * GET /failed
   * Get all failed deliveries
   */
  fastify.get('/failed', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const failedDeliveries = await getFailedDeliveries();

      return reply.code(200).send({
        count: failedDeliveries.length,
        deliveries: failedDeliveries,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch failed deliveries' });
    }
  });
}
