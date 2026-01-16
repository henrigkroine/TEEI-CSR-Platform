/**
 * Campaign State Transition API - Migrated from services/campaigns
 * 
 * POST /api/campaigns/:id/transition
 */
import type { APIRoute } from 'astro';

const VALID_STATUSES = ['draft', 'planned', 'recruiting', 'active', 'paused', 'completed', 'closed'];
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['planned', 'closed'],
  planned: ['recruiting', 'closed'],
  recruiting: ['active', 'closed'],
  active: ['paused', 'completed'],
  paused: ['active', 'closed'],
  completed: ['closed'],
  closed: [], // Terminal state
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  const id = params.id;

  if (!id) {
    return new Response(
      JSON.stringify({ success: false, error: 'Campaign ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const { targetStatus, notes } = body;

    if (!targetStatus || !VALID_STATUSES.includes(targetStatus)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid target status' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get current campaign
    const campaign = await db.prepare(
      'SELECT * FROM campaigns WHERE id = ?'
    ).bind(id).first<{ status: string; internal_notes?: string }>();

    if (!campaign) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campaign not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate transition
    const currentStatus = campaign.status;
    const allowedTargets = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedTargets.includes(targetStatus)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid state transition',
          message: `Cannot transition from '${currentStatus}' to '${targetStatus}'`,
          allowedTargets,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update campaign status
    const updatedNotes = notes
      ? `${campaign.internal_notes || ''}\n[${new Date().toISOString()}] Transition to ${targetStatus}: ${notes}`
      : campaign.internal_notes;

    await db.prepare(
      'UPDATE campaigns SET status = ?, internal_notes = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(targetStatus, updatedNotes, id).run();

    const updated = await db.prepare(
      'SELECT * FROM campaigns WHERE id = ?'
    ).bind(id).first();

    return new Response(
      JSON.stringify({
        success: true,
        message: `Campaign transitioned from '${currentStatus}' to '${targetStatus}'`,
        campaign: updated,
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
        error: 'Failed to transition campaign state',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
