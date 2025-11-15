/**
 * Builder JSON Schema - builder-schema-owner
 * Stable schema with versioning for Cockpit's Builder/Boardroom UI
 */

import { z } from 'zod';

/**
 * Schema version - follows semver
 */
export const BUILDER_SCHEMA_VERSION = '1.0.0';

/**
 * Block Types
 */
export const BlockType = z.enum([
  'kpi',           // Single metric KPI card
  'chart',         // Time-series or comparison chart
  'q2q_insight',   // Q2Q AI insight
  'impact_tile',   // Impact-In integration tile
  'narrative',     // Gen-AI narrative text
  'table',         // Data table
]);

/**
 * Chart Types
 */
export const ChartType = z.enum([
  'line',
  'bar',
  'area',
  'pie',
  'donut',
  'scatter',
  'heatmap',
]);

/**
 * RBAC Permissions
 */
export const PermissionLevel = z.enum([
  'view',          // Can view the dashboard
  'edit',          // Can edit layout and blocks
  'admin',         // Can manage permissions
  'owner',         // Full control
]);

export const RbacSchema = z.object({
  roles: z.array(z.string()), // Role IDs that can access
  users: z.array(z.string()), // User IDs that can access
  minPermission: PermissionLevel.default('view'),
});

/**
 * Data Source Configuration
 */
export const DataSourceSchema = z.object({
  type: z.enum(['nlq', 'metric', 'q2q', 'impact-in']),
  config: z.record(z.any()), // Type-specific config
  refreshInterval: z.number().optional(), // Seconds
  cache: z.boolean().default(true),
});

/**
 * KPI Block
 */
export const KpiBlockSchema = z.object({
  type: z.literal('kpi'),
  id: z.string(),
  title: z.string(),
  metricId: z.string(),
  aggregation: z.string(),
  timeRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  comparison: z
    .object({
      enabled: z.boolean(),
      baseline: z.enum(['previous_period', 'previous_year', 'custom']),
      customStart: z.string().optional(),
      customEnd: z.string().optional(),
    })
    .optional(),
  formatting: z.object({
    prefix: z.string().optional(),
    suffix: z.string().optional(),
    decimals: z.number().default(0),
    notation: z.enum(['standard', 'compact', 'scientific']).default('standard'),
  }),
  dataSource: DataSourceSchema,
  rbac: RbacSchema.optional(),
  piiSensitive: z.boolean().default(false),
});

/**
 * Chart Block
 */
export const ChartBlockSchema = z.object({
  type: z.literal('chart'),
  id: z.string(),
  title: z.string(),
  chartType: ChartType,
  metrics: z.array(
    z.object({
      metricId: z.string(),
      aggregation: z.string(),
      label: z.string().optional(),
      color: z.string().optional(),
    })
  ),
  dimensions: z.array(z.string()), // GROUP BY dimensions
  timeRange: z.object({
    start: z.string(),
    end: z.string(),
    granularity: z.string(),
  }),
  filters: z
    .array(
      z.object({
        field: z.string(),
        operator: z.string(),
        value: z.any(),
      })
    )
    .optional(),
  dataSource: DataSourceSchema,
  rbac: RbacSchema.optional(),
  piiSensitive: z.boolean().default(false),
});

/**
 * Q2Q Insight Block
 */
export const Q2qInsightBlockSchema = z.object({
  type: z.literal('q2q_insight'),
  id: z.string(),
  title: z.string(),
  feedbackText: z.string(), // Raw feedback or query
  outcomeFilters: z.array(z.string()).optional(), // Filter by outcome dimensions
  confidenceThreshold: z.number().default(0.7),
  dataSource: DataSourceSchema,
  rbac: RbacSchema.optional(),
  piiSensitive: z.boolean().default(true), // Q2Q often contains PII
});

/**
 * Impact-In Tile Block
 */
export const ImpactTileBlockSchema = z.object({
  type: z.literal('impact_tile'),
  id: z.string(),
  title: z.string(),
  entityType: z.enum(['program', 'activity', 'participant']),
  entityId: z.string(),
  metrics: z.array(z.string()), // Which Impact-In metrics to display
  dataSource: DataSourceSchema,
  rbac: RbacSchema.optional(),
  piiSensitive: z.boolean().default(false),
});

/**
 * Narrative Block
 */
export const NarrativeBlockSchema = z.object({
  type: z.literal('narrative'),
  id: z.string(),
  title: z.string(),
  template: z.enum(['quarterly', 'annual', 'investor', 'impact']),
  dataInputs: z.record(z.any()), // Metrics/dimensions for narrative generation
  tone: z.enum(['formal', 'casual', 'technical']).default('formal'),
  maxLength: z.number().default(500), // Words
  locale: z.enum(['en', 'es', 'fr', 'uk', 'no']).default('en'),
  dataSource: DataSourceSchema,
  rbac: RbacSchema.optional(),
  piiSensitive: z.boolean().default(false),
});

/**
 * Table Block
 */
export const TableBlockSchema = z.object({
  type: z.literal('table'),
  id: z.string(),
  title: z.string(),
  columns: z.array(
    z.object({
      field: z.string(),
      header: z.string(),
      width: z.number().optional(),
      sortable: z.boolean().default(true),
    })
  ),
  timeRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  filters: z
    .array(
      z.object({
        field: z.string(),
        operator: z.string(),
        value: z.any(),
      })
    )
    .optional(),
  pagination: z.object({
    enabled: z.boolean().default(true),
    pageSize: z.number().default(20),
  }),
  dataSource: DataSourceSchema,
  rbac: RbacSchema.optional(),
  piiSensitive: z.boolean().default(false),
});

/**
 * Union of all block types
 */
export const BlockSchema = z.discriminatedUnion('type', [
  KpiBlockSchema,
  ChartBlockSchema,
  Q2qInsightBlockSchema,
  ImpactTileBlockSchema,
  NarrativeBlockSchema,
  TableBlockSchema,
]);

export type Block =
  | z.infer<typeof KpiBlockSchema>
  | z.infer<typeof ChartBlockSchema>
  | z.infer<typeof Q2qInsightBlockSchema>
  | z.infer<typeof ImpactTileBlockSchema>
  | z.infer<typeof NarrativeBlockSchema>
  | z.infer<typeof TableBlockSchema>;

/**
 * Dashboard Layout
 */
export const LayoutItemSchema = z.object({
  blockId: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(), // Width in grid units
  h: z.number(), // Height in grid units
  minW: z.number().optional(),
  minH: z.number().optional(),
  maxW: z.number().optional(),
  maxH: z.number().optional(),
});

export const LayoutSchema = z.object({
  cols: z.number().default(12), // Grid columns
  rowHeight: z.number().default(80), // Pixels
  items: z.array(LayoutItemSchema),
  responsive: z.boolean().default(true),
});

/**
 * Builder Dashboard
 */
export const BuilderDashboardSchema = z.object({
  version: z.string().default(BUILDER_SCHEMA_VERSION),
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tenantId: z.string(),
  createdBy: z.string(),
  createdAt: z.string(), // ISO date
  updatedAt: z.string(), // ISO date
  blocks: z.array(BlockSchema),
  layout: LayoutSchema,
  rbac: RbacSchema,
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export type BuilderDashboard = z.infer<typeof BuilderDashboardSchema>;

/**
 * Validate dashboard
 */
export function validateDashboard(dashboard: unknown): {
  valid: boolean;
  errors: string[];
  dashboard?: BuilderDashboard;
} {
  try {
    const validated = BuilderDashboardSchema.parse(dashboard);
    return { valid: true, errors: [], dashboard: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return {
      valid: false,
      errors: ['Unknown validation error'],
    };
  }
}

/**
 * Migrate dashboard between versions
 */
export function migrateDashboard(dashboard: any, targetVersion: string): BuilderDashboard {
  // Future: implement migration logic when schema changes
  // For now, just return as-is since we're on v1.0.0

  if (dashboard.version === targetVersion) {
    return dashboard;
  }

  // Add migration logic here when needed
  throw new Error(`Migration from ${dashboard.version} to ${targetVersion} not implemented`);
}
