/**
 * Base HTTP Client for TEEI Platform API
 * Handles authentication, error handling, and common request configuration
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { ApiError } from './types';

export interface ClientConfig {
  /**
   * Base URL for the API (e.g., 'https://api.teei.io/v1')
   */
  baseURL: string;

  /**
   * JWT Bearer token for authentication
   */
  token?: string;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Custom headers to include in all requests
   */
  headers?: Record<string, string>;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

export class TEEIClient {
  private axios: AxiosInstance;
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = {
      timeout: 30000,
      debug: false,
      ...config,
    };

    this.axios = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
    });

    // Add request interceptor for auth
    this.axios.interceptors.request.use(
      (config) => {
        if (this.config.token) {
          config.headers.Authorization = `Bearer ${this.config.token}`;
        }

        if (this.config.debug) {
          console.log(`[TEEI SDK] ${config.method?.toUpperCase()} ${config.url}`, {
            params: config.params,
            data: config.data,
          });
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => {
        if (this.config.debug) {
          console.log(`[TEEI SDK] Response ${response.status}`, {
            data: response.data,
            headers: response.headers,
          });
        }
        return response;
      },
      (error: AxiosError<ApiError>) => {
        if (this.config.debug) {
          console.error(`[TEEI SDK] Error ${error.response?.status}`, {
            error: error.response?.data,
          });
        }

        // Transform axios error to API error
        if (error.response) {
          const apiError: ApiError = {
            error: error.response.data?.error || 'Unknown Error',
            message: error.response.data?.message || error.message,
            details: error.response.data?.details,
          };
          throw new TEEIAPIError(apiError, error.response.status);
        }

        throw error;
      }
    );
  }

  /**
   * Get the underlying axios instance
   */
  get http(): AxiosInstance {
    return this.axios;
  }

  /**
   * Update the authentication token
   */
  setToken(token: string): void {
    this.config.token = token;
  }

  /**
   * Remove the authentication token
   */
  clearToken(): void {
    this.config.token = undefined;
  }

  /**
   * Make a GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.get<T>(url, config);
    return response.data;
  }

  /**
   * Make a POST request
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a PUT request
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.put<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.delete<T>(url, config);
    return response.data;
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.patch<T>(url, data, config);
    return response.data;
  }
}

/**
 * Custom error class for TEEI API errors
 */
export class TEEIAPIError extends Error {
  public readonly apiError: ApiError;
  public readonly statusCode: number;

  constructor(apiError: ApiError, statusCode: number) {
    super(apiError.message || apiError.error);
    this.name = 'TEEIAPIError';
    this.apiError = apiError;
    this.statusCode = statusCode;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TEEIAPIError);
    }
  }

  /**
   * Check if error is a specific status code
   */
  is(statusCode: number): boolean {
    return this.statusCode === statusCode;
  }

  /**
   * Check if error is a 400 Bad Request
   */
  isBadRequest(): boolean {
    return this.is(400);
  }

  /**
   * Check if error is a 401 Unauthorized
   */
  isUnauthorized(): boolean {
    return this.is(401);
  }

  /**
   * Check if error is a 403 Forbidden
   */
  isForbidden(): boolean {
    return this.is(403);
  }

  /**
   * Check if error is a 404 Not Found
   */
  isNotFound(): boolean {
    return this.is(404);
  }

  /**
   * Check if error is a 429 Too Many Requests
   */
  isRateLimited(): boolean {
    return this.is(429);
  }

  /**
   * Check if error is a 500 Internal Server Error
   */
  isServerError(): boolean {
    return this.statusCode >= 500;
  }
}
