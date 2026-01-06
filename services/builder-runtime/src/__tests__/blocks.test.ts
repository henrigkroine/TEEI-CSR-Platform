import { describe, it, expect } from 'vitest';
import {
  BlockType,
  MetricBlockSchema,
  validateDependencies,
  topologicalSort
} from '../canvas/blocks.js';

describe('Canvas Blocks', () => {
  describe('Block Schema Validation', () => {
    it('should validate metric block', () => {
      const block = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: BlockType.METRIC,
        title: 'Total SROI',
        position: { x: 0, y: 0, width: 4, height: 2 },
        dependencies: [],
        version: '1.1.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        config: {
          metric: 'sroi',
          aggregation: 'sum',
          dateRange: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-12-31T23:59:59Z'
          },
          filters: [],
          format: 'currency',
          precision: 2
        }
      };

      const result = MetricBlockSchema.safeParse(block);
      expect(result.success).toBe(true);
    });
  });

  describe('Dependency Validation', () => {
    it('should detect circular dependencies', () => {
      const blocks = [
        {
          id: 'a',
          type: BlockType.CHART,
          dependencies: ['b'],
          title: 'Block A',
          position: { x: 0, y: 0, width: 4, height: 2 },
          version: '1.1.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          config: {
            chartType: 'line',
            dataSource: { table: 'test', xAxis: 'x', yAxis: 'y', aggregation: 'sum' },
            dateRange: { start: '2024-01-01T00:00:00Z', end: '2024-12-31T23:59:59Z' },
            filters: []
          }
        },
        {
          id: 'b',
          type: BlockType.CHART,
          dependencies: ['a'],  // Circular!
          title: 'Block B',
          position: { x: 4, y: 0, width: 4, height: 2 },
          version: '1.1.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          config: {
            chartType: 'bar',
            dataSource: { table: 'test', xAxis: 'x', yAxis: 'y', aggregation: 'sum' },
            dateRange: { start: '2024-01-01T00:00:00Z', end: '2024-12-31T23:59:59Z' },
            filters: []
          }
        }
      ];

      const result = validateDependencies(blocks);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should allow valid dependencies', () => {
      const blocks = [
        {
          id: 'filter',
          type: BlockType.FILTER,
          dependencies: [],
          title: 'Date Filter',
          position: { x: 0, y: 0, width: 12, height: 1 },
          version: '1.1.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          config: { filterType: 'date_range', required: false }
        },
        {
          id: 'chart',
          type: BlockType.CHART,
          dependencies: ['filter'],
          title: 'Impact Chart',
          position: { x: 0, y: 1, width: 6, height: 4 },
          version: '1.1.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          config: {
            chartType: 'line',
            dataSource: { table: 'impact_metrics', xAxis: 'date', yAxis: 'value', aggregation: 'sum' },
            dateRange: { start: '2024-01-01T00:00:00Z', end: '2024-12-31T23:59:59Z' },
            filters: []
          }
        }
      ];

      const result = validateDependencies(blocks);
      expect(result.valid).toBe(true);
    });
  });

  describe('Topological Sort', () => {
    it('should order blocks by dependencies', () => {
      const blocks = [
        {
          id: 'c',
          type: BlockType.METRIC,
          dependencies: ['a', 'b'],
          title: 'Block C',
          position: { x: 0, y: 2, width: 4, height: 2 },
          version: '1.1.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          config: { metric: 'sroi', aggregation: 'sum', dateRange: { start: '2024-01-01T00:00:00Z', end: '2024-12-31T23:59:59Z' }, filters: [], format: 'number', precision: 2 }
        },
        {
          id: 'a',
          type: BlockType.FILTER,
          dependencies: [],
          title: 'Block A',
          position: { x: 0, y: 0, width: 4, height: 1 },
          version: '1.1.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          config: { filterType: 'date_range', required: false }
        },
        {
          id: 'b',
          type: BlockType.FILTER,
          dependencies: ['a'],
          title: 'Block B',
          position: { x: 4, y: 0, width: 4, height: 1 },
          version: '1.1.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          config: { filterType: 'program', required: false }
        }
      ];

      const sorted = topologicalSort(blocks);

      const ids = sorted.map(b => b.id);
      expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
      expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('c'));
    });
  });
});
