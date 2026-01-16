/**
 * SROI API Route - Migrated from services/reporting
 * 
 * GET /api/companies/:companyId/sroi?period=2024-Q1
 */
import type { APIRoute } from 'astro';
import { getSROIForCompany } from '@lib/calculators/sroi';

export const GET: APIRoute = async ({ params, url, locals }) => {
  const companyId = params.companyId;
  const period = url.searchParams.get('period') || null;

  if (!companyId) {
    return new Response(
      JSON.stringify({ error: 'Company ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate period format if provided
  if (period && !/^\d{4}-Q[1-4]$/.test(period)) {
    return new Response(
      JSON.stringify({ error: 'Invalid period format. Expected YYYY-Q[1-4]' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get D1 database from Cloudflare runtime
    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sroi = await getSROIForCompany(db, companyId, period);

    return new Response(JSON.stringify(sroi), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // 1 hour cache
      },
    });
  } catch (error) {
    console.error('[SROI API] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to calculate SROI',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
