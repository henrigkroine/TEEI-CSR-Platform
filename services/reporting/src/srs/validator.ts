/**
 * Regulatory Pack Validator
 *
 * Pre-submit validation checks for regulatory pack generation.
 * Ensures data quality and compliance before pack creation.
 *
 * @module srs/validator
 */

import type {
  GeneratePackRequest,
  ValidationResult,
  ValidationError,
} from '@teei/shared-types';

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate period dates
 */
function validatePeriod(request: GeneratePackRequest): ValidationError[] {
  const errors: ValidationError[] = [];

  const start = new Date(request.period.start);
  const end = new Date(request.period.end);

  // Check if dates are valid
  if (isNaN(start.getTime())) {
    errors.push({
      code: 'INVALID_PERIOD',
      message: 'Invalid start date format',
      severity: 'error',
      details: { field: 'period.start' },
    });
  }

  if (isNaN(end.getTime())) {
    errors.push({
      code: 'INVALID_PERIOD',
      message: 'Invalid end date format',
      severity: 'error',
      details: { field: 'period.end' },
    });
  }

  // Check if start is before end
  if (start >= end) {
    errors.push({
      code: 'INVALID_PERIOD',
      message: 'Start date must be before end date',
      severity: 'error',
      details: { start: request.period.start, end: request.period.end },
    });
  }

  // Check if period is too long (> 2 years)
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff > 730) {
    errors.push({
      code: 'INVALID_PERIOD',
      message: 'Period cannot exceed 2 years',
      severity: 'error',
      details: { days: daysDiff },
    });
  }

  // Check if period is too short (< 1 month)
  if (daysDiff < 30) {
    errors.push({
      code: 'INVALID_PERIOD',
      message: 'Period should be at least 1 month for meaningful reporting',
      severity: 'warning',
      details: { days: daysDiff },
    });
  }

  return errors;
}

/**
 * Validate frameworks
 */
function validateFrameworks(request: GeneratePackRequest): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!request.frameworks || request.frameworks.length === 0) {
    errors.push({
      code: 'INSUFFICIENT_DATA',
      message: 'At least one framework must be selected',
      severity: 'error',
      details: { field: 'frameworks' },
    });
  }

  // Check for valid framework values
  const validFrameworks = ['CSRD', 'GRI', 'SDG'];
  for (const framework of request.frameworks) {
    if (!validFrameworks.includes(framework)) {
      errors.push({
        code: 'INSUFFICIENT_DATA',
        message: `Invalid framework: ${framework}`,
        severity: 'error',
        details: { framework, validFrameworks },
      });
    }
  }

  return errors;
}

/**
 * Validate company ID format
 */
function validateCompanyId(request: GeneratePackRequest): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(request.companyId)) {
    errors.push({
      code: 'INSUFFICIENT_DATA',
      message: 'Invalid company ID format (must be UUID)',
      severity: 'error',
      details: { field: 'companyId', value: request.companyId },
    });
  }

  return errors;
}

/**
 * Validate evidence scope
 */
function validateEvidenceScope(request: GeneratePackRequest): ValidationError[] {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!request.evidenceScope) {
    warnings.push({
      code: 'INSUFFICIENT_DATA',
      message: 'No evidence scope specified - all available evidence will be used',
      severity: 'warning',
      details: { field: 'evidenceScope' },
    });
    return [...errors, ...warnings];
  }

  // Validate programs
  const validPrograms = ['buddy', 'language', 'mentorship', 'upskilling'];
  if (request.evidenceScope.programs) {
    for (const program of request.evidenceScope.programs) {
      if (!validPrograms.includes(program)) {
        errors.push({
          code: 'INSUFFICIENT_DATA',
          message: `Invalid program: ${program}`,
          severity: 'error',
          details: { program, validPrograms },
        });
      }
    }
  }

  // Validate metrics
  const validMetrics = ['sroi', 'vis', 'integration_score', 'engagement_rate'];
  if (request.evidenceScope.metrics) {
    for (const metric of request.evidenceScope.metrics) {
      if (!validMetrics.includes(metric)) {
        warnings.push({
          code: 'INSUFFICIENT_DATA',
          message: `Unknown metric: ${metric}`,
          severity: 'warning',
          details: { metric, validMetrics },
        });
      }
    }
  }

  // Warn if includeStale is true
  if (request.evidenceScope.includeStale) {
    warnings.push({
      code: 'STALE_METRICS',
      message: 'Including stale metrics (>90 days old) may reduce data quality',
      severity: 'warning',
      details: { field: 'evidenceScope.includeStale' },
    });
  }

  return [...errors, ...warnings];
}

/**
 * Validate options
 */
function validateOptions(request: GeneratePackRequest): ValidationError[] {
  const warnings: ValidationError[] = [];

  if (!request.options) {
    return warnings;
  }

  // Validate language
  const validLanguages = ['en', 'es', 'fr', 'uk', 'no'];
  if (request.options.language && !validLanguages.includes(request.options.language)) {
    warnings.push({
      code: 'INSUFFICIENT_DATA',
      message: `Unsupported language: ${request.options.language}, defaulting to 'en'`,
      severity: 'warning',
      details: { language: request.options.language, validLanguages },
    });
  }

  return warnings;
}

/**
 * Check for minimum evidence requirements (async check)
 * This is a placeholder - in production, would query database
 */
async function checkMinimumEvidence(request: GeneratePackRequest): Promise<ValidationError[]> {
  const warnings: ValidationError[] = [];

  // TODO: Implement actual evidence count check
  // For now, just return empty array

  return warnings;
}

/**
 * Check for stale metrics (async check)
 * This is a placeholder - in production, would query database
 */
async function checkStaleMetrics(request: GeneratePackRequest): Promise<ValidationError[]> {
  const warnings: ValidationError[] = [];

  // TODO: Implement actual staleness check
  // For now, just return empty array

  return warnings;
}

/**
 * Check for missing mandatory disclosures (async check)
 * This is a placeholder - in production, would query database
 */
async function checkMandatoryDisclosures(request: GeneratePackRequest): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // TODO: Implement actual mandatory disclosure check
  // For now, just return empty array

  return errors;
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Validate pack generation request
 * Performs synchronous and asynchronous validation checks
 */
export function validatePackRequest(request: GeneratePackRequest): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Run synchronous validations
  errors.push(...validatePeriod(request));
  errors.push(...validateFrameworks(request));
  errors.push(...validateCompanyId(request));

  const evidenceScopeValidation = validateEvidenceScope(request);
  errors.push(...evidenceScopeValidation.filter(v => v.severity === 'error'));
  warnings.push(...evidenceScopeValidation.filter(v => v.severity === 'warning'));

  warnings.push(...validateOptions(request));

  // Determine if valid (no errors)
  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings,
  };
}

/**
 * Validate pack generation request with async checks
 * Use this for more thorough validation that requires database queries
 */
export async function validatePackRequestAsync(
  request: GeneratePackRequest
): Promise<ValidationResult> {
  // Start with synchronous validation
  const syncValidation = validatePackRequest(request);

  if (!syncValidation.valid) {
    return syncValidation;
  }

  // Run async validations
  const asyncErrors: ValidationError[] = [];
  const asyncWarnings: ValidationError[] = [];

  asyncWarnings.push(...await checkMinimumEvidence(request));
  asyncWarnings.push(...await checkStaleMetrics(request));
  asyncErrors.push(...await checkMandatoryDisclosures(request));

  return {
    valid: syncValidation.valid && asyncErrors.length === 0,
    errors: [...syncValidation.errors, ...asyncErrors],
    warnings: [...syncValidation.warnings, ...asyncWarnings],
  };
}
