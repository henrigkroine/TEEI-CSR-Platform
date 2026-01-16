/**
 * Campaign Details API - Migrated from services/campaigns
 * 
 * GET /api/campaigns/:id - Get campaign details
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, locals }) => {
  const id = params.id;

  if (!id) {
    return new Response(
      JSON.stringify({ success: false, error: 'Campaign ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const campaign = await db.prepare(
      'SELECT * FROM campaigns WHERE id = ?'
    ).bind(id).first();

    if (!campaign) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campaign not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, campaign }),
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
        error: 'Failed to fetch campaign',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
