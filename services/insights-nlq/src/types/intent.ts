/**
 * Intent Classification Types for NLQ Query Generation
 *
 * These types define the output of the intent classification system
 * and serve as input to the query generator.
 */

export interface IntentSlot {
  name: string;
  value: string | number | boolean;
  confidence: number;
  rawValue?: string; // Original user input
}

export interface IntentClassification {
  intent: string;
  confidence: number;
  templateId: string;
  slots: IntentSlot[];

  // Extracted parameters
  timeRange?: {
    type: 'last_7d' | 'last_30d' | 'last_90d' | 'last_quarter' | 'ytd' | 'last_year' | 'custom';
    startDate?: string; // ISO date
    endDate?: string;   // ISO date
  };

  groupBy?: string[];
  filters?: Record<string, string>;
  limit?: number;

  // Metadata
  originalQuery: string;
  classifiedAt: string;
}

export interface QueryParameters {
  companyId: string;
  startDate: string;
  endDate: string;
  limit: number;
  groupBy?: string[];
  filters?: Record<string, string>;
  cohortType?: string;
  [key: string]: string | number | string[] | Record<string, string> | undefined;
}
