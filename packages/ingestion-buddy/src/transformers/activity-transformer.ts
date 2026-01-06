/**
 * Activity Transformer - Buddy Program Activities → CSR Activities
 *
 * Transforms Buddy events, skill sessions, and check-ins into CSR volunteer activities
 * with VIS hour type classification and weighted hours calculation.
 *
 * @module ingestion-buddy/transformers/activity-transformer
 * @agent Agent 11 (buddy-transformer-activities)
 */

import { createServiceLogger } from '@teei/shared-utils';
import {
  calculateVISHours,
  aggregateVISHours,
  type BuddyActivity,
  type VISHourResult,
  type VISHourType,
} from '../utils/activity-taxonomy';
import type {
  BuddyEvent,
  EventAttendance,
  SkillSession,
  Checkin,
} from '../validators/schemas';

const logger = createServiceLogger('ingestion-buddy:activity-transformer');

/**
 * CSR activity record (for volunteer_activities table)
 */
export interface CsrActivity {
  volunteerId: string;          // CSR user ID
  programId: string;             // Buddy Program ID
  activityType: string;          // 'event' | 'skill_session' | 'checkin'
  activityDate: string;          // ISO 8601 timestamp
  durationMinutes: number;       // Actual duration
  hourType: VISHourType;         // VIS hour classification
  weightedHours: number;         // VIS weighted hours
  rawHours: number;              // Unweighted hours
  weightMultiplier: number;      // VIS weight applied
  description: string;           // Human-readable activity description
  metadata: Record<string, any>; // Original Buddy data
  reasoning: string;             // VIS classification reasoning
}

/**
 * Activity transformation result
 */
export interface ActivityTransformResult {
  activities: CsrActivity[];
  stats: {
    totalActivities: number;
    byType: Record<string, number>;
    byHourType: Record<VISHourType, number>;
    totalRawHours: number;
    totalWeightedHours: number;
  };
  errors: Array<{
    sourceId: string;
    sourceType: string;
    error: string;
  }>;
}

/**
 * Transform formal Buddy event + attendance into CSR activities
 *
 * Creates one activity record per attendee (volunteer).
 *
 * @param event - Validated Buddy event
 * @param attendance - Attendance records for this event
 * @param userIdMapping - Map of Buddy user ID → CSR user ID
 * @param programId - Buddy Program ID in CSR system
 * @returns Array of CSR activities (one per volunteer attendee)
 */
export function transformEvent(
  event: BuddyEvent,
  attendance: EventAttendance[],
  userIdMapping: Map<string, string>,
  programId: string
): CsrActivity[] {
  const activities: CsrActivity[] = [];

  logger.debug(
    { eventId: event.event_id, attendanceCount: attendance.length },
    'Transforming Buddy event to CSR activities'
  );

  for (const attendanceRecord of attendance) {
    const csrUserId = userIdMapping.get(attendanceRecord.user_id);

    if (!csrUserId) {
      logger.warn(
        { eventId: event.event_id, buddyUserId: attendanceRecord.user_id },
        'Skipping attendance: user not found in mapping (not a volunteer?)'
      );
      continue;
    }

    // Build BuddyActivity for VIS classification
    const buddyActivity: BuddyActivity = {
      activityType: 'event',
      eventType: event.event_type,
      durationMinutes: attendanceRecord.duration_minutes || event.duration_minutes || undefined,
      isOrganizer: attendanceRecord.is_organizer || false,
    };

    // Calculate VIS hours
    const visHours = calculateVISHours(buddyActivity);

    // Build description
    const description = attendanceRecord.is_organizer
      ? `Organized "${event.event_name}" (${event.event_type})`
      : `Attended "${event.event_name}" (${event.event_type})`;

    activities.push({
      volunteerId: csrUserId,
      programId,
      activityType: 'event',
      activityDate: attendanceRecord.attended_at,
      durationMinutes: visHours.rawHours * 60,
      hourType: visHours.hourType,
      weightedHours: visHours.weightedHours,
      rawHours: visHours.rawHours,
      weightMultiplier: visHours.weightMultiplier,
      description,
      metadata: {
        buddy_event_id: event.event_id,
        buddy_attendance_id: attendanceRecord.attendance_id,
        event_name: event.event_name,
        event_type: event.event_type,
        is_organizer: attendanceRecord.is_organizer,
        location: event.location,
        is_virtual: event.is_virtual,
      },
      reasoning: visHours.reasoning,
    });
  }

  logger.debug(
    { eventId: event.event_id, activitiesCreated: activities.length },
    'Event transformation complete'
  );

  return activities;
}

/**
 * Transform skill exchange session into CSR activities
 *
 * Creates activities for both teacher (volunteer) and learner (if also volunteer).
 *
 * @param session - Validated skill session
 * @param userIdMapping - Map of Buddy user ID → CSR user ID
 * @param programId - Buddy Program ID
 * @returns Array of CSR activities (teacher + learner if both volunteers)
 */
export function transformSkillSession(
  session: SkillSession,
  userIdMapping: Map<string, string>,
  programId: string
): CsrActivity[] {
  const activities: CsrActivity[] = [];

  logger.debug(
    { sessionId: session.session_id, skillCategory: session.skill_category },
    'Transforming skill session to CSR activities'
  );

  // Teacher activity (always create if teacher is volunteer)
  const teacherCsrId = userIdMapping.get(session.teacher_id);
  if (teacherCsrId) {
    const buddyActivity: BuddyActivity = {
      activityType: 'skill_session',
      skillCategory: session.skill_category,
      durationMinutes: session.duration_minutes || undefined,
    };

    const visHours = calculateVISHours(buddyActivity);

    activities.push({
      volunteerId: teacherCsrId,
      programId,
      activityType: 'skill_session_teach',
      activityDate: session.session_date,
      durationMinutes: visHours.rawHours * 60,
      hourType: visHours.hourType,
      weightedHours: visHours.weightedHours,
      rawHours: visHours.rawHours,
      weightMultiplier: visHours.weightMultiplier,
      description: `Taught "${session.skill_name}" (${session.skill_category})`,
      metadata: {
        buddy_session_id: session.session_id,
        skill_name: session.skill_name,
        skill_category: session.skill_category,
        skill_level: session.skill_level,
        learner_rating: session.learner_rating,
        learner_progress: session.learner_progress,
        session_number: session.session_number,
      },
      reasoning: visHours.reasoning,
    });
  }

  // Learner activity (only if learner is also a volunteer - e.g., peer learning)
  const learnerCsrId = userIdMapping.get(session.learner_id);
  if (learnerCsrId) {
    const buddyActivity: BuddyActivity = {
      activityType: 'skill_session',
      skillCategory: session.skill_category,
      durationMinutes: session.duration_minutes || undefined,
    };

    const visHours = calculateVISHours(buddyActivity);

    activities.push({
      volunteerId: learnerCsrId,
      programId,
      activityType: 'skill_session_learn',
      activityDate: session.session_date,
      durationMinutes: visHours.rawHours * 60,
      hourType: visHours.hourType,
      weightedHours: visHours.weightedHours,
      rawHours: visHours.rawHours,
      weightMultiplier: visHours.weightMultiplier,
      description: `Learned "${session.skill_name}" (${session.skill_category})`,
      metadata: {
        buddy_session_id: session.session_id,
        skill_name: session.skill_name,
        skill_category: session.skill_category,
        skill_level: session.skill_level,
        teacher_rating: session.teacher_rating,
        learner_progress: session.learner_progress,
        session_number: session.session_number,
      },
      reasoning: visHours.reasoning,
    });
  }

  logger.debug(
    { sessionId: session.session_id, activitiesCreated: activities.length },
    'Skill session transformation complete'
  );

  return activities;
}

/**
 * Transform check-in into CSR activity
 *
 * Creates activity for the buddy (volunteer) who conducted the check-in.
 *
 * @param checkin - Validated check-in
 * @param userIdMapping - Map of Buddy user ID → CSR user ID
 * @param programId - Buddy Program ID
 * @returns CSR activity (or null if user not a volunteer)
 */
export function transformCheckin(
  checkin: Checkin,
  userIdMapping: Map<string, string>,
  programId: string
): CsrActivity | null {
  const csrUserId = userIdMapping.get(checkin.user_id);

  if (!csrUserId) {
    logger.debug(
      { checkinId: checkin.checkin_id, buddyUserId: checkin.user_id },
      'Skipping check-in: user not a volunteer'
    );
    return null;
  }

  logger.debug(
    { checkinId: checkin.checkin_id, mood: checkin.mood },
    'Transforming check-in to CSR activity'
  );

  const buddyActivity: BuddyActivity = {
    activityType: 'checkin',
    durationMinutes: checkin.duration_minutes || undefined,
  };

  const visHours = calculateVISHours(buddyActivity);

  return {
    volunteerId: csrUserId,
    programId,
    activityType: 'checkin',
    activityDate: checkin.checkin_date,
    durationMinutes: visHours.rawHours * 60,
    hourType: visHours.hourType,
    weightedHours: visHours.weightedHours,
    rawHours: visHours.rawHours,
    weightMultiplier: visHours.weightMultiplier,
    description: `Buddy check-in (mood: ${checkin.mood})`,
    metadata: {
      buddy_checkin_id: checkin.checkin_id,
      buddy_match_id: checkin.match_id,
      mood: checkin.mood,
      support_needed: checkin.support_needed,
      notes: checkin.notes,
    },
    reasoning: visHours.reasoning,
  };
}

/**
 * Transform batch of Buddy activities (events, skills, check-ins)
 *
 * @param data - Validated activity data
 * @param userIdMapping - Buddy user ID → CSR user ID
 * @param programId - Buddy Program ID
 * @returns Transformation result with stats
 */
export function transformActivitiesBatch(
  data: {
    events: BuddyEvent[];
    eventAttendance: EventAttendance[];
    skillSessions: SkillSession[];
    checkins: Checkin[];
  },
  userIdMapping: Map<string, string>,
  programId: string
): ActivityTransformResult {
  logger.info(
    {
      events: data.events.length,
      eventAttendance: data.eventAttendance.length,
      skillSessions: data.skillSessions.length,
      checkins: data.checkins.length,
    },
    'Starting batch activity transformation'
  );

  const allActivities: CsrActivity[] = [];
  const errors: Array<{ sourceId: string; sourceType: string; error: string }> = [];

  // Transform events
  const attendanceByEvent = new Map<string, EventAttendance[]>();
  for (const attendance of data.eventAttendance) {
    if (!attendanceByEvent.has(attendance.event_id)) {
      attendanceByEvent.set(attendance.event_id, []);
    }
    attendanceByEvent.get(attendance.event_id)!.push(attendance);
  }

  for (const event of data.events) {
    try {
      const attendance = attendanceByEvent.get(event.event_id) || [];
      const activities = transformEvent(event, attendance, userIdMapping, programId);
      allActivities.push(...activities);
    } catch (err: any) {
      errors.push({
        sourceId: event.event_id,
        sourceType: 'event',
        error: err.message,
      });
    }
  }

  // Transform skill sessions
  for (const session of data.skillSessions) {
    try {
      const activities = transformSkillSession(session, userIdMapping, programId);
      allActivities.push(...activities);
    } catch (err: any) {
      errors.push({
        sourceId: session.session_id,
        sourceType: 'skill_session',
        error: err.message,
      });
    }
  }

  // Transform check-ins
  for (const checkin of data.checkins) {
    try {
      const activity = transformCheckin(checkin, userIdMapping, programId);
      if (activity) {
        allActivities.push(activity);
      }
    } catch (err: any) {
      errors.push({
        sourceId: checkin.checkin_id,
        sourceType: 'checkin',
        error: err.message,
      });
    }
  }

  // Calculate statistics
  const byType: Record<string, number> = {};
  const byHourType: Record<VISHourType, number> = {} as any;
  let totalRawHours = 0;
  let totalWeightedHours = 0;

  for (const activity of allActivities) {
    byType[activity.activityType] = (byType[activity.activityType] || 0) + 1;
    byHourType[activity.hourType] = (byHourType[activity.hourType] || 0) + 1;
    totalRawHours += activity.rawHours;
    totalWeightedHours += activity.weightedHours;
  }

  const result: ActivityTransformResult = {
    activities: allActivities,
    stats: {
      totalActivities: allActivities.length,
      byType,
      byHourType,
      totalRawHours,
      totalWeightedHours,
    },
    errors,
  };

  logger.info(
    {
      totalActivities: allActivities.length,
      totalRawHours: totalRawHours.toFixed(2),
      totalWeightedHours: totalWeightedHours.toFixed(2),
      errorCount: errors.length,
    },
    'Batch activity transformation complete'
  );

  return result;
}

/**
 * Summarize activity transformations
 */
export function summarizeActivityTransformations(
  result: ActivityTransformResult
): string {
  const lines: string[] = [
    '--- Activity Transformation Summary ---',
    '',
    `Total Activities: ${result.stats.totalActivities}`,
    '',
    'By Activity Type:',
  ];

  for (const [type, count] of Object.entries(result.stats.byType)) {
    lines.push(`  - ${type}: ${count}`);
  }

  lines.push('');
  lines.push('By VIS Hour Type:');
  for (const [hourType, count] of Object.entries(result.stats.byHourType)) {
    lines.push(`  - ${hourType}: ${count}`);
  }

  lines.push('');
  lines.push(`Total Raw Hours: ${result.stats.totalRawHours.toFixed(2)}`);
  lines.push(`Total Weighted Hours (VIS): ${result.stats.totalWeightedHours.toFixed(2)}`);
  lines.push('');

  if (result.errors.length > 0) {
    lines.push('Errors:');
    for (const error of result.errors) {
      lines.push(`  - ${error.sourceType} ${error.sourceId}: ${error.error}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
