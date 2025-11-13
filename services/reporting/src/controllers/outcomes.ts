import type { FastifyRequest, FastifyReply } from 'fastify';
import type { OutcomesResponse } from '../db/types.js';
import { pool } from '../db/connection.js';

interface OutcomesParams {
  id: string;
}

interface OutcomesQuery {
  dimensions?: string[];
}

export async function getOutcomes(
  request: FastifyRequest<{ Params: OutcomesParams; Querystring: OutcomesQuery }>,
  reply: FastifyReply
): Promise<void> {
  const { id: companyId } = request.params;
  const dimensions = request.query.dimensions || ['integration', 'language', 'job_readiness'];

  const client = await pool.connect();
  try {
    const query = `
      SELECT
        quarter,
        dimension,
        AVG(score) as avg_score
      FROM outcome_scores
      WHERE company_id = $1
        AND dimension = ANY($2)
      GROUP BY quarter, dimension
      ORDER BY quarter ASC;
    `;

    const result = await client.query(query, [companyId, dimensions]);

    // Group by quarter
    const timeSeriesMap = new Map<string, Record<string, number>>();

    for (const row of result.rows) {
      const quarter = row.quarter;
      if (!timeSeriesMap.has(quarter)) {
        timeSeriesMap.set(quarter, {});
      }
      const scores = timeSeriesMap.get(quarter)!;
      scores[row.dimension] = parseFloat(parseFloat(row.avg_score).toFixed(2));
    }

    // Convert to array
    const time_series = Array.from(timeSeriesMap.entries()).map(([quarter, scores]) => ({
      quarter,
      ...scores,
    }));

    const response: OutcomesResponse = {
      company_id: companyId,
      dimensions: dimensions,
      time_series,
    };

    reply.code(200).send(response);
  } catch (error) {
    request.log.error(error);
    reply.code(500).send({ error: 'Failed to fetch outcomes data' });
  } finally {
    client.release();
  }
}
