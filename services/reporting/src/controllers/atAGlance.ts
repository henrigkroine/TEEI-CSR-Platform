import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AtAGlanceResponse } from '../db/types.js';
import { pool } from '../db/connection.js';

interface AtAGlanceParams {
  id: string;
}

interface AtAGlanceQuery {
  period?: string;
}

export async function getAtAGlance(
  request: FastifyRequest<{ Params: AtAGlanceParams; Querystring: AtAGlanceQuery }>,
  reply: FastifyReply
): Promise<void> {
  const { id: companyId } = request.params;
  const { period } = request.query;

  const client = await pool.connect();
  try {
    // Build date filter
    const dateFilter = period
      ? `AND EXTRACT(YEAR FROM vh.session_date) = ${period.split('-Q')[0]}
         AND EXTRACT(QUARTER FROM vh.session_date) = ${period.split('-Q')[1]}`
      : '';

    // Fetch inputs
    const inputsQuery = `
      SELECT
        COUNT(DISTINCT v.id) as total_volunteers,
        COALESCE(SUM(vh.hours), 0) as total_hours,
        COUNT(DISTINCT s.id) as total_sessions,
        COUNT(DISTINCT s.participant_id) as active_participants
      FROM volunteers v
      LEFT JOIN volunteer_hours vh ON vh.volunteer_id = v.id ${dateFilter}
      LEFT JOIN sessions s ON s.volunteer_id = v.id ${dateFilter}
      WHERE v.company_id = $1 AND v.is_active = true;
    `;

    const inputsResult = await client.query(inputsQuery, [companyId]);
    const inputs = inputsResult.rows[0];

    // Fetch outcomes
    const outcomesQuery = period
      ? `
        SELECT dimension, AVG(score) as avg_score
        FROM outcome_scores
        WHERE company_id = $1 AND quarter = $2
        GROUP BY dimension
      `
      : `
        SELECT dimension, AVG(score) as avg_score
        FROM outcome_scores
        WHERE company_id = $1
        GROUP BY dimension
      `;

    const outcomesParams = period ? [companyId, period] : [companyId];
    const outcomesResult = await client.query(outcomesQuery, outcomesParams);

    const outcomes = {
      integration_avg: 0,
      language_avg: 0,
      job_readiness_avg: 0,
    };

    for (const row of outcomesResult.rows) {
      const score = parseFloat(row.avg_score);
      switch (row.dimension) {
        case 'integration':
          outcomes.integration_avg = parseFloat(score.toFixed(2));
          break;
        case 'language':
          outcomes.language_avg = parseFloat(score.toFixed(2));
          break;
        case 'job_readiness':
          outcomes.job_readiness_avg = parseFloat(score.toFixed(2));
          break;
      }
    }

    const response: AtAGlanceResponse = {
      period: period || 'all-time',
      company_id: companyId,
      inputs: {
        total_volunteers: parseInt(inputs.total_volunteers, 10),
        total_hours: parseFloat(inputs.total_hours),
        total_sessions: parseInt(inputs.total_sessions, 10),
        active_participants: parseInt(inputs.active_participants, 10),
      },
      outcomes,
    };

    reply.code(200).send(response);
  } catch (error) {
    request.log.error(error);
    reply.code(500).send({ error: 'Failed to fetch at-a-glance data' });
  } finally {
    client.release();
  }
}
