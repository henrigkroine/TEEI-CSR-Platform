/**
 * Share-Specific Redaction Utility
 *
 * Provides comprehensive PII redaction for shared dashboard views
 * Preserves aggregated metrics while removing sensitive individual data
 * Integrates with access logging and audit trails
 *
 * @module lib/shareRedaction
 */

import { RedactionEnforcer, createRedactionEnforcer } from './redaction.js';
import { createServiceLogger } from '@teei/shared-utils';
import { pool } from '../db/connection.js';

const logger = createServiceLogger('reporting:shareRedaction');

/**
 * Configuration for share redaction
 */
export interface ShareRedactionConfig {
  includesSensitiveData: boolean;
  preserveAggregates: boolean;
  logAccess: boolean;
  shareLinkId?: string;
  accessorIp?: string;
  accessorUserAgent?: string;
}

/**
 * Redacted share data result
 */
export interface RedactedShareData {
  data: any;
  redactionApplied: boolean;
  redactionCount: number;
  piiTypesDetected: string[];
  timestamp: string;
}

/**
 * Safe aggregated metrics (no PII, safe to share)
 */
interface SafeAggregates {
  // SROI metrics
  sroi?: number;
  total_investment?: number;
  total_social_value?: number;

  // VIS metrics
  vis_score?: number;
  integration_score?: number;
  language_score?: number;
  job_readiness_score?: number;

  // Participation metrics (counts only)
  total_participants?: number;
  total_sessions?: number;
  total_hours?: number;
  active_volunteers?: number;

  // Program metrics (aggregated)
  programs?: Array<{
    name: string;
    participant_count: number;
    session_count: number;
    completion_rate: number;
    average_satisfaction: number;
  }>;

  // Time-based aggregates
  metrics_by_quarter?: Record<string, {
    participants: number;
    sessions: number;
    hours: number;
  }>;
}

/**
 * Fields that should always be redacted in shared views
 */
const ALWAYS_REDACT_FIELDS = [
  'email',
  'phone',
  'phone_number',
  'mobile',
  'ssn',
  'social_security_number',
  'national_id',
  'passport_number',
  'credit_card',
  'bank_account',
  'tax_id',
  'address',
  'street_address',
  'home_address',
  'date_of_birth',
  'birth_date',
  'dob',
  'ip_address',
  'user_agent',
];

/**
 * Fields that should be redacted unless includesSensitiveData is true
 */
const SENSITIVE_FIELDS = [
  'first_name',
  'last_name',
  'full_name',
  'name',
  'username',
  'user_id',
  'volunteer_id',
  'participant_id',
  'external_id',
  'employee_id',
  'department',
  'manager_name',
  'team_name',
];

/**
 * Fields that are safe to share (aggregated metrics)
 */
const SAFE_AGGREGATE_FIELDS = [
  'sroi',
  'vis_score',
  'integration_score',
  'language_score',
  'job_readiness_score',
  'total_participants',
  'total_sessions',
  'total_hours',
  'active_volunteers',
  'completion_rate',
  'average_satisfaction',
  'participant_count',
  'session_count',
  'program_count',
  'quarter',
  'month',
  'year',
  'date_range',
  'period',
];

/**
 * Redact data for sharing
 *
 * This is the main function for share link redaction
 * - Always removes PII (emails, phones, etc.)
 * - Removes names/identifiers unless includesSensitiveData is true
 * - Preserves aggregated metrics (safe to share)
 * - Logs access for audit trail
 */
export async function redactForSharing(
  data: any,
  config: ShareRedactionConfig
): Promise<RedactedShareData> {
  const startTime = Date.now();
  const redactionEnforcer = createRedactionEnforcer();

  logger.info('Redacting data for share link', {
    includesSensitiveData: config.includesSensitiveData,
    preserveAggregates: config.preserveAggregates,
    shareLinkId: config.shareLinkId,
  });

  // Track redaction statistics
  let redactionCount = 0;
  const piiTypesDetected = new Set<string>();

  // Deep clone to avoid mutating original
  const redactedData = JSON.parse(JSON.stringify(data));

  // Recursively redact object
  function redactObject(obj: any, path: string = ''): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item, index) => redactObject(item, `${path}[${index}]`));
    }

    // Handle objects
    if (typeof obj === 'object') {
      const redacted: any = {};

      for (const [key, value] of Object.entries(obj)) {
        const fieldPath = path ? `${path}.${key}` : key;
        const lowerKey = key.toLowerCase();

        // Always redact PII fields
        if (ALWAYS_REDACT_FIELDS.some(field => lowerKey.includes(field))) {
          redacted[key] = '[REDACTED]';
          redactionCount++;
          piiTypesDetected.add(key);
          continue;
        }

        // Redact sensitive fields unless includesSensitiveData is true
        if (!config.includesSensitiveData &&
            SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
          redacted[key] = '[REDACTED]';
          redactionCount++;
          piiTypesDetected.add(key);
          continue;
        }

        // Always preserve safe aggregate fields
        if (SAFE_AGGREGATE_FIELDS.some(field => lowerKey.includes(field))) {
          redacted[key] = value;
          continue;
        }

        // Recursively process nested objects/arrays
        if (typeof value === 'object' && value !== null) {
          redacted[key] = redactObject(value, fieldPath);
        }
        // Redact text content that might contain PII
        else if (typeof value === 'string') {
          const textRedactionResult = redactionEnforcer.redact(value);
          redacted[key] = textRedactionResult.redactedText;

          if (textRedactionResult.redactionCount > 0) {
            redactionCount += textRedactionResult.redactionCount;
            textRedactionResult.piiDetected.forEach(type => piiTypesDetected.add(type));
          }
        }
        else {
          redacted[key] = value;
        }
      }

      return redacted;
    }

    return obj;
  }

  const finalData = redactObject(redactedData);

  // Post-redaction validation
  const validation = validateNoLeakedPII(finalData, config.includesSensitiveData);
  if (!validation.isValid) {
    logger.error('PII detected after redaction', {
      violations: validation.violations,
      shareLinkId: config.shareLinkId,
    });
    throw new Error(`PII leak detected after redaction: ${validation.violations.join(', ')}`);
  }

  // Log access if configured
  if (config.logAccess && config.shareLinkId) {
    await logShareAccess(
      config.shareLinkId,
      config.accessorIp || 'unknown',
      config.accessorUserAgent || 'unknown',
      redactionCount,
      Array.from(piiTypesDetected)
    );
  }

  const duration = Date.now() - startTime;
  logger.info('Share redaction completed', {
    redactionCount,
    piiTypesDetected: Array.from(piiTypesDetected),
    duration,
    shareLinkId: config.shareLinkId,
  });

  return {
    data: finalData,
    redactionApplied: redactionCount > 0,
    redactionCount,
    piiTypesDetected: Array.from(piiTypesDetected),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate that no PII has leaked through redaction
 */
function validateNoLeakedPII(
  data: any,
  allowSensitiveData: boolean
): { isValid: boolean; violations: string[] } {
  const violations: string[] = [];
  const redactionEnforcer = createRedactionEnforcer();

  function checkObject(obj: any, path: string = ''): void {
    if (obj === null || obj === undefined) return;

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => checkObject(item, `${path}[${index}]`));
      return;
    }

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const fieldPath = path ? `${path}.${key}` : key;
        const lowerKey = key.toLowerCase();

        // Check for always-redacted fields
        if (ALWAYS_REDACT_FIELDS.some(field => lowerKey.includes(field))) {
          if (value !== '[REDACTED]' && value !== null && value !== undefined) {
            violations.push(`${fieldPath}: Should be redacted (contains ${key})`);
          }
        }

        // Check for sensitive fields if not allowed
        if (!allowSensitiveData &&
            SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
          if (value !== '[REDACTED]' && value !== null && value !== undefined) {
            violations.push(`${fieldPath}: Should be redacted (contains ${key})`);
          }
        }

        // Check text content for PII
        if (typeof value === 'string' && redactionEnforcer.containsPII(value)) {
          violations.push(`${fieldPath}: Contains unredacted PII in text`);
        }

        // Recurse
        if (typeof value === 'object' && value !== null) {
          checkObject(value, fieldPath);
        }
      }
    }
  }

  checkObject(data);

  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Extract and preserve only safe aggregate metrics
 */
export function extractSafeAggregates(data: any): SafeAggregates {
  const aggregates: SafeAggregates = {};

  // Extract SROI metrics
  if (data.sroi !== undefined) aggregates.sroi = data.sroi;
  if (data.total_investment !== undefined) {
    aggregates.total_investment = data.total_investment;
  }
  if (data.total_social_value !== undefined) {
    aggregates.total_social_value = data.total_social_value;
  }

  // Extract VIS metrics
  if (data.vis_score !== undefined) aggregates.vis_score = data.vis_score;
  if (data.integration_score !== undefined) {
    aggregates.integration_score = data.integration_score;
  }
  if (data.language_score !== undefined) {
    aggregates.language_score = data.language_score;
  }
  if (data.job_readiness_score !== undefined) {
    aggregates.job_readiness_score = data.job_readiness_score;
  }

  // Extract participation counts
  if (data.total_participants !== undefined) {
    aggregates.total_participants = data.total_participants;
  }
  if (data.total_sessions !== undefined) {
    aggregates.total_sessions = data.total_sessions;
  }
  if (data.total_hours !== undefined) {
    aggregates.total_hours = data.total_hours;
  }
  if (data.active_volunteers !== undefined) {
    aggregates.active_volunteers = data.active_volunteers;
  }

  // Extract program metrics (with redaction)
  if (Array.isArray(data.programs)) {
    aggregates.programs = data.programs.map((program: any) => ({
      name: program.name || program.program_name || 'Unknown Program',
      participant_count: program.participant_count || 0,
      session_count: program.session_count || 0,
      completion_rate: program.completion_rate || 0,
      average_satisfaction: program.average_satisfaction || 0,
    }));
  }

  // Extract time-based aggregates
  if (data.metrics_by_quarter) {
    aggregates.metrics_by_quarter = data.metrics_by_quarter;
  }

  return aggregates;
}

/**
 * Log share link access with redaction statistics
 */
async function logShareAccess(
  shareLinkId: string,
  ipAddress: string,
  userAgent: string,
  redactionCount: number,
  piiTypes: string[]
): Promise<void> {
  try {
    // Note: We don't store PII types in the log, only counts for audit purposes
    await pool.query(
      `INSERT INTO share_link_access_log
       (share_link_id, accessed_at, ip_address, user_agent, access_granted, metadata)
       VALUES ((SELECT id FROM share_links WHERE link_id = $1), NOW(), $2, $3, true, $4)`,
      [
        shareLinkId,
        ipAddress,
        userAgent,
        JSON.stringify({
          redaction_count: redactionCount,
          pii_types_count: piiTypes.length, // Count only, not actual types
        }),
      ]
    );

    // Increment access count
    await pool.query(
      `UPDATE share_links
       SET access_count = access_count + 1, last_accessed_at = NOW()
       WHERE link_id = $1`,
      [shareLinkId]
    );
  } catch (err) {
    logger.error('Failed to log share access', { error: err, shareLinkId });
    // Don't throw - logging failure shouldn't break the share link access
  }
}

/**
 * Anonymize user identifiers while preserving referential integrity
 * Uses consistent hashing so the same ID always maps to the same anonymous ID
 */
export function anonymizeIdentifiers(data: any, salt?: string): any {
  const crypto = require('crypto');
  const anonymizationSalt = salt || process.env.ANONYMIZATION_SALT || 'default-salt';

  function hash(value: string): string {
    return crypto
      .createHash('sha256')
      .update(`${value}${anonymizationSalt}`)
      .digest('hex')
      .substring(0, 8);
  }

  function anonymizeObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    if (Array.isArray(obj)) {
      return obj.map(anonymizeObject);
    }

    if (typeof obj === 'object') {
      const anonymized: any = {};

      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();

        // Anonymize ID fields
        if ((lowerKey.includes('_id') || lowerKey === 'id') &&
            typeof value === 'string' &&
            !lowerKey.includes('company') && // Keep company_id as-is
            !lowerKey.includes('link')) {    // Keep link_id as-is
          anonymized[key] = `anon_${hash(value)}`;
        }
        // Recursively process objects
        else if (typeof value === 'object' && value !== null) {
          anonymized[key] = anonymizeObject(value);
        }
        else {
          anonymized[key] = value;
        }
      }

      return anonymized;
    }

    return obj;
  }

  return anonymizeObject(data);
}

/**
 * Create a watermarked version of data for share links
 * Adds metadata indicating this is a shared view
 */
export function watermarkSharedData(data: any, shareLinkId: string): any {
  return {
    ...data,
    _metadata: {
      shared_via: 'secure_link',
      link_id: shareLinkId,
      watermark: 'SHARED VIA LINK - DO NOT DISTRIBUTE',
      accessed_at: new Date().toISOString(),
      readonly: true,
      redaction_applied: true,
    },
  };
}

/**
 * Comprehensive share preparation
 * Combines redaction, anonymization, and watermarking
 */
export async function prepareDataForSharing(
  data: any,
  config: ShareRedactionConfig
): Promise<RedactedShareData> {
  // Step 1: Redact PII
  const redactedResult = await redactForSharing(data, config);

  // Step 2: Anonymize identifiers if not including sensitive data
  let finalData = redactedResult.data;
  if (!config.includesSensitiveData) {
    finalData = anonymizeIdentifiers(finalData);
  }

  // Step 3: Watermark the data
  if (config.shareLinkId) {
    finalData = watermarkSharedData(finalData, config.shareLinkId);
  }

  return {
    ...redactedResult,
    data: finalData,
  };
}

/**
 * Check if filter configuration contains sensitive criteria
 */
export function filterConfigContainsSensitiveData(filterConfig: any): boolean {
  const sensitiveFilterFields = [
    'email',
    'name',
    'user_id',
    'volunteer_id',
    'participant_id',
  ];

  function checkObject(obj: any): boolean {
    if (!obj || typeof obj !== 'object') return false;

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if key contains sensitive field names
      if (sensitiveFilterFields.some(field => lowerKey.includes(field))) {
        return true;
      }

      // Check nested objects
      if (typeof value === 'object' && value !== null) {
        if (checkObject(value)) return true;
      }
    }

    return false;
  }

  return checkObject(filterConfig);
}
