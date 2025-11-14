/**
 * Shared Types for PDF Export and Report Generation
 *
 * @module types
 */

/**
 * Chart data structure for rendering
 */
export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
  title?: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
      fill?: boolean;
    }>;
  };
}

/**
 * Report section with content and optional charts
 */
export interface ReportSection {
  order: number;
  title: string;
  narrative: string;
  charts?: ChartData[];
  citations?: Array<{
    evidenceId: string;
    snippet: string;
    sourceType: string;
    dateCollected: Date;
    confidence: number;
  }>;
}

/**
 * Generated report structure
 */
export interface GeneratedReport {
  id?: string;
  reportType: string;
  period?: {
    from: Date;
    to: Date;
  };
  metadata?: {
    companyName?: string;
    companyId?: string;
    generatedAt?: Date;
    generatedBy?: string;
    reportTitle?: string;
  };
  sections: ReportSection[];
}

/**
 * Company branding theme
 */
export interface CompanyTheme {
  logo?: string; // Base64 or URL
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
}

/**
 * PDF export options
 */
export interface PDFExportOptions {
  includeCharts?: boolean;
  includeCitations?: boolean;
  includeTableOfContents?: boolean;
  theme?: CompanyTheme;
  watermark?: string;
  chartImages?: Record<string, string>;
  tenantId?: string;
  tenantName?: string;
  headerText?: string;
  footerText?: string;
}

/**
 * Tenant-specific configuration
 */
export interface TenantConfig {
  id: string;
  name: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  watermarkText?: string;
  contactEmail?: string;
  website?: string;
}

/**
 * PDF export request
 */
export interface PDFExportRequest {
  reportId?: string;
  reportConfig?: GeneratedReport;
  options?: PDFExportOptions;
  tenantId: string;
}

/**
 * PDF export response
 */
export interface PDFExportResponse {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  pageCount?: number;
  renderTime?: number;
  error?: string;
}
