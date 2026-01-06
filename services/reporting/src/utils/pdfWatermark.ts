/**
 * PDF Watermarking Utilities
 *
 * Comprehensive PDF watermarking for reporting service with:
 * - Logo overlays (tenant branding)
 * - Text watermarks (CONFIDENTIAL, etc.)
 * - Headers/footers with metadata
 * - Page numbering
 * - Tenant-specific customization
 *
 * Supports both:
 * 1. Post-processing existing PDFs (pdf-lib)
 * 2. Generation-time watermarks (Playwright/Puppeteer)
 *
 * @module utils/pdfWatermark
 */

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, degrees } from 'pdf-lib';
import type { WatermarkConfig } from '../types/approvals.js';

/**
 * Tenant-specific watermark configuration
 */
export interface TenantWatermarkConfig {
  tenant_id: string;
  company_name: string;
  logo_url?: string;
  logo_position: 'header' | 'footer' | 'both';
  primary_color: string; // hex color
  confidential_mark: boolean;
  confidential_text?: string;
  include_export_metadata: boolean;
  custom_footer_text?: string;
  page_numbering: boolean;
}

/**
 * Watermark metadata to embed in PDF
 */
export interface WatermarkMetadata {
  company_name: string;
  export_date: Date;
  export_user: string;
  export_user_email?: string;
  report_title?: string;
  report_period?: string;
}

/**
 * Watermark options for addLogoWatermark
 */
export interface LogoWatermarkOptions {
  position: 'header' | 'footer' | 'both';
  alignment: 'left' | 'center' | 'right';
  width?: number; // in points
  height?: number; // in points
  opacity?: number; // 0.0 - 1.0
  margin?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
}

/**
 * Watermark options for addTextWatermark
 */
export interface TextWatermarkOptions {
  position: 'diagonal' | 'header' | 'footer' | 'center';
  fontSize?: number;
  color?: string; // hex color
  opacity?: number; // 0.0 - 1.0
  rotation?: number; // degrees
  allPages?: boolean;
}

/**
 * Header/Footer options
 */
export interface HeaderFooterOptions {
  includeHeader?: boolean;
  includeFooter?: boolean;
  headerText?: string;
  footerText?: string;
  fontSize?: number;
  color?: string; // hex color
  includePageNumbers?: boolean;
  includeLogo?: boolean;
  logoUrl?: string;
}

/**
 * Add logo watermark to PDF
 *
 * Overlays tenant logo in header/footer of all pages
 *
 * @param pdfBuffer - Original PDF as Buffer
 * @param logoUrl - URL or base64-encoded logo image
 * @param options - Logo watermark options
 * @returns Watermarked PDF as Buffer
 */
export async function addLogoWatermark(
  pdfBuffer: Buffer,
  logoUrl: string,
  options: LogoWatermarkOptions
): Promise<Buffer> {
  try {
    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    // Fetch and embed logo image
    let logoImage;
    try {
      if (logoUrl.startsWith('data:image/png')) {
        // Base64 PNG
        const base64Data = logoUrl.split(',')[1];
        const imageBytes = Buffer.from(base64Data, 'base64');
        logoImage = await pdfDoc.embedPng(imageBytes);
      } else if (logoUrl.startsWith('data:image/jpeg') || logoUrl.startsWith('data:image/jpg')) {
        // Base64 JPEG
        const base64Data = logoUrl.split(',')[1];
        const imageBytes = Buffer.from(base64Data, 'base64');
        logoImage = await pdfDoc.embedJpg(imageBytes);
      } else if (logoUrl.startsWith('http')) {
        // Fetch from URL
        const response = await fetch(logoUrl);
        const imageBytes = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('png')) {
          logoImage = await pdfDoc.embedPng(imageBytes);
        } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
          logoImage = await pdfDoc.embedJpg(imageBytes);
        } else {
          throw new Error(`Unsupported image type: ${contentType}`);
        }
      } else {
        throw new Error('Logo URL must be base64 data URI or HTTP(S) URL');
      }
    } catch (error) {
      console.warn('[Watermark] Failed to load logo, skipping:', error);
      // Return original PDF if logo fails
      return Buffer.from(await pdfDoc.save());
    }

    // Calculate logo dimensions
    const logoDims = logoImage.scale(1);
    const targetWidth = options.width || 80;
    const targetHeight = options.height || (logoDims.height * (targetWidth / logoDims.width));

    // Default margins
    const margin = {
      top: options.margin?.top || 10,
      bottom: options.margin?.bottom || 10,
      left: options.margin?.left || 15,
      right: options.margin?.right || 15,
    };

    // Add logo to each page
    for (const page of pages) {
      const { width, height } = page.getSize();

      // Calculate X position based on alignment
      let x: number;
      switch (options.alignment) {
        case 'left':
          x = margin.left;
          break;
        case 'center':
          x = (width - targetWidth) / 2;
          break;
        case 'right':
          x = width - targetWidth - margin.right;
          break;
        default:
          x = margin.left;
      }

      // Draw logo in header
      if (options.position === 'header' || options.position === 'both') {
        const y = height - targetHeight - margin.top;
        page.drawImage(logoImage, {
          x,
          y,
          width: targetWidth,
          height: targetHeight,
          opacity: options.opacity || 1.0,
        });
      }

      // Draw logo in footer
      if (options.position === 'footer' || options.position === 'both') {
        const y = margin.bottom;
        page.drawImage(logoImage, {
          x,
          y,
          width: targetWidth,
          height: targetHeight,
          opacity: options.opacity || 1.0,
        });
      }
    }

    // Save and return
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('[Watermark] Logo watermarking failed:', error);
    throw new Error(`Failed to apply logo watermark: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Add text watermark to PDF
 *
 * Adds text overlay (e.g., "CONFIDENTIAL") to PDF pages
 *
 * @param pdfBuffer - Original PDF as Buffer
 * @param text - Watermark text
 * @param options - Text watermark options
 * @returns Watermarked PDF as Buffer
 */
export async function addTextWatermark(
  pdfBuffer: Buffer,
  text: string,
  options: TextWatermarkOptions
): Promise<Buffer> {
  try {
    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    // Embed font
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Parse color
    const color = parseHexColor(options.color || '#666666');

    // Determine which pages to watermark
    const pagesToWatermark = options.allPages !== false ? pages : [pages[0]];

    for (const page of pagesToWatermark) {
      const { width, height } = page.getSize();
      const fontSize = options.fontSize || 48;

      let x: number, y: number, rotation: number;

      switch (options.position) {
        case 'diagonal':
          // Center of page, rotated -45 degrees
          x = width / 2;
          y = height / 2;
          rotation = options.rotation || -45;
          break;

        case 'header':
          // Top center
          x = width / 2;
          y = height - 30;
          rotation = options.rotation || 0;
          break;

        case 'footer':
          // Bottom center
          x = width / 2;
          y = 30;
          rotation = options.rotation || 0;
          break;

        case 'center':
          // Center, no rotation
          x = width / 2;
          y = height / 2;
          rotation = options.rotation || 0;
          break;

        default:
          x = width / 2;
          y = height / 2;
          rotation = options.rotation || -45;
      }

      // Draw text
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity: options.opacity || 0.3,
        rotate: rotation !== 0 ? degrees(rotation) : undefined,
      });
    }

    // Save and return
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('[Watermark] Text watermarking failed:', error);
    throw new Error(`Failed to apply text watermark: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Add header and footer to PDF
 *
 * Adds consistent headers/footers with metadata and page numbers
 *
 * @param pdfBuffer - Original PDF as Buffer
 * @param metadata - Watermark metadata
 * @param options - Header/footer options
 * @returns PDF with headers/footers as Buffer
 */
export async function addHeaderFooter(
  pdfBuffer: Buffer,
  metadata: WatermarkMetadata,
  options: HeaderFooterOptions = {}
): Promise<Buffer> {
  try {
    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    // Embed font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Parse color
    const color = parseHexColor(options.color || '#666666');
    const fontSize = options.fontSize || 9;

    // Total pages for page numbering
    const totalPages = pages.length;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();

      // Header
      if (options.includeHeader !== false) {
        const headerText = options.headerText || metadata.company_name;
        const headerY = height - 15;

        page.drawText(headerText, {
          x: 15,
          y: headerY,
          size: fontSize,
          font: boldFont,
          color: rgb(color.r, color.g, color.b),
        });

        // Optional report title on right
        if (metadata.report_title) {
          const titleWidth = font.widthOfTextAtSize(metadata.report_title, fontSize);
          page.drawText(metadata.report_title, {
            x: width - titleWidth - 15,
            y: headerY,
            size: fontSize,
            font,
            color: rgb(color.r, color.g, color.b),
          });
        }
      }

      // Footer
      if (options.includeFooter !== false) {
        const footerY = 15;

        // Left: Export metadata
        if (metadata.export_date) {
          const dateStr = formatDate(metadata.export_date);
          const exportText = `Generated: ${dateStr}`;
          page.drawText(exportText, {
            x: 15,
            y: footerY,
            size: fontSize - 1,
            font,
            color: rgb(color.r, color.g, color.b),
          });
        }

        // Center: Custom footer text
        if (options.footerText) {
          const footerTextWidth = font.widthOfTextAtSize(options.footerText, fontSize - 1);
          page.drawText(options.footerText, {
            x: (width - footerTextWidth) / 2,
            y: footerY,
            size: fontSize - 1,
            font,
            color: rgb(color.r, color.g, color.b),
          });
        }

        // Right: Page numbers
        if (options.includePageNumbers !== false) {
          const pageText = `Page ${i + 1} of ${totalPages}`;
          const pageTextWidth = font.widthOfTextAtSize(pageText, fontSize - 1);
          page.drawText(pageText, {
            x: width - pageTextWidth - 15,
            y: footerY,
            size: fontSize - 1,
            font,
            color: rgb(color.r, color.g, color.b),
          });
        }
      }
    }

    // Save and return
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('[Watermark] Header/footer addition failed:', error);
    throw new Error(`Failed to add header/footer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Add page numbers to PDF
 *
 * Simple page numbering utility
 *
 * @param pdfBuffer - Original PDF as Buffer
 * @param position - Position of page numbers
 * @param format - Format string (e.g., "Page {page} of {total}")
 * @returns PDF with page numbers as Buffer
 */
export async function addPageNumbers(
  pdfBuffer: Buffer,
  position: 'bottom-left' | 'bottom-center' | 'bottom-right' = 'bottom-right',
  format: string = 'Page {page} of {total}'
): Promise<Buffer> {
  try {
    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const fontSize = 9;
    const margin = 15;
    const totalPages = pages.length;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width } = page.getSize();

      const pageText = format
        .replace('{page}', String(i + 1))
        .replace('{total}', String(totalPages));

      const textWidth = font.widthOfTextAtSize(pageText, fontSize);

      let x: number;
      switch (position) {
        case 'bottom-left':
          x = margin;
          break;
        case 'bottom-center':
          x = (width - textWidth) / 2;
          break;
        case 'bottom-right':
          x = width - textWidth - margin;
          break;
        default:
          x = width - textWidth - margin;
      }

      page.drawText(pageText, {
        x,
        y: margin,
        size: fontSize,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    // Save and return
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('[Watermark] Page numbering failed:', error);
    throw new Error(`Failed to add page numbers: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Apply comprehensive watermarking (all features)
 *
 * One-stop function to apply logo, text, headers/footers, and page numbers
 *
 * @param pdfBuffer - Original PDF as Buffer
 * @param tenantConfig - Tenant watermark configuration
 * @param metadata - Watermark metadata
 * @returns Fully watermarked PDF as Buffer
 */
export async function applyComprehensiveWatermark(
  pdfBuffer: Buffer,
  tenantConfig: TenantWatermarkConfig,
  metadata: WatermarkMetadata
): Promise<Buffer> {
  try {
    let currentPdf = pdfBuffer;

    // Step 1: Add logo watermark (if configured)
    if (tenantConfig.logo_url) {
      currentPdf = await addLogoWatermark(currentPdf, tenantConfig.logo_url, {
        position: tenantConfig.logo_position,
        alignment: 'left',
        width: 60,
        opacity: 0.9,
        margin: { top: 12, bottom: 12, left: 15, right: 15 },
      });
    }

    // Step 2: Add confidential text watermark (if configured)
    if (tenantConfig.confidential_mark) {
      const confidentialText = tenantConfig.confidential_text || 'CONFIDENTIAL';
      currentPdf = await addTextWatermark(currentPdf, confidentialText, {
        position: 'diagonal',
        fontSize: 60,
        color: '#999999',
        opacity: 0.15,
        rotation: -45,
        allPages: true,
      });
    }

    // Step 3: Add headers and footers with metadata
    if (tenantConfig.include_export_metadata) {
      currentPdf = await addHeaderFooter(currentPdf, metadata, {
        includeHeader: true,
        includeFooter: true,
        headerText: tenantConfig.company_name,
        footerText: tenantConfig.custom_footer_text || 'TEEI CSR Platform',
        includePageNumbers: tenantConfig.page_numbering,
        color: tenantConfig.primary_color,
      });
    } else if (tenantConfig.page_numbering) {
      // Just add page numbers if metadata not included
      currentPdf = await addPageNumbers(currentPdf, 'bottom-right');
    }

    return currentPdf;
  } catch (error) {
    console.error('[Watermark] Comprehensive watermarking failed:', error);
    throw new Error(`Failed to apply comprehensive watermark: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate Playwright-compatible header template
 *
 * For use during PDF generation (not post-processing)
 *
 * @param tenantConfig - Tenant watermark configuration
 * @param metadata - Watermark metadata
 * @returns HTML string for Playwright headerTemplate
 */
export function generatePlaywrightHeaderTemplate(
  tenantConfig: TenantWatermarkConfig,
  metadata: WatermarkMetadata
): string {
  const logoHtml = tenantConfig.logo_url
    ? `<img src="${tenantConfig.logo_url}" style="height: 30px; margin-right: 10px;" />`
    : '';

  const primaryColor = tenantConfig.primary_color || '#6366f1';

  return `
    <div style="width: 100%; padding: 8px 15mm; font-size: 9px; color: #666; border-bottom: 2px solid ${primaryColor}; display: flex; align-items: center;">
      ${logoHtml}
      <span style="flex: 1;">${tenantConfig.company_name}</span>
      ${metadata.report_title ? `<span style="margin-right: 10px;">${metadata.report_title}</span>` : ''}
    </div>
  `;
}

/**
 * Generate Playwright-compatible footer template
 *
 * For use during PDF generation (not post-processing)
 *
 * @param tenantConfig - Tenant watermark configuration
 * @param metadata - Watermark metadata
 * @returns HTML string for Playwright footerTemplate
 */
export function generatePlaywrightFooterTemplate(
  tenantConfig: TenantWatermarkConfig,
  metadata: WatermarkMetadata
): string {
  const generatedDate = formatDate(metadata.export_date);
  const footerText = tenantConfig.custom_footer_text || 'TEEI CSR Platform';

  const confidentialHtml = tenantConfig.confidential_mark
    ? `<div style="position: absolute; left: 50%; top: -100px; transform: translateX(-50%) rotate(-45deg); font-size: 60px; color: rgba(0,0,0,0.08); font-weight: bold; text-transform: uppercase; pointer-events: none;">${tenantConfig.confidential_text || 'CONFIDENTIAL'}</div>`
    : '';

  return `
    <div style="width: 100%; padding: 8px 15mm; font-size: 8px; color: #999; border-top: 1px solid #e5e7eb; position: relative;">
      ${confidentialHtml}
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>Generated: ${generatedDate}${metadata.export_user ? ` by ${metadata.export_user}` : ''}</span>
        ${tenantConfig.page_numbering ? '<span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>' : ''}
        <span>${footerText}</span>
      </div>
    </div>
  `;
}

/**
 * Validate tenant watermark configuration
 *
 * @param config - Tenant watermark configuration
 * @returns Validation result
 */
export function validateTenantConfig(config: TenantWatermarkConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.tenant_id || config.tenant_id.trim().length === 0) {
    errors.push('Tenant ID is required');
  }

  if (!config.company_name || config.company_name.trim().length === 0) {
    errors.push('Company name is required');
  }

  if (config.logo_url && !isValidImageUrl(config.logo_url)) {
    errors.push('Logo URL must be a valid HTTP(S) URL or base64 data URI');
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(config.primary_color)) {
    errors.push('Primary color must be a valid hex code (e.g., #6366f1)');
  }

  if (!['header', 'footer', 'both'].includes(config.logo_position)) {
    errors.push('Logo position must be header, footer, or both');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse hex color to RGB values (0-1 range)
 */
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return { r, g, b };
}

/**
 * Format date for footer
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Validate image URL
 */
function isValidImageUrl(url: string): boolean {
  if (url.startsWith('data:image/')) {
    return url.includes('base64');
  }
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Get default tenant configuration
 *
 * @param tenant_id - Tenant ID
 * @param company_name - Company name
 * @returns Default tenant watermark configuration
 */
export function getDefaultTenantConfig(
  tenant_id: string,
  company_name: string
): TenantWatermarkConfig {
  return {
    tenant_id,
    company_name,
    logo_position: 'header',
    primary_color: '#6366f1',
    confidential_mark: false,
    include_export_metadata: true,
    page_numbering: true,
  };
}

/**
 * Estimate file size increase from watermarking
 *
 * @param originalSize - Original PDF size in bytes
 * @param hasLogo - Whether logo watermark is applied
 * @param hasText - Whether text watermark is applied
 * @returns Estimated new size in bytes
 */
export function estimateWatermarkedSize(
  originalSize: number,
  hasLogo: boolean,
  hasText: boolean
): number {
  let overhead = 0.01; // Base 1% overhead for headers/footers

  if (hasLogo) {
    overhead += 0.02; // Additional 2% for logo
  }

  if (hasText) {
    overhead += 0.01; // Additional 1% for text watermark
  }

  return Math.ceil(originalSize * (1 + overhead));
}
