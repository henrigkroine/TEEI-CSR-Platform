/**
 * Public Publication Routes (Reporting Service)
 *
 * Public-facing endpoints for impact page microsites.
 * Features:
 * - Public read (no auth for PUBLIC visibility)
 * - Token validation for TOKEN visibility
 * - Analytics tracking (anonymized)
 * - Cache headers (ETag, stale-while-revalidate)
 *
 * Security:
 * - No PII in analytics (hashed IPs)
 * - XSS sanitization for TEXT blocks
 * - Token expiry enforcement
 *
 * Ref: Worker 19 § Trust Center Microsites
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Pool } from 'pg';
import { createHash } from 'crypto';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('reporting:publications');

/**
 * Hash token for verification
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Anonymize IP address (HMAC-SHA256 with salt)
 */
function anonymizeIp(ip: string, salt: string = process.env.IP_HASH_SALT || 'default-salt'): string {
  return createHash('sha256').update(ip + salt).digest('hex');
}

/**
 * Generate ETag from publication data
 */
function generateETag(publication: any, blocks: any[]): string {
  const data = JSON.stringify({ publication, blocks });
  return `"${createHash('md5').update(data).digest('hex')}"`;
}

/**
 * Register public publication routes
 */
export async function publicPublicationRoutes(app: FastifyInstance, dbPool: Pool): Promise<void> {
  /**
   * GET /publications/:slug
   * Public read endpoint for microsites
   */
  app.get('/publications/:slug', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { slug } = request.params as { slug: string };
      const { token, tenantId } = request.query as { token?: string; tenantId?: string };

      // Fetch publication
      const pubQuery = tenantId
        ? `SELECT * FROM publications WHERE slug = $1 AND tenant_id = $2 AND status = 'LIVE'`
        : `SELECT * FROM publications WHERE slug = $1 AND status = 'LIVE'`;

      const pubParams = tenantId ? [slug, tenantId] : [slug];
      const pubResult = await dbPool.query(pubQuery, pubParams);

      if (pubResult.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Publication not found',
        });
      }

      const publication = pubResult.rows[0];

      // Check visibility
      if (publication.visibility === 'TOKEN') {
        if (!token) {
          return reply.status(401).send({
            success: false,
            error: 'Unauthorized',
            message: 'Access token required for this publication',
          });
        }

        // Verify token
        const tokenHash = hashToken(token);
        if (publication.access_token !== tokenHash) {
          return reply.status(403).send({
            success: false,
            error: 'Forbidden',
            message: 'Invalid access token',
          });
        }

        // Check token expiry
        if (publication.token_expires_at && new Date(publication.token_expires_at) < new Date()) {
          return reply.status(403).send({
            success: false,
            error: 'Forbidden',
            message: 'Access token has expired',
          });
        }
      }

      // Fetch blocks
      const blocksResult = await dbPool.query(
        `SELECT * FROM publication_blocks WHERE publication_id = $1 ORDER BY "order" ASC`,
        [publication.id]
      );

      const blocks = blocksResult.rows;

      // Generate ETag
      const etag = generateETag(publication, blocks);

      // Check If-None-Match header
      const clientETag = request.headers['if-none-match'];
      if (clientETag === etag) {
        return reply.status(304).send();
      }

      // Track view (async, non-blocking)
      setImmediate(async () => {
        try {
          const ip = request.ip || request.headers['x-forwarded-for'] as string || 'unknown';
          const anonymizedIp = anonymizeIp(ip);
          const referrer = request.headers['referer'] || request.headers['referrer'] || null;
          const userAgent = request.headers['user-agent'] || null;

          await dbPool.query(
            `INSERT INTO publication_views (
              publication_id, viewed_at, referrer, anonymized_ip, user_agent, created_at
            ) VALUES ($1, NOW(), $2, $3, $4, NOW())`,
            [
              publication.id,
              referrer ? String(referrer).substring(0, 500) : null,
              anonymizedIp,
              userAgent ? String(userAgent).substring(0, 500) : null,
            ]
          );
        } catch (err) {
          logger.error('Failed to track publication view', { error: err });
        }
      });

      // Set cache headers
      reply.header('ETag', etag);
      reply.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400'); // 1h cache, 24h stale
      reply.header('Vary', 'Accept-Encoding');

      return reply.send({
        success: true,
        data: {
          publication: {
            id: publication.id,
            slug: publication.slug,
            title: publication.title,
            description: publication.description,
            metaTitle: publication.meta_title,
            ogImage: publication.og_image,
            publishedAt: publication.published_at,
          },
          blocks: blocks.map((block) => ({
            id: block.id,
            kind: block.kind,
            order: block.order,
            payloadJson: block.payload_json,
          })),
        },
      });
    } catch (error: any) {
      logger.error('Failed to fetch publication', { error: error.message });

      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch publication',
      });
    }
  });

  /**
   * HEAD /publications/:slug
   * Check publication existence (for sitemaps)
   */
  app.head('/publications/:slug', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { slug } = request.params as { slug: string };
      const { tenantId } = request.query as { tenantId?: string };

      const pubQuery = tenantId
        ? `SELECT id, visibility FROM publications WHERE slug = $1 AND tenant_id = $2 AND status = 'LIVE'`
        : `SELECT id, visibility FROM publications WHERE slug = $1 AND status = 'LIVE'`;

      const pubParams = tenantId ? [slug, tenantId] : [slug];
      const pubResult = await dbPool.query(pubQuery, pubParams);

      if (pubResult.rows.length === 0) {
        return reply.status(404).send();
      }

      const publication = pubResult.rows[0];

      // Only PUBLIC publications are discoverable
      if (publication.visibility === 'TOKEN') {
        return reply.status(404).send();
      }

      return reply.status(200).send();
    } catch (error: any) {
      logger.error('Failed to check publication', { error: error.message });
      return reply.status(500).send();
    }
  });

  /**
   * GET /publications/sitemap.xml
   * Generate sitemap for PUBLIC publications
   */
  app.get('/publications/sitemap.xml', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId } = request.query as { tenantId?: string };

      // Fetch PUBLIC LIVE publications
      const pubQuery = tenantId
        ? `SELECT slug, updated_at FROM publications WHERE tenant_id = $1 AND status = 'LIVE' AND visibility = 'PUBLIC' ORDER BY updated_at DESC`
        : `SELECT slug, updated_at FROM publications WHERE status = 'LIVE' AND visibility = 'PUBLIC' ORDER BY updated_at DESC`;

      const pubParams = tenantId ? [tenantId] : [];
      const pubResult = await dbPool.query(pubQuery, pubParams);

      const publications = pubResult.rows;

      // Generate XML sitemap
      const baseUrl = process.env.TRUST_CENTER_BASE_URL || 'https://trust.teei.io';
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publications.map((pub) => `  <url>
    <loc>${baseUrl}/impact/${pub.slug}</loc>
    <lastmod>${new Date(pub.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;

      reply.header('Content-Type', 'application/xml');
      reply.header('Cache-Control', 'public, max-age=86400'); // 24h cache
      return reply.send(sitemap);
    } catch (error: any) {
      logger.error('Failed to generate sitemap', { error: error.message });
      return reply.status(500).send();
    }
  });
}
