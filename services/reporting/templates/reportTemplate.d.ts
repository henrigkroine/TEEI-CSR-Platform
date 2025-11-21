/**
 * Report HTML Template Generator
 *
 * Generates professional HTML templates for PDF rendering
 * Supports multiple report types with consistent styling
 *
 * @module reportTemplate
 */
import type { GeneratedReport, PDFExportOptions } from '../types';
interface TemplateOptions extends PDFExportOptions {
    chartImages?: Record<string, string>;
}
/**
 * Generate complete HTML for report PDF
 */
export declare function generateReportHTML(report: GeneratedReport, options?: TemplateOptions): Promise<string>;
export {};
//# sourceMappingURL=reportTemplate.d.ts.map