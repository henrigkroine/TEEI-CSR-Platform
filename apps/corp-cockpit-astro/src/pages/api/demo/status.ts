/**
 * Demo Mode Status API Endpoint
 *
 * GET /api/demo/status
 * Returns demo mode status and CSV file info
 */

import type { APIRoute } from 'astro';
import { isDemoModeEnabled } from '../../../lib/demo/demoConfig';
import { getDemoDataService } from '../../../lib/demo/demoDataService';

export const GET: APIRoute = async () => {
  const enabled = isDemoModeEnabled();

  if (!enabled) {
    return new Response(
      JSON.stringify({
        enabled: false,
        csvExists: false,
        csvPath: '',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  try {
    const service = getDemoDataService();
    const info = service.getCSVInfo();

    return new Response(
      JSON.stringify({
        enabled: true,
        csvExists: info.exists,
        csvPath: info.path,
        lastModified: info.lastModified?.toISOString(),
        size: info.size,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        enabled: true,
        csvExists: false,
        csvPath: '',
        error: error?.message || 'Unknown error',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
