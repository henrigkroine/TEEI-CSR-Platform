/**
 * SSE Dashboard Proxy
 *
 * Proxies SSE connections to the reporting service.
 * Since EventSource requires same-origin or CORS, we proxy through Astro.
 */

import type { APIRoute } from 'astro';

const REPORTING_SERVICE_URL = import.meta.env.PUBLIC_REPORTING_API_URL ||
  process.env.REPORTING_SERVICE_URL ||
  'http://localhost:4017';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const companyId = url.searchParams.get('companyId');
    const lastEventId = url.searchParams.get('lastEventId');

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Company ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Build backend URL
    const backendUrl = new URL('/api/sse/dashboard', REPORTING_SERVICE_URL);
    backendUrl.searchParams.set('companyId', companyId);
    if (lastEventId) {
      backendUrl.searchParams.set('lastEventId', lastEventId);
    }

    // Fetch from reporting service with streaming
    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        // Forward any auth headers if present
        ...(request.headers.get('Authorization') && {
          'Authorization': request.headers.get('Authorization')!
        }),
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return new Response(
        JSON.stringify({
          error: 'Failed to connect to SSE endpoint',
          details: errorText
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Return streaming response with SSE headers
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        // CORS headers if needed
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  } catch (error) {
    console.error('[SSE Proxy] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to establish SSE connection',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
