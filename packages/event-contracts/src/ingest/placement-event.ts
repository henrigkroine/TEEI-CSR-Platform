import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

/**
 * Placement Event - normalized from Mentorship system
 * Represents a mentorship placement or job placement outcome
 */
export const PlacementEventSchema = BaseEventSchema.extend({
  type: z.literal('ingest.placement.created'),
  data: z.object({
    // Source tracking
    sourceSystem: z.enum(['mentorship', 'job_board', 'manual']),
    sourceId: z.string(), // Placement ID in source system
    sourceTenantId: z.string().optional(),

    // Participant details
    userId: z.string().uuid(), // TEEI user ID (mentee/job seeker)
    companyId: z.string().uuid(), // TEEI company ID

    // Placement type
    placementType: z.enum([
      'mentorship_match',
      'job_placement',
      'internship',
      'apprenticeship',
      'volunteer_placement',
      'other'
    ]),

    // Placement details
    placementDate: z.string().datetime(),
    status: z.enum(['active', 'completed', 'terminated', 'on_hold']),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),

    // Mentor/employer details (if applicable)
    mentorId: z.string().uuid().optional(),
    mentorName: z.string().optional(),
    employerId: z.string().optional(),
    employerName: z.string().optional(),

    // Job/position details (for job placements)
    jobTitle: z.string().optional(),
    jobDescription: z.string().optional(),
    jobLevel: z.enum(['entry', 'mid', 'senior', 'executive']).optional(),
    industry: z.string().optional(),
    salary: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      currency: z.string().length(3),
    }).optional(),

    // Mentorship details (for mentorship placements)
    focusAreas: z.array(z.string()).optional(),
    goalsSet: z.array(z.string()).optional(),
    meetingFrequency: z.enum(['weekly', 'biweekly', 'monthly', 'as_needed']).optional(),

    // Outcomes
    outcome: z.object({
      successful: z.boolean().optional(),
      completionReason: z.string().optional(),
      feedback: z.string().optional(),
      rating: z.number().min(1).max(5).optional(),
    }).optional(),

    // Hours/duration
    totalHours: z.number().min(0).optional(),
    sessionsCompleted: z.number().int().min(0).optional(),

    // SDG alignment
    sdgGoals: z.array(z.number().int().min(1).max(17)).optional(),

    // Metadata
    tags: z.array(z.string()).optional(),
    location: z.object({
      country: z.string().optional(),
      city: z.string().optional(),
      remote: z.boolean().optional(),
    }).optional(),
  }),
});

export type PlacementEvent = z.infer<typeof PlacementEventSchema>;

/**
 * Factory function to create a PlacementEvent
 */
export function createPlacementEvent(
  data: z.infer<typeof PlacementEventSchema>['data'],
  metadata?: {
    correlationId?: string;
    causationId?: string;
    [key: string]: unknown;
  }
): PlacementEvent {
  return {
    id: crypto.randomUUID(),
    version: 'v1',
    timestamp: new Date().toISOString(),
    type: 'ingest.placement.created',
    correlationId: metadata?.correlationId,
    causationId: metadata?.causationId,
    metadata,
    data,
  };
}
