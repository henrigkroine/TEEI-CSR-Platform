/**
 * Report Types and Templates
 *
 * Defines report templates, generation options, and output formats
 */

export interface Report {
  id: string;
  company_id: string;
  template_id: string;
  title: string;
  description?: string;
  status: ReportStatus;
  format: ReportFormat;
  parameters: ReportParameters;
  generated_at?: Date;
  generated_by: string;
  file_url?: string;
  file_size?: number;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export type ReportStatus = 'pending' | 'generating' | 'ready' | 'failed';

export type ReportFormat = 'pdf' | 'html' | 'csv' | 'xlsx';

export interface ReportParameters {
  period: string;
  date_range?: {
    start: string;
    end: string;
  };
  sections: string[];
  include_charts: boolean;
  include_evidence: boolean;
  include_lineage: boolean;
  branding?: {
    logo_url?: string;
    primary_color?: string;
    footer_text?: string;
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'executive' | 'detailed' | 'stakeholder' | 'compliance' | 'custom';
  sections: ReportSection[];
  default_parameters: Partial<ReportParameters>;
  thumbnail_url?: string;
  estimated_pages: number;
}

export interface ReportSection {
  id: string;
  name: string;
  description: string;
  required: boolean;
  data_sources: string[];
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'executive-summary',
    name: 'Executive Summary',
    description: 'High-level overview of social impact metrics and SROI for executive stakeholders',
    category: 'executive',
    sections: [
      {
        id: 'cover',
        name: 'Cover Page',
        description: 'Title, period, and company branding',
        required: true,
        data_sources: [],
      },
      {
        id: 'at-a-glance',
        name: 'Impact At-a-Glance',
        description: 'Key metrics summary',
        required: true,
        data_sources: ['at-a-glance'],
      },
      {
        id: 'sroi',
        name: 'SROI Analysis',
        description: 'Social Return on Investment breakdown',
        required: true,
        data_sources: ['sroi'],
      },
      {
        id: 'outcomes',
        name: 'Outcome Highlights',
        description: 'Top outcome achievements',
        required: false,
        data_sources: ['outcomes'],
      },
    ],
    default_parameters: {
      include_charts: true,
      include_evidence: false,
      include_lineage: false,
    },
    estimated_pages: 8,
  },
  {
    id: 'detailed-impact',
    name: 'Detailed Impact Report',
    description: 'Comprehensive analysis with evidence trail and calculation methodology',
    category: 'detailed',
    sections: [
      {
        id: 'cover',
        name: 'Cover Page',
        description: 'Title, period, and company branding',
        required: true,
        data_sources: [],
      },
      {
        id: 'executive-summary',
        name: 'Executive Summary',
        description: '1-page overview',
        required: true,
        data_sources: ['at-a-glance', 'sroi'],
      },
      {
        id: 'methodology',
        name: 'Methodology',
        description: 'Calculation approaches and data sources',
        required: true,
        data_sources: [],
      },
      {
        id: 'sroi-detailed',
        name: 'SROI Detailed Analysis',
        description: 'Full SROI calculation with evidence',
        required: true,
        data_sources: ['sroi', 'evidence'],
      },
      {
        id: 'vis-detailed',
        name: 'VIS Detailed Analysis',
        description: 'Volunteer Impact Score breakdown',
        required: true,
        data_sources: ['vis', 'evidence'],
      },
      {
        id: 'outcomes',
        name: 'Outcome Analysis',
        description: 'All outcome dimensions over time',
        required: true,
        data_sources: ['outcomes'],
      },
      {
        id: 'evidence-appendix',
        name: 'Evidence Appendix',
        description: 'Complete evidence trail',
        required: false,
        data_sources: ['evidence'],
      },
    ],
    default_parameters: {
      include_charts: true,
      include_evidence: true,
      include_lineage: true,
    },
    estimated_pages: 35,
  },
  {
    id: 'stakeholder-briefing',
    name: 'Stakeholder Briefing',
    description: 'Narrative-focused report for external stakeholders and partners',
    category: 'stakeholder',
    sections: [
      {
        id: 'cover',
        name: 'Cover Page',
        description: 'Title, period, and company branding',
        required: true,
        data_sources: [],
      },
      {
        id: 'narrative',
        name: 'Impact Narrative',
        description: 'Story-driven summary',
        required: true,
        data_sources: ['at-a-glance', 'outcomes'],
      },
      {
        id: 'key-achievements',
        name: 'Key Achievements',
        description: 'Highlighted successes',
        required: true,
        data_sources: ['q2q-feed'],
      },
      {
        id: 'social-value',
        name: 'Social Value Created',
        description: 'SROI and beneficiary impact',
        required: true,
        data_sources: ['sroi'],
      },
      {
        id: 'next-steps',
        name: 'Looking Forward',
        description: 'Future goals and initiatives',
        required: false,
        data_sources: [],
      },
    ],
    default_parameters: {
      include_charts: true,
      include_evidence: false,
      include_lineage: false,
    },
    estimated_pages: 12,
  },
  {
    id: 'csrd-compliance',
    name: 'CSRD Compliance Report',
    description: 'EU Corporate Sustainability Reporting Directive compliant report',
    category: 'compliance',
    sections: [
      {
        id: 'cover',
        name: 'Cover Page',
        description: 'Title, period, reporting entity',
        required: true,
        data_sources: [],
      },
      {
        id: 'esrs-s1',
        name: 'ESRS S1 - Own Workforce',
        description: 'Workforce-related disclosures',
        required: true,
        data_sources: ['outcomes'],
      },
      {
        id: 'esrs-s2',
        name: 'ESRS S2 - Workers in Value Chain',
        description: 'Value chain worker disclosures',
        required: true,
        data_sources: ['outcomes'],
      },
      {
        id: 'esrs-s3',
        name: 'ESRS S3 - Affected Communities',
        description: 'Community impact disclosures',
        required: true,
        data_sources: ['outcomes', 'evidence'],
      },
      {
        id: 'data-quality',
        name: 'Data Quality Statement',
        description: 'Evidence verification and confidence scores',
        required: true,
        data_sources: ['evidence'],
      },
    ],
    default_parameters: {
      include_charts: true,
      include_evidence: true,
      include_lineage: true,
    },
    estimated_pages: 45,
  },
];

export interface CreateReportRequest {
  company_id: string;
  template_id: string;
  title: string;
  description?: string;
  format: ReportFormat;
  parameters: ReportParameters;
}

export interface ReportGenerationProgress {
  report_id: string;
  status: ReportStatus;
  progress: number;
  current_step?: string;
  estimated_completion?: Date;
  error_message?: string;
}
