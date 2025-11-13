import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Q2QFeedItem } from '../db/types.js';
import { pool } from '../db/connection.js';

interface Q2QFeedParams {
  id: string;
}

interface Q2QFeedQuery {
  limit?: number;
}

export async function getQ2QFeed(
  request: FastifyRequest<{ Params: Q2QFeedParams; Querystring: Q2QFeedQuery }>,
  reply: FastifyReply
): Promise<void> {
  const { id: companyId } = request.params;
  const limit = request.query.limit || 50;

  const client = await pool.connect();
  try {
    const query = `
      SELECT
        id,
        insight_text,
        confidence,
        created_at,
        dimensions,
        evidence_lineage
      FROM q2q_insights
      WHERE company_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;

    const result = await client.query(query, [companyId, limit]);

    const feed: Q2QFeedItem[] = result.rows.map((row) => ({
      id: row.id,
      insight_text: row.insight_text,
      confidence: parseFloat(row.confidence),
      created_at: row.created_at.toISOString(),
      dimensions: row.dimensions,
      evidence_lineage: row.evidence_lineage,
    }));

    reply.code(200).send({ company_id: companyId, feed });
  } catch (error) {
    request.log.error(error);
    reply.code(500).send({ error: 'Failed to fetch Q2Q feed' });
  } finally {
    client.release();
  }
}
