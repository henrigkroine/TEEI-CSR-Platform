import type { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/connection.js';

interface ExportQuery {
  format?: 'csv' | 'json';
  period?: string;
}

export async function exportCSRD(
  request: FastifyRequest<{ Querystring: ExportQuery }>,
  reply: FastifyReply
): Promise<void> {
  const { format = 'json', period } = request.query;

  const client = await pool.connect();
  try {
    // Fetch comprehensive CSRD data
    const query = period
      ? `
        SELECT
          c.name as company_name,
          c.industry,
          COUNT(DISTINCT v.id) as total_volunteers,
          COALESCE(SUM(vh.hours), 0) as total_hours,
          AVG(os.score) FILTER (WHERE os.dimension = 'integration') as avg_integration,
          AVG(os.score) FILTER (WHERE os.dimension = 'language') as avg_language,
          AVG(os.score) FILTER (WHERE os.dimension = 'job_readiness') as avg_job_readiness
        FROM companies c
        LEFT JOIN volunteers v ON v.company_id = c.id AND v.is_active = true
        LEFT JOIN volunteer_hours vh ON vh.volunteer_id = v.id
          AND EXTRACT(YEAR FROM vh.session_date) = ${period.split('-Q')[0]}
          AND EXTRACT(QUARTER FROM vh.session_date) = ${period.split('-Q')[1]}
        LEFT JOIN outcome_scores os ON os.company_id = c.id AND os.quarter = '${period}'
        WHERE c.is_active = true
        GROUP BY c.id, c.name, c.industry
        ORDER BY c.name;
      `
      : `
        SELECT
          c.name as company_name,
          c.industry,
          COUNT(DISTINCT v.id) as total_volunteers,
          COALESCE(SUM(vh.hours), 0) as total_hours,
          AVG(os.score) FILTER (WHERE os.dimension = 'integration') as avg_integration,
          AVG(os.score) FILTER (WHERE os.dimension = 'language') as avg_language,
          AVG(os.score) FILTER (WHERE os.dimension = 'job_readiness') as avg_job_readiness
        FROM companies c
        LEFT JOIN volunteers v ON v.company_id = c.id AND v.is_active = true
        LEFT JOIN volunteer_hours vh ON vh.volunteer_id = v.id
        LEFT JOIN outcome_scores os ON os.company_id = c.id
        WHERE c.is_active = true
        GROUP BY c.id, c.name, c.industry
        ORDER BY c.name;
      `;

    const result = await client.query(query);

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Company Name',
        'Industry',
        'Total Volunteers',
        'Total Hours',
        'Avg Integration',
        'Avg Language',
        'Avg Job Readiness',
      ];
      const csvRows = [headers.join(',')];

      for (const row of result.rows) {
        const csvRow = [
          `"${row.company_name}"`,
          `"${row.industry || 'N/A'}"`,
          row.total_volunteers,
          parseFloat(row.total_hours).toFixed(2),
          row.avg_integration ? parseFloat(row.avg_integration).toFixed(2) : 'N/A',
          row.avg_language ? parseFloat(row.avg_language).toFixed(2) : 'N/A',
          row.avg_job_readiness ? parseFloat(row.avg_job_readiness).toFixed(2) : 'N/A',
        ];
        csvRows.push(csvRow.join(','));
      }

      const csv = csvRows.join('\n');
      reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename="csrd_export_${period || 'all-time'}.csv"`)
        .code(200)
        .send(csv);
    } else {
      // JSON format
      const data = result.rows.map((row) => ({
        company_name: row.company_name,
        industry: row.industry,
        total_volunteers: parseInt(row.total_volunteers, 10),
        total_hours: parseFloat(row.total_hours),
        outcomes: {
          integration: row.avg_integration ? parseFloat(row.avg_integration).toFixed(2) : null,
          language: row.avg_language ? parseFloat(row.avg_language).toFixed(2) : null,
          job_readiness: row.avg_job_readiness ? parseFloat(row.avg_job_readiness).toFixed(2) : null,
        },
      }));

      reply
        .header('Content-Type', 'application/json')
        .header(
          'Content-Disposition',
          `attachment; filename="csrd_export_${period || 'all-time'}.json"`
        )
        .code(200)
        .send({ period: period || 'all-time', data });
    }
  } catch (error) {
    request.log.error(error);
    reply.code(500).send({ error: 'Failed to export CSRD data' });
  } finally {
    client.release();
  }
}
