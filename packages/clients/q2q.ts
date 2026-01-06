/**
 * Typed TypeScript client for Q2Q AI Service
 */

export interface ClassificationResult {
  text: string;
  outcomes: Array<{
    taxonomy: string;
    score: number;
    confidence: number;
  }>;
  tags: string[];
  modelUsed: string;
  inferenceTime: number;
}

export interface EvaluationResult {
  evalId: string;
  modelName: string;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  samples: number;
  timestamp: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  version: string;
  provider: string;
  status: 'active' | 'inactive' | 'deprecated';
  config: Record<string, any>;
}

export class Q2QClient {
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
   * Classify text using Q2Q model
   */
  async classifyText(
    text: string,
    companyId?: string
  ): Promise<{ success: boolean; result: ClassificationResult }> {
    return this.request<{ success: boolean; result: ClassificationResult }>(
      '/v1/q2q/classify',
      {
        method: 'POST',
        body: JSON.stringify({ text, companyId }),
      }
    );
  }

  /**
   * Batch classify multiple texts
   */
  async classifyBatch(
    texts: string[],
    companyId?: string
  ): Promise<{ success: boolean; results: ClassificationResult[] }> {
    return this.request<{ success: boolean; results: ClassificationResult[] }>(
      '/v1/q2q/classify/batch',
      {
        method: 'POST',
        body: JSON.stringify({ texts, companyId }),
      }
    );
  }

  /**
   * Get evaluation results
   */
  async getEvalResults(
    evalId?: string
  ): Promise<{ success: boolean; evaluations: EvaluationResult[] }> {
    const path = evalId
      ? `/v1/q2q/eval/${evalId}`
      : '/v1/q2q/eval';

    return this.request<{ success: boolean; evaluations: EvaluationResult[] }>(path);
  }

  /**
   * Get model registry
   */
  async getModelRegistry(): Promise<{ success: boolean; models: ModelInfo[] }> {
    return this.request<{ success: boolean; models: ModelInfo[] }>(
      '/v1/q2q/models'
    );
  }

  /**
   * Get model details
   */
  async getModel(modelId: string): Promise<{ success: boolean; model: ModelInfo }> {
    return this.request<{ success: boolean; model: ModelInfo }>(
      `/v1/q2q/models/${modelId}`
    );
  }
}

export function createQ2QClient(
  baseUrl: string = process.env.Q2Q_SERVICE_URL || 'http://localhost:3007',
  apiKey?: string
): Q2QClient {
  return new Q2QClient(baseUrl, apiKey);
}
