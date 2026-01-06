import { pgTable, uuid, varchar, timestamp, integer, jsonb, text } from 'drizzle-orm/pg-core';
import { companies } from './users.js';

/**
 * Report lineage table for audit trail and provenance tracking
 * Stores metadata about generated reports including model, prompts, and citations
 */
export const reportLineage = pgTable('report_lineage', {
  id: uuid('id').defaultRandom().primaryKey(),
  reportId: uuid('report_id').notNull().unique(), // External report identifier
  companyId: uuid('company_id').notNull().references(() => companies.id),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),

  // Model information
  modelName: varchar('model_name', { length: 100 }).notNull(), // e.g., gpt-4-turbo, claude-3-opus
  modelVersion: varchar('model_version', { length: 50 }), // Model version if applicable
  providerName: varchar('provider_name', { length: 50 }).notNull(), // openai, anthropic

  // Prompt information
  promptVersion: varchar('prompt_version', { length: 100 }).notNull(), // e.g., impact-summary-v1.2
  promptTemplate: text('prompt_template'), // The actual template used
  locale: varchar('locale', { length: 10 }).default('en'), // en, es, fr

  // Token usage and cost tracking
  tokensInput: integer('tokens_input').notNull(),
  tokensOutput: integer('tokens_output').notNull(),
  tokensTotal: integer('tokens_total').notNull(),
  estimatedCostUsd: varchar('estimated_cost_usd', { length: 20 }), // Decimal as string for precision

  // Request metadata
  deterministic: jsonb('deterministic').default(false), // Whether deterministic seed was used
  temperature: varchar('temperature', { length: 10 }), // Temperature setting
  sections: jsonb('sections').notNull(), // Array of section types requested

  // Citation metadata
  citationCount: integer('citation_count').default(0),
  evidenceSnippetIds: jsonb('evidence_snippet_ids'), // Array of snippet IDs used

  // Request tracking
  requestId: varchar('request_id', { length: 100 }), // Correlation ID
  durationMs: integer('duration_ms'), // Processing time in milliseconds

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'), // User who requested the report
});

/**
 * Report sections table - stores individual sections of generated reports
 * Allows granular tracking of which sections were generated and their citations
 */
export const reportSections = pgTable('report_sections', {
  id: uuid('id').defaultRandom().primaryKey(),
  lineageId: uuid('lineage_id').notNull().references(() => reportLineage.id),
  sectionType: varchar('section_type', { length: 100 }).notNull(), // impact-summary, sroi-narrative, etc.
  content: text('content').notNull(), // Generated markdown/text content
  citationIds: jsonb('citation_ids'), // Array of citation IDs in this section
  wordCount: integer('word_count'),
  characterCount: integer('character_count'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Report citations table - stores individual citations used in reports
 * Links generated content back to evidence snippets for auditability
 */
export const reportCitations = pgTable('report_citations', {
  id: uuid('id').defaultRandom().primaryKey(),
  lineageId: uuid('lineage_id').notNull().references(() => reportLineage.id),
  sectionId: uuid('section_id').references(() => reportSections.id),
  citationNumber: integer('citation_number').notNull(), // Sequential number in report
  snippetId: uuid('snippet_id').notNull(), // References evidence_snippets.id
  snippetText: text('snippet_text'), // Cached snippet text for quick access
  relevanceScore: varchar('relevance_score', { length: 10 }), // 0.00-1.00
  positionInText: integer('position_in_text'), // Character offset where citation appears
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
