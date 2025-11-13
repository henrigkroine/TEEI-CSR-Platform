import { pgTable, uuid, varchar, timestamp, decimal, text, pgEnum, index } from 'drizzle-orm/pg-core';

// Enum for classification method
export const classificationMethodEnum = pgEnum('classification_method', [
  'ai_classifier',
  'rule_based',
  'manual'
]);

export const outcomeScores = pgTable('outcome_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  textId: uuid('text_id').notNull(), // Reference to source (feedback_id, checkin_id, etc.)
  textType: varchar('text_type', { length: 50 }), // buddy_feedback, kintell_feedback, checkin_note, etc.
  dimension: varchar('dimension', { length: 50 }).notNull(), // confidence, belonging, lang_level_proxy, job_readiness, well_being
  score: decimal('score', { precision: 4, scale: 3 }).notNull(), // 0.000 - 1.000
  confidence: decimal('confidence', { precision: 4, scale: 3 }), // Model confidence
  modelVersion: varchar('model_version', { length: 50 }),
  method: classificationMethodEnum('method').default('ai_classifier'), // How the score was generated
  providerUsed: varchar('provider_used', { length: 50 }), // AI provider: claude, openai, gemini
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  textIdIdx: index('outcome_scores_text_id_idx').on(table.textId),
  createdAtIdx: index('outcome_scores_created_at_idx').on(table.createdAt),
  dimensionIdx: index('outcome_scores_dimension_idx').on(table.dimension),
}));

export const evidenceSnippets = pgTable('evidence_snippets', {
  id: uuid('id').defaultRandom().primaryKey(),
  outcomeScoreId: uuid('outcome_score_id').references(() => outcomeScores.id),
  snippetText: text('snippet_text'),
  snippetHash: varchar('snippet_hash', { length: 64 }).unique(), // SHA-256 hash
  embeddingRef: varchar('embedding_ref', { length: 255 }), // Reference to vector DB
  embedding: text('embedding'), // JSON array of embedding vector
  sourceRef: varchar('source_ref', { length: 255 }), // Reference to original text position
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  outcomeScoreIdIdx: index('evidence_snippets_outcome_score_idx').on(table.outcomeScoreId),
  snippetHashIdx: index('evidence_snippets_hash_idx').on(table.snippetHash),
}));
