import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { verifyApiKey } from '../impact-in/apiKeys.js';
import { mapToBenevity } from '../impact-in/mappers/benevity.js';
import { mapToGoodera } from '../impact-in/mappers/goodera.js';
import { mapToWorkday } from '../impact-in/mappers/workday.js';
import { pool } from '../db/connection.js';
import { getSROIForCompany } from '../calculators/sroi.js';

async function authenticateRequest(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing or invalid authorization header' });
    return null;
  }

  const apiKey = authHeader.substring(7);
  const auth = await verifyApiKey(apiKey);

  if (!auth) {
    reply.code(401).send({ error: 'Invalid API key' });
    return null;
  }

  return auth.companyId;
}

export const impactInRoutes: FastifyPluginAsync = async (fastify) => {
  // Push to Benevity
  fastify.post('/impact-in/benevity', {
    schema: {
      description: 'Push impact data to Benevity format',
      tags: ['impact-in'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer {api_key}' },
        },
        required: ['authorization'],
      },
      body: {
        type: 'object',
        properties: {
          period: { type: 'string', pattern: '^\\d{4}-Q[1-4]$' },
        },
      },
    },
    handler: async (request, reply) => {
      const companyId = await authenticateRequest(request, reply);
      if (!companyId) return;

      const { period } = request.body as { period?: string };

      try {
        // Fetch company data
        const client = await pool.connect();
        try {
          const atAGlanceQuery = `
            SELECT
              COUNT(DISTINCT v.id) as total_volunteers,
              COALESCE(SUM(vh.hours), 0) as total_hours,
              COUNT(DISTINCT s.participant_id) as active_participants
            FROM volunteers v
            LEFT JOIN volunteer_hours vh ON vh.volunteer_id = v.id
            LEFT JOIN sessions s ON s.volunteer_id = v.id
            WHERE v.company_id = $1
          `;

          const result = await client.query(atAGlanceQuery, [companyId]);
          const sroi = await getSROIForCompany(companyId, period || null);

          const payload = mapToBenevity({
            companyId,
            period: period || 'all-time',
            volunteers: parseInt(result.rows[0].total_volunteers, 10),
            hours: parseFloat(result.rows[0].total_hours),
            participants: parseInt(result.rows[0].active_participants, 10),
            socialValue: sroi.breakdown.total_social_value,
            sroiRatio: sroi.sroi_ratio,
          });

          reply.code(200).send({
            success: true,
            provider: 'benevity',
            payload,
            message: 'Data mapped successfully. Use this payload to push to Benevity API.',
          });
        } finally {
          client.release();
        }
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to generate Benevity payload' });
      }
    },
  });

  // Push to Goodera
  fastify.post('/impact-in/goodera', {
    schema: {
      description: 'Push impact data to Goodera format',
      tags: ['impact-in'],
    },
    handler: async (request, reply) => {
      const companyId = await authenticateRequest(request, reply);
      if (!companyId) return;

      const { period } = request.body as { period?: string };

      try {
        const client = await pool.connect();
        try {
          const companyQuery = await client.query('SELECT name FROM companies WHERE id = $1', [companyId]);
          const companyName = companyQuery.rows[0]?.name || 'Unknown Company';

          const metricsQuery = `
            SELECT
              COUNT(DISTINCT v.id) as total_volunteers,
              COALESCE(SUM(vh.hours), 0) as total_hours,
              AVG(os.score) FILTER (WHERE os.dimension = 'integration') as integration,
              AVG(os.score) FILTER (WHERE os.dimension = 'language') as language,
              AVG(os.score) FILTER (WHERE os.dimension = 'job_readiness') as job_readiness
            FROM volunteers v
            LEFT JOIN volunteer_hours vh ON vh.volunteer_id = v.id
            LEFT JOIN outcome_scores os ON os.company_id = v.company_id
            WHERE v.company_id = $1
          `;

          const result = await client.query(metricsQuery, [companyId]);

          const payload = mapToGoodera({
            companyId,
            companyName,
            period: period || 'all-time',
            volunteers: parseInt(result.rows[0].total_volunteers, 10),
            hours: parseFloat(result.rows[0].total_hours),
            outcomes: {
              integration: parseFloat(result.rows[0].integration || 0),
              language: parseFloat(result.rows[0].language || 0),
              jobReadiness: parseFloat(result.rows[0].job_readiness || 0),
            },
          });

          reply.code(200).send({
            success: true,
            provider: 'goodera',
            payload,
            message: 'Data mapped successfully. Use this payload to push to Goodera API.',
          });
        } finally {
          client.release();
        }
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to generate Goodera payload' });
      }
    },
  });

  // Push to Workday
  fastify.post('/impact-in/workday', {
    schema: {
      description: 'Push impact data to Workday format',
      tags: ['impact-in'],
    },
    handler: async (request, reply) => {
      const companyId = await authenticateRequest(request, reply);
      if (!companyId) return;

      const { period } = request.body as { period?: string };

      try {
        const client = await pool.connect();
        try {
          const metricsQuery = `
            SELECT
              COUNT(DISTINCT v.id) as total_volunteers,
              COALESCE(SUM(vh.hours), 0) as total_hours,
              COUNT(DISTINCT s.participant_id) as active_participants,
              AVG(os.score) FILTER (WHERE os.dimension = 'integration') as integration,
              AVG(os.score) FILTER (WHERE os.dimension = 'language') as language,
              AVG(os.score) FILTER (WHERE os.dimension = 'job_readiness') as job_readiness
            FROM volunteers v
            LEFT JOIN volunteer_hours vh ON vh.volunteer_id = v.id
            LEFT JOIN sessions s ON s.volunteer_id = v.id
            LEFT JOIN outcome_scores os ON os.company_id = v.company_id
            WHERE v.company_id = $1
          `;

          const result = await client.query(metricsQuery, [companyId]);
          const sroi = await getSROIForCompany(companyId, period || null);

          const payload = mapToWorkday({
            companyId,
            period: period || '2025-Q1',
            volunteers: parseInt(result.rows[0].total_volunteers, 10),
            hours: parseFloat(result.rows[0].total_hours),
            participants: parseInt(result.rows[0].active_participants, 10),
            sroiRatio: sroi.sroi_ratio,
            outcomes: {
              integration: parseFloat(result.rows[0].integration || 0),
              language: parseFloat(result.rows[0].language || 0),
              jobReadiness: parseFloat(result.rows[0].job_readiness || 0),
            },
          });

          reply.code(200).send({
            success: true,
            provider: 'workday',
            payload,
            message: 'Data mapped successfully. Use this payload to push to Workday API.',
          });
        } finally {
          client.release();
        }
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to generate Workday payload' });
      }
    },
  });
};
