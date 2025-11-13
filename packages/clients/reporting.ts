/**
 * Typed TypeScript client for Analytics/Reporting Service
 * Auto-generated types based on API contracts
 */

export interface MetricsResponse {
  success: boolean;
  metrics: {
    sroi: number;
    vis: number;
    totalParticipants: number;
    totalSessions: number;
    avgEngagement: number;
    impactScore: number;
  };
  period: {
    start: string;
    end: string;
  };
}

export interface CohortMetricsResponse {
  success: boolean;
  cohort: string;
  metrics: {
    participantCount: number;
    avgSROI: number;
    avgVIS: number;
    completionRate: number;
  };
}

export interface StreamDataPoint {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface StreamResponse {
  success: boolean;
  stream: string;
  data: StreamDataPoint[];
}

export class ReportingClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get metrics for a company
   */
  async getMetrics(
    companyId: string,
    params?: {
      start?: string;
      end?: string;
      program?: string;
    }
  ): Promise<MetricsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.start) queryParams.set('start', params.start);
    if (params?.end) queryParams.set('end', params.end);
    if (params?.program) queryParams.set('program', params.program);

    const query = queryParams.toString();
    const path = `/v1/metrics/${companyId}${query ? `?${query}` : ''}`;

    return this.request<MetricsResponse>(path);
  }

  /**
   * Get SROI (Social Return on Investment)
   */
  async getSROI(companyId: string): Promise<{ success: boolean; sroi: number }> {
    return this.request<{ success: boolean; sroi: number }>(
      `/v1/metrics/${companyId}/sroi`
    );
  }

  /**
   * Get VIS (Volunteer Impact Score)
   */
  async getVIS(companyId: string): Promise<{ success: boolean; vis: number }> {
    return this.request<{ success: boolean; vis: number }>(
      `/v1/metrics/${companyId}/vis`
    );
  }

  /**
   * Get cohort metrics
   */
  async getCohortMetrics(
    companyId: string,
    cohort: string
  ): Promise<CohortMetricsResponse> {
    return this.request<CohortMetricsResponse>(
      `/v1/cohort/${companyId}/${cohort}`
    );
  }

  /**
   * Subscribe to real-time stream
   * Returns EventSource for SSE connection
   */
  streamMetrics(
    companyId: string,
    onData: (data: StreamDataPoint) => void,
    onError?: (error: Error) => void
  ): EventSource {
    const url = `${this.baseUrl}/v1/stream/${companyId}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onData(data);
      } catch (error) {
        if (onError) {
          onError(new Error('Failed to parse stream data'));
        }
      }
    };

    eventSource.onerror = (error) => {
      if (onError) {
        onError(new Error('Stream connection error'));
      }
    };

    return eventSource;
  }
}

// Export singleton instance
export function createReportingClient(
  baseUrl: string = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3004',
  apiKey?: string
): ReportingClient {
  return new ReportingClient(baseUrl, apiKey);
}
