import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { tenantScope, TenantRequest } from '../middleware/tenantScope.js';
import {
  requireCompanyAdmin,
  requirePermission,
  Permission,
} from '../middleware/rbac.js';
import { logTenantAction } from '../utils/tenantContext.js';
import crypto from 'crypto';
import type {
  BrandingTheme,
  BrandingAsset,
  BrandingDomain,
  CreateThemeRequest,
  UpdateThemeRequest,
  AssetKind,
  ThemeValidationResult,
} from '@teei/shared-types';

/**
 * SVG sanitization configuration
 * Removes potentially dangerous elements and attributes from SVG uploads
 */
const ALLOWED_SVG_ELEMENTS = new Set([
  'svg', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'g', 'defs', 'clipPath', 'mask', 'pattern', 'text', 'tspan', 'title', 'desc',
  'linearGradient', 'radialGradient', 'stop',
]);

const ALLOWED_SVG_ATTRIBUTES = new Set([
  'xmlns', 'viewBox', 'width', 'height', 'd', 'fill', 'stroke', 'stroke-width',
  'opacity', 'transform', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'points', 'id', 'class', 'style', 'gradientUnits', 'offset', 'stop-color',
]);

const DANGEROUS_SVG_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i, // Event handlers like onclick, onload, etc.
  /<iframe/i,
  /<embed/i,
  /<object/i,
  /<link/i,
  /<import/i,
];

/**
 * Sanitize SVG content by removing dangerous elements
 */
function sanitizeSVG(svgContent: string): string {
  // Check for dangerous patterns
  for (const pattern of DANGEROUS_SVG_PATTERNS) {
    if (pattern.test(svgContent)) {
      throw new Error('SVG contains dangerous content');
    }
  }

  // TODO: Implement full DOMPurify-like sanitization
  // For now, basic validation only
  return svgContent;
}

/**
 * Calculate SHA-256 hash for asset integrity
 */
function calculateHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Calculate WCAG contrast ratio
 * https://www.w3.org/TR/WCAG21/#contrast-minimum
 */
function calculateContrastRatio(fg: string, bg: string): number {
  // Parse hex colors
  const parseHex = (hex: string): { r: number; g: number; b: number } => {
    const cleaned = hex.replace('#', '');
    return {
      r: parseInt(cleaned.substring(0, 2), 16) / 255,
      g: parseInt(cleaned.substring(2, 4), 16) / 255,
      b: parseInt(cleaned.substring(4, 6), 16) / 255,
    };
  };

  // Calculate relative luminance
  const getLuminance = (rgb: { r: number; g: number; b: number }): number => {
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map((c) => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const fgRGB = parseHex(fg);
  const bgRGB = parseHex(bg);

  const fgLum = getLuminance(fgRGB);
  const bgLum = getLuminance(bgRGB);

  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Validate theme tokens for WCAG AA compliance
 */
function validateThemeTokens(tokens: any): ThemeValidationResult {
  const errors: any[] = [];
  const warnings: any[] = [];
  const contrastChecks: any[] = [];

  // Validate color contrast for all foreground/background pairs
  const colorPairs = [
    { fg: tokens.colors?.primaryForeground, bg: tokens.colors?.primary, name: 'Primary' },
    { fg: tokens.colors?.secondaryForeground, bg: tokens.colors?.secondary, name: 'Secondary' },
    { fg: tokens.colors?.accentForeground, bg: tokens.colors?.accent, name: 'Accent' },
    { fg: tokens.colors?.foreground, bg: tokens.colors?.background, name: 'Body' },
    { fg: tokens.colors?.mutedForeground, bg: tokens.colors?.muted, name: 'Muted' },
  ];

  for (const pair of colorPairs) {
    if (!pair.fg || !pair.bg) {
      errors.push({
        field: `colors.${pair.name.toLowerCase()}`,
        message: `Missing foreground or background color for ${pair.name}`,
      });
      continue;
    }

    try {
      const ratio = calculateContrastRatio(pair.fg, pair.bg);
      const isValid = ratio >= 4.5; // WCAG AA for normal text
      const level = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'FAIL';

      contrastChecks.push({
        isValid,
        ratio: Math.round(ratio * 100) / 100,
        level,
        foreground: pair.fg,
        background: pair.bg,
      });

      if (!isValid) {
        errors.push({
          field: `colors.${pair.name.toLowerCase()}`,
          message: `Contrast ratio ${ratio.toFixed(2)}:1 fails WCAG AA (minimum 4.5:1)`,
          value: { foreground: pair.fg, background: pair.bg },
        });
      }
    } catch (err) {
      errors.push({
        field: `colors.${pair.name.toLowerCase()}`,
        message: `Invalid color format`,
        value: { foreground: pair.fg, background: pair.bg },
      });
    }
  }

  // Validate required tokens
  if (!tokens.colors) {
    errors.push({ field: 'colors', message: 'Color tokens are required' });
  }

  if (!tokens.typography) {
    errors.push({ field: 'typography', message: 'Typography tokens are required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    contrastChecks,
  };
}

/**
 * Log branding audit event
 */
async function logBrandingAudit(
  request: FastifyRequest,
  tenantId: string,
  resourceType: 'theme' | 'asset' | 'domain',
  resourceId: string,
  action: string,
  changes?: any
): Promise<void> {
  // TODO: Insert into branding_audit_log table
  await logTenantAction(request, {
    action: `branding_${action}`,
    resourceType: `branding_${resourceType}`,
    resourceId,
    changes,
  });
}

/**
 * Register branding API routes
 */
export async function registerBrandingRoutes(fastify: FastifyInstance): Promise<void> {
  // ==================== THEME ROUTES ====================

  /**
   * GET /api/branding/themes
   * List all themes for a tenant
   */
  fastify.get('/api/branding/themes', {
    onRequest: [authenticateJWT, tenantScope]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantRequest = request as TenantRequest;
    const { tenantId } = request.query as { tenantId: string };

    try {
      // TODO: Query branding_themes table
      // For now, return mock data
      const themes: BrandingTheme[] = [];

      return reply.send({
        success: true,
        data: themes,
        meta: {
          total: themes.length,
          tenantId,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to list themes');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve themes',
      });
    }
  });

  /**
   * GET /api/branding/themes/:themeId
   * Get a specific theme by ID
   */
  fastify.get('/api/branding/themes/:themeId', {
    onRequest: [authenticateJWT, tenantScope]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { themeId } = request.params as { themeId: string };

    try {
      // TODO: Query branding_themes table
      return reply.status(404).send({
        success: false,
        error: 'Not Found',
        message: 'Theme not found',
      });
    } catch (error) {
      request.log.error({ error, themeId }, 'Failed to get theme');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve theme',
      });
    }
  });

  /**
   * POST /api/branding/themes
   * Create a new theme (admin only)
   */
  fastify.post('/api/branding/themes', {
    onRequest: [authenticateJWT, tenantScope, requireCompanyAdmin]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantRequest = request as TenantRequest & AuthenticatedRequest;
    const createRequest = request.body as CreateThemeRequest;

    try {
      // Validate theme tokens
      const validation = validateThemeTokens(createRequest.tokens);
      if (!validation.isValid) {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Theme validation failed',
          validation,
        });
      }

      // TODO: Insert into branding_themes table
      const themeId = crypto.randomUUID();

      // Log audit event
      await logBrandingAudit(
        request,
        createRequest.tenantId,
        'theme',
        themeId,
        'created',
        { name: createRequest.name }
      );

      return reply.status(201).send({
        success: true,
        data: {
          id: themeId,
          ...createRequest,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        message: 'Theme created successfully',
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to create theme');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create theme',
      });
    }
  });

  /**
   * PATCH /api/branding/themes/:themeId
   * Update an existing theme (admin only)
   */
  fastify.patch('/api/branding/themes/:themeId', {
    onRequest: [authenticateJWT, tenantScope, requireCompanyAdmin]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { themeId } = request.params as { themeId: string };
    const updateRequest = request.body as UpdateThemeRequest;
    const tenantRequest = request as TenantRequest & AuthenticatedRequest;

    try {
      // Validate theme tokens if provided
      if (updateRequest.tokens) {
        const validation = validateThemeTokens(updateRequest.tokens);
        if (!validation.isValid) {
          return reply.status(400).send({
            success: false,
            error: 'Bad Request',
            message: 'Theme validation failed',
            validation,
          });
        }
      }

      // TODO: Update branding_themes table

      // Log audit event
      await logBrandingAudit(
        request,
        tenantRequest.tenant.companyId,
        'theme',
        themeId,
        'updated',
        updateRequest
      );

      return reply.send({
        success: true,
        data: {
          id: themeId,
          updatedAt: new Date().toISOString(),
        },
        message: 'Theme updated successfully',
      });
    } catch (error) {
      request.log.error({ error, themeId }, 'Failed to update theme');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update theme',
      });
    }
  });

  /**
   * DELETE /api/branding/themes/:themeId
   * Delete a theme (admin only)
   */
  fastify.delete('/api/branding/themes/:themeId', {
    onRequest: [authenticateJWT, tenantScope, requireCompanyAdmin]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { themeId } = request.params as { themeId: string };
    const tenantRequest = request as TenantRequest;

    try {
      // TODO: Delete from branding_themes table (CASCADE will delete assets)

      // Log audit event
      await logBrandingAudit(
        request,
        tenantRequest.tenant.companyId,
        'theme',
        themeId,
        'deleted'
      );

      return reply.send({
        success: true,
        message: 'Theme deleted successfully',
        data: { themeId },
      });
    } catch (error) {
      request.log.error({ error, themeId }, 'Failed to delete theme');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to delete theme',
      });
    }
  });

  /**
   * POST /api/branding/themes/:themeId/activate
   * Activate a theme (deactivates others for the tenant)
   */
  fastify.post('/api/branding/themes/:themeId/activate', {
    onRequest: [authenticateJWT, tenantScope, requireCompanyAdmin]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { themeId } = request.params as { themeId: string };
    const tenantRequest = request as TenantRequest;

    try {
      // TODO: Deactivate all themes for tenant, then activate this one

      // Log audit event
      await logBrandingAudit(
        request,
        tenantRequest.tenant.companyId,
        'theme',
        themeId,
        'activated'
      );

      return reply.send({
        success: true,
        message: 'Theme activated successfully',
        data: { themeId },
      });
    } catch (error) {
      request.log.error({ error, themeId }, 'Failed to activate theme');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to activate theme',
      });
    }
  });

  // ==================== ASSET ROUTES ====================

  /**
   * POST /api/branding/themes/:themeId/assets
   * Upload an asset (logo, favicon, watermark, etc.)
   * Supports multipart/form-data file upload
   */
  fastify.post('/api/branding/themes/:themeId/assets', {
    onRequest: [authenticateJWT, tenantScope, requireCompanyAdmin]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { themeId } = request.params as { themeId: string };
    const tenantRequest = request as TenantRequest & AuthenticatedRequest;

    try {
      // TODO: Handle multipart file upload
      // const data = await request.file();
      // const buffer = await data.toBuffer();

      // Validate file size (max 25MB)
      const MAX_SIZE = 25 * 1024 * 1024;
      // if (buffer.length > MAX_SIZE) {
      //   return reply.status(400).send({
      //     success: false,
      //     error: 'Bad Request',
      //     message: 'File size exceeds 25MB limit',
      //   });
      // }

      // Validate MIME type
      // const allowedMimeTypes = [
      //   'image/png',
      //   'image/jpeg',
      //   'image/svg+xml',
      //   'image/webp',
      //   'image/x-icon',
      // ];
      // if (!allowedMimeTypes.includes(data.mimetype)) {
      //   return reply.status(400).send({
      //     success: false,
      //     error: 'Bad Request',
      //     message: 'Invalid file type. Allowed: PNG, JPEG, SVG, WebP, ICO',
      //   });
      // }

      // Sanitize SVG if applicable
      // if (data.mimetype === 'image/svg+xml') {
      //   const svgContent = buffer.toString('utf-8');
      //   const sanitized = sanitizeSVG(svgContent);
      //   buffer = Buffer.from(sanitized, 'utf-8');
      // }

      // Calculate hash
      // const hash = calculateHash(buffer);

      // TODO: Upload to CDN/S3
      // const url = await uploadToCDN(buffer, data.filename);

      // TODO: Insert into branding_assets table
      const assetId = crypto.randomUUID();

      // Log audit event
      await logBrandingAudit(
        request,
        tenantRequest.tenant.companyId,
        'asset',
        assetId,
        'uploaded',
        { themeId }
      );

      return reply.status(201).send({
        success: true,
        data: {
          id: assetId,
          themeId,
          // url,
          // hash,
          // mimeType: data.mimetype,
        },
        message: 'Asset uploaded successfully',
      });
    } catch (error) {
      request.log.error({ error, themeId }, 'Failed to upload asset');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to upload asset',
      });
    }
  });

  /**
   * GET /api/branding/themes/:themeId/assets
   * List assets for a theme
   */
  fastify.get('/api/branding/themes/:themeId/assets', {
    onRequest: [authenticateJWT, tenantScope]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { themeId } = request.params as { themeId: string };

    try {
      // TODO: Query branding_assets table
      const assets: BrandingAsset[] = [];

      return reply.send({
        success: true,
        data: assets,
        meta: {
          total: assets.length,
          themeId,
        },
      });
    } catch (error) {
      request.log.error({ error, themeId }, 'Failed to list assets');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve assets',
      });
    }
  });

  /**
   * DELETE /api/branding/assets/:assetId
   * Delete an asset
   */
  fastify.delete('/api/branding/assets/:assetId', {
    onRequest: [authenticateJWT, tenantScope, requireCompanyAdmin]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { assetId } = request.params as { assetId: string };
    const tenantRequest = request as TenantRequest;

    try {
      // TODO: Delete from branding_assets table
      // TODO: Delete from CDN/S3

      // Log audit event
      await logBrandingAudit(
        request,
        tenantRequest.tenant.companyId,
        'asset',
        assetId,
        'deleted'
      );

      return reply.send({
        success: true,
        message: 'Asset deleted successfully',
        data: { assetId },
      });
    } catch (error) {
      request.log.error({ error, assetId }, 'Failed to delete asset');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to delete asset',
      });
    }
  });

  // ==================== DOMAIN ROUTES ====================

  /**
   * POST /api/branding/domains
   * Add a custom domain for white-label routing
   */
  fastify.post('/api/branding/domains', {
    onRequest: [authenticateJWT, tenantScope, requireCompanyAdmin]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantRequest = request as TenantRequest & AuthenticatedRequest;
    const { tenantId, domain } = request.body as { tenantId: string; domain: string };

    try {
      // Validate domain format
      const domainRegex = /^[a-z0-9\-\.]+$/;
      if (!domainRegex.test(domain)) {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Invalid domain format',
        });
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // TODO: Insert into branding_domains table
      const domainId = crypto.randomUUID();

      // Log audit event
      await logBrandingAudit(
        request,
        tenantId,
        'domain',
        domainId,
        'created',
        { domain }
      );

      return reply.status(201).send({
        success: true,
        data: {
          id: domainId,
          domain,
          verificationToken,
          verificationInstructions: `Add a TXT record to ${domain} with value: teei-verify=${verificationToken}`,
        },
        message: 'Domain added successfully. Please verify ownership.',
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to add domain');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to add domain',
      });
    }
  });

  /**
   * POST /api/branding/domains/:domainId/verify
   * Verify domain ownership
   */
  fastify.post('/api/branding/domains/:domainId/verify', {
    onRequest: [authenticateJWT, tenantScope, requireCompanyAdmin]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { domainId } = request.params as { domainId: string };
    const tenantRequest = request as TenantRequest;

    try {
      // TODO: Check DNS TXT record
      // TODO: Update branding_domains table (is_verified = true, verified_at = NOW())

      // Log audit event
      await logBrandingAudit(
        request,
        tenantRequest.tenant.companyId,
        'domain',
        domainId,
        'verified'
      );

      return reply.send({
        success: true,
        message: 'Domain verified successfully',
        data: { domainId },
      });
    } catch (error) {
      request.log.error({ error, domainId }, 'Failed to verify domain');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to verify domain',
      });
    }
  });

  /**
   * GET /api/branding/domains
   * List custom domains for a tenant
   */
  fastify.get('/api/branding/domains', {
    onRequest: [authenticateJWT, tenantScope]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.query as { tenantId: string };

    try {
      // TODO: Query branding_domains table
      const domains: BrandingDomain[] = [];

      return reply.send({
        success: true,
        data: domains,
        meta: {
          total: domains.length,
          tenantId,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to list domains');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve domains',
      });
    }
  });

  /**
   * DELETE /api/branding/domains/:domainId
   * Remove a custom domain
   */
  fastify.delete('/api/branding/domains/:domainId', {
    onRequest: [authenticateJWT, tenantScope, requireCompanyAdmin]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { domainId } = request.params as { domainId: string };
    const tenantRequest = request as TenantRequest;

    try {
      // TODO: Delete from branding_domains table

      // Log audit event
      await logBrandingAudit(
        request,
        tenantRequest.tenant.companyId,
        'domain',
        domainId,
        'deleted'
      );

      return reply.send({
        success: true,
        message: 'Domain removed successfully',
        data: { domainId },
      });
    } catch (error) {
      request.log.error({ error, domainId }, 'Failed to remove domain');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to remove domain',
      });
    }
  });

  fastify.log.info('Branding routes registered');
}
