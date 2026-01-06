/**
 * Mock Lineage Data for Metrics
 * Provides sample data for evidence lineage tracking
 * Used for development and testing before backend integration
 */

import type { EvidenceLineage } from '@teei/shared-types';

interface MetricLineageData extends EvidenceLineage {
  aggregationLogic: {
    formula: string;
    explanation: string;
    parameters: Record<string, any>;
  };
  sampleSnippets: Array<{
    id: string;
    text: string;
    source: string;
    confidence: number;
    date: string;
  }>;
  metadata: {
    q2qModelVersion: string;
    lastUpdated: string;
    dataFreshness: 'current' | 'stale' | 'outdated';
  };
}

export const mockLineageData: Record<string, MetricLineageData> = {
  sroi: {
    metricId: 'sroi',
    metricName: 'Social Return on Investment',
    metricValue: 3.2,
    aggregationMethod: 'weighted_average',
    aggregationLogic: {
      formula: 'SROI = Total Social Value / Total Investment',
      explanation:
        'The SROI ratio is calculated by dividing the total social value created (measured through volunteer hours, participant outcomes, and community impact) by the total investment (program costs, volunteer time valued at market rates). This metric aggregates 127 evidence snippets from Q4 2024, weighted by confidence scores (0.70-0.95) from our Q2Q AI model.',
      parameters: {
        'Total Investment': '$85,000',
        'Total Social Value': '$272,000',
        'Volunteer Hours Value': '$98,000',
        'Outcome Impact Value': '$174,000',
        'Evidence Count': 127,
        'Average Confidence': '0.87',
      },
    },
    evidenceChain: [
      // Level 3: Metric
      {
        level: 3,
        type: 'metric',
        id: 'sroi',
        description: 'SROI ratio 3.2:1 - Every $1 invested generates $3.20 in social value',
        contributionWeight: 1.0,
      },
      // Level 2: Outcome scores
      {
        level: 2,
        type: 'outcome_score',
        id: '770e8400-e29b-41d4-a716-446655440003',
        description: 'Confidence outcome score: 0.85 (model confidence: 0.92)',
        contributionWeight: 0.35,
      },
      {
        level: 2,
        type: 'outcome_score',
        id: '880e8400-e29b-41d4-a716-446655440004',
        description: 'Belonging outcome score: 0.78 (model confidence: 0.87)',
        contributionWeight: 0.25,
      },
      {
        level: 2,
        type: 'outcome_score',
        id: '990e8400-e29b-41d4-a716-446655440007',
        description: 'Language level proxy: 0.92 (model confidence: 0.95)',
        contributionWeight: 0.30,
      },
      {
        level: 2,
        type: 'outcome_score',
        id: 'aa0e8400-e29b-41d4-a716-446655440008',
        description: 'Job readiness outcome score: 0.81 (model confidence: 0.89)',
        contributionWeight: 0.10,
      },
      // Level 1: Evidence snippets
      {
        level: 1,
        type: 'evidence_snippet',
        id: '550e8400-e29b-41d4-a716-446655440001',
        description:
          '"I feel more confident speaking in meetings now. My mentor helped me practice professional communication." - Buddy Program participant',
        contributionWeight: 0.45,
      },
      {
        level: 1,
        type: 'evidence_snippet',
        id: '550e8400-e29b-41d4-a716-446655440005',
        description:
          '"The language sessions improved my communication skills significantly. I can now explain technical concepts in Norwegian." - Language Connect participant',
        contributionWeight: 0.40,
      },
      {
        level: 1,
        type: 'evidence_snippet',
        id: '550e8400-e29b-41d4-a716-446655440009',
        description:
          '"Feeling more integrated into the team. Weekly check-ins help me understand company culture." - Onboarding checkin',
        contributionWeight: 0.15,
      },
    ],
    totalEvidenceCount: 127,
    period: {
      start: '2024-10-01',
      end: '2024-12-31',
    },
    sampleSnippets: [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        text: 'I feel more confident speaking in meetings now. My mentor helped me practice professional communication and gave me feedback on my presentation skills. This has made a huge difference in my daily work.',
        source: 'Buddy Program Feedback',
        confidence: 0.95,
        date: '2024-12-15',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        text: 'The language sessions improved my communication skills significantly. I can now explain technical concepts in Norwegian and feel comfortable participating in team discussions.',
        source: 'Language Connect Survey',
        confidence: 0.92,
        date: '2024-12-10',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440009',
        text: 'Feeling more integrated into the team. Weekly check-ins help me understand company culture and expectations. I appreciate the structured support.',
        source: 'Onboarding Checkin',
        confidence: 0.88,
        date: '2024-12-08',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440012',
        text: 'The mentorship program helped me build professional networks. I now have colleagues I can ask for advice on career development and technical questions.',
        source: 'Mentorship Program Feedback',
        confidence: 0.87,
        date: '2024-12-05',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440015',
        text: 'Job readiness training gave me practical skills for the Norwegian job market. Resume workshops and interview practice were particularly valuable.',
        source: 'Upskilling Program Survey',
        confidence: 0.85,
        date: '2024-12-01',
      },
    ],
    metadata: {
      q2qModelVersion: 'q2q-v2.1.3',
      lastUpdated: '2024-12-31T23:59:59Z',
      dataFreshness: 'current',
    },
  },

  vis: {
    metricId: 'vis',
    metricName: 'Volunteer Impact Score',
    metricValue: 67.8,
    aggregationMethod: 'composite_score',
    aggregationLogic: {
      formula: 'VIS = (Hours × 0.3) + (Consistency × 0.3) + (Outcome Impact × 0.4)',
      explanation:
        'The VIS aggregates volunteer contributions across three dimensions: hours committed (30% weight), consistency of engagement (30% weight), and measurable outcome impact on participants (40% weight). This metric is calculated from 89 volunteer activity records and 47 participant outcome scores from Q4 2024.',
      parameters: {
        'Total Volunteers': 23,
        'Average Hours': 12.5,
        'Average Consistency': 0.78,
        'Average Outcome Impact': 0.82,
        'Evidence Count': 89,
        'Participant Outcomes': 47,
      },
    },
    evidenceChain: [
      {
        level: 3,
        type: 'metric',
        id: 'vis',
        description: 'Company Average VIS: 67.8 (High Impact band)',
        contributionWeight: 1.0,
      },
      {
        level: 2,
        type: 'outcome_score',
        id: 'bb0e8400-e29b-41d4-a716-446655440021',
        description: 'Volunteer consistency score: 0.78 (22/23 volunteers)',
        contributionWeight: 0.30,
      },
      {
        level: 2,
        type: 'outcome_score',
        id: 'cc0e8400-e29b-41d4-a716-446655440022',
        description: 'Participant outcome impact: 0.82 (47 participants)',
        contributionWeight: 0.40,
      },
      {
        level: 1,
        type: 'evidence_snippet',
        id: '660e8400-e29b-41d4-a716-446655440031',
        description:
          '"My volunteer mentor meets with me every week. Their consistency helps me stay on track with my integration goals." - Participant feedback',
        contributionWeight: 0.35,
      },
      {
        level: 1,
        type: 'evidence_snippet',
        id: '660e8400-e29b-41d4-a716-446655440032',
        description:
          '"Volunteering 2 hours per week has been manageable and rewarding. Seeing participant progress motivates me." - Volunteer reflection',
        contributionWeight: 0.30,
      },
    ],
    totalEvidenceCount: 89,
    period: {
      start: '2024-10-01',
      end: '2024-12-31',
    },
    sampleSnippets: [
      {
        id: '660e8400-e29b-41d4-a716-446655440031',
        text: 'My volunteer mentor meets with me every week without fail. Their consistency helps me stay on track with my integration goals and gives me reliable support I can count on.',
        source: 'Participant Feedback',
        confidence: 0.93,
        date: '2024-12-20',
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440032',
        text: 'Volunteering 2 hours per week has been manageable and incredibly rewarding. Seeing participant progress motivates me to continue. The impact is tangible.',
        source: 'Volunteer Reflection',
        confidence: 0.90,
        date: '2024-12-18',
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440033',
        text: 'The structured volunteer program makes it easy to contribute meaningfully. Clear expectations and training helped me become effective quickly.',
        source: 'Volunteer Survey',
        confidence: 0.88,
        date: '2024-12-12',
      },
    ],
    metadata: {
      q2qModelVersion: 'q2q-v2.1.3',
      lastUpdated: '2024-12-31T23:59:59Z',
      dataFreshness: 'current',
    },
  },

  integration_score: {
    metricId: 'integration_score',
    metricName: 'Integration Score',
    metricValue: 0.78,
    aggregationMethod: 'weighted_average',
    aggregationLogic: {
      formula: 'Integration = Σ(confidence × belonging × social_connection) / n',
      explanation:
        'The Integration Score measures participant sense of belonging and social connectedness. It aggregates confidence, belonging, and social connection dimensions from 47 evidence snippets, weighted by Q2Q model confidence scores. Higher scores indicate stronger integration into Norwegian society and workplace.',
      parameters: {
        'Average Confidence': 0.82,
        'Average Belonging': 0.75,
        'Average Social Connection': 0.77,
        'Evidence Count': 47,
        'Q2Q Confidence': 0.89,
      },
    },
    evidenceChain: [
      {
        level: 3,
        type: 'metric',
        id: 'integration_score',
        description: 'Overall Integration Score: 0.78 (78% integrated)',
        contributionWeight: 1.0,
      },
      {
        level: 2,
        type: 'outcome_score',
        id: 'dd0e8400-e29b-41d4-a716-446655440041',
        description: 'Confidence dimension: 0.82',
        contributionWeight: 0.35,
      },
      {
        level: 2,
        type: 'outcome_score',
        id: 'ee0e8400-e29b-41d4-a716-446655440042',
        description: 'Belonging dimension: 0.75',
        contributionWeight: 0.35,
      },
      {
        level: 2,
        type: 'outcome_score',
        id: 'ff0e8400-e29b-41d4-a716-446655440043',
        description: 'Social connection dimension: 0.77',
        contributionWeight: 0.30,
      },
      {
        level: 1,
        type: 'evidence_snippet',
        id: '770e8400-e29b-41d4-a716-446655440051',
        description:
          '"I feel like I belong here now. Colleagues include me in lunch conversations and after-work activities." - Integration survey',
        contributionWeight: 0.40,
      },
    ],
    totalEvidenceCount: 47,
    period: {
      start: '2024-10-01',
      end: '2024-12-31',
    },
    sampleSnippets: [
      {
        id: '770e8400-e29b-41d4-a716-446655440051',
        text: 'I feel like I belong here now. Colleagues include me in lunch conversations and after-work activities. The buddy program helped break the ice.',
        source: 'Integration Survey',
        confidence: 0.91,
        date: '2024-12-22',
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440052',
        text: 'My confidence has grown significantly. I now volunteer to lead team meetings and contribute ideas without hesitation.',
        source: 'Buddy Program Feedback',
        confidence: 0.89,
        date: '2024-12-19',
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440053',
        text: 'Building social connections took time, but now I have friends outside work too. Community events organized by the program really helped.',
        source: 'Participant Interview',
        confidence: 0.87,
        date: '2024-12-14',
      },
    ],
    metadata: {
      q2qModelVersion: 'q2q-v2.1.3',
      lastUpdated: '2024-12-31T23:59:59Z',
      dataFreshness: 'current',
    },
  },

  language_level_proxy: {
    metricId: 'language_level_proxy',
    metricName: 'Language Level',
    metricValue: 0.72,
    aggregationMethod: 'nlp_assessment',
    aggregationLogic: {
      formula: 'Language Level = NLP Analysis(vocabulary, grammar, fluency)',
      explanation:
        'Language proficiency is assessed through NLP analysis of participant communications, measuring vocabulary range, grammatical accuracy, and communication fluency. This proxy metric aggregates 53 language samples from feedback forms, check-ins, and surveys, validated against CEFR framework.',
      parameters: {
        'Average Vocabulary Score': 0.75,
        'Average Grammar Score': 0.68,
        'Average Fluency Score': 0.73,
        'Language Samples': 53,
        'CEFR Level Proxy': 'B2',
      },
    },
    evidenceChain: [
      {
        level: 3,
        type: 'metric',
        id: 'language_level_proxy',
        description: 'Language Level: 0.72 (B2 CEFR equivalent)',
        contributionWeight: 1.0,
      },
      {
        level: 2,
        type: 'outcome_score',
        id: 'gg0e8400-e29b-41d4-a716-446655440061',
        description: 'Vocabulary range score: 0.75',
        contributionWeight: 0.35,
      },
      {
        level: 2,
        type: 'outcome_score',
        id: 'hh0e8400-e29b-41d4-a716-446655440062',
        description: 'Grammar accuracy score: 0.68',
        contributionWeight: 0.30,
      },
      {
        level: 2,
        type: 'outcome_score',
        id: 'ii0e8400-e29b-41d4-a716-446655440063',
        description: 'Communication fluency score: 0.73',
        contributionWeight: 0.35,
      },
      {
        level: 1,
        type: 'evidence_snippet',
        id: '880e8400-e29b-41d4-a716-446655440071',
        description:
          '"Language Connect sessions helped me learn professional Norwegian. I can now write emails and participate in meetings confidently." - Language program feedback',
        contributionWeight: 0.45,
      },
    ],
    totalEvidenceCount: 53,
    period: {
      start: '2024-10-01',
      end: '2024-12-31',
    },
    sampleSnippets: [
      {
        id: '880e8400-e29b-41d4-a716-446655440071',
        text: 'Language Connect sessions helped me learn professional Norwegian vocabulary and grammar. I can now write emails and participate in meetings confidently without relying on English.',
        source: 'Language Program Feedback',
        confidence: 0.94,
        date: '2024-12-21',
      },
      {
        id: '880e8400-e29b-41d4-a716-446655440072',
        text: 'My Norwegian fluency improved dramatically through regular practice. Weekly language sessions and buddy conversations made the difference.',
        source: 'Language Assessment',
        confidence: 0.90,
        date: '2024-12-16',
      },
      {
        id: '880e8400-e29b-41d4-a716-446655440073',
        text: 'Understanding workplace terminology in Norwegian was challenging initially. Structured lessons and real conversation practice helped bridge the gap.',
        source: 'Participant Survey',
        confidence: 0.86,
        date: '2024-12-11',
      },
    ],
    metadata: {
      q2qModelVersion: 'q2q-v2.1.3',
      lastUpdated: '2024-12-31T23:59:59Z',
      dataFreshness: 'current',
    },
  },

  job_readiness: {
    metricId: 'job_readiness',
    metricName: 'Job Readiness',
    metricValue: 0.81,
    aggregationMethod: 'weighted_average',
    aggregationLogic: {
      formula: 'Job Readiness = (Skills × 0.4) + (Confidence × 0.3) + (Networks × 0.3)',
      explanation:
        'Job Readiness measures participant preparedness for the Norwegian job market across technical skills, professional confidence, and network building. This metric aggregates 62 evidence snippets from upskilling program feedback, mentorship sessions, and career development check-ins.',
      parameters: {
        'Skills Development': 0.84,
        'Professional Confidence': 0.79,
        'Network Building': 0.80,
        'Evidence Count': 62,
        'Placement Rate': '73%',
      },
    },
    evidenceChain: [
      {
        level: 3,
        type: 'metric',
        id: 'job_readiness',
        description: 'Job Readiness Score: 0.81 (81% ready)',
        contributionWeight: 1.0,
      },
      {
        level: 2,
        type: 'outcome_score',
        id: 'jj0e8400-e29b-41d4-a716-446655440081',
        description: 'Skills development score: 0.84',
        contributionWeight: 0.40,
      },
      {
        level: 2,
        type: 'outcome_score',
        id: 'kk0e8400-e29b-41d4-a716-446655440082',
        description: 'Professional confidence score: 0.79',
        contributionWeight: 0.30,
      },
      {
        level: 2,
        type: 'outcome_score',
        id: 'll0e8400-e29b-41d4-a716-446655440083',
        description: 'Network building score: 0.80',
        contributionWeight: 0.30,
      },
      {
        level: 1,
        type: 'evidence_snippet',
        id: '990e8400-e29b-41d4-a716-446655440091',
        description:
          '"Upskilling workshops gave me practical skills employers look for. Resume building and interview practice were invaluable." - Program participant',
        contributionWeight: 0.40,
      },
    ],
    totalEvidenceCount: 62,
    period: {
      start: '2024-10-01',
      end: '2024-12-31',
    },
    sampleSnippets: [
      {
        id: '990e8400-e29b-41d4-a716-446655440091',
        text: 'Upskilling workshops gave me practical skills employers look for. Resume building and interview practice were invaluable. I feel prepared to apply for jobs now.',
        source: 'Upskilling Program Feedback',
        confidence: 0.92,
        date: '2024-12-23',
      },
      {
        id: '990e8400-e29b-41d4-a716-446655440092',
        text: 'Mentorship helped me understand Norwegian workplace culture and expectations. My mentor introduced me to professional contacts who could offer advice.',
        source: 'Mentorship Program Survey',
        confidence: 0.89,
        date: '2024-12-17',
      },
      {
        id: '990e8400-e29b-41d4-a716-446655440093',
        text: 'Technical skills training filled gaps in my knowledge. I now understand tools and processes used in Norwegian companies.',
        source: 'Skills Assessment',
        confidence: 0.87,
        date: '2024-12-13',
      },
    ],
    metadata: {
      q2qModelVersion: 'q2q-v2.1.3',
      lastUpdated: '2024-12-31T23:59:59Z',
      dataFreshness: 'current',
    },
  },
};

/**
 * Get lineage data for a specific metric
 * Falls back to generic lineage if metric not found
 */
export function getLineageData(metricId: string): MetricLineageData {
  return mockLineageData[metricId] || mockLineageData.sroi;
}
