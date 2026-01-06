import { z } from 'zod';

/**
 * Production Label Set for Q2Q AI Classifier
 *
 * These labels represent the outcome indicators extracted from learner feedback,
 * check-ins, and other text sources.
 */

// Language comfort levels
export enum LanguageComfort {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

// Employability signal types
export enum EmployabilitySignal {
  JOB_SEARCH = 'job_search',
  SKILLS_GAINED = 'skills_gained',
  NETWORKING = 'networking',
  RESUME_IMPROVEMENT = 'resume_improvement',
  INTERVIEW_PREP = 'interview_prep',
  CERTIFICATION = 'certification',
  PORTFOLIO_BUILDING = 'portfolio_building',
  CAREER_GOAL_SETTING = 'career_goal_setting'
}

// Risk cue types
export enum RiskCue {
  ISOLATION = 'isolation',
  FRUSTRATION = 'frustration',
  DISENGAGEMENT = 'disengagement',
  ANXIETY = 'anxiety',
  DROPOUT_INDICATION = 'dropout_indication',
  CONFUSION = 'confusion',
  NEGATIVE_SELF_TALK = 'negative_self_talk',
  LACK_OF_SUPPORT = 'lack_of_support'
}

/**
 * Classification result schema
 * This is what the AI model should return in its structured output
 */
export const ClassificationOutputSchema = z.object({
  // Boolean indicators for confidence changes
  confidence_increase: z.boolean().describe('Indicates increased self-confidence or self-efficacy'),
  confidence_decrease: z.boolean().describe('Indicates decreased self-confidence or self-doubt'),

  // Boolean indicators for belonging changes
  belonging_increase: z.boolean().describe('Indicates increased sense of community or connection'),
  belonging_decrease: z.boolean().describe('Indicates isolation or disconnection'),

  // Language proficiency proxy
  language_comfort: z.nativeEnum(LanguageComfort).describe('Estimated language comfort level based on text complexity'),

  // Employability signals (can have multiple)
  employability_signals: z.array(z.nativeEnum(EmployabilitySignal)).describe('Job readiness and career development indicators'),

  // Risk cues (can have multiple)
  risk_cues: z.array(z.nativeEnum(RiskCue)).describe('Indicators of potential disengagement or distress'),

  // Topics (optional, added in v2)
  topics: z.array(z.string()).optional().describe('Detected topics: CV, interview, PM, dev, networking, mentorship'),

  // Evidence snippets with reasoning
  evidence: z.array(z.object({
    snippet: z.string().describe('Specific text excerpt supporting the classification'),
    label_type: z.string().describe('Which label this evidence supports'),
    reasoning: z.string().describe('Brief explanation of why this snippet is relevant'),
    position_start: z.number().optional().describe('Character position where snippet starts in original text'),
    position_end: z.number().optional().describe('Character position where snippet ends in original text')
  })).describe('Evidence snippets supporting the classification with explanations')
});

export type ClassificationOutput = z.infer<typeof ClassificationOutputSchema>;

/**
 * Label descriptions for prompt engineering
 * These help the AI understand what each label means
 */
export const LABEL_DESCRIPTIONS = {
  confidence_increase: {
    description: 'Learner expresses increased confidence, self-efficacy, or positive self-assessment',
    examples: [
      'I feel more confident about my abilities now',
      'I can do this',
      'I\'m proud of my progress',
      'I believe I can succeed'
    ]
  },
  confidence_decrease: {
    description: 'Learner expresses self-doubt, decreased confidence, or negative self-assessment',
    examples: [
      'I don\'t think I can do this',
      'I\'m not good enough',
      'I feel like I\'m falling behind',
      'Maybe this isn\'t for me'
    ]
  },
  belonging_increase: {
    description: 'Learner expresses feeling connected, supported, or part of a community',
    examples: [
      'My buddy has been so helpful',
      'I feel like I belong here',
      'The group is very supportive',
      'I enjoy working with my peers'
    ]
  },
  belonging_decrease: {
    description: 'Learner expresses isolation, disconnection, or lack of support',
    examples: [
      'I feel alone in this',
      'Nobody understands my situation',
      'I don\'t have anyone to help me',
      'I feel excluded'
    ]
  },
  language_comfort: {
    description: 'Assessment of language proficiency based on vocabulary, grammar, and text complexity',
    indicators: {
      low: 'Simple sentences, basic vocabulary, frequent errors, limited expression',
      medium: 'Moderate complexity, some advanced vocabulary, occasional errors',
      high: 'Complex sentences, rich vocabulary, few errors, nuanced expression'
    }
  },
  employability_signals: {
    description: 'Indicators of job readiness and career development activities',
    types: {
      job_search: 'Actively looking for employment, submitting applications',
      skills_gained: 'Learning new skills, completing courses, gaining competencies',
      networking: 'Building professional connections, attending events',
      resume_improvement: 'Working on CV/resume, application materials',
      interview_prep: 'Preparing for interviews, practicing responses',
      certification: 'Pursuing certifications or credentials',
      portfolio_building: 'Creating portfolio, work samples, projects',
      career_goal_setting: 'Defining career objectives, planning next steps'
    }
  },
  risk_cues: {
    description: 'Warning signs of potential disengagement or distress',
    types: {
      isolation: 'Feeling alone, disconnected from peers or support',
      frustration: 'Expressing anger, irritation, or exasperation',
      disengagement: 'Losing interest, motivation, or participation',
      anxiety: 'Expressing worry, stress, or overwhelm',
      dropout_indication: 'Considering leaving program or giving up',
      confusion: 'Expressing lack of understanding or direction',
      negative_self_talk: 'Self-criticism, negative self-perception',
      lack_of_support: 'Perceiving insufficient help or resources'
    }
  }
};

/**
 * Convert classification output to legacy dimension scores
 * This maintains backward compatibility with existing outcome_scores schema
 */
export function classificationToLegacyScores(classification: ClassificationOutput): Record<string, number> {
  // Confidence score (0-1)
  let confidenceScore = 0.5; // neutral baseline
  if (classification.confidence_increase) confidenceScore = 0.8;
  if (classification.confidence_decrease) confidenceScore = 0.2;

  // Belonging score (0-1)
  let belongingScore = 0.5; // neutral baseline
  if (classification.belonging_increase) belongingScore = 0.8;
  if (classification.belonging_decrease) belongingScore = 0.2;

  // Language level proxy (0-1)
  const langScores = {
    [LanguageComfort.LOW]: 0.3,
    [LanguageComfort.MEDIUM]: 0.6,
    [LanguageComfort.HIGH]: 0.9
  };
  const langLevelScore = langScores[classification.language_comfort];

  // Job readiness score (based on employability signals)
  const jobReadinessScore = Math.min(
    classification.employability_signals.length * 0.15 + 0.3,
    1.0
  );

  // Well-being score (inverse of risk cues)
  const wellBeingScore = Math.max(
    0.9 - (classification.risk_cues.length * 0.15),
    0.1
  );

  return {
    confidence: confidenceScore,
    belonging: belongingScore,
    lang_level_proxy: langLevelScore,
    job_readiness: jobReadinessScore,
    well_being: wellBeingScore
  };
}
