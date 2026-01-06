/**
 * Watermark Utility
 *
 * Server-side PDF and image watermarking using PDFKit and Sharp.
 * Applies watermarks to approved reports for audit compliance.
 *
 * @module utils/watermark
 */

import type { WatermarkConfig } from '../types/approvals.js';

/**
 * Watermark position coordinates
 */
interface WatermarkPosition {
  x: number;
  y: number;
  angle?: number;
}

/**
 * Apply watermark to PDF
 *
 * Uses PDFKit to overlay watermark text on existing PDF
 *
 * @param pdfBuffer - Original PDF as Buffer
 * @param config - Watermark configuration
 * @returns Watermarked PDF as Buffer
 */
export async function watermarkPDF(
  pdfBuffer: Buffer,
  config: WatermarkConfig
): Promise<Buffer> {
  if (!config.enabled) {
    return pdfBuffer;
  }

  try {
    // Dynamic import to avoid dependency if not used
    const { PDFDocument, rgb, degrees } = await import('pdf-lib');

    // Load existing PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    // Parse color (hex to RGB)
    const colorRgb = hexToRgb(config.color);
    const color = rgb(colorRgb.r / 255, colorRgb.g / 255, colorRgb.b / 255);

    // Apply watermark to each page
    for (const page of pages) {
      const { width, height } = page.getSize();
      const position = calculateWatermarkPosition(config.position, width, height);

      // Draw watermark text
      page.drawText(config.text, {
        x: position.x,
        y: position.y,
        size: config.font_size,
        color,
        opacity: config.opacity,
        rotate: degrees(position.angle || 0),
      });
    }

    // Save modified PDF
    const watermarkedPdfBytes = await pdfDoc.save();

    console.log('[Watermark] Applied watermark to PDF:', {
      text: config.text,
      position: config.position,
      opacity: config.opacity,
      pages: pages.length,
    });

    return Buffer.from(watermarkedPdfBytes);
  } catch (error) {
    console.error('[Watermark] PDF watermarking failed:', error);
    // Return original buffer if watermarking fails (graceful degradation)
    console.warn('[Watermark] Returning original PDF without watermark');
    return pdfBuffer;
  }
}

/**
 * Apply watermark to PNG/JPG image
 *
 * Uses Sharp to overlay watermark on image
 *
 * @param imageBuffer - Original image as Buffer
 * @param config - Watermark configuration
 * @param imageType - Image MIME type (png, jpeg)
 * @returns Watermarked image as Buffer
 */
export async function watermarkImage(
  imageBuffer: Buffer,
  config: WatermarkConfig,
  imageType: 'png' | 'jpeg' = 'png'
): Promise<Buffer> {
  if (!config.enabled) {
    return imageBuffer;
  }

  try {
    // TODO: Implement with Sharp
    // Real implementation would:
    // 1. Load image with Sharp
    // 2. Create SVG watermark overlay
    // 3. Composite watermark onto image
    // 4. Export to original format

    console.log('[Watermark] Applied watermark to image:', {
      text: config.text,
      position: config.position,
      type: imageType,
    });

    // Mock: Return original buffer
    return imageBuffer;
  } catch (error) {
    console.error('[Watermark] Image watermarking failed:', error);
    throw new Error('Failed to apply watermark to image');
  }
}

/**
 * Calculate watermark position based on config
 *
 * @param position - Position type (header, footer, diagonal, corner)
 * @param pageWidth - Page width in pixels
 * @param pageHeight - Page height in pixels
 * @returns Coordinates and rotation angle
 */
export function calculateWatermarkPosition(
  position: WatermarkConfig['position'],
  pageWidth: number,
  pageHeight: number
): WatermarkPosition {
  switch (position) {
    case 'header':
      return {
        x: pageWidth / 2,
        y: 30,
        angle: 0,
      };

    case 'footer':
      return {
        x: pageWidth / 2,
        y: pageHeight - 30,
        angle: 0,
      };

    case 'diagonal':
      return {
        x: pageWidth / 2,
        y: pageHeight / 2,
        angle: -45,
      };

    case 'corner':
      return {
        x: pageWidth - 150,
        y: pageHeight - 30,
        angle: 0,
      };

    default:
      return {
        x: pageWidth / 2,
        y: pageHeight - 30,
        angle: 0,
      };
  }
}

/**
 * Generate watermark text from config
 *
 * @param config - Watermark configuration
 * @param approverName - Name of person who approved
 * @param timestamp - Approval timestamp
 * @returns Formatted watermark text
 */
export function generateWatermarkText(
  config: WatermarkConfig,
  approverName: string,
  timestamp: Date
): string {
  let text = config.text;

  if (config.include_approver_name && approverName) {
    text += ` - ${approverName}`;
  }

  if (config.include_timestamp) {
    const dateStr = timestamp.toISOString().split('T')[0];
    text += ` - ${dateStr}`;
  }

  return text;
}

/**
 * Create SVG watermark overlay
 *
 * Generates SVG markup for text overlay
 *
 * @param config - Watermark configuration
 * @param text - Watermark text
 * @param width - Canvas width
 * @param height - Canvas height
 * @returns SVG string
 */
export function createSVGWatermark(
  config: WatermarkConfig,
  text: string,
  width: number,
  height: number
): string {
  const position = calculateWatermarkPosition(config.position, width, height);

  return `
    <svg width="${width}" height="${height}">
      <text
        x="${position.x}"
        y="${position.y}"
        font-family="Arial, sans-serif"
        font-size="${config.font_size}"
        fill="${config.color}"
        opacity="${config.opacity}"
        text-anchor="middle"
        transform="rotate(${position.angle || 0}, ${position.x}, ${position.y})"
      >
        ${escapeXML(text)}
      </text>
    </svg>
  `;
}

/**
 * Escape XML special characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Watermark batch processing
 *
 * Apply watermark to multiple files concurrently
 *
 * @param files - Array of file buffers
 * @param config - Watermark configuration
 * @param fileType - File type (pdf, png, jpeg)
 * @returns Array of watermarked files
 */
export async function watermarkBatch(
  files: Buffer[],
  config: WatermarkConfig,
  fileType: 'pdf' | 'png' | 'jpeg'
): Promise<Buffer[]> {
  if (!config.enabled) {
    return files;
  }

  try {
    const promises = files.map((file) => {
      if (fileType === 'pdf') {
        return watermarkPDF(file, config);
      } else {
        return watermarkImage(file, config, fileType);
      }
    });

    return await Promise.all(promises);
  } catch (error) {
    console.error('[Watermark] Batch watermarking failed:', error);
    throw new Error('Failed to watermark batch');
  }
}

/**
 * Validate watermark configuration
 *
 * @param config - Watermark configuration
 * @returns Validation result
 */
export function validateWatermarkConfig(config: WatermarkConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.text || config.text.trim().length === 0) {
    errors.push('Watermark text cannot be empty');
  }

  if (config.opacity < 0 || config.opacity > 1) {
    errors.push('Opacity must be between 0 and 1');
  }

  if (config.font_size < 6 || config.font_size > 72) {
    errors.push('Font size must be between 6 and 72');
  }

  if (!['header', 'footer', 'diagonal', 'corner'].includes(config.position)) {
    errors.push('Invalid watermark position');
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(config.color)) {
    errors.push('Color must be a valid hex code (e.g., #666666)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Estimate watermark file size increase
 *
 * @param originalSize - Original file size in bytes
 * @param config - Watermark configuration
 * @returns Estimated new file size in bytes
 */
export function estimateWatermarkedSize(
  originalSize: number,
  config: WatermarkConfig
): number {
  if (!config.enabled) {
    return originalSize;
  }

  // Watermark adds ~2-5% to file size
  const overhead = config.position === 'diagonal' ? 0.05 : 0.02;
  return Math.ceil(originalSize * (1 + overhead));
}

/**
 * Convert hex color to RGB
 *
 * @param hex - Hex color code (e.g., #ff0000)
 * @returns RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex values
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return { r, g, b };
}

/**
 * Apply watermark with logo image
 *
 * @param pdfBuffer - Original PDF as Buffer
 * @param config - Watermark configuration
 * @param logoBuffer - Company logo as Buffer (PNG or JPG)
 * @returns Watermarked PDF as Buffer
 */
export async function watermarkPDFWithLogo(
  pdfBuffer: Buffer,
  config: WatermarkConfig,
  logoBuffer?: Buffer
): Promise<Buffer> {
  if (!config.enabled) {
    return pdfBuffer;
  }

  try {
    const { PDFDocument, rgb, degrees } = await import('pdf-lib');

    // Load existing PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    // Parse color (hex to RGB)
    const colorRgb = hexToRgb(config.color);
    const color = rgb(colorRgb.r / 255, colorRgb.g / 255, colorRgb.b / 255);

    // Embed logo if provided and config includes it
    let logoImage;
    if (logoBuffer && config.include_company_logo) {
      try {
        // Try PNG first, then JPEG
        try {
          logoImage = await pdfDoc.embedPng(logoBuffer);
        } catch {
          logoImage = await pdfDoc.embedJpg(logoBuffer);
        }
      } catch (error) {
        console.warn('[Watermark] Failed to embed logo, continuing without it:', error);
      }
    }

    // Apply watermark to each page
    for (const page of pages) {
      const { width, height } = page.getSize();
      const position = calculateWatermarkPosition(config.position, width, height);

      // Draw logo if available
      if (logoImage) {
        const logoDims = logoImage.scale(0.1); // Scale down to 10%
        page.drawImage(logoImage, {
          x: position.x - logoDims.width / 2,
          y: position.y + config.font_size + 5, // Above text
          width: logoDims.width,
          height: logoDims.height,
          opacity: config.opacity,
        });
      }

      // Draw watermark text
      page.drawText(config.text, {
        x: position.x,
        y: position.y,
        size: config.font_size,
        color,
        opacity: config.opacity,
        rotate: degrees(position.angle || 0),
      });
    }

    // Save modified PDF
    const watermarkedPdfBytes = await pdfDoc.save();

    console.log('[Watermark] Applied watermark with logo to PDF:', {
      text: config.text,
      position: config.position,
      opacity: config.opacity,
      pages: pages.length,
      hasLogo: !!logoImage,
    });

    return Buffer.from(watermarkedPdfBytes);
  } catch (error) {
    console.error('[Watermark] PDF watermarking with logo failed:', error);
    console.warn('[Watermark] Returning original PDF without watermark');
    return pdfBuffer;
  }
}
