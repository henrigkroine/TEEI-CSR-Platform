/**
 * Configuration Resolver
 * Deep merge and validation logic for template/program/campaign configs
 * Agent: config-resolver (Agent 16)
 */

import { z } from 'zod';

/**
 * Deep merge objects (later wins)
 */
export function deepMerge<T extends object>(base: T, ...overrides: Partial<T>[]): T {
  const result = { ...base };

  for (const override of overrides) {
    for (const [key, value] of Object.entries(override)) {
      if (value === undefined) continue;

      const baseValue = (result as any)[key];

      if (
        baseValue &&
        typeof baseValue === 'object' &&
        !Array.isArray(baseValue) &&
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        (result as any)[key] = deepMerge(baseValue, value);
      } else {
        (result as any)[key] = value;
      }
    }
  }

  return result;
}

/**
 * Resolve effective configuration
 */
export function resolveConfig(
  templateDefaults: object,
  programOverrides: object = {},
  campaignOverrides: object = {}
): { effective: object; overridden: string[] } {
  const effective = deepMerge(templateDefaults, programOverrides, campaignOverrides);

  // Track which keys were overridden
  const overridden = findOverriddenKeys(templateDefaults, effective);

  return { effective, overridden };
}

/**
 * Find keys that differ from base
 */
function findOverriddenKeys(base: any, current: any, prefix: string = ''): string[] {
  const overridden: string[] = [];

  for (const [key, value] of Object.entries(current)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const baseValue = base[key];

    if (baseValue === undefined) {
      // New key added
      overridden.push(fullKey);
    } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      // Recurse into nested objects
      if (typeof baseValue === 'object' && !Array.isArray(baseValue) && baseValue !== null) {
        overridden.push(...findOverriddenKeys(baseValue, value, fullKey));
      } else {
        overridden.push(fullKey);
      }
    } else if (JSON.stringify(value) !== JSON.stringify(baseValue)) {
      // Value changed
      overridden.push(fullKey);
    }
  }

  return overridden;
}

/**
 * Validate config against schema
 */
export function validateConfig(config: object, schemaJson: object): { valid: boolean; errors?: any[] } {
  try {
    // In real implementation, would convert schemaJson to Zod schema
    // For now, just validate it's valid JSON
    JSON.stringify(config);
    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      errors: [{ message: error.message }],
    };
  }
}
