const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3023';

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

export class ApiClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string = ANALYTICS_SERVICE_URL, token?: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          error: errorData.error || 'API request failed',
          message: errorData.message || response.statusText,
          statusCode: response.status,
        } as ApiError;
      }

      return await response.json();
    } catch (error) {
      if ((error as ApiError).statusCode) {
        throw error;
      }
      throw {
        error: 'Network error',
        message: error instanceof Error ? error.message : 'Unknown error',
      } as ApiError;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.fetch<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.fetch<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.fetch<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.fetch<T>(endpoint, { method: 'DELETE' });
  }
}

// Convenience function to create an API client
export function createApiClient(token?: string): ApiClient {
  return new ApiClient(ANALYTICS_SERVICE_URL, token);
}
