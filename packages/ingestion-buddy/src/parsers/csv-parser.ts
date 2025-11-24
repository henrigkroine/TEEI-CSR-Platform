/**
 * CSV Parser - Buddy Program Export Files
 *
 * Parses CSV files per the canonical export specification (docs/ingestion/BUDDY_EXPORT_SPEC.md).
 * Supports all 8 entity types with auto-detection of entity type from headers.
 *
 * @module ingestion-buddy/parsers/csv-parser
 * @agent Agent 8 (buddy-parser-engineer)
 */

import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('ingestion-buddy:csv-parser');

/**
 * Entity type detected from CSV headers
 */
export type BuddyEntityType =
  | 'users'
  | 'matches'
  | 'events'
  | 'event_attendance'
  | 'skill_sessions'
  | 'checkins'
  | 'feedback'
  | 'milestones';

/**
 * CSV parsing options
 */
export interface CsvParseOptions {
  filePath: string;
  delimiter?: string;           // Auto-detect if not provided
  skipEmptyLines?: boolean;     // Default: true
  trim?: boolean;               // Trim whitespace (default: true)
  relaxColumnCount?: boolean;   // Allow variable column counts (default: false)
}

/**
 * CSV parsing result
 */
export interface CsvParseResult<T = Record<string, any>> {
  entityType: BuddyEntityType;
  records: T[];
  metadata: {
    rowCount: number;
    columnCount: number;
    headers: string[];
    delimiter: string;
  };
  errors: Array<{
    row: number;
    message: string;
  }>;
}

/**
 * Detect entity type from CSV headers
 */
function detectEntityType(headers: string[]): BuddyEntityType {
  const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));

  // Users: id, email, first_name, last_name, role
  if (headerSet.has('id') && headerSet.has('email') && headerSet.has('role')) {
    return 'users';
  }

  // Matches: match_id, participant_id, buddy_id
  if (headerSet.has('match_id') && headerSet.has('participant_id') && headerSet.has('buddy_id')) {
    return 'matches';
  }

  // Events: event_id, event_name, event_type
  if (headerSet.has('event_id') && headerSet.has('event_name') && headerSet.has('event_type')) {
    return 'events';
  }

  // Event Attendance: attendance_id, event_id, user_id, attended_at
  if (headerSet.has('attendance_id') && headerSet.has('event_id') && headerSet.has('attended_at')) {
    return 'event_attendance';
  }

  // Skill Sessions: session_id, teacher_id, learner_id, skill_category
  if (headerSet.has('session_id') && headerSet.has('teacher_id') && headerSet.has('learner_id')) {
    return 'skill_sessions';
  }

  // Check-ins: checkin_id, match_id, mood
  if (headerSet.has('checkin_id') && headerSet.has('mood')) {
    return 'checkins';
  }

  // Feedback: feedback_id, from_user_id, to_user_id, rating
  if (headerSet.has('feedback_id') && headerSet.has('from_user_id') && headerSet.has('to_user_id')) {
    return 'feedback';
  }

  // Milestones: milestone_id, user_id, milestone_type
  if (headerSet.has('milestone_id') && headerSet.has('milestone_type')) {
    return 'milestones';
  }

  throw new Error(`Unable to detect entity type from headers: ${headers.join(', ')}`);
}

/**
 * Auto-detect CSV delimiter by analyzing first line
 */
function detectDelimiter(firstLine: string): string {
  const delimiters = [',', ';', '\t', '|'];
  const counts = delimiters.map(d => ({
    delimiter: d,
    count: firstLine.split(d).length,
  }));

  // Pick delimiter with most occurrences (and > 1)
  const detected = counts.reduce((max, curr) =>
    curr.count > max.count ? curr : max
  );

  if (detected.count <= 1) {
    throw new Error('Unable to detect CSV delimiter (no common delimiter found)');
  }

  return detected.delimiter;
}

/**
 * Parse array-like strings in CSV cells
 * e.g., "[\"hiking\", \"cooking\"]" → ["hiking", "cooking"]
 */
function parseArrayField(value: string | null | undefined): string[] | null {
  if (!value || value.trim() === '') return null;

  try {
    // Try JSON parsing first
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Fallback: split by comma
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }

  return null;
}

/**
 * Parse object-like strings in CSV cells
 * e.g., "{\"skill\": \"cooking\", \"level\": 3}" → { skill: "cooking", level: 3 }
 */
function parseObjectField(value: string | null | undefined): Record<string, any> | null {
  if (!value || value.trim() === '') return null;

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Not valid JSON
  }

  return null;
}

/**
 * Transform CSV row into typed record with proper data conversions
 */
function transformRow(
  row: Record<string, string>,
  entityType: BuddyEntityType
): Record<string, any> {
  const transformed: Record<string, any> = {};

  for (const [key, value] of Object.entries(row)) {
    const trimmedValue = value?.trim();

    // Empty strings → null
    if (!trimmedValue || trimmedValue === '') {
      transformed[key] = null;
      continue;
    }

    // Array fields (interests, participants, etc.)
    if (key === 'interests' || key === 'participants' || key === 'categories') {
      transformed[key] = parseArrayField(trimmedValue);
      continue;
    }

    // Object fields (metadata, location_details, feedback_categories, etc.)
    if (
      key === 'metadata' ||
      key === 'location_details' ||
      key === 'feedback_categories' ||
      key === 'skill_details' ||
      key === 'call_metadata'
    ) {
      transformed[key] = parseObjectField(trimmedValue);
      continue;
    }

    // Boolean fields
    if (
      key === 'is_organizer' ||
      key === 'is_virtual' ||
      key === 'is_recurring' ||
      key === 'is_mandatory' ||
      key === 'allow_anonymous'
    ) {
      transformed[key] = trimmedValue.toLowerCase() === 'true';
      continue;
    }

    // Numeric fields
    if (
      key === 'duration_minutes' ||
      key === 'max_participants' ||
      key === 'duration_days' ||
      key === 'sessions_completed' ||
      key === 'events_attended' ||
      key === 'session_number' ||
      key === 'skill_level' ||
      key === 'rating'
    ) {
      const num = parseFloat(trimmedValue);
      transformed[key] = isNaN(num) ? null : num;
      continue;
    }

    // Default: keep as string
    transformed[key] = trimmedValue;
  }

  return transformed;
}

/**
 * Parse CSV file into typed records
 *
 * @param options - CSV parsing options
 * @returns Parsed records with metadata
 */
export async function parseCsvFile<T = Record<string, any>>(
  options: CsvParseOptions
): Promise<CsvParseResult<T>> {
  const {
    filePath,
    delimiter,
    skipEmptyLines = true,
    trim = true,
    relaxColumnCount = false,
  } = options;

  logger.info({ filePath }, 'Parsing Buddy CSV export file');

  return new Promise((resolve, reject) => {
    const records: T[] = [];
    const errors: Array<{ row: number; message: string }> = [];
    let headers: string[] = [];
    let entityType: BuddyEntityType | null = null;
    let detectedDelimiter = delimiter;
    let rowCount = 0;

    // Auto-detect delimiter if not provided
    if (!delimiter) {
      const firstLineChunk: string[] = [];
      const detectStream = createReadStream(filePath, { encoding: 'utf8', highWaterMark: 1024 });

      detectStream.once('data', (chunk: string) => {
        const firstLine = chunk.split('\n')[0];
        detectedDelimiter = detectDelimiter(firstLine);
        detectStream.destroy();
        startParsing();
      });

      detectStream.once('error', (err) => {
        reject(new Error(`Failed to read CSV file: ${err.message}`));
      });
    } else {
      startParsing();
    }

    function startParsing() {
      const parser = parse({
        delimiter: detectedDelimiter,
        columns: true, // Parse headers as object keys
        skip_empty_lines: skipEmptyLines,
        trim,
        relax_column_count: relaxColumnCount,
        on_record: (record, context) => {
          // Detect entity type from headers (first row)
          if (context.lines === 2 && !entityType) {
            headers = Object.keys(record);
            try {
              entityType = detectEntityType(headers);
              logger.debug({ entityType, headers }, 'Detected entity type from CSV headers');
            } catch (err: any) {
              errors.push({ row: 1, message: err.message });
              return null; // Skip this record
            }
          }

          // Transform row
          try {
            const transformed = transformRow(record, entityType!);
            rowCount++;
            return transformed;
          } catch (err: any) {
            errors.push({ row: context.lines, message: `Row transformation error: ${err.message}` });
            return null; // Skip this record
          }
        },
      });

      createReadStream(filePath, { encoding: 'utf8' })
        .pipe(parser)
        .on('data', (record) => {
          if (record !== null) {
            records.push(record as T);
          }
        })
        .on('error', (err) => {
          reject(new Error(`CSV parsing error: ${err.message}`));
        })
        .on('end', () => {
          if (!entityType) {
            reject(new Error('Unable to detect entity type from CSV headers'));
            return;
          }

          logger.info(
            { entityType, rowCount: records.length, errorCount: errors.length },
            'CSV parsing complete'
          );

          resolve({
            entityType,
            records,
            metadata: {
              rowCount: records.length,
              columnCount: headers.length,
              headers,
              delimiter: detectedDelimiter!,
            },
            errors,
          });
        });
    }
  });
}

/**
 * Parse CSV file synchronously (for small files < 10MB)
 *
 * WARNING: Not recommended for large files. Use parseCsvFile for streaming.
 */
export async function parseCsvFileSync<T = Record<string, any>>(
  options: CsvParseOptions
): Promise<CsvParseResult<T>> {
  // Implementation uses same streaming approach but buffers all data
  // For truly synchronous parsing, use csv-parse/sync, but that's not recommended
  return parseCsvFile<T>(options);
}
