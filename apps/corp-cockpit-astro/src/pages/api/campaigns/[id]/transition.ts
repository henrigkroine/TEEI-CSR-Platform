/**
 * Campaign Transition API Proxy
 * SWARM 6: Agent 6.1 - Campaign list UI
 *
 * Proxies campaign state transition requests to the campaigns service.
 */

import type { APIRoute } from 'astro';

const CAMPAIGNS_SERVICE_URL =
  import.meta.env.CAMPAIGNS_SERVICE_URL ||
  process.env.CAMPAIGNS_SERVICE_URL ||
  'http://localhost:3002';

export const POST: APIRoute = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Campaign ID is required',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Parse request body
    const body = await request.json();

    // Build backend URL
    const backendUrl = `${CAMPAIGNS_SERVICE_URL}/campaigns/${id}/transition`;

    // Make request to campaigns service
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward auth headers if present
        ...(request.headers.get('Authorization') && {
          'Authorization': request.headers.get('Authorization')!
        }),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API/Campaigns/Transition] Backend error:', response.status, errorText);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to transition campaign',
          details: errorText,
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[API/Campaigns/Transition] Proxy error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to connect to campaigns service',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
