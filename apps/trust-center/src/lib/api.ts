import type { PublicPublicationResponse } from '@teei/shared-types';

const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Fetch publication by slug
 */
export async function fetchPublicationBySlug(
  slug: string,
  token?: string
): Promise<PublicPublicationResponse | null> {
  try {
    const url = new URL(`${API_BASE_URL}/public/publications/${slug}`);
    if (token) {
      url.searchParams.set('token', token);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Failed to fetch publication:', error);
    return null;
  }
}
