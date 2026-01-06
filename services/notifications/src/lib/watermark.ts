/**
 * PDF watermarking utility
 * Adds watermarks to PDF documents for audit trail
 */

export interface WatermarkOptions {
  text: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number; // 0-1
  fontSize?: number;
  color?: string; // hex color
  rotation?: number; // degrees
}

/**
 * Watermark PDF content
 *
 * NOTE: This is a mock implementation. In production, use:
 * - pdf-lib for client-side watermarking
 * - Puppeteer/Playwright for server-side rendering
 * - PDFKit for programmatic PDF generation
 *
 * @param pdfBase64 - Base64 encoded PDF
 * @param options - Watermark configuration
 * @returns Base64 encoded watermarked PDF
 */
export async function watermarkPDF(
  pdfBase64: string,
  options: WatermarkOptions
): Promise<string> {
  const {
    text,
    position = 'bottom-right',
    opacity = 0.3,
    fontSize = 10,
    color = '#666666',
    rotation = 0,
  } = options;

  // Mock implementation - in production, use pdf-lib or similar
  // For now, we'll just return the original PDF with metadata
  // indicating it should be watermarked

  // In a real implementation:
  // 1. Decode base64 to buffer
  // 2. Load PDF with pdf-lib
  // 3. Add watermark text/image to each page
  // 4. Save and encode back to base64

  console.log('Watermarking PDF', {
    text,
    position,
    opacity,
    fontSize,
    color,
    rotation,
  });

  // Return original for now
  // TODO: Implement actual watermarking with pdf-lib
  return pdfBase64;
}

/**
 * Generate watermark text for board packs
 */
export function generateBoardPackWatermark(options: {
  companyId: string;
  generatedAt: Date;
  approvedBy?: string;
  version?: number;
  lineageId?: string;
}): string {
  const parts: string[] = [];

  parts.push(`Company: ${options.companyId}`);
  parts.push(`Generated: ${options.generatedAt.toISOString()}`);

  if (options.approvedBy) {
    parts.push(`Approved by: ${options.approvedBy}`);
  }

  if (options.version) {
    parts.push(`Version: ${options.version}`);
  }

  if (options.lineageId) {
    parts.push(`Lineage ID: ${options.lineageId.substring(0, 8)}`);
  }

  return parts.join(' | ');
}

/**
 * Watermark configuration presets
 */
export const WATERMARK_PRESETS = {
  AUDIT_TRAIL: {
    position: 'bottom-right' as const,
    opacity: 0.3,
    fontSize: 8,
    color: '#666666',
    rotation: 0,
  },
  CONFIDENTIAL: {
    position: 'center' as const,
    opacity: 0.1,
    fontSize: 48,
    color: '#FF0000',
    rotation: -45,
  },
  DRAFT: {
    position: 'top-right' as const,
    opacity: 0.5,
    fontSize: 24,
    color: '#FFA500',
    rotation: 0,
  },
  APPROVED: {
    position: 'bottom-right' as const,
    opacity: 0.4,
    fontSize: 10,
    color: '#00AA00',
    rotation: 0,
  },
} as const;
