/**
 * Region-Aware Model Selection
 * Routes AI requests to region-specific endpoints based on tenant policy
 */

import { DataRegion, RegionPolicy } from './types.js';

/**
 * Model endpoint map by region
 */
export interface RegionalEndpoint {
  region: DataRegion;
  baseUrl: string;
  modelId: string;
  capabilities: string[];
}

/**
 * Default regional endpoints for common models
 */
const REGIONAL_ENDPOINTS: Record<string, RegionalEndpoint[]> = {
  'gpt-4o-mini': [
    { region: 'us', baseUrl: 'https://api.openai.com/v1', modelId: 'gpt-4o-mini', capabilities: ['text', 'chat'] },
    { region: 'eu', baseUrl: 'https://api.openai.com/v1', modelId: 'gpt-4o-mini', capabilities: ['text', 'chat'] },
    { region: 'uk', baseUrl: 'https://api.openai.com/v1', modelId: 'gpt-4o-mini', capabilities: ['text', 'chat'] },
    { region: 'ap', baseUrl: 'https://api.openai.com/v1', modelId: 'gpt-4o-mini', capabilities: ['text', 'chat'] },
  ],
  'gpt-4o': [
    { region: 'us', baseUrl: 'https://api.openai.com/v1', modelId: 'gpt-4o', capabilities: ['text', 'chat', 'vision'] },
    { region: 'eu', baseUrl: 'https://api.openai.com/v1', modelId: 'gpt-4o', capabilities: ['text', 'chat', 'vision'] },
  ],
  'claude-3-5-sonnet-20241022': [
    { region: 'us', baseUrl: 'https://api.anthropic.com/v1', modelId: 'claude-3-5-sonnet-20241022', capabilities: ['text', 'chat', 'vision'] },
    { region: 'eu', baseUrl: 'https://api.anthropic.com/v1', modelId: 'claude-3-5-sonnet-20241022', capabilities: ['text', 'chat', 'vision'] },
    { region: 'uk', baseUrl: 'https://api.anthropic.com/v1', modelId: 'claude-3-5-sonnet-20241022', capabilities: ['text', 'chat', 'vision'] },
  ],
  'gemini-1.5-flash': [
    { region: 'us', baseUrl: 'https://generativelanguage.googleapis.com/v1', modelId: 'gemini-1.5-flash', capabilities: ['text', 'chat'] },
    { region: 'eu', baseUrl: 'https://generativelanguage.googleapis.com/v1', modelId: 'gemini-1.5-flash', capabilities: ['text', 'chat'] },
    { region: 'ap', baseUrl: 'https://generativelanguage.googleapis.com/v1', modelId: 'gemini-1.5-flash', capabilities: ['text', 'chat'] },
  ],
};

/**
 * Error thrown when region policy is violated
 */
export class RegionPolicyError extends Error {
  constructor(
    message: string,
    public readonly attemptedRegion: DataRegion,
    public readonly allowedRegions: DataRegion[]
  ) {
    super(message);
    this.name = 'RegionPolicyError';
  }
}

/**
 * Select regional endpoint for a model based on policy
 */
export function selectRegionalEndpoint(
  modelId: string,
  requestRegion: DataRegion | undefined,
  policy: RegionPolicy
): RegionalEndpoint {
  const endpoints = REGIONAL_ENDPOINTS[modelId];

  if (!endpoints || endpoints.length === 0) {
    throw new Error(`No regional endpoints configured for model ${modelId}`);
  }

  // Determine target region
  const targetRegion = requestRegion || policy.preferredRegion || policy.allowedRegions[0];

  // Check if target region is allowed
  if (policy.enforceStrict && !policy.allowedRegions.includes(targetRegion) && !policy.allowedRegions.includes('global')) {
    throw new RegionPolicyError(
      `Region ${targetRegion} is not allowed by policy`,
      targetRegion,
      policy.allowedRegions
    );
  }

  // Find endpoint for target region
  let endpoint = endpoints.find((ep) => ep.region === targetRegion);

  // Fallback logic
  if (!endpoint && policy.fallbackRegion) {
    endpoint = endpoints.find((ep) => ep.region === policy.fallbackRegion);
  }

  // Try first allowed region as final fallback
  if (!endpoint) {
    for (const allowedRegion of policy.allowedRegions) {
      endpoint = endpoints.find((ep) => ep.region === allowedRegion);
      if (endpoint) break;
    }
  }

  if (!endpoint) {
    throw new Error(
      `No endpoint available for model ${modelId} in allowed regions: ${policy.allowedRegions.join(', ')}`
    );
  }

  return endpoint;
}

/**
 * Validate that a region is allowed by policy
 */
export function validateRegion(
  region: DataRegion,
  policy: RegionPolicy
): { allowed: boolean; reason?: string } {
  if (policy.allowedRegions.includes('global')) {
    return { allowed: true };
  }

  if (policy.allowedRegions.includes(region)) {
    return { allowed: true };
  }

  if (!policy.enforceStrict) {
    return { allowed: true, reason: 'Policy not strict, allowing cross-region' };
  }

  return {
    allowed: false,
    reason: `Region ${region} not in allowed list: ${policy.allowedRegions.join(', ')}`,
  };
}

/**
 * Get all available regions for a model
 */
export function getAvailableRegions(modelId: string): DataRegion[] {
  const endpoints = REGIONAL_ENDPOINTS[modelId];
  if (!endpoints) return [];
  return endpoints.map((ep) => ep.region);
}

/**
 * Log region selection decision (for audit trail)
 */
export function logRegionDecision(
  tenantId: string,
  modelId: string,
  requestRegion: DataRegion | undefined,
  selectedRegion: DataRegion,
  policy: RegionPolicy
): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'region_selection',
    tenantId,
    modelId,
    requestRegion: requestRegion || 'not_specified',
    selectedRegion,
    policy: {
      allowed: policy.allowedRegions,
      preferred: policy.preferredRegion,
      strict: policy.enforceStrict,
    },
  }));
}
