import type { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/connection.js';
import type {
  ThemeUpdateRequest,
  ThemeResponse,
  CompanyTheme,
  ContrastRatios,
} from '../db/types.js';
import {
  validateThemeContrast,
  isValidHexColor,
  suggestTextColor,
} from '../utils/contrastValidator.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const LOGO_UPLOAD_DIR = process.env.LOGO_UPLOAD_DIR || './uploads/logos';
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * GET /companies/:id/theme
 * Get current theme for a company
 */
export async function getTheme(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { id: companyId } = request.params;

  const client = await pool.connect();
  try {
    const result = await client.query<CompanyTheme>(
      `SELECT * FROM company_themes WHERE company_id = $1`,
      [companyId]
    );

    if (result.rows.length === 0) {
      reply.code(404).send({ error: 'Theme not found for this company' });
      return;
    }

    const theme = result.rows[0];

    // Build response
    const response: ThemeResponse = {
      company_id: companyId,
      logo_url: theme.logo_url,
      colors: {
        light: {
          primary: theme.primary_color,
          secondary: theme.secondary_color,
          accent: theme.accent_color,
          textOnPrimary: theme.text_on_primary,
          textOnSecondary: theme.text_on_secondary,
          textOnAccent: theme.text_on_accent,
        },
      },
      contrast_validation: {
        is_compliant: theme.is_wcag_aa_compliant,
        ratios: theme.contrast_ratios as ContrastRatios,
        warnings: [],
      },
      updated_at: theme.updated_at.toISOString(),
    };

    // Add dark mode colors if present
    if (theme.primary_color_dark || theme.secondary_color_dark || theme.accent_color_dark) {
      response.colors.dark = {
        primary: theme.primary_color_dark || theme.primary_color,
        secondary: theme.secondary_color_dark || theme.secondary_color,
        accent: theme.accent_color_dark || theme.accent_color,
      };
    }

    // Generate warnings for non-compliant contrasts
    const validation = validateThemeContrast({
      primary: theme.primary_color,
      secondary: theme.secondary_color,
      accent: theme.accent_color,
      textOnPrimary: theme.text_on_primary,
      textOnSecondary: theme.text_on_secondary,
      textOnAccent: theme.text_on_accent,
    });

    response.contrast_validation.warnings = validation.warnings;

    reply.code(200).send(response);
  } catch (error) {
    request.log.error(error);
    reply.code(500).send({ error: 'Failed to fetch theme' });
  } finally {
    client.release();
  }
}

/**
 * PUT /companies/:id/theme
 * Update theme for a company
 */
export async function updateTheme(
  request: FastifyRequest<{ Params: { id: string }; Body: ThemeUpdateRequest }>,
  reply: FastifyReply
): Promise<void> {
  const { id: companyId } = request.params;
  const updates = request.body;

  // Validate hex colors
  const colorFields = [
    'primary_color',
    'secondary_color',
    'accent_color',
    'primary_color_dark',
    'secondary_color_dark',
    'accent_color_dark',
    'text_on_primary',
    'text_on_secondary',
    'text_on_accent',
  ] as const;

  for (const field of colorFields) {
    const color = updates[field];
    if (color && !isValidHexColor(color)) {
      reply.code(400).send({ error: `Invalid hex color format for ${field}: ${color}` });
      return;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current theme
    const currentResult = await client.query<CompanyTheme>(
      `SELECT * FROM company_themes WHERE company_id = $1`,
      [companyId]
    );

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      reply.code(404).send({ error: 'Theme not found for this company' });
      return;
    }

    const currentTheme = currentResult.rows[0];

    // Handle logo upload
    let logoUrl = currentTheme.logo_url;
    let logoMimeType = currentTheme.logo_mime_type;
    let logoSizeBytes = currentTheme.logo_size_bytes;

    if (updates.logo) {
      const { data, mimeType } = updates.logo;

      // Decode base64 and validate size
      const buffer = Buffer.from(data, 'base64');
      if (buffer.length > MAX_LOGO_SIZE) {
        await client.query('ROLLBACK');
        reply.code(400).send({ error: 'Logo size exceeds 2MB limit' });
        return;
      }

      // Save to disk
      await mkdir(LOGO_UPLOAD_DIR, { recursive: true });
      const filename = `${companyId}-${randomUUID()}.${mimeType === 'image/svg+xml' ? 'svg' : 'png'}`;
      const filepath = join(LOGO_UPLOAD_DIR, filename);
      await writeFile(filepath, buffer);

      logoUrl = `/logos/${filename}`;
      logoMimeType = mimeType;
      logoSizeBytes = buffer.length;

      request.log.info(`Logo uploaded for company ${companyId}: ${logoUrl}`);
    }

    // Merge with current values
    const updatedTheme = {
      primary_color: updates.primary_color ?? currentTheme.primary_color,
      secondary_color: updates.secondary_color ?? currentTheme.secondary_color,
      accent_color: updates.accent_color ?? currentTheme.accent_color,
      primary_color_dark: updates.primary_color_dark ?? currentTheme.primary_color_dark,
      secondary_color_dark: updates.secondary_color_dark ?? currentTheme.secondary_color_dark,
      accent_color_dark: updates.accent_color_dark ?? currentTheme.accent_color_dark,
      text_on_primary: updates.text_on_primary ?? currentTheme.text_on_primary,
      text_on_secondary: updates.text_on_secondary ?? currentTheme.text_on_secondary,
      text_on_accent: updates.text_on_accent ?? currentTheme.text_on_accent,
    };

    // Auto-suggest text colors if not provided
    if (updates.primary_color && !updates.text_on_primary) {
      updatedTheme.text_on_primary = suggestTextColor(updates.primary_color);
      request.log.info(
        `Auto-suggested text color for primary: ${updatedTheme.text_on_primary}`
      );
    }
    if (updates.secondary_color && !updates.text_on_secondary) {
      updatedTheme.text_on_secondary = suggestTextColor(updates.secondary_color);
    }
    if (updates.accent_color && !updates.text_on_accent) {
      updatedTheme.text_on_accent = suggestTextColor(updates.accent_color);
    }

    // Validate contrast
    const validation = validateThemeContrast({
      primary: updatedTheme.primary_color,
      secondary: updatedTheme.secondary_color,
      accent: updatedTheme.accent_color,
      textOnPrimary: updatedTheme.text_on_primary,
      textOnSecondary: updatedTheme.text_on_secondary,
      textOnAccent: updatedTheme.text_on_accent,
    });

    const contrastRatios: ContrastRatios = {
      primaryText: validation.validations.primaryText.ratio,
      secondaryText: validation.validations.secondaryText.ratio,
      accentText: validation.validations.accentText.ratio,
    };

    // Update database
    const updateResult = await client.query<CompanyTheme>(
      `UPDATE company_themes
       SET logo_url = $1,
           logo_mime_type = $2,
           logo_size_bytes = $3,
           primary_color = $4,
           secondary_color = $5,
           accent_color = $6,
           primary_color_dark = $7,
           secondary_color_dark = $8,
           accent_color_dark = $9,
           text_on_primary = $10,
           text_on_secondary = $11,
           text_on_accent = $12,
           contrast_ratios = $13,
           is_wcag_aa_compliant = $14
       WHERE company_id = $15
       RETURNING *`,
      [
        logoUrl,
        logoMimeType,
        logoSizeBytes,
        updatedTheme.primary_color,
        updatedTheme.secondary_color,
        updatedTheme.accent_color,
        updatedTheme.primary_color_dark,
        updatedTheme.secondary_color_dark,
        updatedTheme.accent_color_dark,
        updatedTheme.text_on_primary,
        updatedTheme.text_on_secondary,
        updatedTheme.text_on_accent,
        JSON.stringify(contrastRatios),
        validation.isFullyCompliant,
        companyId,
      ]
    );

    await client.query('COMMIT');

    const updated = updateResult.rows[0];

    // Build response
    const response: ThemeResponse = {
      company_id: companyId,
      logo_url: updated.logo_url,
      colors: {
        light: {
          primary: updated.primary_color,
          secondary: updated.secondary_color,
          accent: updated.accent_color,
          textOnPrimary: updated.text_on_primary,
          textOnSecondary: updated.text_on_secondary,
          textOnAccent: updated.text_on_accent,
        },
      },
      contrast_validation: {
        is_compliant: updated.is_wcag_aa_compliant,
        ratios: contrastRatios,
        warnings: validation.warnings,
      },
      updated_at: updated.updated_at.toISOString(),
    };

    if (updated.primary_color_dark || updated.secondary_color_dark || updated.accent_color_dark) {
      response.colors.dark = {
        primary: updated.primary_color_dark || updated.primary_color,
        secondary: updated.secondary_color_dark || updated.secondary_color,
        accent: updated.accent_color_dark || updated.accent_color,
      };
    }

    reply.code(200).send(response);
  } catch (error) {
    await client.query('ROLLBACK');
    request.log.error(error);
    reply.code(500).send({ error: 'Failed to update theme' });
  } finally {
    client.release();
  }
}

/**
 * DELETE /companies/:id/theme/logo
 * Remove logo from theme
 */
export async function removeLogo(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { id: companyId } = request.params;

  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE company_themes
       SET logo_url = NULL,
           logo_mime_type = NULL,
           logo_size_bytes = NULL
       WHERE company_id = $1`,
      [companyId]
    );

    reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    reply.code(500).send({ error: 'Failed to remove logo' });
  } finally {
    client.release();
  }
}
