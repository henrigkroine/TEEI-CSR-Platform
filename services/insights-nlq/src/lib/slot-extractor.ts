/**
 * Slot Extraction & Validation
 *
 * Parses and validates slots extracted from intent classification,
 * normalizes time ranges, and validates against metric template constraints.
 */

import { z } from 'zod';
import { IntentSlots } from './intent-classifier.js';
import { getTemplate, MetricTemplate } from '../templates/metric-catalog.js';

// ===== TYPES & SCHEMAS =====

export interface NormalizedTimeRange {
  timeRangeType: 'last_7d' | 'last_30d' | 'last_90d' | 'last_quarter' | 'ytd' | 'last_year' | 'custom';
  startDate: Date;
  endDate: Date;
  isCustom: boolean;
}

export interface ValidatedSlots {
  metric: string;
  timeRange: NormalizedTimeRange;
  groupBy?: string;
  filters?: Record<string, any>;
  comparisonType?: string;
  templateId: string;
}

export interface SlotValidationResult {
  valid: boolean;
  validatedSlots?: ValidatedSlots;
  errors: string[];
  warnings: string[];
}

// ===== SLOT EXTRACTOR CLASS =====

export class SlotExtractor {
  /**
   * Validate and normalize slots against template constraints
   */
  static validateSlots(slots: IntentSlots, intentType: string): SlotValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate metric exists in template catalog
    const template = getTemplate(slots.metric);
    if (!template) {
      errors.push(`Unknown metric: ${slots.metric}`);
      return { valid: false, errors, warnings };
    }

    // 2. Normalize time range
    let normalizedTimeRange: NormalizedTimeRange;
    try {
      normalizedTimeRange = this.normalizeTimeRange(slots.timeRange);
    } catch (error) {
      errors.push(`Invalid time range: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, errors, warnings };
    }

    // 3. Validate time range against template constraints
    if (!template.allowedTimeRanges.includes(slots.timeRange)) {
      errors.push(
        `Time range "${slots.timeRange}" not allowed for metric "${slots.metric}". ` +
        `Allowed: ${template.allowedTimeRanges.join(', ')}`
      );
    }

    // 4. Validate time window doesn't exceed maximum
    const daysDiff = this.daysBetween(normalizedTimeRange.startDate, normalizedTimeRange.endDate);
    if (daysDiff > template.maxTimeWindowDays) {
      errors.push(
        `Time window (${daysDiff} days) exceeds maximum allowed (${template.maxTimeWindowDays} days) for metric "${slots.metric}"`
      );
    }

    // 5. Validate groupBy if present
    if (slots.groupBy) {
      if (!template.allowedGroupBy) {
        warnings.push(`Metric "${slots.metric}" does not support grouping. groupBy will be ignored.`);
      } else if (!template.allowedGroupBy.includes(slots.groupBy)) {
        errors.push(
          `groupBy "${slots.groupBy}" not allowed for metric "${slots.metric}". ` +
          `Allowed: ${template.allowedGroupBy.join(', ')}`
        );
      }
    }

    // 6. Validate filters if present
    if (slots.filters) {
      const filterValidation = this.validateFilters(slots.filters, template);
      if (filterValidation.errors.length > 0) {
        errors.push(...filterValidation.errors);
      }
      if (filterValidation.warnings.length > 0) {
        warnings.push(...filterValidation.warnings);
      }
    }

    // 7. Validate comparisonType for benchmark queries
    if (intentType === 'benchmark' && slots.comparisonType) {
      if (template.allowedFilters && template.allowedFilters.cohortType) {
        if (!template.allowedFilters.cohortType.includes(slots.comparisonType)) {
          errors.push(
            `Comparison type "${slots.comparisonType}" not allowed for metric "${slots.metric}". ` +
            `Allowed: ${template.allowedFilters.cohortType.join(', ')}`
          );
        }
      } else {
        warnings.push(`Metric "${slots.metric}" does not support benchmarking.`);
      }
    }

    // Return validation result
    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    const validatedSlots: ValidatedSlots = {
      metric: slots.metric,
      timeRange: normalizedTimeRange,
      groupBy: slots.groupBy,
      filters: slots.filters,
      comparisonType: slots.comparisonType,
      templateId: template.id,
    };

    return {
      valid: true,
      validatedSlots,
      errors: [],
      warnings,
    };
  }

  /**
   * Normalize time range string to actual dates
   */
  static normalizeTimeRange(timeRange: string): NormalizedTimeRange {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let startDate: Date;
    let endDate: Date = today;
    let isCustom = false;

    switch (timeRange) {
      case 'last_7d':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        break;

      case 'last_30d':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
        break;

      case 'last_90d':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 90);
        break;

      case 'last_quarter':
        // Calculate last full quarter
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const lastQuarterYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();

        startDate = new Date(lastQuarterYear, lastQuarter * 3, 1);
        endDate = new Date(lastQuarterYear, (lastQuarter + 1) * 3, 0);
        break;

      case 'ytd':
        // Year to date
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = today;
        break;

      case 'last_year':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;

      case 'custom':
        // For custom, caller must provide explicit dates in filters
        // Default to last 30 days
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
        isCustom = true;
        break;

      default:
        throw new Error(`Unsupported time range: ${timeRange}`);
    }

    return {
      timeRangeType: timeRange as NormalizedTimeRange['timeRangeType'],
      startDate,
      endDate,
      isCustom,
    };
  }

  /**
   * Validate filters against template constraints
   */
  private static validateFilters(
    filters: Record<string, any>,
    template: MetricTemplate
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if template allows custom filters
    if (!template.allowedFilters) {
      warnings.push('This metric does not support custom filters. Filters will be ignored.');
      return { errors, warnings };
    }

    // Validate each filter key
    for (const [key, value] of Object.entries(filters)) {
      if (!template.allowedFilters[key]) {
        warnings.push(`Filter "${key}" is not explicitly allowed for this metric.`);
        continue;
      }

      // Validate filter value is in allowed list
      const allowedValues = template.allowedFilters[key];
      if (Array.isArray(value)) {
        // Multiple values
        for (const v of value) {
          if (!allowedValues.includes(v)) {
            errors.push(
              `Filter value "${v}" for "${key}" not allowed. Allowed: ${allowedValues.join(', ')}`
            );
          }
        }
      } else {
        // Single value
        if (!allowedValues.includes(value)) {
          errors.push(
            `Filter value "${value}" for "${key}" not allowed. Allowed: ${allowedValues.join(', ')}`
          );
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Calculate days between two dates
   */
  private static daysBetween(start: Date, end: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((end.getTime() - start.getTime()) / msPerDay);
  }

  /**
   * Parse custom date range from filter strings
   */
  static parseCustomDateRange(
    startDateStr: string,
    endDateStr: string
  ): NormalizedTimeRange {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid custom date range format. Expected ISO 8601 dates.');
    }

    if (startDate > endDate) {
      throw new Error('Start date must be before end date.');
    }

    return {
      timeRangeType: 'custom',
      startDate,
      endDate,
      isCustom: true,
    };
  }

  /**
   * Extract query parameters for SQL template binding
   */
  static extractQueryParams(
    validatedSlots: ValidatedSlots,
    companyId: string
  ): Record<string, any> {
    const params: Record<string, any> = {
      companyId,
      startDate: validatedSlots.timeRange.startDate.toISOString().split('T')[0],
      endDate: validatedSlots.timeRange.endDate.toISOString().split('T')[0],
      limit: 100, // Default limit
    };

    // Add groupBy if present
    if (validatedSlots.groupBy) {
      params.groupBy = validatedSlots.groupBy;
    }

    // Add filters
    if (validatedSlots.filters) {
      Object.assign(params, validatedSlots.filters);
    }

    // Add comparisonType for benchmarks
    if (validatedSlots.comparisonType) {
      params.cohortType = validatedSlots.comparisonType;
    }

    return params;
  }

  /**
   * Format time range for human-readable display
   */
  static formatTimeRange(timeRange: NormalizedTimeRange): string {
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    if (timeRange.isCustom) {
      return `${formatDate(timeRange.startDate)} to ${formatDate(timeRange.endDate)}`;
    }

    const labels: Record<string, string> = {
      last_7d: 'Last 7 days',
      last_30d: 'Last 30 days',
      last_90d: 'Last 90 days',
      last_quarter: 'Last quarter',
      ytd: 'Year to date',
      last_year: 'Last year',
    };

    return labels[timeRange.timeRangeType] || `${formatDate(timeRange.startDate)} to ${formatDate(timeRange.endDate)}`;
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Validate slots and throw if invalid
 */
export function validateSlotsOrThrow(slots: IntentSlots, intentType: string): ValidatedSlots {
  const result = SlotExtractor.validateSlots(slots, intentType);

  if (!result.valid) {
    throw new Error(`Slot validation failed: ${result.errors.join(', ')}`);
  }

  if (result.warnings.length > 0) {
    console.warn('Slot validation warnings:', result.warnings);
  }

  if (!result.validatedSlots) {
    throw new Error('Validation passed but no validated slots returned');
  }

  return result.validatedSlots;
}

/**
 * Create query parameters from validated slots
 */
export function createQueryParams(
  validatedSlots: ValidatedSlots,
  companyId: string
): Record<string, any> {
  return SlotExtractor.extractQueryParams(validatedSlots, companyId);
}
