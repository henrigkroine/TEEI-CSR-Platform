/**
 * Demo event generators
 *
 * Generates realistic synthetic events for demo tenants
 */

import { createMaskingContext, maskName, maskEmail, maskCompanyName, generateDeterministicHash, hashToSeed } from '@teei/data-masker';
import type { SeedContext, GeneratedEvent } from './types.js';
import {
  generateTimestamps,
  volunteerTimeDistribution,
  donationTimeDistribution,
  sessionTimeDistribution,
  enrollmentTimeDistribution,
  placementTimeDistribution,
} from './time-utils.js';

/**
 * Generate volunteer events with realistic patterns
 */
export function generateVolunteerEvents(
  context: SeedContext,
  count: number
): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];
  const distribution = volunteerTimeDistribution(
    context.timeDistribution.startDate,
    context.timeDistribution.endDate
  );

  const hash = generateDeterministicHash(context.tenantId, 'volunteer-seed', context.salt);
  const seed = hashToSeed(hash);
  const timestamps = generateTimestamps(count, distribution, seed);

  for (let i = 0; i < count; i++) {
    const userKey = `vol-user-${(seed + i) % 100}`;
    const orgKey = `vol-org-${(seed + i) % 20}`;
    const maskingCtx = createMaskingContext(context.tenantId, userKey, 'en', context.salt);
    const orgMaskingCtx = createMaskingContext(context.tenantId, orgKey, 'en', context.salt);

    // Determine region based on distribution
    const regionIndex = (seed + i) % context.regions.length;
    const region = context.regions[regionIndex].region;

    // Generate hours based on seed
    const hours = 2 + ((seed + i * 7) % 8); // 2-10 hours

    events.push({
      id: `demo-vol-${context.tenantId}-${i}`,
      tenantId: context.tenantId,
      type: 'volunteer',
      timestamp: timestamps[i].toISOString(),
      region,
      payload: {
        userId: userKey,
        userName: maskName('User Name', maskingCtx),
        userEmail: maskEmail('user@example.com', maskingCtx),
        organizationId: orgKey,
        organizationName: maskCompanyName('Organization', orgMaskingCtx),
        eventType: getVolunteerEventType(seed + i),
        hours,
        category: getVolunteerCategory(seed + i, context.vertical),
        skills: getVolunteerSkills(seed + i, context.vertical),
        impactDescription: `Contributed ${hours} hours to ${getVolunteerCategory(seed + i, context.vertical)} initiatives`,
      },
      metadata: {
        generated: true,
        generator: 'volunteerEventsGenerator',
        version: '1.0.0',
      },
    });
  }

  return events;
}

/**
 * Generate donation events
 */
export function generateDonationEvents(
  context: SeedContext,
  count: number
): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];
  const distribution = donationTimeDistribution(
    context.timeDistribution.startDate,
    context.timeDistribution.endDate
  );

  const hash = generateDeterministicHash(context.tenantId, 'donation-seed', context.salt);
  const seed = hashToSeed(hash);
  const timestamps = generateTimestamps(count, distribution, seed);

  for (let i = 0; i < count; i++) {
    const userKey = `don-user-${(seed + i) % 100}`;
    const causeKey = `cause-${(seed + i) % 15}`;
    const maskingCtx = createMaskingContext(context.tenantId, userKey, 'en', context.salt);
    const causeMaskingCtx = createMaskingContext(context.tenantId, causeKey, 'en', context.salt);

    const regionIndex = (seed + i) % context.regions.length;
    const region = context.regions[regionIndex].region;

    // Generate amount based on seed (25-5000)
    const amount = 25 + ((seed + i * 13) % 4975);

    events.push({
      id: `demo-don-${context.tenantId}-${i}`,
      tenantId: context.tenantId,
      type: 'donation',
      timestamp: timestamps[i].toISOString(),
      region,
      payload: {
        userId: userKey,
        userName: maskName('User Name', maskingCtx),
        userEmail: maskEmail('user@example.com', maskingCtx),
        causeId: causeKey,
        causeName: maskCompanyName('Cause', causeMaskingCtx),
        amount,
        currency: getCurrencyForRegion(region),
        donationType: getDonationType(seed + i),
        recurring: (seed + i) % 5 === 0,
        matched: (seed + i) % 3 === 0,
      },
      metadata: {
        generated: true,
        generator: 'donationEventsGenerator',
        version: '1.0.0',
      },
    });
  }

  return events;
}

/**
 * Generate learning session events
 */
export function generateSessionEvents(
  context: SeedContext,
  count: number
): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];
  const distribution = sessionTimeDistribution(
    context.timeDistribution.startDate,
    context.timeDistribution.endDate
  );

  const hash = generateDeterministicHash(context.tenantId, 'session-seed', context.salt);
  const seed = hashToSeed(hash);
  const timestamps = generateTimestamps(count, distribution, seed);

  for (let i = 0; i < count; i++) {
    const userKey = `sess-user-${(seed + i) % 100}`;
    const courseKey = `course-${(seed + i) % 25}`;
    const maskingCtx = createMaskingContext(context.tenantId, userKey, 'en', context.salt);

    const regionIndex = (seed + i) % context.regions.length;
    const region = context.regions[regionIndex].region;

    // Session duration: 30-180 minutes
    const durationMins = 30 + ((seed + i * 11) % 150);

    events.push({
      id: `demo-sess-${context.tenantId}-${i}`,
      tenantId: context.tenantId,
      type: 'session',
      timestamp: timestamps[i].toISOString(),
      region,
      payload: {
        userId: userKey,
        userName: maskName('User Name', maskingCtx),
        userEmail: maskEmail('user@example.com', maskingCtx),
        courseId: courseKey,
        courseName: getCourseName(seed + i, context.vertical),
        durationMinutes: durationMins,
        completed: (seed + i) % 4 !== 0, // 75% completion rate
        score: (seed + i) % 4 !== 0 ? 60 + ((seed + i) % 40) : null,
        category: getCourseCategory(seed + i, context.vertical),
      },
      metadata: {
        generated: true,
        generator: 'sessionEventsGenerator',
        version: '1.0.0',
      },
    });
  }

  return events;
}

/**
 * Generate program enrollment events
 */
export function generateEnrollmentEvents(
  context: SeedContext,
  count: number
): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];
  const distribution = enrollmentTimeDistribution(
    context.timeDistribution.startDate,
    context.timeDistribution.endDate
  );

  const hash = generateDeterministicHash(context.tenantId, 'enrollment-seed', context.salt);
  const seed = hashToSeed(hash);
  const timestamps = generateTimestamps(count, distribution, seed);

  for (let i = 0; i < count; i++) {
    const userKey = `enr-user-${(seed + i) % 100}`;
    const programKey = `program-${(seed + i) % 10}`;
    const maskingCtx = createMaskingContext(context.tenantId, userKey, 'en', context.salt);

    const regionIndex = (seed + i) % context.regions.length;
    const region = context.regions[regionIndex].region;

    events.push({
      id: `demo-enr-${context.tenantId}-${i}`,
      tenantId: context.tenantId,
      type: 'enrollment',
      timestamp: timestamps[i].toISOString(),
      region,
      payload: {
        userId: userKey,
        userName: maskName('User Name', maskingCtx),
        userEmail: maskEmail('user@example.com', maskingCtx),
        programId: programKey,
        programName: getProgramName(seed + i, context.vertical),
        status: 'active',
        startDate: timestamps[i].toISOString(),
        expectedEndDate: new Date(timestamps[i].getTime() + (90 * 24 * 60 * 60 * 1000)).toISOString(),
        cohort: `Q${Math.floor(timestamps[i].getMonth() / 3) + 1}-${timestamps[i].getFullYear()}`,
      },
      metadata: {
        generated: true,
        generator: 'enrollmentEventsGenerator',
        version: '1.0.0',
      },
    });
  }

  return events;
}

/**
 * Generate placement/mentorship events
 */
export function generatePlacementEvents(
  context: SeedContext,
  count: number
): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];
  const distribution = placementTimeDistribution(
    context.timeDistribution.startDate,
    context.timeDistribution.endDate
  );

  const hash = generateDeterministicHash(context.tenantId, 'placement-seed', context.salt);
  const seed = hashToSeed(hash);
  const timestamps = generateTimestamps(count, distribution, seed);

  for (let i = 0; i < count; i++) {
    const menteeKey = `mentee-${(seed + i) % 80}`;
    const mentorKey = `mentor-${(seed + i) % 40}`;
    const menteeMaskingCtx = createMaskingContext(context.tenantId, menteeKey, 'en', context.salt);
    const mentorMaskingCtx = createMaskingContext(context.tenantId, mentorKey, 'en', context.salt);

    const regionIndex = (seed + i) % context.regions.length;
    const region = context.regions[regionIndex].region;

    events.push({
      id: `demo-plc-${context.tenantId}-${i}`,
      tenantId: context.tenantId,
      type: 'placement',
      timestamp: timestamps[i].toISOString(),
      region,
      payload: {
        menteeId: menteeKey,
        menteeName: maskName('Mentee Name', menteeMaskingCtx),
        menteeEmail: maskEmail('mentee@example.com', menteeMaskingCtx),
        mentorId: mentorKey,
        mentorName: maskName('Mentor Name', mentorMaskingCtx),
        mentorEmail: maskEmail('mentor@example.com', mentorMaskingCtx),
        matchType: getMatchType(seed + i),
        focusArea: getFocusArea(seed + i, context.vertical),
        durationMonths: 6 + ((seed + i) % 7), // 6-12 months
        status: 'matched',
      },
      metadata: {
        generated: true,
        generator: 'placementEventsGenerator',
        version: '1.0.0',
      },
    });
  }

  return events;
}

// Helper functions for realistic data generation

function getVolunteerEventType(seed: number): string {
  const types = ['onsite', 'virtual', 'hybrid', 'skilled', 'board-service'];
  return types[seed % types.length];
}

function getVolunteerCategory(seed: number, vertical: string): string {
  const categories: Record<string, string[]> = {
    technology: ['digital-literacy', 'coding-bootcamp', 'tech-mentorship', 'accessibility'],
    finance: ['financial-literacy', 'microfinance', 'tax-assistance', 'investment-education'],
    healthcare: ['health-screening', 'wellness-program', 'mental-health', 'nutrition'],
    education: ['tutoring', 'mentorship', 'career-guidance', 'stem-program'],
    nonprofit: ['community-service', 'fundraising', 'advocacy', 'capacity-building'],
    default: ['general-service', 'community-support', 'skill-sharing', 'mentorship'],
  };
  const list = categories[vertical] || categories.default;
  return list[seed % list.length];
}

function getVolunteerSkills(seed: number, vertical: string): string[] {
  const skillSets: Record<string, string[][]> = {
    technology: [['coding', 'web-development'], ['data-analysis'], ['project-management'], ['ui-design']],
    finance: [['accounting'], ['financial-planning'], ['budgeting'], ['investment-analysis']],
    healthcare: [['patient-care'], ['health-education'], ['counseling'], ['nutrition']],
    default: [['leadership'], ['communication'], ['teaching'], ['organizing']],
  };
  const sets = skillSets[vertical] || skillSets.default;
  return sets[seed % sets.length];
}

function getDonationType(seed: number): string {
  const types = ['one-time', 'recurring', 'matching', 'fundraiser'];
  return types[seed % types.length];
}

function getCurrencyForRegion(region: string): string {
  const currencies: Record<string, string> = {
    NA: 'USD',
    EU: 'EUR',
    UK: 'GBP',
    APAC: 'USD',
    LATAM: 'USD',
  };
  return currencies[region] || 'USD';
}

function getCourseName(seed: number, vertical: string): string {
  const courses: Record<string, string[]> = {
    technology: ['Advanced JavaScript', 'Cloud Architecture', 'Data Science 101', 'Cybersecurity Fundamentals'],
    finance: ['Corporate Finance', 'Risk Management', 'Investment Strategy', 'Financial Modeling'],
    healthcare: ['Patient Safety', 'Healthcare Leadership', 'Medical Ethics', 'Clinical Research'],
    default: ['Professional Development', 'Leadership Skills', 'Communication Excellence', 'Project Management'],
  };
  const list = courses[vertical] || courses.default;
  return list[seed % list.length];
}

function getCourseCategory(seed: number, vertical: string): string {
  const categories: Record<string, string[]> = {
    technology: ['technical', 'leadership', 'soft-skills', 'certification'],
    finance: ['technical', 'compliance', 'soft-skills', 'certification'],
    healthcare: ['clinical', 'administrative', 'compliance', 'soft-skills'],
    default: ['professional', 'technical', 'leadership', 'soft-skills'],
  };
  const list = categories[vertical] || categories.default;
  return list[seed % list.length];
}

function getProgramName(seed: number, vertical: string): string {
  const programs: Record<string, string[]> = {
    technology: ['Tech Leadership Program', 'Innovation Fellowship', 'Digital Transformation Academy', 'Startup Incubator'],
    finance: ['Financial Leadership Program', 'Executive Finance Track', 'Risk Management Academy', 'Investment Fellowship'],
    healthcare: ['Healthcare Leadership Program', 'Clinical Excellence Track', 'Patient Care Academy', 'Medical Innovation Fellowship'],
    default: ['Leadership Development Program', 'Executive Track', 'Management Academy', 'Professional Fellowship'],
  };
  const list = programs[vertical] || programs.default;
  return list[seed % list.length];
}

function getMatchType(seed: number): string {
  const types = ['career', 'skill-development', 'leadership', 'industry-transition'];
  return types[seed % types.length];
}

function getFocusArea(seed: number, vertical: string): string {
  const areas: Record<string, string[]> = {
    technology: ['technical-growth', 'career-advancement', 'leadership', 'entrepreneurship'],
    finance: ['career-development', 'technical-skills', 'executive-readiness', 'compliance'],
    healthcare: ['clinical-excellence', 'leadership', 'research', 'patient-care'],
    default: ['professional-growth', 'career-advancement', 'leadership', 'skill-development'],
  };
  const list = areas[vertical] || areas.default;
  return list[seed % list.length];
}
