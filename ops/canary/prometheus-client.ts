/**
 * Prometheus Client for Canary Metrics
 */

import axios, { AxiosInstance } from 'axios';

export interface PrometheusConfig {
  url: string;
  timeout?: number;
}

export interface QueryResult {
  metric: Record<string, string>;
  value: [number, string];
}

export class Prometheus {
  private client: AxiosInstance;

  constructor(config: PrometheusConfig) {
    this.client = axios.create({
      baseURL: config.url,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  /**
   * Execute instant query and return single value
   */
  async queryInstant(query: string): Promise<number> {
    try {
      const response = await this.client.get('/api/v1/query', {
        params: { query }
      });

      if (response.data.status !== 'success') {
        throw new Error(`Prometheus query failed: ${response.data.error}`);
      }

      const result = response.data.data.result;
      if (!result || result.length === 0) {
        return 0;
      }

      // Return first result value
      const value = parseFloat(result[0].value[1]);
      return isNaN(value) ? 0 : value;
    } catch (error) {
      console.error(`[Prometheus] Query error: ${query}`, error);
      return 0;
    }
  }

  /**
   * Execute range query
   */
  async queryRange(
    query: string,
    start: number,
    end: number,
    step: number
  ): Promise<QueryResult[]> {
    try {
      const response = await this.client.get('/api/v1/query_range', {
        params: {
          query,
          start,
          end,
          step
        }
      });

      if (response.data.status !== 'success') {
        throw new Error(`Prometheus query failed: ${response.data.error}`);
      }

      return response.data.data.result;
    } catch (error) {
      console.error(`[Prometheus] Range query error: ${query}`, error);
      return [];
    }
  }
}
