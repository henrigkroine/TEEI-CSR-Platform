/**
 * Feature Flags Client - Region-aware rollout control
 * Agent: region-flag-integrator
 */

export interface FeatureFlagConfig {
  provider: 'launchdarkly' | 'posthog' | 'split' | 'custom';
  apiKey?: string;
}

export interface FlagContext {
  region?: string;
  userId?: string;
  tenantId?: string;
  environment?: string;
}

/**
 * Feature Flag Client
 * Supports multiple providers with a unified interface
 */
export class FeatureFlagClient {
  private provider: string;
  private apiKey?: string;
  private cache: Map<string, any> = new Map();

  constructor(config: FeatureFlagConfig) {
    this.provider = config.provider;
    this.apiKey = config.apiKey;
  }

  /**
   * Check if feature is enabled
   */
  async isEnabled(flagKey: string, context: FlagContext = {}): Promise<boolean> {
    const cacheKey = `${flagKey}:${JSON.stringify(context)}`;

    // Check cache (1 minute TTL)
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.value;
    }

    try {
      const value = await this.evaluateFlag(flagKey, context);
      this.cache.set(cacheKey, { value, timestamp: Date.now() });
      return value;
    } catch (error) {
      console.error(`[FeatureFlags] Error evaluating flag ${flagKey}:`, error);
      return false;
    }
  }

  /**
   * Get rollout percentage for a flag
   */
  async getRolloutPercentage(
    flagKey: string,
    context: FlagContext = {}
  ): Promise<number> {
    // For canary rollouts, flags typically have numeric values
    try {
      const value = await this.evaluateFlagNumeric(flagKey, context);
      return Math.min(100, Math.max(0, value));
    } catch (error) {
      console.error(`[FeatureFlags] Error getting rollout percentage for ${flagKey}:`, error);
      return 0;
    }
  }

  /**
   * Update rollout percentage
   */
  async updateRolloutPercentage(
    flagKey: string,
    region: string,
    percentage: number
  ): Promise<void> {
    console.info(
      `[FeatureFlags] Updating rollout: ${flagKey} in ${region} → ${percentage}%`
    );

    // Implementation depends on provider
    switch (this.provider) {
      case 'custom':
        await this.updateCustomFlag(flagKey, region, percentage);
        break;

      case 'launchdarkly':
      case 'posthog':
      case 'split':
        console.warn(`[FeatureFlags] Provider ${this.provider} integration pending`);
        break;
    }

    // Invalidate cache
    this.cache.clear();
  }

  /**
   * Evaluate boolean flag
   */
  private async evaluateFlag(flagKey: string, context: FlagContext): Promise<boolean> {
    switch (this.provider) {
      case 'custom':
        return this.evaluateCustomFlag(flagKey, context);

      default:
        console.warn(`[FeatureFlags] Provider ${this.provider} not implemented, defaulting to false`);
        return false;
    }
  }

  /**
   * Evaluate numeric flag
   */
  private async evaluateFlagNumeric(flagKey: string, context: FlagContext): Promise<number> {
    switch (this.provider) {
      case 'custom':
        return this.evaluateCustomFlagNumeric(flagKey, context);

      default:
        return 0;
    }
  }

  /**
   * Custom provider - In-memory flags (for testing/demo)
   */
  private customFlags: Map<string, any> = new Map([
    ['canary_deployment_enabled', { type: 'boolean', regions: { 'us-east-1': true, 'eu-west-1': true, 'ap-southeast-1': true } }],
    ['new_reporting_engine', { type: 'percentage', regions: { 'us-east-1': 5, 'eu-west-1': 0, 'ap-southeast-1': 0 } }],
    ['enhanced_metrics_dashboard', { type: 'boolean', regions: { 'us-east-1': true, 'eu-west-1': true, 'ap-southeast-1': false } }]
  ]);

  private evaluateCustomFlag(flagKey: string, context: FlagContext): boolean {
    const flag = this.customFlags.get(flagKey);
    if (!flag) return false;

    if (flag.type === 'boolean' && context.region) {
      return flag.regions[context.region] || false;
    }

    return false;
  }

  private evaluateCustomFlagNumeric(flagKey: string, context: FlagContext): number {
    const flag = this.customFlags.get(flagKey);
    if (!flag) return 0;

    if (flag.type === 'percentage' && context.region) {
      return flag.regions[context.region] || 0;
    }

    return 0;
  }

  private async updateCustomFlag(flagKey: string, region: string, percentage: number): Promise<void> {
    const flag = this.customFlags.get(flagKey);
    if (!flag) {
      // Create new flag
      this.customFlags.set(flagKey, {
        type: 'percentage',
        regions: { [region]: percentage }
      });
    } else {
      flag.regions[region] = percentage;
    }
  }
}
