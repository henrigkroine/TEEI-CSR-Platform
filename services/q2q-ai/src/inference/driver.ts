import { randomUUID } from 'crypto';
import {
  AIProvider,
  AIProviderAdapter,
  InferenceRequest,
  InferenceResult,
  ProviderNotConfiguredError
} from './types.js';
import { ClaudeProvider } from './providers/claude.js';
import { OpenAIProvider } from './providers/openai.js';
import { GeminiProvider } from './providers/gemini.js';

/**
 * Main inference driver that coordinates AI provider selection and execution
 */
export class InferenceDriver {
  private providers: Map<AIProvider, AIProviderAdapter>;
  private defaultProvider: AIProvider;

  constructor() {
    this.providers = new Map();

    // Initialize all providers
    this.providers.set(AIProvider.CLAUDE, new ClaudeProvider());
    this.providers.set(AIProvider.OPENAI, new OpenAIProvider());
    this.providers.set(AIProvider.GEMINI, new GeminiProvider());

    // Determine default provider from environment
    const providerEnv = process.env.Q2Q_PROVIDER?.toLowerCase();
    switch (providerEnv) {
      case 'openai':
        this.defaultProvider = AIProvider.OPENAI;
        break;
      case 'gemini':
        this.defaultProvider = AIProvider.GEMINI;
        break;
      case 'claude':
      default:
        this.defaultProvider = AIProvider.CLAUDE;
    }

    console.info(`[InferenceDriver] Initialized with default provider: ${this.defaultProvider}`);
  }

  /**
   * Get a specific provider
   */
  getProvider(provider: AIProvider): AIProviderAdapter {
    const adapter = this.providers.get(provider);
    if (!adapter) {
      throw new Error(`Provider ${provider} not registered`);
    }
    return adapter;
  }

  /**
   * Get the default provider
   */
  getDefaultProvider(): AIProviderAdapter {
    return this.getProvider(this.defaultProvider);
  }

  /**
   * Classify text using the default provider
   */
  async classify(request: InferenceRequest): Promise<InferenceResult> {
    return this.classifyWithProvider(this.defaultProvider, request);
  }

  /**
   * Classify text using a specific provider
   */
  async classifyWithProvider(
    provider: AIProvider,
    request: InferenceRequest
  ): Promise<InferenceResult> {
    const adapter = this.getProvider(provider);

    // Check if provider is configured
    if (!adapter.isConfigured()) {
      throw new ProviderNotConfiguredError(provider);
    }

    // Generate correlation ID if not provided
    const correlationId = request.correlationId || randomUUID();
    const enrichedRequest = {
      ...request,
      correlationId
    };

    // Log request
    console.info(
      `[${correlationId}] Starting inference with ${provider} (${adapter.modelName})`
    );

    const startTime = Date.now();

    try {
      // Execute inference
      const result = await adapter.classify(enrichedRequest);

      // Log success
      console.info(
        `[${correlationId}] Inference completed in ${result.latencyMs}ms`,
        {
          provider: result.provider,
          model: result.modelName,
          tokens: result.tokens,
          cost: result.cost
        }
      );

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(
        `[${correlationId}] Inference failed after ${duration}ms:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Estimate cost for text classification without making API call
   */
  estimateCost(text: string, provider?: AIProvider): {
    provider: AIProvider;
    estimate: any;
  } {
    const targetProvider = provider || this.defaultProvider;
    const adapter = this.getProvider(targetProvider);

    return {
      provider: targetProvider,
      estimate: adapter.estimateCost(text)
    };
  }

  /**
   * Get list of available (configured) providers
   */
  getAvailableProviders(): AIProvider[] {
    const available: AIProvider[] = [];
    for (const [provider, adapter] of this.providers) {
      if (adapter.isConfigured()) {
        available.push(provider);
      }
    }
    return available;
  }

  /**
   * Get provider status information
   */
  getProviderStatus(): Record<AIProvider, { configured: boolean; model: string }> {
    const status: any = {};
    for (const [provider, adapter] of this.providers) {
      status[provider] = {
        configured: adapter.isConfigured(),
        model: adapter.modelName
      };
    }
    return status;
  }
}

// Singleton instance
let driverInstance: InferenceDriver | null = null;

/**
 * Get the singleton inference driver instance
 */
export function getInferenceDriver(): InferenceDriver {
  if (!driverInstance) {
    driverInstance = new InferenceDriver();
  }
  return driverInstance;
}
