/**
 * Evidence Types
 *
 * Type definitions for evidence tracking and lineage
 */

export interface Evidence {
  id: string;
  company_id: string;
  metric_type: MetricType;
  metric_name: string;
  value: number | string;
  source: EvidenceSource;
  source_identifier: string;
  collected_at: Date;
  period: string;
  metadata: Record<string, unknown>;
  tags: string[];
  redacted: boolean;
  verified: boolean;
  confidence_score: number;
  created_at: Date;
  updated_at: Date;
}

export type MetricType =
  | 'volunteer_hours'
  | 'integration_score'
  | 'language_score'
  | 'job_readiness_score'
  | 'beneficiaries_reached'
  | 'investment_amount'
  | 'outcome_delta';

export type EvidenceSource =
  | 'manual_entry'
  | 'csv_import'
  | 'api_integration'
  | 'benevity'
  | 'goodera'
  | 'workday'
  | 'calculated';

export interface EvidenceFilters {
  metric_type?: MetricType[];
  source?: EvidenceSource[];
  period?: string;
  verified?: boolean;
  tags?: string[];
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface EvidenceLineage {
  evidence_id: string;
  metric_name: string;
  value: number | string;
  source: EvidenceSource;
  collected_at: Date;
  dependencies: EvidenceDependency[];
  calculations: CalculationStep[];
  transformations: TransformationStep[];
}

export interface EvidenceDependency {
  evidence_id: string;
  metric_name: string;
  value: number | string;
  relationship: 'input' | 'reference' | 'derived_from';
}

export interface CalculationStep {
  step: number;
  operation: string;
  formula: string;
  inputs: Record<string, number>;
  output: number;
  timestamp: Date;
}

export interface TransformationStep {
  step: number;
  type: 'normalization' | 'aggregation' | 'conversion' | 'validation';
  description: string;
  input_value: unknown;
  output_value: unknown;
  timestamp: Date;
}

export interface EvidenceStats {
  total_count: number;
  verified_count: number;
  unverified_count: number;
  by_metric_type: Record<MetricType, number>;
  by_source: Record<EvidenceSource, number>;
  by_period: Record<string, number>;
  oldest_evidence: Date;
  newest_evidence: Date;
}

export interface CreateEvidenceRequest {
  company_id: string;
  metric_type: MetricType;
  metric_name: string;
  value: number | string;
  source: EvidenceSource;
  source_identifier: string;
  period: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  verified?: boolean;
  confidence_score?: number;
}

export interface UpdateEvidenceRequest {
  value?: number | string;
  verified?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
  confidence_score?: number;
}
