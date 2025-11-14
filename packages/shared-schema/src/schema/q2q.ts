import { pgTable, uuid, varchar, timestamp, decimal, text } from 'drizzle-orm/pg-core';
import { users, companies } from './users.js';

export const outcomeScores = pgTable('outcome_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id), // For analytics joins
  companyId: uuid('company_id').references(() => companies.id), // For tenant filtering
  textId: uuid('text_id').notNull(), // Reference to source (feedback_id, checkin_id, etc.)
  textType: varchar('text_type', { length: 50 }), // buddy_feedback, kintell_feedback, checkin_note, etc.
  dimension: varchar('dimension', { length: 50 }).notNull(), // confidence, belonging, lang_level_proxy, job_readiness, well_being
  score: decimal('score', { precision: 4, scale: 3 }).notNull(), // 0.000 - 1.000
  confidence: decimal('confidence', { precision: 4, scale: 3 }), // Model confidence
  modelVersion: varchar('model_version', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const evidenceSnippets = pgTable('evidence_snippets', {
  id: uuid('id').defaultRandom().primaryKey(),
  outcomeScoreId: uuid('outcome_score_id').references(() => outcomeScores.id),
  snippetText: text('snippet_text'),
  snippetHash: varchar('snippet_hash', { length: 64 }).unique(), // SHA-256 hash
  embeddingRef: varchar('embedding_ref', { length: 255 }), // Reference to vector DB
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
