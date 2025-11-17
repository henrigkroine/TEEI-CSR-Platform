/**
 * Model Registry
 * Manages tenant-specific model configuration overrides with file-based storage
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { parse, stringify } from 'yaml';
import {
  TenantOverride,
  TenantOverrideSchema,
  GLOBAL_DEFAULTS,
  ValidationError,
  GuardrailViolationError,
  Q2QConfig,
  SROIConfig,
  VISConfig,
  Guardrails,
} from './types.js';

export interface RegistryConfig {
  /** Directory path for tenant override YAML files */
  overridesDir: string;
  /** Whether to enable strict validation (default: true) */
  strictValidation?: boolean;
  /** Whether to auto-create overrides directory (default: true) */
  autoCreateDir?: boolean;
}

export interface MergedConfig {
  tenantId: string;
  version: string;
  q2q: Required<Q2QConfig>;
  sroi: Required<SROIConfig>;
  vis: Required<VISConfig>;
  guardrails: Required<Guardrails>;
}

export class ModelRegistry {
  private config: Required<RegistryConfig>;
  private cache: Map<string, TenantOverride> = new Map();

  constructor(config: RegistryConfig) {
    this.config = {
      overridesDir: config.overridesDir,
      strictValidation: config.strictValidation ?? true,
      autoCreateDir: config.autoCreateDir ?? true,
    };

    if (this.config.autoCreateDir && !existsSync(this.config.overridesDir)) {
      const fs = require('fs');
      fs.mkdirSync(this.config.overridesDir, { recursive: true });
    }
  }

  /**
   * Load a tenant override from YAML file
   */
  load(tenantId: string): TenantOverride | null {
    // Check cache first
    if (this.cache.has(tenantId)) {
      return this.cache.get(tenantId)!;
    }

    const filePath = this.getFilePath(tenantId);

    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const data = parse(content);

      // Validate with Zod schema
      const override = TenantOverrideSchema.parse(data);

      // Validate guardrails
      if (this.config.strictValidation) {
        this.validateGuardrails(override);
      }

      // Cache the result
      this.cache.set(tenantId, override);

      return override;
    } catch (error) {
      if (error instanceof Error) {
        throw new ValidationError(
          `Failed to load override for tenant ${tenantId}: ${error.message}`,
          'tenantId',
          tenantId
        );
      }
      throw error;
    }
  }

  /**
   * Save a tenant override to YAML file
   */
  save(override: TenantOverride): void {
    // Validate with Zod schema
    const validated = TenantOverrideSchema.parse(override);

    // Validate guardrails
    if (this.config.strictValidation) {
      this.validateGuardrails(validated);
    }

    const filePath = this.getFilePath(validated.tenantId);

    // Ensure directory exists
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      const fs = require('fs');
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file
    const yaml = stringify(validated, { lineWidth: 0 });
    writeFileSync(filePath, yaml, 'utf-8');

    // Update cache
    this.cache.set(validated.tenantId, validated);
  }

  /**
   * Get merged configuration for a tenant (override + defaults)
   */
  getConfig(tenantId: string): MergedConfig {
    const override = this.load(tenantId);

    return {
      tenantId,
      version: override?.version || '0.0.0',
      q2q: {
        model: override?.q2q?.model || GLOBAL_DEFAULTS.q2q.model!,
        temperature: override?.q2q?.temperature ?? GLOBAL_DEFAULTS.q2q.temperature!,
        maxTokens: override?.q2q?.maxTokens ?? GLOBAL_DEFAULTS.q2q.maxTokens!,
        weights: override?.q2q?.weights || GLOBAL_DEFAULTS.q2q.weights!,
        thresholds: override?.q2q?.thresholds || GLOBAL_DEFAULTS.q2q.thresholds!,
      },
      sroi: {
        deadweightFactor: override?.sroi?.deadweightFactor ?? GLOBAL_DEFAULTS.sroi.deadweightFactor!,
        attributionFactor: override?.sroi?.attributionFactor ?? GLOBAL_DEFAULTS.sroi.attributionFactor!,
        dropOffRate: override?.sroi?.dropOffRate ?? GLOBAL_DEFAULTS.sroi.dropOffRate!,
        discountRate: override?.sroi?.discountRate ?? GLOBAL_DEFAULTS.sroi.discountRate!,
        financialProxies: override?.sroi?.financialProxies || GLOBAL_DEFAULTS.sroi.financialProxies!,
      },
      vis: {
        weights: override?.vis?.weights || GLOBAL_DEFAULTS.vis.weights!,
      },
      guardrails: {
        minFairnessThreshold: override?.guardrails?.minFairnessThreshold ?? GLOBAL_DEFAULTS.guardrails.minFairnessThreshold!,
        minPrivacyRedaction: override?.guardrails?.minPrivacyRedaction ?? GLOBAL_DEFAULTS.guardrails.minPrivacyRedaction!,
        maxCostPerRequest: override?.guardrails?.maxCostPerRequest ?? GLOBAL_DEFAULTS.guardrails.maxCostPerRequest!,
      },
    };
  }

  /**
   * List all tenant IDs with overrides
   */
  listTenants(): string[] {
    if (!existsSync(this.config.overridesDir)) {
      return [];
    }

    const files = readdirSync(this.config.overridesDir);
    return files
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map(f => f.replace(/\.(yaml|yml)$/, ''));
  }

  /**
   * Delete a tenant override
   */
  delete(tenantId: string): void {
    const filePath = this.getFilePath(tenantId);

    if (existsSync(filePath)) {
      const fs = require('fs');
      fs.unlinkSync(filePath);
    }

    this.cache.delete(tenantId);
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Validate that guardrails are not weakened
   */
  private validateGuardrails(override: TenantOverride): void {
    const globalGuardrails = GLOBAL_DEFAULTS.guardrails;
    const tenantGuardrails = override.guardrails;

    if (!tenantGuardrails) {
      return; // No custom guardrails, defaults apply
    }

    // Check fairness threshold
    if (tenantGuardrails.minFairnessThreshold !== undefined) {
      if (tenantGuardrails.minFairnessThreshold < globalGuardrails.minFairnessThreshold!) {
        throw new GuardrailViolationError(
          `Tenant ${override.tenantId} cannot lower minFairnessThreshold below global minimum`,
          'minFairnessThreshold',
          tenantGuardrails.minFairnessThreshold,
          globalGuardrails.minFairnessThreshold
        );
      }
    }

    // Check privacy redaction (cannot disable)
    if (tenantGuardrails.minPrivacyRedaction !== undefined) {
      if (!tenantGuardrails.minPrivacyRedaction && globalGuardrails.minPrivacyRedaction) {
        throw new GuardrailViolationError(
          `Tenant ${override.tenantId} cannot disable privacy redaction`,
          'minPrivacyRedaction',
          tenantGuardrails.minPrivacyRedaction,
          globalGuardrails.minPrivacyRedaction
        );
      }
    }

    // Check cost limit (cannot exceed global max)
    if (tenantGuardrails.maxCostPerRequest !== undefined && globalGuardrails.maxCostPerRequest !== undefined) {
      if (tenantGuardrails.maxCostPerRequest > globalGuardrails.maxCostPerRequest) {
        throw new GuardrailViolationError(
          `Tenant ${override.tenantId} cannot exceed global maxCostPerRequest`,
          'maxCostPerRequest',
          tenantGuardrails.maxCostPerRequest,
          globalGuardrails.maxCostPerRequest
        );
      }
    }
  }

  /**
   * Get file path for a tenant override
   */
  private getFilePath(tenantId: string): string {
    return join(this.config.overridesDir, `${tenantId}.yaml`);
  }
}

/**
 * Singleton instance for default usage
 */
let defaultRegistry: ModelRegistry | null = null;

export function getRegistry(config?: RegistryConfig): ModelRegistry {
  if (!defaultRegistry) {
    if (!config) {
      throw new Error('ModelRegistry not initialized. Call getRegistry(config) first.');
    }
    defaultRegistry = new ModelRegistry(config);
  }
  return defaultRegistry;
}

export function resetRegistry(): void {
  defaultRegistry = null;
}
