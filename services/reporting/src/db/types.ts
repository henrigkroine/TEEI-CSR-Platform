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
