// Database entity types

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  size: 'small' | 'medium' | 'large' | 'enterprise' | null;
  country_code: string | null;
  created_at: Date;
  updated_at: Date;
  settings: Record<string, unknown>;
  is_active: boolean;
}

export interface CompanyApiKey {
  id: string;
  company_id: string;
  key_hash: string;
  name: string;
  scopes: string[];
  rate_limit_per_hour: number;
  last_used_at: Date | null;
  created_at: Date;
  expires_at: Date | null;
  is_active: boolean;
}

export interface Volunteer {
  id: string;
  company_id: string;
  external_id: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  department: string | null;
  joined_at: Date;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface VolunteerHours {
  id: string;
  volunteer_id: string;
  session_date: Date;
  hours: number;
  activity_type: 'buddy' | 'language' | 'mentorship' | 'upskilling' | null;
  notes: string | null;
  created_at: Date;
}

export interface Session {
  id: string;
  volunteer_id: string;
  participant_id: string | null;
  session_type: 'buddy' | 'language' | 'mentorship';
  session_date: Date;
  duration_minutes: number;
  platform: string | null;
  external_session_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface SessionFeedback {
  id: string;
  session_id: string;
  feedback_text: string;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  language_code: string | null;
  created_at: Date;
}

export interface OutcomeScore {
  id: string;
  participant_id: string;
  company_id: string;
  dimension: 'integration' | 'language' | 'job_readiness';
  score: number; // 0-1
  measured_at: Date;
  quarter: string; // YYYY-QN
  source: 'q2q' | 'kintell' | 'manual' | 'survey' | null;
  confidence: number | null; // 0-1
  evidence_lineage: EvidenceLineageItem[];
  created_at: Date;
}

export interface EvidenceLineageItem {
  type: 'feedback' | 'session' | 'survey' | 'external';
  id: string;
  timestamp: string;
  confidence?: number;
}

export interface Q2QInsight {
  id: string;
  company_id: string;
  participant_id: string | null;
  insight_text: string;
  source_feedback_id: string | null;
  dimensions: Record<string, number>; // dimension -> score (0-1)
  confidence: number; // 0-1
  evidence_lineage: EvidenceLineageItem[];
  created_at: Date;
  processed_at: Date;
}

// API response types

export interface AtAGlanceResponse {
  period: string; // YYYY-QN
  company_id: string;
  inputs: {
    total_volunteers: number;
    total_hours: number;
    total_sessions: number;
    active_participants: number;
  };
  outcomes: {
    integration_avg: number; // 0-1
    language_avg: number; // 0-1
    job_readiness_avg: number; // 0-1
  };
}

export interface OutcomesResponse {
  company_id: string;
  dimensions: string[];
  time_series: Array<{
    quarter: string;
    integration?: number;
    language?: number;
    job_readiness?: number;
  }>;
}

export interface SROIResponse {
  company_id: string;
  period: string;
  sroi_ratio: number;
  breakdown: {
    total_investment: number;
    total_social_value: number;
    components: {
      volunteer_hours_value: number;
      integration_value: number;
      language_value: number;
      job_readiness_value: number;
    };
  };
}

export interface VISResponse {
  company_id: string;
  aggregate_vis: number;
  top_volunteers: Array<{
    volunteer_id: string;
    name: string;
    vis_score: number;
    hours: number;
    consistency: number;
    outcome_impact: number;
  }>;
}

export interface Q2QFeedItem {
  id: string;
  insight_text: string;
  confidence: number;
  created_at: string;
  dimensions: Record<string, number>;
  evidence_lineage: EvidenceLineageItem[];
}

// Theme types

export interface CompanyTheme {
  id: string;
  company_id: string;
  logo_url: string | null;
  logo_mime_type: 'image/png' | 'image/svg+xml' | null;
  logo_size_bytes: number | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  primary_color_dark: string | null;
  secondary_color_dark: string | null;
  accent_color_dark: string | null;
  text_on_primary: string;
  text_on_secondary: string;
  text_on_accent: string;
  contrast_ratios: ContrastRatios;
  is_wcag_aa_compliant: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ContrastRatios {
  primaryText?: number;
  secondaryText?: number;
  accentText?: number;
  primaryTextDark?: number;
  secondaryTextDark?: number;
  accentTextDark?: number;
}

export interface ThemeUpdateRequest {
  logo?: {
    data: string; // base64 encoded
    mimeType: 'image/png' | 'image/svg+xml';
  };
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  primary_color_dark?: string;
  secondary_color_dark?: string;
  accent_color_dark?: string;
  text_on_primary?: string;
  text_on_secondary?: string;
  text_on_accent?: string;
}

export interface ThemeResponse {
  company_id: string;
  logo_url: string | null;
  colors: {
    light: {
      primary: string;
      secondary: string;
      accent: string;
      textOnPrimary: string;
      textOnSecondary: string;
      textOnAccent: string;
    };
    dark?: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
  contrast_validation: {
    is_compliant: boolean;
    ratios: ContrastRatios;
    warnings: string[];
  };
  updated_at: string;
}

// Saved Views types

export interface SavedView {
  id: string;
  company_id: string;
  user_id: string;
  view_name: string;
  description: string | null;
  filter_config: Record<string, any>;
  is_default: boolean;
  is_shared: boolean;
  view_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface SavedViewRequest {
  view_name: string;
  description?: string;
  filter_config: Record<string, any>;
  is_default?: boolean;
  is_shared?: boolean;
}

export interface SavedViewResponse {
  id: string;
  view_name: string;
  description: string | null;
  filter_config: Record<string, any>;
  is_default: boolean;
  is_shared: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

// Share Links types

export interface ShareLink {
  id: string;
  link_id: string;
  company_id: string;
  created_by: string;
  saved_view_id: string | null;
  filter_config: Record<string, any>;
  signature: string;
  expires_at: Date;
  revoked_at: Date | null;
  access_count: number;
  last_accessed_at: Date | null;
  boardroom_mode: boolean;
  created_at: Date;
}

export interface ShareLinkRequest {
  saved_view_id?: string;
  filter_config?: Record<string, any>;
  ttl_days?: number;
  boardroom_mode?: boolean;
}

export interface ShareLinkResponse {
  link_id: string;
  url: string;
  expires_at: string;
  boardroom_mode: boolean;
  access_count: number;
  created_at: string;
}

export interface ShareLinkAccessLog {
  id: string;
  share_link_id: string;
  accessed_at: Date;
  ip_address: string | null;
  user_agent: string | null;
  referer: string | null;
  access_granted: boolean;
  failure_reason: string | null;
}
