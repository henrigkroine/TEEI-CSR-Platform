import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

/**
 * Enrollment Event - normalized from internal TEEI systems (Language, Mentorship, Upskilling)
 * Represents a user enrolling in a program or course
 */
export const EnrollmentEventSchema = BaseEventSchema.extend({
  type: z.literal('ingest.enrollment.created'),
  data: z.object({
    // Source tracking
    sourceSystem: z.enum(['kintell', 'upskilling', 'mentorship', 'manual']),
    sourceId: z.string(), // Enrollment ID in source system
    sourceTenantId: z.string().optional(),

    // User details
    userId: z.string().uuid(), // TEEI user ID
    companyId: z.string().uuid(), // TEEI company ID

    // Program details
    programType: z.enum([
      'language_course',
      'upskilling_course',
      'mentorship_program',
      'buddy_program',
      'certification_program',
      'other'
    ]),
    programId: z.string(),
    programName: z.string(),
    programDescription: z.string().optional(),

    // Enrollment details
    enrollmentDate: z.string().datetime(),
    status: z.enum(['enrolled', 'in_progress', 'completed', 'withdrawn', 'failed']),
    completionDate: z.string().datetime().optional(),
    completionPercentage: z.number().min(0).max(100).optional(),

    // Outcomes (if completed)
    outcome: z.object({
      passed: z.boolean().optional(),
      score: z.number().min(0).max(100).optional(),
      grade: z.string().optional(),
      certificateIssued: z.boolean().optional(),
      certificateId: z.string().optional(),
    }).optional(),

    // Hours/effort
    hoursCompleted: z.number().min(0).optional(),
    estimatedHours: z.number().min(0).optional(),

    // SDG alignment
    sdgGoals: z.array(z.number().int().min(1).max(17)).optional(),

    // Metadata
    tags: z.array(z.string()).optional(),
    cohortId: z.string().optional(),
    instructorId: z.string().optional(),
  }),
});

export type EnrollmentEvent = z.infer<typeof EnrollmentEventSchema>;

/**
 * Factory function to create an EnrollmentEvent
 */
export function createEnrollmentEvent(
  data: z.infer<typeof EnrollmentEventSchema>['data'],
  metadata?: {
    correlationId?: string;
    causationId?: string;
    [key: string]: unknown;
  }
): EnrollmentEvent {
  return {
    id: crypto.randomUUID(),
    version: 'v1',
    timestamp: new Date().toISOString(),
    type: 'ingest.enrollment.created',
    correlationId: metadata?.correlationId,
    causationId: metadata?.causationId,
    metadata,
    data,
  };
}
