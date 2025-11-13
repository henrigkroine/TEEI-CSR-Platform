/**
 * Benevity Impact-In API Mapper
 * Maps TEEI metrics to Benevity's expected format
 */

export interface BenevityPayload {
  companyId: string;
  reportingPeriod: string;
  volunteerMetrics: {
    totalVolunteers: number;
    totalHours: number;
    averageHoursPerVolunteer: number;
  };
  impactMetrics: {
    beneficiariesReached: number;
    socialValue: number;
    sroiRatio: number;
  };
  categories: Array<{
    name: string;
    hours: number;
    volunteers: number;
  }>;
}

export function mapToBenevity(data: {
  companyId: string;
  period: string;
  volunteers: number;
  hours: number;
  participants: number;
  socialValue: number;
  sroiRatio: number;
}): BenevityPayload {
  return {
    companyId: data.companyId,
    reportingPeriod: data.period,
    volunteerMetrics: {
      totalVolunteers: data.volunteers,
      totalHours: data.hours,
      averageHoursPerVolunteer: data.volunteers > 0 ? data.hours / data.volunteers : 0,
    },
    impactMetrics: {
      beneficiariesReached: data.participants,
      socialValue: data.socialValue,
      sroiRatio: data.sroiRatio,
    },
    categories: [
      { name: 'Buddy Program', hours: Math.floor(data.hours * 0.4), volunteers: Math.floor(data.volunteers * 0.4) },
      { name: 'Language Connect', hours: Math.floor(data.hours * 0.3), volunteers: Math.floor(data.volunteers * 0.3) },
      { name: 'Mentorship', hours: Math.floor(data.hours * 0.3), volunteers: Math.floor(data.volunteers * 0.3) },
    ],
  };
}
