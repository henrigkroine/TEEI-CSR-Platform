/**
 * Demo Metrics API Endpoint
 *
 * GET /api/demo/metrics
 * Returns normalized demo metrics from CSV
 */

import type { APIRoute } from 'astro';
import { getDemoDataService } from '../../../lib/demo/demoDataService';
import { isDemoModeEnabled } from '../../../lib/demo/demoConfig';

export const GET: APIRoute = async () => {
  // Check if demo mode is enabled
  if (!isDemoModeEnabled()) {
    return new Response(
      JSON.stringify({
        error: 'Demo mode is not enabled',
        enabled: false,
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  try {
    const service = getDemoDataService();
    const metrics = service.getMetrics();

    return new Response(JSON.stringify(metrics), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to load demo metrics';
    const statusCode = errorMessage.includes('not found') ? 404 : 500;

    let csvPath = '';
    try {
      const service = getDemoDataService();
      csvPath = service.getCSVInfo().path;
    } catch {
      // Ignore error getting CSV info
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        enabled: true,
        csvPath,
      }),
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
