/**
 * Report Generation UI Types
 * TypeScript interfaces for the report generation UI components
 * Aligned with backend GenerateReportResponse from @teei/shared-types
 */

export type ReportType = 'quarterly' | 'annual' | 'board_presentation' | 'csrd';
export type ReportTone = 'professional' | 'inspiring' | 'technical';
export type ReportLength = 'brief' | 'standard' | 'detailed';
export type ExportFormat = 'pdf' | 'docx' | 'markdown' | 'plain_text';
export type ReportStatus = 'draft' | 'final';

export interface GenerateReportRequest {
  reportType: ReportType;
  period: {
    from: string; // ISO date
    to: string;   // ISO date
  };
  filters?: {
    programs?: string[];
    outcomes?: string[];
  };
  options?: {
    deterministic?: boolean;
    seed?: number;
    tone?: ReportTone;
    length?: ReportLength;
    includeCharts?: boolean;
  };
}

export interface ReportSection {
  title: string;
  content: string; // Markdown with [citation:ID] markers
  order: number;
}

export interface Citation {
  id: string;
  evidenceId: string;
  snippetText: string;
  source: string;
  confidence: number; // 0-1
}

export interface ReportMetadata {
  model: string;
  promptVersion: string;
  tokensUsed: number;
  seed?: number;
  generatedAt: string; // ISO datetime
}

export interface GeneratedReport {
  reportId: string;
  reportType: ReportType;
  status: ReportStatus;
  sections: ReportSection[];
  citations: Citation[];
  metadata: ReportMetadata;
  period: {
    from: string;
    to: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ReportListItem {
  reportId: string;
  reportType: ReportType;
  status: ReportStatus;
  period: {
    from: string;
    to: string;
  };
  generatedAt: string;
  tokensUsed: number;
}

export interface ExportOptions {
  format: ExportFormat;
  includeCharts: boolean;
  includeCitations: boolean;
  watermark: boolean; // For draft reports
}

// Editor state
export interface EditorState {
  content: string;
  isDirty: boolean;
  lastSaved?: string;
  wordCount: number;
}

// API responses
export interface GenerateReportResponse {
  success: boolean;
  report?: GeneratedReport;
  error?: string;
}

export interface ExportReportResponse {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}
