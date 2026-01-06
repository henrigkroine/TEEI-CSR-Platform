/**
 * Workday Impact-In API Mapper
 * Maps TEEI metrics to Workday's expected format
 */

export interface WorkdayPayload {
  CompanyReference: {
    ID: string;
  };
  EffectivePeriod: {
    StartDate: string;
    EndDate: string;
  };
  VolunteeringData: {
    ParticipantCount: number;
    TotalHours: number;
    Activities: Array<{
      ActivityType: string;
      Hours: number;
      ParticipantCount: number;
    }>;
  };
  ImpactMeasurement: {
    SocialROI: number;
    BeneficiariesReached: number;
    OutcomeMetrics: Array<{
      MetricName: string;
      Value: number;
      Unit: string;
    }>;
  };
}

export function mapToWorkday(data: {
  companyId: string;
  period: string;
  volunteers: number;
  hours: number;
  participants: number;
  sroiRatio: number;
  outcomes: {
    integration: number;
    language: number;
    jobReadiness: number;
  };
}): WorkdayPayload {
  // Parse period (e.g., "2025-Q1" -> Q1 2025)
  const [year, quarter] = data.period.split('-Q');
  const quarterNum = parseInt(quarter, 10);
  const startMonth = (quarterNum - 1) * 3 + 1;
  const endMonth = quarterNum * 3;

  return {
    CompanyReference: {
      ID: data.companyId,
    },
    EffectivePeriod: {
      StartDate: `${year}-${String(startMonth).padStart(2, '0')}-01`,
      EndDate: `${year}-${String(endMonth).padStart(2, '0')}-${endMonth === 3 || endMonth === 6 || endMonth === 9 || endMonth === 12 ? (endMonth === 3 ? '31' : endMonth === 6 ? '30' : endMonth === 9 ? '30' : '31') : '30'}`,
    },
    VolunteeringData: {
      ParticipantCount: data.volunteers,
      TotalHours: data.hours,
      Activities: [
        { ActivityType: 'Buddy_Program', Hours: Math.floor(data.hours * 0.4), ParticipantCount: Math.floor(data.volunteers * 0.4) },
        { ActivityType: 'Language_Connect', Hours: Math.floor(data.hours * 0.3), ParticipantCount: Math.floor(data.volunteers * 0.3) },
        { ActivityType: 'Mentorship', Hours: Math.floor(data.hours * 0.3), ParticipantCount: Math.floor(data.volunteers * 0.3) },
      ],
    },
    ImpactMeasurement: {
      SocialROI: data.sroiRatio,
      BeneficiariesReached: data.participants,
      OutcomeMetrics: [
        { MetricName: 'Integration_Score', Value: data.outcomes.integration, Unit: 'percentage' },
        { MetricName: 'Language_Proficiency', Value: data.outcomes.language, Unit: 'percentage' },
        { MetricName: 'Job_Readiness', Value: data.outcomes.jobReadiness, Unit: 'percentage' },
      ],
    },
  };
}
