/**
 * Dashboard Polling API - Replaces SSE
 * 
 * Returns latest dashboard updates for a company.
 * GET /api/polling/dashboard?companyId=xxx&lastEventId=yyy
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, locals }) => {
  const companyId = url.searchParams.get('companyId');
  const lastEventId = url.searchParams.get('lastEventId');

  if (!companyId) {
    return new Response(
      JSON.stringify({ error: 'Company ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const db = locals.runtime?.env?.DB;
    
    // For now, return empty events array
    // In a full implementation, you would:
    // 1. Query D1 for new events since lastEventId
    // 2. Check for metric updates, report generation, etc.
    // 3. Return events in SSE-compatible format
    
    // Example: Query for recent metric updates
    // This is a simplified version - you'd want to track events in a separate table
    const events: any[] = [];

    // If we had an events table, we'd do:
    // const query = lastEventId
    //   ? `SELECT * FROM dashboard_events WHERE company_id = ? AND id > ? ORDER BY created_at DESC LIMIT 50`
    //   : `SELECT * FROM dashboard_events WHERE company_id = ? ORDER BY created_at DESC LIMIT 50`;
    // const result = await db.prepare(query).bind(companyId, lastEventId || '').all();

    // For now, return a simple heartbeat event to keep connection alive
    const heartbeatEvent = {
      id: `heartbeat-${Date.now()}`,
      type: 'heartbeat',
      timestamp: Date.now(),
      companyId,
      data: {
        message: 'polling_active',
      },
    };

    return new Response(
      JSON.stringify({
        events: events.length > 0 ? events : [heartbeatEvent],
        lastEventId: events.length > 0 ? events[0].id : heartbeatEvent.id,
        timestamp: Date.now(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[Polling API] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch dashboard updates',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
