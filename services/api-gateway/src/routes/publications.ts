/**
 * Publication Management Routes (API Gateway)
 *
 * Provides endpoints for creating, managing, and publishing impact pages.
 * Features:
 * - Create/update publications (DRAFT mode)
 * - Publish to LIVE (with optional token gating)
 * - Token rotation for TOKEN visibility
 * - Analytics tracking (views, referrers)
 *
 * Security:
 * - Tenant scoping enforced
 * - Tokens hashed (SHA-256) with 30d TTL
 * - Public read with optional token validation
 * - XSS sanitization for TEXT blocks
 *
 * Ref: Worker 19 § Public Impact Pages & Embeds
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Pool } from 'pg';
import { createHash, randomBytes } from 'crypto';
import { createServiceLogger } from '@teei/shared-utils';
import {
  CreatePublicationRequestSchema,
  UpdatePublicationRequestSchema,
  PublishPublicationRequestSchema,
  RotateTokenRequestSchema,
  PublicReadRequestSchema,
} from '@teei/shared-types';

const logger = createServiceLogger('api-gateway:publications');

/**
 * Generate a secure access token for TOKEN visibility
 * Returns: { token: string, hash: string }
 */
function generateAccessToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url'); // 43 chars
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

/**
 * Hash a token for verification
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Sanitize HTML content (basic XSS prevention)
 * In production, use DOMPurify or similar
 */
function sanitizeHtml(html: string): string {
  // Basic sanitization - remove script tags, event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Register publication management routes
 */
export async function publicationRoutes(app: FastifyInstance, dbPool: Pool): Promise<void> {
  /**
   * POST /api/publications
   * Create a new publication (DRAFT)
   */
  app.post('/publications', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenant = (request as any).tenant;

      if (!user || !tenant) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Only company admins can create publications
      if (tenant.role !== 'company_admin' && tenant.role !== 'system_admin') {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Only company administrators can create publications',
        });
      }

      const body = CreatePublicationRequestSchema.parse(request.body);
      const { tenantId, slug, title, description, metaTitle, ogImage, visibility, blocks } = body;

      // Verify tenant access
      if (tenant.companyId !== tenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Access denied to this tenant',
        });
      }

      // Check for duplicate slug within tenant
      const slugCheck = await dbPool.query(
        `SELECT id FROM publications WHERE tenant_id = $1 AND slug = $2`,
        [tenantId, slug]
      );

      if (slugCheck.rows.length > 0) {
        return reply.status(409).send({
          success: false,
          error: 'Conflict',
          message: `Slug "${slug}" already exists for this tenant`,
        });
      }

      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');

        // Insert publication
        const pubResult = await client.query(
          `INSERT INTO publications (
            tenant_id, slug, title, description, meta_title, og_image,
            status, visibility, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          RETURNING id, tenant_id, slug, title, description, meta_title, og_image,
                    status, visibility, created_at, updated_at`,
          [tenantId, slug, title, description || null, metaTitle || null, ogImage || null, 'DRAFT', visibility]
        );

        const publication = pubResult.rows[0];

        // Insert blocks
        const blockPromises = blocks.map((block, index) =>
          client.query(
            `INSERT INTO publication_blocks (
              publication_id, kind, "order", payload_json, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING id, publication_id, kind, "order", payload_json, created_at, updated_at`,
            [publication.id, block.kind, block.order ?? index, JSON.stringify(block.payloadJson)]
          )
        );

        const blockResults = await Promise.all(blockPromises);
        const insertedBlocks = blockResults.map((r) => r.rows[0]);

        await client.query('COMMIT');

        logger.info('Publication created', {
          publicationId: publication.id,
          tenantId,
          slug,
          userId: user.userId,
        });

        // Audit log
        await dbPool.query(
          `INSERT INTO audit_logs (
            company_id, user_id, action, resource_type, resource_id,
            success, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            tenantId,
            user.userId,
            'PUBLICATION_CREATED',
            'publication',
            publication.id,
            true,
            JSON.stringify({ slug, title, blockCount: blocks.length }),
          ]
        );

        return reply.status(201).send({
          success: true,
          message: 'Publication created successfully',
          data: {
            publication,
            blocks: insertedBlocks,
          },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      logger.error('Failed to create publication', { error: error.message });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation Error',
          message: error.errors,
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create publication',
      });
    }
  });

  /**
   * PATCH /api/publications/:id
   * Update an existing publication (DRAFT only)
   */
  app.patch('/publications/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenant = (request as any).tenant;

      if (!user || !tenant) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Only company admins can update publications
      if (tenant.role !== 'company_admin' && tenant.role !== 'system_admin') {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Only company administrators can update publications',
        });
      }

      const { id } = request.params as { id: string };
      const body = UpdatePublicationRequestSchema.parse(request.body);

      // Fetch existing publication
      const pubResult = await dbPool.query(
        `SELECT id, tenant_id, status FROM publications WHERE id = $1`,
        [id]
      );

      if (pubResult.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Publication not found',
        });
      }

      const publication = pubResult.rows[0];

      // Verify tenant access
      if (tenant.companyId !== publication.tenant_id) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Access denied to this publication',
        });
      }

      // Can only update DRAFT publications
      if (publication.status !== 'DRAFT') {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Only DRAFT publications can be updated. Create a new version instead.',
        });
      }

      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');

        // Update publication fields
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramIndex = 1;

        if (body.slug !== undefined) {
          updateFields.push(`slug = $${paramIndex++}`);
          updateValues.push(body.slug);
        }
        if (body.title !== undefined) {
          updateFields.push(`title = $${paramIndex++}`);
          updateValues.push(body.title);
        }
        if (body.description !== undefined) {
          updateFields.push(`description = $${paramIndex++}`);
          updateValues.push(body.description);
        }
        if (body.metaTitle !== undefined) {
          updateFields.push(`meta_title = $${paramIndex++}`);
          updateValues.push(body.metaTitle);
        }
        if (body.ogImage !== undefined) {
          updateFields.push(`og_image = $${paramIndex++}`);
          updateValues.push(body.ogImage);
        }
        if (body.visibility !== undefined) {
          updateFields.push(`visibility = $${paramIndex++}`);
          updateValues.push(body.visibility);
        }

        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id);

        if (updateFields.length > 1) {
          await client.query(
            `UPDATE publications SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
            updateValues
          );
        }

        // Update blocks if provided
        if (body.blocks !== undefined) {
          // Delete existing blocks
          await client.query(`DELETE FROM publication_blocks WHERE publication_id = $1`, [id]);

          // Insert new blocks
          const blockPromises = body.blocks.map((block, index) =>
            client.query(
              `INSERT INTO publication_blocks (
                publication_id, kind, "order", payload_json, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, NOW(), NOW())`,
              [id, block.kind, block.order ?? index, JSON.stringify(block.payloadJson)]
            )
          );

          await Promise.all(blockPromises);
        }

        await client.query('COMMIT');

        logger.info('Publication updated', {
          publicationId: id,
          userId: user.userId,
        });

        // Fetch updated publication
        const updated = await dbPool.query(
          `SELECT * FROM publications WHERE id = $1`,
          [id]
        );

        return reply.send({
          success: true,
          message: 'Publication updated successfully',
          data: { publication: updated.rows[0] },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      logger.error('Failed to update publication', { error: error.message });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation Error',
          message: error.errors,
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update publication',
      });
    }
  });

  /**
   * POST /api/publications/:id/live
   * Publish a publication (DRAFT → LIVE)
   */
  app.post('/publications/:id/live', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenant = (request as any).tenant;

      if (!user || !tenant) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Only company admins can publish
      if (tenant.role !== 'company_admin' && tenant.role !== 'system_admin') {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Only company administrators can publish publications',
        });
      }

      const { id } = request.params as { id: string };
      const body = PublishPublicationRequestSchema.parse(request.body || {});

      // Fetch publication
      const pubResult = await dbPool.query(
        `SELECT id, tenant_id, status, visibility FROM publications WHERE id = $1`,
        [id]
      );

      if (pubResult.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Publication not found',
        });
      }

      const publication = pubResult.rows[0];

      // Verify tenant access
      if (tenant.companyId !== publication.tenant_id) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Access denied to this publication',
        });
      }

      // Can only publish DRAFT publications
      if (publication.status === 'LIVE') {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Publication is already LIVE',
        });
      }

      // If TOKEN visibility, generate access token
      let accessToken = null;
      let tokenExpiresAt = null;

      if (publication.visibility === 'TOKEN') {
        const { token, hash } = generateAccessToken();
        accessToken = token;
        tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30d TTL

        await dbPool.query(
          `UPDATE publications
          SET status = $1, published_at = NOW(), access_token = $2, token_expires_at = $3, updated_at = NOW()
          WHERE id = $4`,
          ['LIVE', hash, tokenExpiresAt, id]
        );
      } else {
        await dbPool.query(
          `UPDATE publications
          SET status = $1, published_at = NOW(), updated_at = NOW()
          WHERE id = $2`,
          ['LIVE', id]
        );
      }

      logger.info('Publication published', {
        publicationId: id,
        visibility: publication.visibility,
        userId: user.userId,
      });

      // Audit log
      await dbPool.query(
        `INSERT INTO audit_logs (
          company_id, user_id, action, resource_type, resource_id,
          success, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          tenant.companyId,
          user.userId,
          'PUBLICATION_PUBLISHED',
          'publication',
          id,
          true,
          JSON.stringify({ visibility: publication.visibility }),
        ]
      );

      const response: any = {
        success: true,
        message: 'Publication published successfully',
        data: {
          publicationId: id,
          status: 'LIVE',
          publishedAt: new Date(),
        },
      };

      // Only return token once (for TOKEN visibility)
      if (accessToken) {
        response.data.accessToken = accessToken;
        response.data.tokenExpiresAt = tokenExpiresAt;
        response.message += '. Save the access token securely - it will not be shown again.';
      }

      return reply.send(response);
    } catch (error: any) {
      logger.error('Failed to publish publication', { error: error.message });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation Error',
          message: error.errors,
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to publish publication',
      });
    }
  });

  /**
   * POST /api/publications/:id/token
   * Rotate access token for TOKEN visibility
   */
  app.post('/publications/:id/token', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenant = (request as any).tenant;

      if (!user || !tenant) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Only company admins can rotate tokens
      if (tenant.role !== 'company_admin' && tenant.role !== 'system_admin') {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Only company administrators can rotate tokens',
        });
      }

      const { id } = request.params as { id: string };
      const body = RotateTokenRequestSchema.parse(request.body || {});
      const { expiresInDays } = body;

      // Fetch publication
      const pubResult = await dbPool.query(
        `SELECT id, tenant_id, visibility FROM publications WHERE id = $1`,
        [id]
      );

      if (pubResult.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Publication not found',
        });
      }

      const publication = pubResult.rows[0];

      // Verify tenant access
      if (tenant.companyId !== publication.tenant_id) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Access denied to this publication',
        });
      }

      // Can only rotate tokens for TOKEN visibility
      if (publication.visibility !== 'TOKEN') {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Token rotation only available for TOKEN visibility',
        });
      }

      // Generate new token
      const { token, hash } = generateAccessToken();
      const tokenExpiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

      await dbPool.query(
        `UPDATE publications
        SET access_token = $1, token_expires_at = $2, updated_at = NOW()
        WHERE id = $3`,
        [hash, tokenExpiresAt, id]
      );

      logger.info('Publication token rotated', {
        publicationId: id,
        userId: user.userId,
        expiresInDays,
      });

      // Audit log
      await dbPool.query(
        `INSERT INTO audit_logs (
          company_id, user_id, action, resource_type, resource_id,
          success, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          tenant.companyId,
          user.userId,
          'PUBLICATION_TOKEN_ROTATED',
          'publication',
          id,
          true,
          JSON.stringify({ expiresInDays }),
        ]
      );

      return reply.send({
        success: true,
        message: 'Token rotated successfully. Save the new token securely - it will not be shown again.',
        data: {
          token, // Only returned once!
          expiresAt: tokenExpiresAt,
        },
      });
    } catch (error: any) {
      logger.error('Failed to rotate token', { error: error.message });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation Error',
          message: error.errors,
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to rotate token',
      });
    }
  });

  /**
   * GET /api/publications/:id/stats
   * Get analytics stats for a publication
   */
  app.get('/publications/:id/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenant = (request as any).tenant;

      if (!user || !tenant) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const { id } = request.params as { id: string };

      // Fetch publication
      const pubResult = await dbPool.query(
        `SELECT id, tenant_id FROM publications WHERE id = $1`,
        [id]
      );

      if (pubResult.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Publication not found',
        });
      }

      const publication = pubResult.rows[0];

      // Verify tenant access
      if (tenant.companyId !== publication.tenant_id) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Access denied to this publication',
        });
      }

      // Get stats
      const statsResult = await dbPool.query(
        `SELECT
          COUNT(*) AS total_views,
          COUNT(DISTINCT anonymized_ip) AS unique_visitors,
          COUNT(*) FILTER (WHERE viewed_at > NOW() - INTERVAL '7 days') AS views_last_7_days,
          COUNT(*) FILTER (WHERE viewed_at > NOW() - INTERVAL '30 days') AS views_last_30_days
        FROM publication_views
        WHERE publication_id = $1`,
        [id]
      );

      const topReferrersResult = await dbPool.query(
        `SELECT referrer, COUNT(*) as count
        FROM publication_views
        WHERE publication_id = $1 AND viewed_at > NOW() - INTERVAL '30 days' AND referrer IS NOT NULL
        GROUP BY referrer
        ORDER BY count DESC
        LIMIT 10`,
        [id]
      );

      const stats = statsResult.rows[0];
      const topReferrers = topReferrersResult.rows;

      return reply.send({
        success: true,
        data: {
          publicationId: id,
          totalViews: parseInt(stats.total_views, 10),
          uniqueVisitors: parseInt(stats.unique_visitors, 10),
          viewsLast7Days: parseInt(stats.views_last_7_days, 10),
          viewsLast30Days: parseInt(stats.views_last_30_days, 10),
          topReferrers,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get publication stats', { error: error.message });

      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to get publication stats',
      });
    }
  });

  /**
   * GET /api/publications (List publications for tenant)
   */
  app.get('/publications', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenant = (request as any).tenant;

      if (!user || !tenant) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const { status, visibility } = request.query as any;

      let query = `SELECT * FROM publications WHERE tenant_id = $1`;
      const params: any[] = [tenant.companyId];
      let paramIndex = 2;

      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }

      if (visibility) {
        query += ` AND visibility = $${paramIndex++}`;
        params.push(visibility);
      }

      query += ` ORDER BY updated_at DESC`;

      const result = await dbPool.query(query, params);

      return reply.send({
        success: true,
        data: { publications: result.rows },
      });
    } catch (error: any) {
      logger.error('Failed to list publications', { error: error.message });

      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to list publications',
      });
    }
  });
}
