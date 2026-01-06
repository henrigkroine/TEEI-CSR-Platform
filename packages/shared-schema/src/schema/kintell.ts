import { pgTable, uuid, varchar, timestamp, integer, decimal, text, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { programInstances } from './program-instances.js';
import { ingestionBatches } from './ingestion-batches.js';

export const kintellSessions = pgTable('kintell_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  externalSessionId: varchar('external_session_id', { length: 255 }),
  sessionType: varchar('session_type', { length: 50 }).notNull(), // language | mentorship
  participantId: uuid('participant_id').notNull().references(() => users.id),
  volunteerId: uuid('volunteer_id').notNull().references(() => users.id),

  // NEW: Data lineage and program context
  batchId: uuid('batch_id').references(() => ingestionBatches.id), // Which import batch created this session
  programInstanceId: uuid('program_instance_id').references(() => programInstances.id), // Which program instance

  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  durationMinutes: integer('duration_minutes'),
  rating: decimal('rating', { precision: 3, scale: 2 }), // 0.00 - 1.00
  feedbackText: text('feedback_text'),
  languageLevel: varchar('language_level', { length: 10 }), // CEFR: A1, A2, B1, B2, C1, C2
  topics: jsonb('topics').$type<string[]>(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // NEW: Indexes for lineage and program queries
  batchIdIdx: index('kintell_sessions_batch_id_idx').on(table.batchId),
  programInstanceIdIdx: index('kintell_sessions_program_instance_id_idx').on(table.programInstanceId),
  externalSessionIdIdx: index('kintell_sessions_external_session_id_idx').on(table.externalSessionId),
  participantIdIdx: index('kintell_sessions_participant_id_idx').on(table.participantId),
  volunteerIdIdx: index('kintell_sessions_volunteer_id_idx').on(table.volunteerId),
  completedAtIdx: index('kintell_sessions_completed_at_idx').on(table.completedAt),
}));
