/**
 * Embedding generation for RAG retrieval
 * Supports multiple providers for generating text embeddings
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface EmbeddingConfig {
  provider: 'openai' | 'voyage' | 'cohere';
  model?: string;
  dimensions?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
  tokenCount?: number;
}

/**
 * Generate embeddings using OpenAI's text-embedding models
 */
export class OpenAIEmbedder {
  private client: OpenAI;
  private model: string;

  constructor(apiKey?: string, model = 'text-embedding-3-small') {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
    this.model = model;
  }

  async embed(text: string, dimensions?: number): Promise<EmbeddingResult> {
    const params: any = {
      model: this.model,
      input: text,
      encoding_format: 'float'
    };

    // text-embedding-3-* models support custom dimensions
    if (dimensions && (this.model.includes('text-embedding-3'))) {
      params.dimensions = dimensions;
    }

    const response = await this.client.embeddings.create(params);

    return {
      embedding: response.data[0].embedding,
      dimensions: response.data[0].embedding.length,
      model: this.model,
      tokenCount: response.usage.total_tokens
    };
  }

  /**
   * Batch embed multiple texts
   */
  async embedBatch(texts: string[], dimensions?: number): Promise<EmbeddingResult[]> {
    const params: any = {
      model: this.model,
      input: texts,
      encoding_format: 'float'
    };

    if (dimensions && this.model.includes('text-embedding-3')) {
      params.dimensions = dimensions;
    }

    const response = await this.client.embeddings.create(params);

    return response.data.map(item => ({
      embedding: item.embedding,
      dimensions: item.embedding.length,
      model: this.model,
      tokenCount: response.usage.total_tokens / texts.length // Approximate
    }));
  }

  /**
   * Estimate cost for embedding generation
   * Pricing as of 2025-01:
   * - text-embedding-3-small: $0.02 / 1M tokens
   * - text-embedding-3-large: $0.13 / 1M tokens
   * - text-embedding-ada-002: $0.10 / 1M tokens
   */
  estimateCost(tokenCount: number): number {
    const pricePerMillion: Record<string, number> = {
      'text-embedding-3-small': 0.02,
      'text-embedding-3-large': 0.13,
      'text-embedding-ada-002': 0.10
    };

    const price = pricePerMillion[this.model] || 0.10;
    return (tokenCount / 1_000_000) * price;
  }
}

/**
 * Voyage AI embeddings (specialized for retrieval)
 */
export class VoyageEmbedder {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api.voyageai.com/v1';

  constructor(apiKey?: string, model = 'voyage-2') {
    this.apiKey = apiKey || process.env.VOYAGE_API_KEY || '';
    this.model = model;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        input: text,
        model: this.model
      })
    });

    if (!response.ok) {
      throw new Error(`Voyage API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      embedding: data.data[0].embedding,
      dimensions: data.data[0].embedding.length,
      model: this.model,
      tokenCount: data.usage?.total_tokens
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        input: texts,
        model: this.model
      })
    });

    if (!response.ok) {
      throw new Error(`Voyage API error: ${response.statusText}`);
    }

    const data = await response.json();

    return data.data.map((item: any) => ({
      embedding: item.embedding,
      dimensions: item.embedding.length,
      model: this.model,
      tokenCount: data.usage?.total_tokens / texts.length
    }));
  }

  /**
   * Voyage pricing: ~$0.12 / 1M tokens (voyage-2)
   */
  estimateCost(tokenCount: number): number {
    return (tokenCount / 1_000_000) * 0.12;
  }
}

/**
 * Factory for creating embedders
 */
export class EmbeddingFactory {
  static create(config: EmbeddingConfig): OpenAIEmbedder | VoyageEmbedder {
    switch (config.provider) {
      case 'openai':
        return new OpenAIEmbedder(undefined, config.model);
      case 'voyage':
        return new VoyageEmbedder(undefined, config.model);
      default:
        // Default to OpenAI text-embedding-3-small (best cost/performance)
        return new OpenAIEmbedder(undefined, 'text-embedding-3-small');
    }
  }

  /**
   * Get default embedder from environment
   */
  static getDefault(): OpenAIEmbedder | VoyageEmbedder {
    const provider = (process.env.EMBEDDING_PROVIDER || 'openai') as 'openai' | 'voyage';
    const model = process.env.EMBEDDING_MODEL;

    return this.create({ provider, model });
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate L2 (Euclidean) distance between two vectors
 */
export function l2Distance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimensions');
  }

  let sumSquares = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sumSquares += diff * diff;
  }

  return Math.sqrt(sumSquares);
}
