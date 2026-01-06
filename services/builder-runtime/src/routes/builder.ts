/**
 * Builder Runtime Routes - /v1/builder
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BuilderDashboardSchema, validateDashboard } from '../schema/builder.js';
import { QueryGraphCompiler } from '../compiler/query-graph.js';
import { SseBinder } from '../compiler/sse-binder.js';
import { ExportPayloadBuilder } from '../export/payload-builder.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('builder-routes');

export async function builderRoutes(fastify: FastifyInstance) {
  const compiler = new QueryGraphCompiler();
  const sseBinder = new SseBinder();
  const exportBuilder = new ExportPayloadBuilder();

  /**
   * POST /v1/builder/compile
   * Compile dashboard JSON to query graph
   */
  fastify.post(
    '/v1/builder/compile',
    {
      schema: {
        body: BuilderDashboardSchema,
        response: {
          200: z.object({
            success: z.boolean(),
            graph: z.any(),
            validation: z.object({
              valid: z.boolean(),
              violations: z.array(z.string()),
            }),
            metadata: z.object({
              compileTimeMs: z.number(),
              nodeCount: z.number(),
              estimatedCost: z.number(),
              estimatedTimeMs: z.number(),
            }),
          }),
          400: z.object({
            success: z.boolean(),
            error: z.string(),
            errors: z.array(z.string()).optional(),
          }),
        },
      },
    },
    async (request, reply) => {
      const startTime = Date.now();

      try {
        // Validate dashboard
        const validation = validateDashboard(request.body);
        if (!validation.valid || !validation.dashboard) {
          return reply.code(400).send({
            success: false,
            error: 'Dashboard validation failed',
            errors: validation.errors,
          });
        }

        const dashboard = validation.dashboard;

        // Compile to query graph
        const graph = await compiler.compile(dashboard);

        // Validate graph safety
        const graphValidation = compiler.validateGraph(graph);

        const compileTimeMs = Date.now() - startTime;

        return reply.send({
          success: true,
          graph,
          validation: graphValidation,
          metadata: {
            compileTimeMs,
            nodeCount: graph.nodes.length,
            estimatedCost: graph.estimatedCost,
            estimatedTimeMs: graph.estimatedTimeMs,
          },
        });
      } catch (error) {
        logger.error({ error }, 'Dashboard compilation failed');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Compilation failed',
        });
      }
    }
  );

  /**
   * POST /v1/builder/execute
   * Execute dashboard with live SSE updates
   */
  fastify.post(
    '/v1/builder/execute',
    {
      schema: {
        body: z.object({
          dashboardId: z.string(),
          graph: z.any(), // Pre-compiled query graph
        }),
      },
    },
    async (request, reply) => {
      const { dashboardId, graph } = request.body;

      try {
        // Set up SSE
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');

        const stream = sseBinder.createStream(dashboardId);
        stream.addClient(reply);

        // Dummy executor (in real impl, would call actual services)
        const executor = async (node: any) => {
          await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate work
          return { mockData: `Result for ${node.blockId}` };
        };

        // Execute graph with SSE
        const results = await sseBinder.executeWithSse(graph, executor);

        logger.info({ dashboardId, resultCount: results.size }, 'Dashboard execution complete');

        // Keep connection alive
        const keepAlive = setInterval(() => {
          try {
            reply.raw.write(': keepalive\n\n');
          } catch {
            clearInterval(keepAlive);
          }
        }, 30000);

        request.raw.on('close', () => {
          clearInterval(keepAlive);
          stream.removeClient(reply);
        });
      } catch (error) {
        logger.error({ error, dashboardId }, 'Dashboard execution failed');
        reply.raw.end();
      }
    }
  );

  /**
   * POST /v1/builder/export/pdf
   * Generate PDF export payload
   */
  fastify.post(
    '/v1/builder/export/pdf',
    {
      schema: {
        body: z.object({
          dashboard: BuilderDashboardSchema,
          results: z.record(z.any()),
          options: z.object({
            author: z.string(),
            watermark: z.string().optional(),
            includeCitations: z.boolean().default(true),
          }),
        }),
      },
    },
    async (request, reply) => {
      const { dashboard, results, options } = request.body;

      try {
        const resultsMap = new Map(Object.entries(results));
        const payload = await exportBuilder.buildPdfPayload(dashboard, resultsMap, options);

        return reply.send({
          success: true,
          payload,
        });
      } catch (error) {
        logger.error({ error }, 'PDF export payload generation failed');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Export failed',
        });
      }
    }
  );

  /**
   * POST /v1/builder/export/pptx
   * Generate PPTX export payload
   */
  fastify.post(
    '/v1/builder/export/pptx',
    {
      schema: {
        body: z.object({
          dashboard: BuilderDashboardSchema,
          results: z.record(z.any()),
          options: z.object({
            author: z.string(),
            template: z.string().optional(),
            brandColors: z.array(z.string()).optional(),
            includeCitations: z.boolean().default(true),
          }),
        }),
      },
    },
    async (request, reply) => {
      const { dashboard, results, options } = request.body;

      try {
        const resultsMap = new Map(Object.entries(results));
        const payload = await exportBuilder.buildPptxPayload(dashboard, resultsMap, options);

        return reply.send({
          success: true,
          payload,
        });
      } catch (error) {
        logger.error({ error }, 'PPTX export payload generation failed');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Export failed',
        });
      }
    }
  );

  /**
   * GET /v1/builder/schema
   * Get Builder schema version and documentation
   */
  fastify.get('/v1/builder/schema', async (request, reply) => {
    const { BUILDER_SCHEMA_VERSION } = await import('../schema/builder.js');

    return reply.send({
      success: true,
      version: BUILDER_SCHEMA_VERSION,
      blockTypes: ['kpi', 'chart', 'q2q_insight', 'impact_tile', 'narrative', 'table'],
      chartTypes: ['line', 'bar', 'area', 'pie', 'donut', 'scatter', 'heatmap'],
      documentation: 'See /docs/builder-schema.md for full schema documentation',
    });
  });
}
