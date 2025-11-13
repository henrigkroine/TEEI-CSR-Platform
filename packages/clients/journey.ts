/**
 * Typed TypeScript client for Journey Engine Service
 */

export interface JourneyFlag {
  id: string;
  userId: string;
  flagType: string;
  triggered: boolean;
  metadata: Record<string, any>;
  triggeredAt?: string;
}

export interface Milestone {
  id: string;
  userId: string;
  milestoneType: string;
  achieved: boolean;
  achievedAt?: string;
  criteria: Record<string, any>;
}

export interface RuleEvaluation {
  ruleId: string;
  matched: boolean;
  action: string;
  details: Record<string, any>;
}

export class JourneyClient {
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
   * Get journey flags for a user
   */
  async getJourneyFlags(userId: string): Promise<{ success: boolean; flags: JourneyFlag[] }> {
    return this.request<{ success: boolean; flags: JourneyFlag[] }>(
      `/v1/journey/flags/${userId}`
    );
  }

  /**
   * Get milestones for a user
   */
  async getMilestones(userId: string): Promise<{ success: boolean; milestones: Milestone[] }> {
    return this.request<{ success: boolean; milestones: Milestone[] }>(
      `/v1/journey/milestones/${userId}`
    );
  }

  /**
   * Evaluate journey rules for a user
   */
  async evaluateRules(
    userId: string,
    context: Record<string, any>
  ): Promise<{ success: boolean; evaluations: RuleEvaluation[] }> {
    return this.request<{ success: boolean; evaluations: RuleEvaluation[] }>(
      `/v1/journey/evaluate/${userId}`,
      {
        method: 'POST',
        body: JSON.stringify({ context }),
      }
    );
  }
}

export function createJourneyClient(
  baseUrl: string = process.env.JOURNEY_SERVICE_URL || 'http://localhost:3009',
  apiKey?: string
): JourneyClient {
  return new JourneyClient(baseUrl, apiKey);
}
