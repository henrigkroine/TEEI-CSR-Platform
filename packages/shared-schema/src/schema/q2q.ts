import { pgTable, uuid, varchar, timestamp, decimal, text, pgEnum, index, jsonb, boolean } from 'drizzle-orm/pg-core';

// Enum for classification method
export const classificationMethodEnum = pgEnum('classification_method', [
  'ai_classifier',
  'rule_based',
  'manual'
]);

// Enum for supported languages
export const languageEnum = pgEnum('language', ['en', 'uk', 'no', 'unknown']);

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
  language: languageEnum('language').default('en'), // Detected language of the text
  topics: jsonb('topics'), // Array of detected topics (CV, interview, PM, dev, networking, mentorship)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  textIdIdx: index('outcome_scores_text_id_idx').on(table.textId),
  createdAtIdx: index('outcome_scores_created_at_idx').on(table.createdAt),
  dimensionIdx: index('outcome_scores_dimension_idx').on(table.dimension),
  languageIdx: index('outcome_scores_language_idx').on(table.language),
}));

export const evidenceSnippets = pgTable('evidence_snippets', {
  id: uuid('id').defaultRandom().primaryKey(),
  outcomeScoreId: uuid('outcome_score_id').references(() => outcomeScores.id),
  snippetText: text('snippet_text'),
  snippetHash: varchar('snippet_hash', { length: 64 }).unique(), // SHA-256 hash
  embeddingRef: varchar('embedding_ref', { length: 255 }), // Reference to vector DB
  embedding: text('embedding'), // JSON array of embedding vector
  sourceRef: varchar('source_ref', { length: 255 }), // Reference to original text position

  // Campaign linking (SWARM 6: Agent 4.4 - evidence-campaign-linker)
  // Denormalized for query performance (follows pattern in program_instances)
  programInstanceId: uuid('program_instance_id'), // FK to program_instances (optional - may not always be linked)
  campaignId: uuid('campaign_id'), // FK to campaigns (denormalized from instance)

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  outcomeScoreIdIdx: index('evidence_snippets_outcome_score_idx').on(table.outcomeScoreId),
  snippetHashIdx: index('evidence_snippets_hash_idx').on(table.snippetHash),

  // Campaign filtering indexes (SWARM 6)
  programInstanceIdIdx: index('evidence_snippets_program_instance_idx').on(table.programInstanceId),
  campaignIdIdx: index('evidence_snippets_campaign_id_idx').on(table.campaignId),
}));

// Model Registry table for Q2Q model governance
export const modelRegistry = pgTable('model_registry', {
  id: uuid('id').defaultRandom().primaryKey(),
  modelId: varchar('model_id', { length: 100 }).notNull().unique(), // e.g., q2q-claude-v1
  provider: varchar('provider', { length: 50 }).notNull(), // claude, openai, gemini
  modelName: varchar('model_name', { length: 100 }).notNull(), // e.g., claude-3-5-sonnet-20241022
  promptVersion: varchar('prompt_version', { length: 20 }).notNull(), // e.g., v1.0
  thresholds: jsonb('thresholds').notNull(), // Confidence thresholds for labels
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  active: boolean('active').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  modelIdIdx: index('model_registry_model_id_idx').on(table.modelId),
  providerIdx: index('model_registry_provider_idx').on(table.provider),
  activeIdx: index('model_registry_active_idx').on(table.active),
}));

// Drift Checks table for monitoring model performance drift
export const driftChecks = pgTable('drift_checks', {
  id: uuid('id').defaultRandom().primaryKey(),
  checkDate: timestamp('check_date', { withTimezone: true }).defaultNow().notNull(),
  label: varchar('label', { length: 50 }).notNull(), // Which label dimension
  language: languageEnum('language').notNull(),
  psiScore: decimal('psi_score', { precision: 6, scale: 4 }), // Population Stability Index
  jsScore: decimal('js_score', { precision: 6, scale: 4 }), // Jensen-Shannon divergence
  alertTriggered: boolean('alert_triggered').default(false).notNull(),
  baselineDistribution: jsonb('baseline_distribution'), // Baseline label distribution
  currentDistribution: jsonb('current_distribution'), // Current label distribution
  sampleSize: decimal('sample_size', { precision: 10, scale: 0 }), // Number of samples in check
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  checkDateIdx: index('drift_checks_check_date_idx').on(table.checkDate),
  labelIdx: index('drift_checks_label_idx').on(table.label),
  languageIdx: index('drift_checks_language_idx').on(table.language),
  alertIdx: index('drift_checks_alert_idx').on(table.alertTriggered),
}));

// Evaluation Runs table for tracking model evaluations
export const evalRuns = pgTable('eval_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  runName: varchar('run_name', { length: 255 }).notNull(),
  datasetId: uuid('dataset_id').notNull(), // Reference to calibration dataset
  modelId: varchar('model_id', { length: 100 }), // Reference to model registry
  language: languageEnum('language'),
  results: jsonb('results').notNull(), // F1, precision, recall per label
  confusionMatrices: jsonb('confusion_matrices'), // Confusion matrices per label
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  datasetIdIdx: index('eval_runs_dataset_id_idx').on(table.datasetId),
  modelIdIdx: index('eval_runs_model_id_idx').on(table.modelId),
  languageIdx: index('eval_runs_language_idx').on(table.language),
  createdAtIdx: index('eval_runs_created_at_idx').on(table.createdAt),
}));
