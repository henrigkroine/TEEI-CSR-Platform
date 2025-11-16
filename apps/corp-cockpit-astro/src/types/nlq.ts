/**
 * Natural Language Query (NLQ) Types
 * TypeScript interfaces for NLQ query results and answer cards
 */

export type VisualizationType = 'table' | 'bar' | 'line' | 'pie' | 'doughnut';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type FeedbackRating = 'positive' | 'negative';
export type ExportFormat = 'csv' | 'json';

/**
 * Confidence score breakdown
 */
export interface ConfidenceScore {
  overall: number; // 0-1
  components: {
    queryUnderstanding: number; // How well we understood the question
    dataRelevance: number; // How relevant the data is
    calculationAccuracy: number; // Confidence in calculations
    completeness: number; // How complete the answer is
  };
  reasoning?: string; // Optional explanation
  recommendations?: string[]; // Suggestions for low confidence
}

/**
 * Data lineage for answer traceability
 */
export interface AnswerLineage {
  dataSources: DataSource[];
  transformations: TransformationStep[];
  evidenceSnippets: EvidenceSnippet[];
}

export interface DataSource {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file' | 'calculation';
  recordCount?: number;
  lastUpdated?: string;
}

export interface TransformationStep {
  step: number;
  operation: string;
  description: string;
  inputCount: number;
  outputCount: number;
}

export interface EvidenceSnippet {
  id: string;
  evidenceId: string;
  text: string;
  source: string;
  relevance: number; // 0-1
  highlighted?: boolean;
}

/**
 * Visualization configuration
 */
export interface VisualizationConfig {
  type: VisualizationType;
  chartConfig?: {
    labels?: string[];
    datasets?: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
    }>;
  };
  autoDetected?: boolean;
}

/**
 * NLQ Answer structure
 */
export interface NLQAnswer {
  summary: string; // Natural language summary
  data: any[]; // Structured data result
  confidence: ConfidenceScore;
  lineage: AnswerLineage;
  visualization?: VisualizationConfig;
}

/**
 * Query metadata
 */
export interface QueryMetadata {
  executionTimeMs: number;
  cached: boolean;
  timestamp: string; // ISO datetime
  modelVersion?: string;
  tokensUsed?: number;
}

/**
 * Complete answer card props
 */
export interface AnswerCardProps {
  queryId: string;
  question: string;
  answer: NLQAnswer;
  metadata: QueryMetadata;
  onFeedback?: (rating: FeedbackRating) => void;
  onExport?: (format: ExportFormat) => void;
  onLineageExpand?: () => void;
}

/**
 * Confidence badge props
 */
export interface ConfidenceBadgeProps {
  score: ConfidenceScore;
  showBreakdown?: boolean;
  compact?: boolean;
}

/**
 * Data visualization props
 */
export interface DataVisualizationProps {
  data: any[];
  config?: VisualizationConfig;
  height?: number;
  onVisualizationChange?: (type: VisualizationType) => void;
}

/**
 * Lineage view props
 */
export interface LineageViewProps {
  lineage: AnswerLineage;
  expanded?: boolean;
  onEvidenceClick?: (evidenceId: string) => void;
}
