/**
 * PDF Renderer Service
 *
 * Server-side PDF generation for CSR reports using Playwright
 * Supports company branding, charts, citations, and professional layouts
 *
 * @module pdfRenderer
 */
import type { GeneratedReport, PDFExportOptions } from '../types';
interface PDFRenderResult {
    buffer: Buffer;
    metadata: {
        pageCount: number;
        fileSize: number;
        renderTime: number;
    };
}
/**
 * Main PDF rendering function
 * Converts a GeneratedReport to a professionally formatted PDF
 */
export declare function renderReportToPDF(report: GeneratedReport, options?: PDFExportOptions): Promise<PDFRenderResult>;
/**
 * Get cached PDF or render new one
 */
export declare function getCachedOrRenderPDF(reportId: string, report: GeneratedReport, options?: PDFExportOptions): Promise<PDFRenderResult>;
/**
 * Clear PDF cache (for testing or manual cleanup)
 */
export declare function clearPDFCache(): void;
/**
 * Get cache statistics
 */
export declare function getPDFCacheStats(): {
    entries: number;
    totalSizeMB: string;
    maxSizeMB: number;
    ttl: number;
};
export {};
//# sourceMappingURL=pdfRenderer.d.ts.map