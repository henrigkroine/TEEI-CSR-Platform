import type { FastifyRequest, FastifyReply } from 'fastify';
import { getVISForCompany } from '../calculators/vis.js';

interface VISParams {
  id: string;
}

interface VISQuery {
  period?: string;
  top?: string;
}

export async function getVIS(
  request: FastifyRequest<{ Params: VISParams; Querystring: VISQuery }>,
  reply: FastifyReply
): Promise<void> {
  const { id: companyId } = request.params;
  const { period, top } = request.query;
  const topN = top ? parseInt(top, 10) : 10;

  try {
    const vis = await getVISForCompany(companyId, period || null, topN);
    reply.code(200).send(vis);
  } catch (error) {
    request.log.error(error);
    reply.code(500).send({ error: 'Failed to calculate VIS' });
  }
}
