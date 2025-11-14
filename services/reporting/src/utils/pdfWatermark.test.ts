/**
 * PDF Watermarking Utilities Tests
 *
 * @module utils/pdfWatermark.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateTenantConfig,
  getDefaultTenantConfig,
  estimateWatermarkedSize,
  generatePlaywrightHeaderTemplate,
  generatePlaywrightFooterTemplate,
  type TenantWatermarkConfig,
  type WatermarkMetadata,
} from './pdfWatermark.js';

describe('PDF Watermarking Utilities', () => {
  let validTenantConfig: TenantWatermarkConfig;
  let sampleMetadata: WatermarkMetadata;

  beforeEach(() => {
    validTenantConfig = {
      tenant_id: 'tenant-123',
      company_name: 'Acme Corp',
      logo_url: 'https://example.com/logo.png',
      logo_position: 'header',
      primary_color: '#6366f1',
      confidential_mark: true,
      confidential_text: 'CONFIDENTIAL',
      include_export_metadata: true,
      custom_footer_text: 'Acme Corp - Confidential',
      page_numbering: true,
    };

    sampleMetadata = {
      company_name: 'Acme Corp',
      export_date: new Date('2024-11-14T10:00:00Z'),
      export_user: 'Jane Doe',
      export_user_email: 'jane@acme.com',
      report_title: 'Q3 2024 Impact Report',
      report_period: '2024-Q3',
    };
  });

  describe('validateTenantConfig', () => {
    it('should validate a valid tenant configuration', () => {
      const result = validateTenantConfig(validTenantConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing tenant_id', () => {
      const config = { ...validTenantConfig, tenant_id: '' };
      const result = validateTenantConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tenant ID is required');
    });

    it('should reject missing company_name', () => {
      const config = { ...validTenantConfig, company_name: '' };
      const result = validateTenantConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Company name is required');
    });

    it('should reject invalid primary_color', () => {
      const config = { ...validTenantConfig, primary_color: 'blue' };
      const result = validateTenantConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Primary color must be a valid hex code (e.g., #6366f1)');
    });

    it('should reject invalid logo_position', () => {
      const config = { ...validTenantConfig, logo_position: 'invalid' as any };
      const result = validateTenantConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Logo position must be header, footer, or both');
    });

    it('should accept valid base64 logo URL', () => {
      const config = {
        ...validTenantConfig,
        logo_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };
      const result = validateTenantConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should accept valid HTTP(S) logo URL', () => {
      const config = { ...validTenantConfig, logo_url: 'https://example.com/logo.png' };
      const result = validateTenantConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid logo URL', () => {
      const config = { ...validTenantConfig, logo_url: 'ftp://invalid.com/logo.png' };
      const result = validateTenantConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Logo URL must be a valid HTTP(S) URL or base64 data URI');
    });
  });

  describe('getDefaultTenantConfig', () => {
    it('should return default configuration with required fields', () => {
      const config = getDefaultTenantConfig('tenant-456', 'Beta Inc');

      expect(config.tenant_id).toBe('tenant-456');
      expect(config.company_name).toBe('Beta Inc');
      expect(config.logo_position).toBe('header');
      expect(config.primary_color).toBe('#6366f1');
      expect(config.confidential_mark).toBe(false);
      expect(config.include_export_metadata).toBe(true);
      expect(config.page_numbering).toBe(true);
    });

    it('should produce a valid configuration', () => {
      const config = getDefaultTenantConfig('tenant-789', 'Gamma LLC');
      const result = validateTenantConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('estimateWatermarkedSize', () => {
    it('should estimate size with no watermarks (base overhead only)', () => {
      const originalSize = 1000000; // 1 MB
      const estimated = estimateWatermarkedSize(originalSize, false, false);

      // Base overhead is 1%
      expect(estimated).toBe(1010000);
    });

    it('should estimate size with logo watermark', () => {
      const originalSize = 1000000; // 1 MB
      const estimated = estimateWatermarkedSize(originalSize, true, false);

      // Base 1% + logo 2% = 3% overhead
      expect(estimated).toBe(1030000);
    });

    it('should estimate size with text watermark', () => {
      const originalSize = 1000000; // 1 MB
      const estimated = estimateWatermarkedSize(originalSize, false, true);

      // Base 1% + text 1% = 2% overhead
      expect(estimated).toBe(1020000);
    });

    it('should estimate size with both logo and text watermarks', () => {
      const originalSize = 1000000; // 1 MB
      const estimated = estimateWatermarkedSize(originalSize, true, true);

      // Base 1% + logo 2% + text 1% = 4% overhead
      expect(estimated).toBe(1040000);
    });

    it('should round up to nearest byte', () => {
      const originalSize = 123456;
      const estimated = estimateWatermarkedSize(originalSize, true, true);

      // Should be integer (ceiling)
      expect(estimated).toBe(Math.ceil(123456 * 1.04));
      expect(Number.isInteger(estimated)).toBe(true);
    });
  });

  describe('generatePlaywrightHeaderTemplate', () => {
    it('should generate header template with logo', () => {
      const html = generatePlaywrightHeaderTemplate(validTenantConfig, sampleMetadata);

      expect(html).toContain('<img src="https://example.com/logo.png"');
      expect(html).toContain('Acme Corp');
      expect(html).toContain('Q3 2024 Impact Report');
      expect(html).toContain('#6366f1'); // Primary color
    });

    it('should generate header template without logo', () => {
      const config = { ...validTenantConfig, logo_url: undefined };
      const html = generatePlaywrightHeaderTemplate(config, sampleMetadata);

      expect(html).not.toContain('<img');
      expect(html).toContain('Acme Corp');
    });

    it('should generate header template without report title', () => {
      const metadata = { ...sampleMetadata, report_title: undefined };
      const html = generatePlaywrightHeaderTemplate(validTenantConfig, metadata);

      expect(html).toContain('Acme Corp');
      expect(html).not.toContain('Q3 2024 Impact Report');
    });

    it('should use custom primary color', () => {
      const config = { ...validTenantConfig, primary_color: '#ff5733' };
      const html = generatePlaywrightHeaderTemplate(config, sampleMetadata);

      expect(html).toContain('#ff5733');
    });
  });

  describe('generatePlaywrightFooterTemplate', () => {
    it('should generate footer template with all elements', () => {
      const html = generatePlaywrightFooterTemplate(validTenantConfig, sampleMetadata);

      expect(html).toContain('Generated:');
      expect(html).toContain('by Jane Doe');
      expect(html).toContain('Page');
      expect(html).toContain('pageNumber');
      expect(html).toContain('totalPages');
      expect(html).toContain('Acme Corp - Confidential');
    });

    it('should include confidential watermark when enabled', () => {
      const html = generatePlaywrightFooterTemplate(validTenantConfig, sampleMetadata);

      expect(html).toContain('CONFIDENTIAL');
      expect(html).toContain('rotate(-45deg)');
    });

    it('should not include confidential watermark when disabled', () => {
      const config = { ...validTenantConfig, confidential_mark: false };
      const html = generatePlaywrightFooterTemplate(config, sampleMetadata);

      expect(html).not.toContain('CONFIDENTIAL');
      expect(html).not.toContain('rotate(-45deg)');
    });

    it('should not include page numbers when disabled', () => {
      const config = { ...validTenantConfig, page_numbering: false };
      const html = generatePlaywrightFooterTemplate(config, sampleMetadata);

      expect(html).not.toContain('pageNumber');
      expect(html).not.toContain('totalPages');
    });

    it('should use default footer text when custom not provided', () => {
      const config = { ...validTenantConfig, custom_footer_text: undefined };
      const html = generatePlaywrightFooterTemplate(config, sampleMetadata);

      expect(html).toContain('TEEI CSR Platform');
    });

    it('should format export date correctly', () => {
      const html = generatePlaywrightFooterTemplate(validTenantConfig, sampleMetadata);

      // Date should be formatted like "Nov 14, 2024"
      expect(html).toMatch(/Generated:\s*Nov\s+14,\s+2024/);
    });

    it('should handle missing export user', () => {
      const metadata = { ...sampleMetadata, export_user: undefined } as any;
      const html = generatePlaywrightFooterTemplate(validTenantConfig, metadata);

      expect(html).toContain('Generated:');
      expect(html).not.toContain('by');
    });

    it('should use custom confidential text', () => {
      const config = {
        ...validTenantConfig,
        confidential_mark: true,
        confidential_text: 'INTERNAL ONLY',
      };
      const html = generatePlaywrightFooterTemplate(config, sampleMetadata);

      expect(html).toContain('INTERNAL ONLY');
      expect(html).not.toContain('CONFIDENTIAL');
    });
  });

  describe('Integration scenarios', () => {
    it('should create valid config, templates, and size estimate together', () => {
      // 1. Get default config
      const config = getDefaultTenantConfig('tenant-integration', 'Integration Corp');

      // 2. Validate it
      const validation = validateTenantConfig(config);
      expect(validation.valid).toBe(true);

      // 3. Generate templates
      const headerHtml = generatePlaywrightHeaderTemplate(config, sampleMetadata);
      const footerHtml = generatePlaywrightFooterTemplate(config, sampleMetadata);

      expect(headerHtml).toBeTruthy();
      expect(footerHtml).toBeTruthy();

      // 4. Estimate size
      const estimated = estimateWatermarkedSize(1000000, false, false);
      expect(estimated).toBeGreaterThan(1000000);
    });

    it('should handle enterprise scenario with all features', () => {
      const enterpriseConfig: TenantWatermarkConfig = {
        tenant_id: 'enterprise-001',
        company_name: 'Enterprise Solutions Inc',
        logo_url: 'https://cdn.example.com/enterprise-logo.png',
        logo_position: 'both',
        primary_color: '#1e40af',
        confidential_mark: true,
        confidential_text: 'CONFIDENTIAL - DO NOT DISTRIBUTE',
        include_export_metadata: true,
        custom_footer_text: 'Enterprise Solutions Inc - All Rights Reserved',
        page_numbering: true,
      };

      const validation = validateTenantConfig(enterpriseConfig);
      expect(validation.valid).toBe(true);

      const headerHtml = generatePlaywrightHeaderTemplate(enterpriseConfig, sampleMetadata);
      const footerHtml = generatePlaywrightFooterTemplate(enterpriseConfig, sampleMetadata);

      expect(headerHtml).toContain('Enterprise Solutions Inc');
      expect(headerHtml).toContain('#1e40af');
      expect(footerHtml).toContain('CONFIDENTIAL - DO NOT DISTRIBUTE');
      expect(footerHtml).toContain('All Rights Reserved');

      const estimated = estimateWatermarkedSize(5000000, true, true);
      expect(estimated).toBe(5200000); // 4% overhead on 5MB
    });
  });
});
