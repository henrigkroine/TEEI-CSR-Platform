/**
 * Config Merger
 *
 * Merges program template default configuration with campaign-specific overrides
 */

import type { ProgramTemplateConfig } from '@teei/shared-schema';

/**
 * Merged configuration result
 */
export interface MergedConfig {
  merged: ProgramTemplateConfig;
  overrides: string[]; // List of overridden fields
}

/**
 * Deep merge two objects, with override taking precedence
 *
 * @param base - Base configuration (template defaults)
 * @param override - Override configuration (campaign-specific)
 * @returns Merged configuration
 */
function deepMerge<T extends Record<string, any>>(
  base: T,
  override: Partial<T>
): T {
  const result = { ...base };

  for (const key in override) {
    if (override.hasOwnProperty(key)) {
      const overrideValue = override[key];
      const baseValue = base[key];

      if (
        overrideValue !== null &&
        overrideValue !== undefined &&
        typeof overrideValue === 'object' &&
        !Array.isArray(overrideValue) &&
        typeof baseValue === 'object' &&
        !Array.isArray(baseValue)
      ) {
        // Recursively merge nested objects
        result[key] = deepMerge(baseValue, overrideValue);
      } else {
        // Direct override
        result[key] = overrideValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Track which fields were overridden
 */
function trackOverrides(
  base: Record<string, any>,
  override: Record<string, any>,
  prefix: string = ''
): string[] {
  const overridden: string[] = [];

  for (const key in override) {
    if (override.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const overrideValue = override[key];
      const baseValue = base[key];

      if (overrideValue === undefined || overrideValue === null) {
        continue;
      }

      if (
        typeof overrideValue === 'object' &&
        !Array.isArray(overrideValue) &&
        typeof baseValue === 'object' &&
        !Array.isArray(baseValue)
      ) {
        // Recursively track nested overrides
        overridden.push(...trackOverrides(baseValue, overrideValue, fullKey));
      } else if (JSON.stringify(overrideValue) !== JSON.stringify(baseValue)) {
        // Value was overridden
        overridden.push(fullKey);
      }
    }
  }

  return overridden;
}

/**
 * Merge template default configuration with campaign overrides
 *
 * @param templateConfig - Default configuration from program template
 * @param campaignOverrides - Campaign-specific configuration overrides
 * @returns Merged configuration and list of overridden fields
 *
 * @example
 * const template = {
 *   sessionDuration: 60,
 *   sessionFrequency: 'weekly',
 *   matchingCriteria: ['skills', 'industry']
 * };
 *
 * const overrides = {
 *   sessionDuration: 90,
 *   matchingCriteria: ['skills', 'language']
 * };
 *
 * const result = mergeConfigs(template, overrides);
 * // result.merged = {
 * //   sessionDuration: 90,  // overridden
 * //   sessionFrequency: 'weekly',  // from template
 * //   matchingCriteria: ['skills', 'language']  // overridden
 * // }
 * // result.overrides = ['sessionDuration', 'matchingCriteria']
 */
export function mergeConfigs(
  templateConfig: ProgramTemplateConfig,
  campaignOverrides: Record<string, any> = {}
): MergedConfig {
  const merged = deepMerge(
    templateConfig as Record<string, any>,
    campaignOverrides
  ) as ProgramTemplateConfig;

  const overrides = trackOverrides(
    templateConfig as Record<string, any>,
    campaignOverrides
  );

  return {
    merged,
    overrides,
  };
}

/**
 * Validate that overrides are compatible with the template config
 *
 * This is a basic validation - more sophisticated checks can be added based on program type
 */
export function validateConfigOverrides(
  templateConfig: ProgramTemplateConfig,
  campaignOverrides: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic type checking - ensure overrides don't change fundamental types
  for (const key in campaignOverrides) {
    if (campaignOverrides.hasOwnProperty(key)) {
      const overrideValue = campaignOverrides[key];
      const templateValue = (templateConfig as Record<string, any>)[key];

      if (templateValue !== undefined && templateValue !== null) {
        const templateType = Array.isArray(templateValue) ? 'array' : typeof templateValue;
        const overrideType = Array.isArray(overrideValue) ? 'array' : typeof overrideValue;

        if (templateType !== overrideType && overrideValue !== null) {
          errors.push(
            `Type mismatch for field '${key}': template has ${templateType}, override is ${overrideType}`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
