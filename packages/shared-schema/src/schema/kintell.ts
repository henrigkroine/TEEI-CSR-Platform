import { pgTable, uuid, varchar, timestamp, integer, decimal, text, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { programInstances } from './program-instances.js';

export const kintellSessions = pgTable('kintell_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  externalSessionId: varchar('external_session_id', { length: 255 }),
  sessionType: varchar('session_type', { length: 50 }).notNull(), // language | mentorship
  participantId: uuid('participant_id').notNull().references(() => users.id),
  volunteerId: uuid('volunteer_id').notNull().references(() => users.id),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  durationMinutes: integer('duration_minutes'),
  rating: decimal('rating', { precision: 3, scale: 2 }), // 0.00 - 1.00
  feedbackText: text('feedback_text'),
  languageLevel: varchar('language_level', { length: 10 }), // CEFR: A1, A2, B1, B2, C1, C2
  topics: jsonb('topics').$type<string[]>(),
  metadata: jsonb('metadata'),
  // SWARM 6: Link to campaign via program instance
  programInstanceId: uuid('program_instance_id').references(() => programInstances.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
