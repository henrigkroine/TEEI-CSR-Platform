import { pgTable, uuid, varchar, timestamp, decimal, text, boolean } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const safetyFlags = pgTable('safety_flags', {
  id: uuid('id').defaultRandom().primaryKey(),
  contentId: uuid('content_id').notNull(),
  contentType: varchar('content_type', { length: 50 }).notNull(), // feedback_text, checkin_note, message, other
  flagReason: varchar('flag_reason', { length: 100 }).notNull(), // profanity, pii_leakage, hate_speech, other
  confidence: decimal('confidence', { precision: 4, scale: 3 }),
  requiresHumanReview: boolean('requires_human_review').notNull().default(false),
  reviewStatus: varchar('review_status', { length: 50 }).default('pending'), // pending, approved, rejected, escalated
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewNotes: text('review_notes'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  raisedAt: timestamp('raised_at', { withTimezone: true }).defaultNow().notNull(),
});
