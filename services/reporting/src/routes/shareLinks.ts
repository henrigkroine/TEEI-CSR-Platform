/**
 * Share Links Routes
 *
 * Endpoints for generating and managing secure share links for dashboard views
 * Implements HMAC signing, TTL validation, and access logging
 *
 * Endpoints:
 * - POST /companies/:companyId/share-links - Create new share link
 * - GET /companies/:companyId/share-links - List all share links
 * - GET /companies/:companyId/share-links/:linkId - Get link details
 * - DELETE /companies/:companyId/share-links/:linkId - Revoke link
 * - GET /share/:linkId - Public endpoint to access shared view (read-only)
 *
 * @module routes/shareLinks
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ShareLinkRequest, ShareLinkResponse } from '../db/types.js';
import { pool } from '../db/connection.js';
import {
  createShareLink,
  validateShareLink,
  parseTTLDays,
  formatShareLinkURL,
  sanitizeFilterConfig,
  type ShareLinkPayload,
} from '../../utils/signedLinks.js';
<<<<<<< HEAD
import { validateIPAllowlist, validateRequestIP, getClientIP } from '../utils/ipValidation.js';
import { getDefaultWatermarkPolicy, validateWatermarkPolicy, generateWatermarkMetadata, type WatermarkPolicyType } from '../utils/watermarking.js';
import { validateUserAccess, type AccessType, type UserRole } from '../utils/sharingRBAC.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('reporting:shareLinks');
=======
import {
  prepareDataForSharing,
  filterConfigContainsSensitiveData,
} from '../lib/shareRedaction.js';
>>>>>>> origin/claude/phase-f-boardroom-pptx-a11y-01GvaGy8W3FGnuPTTgeRH8vx

interface CompanyParams {
  companyId: string;
}

interface LinkParams {
  linkId: string;
}

interface LinkParamsWithCompany extends CompanyParams, LinkParams {}

export async function shareLinksRoutes(fastify: FastifyInstance) {
  /**
   * Create new share link
   */
  fastify.post<{
    Params: CompanyParams;
    Body: ShareLinkRequest;
  }>('/companies/:companyId/share-links', {
    schema: {
      description: 'Create a secure share link for dashboard view',
      tags: ['Share Links'],
      params: {
        type: 'object',
        required: ['companyId'],
        properties: {
          companyId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          saved_view_id: { type: 'string', format: 'uuid' },
          filter_config: { type: 'object' },
          ttl_days: { type: 'number', minimum: 1, maximum: 90, default: 7 },
          boardroom_mode: { type: 'boolean', default: false },
<<<<<<< HEAD
          // Phase H: Enhanced Sharing
          access_type: {
            type: 'string',
            enum: ['public_link', 'org_share', 'group_share'],
            default: 'public_link',
            description: 'Access control type',
          },
          allowed_ips: {
            type: 'array',
            items: { type: 'string' },
            description: 'IP allowlist (CIDR notation supported)',
          },
          ip_allowlist_enabled: { type: 'boolean', default: false },
          watermark_policy: {
            type: 'string',
            enum: ['none', 'standard', 'strict', 'custom'],
            default: 'standard',
            description: 'Watermark policy to apply',
          },
          watermark_text: { type: 'string', maxLength: 500 },
          group_ids: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            description: 'Group IDs for group_share access type',
          },
          role_restrictions: {
            type: 'array',
            items: { type: 'string', enum: ['admin', 'manager', 'member', 'viewer', 'guest'] },
            description: 'Required roles for access',
          },
=======
          includes_sensitive_data: { type: 'boolean', default: false },
>>>>>>> origin/claude/phase-f-boardroom-pptx-a11y-01GvaGy8W3FGnuPTTgeRH8vx
        },
      },
      response: {
        201: {
          description: 'Share link created',
          type: 'object',
          properties: {
            link_id: { type: 'string' },
            url: { type: 'string' },
            expires_at: { type: 'string' },
            boardroom_mode: { type: 'boolean' },
            access_count: { type: 'number' },
            created_at: { type: 'string' },
          },
        },
        400: {
          description: 'Bad request (must provide saved_view_id or filter_config)',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    async handler(request, reply) {
      const { companyId } = request.params;
<<<<<<< HEAD
      const {
        saved_view_id,
        filter_config,
        ttl_days,
        boardroom_mode,
        access_type,
        allowed_ips,
        ip_allowlist_enabled,
        watermark_policy,
        watermark_text,
        group_ids,
        role_restrictions,
      } = request.body;
=======
      const { saved_view_id, filter_config, ttl_days, boardroom_mode, includes_sensitive_data } = request.body;
>>>>>>> origin/claude/phase-f-boardroom-pptx-a11y-01GvaGy8W3FGnuPTTgeRH8vx

      const userId = (request as any).user?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // Must provide either saved_view_id or filter_config
      if (!saved_view_id && !filter_config) {
        return reply.code(400).send({
          error: 'Must provide either saved_view_id or filter_config',
        });
      }

      // Phase H: Validate IP allowlist if enabled
      if (ip_allowlist_enabled && allowed_ips && allowed_ips.length > 0) {
        const ipValidation = validateIPAllowlist(allowed_ips);
        if (!ipValidation.valid) {
          return reply.code(400).send({
            error: 'Invalid IP allowlist',
            details: ipValidation.errors,
          });
        }
      }

      // Phase H: Validate watermark policy if custom
      if (watermark_policy === 'custom' && watermark_text) {
        const policy = {
          type: 'custom' as WatermarkPolicyType,
          text: watermark_text,
        };
        const wmValidation = validateWatermarkPolicy(policy);
        if (!wmValidation.valid) {
          return reply.code(400).send({
            error: 'Invalid watermark policy',
            details: wmValidation.errors,
          });
        }
      }

      // Phase H: Validate group_share requires group_ids
      if (access_type === 'group_share' && (!group_ids || group_ids.length === 0)) {
        return reply.code(400).send({
          error: 'group_share access type requires at least one group_id',
        });
      }

      let finalFilterConfig = filter_config;

      // If saved_view_id provided, fetch filter config from saved view
      if (saved_view_id) {
        const viewResult = await pool.query(
          'SELECT filter_config FROM saved_views WHERE id = $1 AND company_id = $2 AND (user_id = $3 OR is_shared = true)',
          [saved_view_id, companyId, userId]
        );

        if (viewResult.rows.length === 0) {
          return reply.code(404).send({ error: 'Saved view not found' });
        }

        finalFilterConfig = viewResult.rows[0].filter_config;
      }

      // Check if filter config contains sensitive data
      const hasSensitiveFilters = filterConfigContainsSensitiveData(finalFilterConfig);
      if (hasSensitiveFilters && !includes_sensitive_data) {
        return reply.code(400).send({
          error: 'Filter configuration contains sensitive data. Set includes_sensitive_data=true or remove sensitive filters.',
        });
      }

      // Sanitize filter config (remove PII)
      const sanitizedConfig = sanitizeFilterConfig(finalFilterConfig);

      // Generate signed share link
      const ttl = parseTTLDays(ttl_days);
      const signedLink = createShareLink(companyId, sanitizedConfig, userId, {
        ttlDays: ttl,
        boardroomMode: boardroom_mode || false,
      });

      // Store in database with Phase H enhancements
      const result = await pool.query(
        `INSERT INTO share_links
<<<<<<< HEAD
         (link_id, company_id, created_by, saved_view_id, filter_config, signature, expires_at, boardroom_mode,
          access_type, allowed_ips, ip_allowlist_enabled, watermark_policy, watermark_text, group_ids, role_restrictions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING id, link_id, expires_at, boardroom_mode, access_type, ip_allowlist_enabled, watermark_policy, access_count, created_at`,
=======
         (link_id, company_id, created_by, saved_view_id, filter_config, signature, expires_at, boardroom_mode, includes_sensitive_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, link_id, expires_at, boardroom_mode, includes_sensitive_data, access_count, created_at`,
>>>>>>> origin/claude/phase-f-boardroom-pptx-a11y-01GvaGy8W3FGnuPTTgeRH8vx
        [
          signedLink.linkId,
          companyId,
          userId,
          saved_view_id || null,
          JSON.stringify(sanitizedConfig),
          signedLink.signature,
          signedLink.expiresAt,
          boardroom_mode || false,
<<<<<<< HEAD
          access_type || 'public_link',
          allowed_ips ? JSON.stringify(allowed_ips) : null,
          ip_allowlist_enabled || false,
          watermark_policy || 'standard',
          watermark_text || null,
          group_ids ? JSON.stringify(group_ids) : null,
          role_restrictions ? JSON.stringify(role_restrictions) : null,
=======
          includes_sensitive_data || false,
>>>>>>> origin/claude/phase-f-boardroom-pptx-a11y-01GvaGy8W3FGnuPTTgeRH8vx
        ]
      );

      const link = result.rows[0];

      // Audit log
      await pool.query(
        `INSERT INTO sharing_audit_log (company_id, share_link_id, action, actor_id, ip_address, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          companyId,
          link.id,
          'created',
          userId,
          getClientIP(request),
          JSON.stringify({
            access_type,
            ip_allowlist_enabled,
            watermark_policy,
            boardroom_mode,
          }),
        ]
      );

      logger.info('Share link created', {
        linkId: link.link_id,
        companyId,
        accessType: access_type,
        ipAllowlistEnabled: ip_allowlist_enabled,
        watermarkPolicy: watermark_policy,
      });

      // Generate full URL with base URL from request
      const baseURL = `${request.protocol}://${request.hostname}`;
      const fullURL = formatShareLinkURL(link.link_id, baseURL, link.boardroom_mode);

      return reply.code(201).send({
        link_id: link.link_id,
        url: fullURL,
        expires_at: link.expires_at.toISOString(),
        boardroom_mode: link.boardroom_mode,
<<<<<<< HEAD
        access_type: link.access_type,
        ip_allowlist_enabled: link.ip_allowlist_enabled,
        watermark_policy: link.watermark_policy,
=======
        includes_sensitive_data: link.includes_sensitive_data,
>>>>>>> origin/claude/phase-f-boardroom-pptx-a11y-01GvaGy8W3FGnuPTTgeRH8vx
        access_count: link.access_count,
        created_at: link.created_at.toISOString(),
      });
    },
  });

  /**
   * List all share links for company
   */
  fastify.get<{
    Params: CompanyParams;
    Querystring: { include_expired?: string };
  }>('/companies/:companyId/share-links', {
    schema: {
      description: 'List all share links created by user',
      tags: ['Share Links'],
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
          include_expired: { type: 'string', enum: ['true', 'false'], default: 'false' },
        },
      },
      response: {
        200: {
          description: 'List of share links',
          type: 'object',
          properties: {
            links: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  link_id: { type: 'string' },
                  url: { type: 'string' },
                  expires_at: { type: 'string' },
                  revoked_at: { type: ['string', 'null'] },
                  is_expired: { type: 'boolean' },
                  is_revoked: { type: 'boolean' },
                  boardroom_mode: { type: 'boolean' },
                  access_count: { type: 'number' },
                  last_accessed_at: { type: ['string', 'null'] },
                  created_at: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async handler(request, reply) {
      const { companyId } = request.params;
      const includeExpired = request.query.include_expired === 'true';

      const userId = (request as any).user?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      let query = `
        SELECT link_id, expires_at, revoked_at, boardroom_mode, access_count, last_accessed_at, created_at
        FROM share_links
        WHERE company_id = $1 AND created_by = $2
      `;

      if (!includeExpired) {
        query += ' AND expires_at > NOW() AND revoked_at IS NULL';
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, [companyId, userId]);

      const baseURL = `${request.protocol}://${request.hostname}`;
      const now = new Date();

      const links = result.rows.map((row) => ({
        link_id: row.link_id,
        url: formatShareLinkURL(row.link_id, baseURL, row.boardroom_mode),
        expires_at: row.expires_at.toISOString(),
        revoked_at: row.revoked_at ? row.revoked_at.toISOString() : null,
        is_expired: row.expires_at < now,
        is_revoked: !!row.revoked_at,
        boardroom_mode: row.boardroom_mode,
        access_count: row.access_count,
        last_accessed_at: row.last_accessed_at ? row.last_accessed_at.toISOString() : null,
        created_at: row.created_at.toISOString(),
      }));

      return reply.send({ links });
    },
  });

  /**
   * Get specific share link details
   */
  fastify.get<{
    Params: LinkParamsWithCompany;
  }>('/companies/:companyId/share-links/:linkId', {
    schema: {
      description: 'Get share link details',
      tags: ['Share Links'],
      params: {
        type: 'object',
        required: ['companyId', 'linkId'],
        properties: {
          companyId: { type: 'string', format: 'uuid' },
          linkId: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'Share link details',
          type: 'object',
          properties: {
            link_id: { type: 'string' },
            url: { type: 'string' },
            expires_at: { type: 'string' },
            revoked_at: { type: ['string', 'null'] },
            is_expired: { type: 'boolean' },
            is_revoked: { type: 'boolean' },
            boardroom_mode: { type: 'boolean' },
            access_count: { type: 'number' },
            last_accessed_at: { type: ['string', 'null'] },
            created_at: { type: 'string' },
          },
        },
        404: {
          description: 'Link not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    async handler(request, reply) {
      const { companyId, linkId } = request.params;
      const userId = (request as any).user?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const result = await pool.query(
        `SELECT link_id, expires_at, revoked_at, boardroom_mode, access_count, last_accessed_at, created_at
         FROM share_links
         WHERE link_id = $1 AND company_id = $2 AND created_by = $3`,
        [linkId, companyId, userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Link not found' });
      }

      const link = result.rows[0];
      const baseURL = `${request.protocol}://${request.hostname}`;

      return reply.send({
        link_id: link.link_id,
        url: formatShareLinkURL(link.link_id, baseURL, link.boardroom_mode),
        expires_at: link.expires_at.toISOString(),
        revoked_at: link.revoked_at ? link.revoked_at.toISOString() : null,
        is_expired: link.expires_at < new Date(),
        is_revoked: !!link.revoked_at,
        boardroom_mode: link.boardroom_mode,
        access_count: link.access_count,
        last_accessed_at: link.last_accessed_at ? link.last_accessed_at.toISOString() : null,
        created_at: link.created_at.toISOString(),
      });
    },
  });

  /**
   * Revoke share link
   */
  fastify.delete<{
    Params: LinkParamsWithCompany;
  }>('/companies/:companyId/share-links/:linkId', {
    schema: {
      description: 'Revoke a share link',
      tags: ['Share Links'],
      params: {
        type: 'object',
        required: ['companyId', 'linkId'],
        properties: {
          companyId: { type: 'string', format: 'uuid' },
          linkId: { type: 'string' },
        },
      },
      response: {
        204: {
          description: 'Link revoked',
          type: 'null',
        },
        404: {
          description: 'Link not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    async handler(request, reply) {
      const { companyId, linkId } = request.params;
      const userId = (request as any).user?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const result = await pool.query(
        'UPDATE share_links SET revoked_at = NOW() WHERE link_id = $1 AND company_id = $2 AND created_by = $3 RETURNING id',
        [linkId, companyId, userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Link not found' });
      }

      return reply.code(204).send();
    },
  });

  /**
   * Public endpoint: Access shared view (read-only)
   */
  fastify.get<{
    Params: LinkParams;
  }>('/share/:linkId', {
    schema: {
      description: 'Access shared dashboard view (public, read-only)',
      tags: ['Share Links'],
      params: {
        type: 'object',
        required: ['linkId'],
        properties: {
          linkId: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'Shared view data',
          type: 'object',
          properties: {
            company_id: { type: 'string' },
            filter_config: { type: 'object' },
            boardroom_mode: { type: 'boolean' },
          },
        },
        403: {
          description: 'Link expired, revoked, or invalid',
          type: 'object',
          properties: {
            error: { type: 'string' },
            reason: { type: 'string' },
          },
        },
      },
    },
    async handler(request, reply) {
      const { linkId } = request.params;

      // Fetch link from database with Phase H enhancements
      const result = await pool.query(
<<<<<<< HEAD
        `SELECT id, company_id, filter_config, signature, expires_at, revoked_at, boardroom_mode, created_by,
                access_type, allowed_ips, ip_allowlist_enabled, watermark_policy, watermark_text,
                group_ids, role_restrictions
=======
        `SELECT id, company_id, filter_config, signature, expires_at, revoked_at, boardroom_mode, includes_sensitive_data, created_by
>>>>>>> origin/claude/phase-f-boardroom-pptx-a11y-01GvaGy8W3FGnuPTTgeRH8vx
         FROM share_links
         WHERE link_id = $1`,
        [linkId]
      );

      if (result.rows.length === 0) {
        await logAccess(linkId, request, false, 'invalid_link');
        return reply.code(403).send({
          error: 'Invalid share link',
          reason: 'invalid_link',
        });
      }

      const link = result.rows[0];

      // Phase H: Validate IP allowlist
      if (link.ip_allowlist_enabled) {
        const allowedIps = link.allowed_ips ? JSON.parse(link.allowed_ips) : [];
        const ipValidation = validateRequestIP(request, {
          ip_allowlist_enabled: link.ip_allowlist_enabled,
          allowed_ips: allowedIps,
        });

        if (!ipValidation.allowed) {
          await logAccess(link.id, request, false, 'ip_blocked');
          logger.warn('Share link access denied - IP not in allowlist', {
            linkId,
            clientIP: ipValidation.ip,
          });
          return reply.code(403).send({
            error: 'Access denied',
            reason: 'ip_not_allowed',
          });
        }
      }

      // Validate signature and expiry
      const payload: ShareLinkPayload = {
        linkId,
        companyId: link.company_id,
        filterConfig: link.filter_config,
        expiresAt: link.expires_at,
        boardroomMode: link.boardroom_mode,
        createdBy: link.created_by,
      };

      const validation = validateShareLink(payload, link.signature, link.revoked_at);

      if (!validation.valid) {
        await logAccess(link.id, request, false, validation.reason);
        return reply.code(403).send({
          error: 'Share link is no longer valid',
          reason: validation.reason,
        });
      }

<<<<<<< HEAD
      // Phase H: Validate RBAC for org/group shares
      const user = (request as any).user;
      if (link.access_type !== 'public_link') {
        const groupIds = link.group_ids ? JSON.parse(link.group_ids) : [];
        const roleRestrictions = link.role_restrictions ? JSON.parse(link.role_restrictions) : [];

        const rbacValidation = await validateUserAccess(
          user || null,
          {
            accessType: link.access_type as AccessType,
            groupIds,
            roleRestrictions,
            companyId: link.company_id,
          }
        );

        if (!rbacValidation.allowed) {
          await logAccess(link.id, request, false, 'rbac_denied');
          logger.warn('Share link access denied - RBAC validation failed', {
            linkId,
            userId: user?.id,
            reason: rbacValidation.reason,
          });
          return reply.code(403).send({
            error: 'Access denied',
            reason: rbacValidation.reason || 'insufficient_permissions',
          });
        }
      }

      // Phase H: Generate watermark metadata
      const watermarkPolicy = getDefaultWatermarkPolicy(link.watermark_policy as WatermarkPolicyType);
      if (link.watermark_text) {
        watermarkPolicy.text = link.watermark_text;
      }

      const watermarkMeta = generateWatermarkMetadata(watermarkPolicy, {
        shareLink_id: linkId,
        accessedBy: user?.id || user?.email,
        accessedAt: new Date(),
        clientIP: getClientIP(request),
        companyName: undefined,  // TODO: Fetch company name if needed
      });

      // Log successful access with watermark info
      await logAccess(link.id, request, true, undefined, watermarkPolicy.type !== 'none');

      // Update access count and last accessed timestamp
      await pool.query(
        `UPDATE share_links
         SET access_count = access_count + 1, last_accessed_at = NOW()
         WHERE id = $1`,
        [link.id]
      );

      logger.info('Share link accessed', {
        linkId,
        accessType: link.access_type,
        watermarkApplied: watermarkPolicy.type !== 'none',
        userId: user?.id,
      });

      return reply.send({
        company_id: link.company_id,
        filter_config: link.filter_config,
        boardroom_mode: link.boardroom_mode,
        watermark: watermarkPolicy.type !== 'none' ? watermarkMeta : undefined,
      });
=======
      // Prepare data with comprehensive redaction
      const redactedData = await prepareDataForSharing(
        {
          company_id: link.company_id,
          filter_config: link.filter_config,
          boardroom_mode: link.boardroom_mode,
        },
        {
          includesSensitiveData: link.includes_sensitive_data || false,
          preserveAggregates: true,
          logAccess: true,
          shareLinkId: linkId,
          accessorIp: request.ip,
          accessorUserAgent: request.headers['user-agent'] || 'unknown',
        }
      );

      return reply.send(redactedData.data);
>>>>>>> origin/claude/phase-f-boardroom-pptx-a11y-01GvaGy8W3FGnuPTTgeRH8vx
    },
  });
}

/**
 * Helper: Log share link access attempt (Phase H enhanced)
 */
async function logAccess(
  shareLinkId: string,
  request: FastifyRequest,
  accessGranted: boolean,
  failureReason?: string,
  watermarkApplied: boolean = false
) {
  const ipAddress = getClientIP(request);
  const userAgent = request.headers['user-agent'] || null;
  const referer = request.headers['referer'] || null;
  const userId = (request as any).user?.id || null;

  await pool.query(
    `INSERT INTO share_link_access_log
     (share_link_id, ip_address, user_agent, referer, user_id, access_granted, failure_reason, watermark_applied)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [shareLinkId, ipAddress, userAgent, referer, userId, accessGranted, failureReason || null, watermarkApplied]
  );
}
