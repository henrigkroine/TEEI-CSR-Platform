import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { themeRoutes } from '../routes/themes.js';
import { pool } from '../db/connection.js';

describe('Theme API Integration Tests', () => {
  let fastify: ReturnType<typeof Fastify>;
  let testCompanyId: string;

  beforeAll(async () => {
    fastify = Fastify();
    await fastify.register(themeRoutes);

    // Create test company
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO companies (name, industry) VALUES ($1, $2) RETURNING id`,
        ['Test Company', 'Technology']
      );
      testCompanyId = result.rows[0].id;

      // Ensure theme record exists
      await client.query(
        `INSERT INTO company_themes (company_id) VALUES ($1) ON CONFLICT (company_id) DO NOTHING`,
        [testCompanyId]
      );
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    // Cleanup
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM company_themes WHERE company_id = $1', [testCompanyId]);
      await client.query('DELETE FROM companies WHERE id = $1', [testCompanyId]);
    } finally {
      client.release();
    }

    await fastify.close();
  });

  describe('GET /companies/:id/theme', () => {
    it('should retrieve default theme for company', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/companies/${testCompanyId}/theme`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('company_id', testCompanyId);
      expect(data).toHaveProperty('logo_url');
      expect(data).toHaveProperty('colors');
      expect(data.colors.light).toHaveProperty('primary');
      expect(data.colors.light).toHaveProperty('secondary');
      expect(data.colors.light).toHaveProperty('accent');
      expect(data.contrast_validation).toHaveProperty('is_compliant');
    });

    it('should return 404 for non-existent company', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await fastify.inject({
        method: 'GET',
        url: `/companies/${fakeId}/theme`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /companies/:id/theme', () => {
    it('should update theme colors', async () => {
      const updateData = {
        primary_color: '#FF5733',
        secondary_color: '#33FF57',
        accent_color: '#3357FF',
      };

      const response = await fastify.inject({
        method: 'PUT',
        url: `/companies/${testCompanyId}/theme`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.colors.light.primary).toBe('#FF5733');
      expect(data.colors.light.secondary).toBe('#33FF57');
      expect(data.colors.light.accent).toBe('#3357FF');
    });

    it('should auto-suggest text colors for brand colors', async () => {
      const updateData = {
        primary_color: '#000000', // Dark - should suggest white
      };

      const response = await fastify.inject({
        method: 'PUT',
        url: `/companies/${testCompanyId}/theme`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.colors.light.textOnPrimary).toBe('#FFFFFF');
    });

    it('should validate contrast and provide warnings', async () => {
      const updateData = {
        primary_color: '#FFFF00', // Yellow
        text_on_primary: '#FFFFFF', // White on yellow = poor contrast
      };

      const response = await fastify.inject({
        method: 'PUT',
        url: `/companies/${testCompanyId}/theme`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.contrast_validation.is_compliant).toBe(false);
      expect(data.contrast_validation.warnings.length).toBeGreaterThan(0);
    });

    it('should reject invalid hex color format', async () => {
      const updateData = {
        primary_color: 'rgb(255,0,0)', // Not hex
      };

      const response = await fastify.inject({
        method: 'PUT',
        url: `/companies/${testCompanyId}/theme`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain('Invalid hex color');
    });

    it('should update dark mode colors', async () => {
      const updateData = {
        primary_color_dark: '#3B82F6',
        secondary_color_dark: '#60A5FA',
        accent_color_dark: '#34D399',
      };

      const response = await fastify.inject({
        method: 'PUT',
        url: `/companies/${testCompanyId}/theme`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.colors.dark?.primary).toBe('#3B82F6');
      expect(data.colors.dark?.secondary).toBe('#60A5FA');
      expect(data.colors.dark?.accent).toBe('#34D399');
    });

    it('should handle logo upload (base64)', async () => {
      // Create a tiny 1x1 PNG in base64
      const tiny1x1PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const updateData = {
        logo: {
          data: tiny1x1PNG,
          mimeType: 'image/png' as const,
        },
      };

      const response = await fastify.inject({
        method: 'PUT',
        url: `/companies/${testCompanyId}/theme`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.logo_url).toBeTruthy();
      expect(data.logo_url).toContain('.png');
    });

    it('should reject logo over 2MB', async () => {
      // Create a base64 string that's too large
      const largeData = 'A'.repeat(3 * 1024 * 1024); // 3MB of 'A's

      const updateData = {
        logo: {
          data: largeData,
          mimeType: 'image/png' as const,
        },
      };

      const response = await fastify.inject({
        method: 'PUT',
        url: `/companies/${testCompanyId}/theme`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain('2MB');
    });
  });

  describe('DELETE /companies/:id/theme/logo', () => {
    it('should remove logo from theme', async () => {
      const response = await fastify.inject({
        method: 'DELETE',
        url: `/companies/${testCompanyId}/theme/logo`,
      });

      expect(response.statusCode).toBe(204);

      // Verify logo is removed
      const getResponse = await fastify.inject({
        method: 'GET',
        url: `/companies/${testCompanyId}/theme`,
      });

      const data = getResponse.json();
      expect(data.logo_url).toBeNull();
    });
  });

  describe('Contrast validation scenarios', () => {
    it('should pass WCAG AA for compliant theme', async () => {
      const compliantTheme = {
        primary_color: '#0066CC',
        secondary_color: '#1E40AF',
        accent_color: '#10B981',
        text_on_primary: '#FFFFFF',
        text_on_secondary: '#FFFFFF',
        text_on_accent: '#FFFFFF',
      };

      const response = await fastify.inject({
        method: 'PUT',
        url: `/companies/${testCompanyId}/theme`,
        payload: compliantTheme,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.contrast_validation.is_compliant).toBe(true);
      expect(data.contrast_validation.warnings).toHaveLength(0);
      expect(data.contrast_validation.ratios.primaryText).toBeGreaterThan(4.5);
      expect(data.contrast_validation.ratios.secondaryText).toBeGreaterThan(4.5);
      expect(data.contrast_validation.ratios.accentText).toBeGreaterThan(4.5);
    });

    it('should store contrast ratios in database', async () => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT contrast_ratios, is_wcag_aa_compliant FROM company_themes WHERE company_id = $1',
          [testCompanyId]
        );

        expect(result.rows[0].is_wcag_aa_compliant).toBe(true);
        expect(result.rows[0].contrast_ratios).toBeDefined();
        expect(result.rows[0].contrast_ratios).toHaveProperty('primaryText');
      } finally {
        client.release();
      }
    });
  });
});
