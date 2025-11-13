import { pgTable, uuid, varchar, timestamp, text, decimal } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const buddyMatches = pgTable('buddy_matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  participantId: uuid('participant_id').notNull().references(() => users.id),
  buddyId: uuid('buddy_id').notNull().references(() => users.id),
  matchedAt: timestamp('matched_at', { withTimezone: true }).defaultNow().notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, inactive, ended
  endedAt: timestamp('ended_at', { withTimezone: true }),
});

export const buddyEvents = pgTable('buddy_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  matchId: uuid('match_id').notNull().references(() => buddyMatches.id),
  eventType: varchar('event_type', { length: 100 }), // hangout, activity, workshop, etc.
  eventDate: timestamp('event_date', { withTimezone: true }),
  description: text('description'),
  location: varchar('location', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const buddyCheckins = pgTable('buddy_checkins', {
  id: uuid('id').defaultRandom().primaryKey(),
  matchId: uuid('match_id').notNull().references(() => buddyMatches.id),
  checkinDate: timestamp('checkin_date', { withTimezone: true }).defaultNow().notNull(),
  mood: varchar('mood', { length: 50 }), // great, good, okay, struggling, difficult
  notes: text('notes'),
});

export const buddyFeedback = pgTable('buddy_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  matchId: uuid('match_id').notNull().references(() => buddyMatches.id),
  fromRole: varchar('from_role', { length: 50 }).notNull(), // participant | buddy
  rating: decimal('rating', { precision: 3, scale: 2 }).notNull(), // 0.00 - 1.00
  feedbackText: text('feedback_text'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
});
