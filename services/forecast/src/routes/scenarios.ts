import { FastifyPluginAsync } from 'fastify';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateScenarioRequestSchema,
  UpdateScenarioRequestSchema,
  ExecuteScenarioRequestSchema,
  Scenario,
  ScenarioResult,
  ListScenariosResponse,
  ExecuteScenarioResponse,
  DeckExportPayload,
} from '@teei/shared-types';
import { executeScenario, fetchBaselineData } from '../lib/scenario-engine.js';

/**
 * Scenario API Routes
 */
export const scenarioRoutes: FastifyPluginAsync = async (fastify) => {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'teei',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
  });

  /**
   * POST /scenarios
   * Create a new scenario
   */
  fastify.post<{
    Body: unknown;
  }>('/scenarios', async (request, reply) => {
    try {
      const params = CreateScenarioRequestSchema.parse(request.body);

      const scenarioId = uuidv4();
      const now = new Date().toISOString();

      // TODO: Get userId from auth context
      const userId = request.headers['x-user-id'] as string || uuidv4();

      const scenario: Scenario = {
        id: scenarioId,
        companyId: params.companyId,
        name: params.name,
        description: params.description,
        parameters: params.parameters,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        tags: params.tags || [],
        isArchived: false,
      };

      // Insert scenario
      await pool.query(
        `INSERT INTO scenarios (
          id, company_id, name, description, parameters, created_by,
          created_at, updated_at, tags, is_archived
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          scenario.id,
          scenario.companyId,
          scenario.name,
          scenario.description || null,
          JSON.stringify(scenario.parameters),
          scenario.createdBy,
          scenario.createdAt,
          scenario.updatedAt,
          scenario.tags,
          scenario.isArchived,
        ]
      );

      // Execute immediately if requested
      if (params.executeImmediately) {
        const period = {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          end: new Date(),
        };

        const baseline = await fetchBaselineData(pool, params.companyId, period);

        const result = await executeScenario(
          {
            companyId: params.companyId,
            period,
            baseline,
            parameters: params.parameters,
          },
          scenarioId
        );

        // Update scenario with result
        await pool.query(
          `UPDATE scenarios
           SET result = $1, last_executed_at = $2, updated_at = $3
           WHERE id = $4`,
          [JSON.stringify(result), result.executedAt, new Date().toISOString(), scenarioId]
        );

        scenario.result = result;
        scenario.lastExecutedAt = result.executedAt;
      }

      return reply.code(201).send(scenario);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error,
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to create scenario',
      });
    }
  });

  /**
   * GET /scenarios
   * List scenarios for a company
   */
  fastify.get<{
    Querystring: {
      companyId: string;
      includeArchived?: boolean;
      tags?: string[];
      limit?: number;
      offset?: number;
    };
  }>('/scenarios', async (request, reply) => {
    try {
      const {
        companyId,
        includeArchived = false,
        tags,
        limit = 20,
        offset = 0,
      } = request.query;

      let query = `
        SELECT * FROM scenarios
        WHERE company_id = $1
      `;
      const params: any[] = [companyId];
      let paramIndex = 2;

      if (!includeArchived) {
        query += ` AND is_archived = false`;
      }

      if (tags && tags.length > 0) {
        query += ` AND tags && $${paramIndex}`;
        params.push(tags);
        paramIndex++;
      }

      // Count total
      const countResult = await pool.query(
        query.replace('SELECT *', 'SELECT COUNT(*)'),
        params
      );
      const total = parseInt(countResult.rows[0].count);

      // Add pagination
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      const scenarios: Scenario[] = result.rows.map((row) => ({
        id: row.id,
        companyId: row.company_id,
        name: row.name,
        description: row.description,
        parameters: row.parameters,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastExecutedAt: row.last_executed_at,
        result: row.result,
        tags: row.tags || [],
        isArchived: row.is_archived,
      }));

      const response: ListScenariosResponse = {
        scenarios,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + scenarios.length < total,
        },
      };

      return reply.send(response);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to list scenarios',
      });
    }
  });

  /**
   * GET /scenarios/:scenarioId
   * Get scenario by ID
   */
  fastify.get<{
    Params: { scenarioId: string };
  }>('/scenarios/:scenarioId', async (request, reply) => {
    try {
      const { scenarioId } = request.params;

      const result = await pool.query(
        'SELECT * FROM scenarios WHERE id = $1',
        [scenarioId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Scenario not found',
        });
      }

      const row = result.rows[0];
      const scenario: Scenario = {
        id: row.id,
        companyId: row.company_id,
        name: row.name,
        description: row.description,
        parameters: row.parameters,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastExecutedAt: row.last_executed_at,
        result: row.result,
        tags: row.tags || [],
        isArchived: row.is_archived,
      };

      return reply.send(scenario);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get scenario',
      });
    }
  });

  /**
   * PATCH /scenarios/:scenarioId
   * Update scenario
   */
  fastify.patch<{
    Params: { scenarioId: string };
    Body: unknown;
  }>('/scenarios/:scenarioId', async (request, reply) => {
    try {
      const { scenarioId } = request.params;
      const updates = UpdateScenarioRequestSchema.parse(request.body);

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(updates.name);
      }

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(updates.description);
      }

      if (updates.parameters !== undefined) {
        updateFields.push(`parameters = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.parameters));
      }

      if (updates.tags !== undefined) {
        updateFields.push(`tags = $${paramIndex++}`);
        updateValues.push(updates.tags);
      }

      if (updates.isArchived !== undefined) {
        updateFields.push(`is_archived = $${paramIndex++}`);
        updateValues.push(updates.isArchived);
      }

      updateFields.push(`updated_at = $${paramIndex++}`);
      updateValues.push(new Date().toISOString());

      updateValues.push(scenarioId);

      const query = `
        UPDATE scenarios
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, updateValues);

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Scenario not found',
        });
      }

      const row = result.rows[0];
      const scenario: Scenario = {
        id: row.id,
        companyId: row.company_id,
        name: row.name,
        description: row.description,
        parameters: row.parameters,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastExecutedAt: row.last_executed_at,
        result: row.result,
        tags: row.tags || [],
        isArchived: row.is_archived,
      };

      return reply.send(scenario);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error,
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update scenario',
      });
    }
  });

  /**
   * DELETE /scenarios/:scenarioId
   * Delete scenario
   */
  fastify.delete<{
    Params: { scenarioId: string };
  }>('/scenarios/:scenarioId', async (request, reply) => {
    try {
      const { scenarioId } = request.params;

      const result = await pool.query(
        'DELETE FROM scenarios WHERE id = $1 RETURNING id',
        [scenarioId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Scenario not found',
        });
      }

      return reply.code(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete scenario',
      });
    }
  });

  /**
   * POST /scenarios/:scenarioId/run
   * Execute scenario and compute metric deltas
   */
  fastify.post<{
    Params: { scenarioId: string };
    Body: unknown;
  }>('/scenarios/:scenarioId/run', async (request, reply) => {
    const startTime = Date.now();

    try {
      const { scenarioId } = request.params;
      const params = ExecuteScenarioRequestSchema.parse(request.body);

      // Fetch scenario
      const scenarioResult = await pool.query(
        'SELECT * FROM scenarios WHERE id = $1',
        [scenarioId]
      );

      if (scenarioResult.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Scenario not found',
        });
      }

      const scenarioRow = scenarioResult.rows[0];

      // Determine period
      const period = params.period
        ? {
            start: new Date(params.period.start),
            end: new Date(params.period.end),
          }
        : {
            start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
            end: new Date(),
          };

      // Fetch baseline data
      const baseline = await fetchBaselineData(pool, params.companyId, period);

      // Execute scenario
      const result = await executeScenario(
        {
          companyId: params.companyId,
          period,
          baseline,
          parameters: scenarioRow.parameters,
        },
        scenarioId
      );

      // Update scenario with result
      await pool.query(
        `UPDATE scenarios
         SET result = $1, last_executed_at = $2, updated_at = $3
         WHERE id = $4`,
        [JSON.stringify(result), result.executedAt, new Date().toISOString(), scenarioId]
      );

      const duration = Date.now() - startTime;
      fastify.log.info(
        { scenarioId, duration },
        'Scenario executed successfully'
      );

      const response: ExecuteScenarioResponse = {
        scenarioId,
        result,
      };

      return reply.send(response);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error,
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to execute scenario',
      });
    }
  });

  /**
   * GET /scenarios/:scenarioId/results
   * Get cached scenario execution results
   */
  fastify.get<{
    Params: { scenarioId: string };
  }>('/scenarios/:scenarioId/results', async (request, reply) => {
    try {
      const { scenarioId } = request.params;

      const result = await pool.query(
        'SELECT result FROM scenarios WHERE id = $1',
        [scenarioId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Scenario not found',
        });
      }

      const scenarioResult: ScenarioResult | null = result.rows[0].result;

      if (!scenarioResult) {
        return reply.code(404).send({
          success: false,
          error: 'Scenario has not been executed yet',
        });
      }

      return reply.send(scenarioResult);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get scenario results',
      });
    }
  });

  /**
   * POST /scenarios/:scenarioId/export/deck
   * Export scenario to deck payload (JSON/PPTX)
   */
  fastify.post<{
    Params: { scenarioId: string };
    Querystring: { format?: 'json' | 'pptx' | 'pdf' };
  }>('/scenarios/:scenarioId/export/deck', async (request, reply) => {
    try {
      const { scenarioId } = request.params;
      const { format = 'json' } = request.query;

      // Fetch scenario with results
      const result = await pool.query(
        `SELECT s.*, c.name as company_name
         FROM scenarios s
         JOIN companies c ON s.company_id = c.id
         WHERE s.id = $1`,
        [scenarioId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Scenario not found',
        });
      }

      const row = result.rows[0];

      if (!row.result) {
        return reply.code(400).send({
          success: false,
          error: 'Scenario must be executed before export',
        });
      }

      const scenarioResult: ScenarioResult = row.result;

      // TODO: Get userId from auth context
      const userId = request.headers['x-user-id'] as string || uuidv4();

      // Build deck export payload
      const deckPayload: DeckExportPayload = {
        scenarioId: row.id,
        scenarioName: row.name,
        companyId: row.company_id,
        companyName: row.company_name,
        executedAt: scenarioResult.executedAt,
        slides: [
          {
            type: 'summary',
            title: 'Scenario Summary',
            data: {
              name: row.name,
              description: row.description,
              executedAt: scenarioResult.executedAt,
            },
          },
          {
            type: 'metrics',
            title: 'Metric Impacts',
            data: scenarioResult.metrics,
          },
          {
            type: 'parameters',
            title: 'Scenario Parameters',
            data: row.parameters,
          },
        ],
        charts: [
          {
            type: 'waterfall',
            title: 'VIS Delta Breakdown',
            series: [
              {
                name: 'Baseline',
                data: [scenarioResult.metrics.vis?.baseline || 0],
              },
              {
                name: 'Delta',
                data: [scenarioResult.metrics.vis?.delta || 0],
              },
              {
                name: 'Scenario',
                data: [scenarioResult.metrics.vis?.scenario || 0],
              },
            ],
            categories: ['VIS Score'],
          },
          {
            type: 'waterfall',
            title: 'SROI Delta Breakdown',
            series: [
              {
                name: 'Baseline',
                data: [scenarioResult.metrics.sroi?.baseline || 0],
              },
              {
                name: 'Delta',
                data: [scenarioResult.metrics.sroi?.delta || 0],
              },
              {
                name: 'Scenario',
                data: [scenarioResult.metrics.sroi?.scenario || 0],
              },
            ],
            categories: ['SROI Ratio'],
          },
        ],
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: userId,
          format,
        },
      };

      // Add SDG slide if available
      if (scenarioResult.sdgCoverage) {
        deckPayload.slides.push({
          type: 'sdg',
          title: 'SDG Coverage Impact',
          data: scenarioResult.sdgCoverage,
        });
      }

      if (format === 'json') {
        return reply.send(deckPayload);
      }

      // TODO: Implement PPTX/PDF generation
      return reply.code(501).send({
        success: false,
        error: 'PPTX/PDF export not yet implemented',
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to export scenario',
      });
    }
  });
};
