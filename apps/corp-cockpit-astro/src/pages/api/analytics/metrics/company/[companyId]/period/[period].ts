/**
 * Analytics Metrics API - Migrated from services/analytics
 * 
 * GET /api/analytics/metrics/company/:companyId/period/:period
 */
import type { APIRoute } from 'astro';

function parsePeriod(period: string): { startDate: string; endDate: string } {
  // Match YYYY-MM format
  const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const [, year, month] = monthMatch;
    const startDate = `${year}-${month}-01`;
    // Get last day of month
    const date = new Date(parseInt(year), parseInt(month), 0);
    const endDate = `${year}-${month}-${date.getDate().toString().padStart(2, '0')}`;
    return { startDate, endDate };
  }

  // Match YYYY-Q[1-4] format
  const quarterMatch = period.match(/^(\d{4})-Q([1-4])$/);
  if (quarterMatch) {
    const [, year, quarter] = quarterMatch;
    const q = parseInt(quarter);
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = q * 3;
    const startDate = `${year}-${startMonth.toString().padStart(2, '0')}-01`;
    const date = new Date(parseInt(year), endMonth, 0);
    const endDate = `${year}-${endMonth.toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    return { startDate, endDate };
  }

  throw new Error(`Invalid period format: ${period}. Expected YYYY-MM or YYYY-Q[1-4]`);
}

export const GET: APIRoute = async ({ params, locals }) => {
  const { companyId, period } = params;

  if (!companyId || !period) {
    return new Response(
      JSON.stringify({ error: 'Company ID and period are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { startDate, endDate } = parsePeriod(period);

    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Query metrics from sroi_snapshots or metrics_company_period table
    // For now, using a simplified query - adjust based on your D1 schema
    const query = `
      SELECT 
        id,
        company_id,
        period,
        total_hours,
        total_value,
        total_volunteers,
        total_beneficiaries,
        sroi_ratio,
        avg_vis_score,
        calculated_at
      FROM sroi_snapshots
      WHERE company_id = ?
        AND period_start >= ?
        AND period_end <= ?
      ORDER BY period_start
    `;

    const metrics = await db.prepare(query).bind(companyId, startDate, endDate).all();

    if (metrics.results?.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No metrics found for the specified period',
          companyId,
          period,
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        companyId,
        period,
        dateRange: { start: startDate, end: endDate },
        metrics: metrics.results || [],
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600', // 1 hour cache
        },
      }
    );
  } catch (error) {
    console.error('[Analytics Metrics] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
