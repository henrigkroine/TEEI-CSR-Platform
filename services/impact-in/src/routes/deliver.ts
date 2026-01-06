import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { BenevityClient } from '../connectors/benevity/client.js';
import { mapToBenevity, TEEIMetricsSchema } from '../connectors/benevity/mapper.js';
import { GooderaClient } from '../connectors/goodera/client.js';
import { mapToGoodera } from '../connectors/goodera/mapper.js';
import { WorkdayClient } from '../connectors/workday/client.js';
import { mapToWorkday } from '../connectors/workday/mapper.js';
import {
  logDelivery,
  updateDeliveryStatus,
  generatePayloadHash,
  isPayloadDelivered,
  type Platform
} from '../delivery-log.js';
import { isPlatformEnabled } from '../feature-flags.js';

const DeliverRequestSchema = z.object({
  metrics: TEEIMetricsSchema,
  organizationId: z.string().optional(),
  programId: z.string().optional(),
  programName: z.string().optional(),
});

type DeliverRequest = z.infer<typeof DeliverRequestSchema>;

interface DeliverParams {
  platform: Platform;
  companyId: string;
}

export async function deliverRoutes(fastify: FastifyInstance) {
  /**
   * POST /deliver/:platform/:companyId
   * Trigger delivery to a specific platform
   */
  fastify.post<{
    Params: DeliverParams;
    Body: DeliverRequest;
  }>('/deliver/:platform/:companyId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { platform, companyId } = request.params as DeliverParams;
    const body = request.body as DeliverRequest;

    // Validate platform
    if (!['benevity', 'goodera', 'workday'].includes(platform)) {
      return reply.code(400).send({ error: 'Invalid platform' });
    }

    // Check if platform is enabled
    const enabled = await isPlatformEnabled(companyId, platform);
    if (!enabled) {
      return reply.code(403).send({
        error: `Platform ${platform} is not enabled for this company`,
        hint: 'Enable it via feature flags endpoint'
      });
    }

    // Validate request body
    try {
      DeliverRequestSchema.parse(body);
    } catch (error) {
      return reply.code(400).send({ error: 'Invalid request body', details: error });
    }

    const { metrics, organizationId, programId, programName } = body;

    // Ensure companyId matches
    if (metrics.companyId !== companyId) {
      return reply.code(400).send({ error: 'Company ID mismatch' });
    }

    let deliveryId: string;
    let payload: any;

    try {
      // Map to platform-specific format
      switch (platform) {
        case 'benevity':
          payload = mapToBenevity(
            metrics,
            organizationId || companyId,
            programId,
            programName
          );

          // Check for duplicate
          const benevityHash = generatePayloadHash(payload);
          if (await isPayloadDelivered(companyId, platform, benevityHash)) {
            return reply.code(409).send({
              error: 'Duplicate delivery detected',
              message: 'This payload has already been delivered'
            });
          }

          // Log delivery attempt
          deliveryId = await logDelivery({
            companyId,
            platform,
            payload,
            status: 'pending',
          });

          // Send to Benevity
          const benevityClient = new BenevityClient({
            apiKey: process.env.BENEVITY_API_KEY || '',
            webhookUrl: process.env.BENEVITY_WEBHOOK_URL || 'https://api.benevity.com/v1/impact',
            mockMode: process.env.BENEVITY_MOCK_MODE === 'true',
          });

          const benevityResult = await benevityClient.sendImpactData(payload);

          if (benevityResult.success) {
            await updateDeliveryStatus({
              deliveryId,
              status: 'delivered',
            });
            return reply.code(200).send({
              success: true,
              deliveryId,
              platform,
              transactionId: benevityResult.transactionId,
              message: benevityResult.message,
            });
          } else {
            await updateDeliveryStatus({
              deliveryId,
              status: 'failed',
              errorMsg: benevityResult.error,
            });
            return reply.code(500).send({
              success: false,
              deliveryId,
              error: benevityResult.error,
            });
          }

        case 'goodera':
          payload = mapToGoodera(
            metrics,
            organizationId || companyId,
            programId
          );

          const gooderaHash = generatePayloadHash(payload);
          if (await isPayloadDelivered(companyId, platform, gooderaHash)) {
            return reply.code(409).send({
              error: 'Duplicate delivery detected',
              message: 'This payload has already been delivered'
            });
          }

          deliveryId = await logDelivery({
            companyId,
            platform,
            payload,
            status: 'pending',
          });

          const gooderaClient = new GooderaClient({
            apiKey: process.env.GOODERA_API_KEY || '',
            apiUrl: process.env.GOODERA_API_URL || 'https://api.goodera.com/v1',
            mockMode: process.env.GOODERA_MOCK_MODE === 'true',
          });

          const gooderaResult = await gooderaClient.sendImpactData(payload);

          if (gooderaResult.success) {
            await updateDeliveryStatus({
              deliveryId,
              status: 'delivered',
            });
            return reply.code(200).send({
              success: true,
              deliveryId,
              platform,
              transactionId: gooderaResult.transactionId,
              message: gooderaResult.message,
            });
          } else {
            await updateDeliveryStatus({
              deliveryId,
              status: 'failed',
              errorMsg: gooderaResult.error,
            });
            return reply.code(500).send({
              success: false,
              deliveryId,
              error: gooderaResult.error,
            });
          }

        case 'workday':
          payload = mapToWorkday(
            metrics,
            organizationId || companyId,
            programId,
            programName
          );

          const workdayHash = generatePayloadHash(payload);
          if (await isPayloadDelivered(companyId, platform, workdayHash)) {
            return reply.code(409).send({
              error: 'Duplicate delivery detected',
              message: 'This payload has already been delivered'
            });
          }

          deliveryId = await logDelivery({
            companyId,
            platform,
            payload,
            status: 'pending',
          });

          const workdayClient = new WorkdayClient({
            clientId: process.env.WORKDAY_CLIENT_ID || '',
            clientSecret: process.env.WORKDAY_CLIENT_SECRET || '',
            tenantId: process.env.WORKDAY_TENANT_ID || '',
            apiUrl: process.env.WORKDAY_API_URL || 'https://api.workday.com',
            mockMode: process.env.WORKDAY_MOCK_MODE === 'true',
          });

          const workdayResult = await workdayClient.sendVolunteerData(payload);

          if (workdayResult.success) {
            await updateDeliveryStatus({
              deliveryId,
              status: 'delivered',
            });
            return reply.code(200).send({
              success: true,
              deliveryId,
              platform,
              transactionId: workdayResult.transactionId,
              message: workdayResult.message,
            });
          } else {
            await updateDeliveryStatus({
              deliveryId,
              status: 'failed',
              errorMsg: workdayResult.error,
            });
            return reply.code(500).send({
              success: false,
              deliveryId,
              error: workdayResult.error,
            });
          }
      }
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error', details: (error as Error).message });
    }
  });
}
