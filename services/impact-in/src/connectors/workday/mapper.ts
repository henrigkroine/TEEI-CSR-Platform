import { z } from 'zod';
import type { TEEIMetrics } from '../benevity/mapper.js';

// Workday Volunteer Management API schema
export const WorkdayVolunteerActivitySchema = z.object({
  activityId: z.string(),
  activityName: z.string(),
  activityType: z.enum(['volunteer', 'training', 'mentorship', 'community_service']),
  volunteerHours: z.number().min(0),
  participantCount: z.number().int().min(0),
  activityDate: z.string(), // YYYY-MM-DD format
  status: z.enum(['completed', 'in_progress', 'planned']),
});

export type WorkdayVolunteerActivity = z.infer<typeof WorkdayVolunteerActivitySchema>;

// Workday Program Enrollment schema
export const WorkdayProgramEnrollmentSchema = z.object({
  programId: z.string(),
  programName: z.string(),
  enrollmentCount: z.number().int().min(0),
  completionCount: z.number().int().min(0).optional(),
  periodStart: z.string(), // YYYY-MM-DD format
  periodEnd: z.string(),
});

export type WorkdayProgramEnrollment = z.infer<typeof WorkdayProgramEnrollmentSchema>;

// Main Workday API payload
export const WorkdayPayloadSchema = z.object({
  organizationId: z.string(),
  reportingPeriod: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
  volunteerActivities: z.array(WorkdayVolunteerActivitySchema),
  programEnrollments: z.array(WorkdayProgramEnrollmentSchema),
  metadata: z.object({
    source: z.string(),
    version: z.string(),
    timestamp: z.string().datetime(),
  }),
});

export type WorkdayPayload = z.infer<typeof WorkdayPayloadSchema>;

/**
 * Maps TEEI metrics to Workday Volunteer Management API format
 */
export function mapToWorkday(
  metrics: TEEIMetrics,
  organizationId: string,
  programId: string = 'teei-integration',
  programName: string = 'TEEI Integration Program'
): WorkdayPayload {
  const volunteerActivities: WorkdayVolunteerActivity[] = [
    {
      activityId: `teei-volunteer-${metrics.companyId}-${metrics.periodStart}`,
      activityName: 'TEEI Volunteer Activities',
      activityType: 'volunteer',
      volunteerHours: metrics.volunteerHours,
      participantCount: metrics.volunteersCount,
      activityDate: metrics.periodEnd.split('T')[0],
      status: 'completed',
    },
  ];

  // If there are mentorship or buddy sessions, add them
  if (metrics.sessionsCount > 0) {
    volunteerActivities.push({
      activityId: `teei-mentorship-${metrics.companyId}-${metrics.periodStart}`,
      activityName: 'TEEI Mentorship Sessions',
      activityType: 'mentorship',
      volunteerHours: metrics.sessionsCount * 1.5, // Assume 1.5 hours per session
      participantCount: metrics.participantsCount,
      activityDate: metrics.periodEnd.split('T')[0],
      status: 'completed',
    });
  }

  const programEnrollments: WorkdayProgramEnrollment[] = [
    {
      programId,
      programName,
      enrollmentCount: metrics.participantsCount,
      completionCount: metrics.participantsCount, // Assume all enrolled are active
      periodStart: metrics.periodStart.split('T')[0],
      periodEnd: metrics.periodEnd.split('T')[0],
    },
  ];

  return {
    organizationId,
    reportingPeriod: {
      startDate: metrics.periodStart.split('T')[0],
      endDate: metrics.periodEnd.split('T')[0],
    },
    volunteerActivities,
    programEnrollments,
    metadata: {
      source: 'TEEI Platform',
      version: '1.0',
      timestamp: new Date().toISOString(),
    },
  };
}
