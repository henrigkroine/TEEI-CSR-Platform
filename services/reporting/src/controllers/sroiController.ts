import type { FastifyRequest, FastifyReply } from 'fastify';
import { getSROIForCompany } from '../calculators/sroi.js';

interface SROIParams {
  id: string;
}

interface SROIQuery {
  period?: string;
}

export async function getSROI(
  request: FastifyRequest<{ Params: SROIParams; Querystring: SROIQuery }>,
  reply: FastifyReply
): Promise<void> {
  const { id: companyId } = request.params;
  const { period } = request.query;

  try {
    const sroi = await getSROIForCompany(companyId, period || null);
    reply.code(200).send(sroi);
  } catch (error) {
    request.log.error(error);
    reply.code(500).send({ error: 'Failed to calculate SROI' });
  }
}
