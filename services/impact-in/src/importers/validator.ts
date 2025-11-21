/**
 * Validation Engine
 * Validates mapped rows against event contracts with PII detection
 */

import {
  MappingConfig,
  ValidationError,
  ValidationResult,
  ValidationErrorType,
  EventContractTarget,
} from '@teei/shared-types';
import { z } from 'zod';

/**
 * Validate mapped row against event contract
 */
export function validateRow(
  mappedRow: Record<string, unknown>,
  rowIndex: number,
  targetContract: EventContractTarget
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Get contract schema for target
  const schema = getContractSchema(targetContract);
  if (!schema) {
    errors.push({
      rowIndex,
      errorType: 'business_rule_violation',
      message: `Unknown contract target: ${targetContract}`,
      severity: 'error',
    });
    return errors;
  }

  // Validate against schema
  const result = schema.safeParse(mappedRow);
  if (!result.success) {
    result.error.issues.forEach((issue) => {
      const field = issue.path.join('.');
      errors.push({
        rowIndex,
        field,
        errorType: mapZodErrorType(issue.code),
        message: issue.message,
        severity: 'error',
        value: mappedRow[field],
      });
    });
  }

  // PII detection
  const piiErrors = detectPII(mappedRow, rowIndex);
  errors.push(...piiErrors);

  return errors;
}

/**
 * Validate entire mapping configuration
 */
export async function validateMapping(config: MappingConfig): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Check that target contract exists
  const validContracts: EventContractTarget[] = [
    'buddy.match.created',
    'buddy.event.logged',
    'buddy.event.attended',
    'buddy.checkin.completed',
    'buddy.feedback.submitted',
    'buddy.milestone.reached',
    'buddy.match.ended',
    'buddy.skill-share.completed',
    'kintell.session.scheduled',
    'kintell.session.completed',
    'kintell.rating.created',
    'upskilling.course.completed',
    'upskilling.credential.issued',
    'upskilling.progress.updated',
    'volunteer.event',
    'donation.event',
    'program.enrollment',
    'program.completion',
    'placement.created',
  ];

  if (!validContracts.includes(config.targetContract)) {
    errors.push(`Invalid target contract: ${config.targetContract}`);
  }

  // Check for duplicate target fields
  const targetFields = new Set<string>();
  for (const mapping of config.fieldMappings) {
    if (targetFields.has(mapping.targetField)) {
      errors.push(`Duplicate mapping for target field: ${mapping.targetField}`);
    }
    targetFields.add(mapping.targetField);
  }

  // Check for required fields (contract-specific)
  const requiredFields = getRequiredFields(config.targetContract);
  for (const field of requiredFields) {
    const isMapped = config.fieldMappings.some((m) => m.targetField === field);
    const hasDefault = config.defaultValues?.[field] !== undefined;
    if (!isMapped && !hasDefault) {
      errors.push(`Required field missing: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate full validation result for all rows
 */
export function generateValidationResult(
  rows: Record<string, unknown>[],
  targetContract: EventContractTarget
): ValidationResult {
  const allErrors: ValidationError[] = [];
  let validRows = 0;
  let errorRows = 0;
  let warningRows = 0;
  let piiDetected = false;

  rows.forEach((row, idx) => {
    const errors = validateRow(row, idx, targetContract);

    if (errors.length === 0) {
      validRows++;
    } else {
      const hasErrors = errors.some((e) => e.severity === 'error');
      const hasWarnings = errors.some((e) => e.severity === 'warning');

      if (hasErrors) {
        errorRows++;
      }
      if (hasWarnings) {
        warningRows++;
      }

      errors.forEach((e) => {
        if (e.errorType === 'pii_detected') {
          piiDetected = true;
        }
      });

      allErrors.push(...errors);
    }
  });

  return {
    totalRows: rows.length,
    validRows,
    errorRows,
    warningRows,
    errors: allErrors,
    piiDetected,
    duplicateKeys: 0, // TODO: implement duplicate key detection
    validatedAt: new Date().toISOString(),
  };
}

/**
 * Map Zod error code to validation error type
 */
function mapZodErrorType(code: string): ValidationErrorType {
  switch (code) {
    case 'invalid_type':
      return 'invalid_type';
    case 'too_small':
    case 'too_big':
      return 'out_of_range';
    case 'invalid_string':
      return 'invalid_format';
    case 'invalid_enum_value':
      return 'invalid_enum_value';
    default:
      return 'business_rule_violation';
  }
}

/**
 * Detect PII in mapped row
 */
function detectPII(
  row: Record<string, unknown>,
  rowIndex: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Patterns for PII detection
  const piiPatterns = [
    {
      name: 'email',
      regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
      message: 'Email address detected',
    },
    {
      name: 'ssn',
      regex: /\b\d{3}-\d{2}-\d{4}\b/,
      message: 'SSN detected',
    },
    {
      name: 'phone',
      regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
      message: 'Phone number detected',
    },
    {
      name: 'credit_card',
      regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,
      message: 'Credit card number detected',
    },
  ];

  for (const [field, value] of Object.entries(row)) {
    const strValue = String(value);

    for (const pattern of piiPatterns) {
      if (pattern.regex.test(strValue)) {
        errors.push({
          rowIndex,
          field,
          errorType: 'pii_detected',
          message: `PII detected: ${pattern.message} in field ${field}`,
          severity: 'error',
          value: '[REDACTED]', // Don't include actual PII in error
        });
      }
    }
  }

  return errors;
}

/**
 * Get contract schema for validation (simplified)
 */
function getContractSchema(target: EventContractTarget): z.ZodSchema | null {
  // In production, these would be imported from @teei/event-contracts
  // For now, return generic schemas

  switch (target) {
    case 'buddy.event.logged':
      return z.object({
        eventId: z.string().uuid(),
        matchId: z.string().uuid(),
        eventType: z.string(),
        eventDate: z.string().datetime(),
        description: z.string().optional(),
        location: z.string().optional(),
      });

    case 'buddy.match.created':
      return z.object({
        matchId: z.string().uuid(),
        buddyId: z.string().uuid(),
        participantId: z.string().uuid(),
        matchDate: z.string().datetime(),
        programType: z.string(),
      });

    case 'volunteer.event':
      return z.object({
        eventId: z.string().uuid(),
        userId: z.string().uuid(),
        eventDate: z.string().datetime(),
        hours: z.number().min(0),
        activityType: z.string(),
        organizationName: z.string().optional(),
      });

    case 'donation.event':
      return z.object({
        donationId: z.string().uuid(),
        userId: z.string().uuid(),
        donationDate: z.string().datetime(),
        amount: z.number().min(0),
        currency: z.string(),
        cause: z.string().optional(),
      });

    case 'program.enrollment':
      return z.object({
        enrollmentId: z.string().uuid(),
        userId: z.string().uuid(),
        programId: z.string().uuid(),
        enrollmentDate: z.string().datetime(),
        programType: z.string(),
      });

    default:
      // Generic schema for unknown contracts
      return z.object({
        id: z.string().uuid().optional(),
        timestamp: z.string().datetime().optional(),
      });
  }
}

/**
 * Get required fields for contract
 */
function getRequiredFields(target: EventContractTarget): string[] {
  switch (target) {
    case 'buddy.event.logged':
      return ['eventId', 'matchId', 'eventType', 'eventDate'];
    case 'buddy.match.created':
      return ['matchId', 'buddyId', 'participantId', 'matchDate', 'programType'];
    case 'volunteer.event':
      return ['eventId', 'userId', 'eventDate', 'hours', 'activityType'];
    case 'donation.event':
      return ['donationId', 'userId', 'donationDate', 'amount', 'currency'];
    case 'program.enrollment':
      return ['enrollmentId', 'userId', 'programId', 'enrollmentDate', 'programType'];
    default:
      return [];
  }
}
