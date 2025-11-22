/**
 * Zod Validation Schemas - Buddy Program Exports
 *
 * Validates parsed data before transformation into CSR entities.
 * Based on canonical export specification (docs/ingestion/BUDDY_EXPORT_SPEC.md).
 *
 * @module ingestion-buddy/validators/schemas
 * @agent Agent 9 (buddy-validator)
 */

import { z } from 'zod';

/**
 * Common field validators
 */

const uuidSchema = z.string().uuid('Invalid UUID format');

const emailSchema = z
  .string()
  .email('Invalid email format')
  .toLowerCase()
  .trim();

const isoDateSchema = z
  .string()
  .datetime({ message: 'Invalid ISO 8601 datetime format' })
  .or(z.date().transform((d) => d.toISOString()));

const optionalIsoDateSchema = isoDateSchema.optional().nullable();

const urlSchema = z.string().url('Invalid URL format').optional().nullable();

/**
 * Buddy role enum
 */
export const BuddyRoleSchema = z.enum(['participant', 'buddy'], {
  errorMap: () => ({ message: 'Role must be either "participant" or "buddy"' }),
});

/**
 * Buddy match status enum
 */
export const MatchStatusSchema = z.enum(['pending', 'active', 'paused', 'completed', 'cancelled'], {
  errorMap: () => ({
    message: 'Status must be one of: pending, active, paused, completed, cancelled',
  }),
});

/**
 * Event type enum (formal events)
 */
export const EventTypeSchema = z.enum([
  'cultural',
  'educational',
  'professional',
  'social',
  'support',
  'recreational',
  'language',
  'other',
]);

/**
 * Informal event type enum
 */
export const InformalEventTypeSchema = z.enum([
  'hangout',
  'activity',
  'workshop',
  'video_call',
  'call',
]);

/**
 * Skill category enum
 */
export const SkillCategorySchema = z.enum([
  'language',
  'tech',
  'professional',
  'career',
  'personal_development',
]);

/**
 * Check-in mood enum
 */
export const MoodSchema = z.enum(['struggling', 'okay', 'good', 'great']);

/**
 * Milestone type enum
 */
export const MilestoneTypeSchema = z.enum([
  'first_meeting',
  'first_call',
  'skill_milestone',
  'community_milestone',
  'custom',
]);

/**
 * 1. Users Schema
 *
 * Validates Buddy Program users (participants and buddies).
 */
export const BuddyUserSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  first_name: z.string().trim().min(1, 'First name cannot be empty'),
  last_name: z.string().trim().min(1, 'Last name cannot be empty'),
  role: BuddyRoleSchema,
  joined_at: isoDateSchema,
  language_preference: z.string().trim().optional().nullable(),
  interests: z.array(z.string()).optional().nullable(),
  location: z.string().trim().optional().nullable(),
});

export type BuddyUser = z.infer<typeof BuddyUserSchema>;

/**
 * 2. Buddy Matches Schema
 *
 * Validates 1:1 buddy pairings.
 */
export const BuddyMatchSchema = z
  .object({
    match_id: uuidSchema,
    participant_id: uuidSchema,
    buddy_id: uuidSchema,
    matched_at: isoDateSchema,
    status: MatchStatusSchema,
    ended_at: optionalIsoDateSchema,
    end_reason: z.string().trim().optional().nullable(),
    duration_days: z.number().int().nonnegative().optional().nullable(),
    sessions_completed: z.number().int().nonnegative().optional().nullable(),
    events_attended: z.number().int().nonnegative().optional().nullable(),
  })
  .refine((data) => data.participant_id !== data.buddy_id, {
    message: 'Participant and buddy cannot be the same person',
    path: ['participant_id'],
  })
  .refine(
    (data) => {
      // If status is completed/cancelled, ended_at must be provided
      if (data.status === 'completed' || data.status === 'cancelled') {
        return data.ended_at !== null && data.ended_at !== undefined;
      }
      return true;
    },
    {
      message: 'ended_at is required when status is completed or cancelled',
      path: ['ended_at'],
    }
  );

export type BuddyMatch = z.infer<typeof BuddyMatchSchema>;

/**
 * 3. Events Schema (Formal Program Events)
 *
 * Validates formal program events.
 */
export const BuddyEventSchema = z.object({
  event_id: uuidSchema,
  event_name: z.string().trim().min(1, 'Event name cannot be empty'),
  event_type: EventTypeSchema,
  event_date: isoDateSchema,
  duration_minutes: z.number().int().positive().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  location_details: z.record(z.any()).optional().nullable(),
  is_virtual: z.boolean().optional().nullable(),
  is_recurring: z.boolean().optional().nullable(),
  max_participants: z.number().int().positive().optional().nullable(),
  organizer_id: uuidSchema.optional().nullable(),
  description: z.string().trim().optional().nullable(),
});

export type BuddyEvent = z.infer<typeof BuddyEventSchema>;

/**
 * 4. Event Attendance Schema
 *
 * Validates event attendance records.
 */
export const EventAttendanceSchema = z.object({
  attendance_id: uuidSchema,
  event_id: uuidSchema,
  user_id: uuidSchema,
  attended_at: isoDateSchema,
  is_organizer: z.boolean().optional().nullable(),
  duration_minutes: z.number().int().positive().optional().nullable(),
  feedback_rating: z.number().min(0).max(1).optional().nullable(),
  feedback_text: z.string().trim().optional().nullable(),
});

export type EventAttendance = z.infer<typeof EventAttendanceSchema>;

/**
 * 5. Skill Exchange Sessions Schema
 *
 * Validates skill exchange (teaching/learning) sessions.
 */
export const SkillSessionSchema = z
  .object({
    session_id: uuidSchema,
    teacher_id: uuidSchema,
    learner_id: uuidSchema,
    skill_category: SkillCategorySchema,
    skill_name: z.string().trim().min(1, 'Skill name cannot be empty'),
    session_date: isoDateSchema,
    duration_minutes: z.number().int().positive().optional().nullable(),
    session_number: z.number().int().positive().optional().nullable(),
    skill_level: z.number().int().min(1).max(5).optional().nullable(),
    teacher_rating: z.number().min(0).max(1).optional().nullable(),
    learner_rating: z.number().min(0).max(1).optional().nullable(),
    learner_progress: z
      .enum(['no-progress', 'some-progress', 'good-progress', 'excellent-progress'])
      .optional()
      .nullable(),
    session_notes: z.string().trim().optional().nullable(),
  })
  .refine((data) => data.teacher_id !== data.learner_id, {
    message: 'Teacher and learner cannot be the same person',
    path: ['teacher_id'],
  });

export type SkillSession = z.infer<typeof SkillSessionSchema>;

/**
 * 6. Check-ins Schema
 *
 * Validates buddy check-in wellness records.
 */
export const CheckinSchema = z.object({
  checkin_id: uuidSchema,
  match_id: uuidSchema,
  user_id: uuidSchema,
  checkin_date: isoDateSchema,
  mood: MoodSchema,
  duration_minutes: z.number().int().positive().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  support_needed: z.string().trim().optional().nullable(),
});

export type Checkin = z.infer<typeof CheckinSchema>;

/**
 * 7. Feedback Schema
 *
 * Validates feedback between users.
 */
export const FeedbackSchema = z
  .object({
    feedback_id: uuidSchema,
    from_user_id: uuidSchema,
    to_user_id: uuidSchema,
    feedback_type: z.enum(['buddy', 'event', 'skill_session']),
    related_id: uuidSchema.optional().nullable(), // Event ID, skill session ID, etc.
    rating: z.number().min(0).max(1, 'Rating must be between 0 and 1'),
    feedback_text: z.string().trim().optional().nullable(),
    feedback_categories: z
      .object({
        communication: z.number().min(0).max(1).optional(),
        helpfulness: z.number().min(0).max(1).optional(),
        engagement: z.number().min(0).max(1).optional(),
        professionalism: z.number().min(0).max(1).optional(),
      })
      .optional()
      .nullable(),
    submitted_at: isoDateSchema,
    allow_anonymous: z.boolean().optional().nullable(),
  })
  .refine((data) => data.from_user_id !== data.to_user_id, {
    message: 'Cannot provide feedback to yourself',
    path: ['from_user_id'],
  });

export type Feedback = z.infer<typeof FeedbackSchema>;

/**
 * 8. Milestones & Achievements Schema
 *
 * Validates user milestone achievements.
 */
export const MilestoneSchema = z.object({
  milestone_id: uuidSchema,
  user_id: uuidSchema,
  milestone_type: MilestoneTypeSchema,
  milestone_name: z.string().trim().min(1, 'Milestone name cannot be empty'),
  achieved_at: isoDateSchema,
  description: z.string().trim().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

export type Milestone = z.infer<typeof MilestoneSchema>;

/**
 * Export Metadata Schema (for JSON exports)
 */
export const ExportMetadataSchema = z.object({
  exported_at: isoDateSchema,
  export_version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid semver format'),
  company_id: uuidSchema.optional(),
  company_name: z.string().trim().optional(),
  date_range: z
    .object({
      from: isoDateSchema,
      to: isoDateSchema,
    })
    .optional(),
  entity_types: z.array(z.string()),
  record_counts: z.record(z.number().int().nonnegative()),
});

export type ExportMetadata = z.infer<typeof ExportMetadataSchema>;

/**
 * Batch validation result
 */
export interface ValidationResult<T> {
  valid: T[];
  invalid: Array<{
    index: number;
    record: any;
    errors: z.ZodError;
  }>;
  stats: {
    total: number;
    valid: number;
    invalid: number;
    successRate: number;
  };
}
