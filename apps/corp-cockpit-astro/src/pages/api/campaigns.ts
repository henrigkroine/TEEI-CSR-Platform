/**
 * Campaigns API Proxy
 * SWARM 6: Agent 6.1, 6.4 - Campaign list UI and filter integration
 *
 * Proxies requests to the campaigns service backend.
 * Supports:
 * - GET /api/campaigns - List campaigns with filters
 * - GET /api/campaigns/:id - Get campaign details
 * - POST /api/campaigns/:id/transition - Transition campaign state
 */

import type { APIRoute } from 'astro';

const CAMPAIGNS_SERVICE_URL =
  import.meta.env.CAMPAIGNS_SERVICE_URL ||
  process.env.CAMPAIGNS_SERVICE_URL ||
  'http://localhost:3002';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Extract query parameters
    const queryParams = url.searchParams;

    // Build backend URL
    const backendUrl = new URL('/campaigns', CAMPAIGNS_SERVICE_URL);

    // Forward all query parameters
    queryParams.forEach((value, key) => {
      backendUrl.searchParams.append(key, value);
    });

    // Make request to campaigns service
    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward auth headers if present
        ...(request.headers.get('Authorization') && {
          'Authorization': request.headers.get('Authorization')!
        }),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API/Campaigns] Backend error:', response.status, errorText);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch campaigns from backend',
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
    console.error('[API/Campaigns] Proxy error:', error);

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
