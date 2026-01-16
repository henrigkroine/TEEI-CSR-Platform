/**
 * Campaigns API - Migrated from services/campaigns
 * 
 * Direct D1 implementation (no microservice proxy)
 * Supports:
 * - GET /api/campaigns - List campaigns with filters
 * - GET /api/campaigns/:id - Get campaign details
 * - POST /api/campaigns/:id/transition - Transition campaign state
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract query parameters
    const companyId = url.searchParams.get('companyId');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];

    if (companyId) {
      conditions.push('company_id = ?');
      params.push(companyId);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query campaigns
    const query = `
      SELECT 
        id,
        name,
        description,
        company_id,
        status,
        start_date,
        end_date,
        quarter,
        target_volunteers,
        target_beneficiaries,
        current_volunteers,
        current_beneficiaries,
        created_at,
        updated_at
      FROM campaigns
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const campaigns = await db.prepare(query).bind(...params).all();

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM campaigns ${whereClause}`;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await db.prepare(countQuery).bind(...countParams).first<{ total: number }>();

    return new Response(
      JSON.stringify({
        success: true,
        campaigns: campaigns.results || [],
        pagination: {
          total: countResult?.total || 0,
          limit,
          offset,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[API/Campaigns] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch campaigns',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
