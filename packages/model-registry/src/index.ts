/**
 * @teei/model-registry
 * Tenant-specific model configuration registry with versioned overrides
 */

export * from './types.js';
export * from './registry.js';
export * from './region-selector.js';
export { GLOBAL_DEFAULTS } from './types.js';
export { ModelRegistry, getRegistry, resetRegistry } from './registry.js';

export type {
  RegistryConfig,
  MergedConfig,
} from './registry.js';

export type {
  TenantOverride,
  Q2QConfig,
  Q2QWeights,
  Q2QThresholds,
  SROIConfig,
  VISConfig,
  VISWeights,
  Guardrails,
  RollbackConfig,
  RollbackTrigger,
  DataRegion,
  RegionPolicy,
} from './types.js';

export type { RegionalEndpoint } from './region-selector.js';
