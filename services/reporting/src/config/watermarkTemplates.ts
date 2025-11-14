/**
 * Watermark Templates Configuration
 *
 * Pre-defined watermark templates for different tenant types and use cases
 *
 * @module config/watermarkTemplates
 */

import type { TenantWatermarkConfig } from '../utils/pdfWatermark.js';

/**
 * Watermark template types
 */
export type WatermarkTemplateType =
  | 'minimal' // Basic header/footer, no watermarks
  | 'standard' // Logo + page numbers
  | 'confidential' // Standard + CONFIDENTIAL watermark
  | 'enterprise' // Full features with branding
  | 'compliance' // Maximum traceability for regulatory compliance
  | 'public' // No confidential marks, suitable for external distribution
  | 'internal'; // Internal use only marking

/**
 * Watermark template definitions
 */
export const WATERMARK_TEMPLATES: Record<
  WatermarkTemplateType,
  Omit<TenantWatermarkConfig, 'tenant_id' | 'company_name' | 'logo_url'>
> = {
  /**
   * Minimal template
   * - No logo
   * - Basic page numbers
   * - No confidential marks
   * - Minimal metadata
   */
  minimal: {
    logo_position: 'header',
    primary_color: '#6366f1',
    confidential_mark: false,
    include_export_metadata: false,
    page_numbering: true,
  },

  /**
   * Standard template
   * - Logo in header
   * - Page numbers
   * - Company name in header
   * - Export metadata in footer
   */
  standard: {
    logo_position: 'header',
    primary_color: '#6366f1',
    confidential_mark: false,
    include_export_metadata: true,
    custom_footer_text: 'TEEI CSR Platform',
    page_numbering: true,
  },

  /**
   * Confidential template
   * - Logo in header
   * - CONFIDENTIAL diagonal watermark
   * - Full metadata
   * - Page numbers
   */
  confidential: {
    logo_position: 'header',
    primary_color: '#dc2626',
    confidential_mark: true,
    confidential_text: 'CONFIDENTIAL',
    include_export_metadata: true,
    custom_footer_text: 'CONFIDENTIAL - Internal Use Only',
    page_numbering: true,
  },

  /**
   * Enterprise template
   * - Logo in both header and footer
   * - Custom branding colors
   * - Full metadata
   * - Optional confidential marking
   */
  enterprise: {
    logo_position: 'both',
    primary_color: '#1e40af',
    confidential_mark: false,
    include_export_metadata: true,
    page_numbering: true,
  },

  /**
   * Compliance template
   * - Maximum traceability
   * - Full export metadata (user, date, etc.)
   * - Audit-ready formatting
   * - Page numbers with "Page X of Y" format
   */
  compliance: {
    logo_position: 'header',
    primary_color: '#059669',
    confidential_mark: false,
    include_export_metadata: true,
    custom_footer_text: 'This report is generated for compliance purposes. Retain for audit trail.',
    page_numbering: true,
  },

  /**
   * Public template
   * - Suitable for external distribution
   * - No confidential marks
   * - Professional appearance
   * - Company branding
   */
  public: {
    logo_position: 'header',
    primary_color: '#6366f1',
    confidential_mark: false,
    include_export_metadata: false,
    page_numbering: true,
  },

  /**
   * Internal template
   * - For internal distribution only
   * - INTERNAL ONLY watermark
   * - Full metadata for tracking
   */
  internal: {
    logo_position: 'header',
    primary_color: '#f59e0b',
    confidential_mark: true,
    confidential_text: 'INTERNAL USE ONLY',
    include_export_metadata: true,
    custom_footer_text: 'For Internal Distribution Only',
    page_numbering: true,
  },
};

/**
 * Get watermark template by type
 *
 * @param templateType - Template type
 * @param tenantId - Tenant ID
 * @param companyName - Company name
 * @param logoUrl - Optional logo URL
 * @returns Complete tenant watermark configuration
 */
export function getWatermarkTemplate(
  templateType: WatermarkTemplateType,
  tenantId: string,
  companyName: string,
  logoUrl?: string
): TenantWatermarkConfig {
  const template = WATERMARK_TEMPLATES[templateType];

  return {
    tenant_id: tenantId,
    company_name: companyName,
    logo_url: logoUrl,
    ...template,
  };
}

/**
 * Customize watermark template
 *
 * Merge template with custom overrides
 *
 * @param templateType - Base template type
 * @param tenantId - Tenant ID
 * @param companyName - Company name
 * @param overrides - Custom overrides
 * @returns Customized tenant watermark configuration
 */
export function customizeWatermarkTemplate(
  templateType: WatermarkTemplateType,
  tenantId: string,
  companyName: string,
  overrides: Partial<TenantWatermarkConfig>
): TenantWatermarkConfig {
  const template = getWatermarkTemplate(templateType, tenantId, companyName);

  return {
    ...template,
    ...overrides,
  };
}

/**
 * Watermark template descriptions for UI
 */
export const WATERMARK_TEMPLATE_DESCRIPTIONS: Record<WatermarkTemplateType, string> = {
  minimal: 'Basic page numbers only, no watermarks or branding',
  standard: 'Company logo, page numbers, and export metadata',
  confidential: 'CONFIDENTIAL watermark with full traceability',
  enterprise: 'Full branding with logo in header and footer',
  compliance: 'Maximum metadata for audit and compliance requirements',
  public: 'Professional appearance suitable for external distribution',
  internal: 'INTERNAL USE ONLY marking for internal reports',
};

/**
 * Get all available templates with descriptions
 *
 * @returns Array of template info
 */
export function getAvailableTemplates(): Array<{
  type: WatermarkTemplateType;
  name: string;
  description: string;
}> {
  return Object.keys(WATERMARK_TEMPLATES).map((type) => ({
    type: type as WatermarkTemplateType,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    description: WATERMARK_TEMPLATE_DESCRIPTIONS[type as WatermarkTemplateType],
  }));
}

/**
 * Validate template type
 *
 * @param templateType - Template type to validate
 * @returns True if valid
 */
export function isValidTemplateType(templateType: string): templateType is WatermarkTemplateType {
  return Object.keys(WATERMARK_TEMPLATES).includes(templateType);
}

/**
 * Example tenant configurations
 *
 * Reference configurations for different scenarios
 */
export const EXAMPLE_TENANT_CONFIGS: Record<string, TenantWatermarkConfig> = {
  /**
   * Startup configuration
   * - Minimal watermarking
   * - Focus on clean, professional appearance
   */
  startup: {
    tenant_id: 'startup-example',
    company_name: 'Startup Inc',
    logo_url: 'https://example.com/startup-logo.png',
    logo_position: 'header',
    primary_color: '#6366f1',
    confidential_mark: false,
    include_export_metadata: true,
    custom_footer_text: 'Startup Inc - Impact Report',
    page_numbering: true,
  },

  /**
   * Enterprise configuration
   * - Full branding
   * - Confidential marking
   * - Maximum metadata
   */
  enterprise: {
    tenant_id: 'enterprise-example',
    company_name: 'Enterprise Solutions Corp',
    logo_url: 'https://example.com/enterprise-logo.png',
    logo_position: 'both',
    primary_color: '#1e40af',
    confidential_mark: true,
    confidential_text: 'CONFIDENTIAL - PROPRIETARY',
    include_export_metadata: true,
    custom_footer_text: 'Enterprise Solutions Corp - All Rights Reserved',
    page_numbering: true,
  },

  /**
   * Non-profit configuration
   * - Public-friendly
   * - No confidential marks
   * - Mission-focused branding
   */
  nonprofit: {
    tenant_id: 'nonprofit-example',
    company_name: 'Community Impact Foundation',
    logo_url: 'https://example.com/nonprofit-logo.png',
    logo_position: 'header',
    primary_color: '#059669',
    confidential_mark: false,
    include_export_metadata: false,
    custom_footer_text: 'Community Impact Foundation - Making a Difference',
    page_numbering: true,
  },

  /**
   * Government/Compliance configuration
   * - Maximum traceability
   * - Audit-ready formatting
   * - Regulatory compliance focus
   */
  government: {
    tenant_id: 'gov-example',
    company_name: 'Government Agency',
    logo_url: 'https://example.com/gov-seal.png',
    logo_position: 'header',
    primary_color: '#1f2937',
    confidential_mark: false,
    include_export_metadata: true,
    custom_footer_text: 'Official Document - Retain for Records',
    page_numbering: true,
  },

  /**
   * Financial services configuration
   * - High security
   * - Confidential marking
   * - Strict traceability
   */
  financial: {
    tenant_id: 'finance-example',
    company_name: 'Financial Services Ltd',
    logo_url: 'https://example.com/finance-logo.png',
    logo_position: 'both',
    primary_color: '#dc2626',
    confidential_mark: true,
    confidential_text: 'CONFIDENTIAL - NOT FOR DISTRIBUTION',
    include_export_metadata: true,
    custom_footer_text: 'Financial Services Ltd - Strictly Confidential',
    page_numbering: true,
  },
};

/**
 * Get example configuration by industry
 *
 * @param industry - Industry type
 * @returns Example tenant configuration
 */
export function getExampleConfigByIndustry(
  industry: 'startup' | 'enterprise' | 'nonprofit' | 'government' | 'financial'
): TenantWatermarkConfig {
  return EXAMPLE_TENANT_CONFIGS[industry];
}
