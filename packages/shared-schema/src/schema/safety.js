import { pgTable, uuid, varchar, timestamp, decimal, text, boolean, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
// Enums for safety review queue
export const reviewQueueStatusEnum = pgEnum('review_queue_status', ['pending', 'reviewed', 'escalated', 'dismissed']);
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
}, (table) => ({
    contentIdIdx: index('safety_flags_content_id_idx').on(table.contentId),
    reviewStatusIdx: index('safety_flags_review_status_idx').on(table.reviewStatus),
}));
export const safetyReviewQueue = pgTable('safety_review_queue', {
    id: uuid('id').defaultRandom().primaryKey(),
    flagId: uuid('flag_id').notNull().references(() => safetyFlags.id),
    status: reviewQueueStatusEnum('status').notNull().default('pending'),
    assignedTo: uuid('assigned_to').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewerNotes: text('reviewer_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    flagIdIdx: index('review_queue_flag_id_idx').on(table.flagId),
    statusIdx: index('review_queue_status_idx').on(table.status),
    assignedToIdx: index('review_queue_assigned_to_idx').on(table.assignedTo),
}));
//# sourceMappingURL=safety.js.map