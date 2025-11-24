/**
 * JSON Parser - Buddy Program Export Files
 *
 * Parses JSON export files per the canonical export specification.
 * Supports both single-entity and multi-entity export structures.
 *
 * @module ingestion-buddy/parsers/json-parser
 * @agent Agent 8 (buddy-parser-engineer)
 */

import { readFile } from 'fs/promises';
import { createServiceLogger } from '@teei/shared-utils';
import type { BuddyEntityType } from './csv-parser';

const logger = createServiceLogger('ingestion-buddy:json-parser');

/**
 * Buddy export metadata (from JSON export spec)
 */
export interface BuddyExportMetadata {
  exported_at: string;         // ISO 8601 timestamp
  export_version: string;      // e.g., "1.0.0"
  company_id?: string;         // Optional company context
  company_name?: string;
  date_range?: {
    from: string;
    to: string;
  };
  entity_types: string[];      // e.g., ["users", "matches", "events"]
  record_counts: Record<string, number>;
}

/**
 * Single-entity JSON export structure
 */
export interface SingleEntityExport<T = Record<string, any>> {
  metadata: BuddyExportMetadata;
  data: T[];
}

/**
 * Multi-entity JSON export structure
 */
export interface MultiEntityExport {
  metadata: BuddyExportMetadata;
  users?: Array<Record<string, any>>;
  matches?: Array<Record<string, any>>;
  events?: Array<Record<string, any>>;
  event_attendance?: Array<Record<string, any>>;
  skill_sessions?: Array<Record<string, any>>;
  checkins?: Array<Record<string, any>>;
  feedback?: Array<Record<string, any>>;
  milestones?: Array<Record<string, any>>;
}

/**
 * JSON parsing options
 */
export interface JsonParseOptions {
  filePath: string;
  validateMetadata?: boolean;  // Validate metadata structure (default: true)
  strict?: boolean;            // Strict JSON parsing (default: true)
}

/**
 * JSON parsing result (single entity type)
 */
export interface JsonParseResult<T = Record<string, any>> {
  entityType: BuddyEntityType;
  records: T[];
  metadata: BuddyExportMetadata;
  errors: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * JSON parsing result (multi-entity)
 */
export interface JsonParseResultMulti {
  entities: Record<BuddyEntityType, Array<Record<string, any>>>;
  metadata: BuddyExportMetadata;
  errors: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Detect export structure type (single-entity vs multi-entity)
 */
function detectExportStructure(parsed: any): 'single' | 'multi' {
  // Single-entity: { metadata, data: [...] }
  if (parsed.data && Array.isArray(parsed.data)) {
    return 'single';
  }

  // Multi-entity: { metadata, users: [...], matches: [...], ... }
  const entityKeys = [
    'users',
    'matches',
    'events',
    'event_attendance',
    'skill_sessions',
    'checkins',
    'feedback',
    'milestones',
  ];

  const hasEntityArrays = entityKeys.some(key => parsed[key] && Array.isArray(parsed[key]));
  if (hasEntityArrays) {
    return 'multi';
  }

  throw new Error('Unable to detect JSON export structure (expected "data" or entity arrays)');
}

/**
 * Validate export metadata structure
 */
function validateMetadata(metadata: any): BuddyExportMetadata {
  const errors: string[] = [];

  if (!metadata) {
    throw new Error('Missing export metadata');
  }

  if (!metadata.exported_at || typeof metadata.exported_at !== 'string') {
    errors.push('metadata.exported_at is required (ISO 8601 timestamp)');
  }

  if (!metadata.export_version || typeof metadata.export_version !== 'string') {
    errors.push('metadata.export_version is required (semver string)');
  }

  if (!metadata.entity_types || !Array.isArray(metadata.entity_types)) {
    errors.push('metadata.entity_types is required (array of entity type strings)');
  }

  if (!metadata.record_counts || typeof metadata.record_counts !== 'object') {
    errors.push('metadata.record_counts is required (object with entity counts)');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid export metadata:\n${errors.join('\n')}`);
  }

  return metadata as BuddyExportMetadata;
}

/**
 * Detect entity type from data structure (for single-entity exports)
 */
function detectEntityTypeFromData(records: any[]): BuddyEntityType {
  if (!records || records.length === 0) {
    throw new Error('Cannot detect entity type from empty data array');
  }

  const firstRecord = records[0];
  const keys = Object.keys(firstRecord);
  const keySet = new Set(keys);

  // Users: id, email, role
  if (keySet.has('id') && keySet.has('email') && keySet.has('role')) {
    return 'users';
  }

  // Matches: match_id, participant_id, buddy_id
  if (keySet.has('match_id') && keySet.has('participant_id') && keySet.has('buddy_id')) {
    return 'matches';
  }

  // Events: event_id, event_name, event_type
  if (keySet.has('event_id') && keySet.has('event_name') && keySet.has('event_type')) {
    return 'events';
  }

  // Event Attendance: attendance_id, event_id, attended_at
  if (keySet.has('attendance_id') && keySet.has('event_id') && keySet.has('attended_at')) {
    return 'event_attendance';
  }

  // Skill Sessions: session_id, teacher_id, learner_id
  if (keySet.has('session_id') && keySet.has('teacher_id') && keySet.has('learner_id')) {
    return 'skill_sessions';
  }

  // Check-ins: checkin_id, mood
  if (keySet.has('checkin_id') && keySet.has('mood')) {
    return 'checkins';
  }

  // Feedback: feedback_id, from_user_id, to_user_id
  if (keySet.has('feedback_id') && keySet.has('from_user_id') && keySet.has('to_user_id')) {
    return 'feedback';
  }

  // Milestones: milestone_id, milestone_type
  if (keySet.has('milestone_id') && keySet.has('milestone_type')) {
    return 'milestones';
  }

  throw new Error(`Unable to detect entity type from record keys: ${keys.join(', ')}`);
}

/**
 * Parse single-entity JSON export file
 *
 * Expected structure:
 * {
 *   "metadata": { ... },
 *   "data": [...]
 * }
 *
 * @param options - JSON parsing options
 * @returns Parsed records with metadata
 */
export async function parseJsonFile<T = Record<string, any>>(
  options: JsonParseOptions
): Promise<JsonParseResult<T>> {
  const { filePath, validateMetadata: doValidateMetadata = true, strict = true } = options;

  logger.info({ filePath }, 'Parsing Buddy JSON export file');

  try {
    // Read file
    const fileContent = await readFile(filePath, 'utf8');

    // Parse JSON
    const parsed = JSON.parse(fileContent) as SingleEntityExport<T>;

    // Validate metadata
    let metadata: BuddyExportMetadata;
    if (doValidateMetadata) {
      metadata = validateMetadata(parsed.metadata);
    } else {
      metadata = parsed.metadata;
    }

    // Detect structure
    const structure = detectExportStructure(parsed);
    if (structure !== 'single') {
      throw new Error(
        'Expected single-entity export structure (use parseJsonFileMulti for multi-entity exports)'
      );
    }

    // Detect entity type
    const entityType = detectEntityTypeFromData(parsed.data);

    logger.info(
      { entityType, recordCount: parsed.data.length },
      'JSON parsing complete (single-entity)'
    );

    return {
      entityType,
      records: parsed.data as T[],
      metadata,
      errors: [],
    };
  } catch (err: any) {
    throw new Error(`JSON parsing failed: ${err.message}`);
  }
}

/**
 * Parse multi-entity JSON export file
 *
 * Expected structure:
 * {
 *   "metadata": { ... },
 *   "users": [...],
 *   "matches": [...],
 *   ...
 * }
 *
 * @param options - JSON parsing options
 * @returns Parsed entities with metadata
 */
export async function parseJsonFileMulti(
  options: JsonParseOptions
): Promise<JsonParseResultMulti> {
  const { filePath, validateMetadata: doValidateMetadata = true } = options;

  logger.info({ filePath }, 'Parsing Buddy JSON export file (multi-entity)');

  try {
    // Read file
    const fileContent = await readFile(filePath, 'utf8');

    // Parse JSON
    const parsed = JSON.parse(fileContent) as MultiEntityExport;

    // Validate metadata
    let metadata: BuddyExportMetadata;
    if (doValidateMetadata) {
      metadata = validateMetadata(parsed.metadata);
    } else {
      metadata = parsed.metadata;
    }

    // Detect structure
    const structure = detectExportStructure(parsed);
    if (structure !== 'multi') {
      throw new Error(
        'Expected multi-entity export structure (use parseJsonFile for single-entity exports)'
      );
    }

    // Extract entities
    const entities: Record<BuddyEntityType, Array<Record<string, any>>> = {
      users: parsed.users || [],
      matches: parsed.matches || [],
      events: parsed.events || [],
      event_attendance: parsed.event_attendance || [],
      skill_sessions: parsed.skill_sessions || [],
      checkins: parsed.checkins || [],
      feedback: parsed.feedback || [],
      milestones: parsed.milestones || [],
    };

    // Count totals
    const totalRecords = Object.values(entities).reduce(
      (sum, records) => sum + records.length,
      0
    );

    logger.info(
      { totalRecords, entityCounts: metadata.record_counts },
      'JSON parsing complete (multi-entity)'
    );

    return {
      entities,
      metadata,
      errors: [],
    };
  } catch (err: any) {
    throw new Error(`JSON parsing failed: ${err.message}`);
  }
}

/**
 * Auto-detect export structure and parse accordingly
 *
 * @param options - JSON parsing options
 * @returns Parsed result (single or multi-entity)
 */
export async function parseJsonFileAuto(
  options: JsonParseOptions
): Promise<JsonParseResult | JsonParseResultMulti> {
  const { filePath } = options;

  // Quick peek to detect structure
  const fileContent = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(fileContent);
  const structure = detectExportStructure(parsed);

  if (structure === 'single') {
    return parseJsonFile(options);
  } else {
    return parseJsonFileMulti(options);
  }
}

/**
 * Type guard: check if result is single-entity
 */
export function isSingleEntityResult<T>(
  result: JsonParseResult<T> | JsonParseResultMulti
): result is JsonParseResult<T> {
  return 'entityType' in result && 'records' in result;
}

/**
 * Type guard: check if result is multi-entity
 */
export function isMultiEntityResult(
  result: JsonParseResult | JsonParseResultMulti
): result is JsonParseResultMulti {
  return 'entities' in result;
}
