/**
 * Saved Views Routes
 *
 * Endpoints for managing saved dashboard filter configurations
 *
 * Endpoints:
 * - POST /companies/:companyId/views - Create new saved view
 * - GET /companies/:companyId/views - List all views for user/company
 * - GET /companies/:companyId/views/:viewId - Get specific view
 * - PUT /companies/:companyId/views/:viewId - Update view
 * - DELETE /companies/:companyId/views/:viewId - Delete view
 *
 * @module routes/savedViews
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { SavedViewRequest, SavedViewResponse } from '../db/types.js';
import { pool } from '../db/connection.js';

interface CompanyParams {
  companyId: string;
}

interface ViewParams extends CompanyParams {
  viewId: string;
}

export async function savedViewsRoutes(fastify: FastifyInstance) {
  /**
   * Create new saved view
   */
  fastify.post<{
    Params: CompanyParams;
    Body: SavedViewRequest;
  }>('/companies/:companyId/views', {
    schema: {
      description: 'Create a new saved dashboard view',
      tags: ['Saved Views'],
      params: {
        type: 'object',
        required: ['companyId'],
        properties: {
          companyId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['view_name', 'filter_config'],
        properties: {
          view_name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          filter_config: { type: 'object' },
          is_default: { type: 'boolean', default: false },
          is_shared: { type: 'boolean', default: false },
        },
      },
      response: {
        201: {
          description: 'Saved view created',
          type: 'object',
          properties: {
            id: { type: 'string' },
            view_name: { type: 'string' },
            description: { type: ['string', 'null'] },
            filter_config: { type: 'object' },
            is_default: { type: 'boolean' },
            is_shared: { type: 'boolean' },
            view_count: { type: 'number' },
            created_at: { type: 'string' },
            updated_at: { type: 'string' },
          },
        },
        400: {
          description: 'Bad request (max 10 views per user)',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    async handler(request: FastifyRequest<{ Params: CompanyParams; Body: SavedViewRequest }>, reply: FastifyReply) {
      const { companyId } = request.params;
      const { view_name, description, filter_config, is_default, is_shared } = request.body;

      // Get user ID from auth context (assuming middleware sets this)
      const userId = (request as any).user?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // Check view count limit (max 10 per user)
      const countResult = await pool.query(
        'SELECT COUNT(*) as count FROM saved_views WHERE user_id = $1',
        [userId]
      );

      if (parseInt(countResult.rows[0].count) >= 10) {
        return reply.code(400).send({
          error: 'Maximum of 10 saved views per user. Please delete an existing view first.',
        });
      }

      // If setting as default, unset other defaults for this user
      if (is_default) {
        await pool.query('UPDATE saved_views SET is_default = false WHERE user_id = $1', [userId]);
      }

      // Insert new view
      const result = await pool.query(
        `INSERT INTO saved_views
         (company_id, user_id, view_name, description, filter_config, is_default, is_shared)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, view_name, description, filter_config, is_default, is_shared, view_count, created_at, updated_at`,
        [companyId, userId, view_name, description || null, JSON.stringify(filter_config), is_default || false, is_shared || false]
      );

      const view = result.rows[0];

      return reply.code(201).send({
        id: view.id,
        view_name: view.view_name,
        description: view.description,
        filter_config: view.filter_config,
        is_default: view.is_default,
        is_shared: view.is_shared,
        view_count: view.view_count,
        created_at: view.created_at.toISOString(),
        updated_at: view.updated_at.toISOString(),
      });
    },
  });

  /**
   * List all saved views for user/company
   */
  fastify.get<{
    Params: CompanyParams;
    Querystring: { include_shared?: string };
  }>('/companies/:companyId/views', {
    schema: {
      description: 'List all saved views for current user',
      tags: ['Saved Views'],
      params: {
        type: 'object',
        required: ['companyId'],
        properties: {
          companyId: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          include_shared: { type: 'string', enum: ['true', 'false'], default: 'true' },
        },
      },
      response: {
        200: {
          description: 'List of saved views',
          type: 'object',
          properties: {
            views: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  view_name: { type: 'string' },
                  description: { type: ['string', 'null'] },
                  filter_config: { type: 'object' },
                  is_default: { type: 'boolean' },
                  is_shared: { type: 'boolean' },
                  is_owner: { type: 'boolean' },
                  view_count: { type: 'number' },
                  created_at: { type: 'string' },
                  updated_at: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async handler(request, reply) {
      const { companyId } = request.params;
      const includeShared = request.query.include_shared !== 'false';

      const userId = (request as any).user?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // Get user's own views + shared views from company
      let query = `
        SELECT id, view_name, description, filter_config, is_default, is_shared,
               view_count, created_at, updated_at, user_id
        FROM saved_views
        WHERE company_id = $1 AND (user_id = $2
      `;

      if (includeShared) {
        query += ' OR is_shared = true';
      }

      query += ') ORDER BY is_default DESC, created_at DESC';

      const result = await pool.query(query, [companyId, userId]);

      const views = result.rows.map((row) => ({
        id: row.id,
        view_name: row.view_name,
        description: row.description,
        filter_config: row.filter_config,
        is_default: row.is_default,
        is_shared: row.is_shared,
        is_owner: row.user_id === userId,
        view_count: row.view_count,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
      }));

      return reply.send({ views });
    },
  });

  /**
   * Get specific saved view
   */
  fastify.get<{
    Params: ViewParams;
  }>('/companies/:companyId/views/:viewId', {
    schema: {
      description: 'Get a specific saved view',
      tags: ['Saved Views'],
      params: {
        type: 'object',
        required: ['companyId', 'viewId'],
        properties: {
          companyId: { type: 'string', format: 'uuid' },
          viewId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Saved view details',
          type: 'object',
          properties: {
            id: { type: 'string' },
            view_name: { type: 'string' },
            description: { type: ['string', 'null'] },
            filter_config: { type: 'object' },
            is_default: { type: 'boolean' },
            is_shared: { type: 'boolean' },
            is_owner: { type: 'boolean' },
            view_count: { type: 'number' },
            created_at: { type: 'string' },
            updated_at: { type: 'string' },
          },
        },
        404: {
          description: 'View not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    async handler(request, reply) {
      const { companyId, viewId } = request.params;
      const userId = (request as any).user?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const result = await pool.query(
        `SELECT id, view_name, description, filter_config, is_default, is_shared,
                view_count, created_at, updated_at, user_id
         FROM saved_views
         WHERE id = $1 AND company_id = $2 AND (user_id = $3 OR is_shared = true)`,
        [viewId, companyId, userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'View not found' });
      }

      const view = result.rows[0];

      // Increment view count
      await pool.query('UPDATE saved_views SET view_count = view_count + 1 WHERE id = $1', [viewId]);

      return reply.send({
        id: view.id,
        view_name: view.view_name,
        description: view.description,
        filter_config: view.filter_config,
        is_default: view.is_default,
        is_shared: view.is_shared,
        is_owner: view.user_id === userId,
        view_count: view.view_count + 1,
        created_at: view.created_at.toISOString(),
        updated_at: view.updated_at.toISOString(),
      });
    },
  });

  /**
   * Update saved view
   */
  fastify.put<{
    Params: ViewParams;
    Body: Partial<SavedViewRequest>;
  }>('/companies/:companyId/views/:viewId', {
    schema: {
      description: 'Update a saved view (owner only)',
      tags: ['Saved Views'],
      params: {
        type: 'object',
        required: ['companyId', 'viewId'],
        properties: {
          companyId: { type: 'string', format: 'uuid' },
          viewId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          view_name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          filter_config: { type: 'object' },
          is_default: { type: 'boolean' },
          is_shared: { type: 'boolean' },
        },
      },
      response: {
        200: {
          description: 'View updated',
          type: 'object',
          properties: {
            id: { type: 'string' },
            view_name: { type: 'string' },
            description: { type: ['string', 'null'] },
            filter_config: { type: 'object' },
            is_default: { type: 'boolean' },
            is_shared: { type: 'boolean' },
            view_count: { type: 'number' },
            created_at: { type: 'string' },
            updated_at: { type: 'string' },
          },
        },
        403: {
          description: 'Forbidden (not owner)',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    async handler(request, reply) {
      const { companyId, viewId } = request.params;
      const userId = (request as any).user?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // Check ownership
      const checkResult = await pool.query(
        'SELECT user_id FROM saved_views WHERE id = $1 AND company_id = $2',
        [viewId, companyId]
      );

      if (checkResult.rows.length === 0) {
        return reply.code(404).send({ error: 'View not found' });
      }

      if (checkResult.rows[0].user_id !== userId) {
        return reply.code(403).send({ error: 'Only the owner can update this view' });
      }

      // If setting as default, unset other defaults
      if (request.body.is_default) {
        await pool.query('UPDATE saved_views SET is_default = false WHERE user_id = $1', [userId]);
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (request.body.view_name !== undefined) {
        updates.push(`view_name = $${paramCount++}`);
        values.push(request.body.view_name);
      }

      if (request.body.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(request.body.description);
      }

      if (request.body.filter_config !== undefined) {
        updates.push(`filter_config = $${paramCount++}`);
        values.push(JSON.stringify(request.body.filter_config));
      }

      if (request.body.is_default !== undefined) {
        updates.push(`is_default = $${paramCount++}`);
        values.push(request.body.is_default);
      }

      if (request.body.is_shared !== undefined) {
        updates.push(`is_shared = $${paramCount++}`);
        values.push(request.body.is_shared);
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No updates provided' });
      }

      values.push(viewId);
      const result = await pool.query(
        `UPDATE saved_views SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING id, view_name, description, filter_config, is_default, is_shared, view_count, created_at, updated_at`,
        values
      );

      const view = result.rows[0];

      return reply.send({
        id: view.id,
        view_name: view.view_name,
        description: view.description,
        filter_config: view.filter_config,
        is_default: view.is_default,
        is_shared: view.is_shared,
        view_count: view.view_count,
        created_at: view.created_at.toISOString(),
        updated_at: view.updated_at.toISOString(),
      });
    },
  });

  /**
   * Delete saved view
   */
  fastify.delete<{
    Params: ViewParams;
  }>('/companies/:companyId/views/:viewId', {
    schema: {
      description: 'Delete a saved view (owner only)',
      tags: ['Saved Views'],
      params: {
        type: 'object',
        required: ['companyId', 'viewId'],
        properties: {
          companyId: { type: 'string', format: 'uuid' },
          viewId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        204: {
          description: 'View deleted',
          type: 'null',
        },
        403: {
          description: 'Forbidden (not owner)',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    async handler(request, reply) {
      const { companyId, viewId } = request.params;
      const userId = (request as any).user?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // Check ownership and delete
      const result = await pool.query(
        'DELETE FROM saved_views WHERE id = $1 AND company_id = $2 AND user_id = $3 RETURNING id',
        [viewId, companyId, userId]
      );

      if (result.rows.length === 0) {
        return reply.code(403).send({ error: 'View not found or you are not the owner' });
      }

      return reply.code(204).send();
    },
  });
}
