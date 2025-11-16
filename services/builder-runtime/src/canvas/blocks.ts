/**
 * Canvas Block Schema v1.1.0
 *
 * Defines block types for the Builder canvas WYSIWYG interface
 */

import { z } from 'zod';

/**
 * Block Types
 */
export enum BlockType {
  METRIC = 'metric',
  CHART = 'chart',
  TABLE = 'table',
  TEXT = 'text',
  FILTER = 'filter',
  NLQ = 'nlq',
  BENCHMARK = 'benchmark',
  FORECAST = 'forecast'
}

/**
 * Base Block Schema
 */
export const BaseBlockSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(BlockType),
  title: z.string().min(1).max(200),
  position: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    width: z.number().int().min(1).max(12),
    height: z.number().int().min(1).max(12)
  }),
  dependencies: z.array(z.string().uuid()).default([]),
  version: z.literal('1.1.0'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

/**
 * Metric Block - Display a single KPI
 */
export const MetricBlockSchema = BaseBlockSchema.extend({
  type: z.literal(BlockType.METRIC),
  config: z.object({
    metric: z.enum(['sroi', 'vis', 'lives_impacted', 'volunteer_hours', 'completion_rate']),
    aggregation: z.enum(['sum', 'avg', 'min', 'max', 'count']),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.enum(['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'like']),
      value: z.any()
    })).default([]),
    format: z.enum(['number', 'currency', 'percentage', 'duration']).default('number'),
    precision: z.number().int().min(0).max(4).default(2)
  })
});

/**
 * Chart Block - Visualize data
 */
export const ChartBlockSchema = BaseBlockSchema.extend({
  type: z.literal(BlockType.CHART),
  config: z.object({
    chartType: z.enum(['line', 'bar', 'pie', 'area', 'scatter', 'heatmap']),
    dataSource: z.object({
      table: z.string(),
      xAxis: z.string(),
      yAxis: z.string(),
      series: z.array(z.string()).optional(),
      aggregation: z.enum(['sum', 'avg', 'count', 'min', 'max']).default('sum')
    }),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.enum(['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'like']),
      value: z.any()
    })).default([]),
    style: z.object({
      colors: z.array(z.string()).optional(),
      showLegend: z.boolean().default(true),
      showGrid: z.boolean().default(true)
    }).optional()
  })
});

/**
 * Table Block - Display tabular data
 */
export const TableBlockSchema = BaseBlockSchema.extend({
  type: z.literal(BlockType.TABLE),
  config: z.object({
    dataSource: z.object({
      table: z.string(),
      columns: z.array(z.string()),
      orderBy: z.string().optional(),
      orderDirection: z.enum(['asc', 'desc']).default('asc'),
      limit: z.number().int().min(1).max(1000).default(100)
    }),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.enum(['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'like']),
      value: z.any()
    })).default([]),
    style: z.object({
      striped: z.boolean().default(true),
      bordered: z.boolean().default(true),
      hover: z.boolean().default(true)
    }).optional()
  })
});

/**
 * Text Block - Rich text content
 */
export const TextBlockSchema = BaseBlockSchema.extend({
  type: z.literal(BlockType.TEXT),
  config: z.object({
    content: z.string().max(10000),
    format: z.enum(['markdown', 'html', 'plain']).default('markdown')
  })
});

/**
 * Filter Block - Global filters
 */
export const FilterBlockSchema = BaseBlockSchema.extend({
  type: z.literal(BlockType.FILTER),
  config: z.object({
    filterType: z.enum(['date_range', 'program', 'cohort', 'status']),
    defaultValue: z.any().optional(),
    required: z.boolean().default(false)
  })
});

/**
 * NLQ Block - Natural Language Query
 */
export const NLQBlockSchema = BaseBlockSchema.extend({
  type: z.literal(BlockType.NLQ),
  config: z.object({
    query: z.string().min(3).max(2000),
    language: z.enum(['en', 'uk', 'no', 'ar', 'he']).default('en'),
    refreshInterval: z.number().int().min(0).max(3600).default(0), // seconds (0 = manual)
    displayAs: z.enum(['table', 'chart', 'metric']).default('table')
  })
});

/**
 * Benchmark Block - Industry/region comparison
 */
export const BenchmarkBlockSchema = BaseBlockSchema.extend({
  type: z.literal(BlockType.BENCHMARK),
  config: z.object({
    metric: z.enum(['sroi', 'vis', 'completion_rate', 'volunteer_hours']),
    cohortType: z.enum(['industry', 'region', 'size']),
    showPercentile: z.boolean().default(true),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    })
  })
});

/**
 * Forecast Block - Predictive analytics
 */
export const ForecastBlockSchema = BaseBlockSchema.extend({
  type: z.literal(BlockType.FORECAST),
  config: z.object({
    metric: z.enum(['sroi', 'vis', 'volunteer_hours', 'lives_impacted']),
    forecastPeriod: z.enum(['1month', '3months', '6months', '1year']),
    confidence: z.enum(['low', 'medium', 'high']).default('medium'),
    method: z.enum(['linear', 'exponential', 'prophet']).default('linear'),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    })
  })
});

/**
 * Union of all block types
 */
export const BlockSchema = z.discriminatedUnion('type', [
  MetricBlockSchema,
  ChartBlockSchema,
  TableBlockSchema,
  TextBlockSchema,
  FilterBlockSchema,
  NLQBlockSchema,
  BenchmarkBlockSchema,
  ForecastBlockSchema
]);

export type Block = z.infer<typeof BlockSchema>;
export type MetricBlock = z.infer<typeof MetricBlockSchema>;
export type ChartBlock = z.infer<typeof ChartBlockSchema>;
export type TableBlock = z.infer<typeof TableBlockSchema>;
export type TextBlock = z.infer<typeof TextBlockSchema>;
export type FilterBlock = z.infer<typeof FilterBlockSchema>;
export type NLQBlock = z.infer<typeof NLQBlockSchema>;
export type BenchmarkBlock = z.infer<typeof BenchmarkBlockSchema>;
export type ForecastBlock = z.infer<typeof ForecastBlockSchema>;

/**
 * Canvas Schema - Container for all blocks
 */
export const CanvasSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  blocks: z.array(BlockSchema),
  gridConfig: z.object({
    columns: z.number().int().min(1).max(24).default(12),
    rowHeight: z.number().int().min(10).max(200).default(50),
    gap: z.number().int().min(0).max(50).default(16)
  }),
  version: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().uuid(),
  tags: z.array(z.string()).default([])
});

export type Canvas = z.infer<typeof CanvasSchema>;

/**
 * Validate block dependencies (no cycles)
 */
export function validateDependencies(blocks: Block[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const blockMap = new Map(blocks.map(b => [b.id, b]));

  // Check for non-existent dependencies
  for (const block of blocks) {
    for (const depId of block.dependencies) {
      if (!blockMap.has(depId)) {
        errors.push(`Block ${block.id} depends on non-existent block ${depId}`);
      }
    }
  }

  // Check for cycles using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(blockId: string): boolean {
    if (!visited.has(blockId)) {
      visited.add(blockId);
      recursionStack.add(blockId);

      const block = blockMap.get(blockId);
      if (block) {
        for (const depId of block.dependencies) {
          if (!visited.has(depId) && hasCycle(depId)) {
            return true;
          } else if (recursionStack.has(depId)) {
            errors.push(`Circular dependency detected involving block ${blockId}`);
            return true;
          }
        }
      }
    }

    recursionStack.delete(blockId);
    return false;
  }

  for (const block of blocks) {
    if (!visited.has(block.id)) {
      hasCycle(block.id);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Topologically sort blocks for execution order
 */
export function topologicalSort(blocks: Block[]): Block[] {
  const blockMap = new Map(blocks.map(b => [b.id, b]));
  const visited = new Set<string>();
  const sorted: Block[] = [];

  function visit(blockId: string) {
    if (visited.has(blockId)) {
      return;
    }

    visited.add(blockId);
    const block = blockMap.get(blockId);

    if (block) {
      // Visit dependencies first
      for (const depId of block.dependencies) {
        visit(depId);
      }
      sorted.push(block);
    }
  }

  for (const block of blocks) {
    visit(block.id);
  }

  return sorted;
}
