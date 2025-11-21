/**
 * Data Trust Catalog API Routes
 *
 * Endpoints for dataset catalog, lineage, quality, and semantic metrics.
 */

import { FastifyPluginAsync } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import {
  tenantScopingMiddleware,
  getTenantFilter,
  logCatalogAudit,
  type TenantScopedRequest,
} from '../middleware/tenant-scoping.js';
import {
  queryDatasets,
  getDatasetById,
  getDatasetSchema,
  getCatalogSummary,
} from '../queries/datasets.js';
import { getLineageGraph } from '../queries/lineage.js';
import { getQualityHistory, getLatestQualityRun } from '../queries/quality.js';
import { queryMetrics } from '../queries/metrics.js';
import type { CatalogFilters, DatasetProfile, FreshnessDataPoint } from '@teei/shared-types';

const logger = createServiceLogger('catalog:routes');

/**
 * ETag generation for caching
 */
function generateETag(data: any): string {
  // Simple hash - in production, use proper hash function
  return Buffer.from(JSON.stringify(data)).toString('base64').substring(0, 32);
}

/**
 * Catalog routes
 */
export const catalogRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply tenant scoping to all routes
  fastify.addHook('preHandler', tenantScopingMiddleware);

  /**
   * GET /catalog/datasets
   * List catalog datasets with filters and pagination
   */
  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      domain?: string | string[];
      gdprCategory?: string | string[];
      freshnessStatus?: string | string[];
      qualityStatus?: string | string[];
      search?: string;
      sortBy?: string;
      sortOrder?: string;
    };
  }>('/datasets', async (request: TenantScopedRequest, reply) => {
    const page = parseInt(request.query.page || '1');
    const limit = Math.min(parseInt(request.query.limit || '20'), 100);
    const sortBy = request.query.sortBy || 'name';
    const sortOrder = (request.query.sortOrder || 'asc') as 'asc' | 'desc';

    const filters: CatalogFilters = {
      domain: Array.isArray(request.query.domain) ? request.query.domain as any : request.query.domain ? [request.query.domain] as any : undefined,
      gdprCategory: Array.isArray(request.query.gdprCategory) ? request.query.gdprCategory as any : request.query.gdprCategory ? [request.query.gdprCategory] as any : undefined,
      freshnessStatus: Array.isArray(request.query.freshnessStatus) ? request.query.freshnessStatus as any : request.query.freshnessStatus ? [request.query.freshnessStatus] as any : undefined,
      qualityStatus: Array.isArray(request.query.qualityStatus) ? request.query.qualityStatus as any : request.query.qualityStatus ? [request.query.qualityStatus] as any : undefined,
      search: request.query.search,
    };

    try {
      const tenantFilter = getTenantFilter(request);
      const result = await queryDatasets(filters, page, limit, sortBy, sortOrder, tenantFilter);

      return result;
    } catch (error) {
      logger.error({ error }, 'Error listing datasets');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list datasets',
      });
    }
  });

  /**
   * GET /catalog/datasets/:datasetId
   * Get dataset profile with lineage, quality, and schema
   */
  fastify.get<{
    Params: { datasetId: string };
    Querystring: {
      includeLineage?: string;
      includeQualityHistory?: string;
      includeSchema?: string;
    };
  }>('/datasets/:datasetId', async (request: TenantScopedRequest, reply) => {
    const { datasetId } = request.params;
    const includeLineage = request.query.includeLineage !== 'false';
    const includeQualityHistory = request.query.includeQualityHistory !== 'false';
    const includeSchema = request.query.includeSchema === 'true';

    try {
      const tenantFilter = getTenantFilter(request);
      const dataset = await getDatasetById(datasetId, tenantFilter);

      if (!dataset) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Dataset ${datasetId} not found`,
        });
      }

      // Build profile
      const profile: DatasetProfile = {
        dataset,
        lineageGraph: includeLineage ? await getLineageGraph(datasetId, 'both', 3) : undefined as any,
        qualityRunHistory: includeQualityHistory ? await getQualityHistory(datasetId, 7) : undefined as any,
        relatedMetrics: [], // TODO: Query metrics that use this dataset
        schemaDetails: includeSchema ? await getDatasetSchema(datasetId) : null,
        sampleData: null, // TODO: Query sample data if requested
        freshnessHistory: [], // TODO: Query freshness history
      };

      // Generate ETag for caching
      const etag = generateETag(profile);
      const clientETag = request.headers['if-none-match'];

      if (clientETag === etag) {
        return reply.code(304).send();
      }

      reply.header('ETag', etag);
      reply.header('Cache-Control', 'max-age=300'); // 5 minutes

      // Log audit event
      await logCatalogAudit(request, 'view', 'dataset', datasetId);

      return profile;
    } catch (error) {
      logger.error({ error, datasetId }, 'Error getting dataset profile');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get dataset profile',
      });
    }
  });

  /**
   * GET /catalog/metrics
   * List semantic metrics
   */
  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      category?: string | string[];
      metricType?: string | string[];
      search?: string;
    };
  }>('/metrics', async (request: TenantScopedRequest, reply) => {
    const page = parseInt(request.query.page || '1');
    const limit = Math.min(parseInt(request.query.limit || '20'), 100);

    const filters = {
      category: Array.isArray(request.query.category) ? request.query.category : request.query.category ? [request.query.category] : undefined,
      metricType: Array.isArray(request.query.metricType) ? request.query.metricType : request.query.metricType ? [request.query.metricType] : undefined,
      search: request.query.search,
    };

    try {
      const result = await queryMetrics(page, limit, filters);
      return result;
    } catch (error) {
      logger.error({ error }, 'Error listing metrics');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list metrics',
      });
    }
  });

  /**
   * GET /catalog/lineage/:datasetId
   * Get lineage graph for dataset
   */
  fastify.get<{
    Params: { datasetId: string };
    Querystring: {
      direction?: 'upstream' | 'downstream' | 'both';
      maxDepth?: string;
    };
  }>('/lineage/:datasetId', async (request: TenantScopedRequest, reply) => {
    const { datasetId } = request.params;
    const direction = request.query.direction || 'both';
    const maxDepth = Math.min(parseInt(request.query.maxDepth || '3'), 10);

    try {
      const graph = await getLineageGraph(datasetId, direction, maxDepth);

      // Generate ETag for caching
      const etag = generateETag(graph);
      const clientETag = request.headers['if-none-match'];

      if (clientETag === etag) {
        return reply.code(304).send();
      }

      reply.header('ETag', etag);
      reply.header('Cache-Control', 'max-age=300'); // 5 minutes

      // Log audit event
      await logCatalogAudit(request, 'view', 'lineage', datasetId);

      return graph;
    } catch (error) {
      logger.error({ error, datasetId }, 'Error getting lineage graph');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get lineage graph',
      });
    }
  });

  /**
   * GET /catalog/quality/:datasetId
   * Get quality run history for dataset
   */
  fastify.get<{
    Params: { datasetId: string };
    Querystring: {
      days?: string;
    };
  }>('/quality/:datasetId', async (request: TenantScopedRequest, reply) => {
    const { datasetId } = request.params;
    const days = Math.min(parseInt(request.query.days || '7'), 90);

    try {
      const history = await getQualityHistory(datasetId, days);

      // Log audit event
      await logCatalogAudit(request, 'view', 'quality', datasetId);

      return history;
    } catch (error) {
      logger.error({ error, datasetId }, 'Error getting quality history');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get quality history',
      });
    }
  });

  /**
   * GET /catalog/summary
   * Get catalog summary statistics
   */
  fastify.get('/summary', async (request: TenantScopedRequest, reply) => {
    try {
      const tenantFilter = getTenantFilter(request);
      const summary = await getCatalogSummary(tenantFilter);
      return summary;
    } catch (error) {
      logger.error({ error }, 'Error getting catalog summary');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get catalog summary',
      });
    }
  });

  /**
   * POST /catalog/export
   * Export catalog data in various formats
   */
  fastify.post<{
    Body: {
      format: 'json' | 'csv' | 'png';
      entity: 'datasets' | 'metrics' | 'lineage' | 'quality';
      entityIds: string[];
    };
  }>('/export', async (request: TenantScopedRequest, reply) => {
    const { format, entity, entityIds } = request.body;

    try {
      // Log audit event
      await logCatalogAudit(request, 'export', entity as any, entityIds.join(','), {
        format,
        entityCount: entityIds.length,
      });

      // TODO: Implement actual export logic
      if (format === 'json') {
        return {
          format,
          entity,
          entityIds,
          exportedAt: new Date().toISOString(),
          data: [], // Mock data
        };
      }

      if (format === 'csv') {
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="catalog-${entity}-export.csv"`);
        return 'id,name,status\n'; // Mock CSV
      }

      if (format === 'png') {
        reply.header('Content-Type', 'image/png');
        reply.header('Content-Disposition', `attachment; filename="lineage-graph.png"`);
        // TODO: Generate PNG of lineage graph
        return Buffer.from('mock-png-data');
      }

      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Unsupported export format',
      });
    } catch (error) {
      logger.error({ error }, 'Error exporting catalog data');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to export data',
      });
    }
  });

  /**
   * GET /catalog/quality-events
   * SSE stream for quality run completions
   */
  fastify.get('/quality-events', async (request: TenantScopedRequest, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    // Send heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      reply.raw.write(':heartbeat\n\n');
    }, 30000);

    // Cleanup on disconnect
    request.raw.on('close', () => {
      clearInterval(heartbeat);
      reply.raw.end();
    });

    // TODO: Subscribe to quality run events from queue/pubsub
    // For now, send a mock event
    setTimeout(() => {
      const event = {
        event: 'quality_run_complete',
        data: JSON.stringify({
          datasetId: '550e8400-e29b-41d4-a716-446655440000',
          datasetName: 'users',
          status: 'pass',
          passRate: 98.5,
        }),
      };
      reply.raw.write(`event: ${event.event}\ndata: ${event.data}\n\n`);
    }, 5000);
  });
};
