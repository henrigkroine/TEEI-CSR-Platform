/**
 * Goodera Impact-In API Mapper
 * Maps TEEI metrics to Goodera's expected format
 */

export interface GooderaPayload {
  organization: {
    id: string;
    name: string;
  };
  reporting: {
    period: string;
    submittedAt: string;
  };
  volunteers: {
    count: number;
    hours: number;
    engagement: string; // 'low' | 'medium' | 'high'
  };
  outcomes: Array<{
    indicator: string;
    value: number;
    unit: string;
    target?: number;
  }>;
  sdgAlignment: string[]; // UN SDG numbers
}

export function mapToGoodera(data: {
  companyId: string;
  companyName: string;
  period: string;
  volunteers: number;
  hours: number;
  outcomes: {
    integration: number;
    language: number;
    jobReadiness: number;
  };
}): GooderaPayload {
  const avgHours = data.volunteers > 0 ? data.hours / data.volunteers : 0;
  const engagement = avgHours >= 20 ? 'high' : avgHours >= 10 ? 'medium' : 'low';

  return {
    organization: {
      id: data.companyId,
      name: data.companyName,
    },
    reporting: {
      period: data.period,
      submittedAt: new Date().toISOString(),
    },
    volunteers: {
      count: data.volunteers,
      hours: data.hours,
      engagement,
    },
    outcomes: [
      { indicator: 'Social Integration', value: data.outcomes.integration * 100, unit: 'percentage', target: 80 },
      { indicator: 'Language Proficiency', value: data.outcomes.language * 100, unit: 'percentage', target: 75 },
      { indicator: 'Job Readiness', value: data.outcomes.jobReadiness * 100, unit: 'percentage', target: 85 },
    ],
    sdgAlignment: ['4', '8', '10'], // Quality Education, Decent Work, Reduced Inequalities
  };
}
