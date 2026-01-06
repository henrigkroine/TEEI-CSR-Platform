/**
 * Outcome Dimensions for Q2Q Analysis
 *
 * These dimensions represent the key outcome areas measured in the TEEI CSR platform.
 */

export enum OutcomeDimension {
  CONFIDENCE = 'confidence',
  BELONGING = 'belonging',
  LANG_LEVEL_PROXY = 'lang_level_proxy',
  JOB_READINESS = 'job_readiness',
  WELL_BEING = 'well_being'
}

export interface OutcomeDimensionDefinition {
  dimension: OutcomeDimension;
  label: string;
  description: string;
  scale: {
    min: number;
    max: number;
    interpretation: string;
  };
}

/**
 * Definitions for each outcome dimension
 */
export const OUTCOME_DEFINITIONS: OutcomeDimensionDefinition[] = [
  {
    dimension: OutcomeDimension.CONFIDENCE,
    label: 'Confidence',
    description: 'Measures the learner\'s self-assurance and belief in their abilities',
    scale: {
      min: 0,
      max: 1,
      interpretation: '0 = No confidence indicators, 1 = Strong confidence indicators'
    }
  },
  {
    dimension: OutcomeDimension.BELONGING,
    label: 'Belonging',
    description: 'Measures the learner\'s sense of connection and inclusion in the learning community',
    scale: {
      min: 0,
      max: 1,
      interpretation: '0 = No belonging indicators, 1 = Strong belonging indicators'
    }
  },
  {
    dimension: OutcomeDimension.LANG_LEVEL_PROXY,
    label: 'Language Level Proxy',
    description: 'Estimates language proficiency based on text complexity and communication patterns',
    scale: {
      min: 0,
      max: 1,
      interpretation: '0 = Basic language level, 1 = Advanced language level'
    }
  },
  {
    dimension: OutcomeDimension.JOB_READINESS,
    label: 'Job Readiness',
    description: 'Measures indicators of employment preparedness and professional skills',
    scale: {
      min: 0,
      max: 1,
      interpretation: '0 = Limited job readiness, 1 = High job readiness'
    }
  },
  {
    dimension: OutcomeDimension.WELL_BEING,
    label: 'Well-Being',
    description: 'Measures overall emotional and mental wellness indicators',
    scale: {
      min: 0,
      max: 1,
      interpretation: '0 = Low well-being indicators, 1 = High well-being indicators'
    }
  }
];

/**
 * Get definition for a specific dimension
 */
export function getDimensionDefinition(dimension: OutcomeDimension): OutcomeDimensionDefinition | undefined {
  return OUTCOME_DEFINITIONS.find(d => d.dimension === dimension);
}

/**
 * Get all dimension definitions
 */
export function getAllDimensionDefinitions(): OutcomeDimensionDefinition[] {
  return OUTCOME_DEFINITIONS;
}
