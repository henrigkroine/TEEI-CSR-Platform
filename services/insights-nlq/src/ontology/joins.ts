/**
 * Join Graph - ontology-architect
 * Defines safe join paths between tables with row-level security
 */

import { z } from 'zod';

export const JoinType = z.enum(['inner', 'left', 'right']);

export const JoinRuleSchema = z.object({
  fromTable: z.string(),
  toTable: z.string(),
  joinType: JoinType,
  onConditions: z.array(
    z.object({
      fromColumn: z.string(),
      toColumn: z.string(),
      operator: z.enum(['=', '>', '<', '>=', '<=', 'IN']).default('='),
    })
  ),
  requiresTenantFilter: z.boolean().default(true), // Must include tenant_id in WHERE
  maxCardinality: z.number().optional(), // Max rows from join
  costWeight: z.number().default(1), // Query cost multiplier
  description: z.string(),
});

export type JoinRule = z.infer<typeof JoinRuleSchema>;

/**
 * Join Graph - All allowed joins
 */
export const JOIN_GRAPH: Record<string, JoinRule> = {
  'volunteer_activities->programs': {
    fromTable: 'volunteer_activities',
    toTable: 'programs',
    joinType: 'left',
    onConditions: [
      {
        fromColumn: 'program_id',
        toColumn: 'id',
        operator: '=',
      },
    ],
    requiresTenantFilter: true,
    maxCardinality: 1000,
    costWeight: 1.1,
    description: 'Join volunteer activities to programs for program metadata',
  },

  'volunteer_activities->employees': {
    fromTable: 'volunteer_activities',
    toTable: 'employees',
    joinType: 'left',
    onConditions: [
      {
        fromColumn: 'employee_id',
        toColumn: 'id',
        operator: '=',
      },
    ],
    requiresTenantFilter: true,
    maxCardinality: 50000,
    costWeight: 1.3,
    description: 'Join volunteer activities to employees for demographic data (PII-sensitive)',
  },

  'donations->campaigns': {
    fromTable: 'donations',
    toTable: 'campaigns',
    joinType: 'left',
    onConditions: [
      {
        fromColumn: 'campaign_id',
        toColumn: 'id',
        operator: '=',
      },
    ],
    requiresTenantFilter: true,
    maxCardinality: 500,
    costWeight: 1.0,
    description: 'Join donations to campaigns for campaign metadata',
  },

  'activities->programs': {
    fromTable: 'activities',
    toTable: 'programs',
    joinType: 'left',
    onConditions: [
      {
        fromColumn: 'program_id',
        toColumn: 'id',
        operator: '=',
      },
    ],
    requiresTenantFilter: true,
    maxCardinality: 1000,
    costWeight: 1.1,
    description: 'Join activities to programs',
  },

  'sroi_calculations->programs': {
    fromTable: 'sroi_calculations',
    toTable: 'programs',
    joinType: 'left',
    onConditions: [
      {
        fromColumn: 'program_id',
        toColumn: 'id',
        operator: '=',
      },
    ],
    requiresTenantFilter: true,
    maxCardinality: 1000,
    costWeight: 1.5,
    description: 'Join SROI calculations to programs',
  },

  'environmental_impact->programs': {
    fromTable: 'environmental_impact',
    toTable: 'programs',
    joinType: 'left',
    onConditions: [
      {
        fromColumn: 'program_id',
        toColumn: 'id',
        operator: '=',
      },
    ],
    requiresTenantFilter: true,
    maxCardinality: 1000,
    costWeight: 1.2,
    description: 'Join environmental impact to programs',
  },
};

/**
 * Get join rule by key
 */
export function getJoinRule(fromTable: string, toTable: string): JoinRule | null {
  const key = `${fromTable}->${toTable}`;
  return JOIN_GRAPH[key] || null;
}

/**
 * Check if join is allowed
 */
export function isJoinAllowed(fromTable: string, toTable: string): boolean {
  const key = `${fromTable}->${toTable}`;
  return key in JOIN_GRAPH;
}

/**
 * Get all possible joins from a table
 */
export function getJoinsFromTable(table: string): JoinRule[] {
  return Object.entries(JOIN_GRAPH)
    .filter(([key]) => key.startsWith(`${table}->`))
    .map(([, rule]) => rule);
}

/**
 * Calculate total join cost for a path
 */
export function calculateJoinCost(joins: JoinRule[]): number {
  return joins.reduce((total, join) => total * join.costWeight, 1);
}

/**
 * Validate join path doesn't create cycles
 */
export function validateJoinPath(tables: string[]): boolean {
  const seen = new Set<string>();
  for (const table of tables) {
    if (seen.has(table)) {
      return false; // Cycle detected
    }
    seen.add(table);
  }
  return true;
}
