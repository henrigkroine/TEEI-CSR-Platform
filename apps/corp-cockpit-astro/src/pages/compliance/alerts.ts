/**
 * Compliance Alerts API Proxy
 *
 * Proxies requests to the reporting service compliance alerts endpoint.
 */

import type { APIRoute } from 'astro';

const REPORTING_SERVICE_URL = import.meta.env.PUBLIC_REPORTING_API_URL ||
  process.env.REPORTING_SERVICE_URL ||
  'http://localhost:4017';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const companyId = url.searchParams.get('companyId');

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
    const backendUrl = new URL('/compliance/alerts', REPORTING_SERVICE_URL);
    backendUrl.searchParams.set('companyId', companyId);

    // Make request to reporting service
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
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[API/Compliance] Backend error:', response.status, errorText);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch compliance alerts from backend',
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
    console.error('[API/Compliance] Proxy error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to connect to compliance service',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
