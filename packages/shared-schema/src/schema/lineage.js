import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
/**
 * Tracks data lineage from raw events to calculated metrics
 * Provides audit trail for compliance (GRI, CSRD) and debugging
 *
 * Every calculated metric must record:
 * - Source event IDs that contributed to the calculation
 * - Calculation timestamp and formula version
 * - User who triggered calculation (if manual)
 * - Additional metadata for audit purposes
 */
export const metricLineage = pgTable('metric_lineage', {
    id: uuid('id').defaultRandom().primaryKey(),
    metricType: varchar('metric_type', { length: 50 }).notNull(), // 'sroi', 'vis', 'sdg_distribution'
    metricId: uuid('metric_id').notNull(), // References the calculated metric (e.g., sroi_calculations.id)
    sourceEventIds: jsonb('source_event_ids').notNull().$type(), // Array of event IDs from buddy_system_events
    calculationFormula: varchar('calculation_formula', { length: 100 }), // e.g., 'social_value / investment'
    calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
    calculatedBy: varchar('calculated_by', { length: 100 }), // User ID or 'system' for automated
    metadata: jsonb('metadata').$type(), // Additional context
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    metricTypeIdIdx: index('lineage_metric_type_id_idx').on(table.metricType, table.metricId),
    calculatedAtIdx: index('lineage_calculated_at_idx').on(table.calculatedAt),
    metricTypeIdx: index('lineage_metric_type_idx').on(table.metricType),
}));
//# sourceMappingURL=lineage.js.map