/**
 * Publications API Routes - Worker 19
 *
 * Public and authenticated endpoints for publication management.
 * Handles CRUD operations, publishing, token generation, and public access.
 *
 * Endpoints:
 * - POST   /publications                    - Create publication (auth)
 * - GET    /publications                    - List publications (auth)
 * - GET    /publications/:id                - Get publication (auth)
 * - PATCH  /publications/:id                - Update publication (auth)
 * - DELETE /publications/:id                - Delete publication (auth)
 * - POST   /publications/:id/publish        - Publish publication (auth)
 * - POST   /publications/:id/blocks         - Add block (auth)
 * - PATCH  /publications/:id/blocks/:blockId - Update block (auth)
 * - DELETE /publications/:id/blocks/:blockId - Delete block (auth)
 * - POST   /publications/:id/tokens         - Generate token (auth)
 * - GET    /publications/:id/tokens         - List tokens (auth)
 * - DELETE /publications/:id/tokens/:tokenId - Revoke token (auth)
 * - GET    /publications/:id/stats          - Get stats (auth)
 * - GET    /public/publications/:slug       - Get public publication (no auth, optional token)
 * - POST   /public/publications/:slug/view  - Track view (no auth)
 *
 * @module publications
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '@teei/shared-schema';
import {
  publications,
  publicationBlocks,
  publicationTokens,
  publicationViews,
  Publication,
  PublicationBlock
} from '@teei/shared-schema';
import {
  CreatePublicationRequest,
  UpdatePublicationRequest,
  AddBlockRequest,
  UpdateBlockRequest,
  GenerateTokenRequest,
  PublicationStatsResponse,
  PublicationListResponse,
  PublicPublicationResponse,
  TokenResponse
} from '@teei/shared-types';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { auth } from '../middleware/auth.js';
import { tenantScope } from '../middleware/tenantScope.js';

const router = Router();

// Validation schemas
const createPublicationSchema = z.object({
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'TOKEN']).optional(),
  meta_title: z.string().max(500).optional(),
  meta_description: z.string().max(1000).optional(),
  og_image_url: z.string().url().optional(),
  theme_config: z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    logoUrl: z.string().url().optional(),
    customCss: z.string().optional(),
  }).optional(),
});

const updatePublicationSchema = createPublicationSchema.partial();

const addBlockSchema = z.object({
  kind: z.enum(['TILE', 'TEXT', 'CHART', 'EVIDENCE', 'METRIC', 'HEADING']),
  order: z.number().int().min(0),
  payload_json: z.any(), // Validated based on kind
  width: z.enum(['full', 'half', 'third', 'quarter']).optional(),
  styling: z.object({
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
    borderColor: z.string().optional(),
    padding: z.string().optional(),
  }).optional(),
});

const updateBlockSchema = addBlockSchema.partial().omit({ kind: true });

const generateTokenSchema = z.object({
  label: z.string().max(255).optional(),
  expires_in_days: z.number().int().min(1).max(365).optional(),
});

/**
 * POST /publications
 * Create a new publication (DRAFT status)
 */
router.post('/publications', auth, tenantScope, async (req: Request, res: Response) => {
  try {
    const body = createPublicationSchema.parse(req.body);
    const tenantId = (req as any).tenantId;
    const userId = (req as any).user?.id || 'system';

    // Check for slug uniqueness within tenant
    const existing = await db
      .select()
      .from(publications)
      .where(and(
        eq(publications.tenant_id, tenantId),
        eq(publications.slug, body.slug)
      ))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'SLUG_EXISTS',
        message: `Publication with slug '${body.slug}' already exists`
      });
    }

    // Create publication
    const [publication] = await db
      .insert(publications)
      .values({
        tenant_id: tenantId,
        slug: body.slug,
        title: body.title,
        description: body.description || null,
        status: 'DRAFT',
        visibility: body.visibility || 'PUBLIC',
        created_by: userId,
        updated_by: userId,
        meta_title: body.meta_title || null,
        meta_description: body.meta_description || null,
        og_image_url: body.og_image_url || null,
        theme_config: body.theme_config || null,
      })
      .returning();

    res.status(201).json(publication);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
    }
    console.error('[Publications] Create failed:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * GET /publications
 * List publications for tenant with pagination
 */
router.get('/publications', auth, tenantScope, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.page_size as string) || 20, 100);
    const status = req.query.status as string | undefined;

    const offset = (page - 1) * pageSize;

    // Build query
    let query = db
      .select({
        publication: publications,
        block_count: sql<number>`count(${publicationBlocks.id})`,
      })
      .from(publications)
      .leftJoin(publicationBlocks, eq(publicationBlocks.publication_id, publications.id))
      .where(eq(publications.tenant_id, tenantId))
      .groupBy(publications.id)
      .orderBy(desc(publications.updated_at))
      .limit(pageSize)
      .offset(offset);

    // Filter by status if provided
    if (status && ['DRAFT', 'LIVE', 'ARCHIVED'].includes(status)) {
      query = query.where(eq(publications.status, status as any));
    }

    const results = await query;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(publications)
      .where(eq(publications.tenant_id, tenantId));

    const response: PublicationListResponse = {
      publications: results.map(r => ({ ...r.publication, block_count: r.block_count })),
      total: count,
      page,
      page_size: pageSize,
    };

    res.json(response);
  } catch (error: any) {
    console.error('[Publications] List failed:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * GET /publications/:id
 * Get publication with blocks
 */
router.get('/publications/:id', auth, tenantScope, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;

    const [publication] = await db
      .select()
      .from(publications)
      .where(and(
        eq(publications.id, id),
        eq(publications.tenant_id, tenantId)
      ))
      .limit(1);

    if (!publication) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }

    const blocks = await db
      .select()
      .from(publicationBlocks)
      .where(eq(publicationBlocks.publication_id, id))
      .orderBy(publicationBlocks.order);

    res.json({ ...publication, blocks });
  } catch (error: any) {
    console.error('[Publications] Get failed:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * PATCH /publications/:id
 * Update publication metadata
 */
router.patch('/publications/:id', auth, tenantScope, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).user?.id || 'system';
    const { id } = req.params;
    const body = updatePublicationSchema.parse(req.body);

    // Check slug uniqueness if changing slug
    if (body.slug) {
      const existing = await db
        .select()
        .from(publications)
        .where(and(
          eq(publications.tenant_id, tenantId),
          eq(publications.slug, body.slug),
          sql`${publications.id} != ${id}`
        ))
        .limit(1);

      if (existing.length > 0) {
        return res.status(409).json({
          error: 'SLUG_EXISTS',
          message: `Publication with slug '${body.slug}' already exists`
        });
      }
    }

    const [updated] = await db
      .update(publications)
      .set({
        ...body,
        updated_by: userId,
        updated_at: new Date(),
      })
      .where(and(
        eq(publications.id, id),
        eq(publications.tenant_id, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }

    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
    }
    console.error('[Publications] Update failed:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * DELETE /publications/:id
 * Delete publication (cascades to blocks, tokens, views)
 */
router.delete('/publications/:id', auth, tenantScope, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;

    const [deleted] = await db
      .delete(publications)
      .where(and(
        eq(publications.id, id),
        eq(publications.tenant_id, tenantId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('[Publications] Delete failed:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * POST /publications/:id/publish
 * Publish publication (DRAFT -> LIVE)
 */
router.post('/publications/:id/publish', auth, tenantScope, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;

    const [publication] = await db
      .select()
      .from(publications)
      .where(and(
        eq(publications.id, id),
        eq(publications.tenant_id, tenantId)
      ))
      .limit(1);

    if (!publication) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }

    if (publication.status === 'LIVE') {
      return res.status(400).json({ error: 'ALREADY_LIVE' });
    }

    const [updated] = await db
      .update(publications)
      .set({
        status: 'LIVE',
        published_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(publications.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error('[Publications] Publish failed:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * POST /publications/:id/blocks
 * Add a block to publication
 */
router.post('/publications/:id/blocks', auth, tenantScope, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const body = addBlockSchema.parse(req.body);

    // Verify publication exists and belongs to tenant
    const [publication] = await db
      .select()
      .from(publications)
      .where(and(
        eq(publications.id, id),
        eq(publications.tenant_id, tenantId)
      ))
      .limit(1);

    if (!publication) {
      return res.status(404).json({ error: 'PUBLICATION_NOT_FOUND' });
    }

    const [block] = await db
      .insert(publicationBlocks)
      .values({
        publication_id: id,
        kind: body.kind,
        order: body.order,
        payload_json: body.payload_json,
        width: body.width || 'full',
        styling: body.styling || null,
      })
      .returning();

    res.status(201).json(block);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
    }
    console.error('[Publications] Add block failed:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * PATCH /publications/:id/blocks/:blockId
 * Update block
 */
router.patch('/publications/:id/blocks/:blockId', auth, tenantScope, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id, blockId } = req.params;
    const body = updateBlockSchema.parse(req.body);

    // Verify publication belongs to tenant
    const [publication] = await db
      .select()
      .from(publications)
      .where(and(
        eq(publications.id, id),
        eq(publications.tenant_id, tenantId)
      ))
      .limit(1);

    if (!publication) {
      return res.status(404).json({ error: 'PUBLICATION_NOT_FOUND' });
    }

    const [updated] = await db
      .update(publicationBlocks)
      .set({
        ...body,
        updated_at: new Date(),
      })
      .where(and(
        eq(publicationBlocks.id, blockId),
        eq(publicationBlocks.publication_id, id)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'BLOCK_NOT_FOUND' });
    }

    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
    }
    console.error('[Publications] Update block failed:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * DELETE /publications/:id/blocks/:blockId
 * Delete block
 */
router.delete('/publications/:id/blocks/:blockId', auth, tenantScope, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id, blockId } = req.params;

    // Verify publication belongs to tenant
    const [publication] = await db
      .select()
      .from(publications)
      .where(and(
        eq(publications.id, id),
        eq(publications.tenant_id, tenantId)
      ))
      .limit(1);

    if (!publication) {
      return res.status(404).json({ error: 'PUBLICATION_NOT_FOUND' });
    }

    const [deleted] = await db
      .delete(publicationBlocks)
      .where(and(
        eq(publicationBlocks.id, blockId),
        eq(publicationBlocks.publication_id, id)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'BLOCK_NOT_FOUND' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('[Publications] Delete block failed:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * POST /publications/:id/tokens
 * Generate access token for TOKEN-visibility publication
 */
router.post('/publications/:id/tokens', auth, tenantScope, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).user?.id || 'system';
    const { id } = req.params;
    const body = generateTokenSchema.parse(req.body);

    // Verify publication belongs to tenant
    const [publication] = await db
      .select()
      .from(publications)
      .where(and(
        eq(publications.id, id),
        eq(publications.tenant_id, tenantId)
      ))
      .limit(1);

    if (!publication) {
      return res.status(404).json({ error: 'PUBLICATION_NOT_FOUND' });
    }

    // Generate token
    const token = `pub_${crypto.randomBytes(32).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const tokenPrefix = token.substring(0, 12);

    // Calculate expiration
    let expiresAt = null;
    if (body.expires_in_days) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + body.expires_in_days);
    }

    const [tokenRecord] = await db
      .insert(publicationTokens)
      .values({
        publication_id: id,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        label: body.label || null,
        created_by: userId,
        expires_at: expiresAt,
      })
      .returning();

    const response: TokenResponse = {
      id: tokenRecord.id,
      token, // Only returned once
      token_prefix: tokenRecord.token_prefix,
      label: tokenRecord.label,
      expires_at: tokenRecord.expires_at?.toISOString() || null,
      created_at: tokenRecord.created_at.toISOString(),
    };

    res.status(201).json(response);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
    }
    console.error('[Publications] Generate token failed:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * GET /publications/:id/tokens
 * List tokens for publication
 */
router.get('/publications/:id/tokens', auth, tenantScope, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;

    // Verify publication belongs to tenant
    const [publication] = await db
      .select()
      .from(publications)
      .where(and(
        eq(publications.id, id),
        eq(publications.tenant_id, tenantId)
      ))
      .limit(1);

    if (!publication) {
      return res.status(404).json({ error: 'PUBLICATION_NOT_FOUND' });
    }

    const tokens = await db
      .select()
      .from(publicationTokens)
      .where(eq(publicationTokens.publication_id, id))
      .orderBy(desc(publicationTokens.created_at));

    res.json(tokens);
  } catch (error: any) {
    console.error('[Publications] List tokens failed:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * DELETE /publications/:id/tokens/:tokenId
 * Revoke token
 */
router.delete('/publications/:id/tokens/:tokenId', auth, tenantScope, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id, tokenId } = req.params;

    // Verify publication belongs to tenant
    const [publication] = await db
      .select()
      .from(publications)
      .where(and(
        eq(publications.id, id),
        eq(publications.tenant_id, tenantId)
      ))
      .limit(1);

    if (!publication) {
      return res.status(404).json({ error: 'PUBLICATION_NOT_FOUND' });
    }

    const [revoked] = await db
      .update(publicationTokens)
      .set({ revoked_at: new Date() })
      .where(and(
        eq(publicationTokens.id, tokenId),
        eq(publicationTokens.publication_id, id)
      ))
      .returning();

    if (!revoked) {
      return res.status(404).json({ error: 'TOKEN_NOT_FOUND' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('[Publications] Revoke token failed:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * GET /publications/:id/stats
 * Get publication analytics
 */
router.get('/publications/:id/stats', auth, tenantScope, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;

    // Verify publication belongs to tenant
    const [publication] = await db
      .select()
      .from(publications)
      .where(and(
        eq(publications.id, id),
        eq(publications.tenant_id, tenantId)
      ))
      .limit(1);

    if (!publication) {
      return res.status(404).json({ error: 'PUBLICATION_NOT_FOUND' });
    }

    // Get views by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const viewsByDay = await db
      .select({
        date: sql<string>`DATE(${publicationViews.viewed_at})`,
        views: sql<number>`COUNT(*)`,
        unique: sql<number>`COUNT(DISTINCT ${publicationViews.visitor_hash})`,
      })
      .from(publicationViews)
      .where(and(
        eq(publicationViews.publication_id, id),
        gte(publicationViews.viewed_at, thirtyDaysAgo)
      ))
      .groupBy(sql`DATE(${publicationViews.viewed_at})`)
      .orderBy(sql`DATE(${publicationViews.viewed_at})`);

    // Get top referrers
    const topReferrers = await db
      .select({
        referer: publicationViews.referer,
        count: sql<number>`COUNT(*)`,
      })
      .from(publicationViews)
      .where(eq(publicationViews.publication_id, id))
      .groupBy(publicationViews.referer)
      .orderBy(desc(sql<number>`COUNT(*)`))
      .limit(10);

    // Get embed stats
    const [embedStats] = await db
      .select({
        total_embed_views: sql<number>`COUNT(CASE WHEN ${publicationViews.is_embed} THEN 1 END)`,
        unique_domains: sql<string[]>`ARRAY_AGG(DISTINCT ${publicationViews.embed_domain}) FILTER (WHERE ${publicationViews.embed_domain} IS NOT NULL)`,
      })
      .from(publicationViews)
      .where(eq(publicationViews.publication_id, id));

    const response: PublicationStatsResponse = {
      publication_id: publication.id,
      view_count: publication.view_count,
      unique_visitors: publication.unique_visitors,
      last_viewed_at: publication.last_viewed_at?.toISOString() || null,
      views_by_day: viewsByDay.map(v => ({
        date: v.date,
        views: v.views,
        unique: v.unique,
      })),
      top_referrers: topReferrers.map(r => ({
        referer: r.referer || 'Direct',
        count: r.count,
      })),
      embed_stats: {
        total_embed_views: embedStats?.total_embed_views || 0,
        unique_embed_domains: embedStats?.unique_domains || [],
      },
    };

    res.json(response);
  } catch (error: any) {
    console.error('[Publications] Get stats failed:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * GET /public/publications/:slug
 * Get public publication (no auth, optional token for TOKEN-visibility)
 */
router.get('/public/publications/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const token = req.query.token as string | undefined;

    // Find publication
    const [publication] = await db
      .select()
      .from(publications)
      .where(and(
        eq(publications.slug, slug),
        eq(publications.status, 'LIVE')
      ))
      .limit(1);

    if (!publication) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }

    // Check visibility
    if (publication.visibility === 'TOKEN') {
      if (!token) {
        return res.status(401).json({ error: 'TOKEN_REQUIRED' });
      }

      // Verify token
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const [tokenRecord] = await db
        .select()
        .from(publicationTokens)
        .where(and(
          eq(publicationTokens.publication_id, publication.id),
          eq(publicationTokens.token_hash, tokenHash),
          sql`${publicationTokens.revoked_at} IS NULL`
        ))
        .limit(1);

      if (!tokenRecord) {
        return res.status(401).json({ error: 'INVALID_TOKEN' });
      }

      // Check expiration
      if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
        return res.status(401).json({ error: 'TOKEN_EXPIRED' });
      }

      // Update token usage
      await db
        .update(publicationTokens)
        .set({
          last_used_at: new Date(),
          use_count: sql`${publicationTokens.use_count} + 1`,
        })
        .where(eq(publicationTokens.id, tokenRecord.id));
    }

    // Get blocks
    const blocks = await db
      .select()
      .from(publicationBlocks)
      .where(eq(publicationBlocks.publication_id, publication.id))
      .orderBy(publicationBlocks.order);

    const response: PublicPublicationResponse = {
      id: publication.id,
      slug: publication.slug,
      title: publication.title,
      description: publication.description,
      blocks,
      theme_config: publication.theme_config,
      published_at: publication.published_at?.toISOString() || new Date().toISOString(),
      meta_title: publication.meta_title,
      meta_description: publication.meta_description,
      og_image_url: publication.og_image_url,
      og_title: publication.og_title,
      og_description: publication.og_description,
    };

    // Set cache headers (5 minutes for public, 1 minute for token)
    const cacheMaxAge = publication.visibility === 'PUBLIC' ? 300 : 60;
    res.set('Cache-Control', `public, max-age=${cacheMaxAge}, stale-while-revalidate=600`);
    res.set('ETag', `"${publication.updated_at.getTime()}"`);

    res.json(response);
  } catch (error: any) {
    console.error('[Publications] Get public failed:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * POST /public/publications/:slug/view
 * Track view (analytics beacon)
 */
router.post('/public/publications/:slug/view', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { duration, is_embed, embed_domain } = req.body;

    // Find publication
    const [publication] = await db
      .select()
      .from(publications)
      .where(and(
        eq(publications.slug, slug),
        eq(publications.status, 'LIVE')
      ))
      .limit(1);

    if (!publication) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }

    // Generate visitor hash (anonymized)
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const visitorHash = crypto.createHash('sha256').update(`${ip}-${userAgent}`).digest('hex');

    // Track view
    await db.insert(publicationViews).values({
      publication_id: publication.id,
      visitor_hash: visitorHash,
      referer: req.headers.referer || null,
      user_agent: userAgent,
      is_embed: is_embed || false,
      embed_domain: embed_domain || null,
      view_duration_seconds: duration || null,
    });

    // Update publication counters
    await db
      .update(publications)
      .set({
        view_count: sql`${publications.view_count} + 1`,
        last_viewed_at: new Date(),
      })
      .where(eq(publications.id, publication.id));

    res.status(204).send();
  } catch (error: any) {
    console.error('[Publications] Track view failed:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

export default router;
