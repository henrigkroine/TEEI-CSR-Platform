import { pgTable, uuid, varchar, timestamp, text, decimal, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { programInstances } from './program-instances.js';

export const buddyMatches = pgTable('buddy_matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  participantId: uuid('participant_id').notNull().references(() => users.id),
  buddyId: uuid('buddy_id').notNull().references(() => users.id),
  matchedAt: timestamp('matched_at', { withTimezone: true }).defaultNow().notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, inactive, ended
  endedAt: timestamp('ended_at', { withTimezone: true }),
  // SWARM 6: Link to campaign via program instance
  programInstanceId: uuid('program_instance_id').references(() => programInstances.id, { onDelete: 'set null' }),
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

/**
 * Table for storing all Buddy System events received from webhooks
 * Supports idempotency and event replay
 */
export const buddySystemEvents = pgTable(
  'buddy_system_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id').notNull().unique(), // From event payload (BaseEvent.id)
    eventType: varchar('event_type', { length: 100 }).notNull(), // buddy.match.created, etc.
    userId: varchar('user_id', { length: 100 }), // Primary user ID (participantId, volunteerId, etc.)
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(), // Event timestamp
    payload: jsonb('payload').notNull(), // Full event payload
    correlationId: uuid('correlation_id'), // For event tracing
    processedAt: timestamp('processed_at', { withTimezone: true }), // When processed to domain tables
    derivedMetrics: jsonb('derived_metrics').default('[]').$type<Array<{
      type: string;
      metric_id: string;
      calculation_date: string;
      contribution?: number;
    }>>(), // Tracks which metrics have been derived from this event
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userTimestampIdx: index('buddy_events_user_timestamp_idx').on(table.userId, table.timestamp),
    eventTypeIdx: index('buddy_events_event_type_idx').on(table.eventType),
    eventIdIdx: index('buddy_events_event_id_idx').on(table.eventId),
  })
);
