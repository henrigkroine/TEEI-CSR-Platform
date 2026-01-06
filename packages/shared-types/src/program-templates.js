import { z } from 'zod';
/**
 * Program Templates Types & Validation
 *
 * SWARM 6: Beneficiary Groups, Campaigns & Monetization
 * Reusable program formats for mentorship, language, buddy, upskilling, and weei programs
 *
 * @see /packages/shared-schema/src/schema/program-templates.ts
 * @see /docs/PROGRAM_TEMPLATES_GUIDE.md
 */
// ============================================================================
// ENUMS (matching database enums)
// ============================================================================
export const ProgramTypeEnum = z.enum([
    'mentorship',
    'language',
    'buddy',
    'upskilling',
    'weei'
]);
// ============================================================================
// CONFIG TYPES (JSONB fields - program-specific)
// ============================================================================
/**
 * Mentorship Program Configuration
 */
export const MentorshipConfigSchema = z.object({
    sessionFormat: z.enum(['1-on-1', 'group', 'hybrid']),
    sessionDuration: z.number().int().min(15).max(480), // minutes (15min - 8hrs)
    sessionFrequency: z.enum(['weekly', 'bi-weekly', 'monthly', 'flexible']),
    totalDuration: z.number().int().min(1).max(104), // weeks (1 week - 2 years)
    totalSessionsRecommended: z.number().int().min(1).optional(),
    // Matching
    matchingCriteria: z.array(z.string()),
    autoMatching: z.boolean(),
    // Focus areas
    focusAreas: z.array(z.string()),
    // Outcomes tracked
    outcomesTracked: z.array(z.string()),
    // Requirements
    mentorRequirements: z.object({
        minExperience: z.number().int().min(0).optional(),
        industries: z.array(z.string()).optional(),
        languages: z.array(z.string()).optional(),
        certifications: z.array(z.string()).optional(),
    }).optional(),
    // Support materials
    onboardingMaterialsUrl: z.string().url().optional(),
    sessionGuidelinesUrl: z.string().url().optional(),
});
/**
 * Language Program Configuration
 */
export const LanguageConfigSchema = z.object({
    // Class structure
    classSizeMin: z.number().int().min(1).max(50),
    classSizeMax: z.number().int().min(1).max(50),
    sessionDuration: z.number().int().min(30).max(480), // minutes
    sessionsPerWeek: z.number().int().min(1).max(7),
    totalWeeks: z.number().int().min(1).max(104),
    // Proficiency
    proficiencyLevels: z.array(z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])),
    targetLanguages: z.array(z.string().length(2)), // ISO 639-1 codes
    // Delivery
    deliveryMode: z.enum(['in-person', 'online', 'hybrid']),
    platform: z.string().optional(),
    // Curriculum
    curriculumFocus: z.array(z.string()),
    assessmentFrequency: z.enum(['weekly', 'bi-weekly', 'monthly', 'end-of-course']),
    certificationOffered: z.boolean(),
    // Materials
    textbookRequired: z.boolean(),
    textbookTitle: z.string().optional(),
    materialsUrl: z.string().url().optional(),
}).refine((data) => data.classSizeMin <= data.classSizeMax, {
    message: "Minimum class size must be less than or equal to maximum",
    path: ["classSizeMin"],
});
/**
 * Buddy Program Configuration
 */
export const BuddyConfigSchema = z.object({
    // Matching
    matchMethod: z.enum(['skill_based', 'random', 'interest_based', 'manual']),
    pairDuration: z.number().int().min(1).max(104), // weeks
    allowGroupBuddies: z.boolean(),
    maxBuddiesPerVolunteer: z.number().int().min(1).max(10).optional(),
    // Check-ins
    checkInFrequency: z.enum(['weekly', 'bi-weekly', 'monthly']),
    checkInFormat: z.enum(['survey', 'call', 'meeting', 'flexible']),
    requiredCheckIns: z.number().int().min(1),
    // Activities
    suggestedActivities: z.array(z.string()),
    mandatoryActivities: z.array(z.string()).optional(),
    activityTracking: z.boolean(),
    // Goals
    primaryGoals: z.array(z.string()),
    // Support
    buddyTrainingRequired: z.boolean(),
    buddyTrainingUrl: z.string().url().optional(),
    ongoingSupportUrl: z.string().url().optional(),
});
/**
 * Upskilling Program Configuration
 */
export const UpskillingConfigSchema = z.object({
    // Platforms
    coursePlatforms: z.array(z.enum(['linkedin_learning', 'coursera', 'udemy', 'pluralsight', 'custom'])),
    platformUrls: z.record(z.string(), z.string().url()).optional(),
    // Tracks
    skillTracks: z.array(z.string()),
    difficultyLevels: z.array(z.enum(['beginner', 'intermediate', 'advanced'])),
    // Requirements
    certificationRequired: z.boolean(),
    certificationProvider: z.string().optional(),
    minimumCompletionRate: z.number().min(0).max(100), // percentage
    timeToComplete: z.number().int().min(1).max(104), // weeks
    // Progress
    milestones: z.array(z.string()),
    progressTrackingFrequency: z.enum(['weekly', 'bi-weekly', 'monthly']),
    // Support
    mentorSupport: z.boolean(),
    peerGroupsEnabled: z.boolean(),
    officeHoursUrl: z.string().url().optional(),
    // Budget
    maxCostPerParticipant: z.number().min(0).optional(),
    stipendProvided: z.boolean(),
    stipendAmount: z.number().min(0).optional(),
});
/**
 * WEEI (Work Experience & Employment Integration) Configuration
 */
export const WeeiConfigSchema = z.object({
    // Program type
    programType: z.enum(['internship', 'apprenticeship', 'job_placement', 'work_experience', 'mixed']),
    duration: z.number().int().min(1).max(104), // weeks
    hoursPerWeek: z.number().min(1).max(80),
    // Placement
    placementType: z.enum(['internal', 'external_partner', 'mixed']),
    partnerOrganizations: z.array(z.string()).optional(),
    industries: z.array(z.string()),
    // Skills
    skillsRequired: z.array(z.string()),
    skillsDeveloped: z.array(z.string()),
    // Support
    jobCoachProvided: z.boolean(),
    jobCoachHours: z.number().min(0).optional(),
    cvReviewProvided: z.boolean(),
    interviewPrepProvided: z.boolean(),
    // Outcomes
    targetOutcomes: z.array(z.string()),
    successMetrics: z.array(z.string()),
    // Compensation
    compensated: z.boolean(),
    compensationAmount: z.number().min(0).optional(),
    compensationType: z.enum(['hourly', 'monthly', 'stipend']).optional(),
});
/**
 * Union schema for all config types
 */
export const ProgramTemplateConfigSchema = z.union([
    MentorshipConfigSchema,
    LanguageConfigSchema,
    BuddyConfigSchema,
    UpskillingConfigSchema,
    WeeiConfigSchema,
]);
// ============================================================================
// API SCHEMAS (for requests/responses)
// ============================================================================
/**
 * Create program template request
 */
export const CreateProgramTemplateSchema = z.object({
    // Required fields
    name: z.string()
        .min(1, "Template name is required")
        .max(255, "Template name must be 255 characters or less"),
    programType: ProgramTypeEnum,
    defaultConfig: ProgramTemplateConfigSchema,
    outcomeMetrics: z.array(z.string())
        .min(1, "At least one outcome metric is required"),
    // Optional fields
    description: z.string().max(5000).optional(),
    version: z.string().max(20).default('1.0.0'),
    defaultMinParticipants: z.number().int().min(1).max(10000).default(1),
    defaultMaxParticipants: z.number().int().min(1).max(100000).default(50),
    defaultVolunteersNeeded: z.number().int().min(1).max(10000).default(1),
    suitableForGroups: z.array(z.string()).default([]),
    estimatedCostPerParticipant: z.number().min(0).optional(),
    estimatedHoursPerVolunteer: z.number().min(0).optional(),
    isActive: z.boolean().default(true),
    isPublic: z.boolean().default(true),
    tags: z.array(z.string().max(50)).max(20).default([]),
}).refine((data) => data.defaultMinParticipants <= data.defaultMaxParticipants, {
    message: "Minimum participants must be less than or equal to maximum",
    path: ["defaultMinParticipants"],
});
/**
 * Update program template request
 */
export const UpdateProgramTemplateSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).optional(),
    version: z.string().max(20).optional(),
    defaultConfig: ProgramTemplateConfigSchema.optional(),
    defaultMinParticipants: z.number().int().min(1).max(10000).optional(),
    defaultMaxParticipants: z.number().int().min(1).max(100000).optional(),
    defaultVolunteersNeeded: z.number().int().min(1).max(10000).optional(),
    outcomeMetrics: z.array(z.string()).optional(),
    suitableForGroups: z.array(z.string()).optional(),
    estimatedCostPerParticipant: z.number().min(0).optional(),
    estimatedHoursPerVolunteer: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    // Deprecation
    deprecatedAt: z.string().datetime().optional(),
    supersededBy: z.string().uuid().optional(),
}).refine((data) => {
    if (data.defaultMinParticipants !== undefined && data.defaultMaxParticipants !== undefined) {
        return data.defaultMinParticipants <= data.defaultMaxParticipants;
    }
    return true;
}, {
    message: "Minimum participants must be less than or equal to maximum",
    path: ["defaultMinParticipants"],
});
/**
 * Filter/search program templates
 */
export const FilterProgramTemplatesSchema = z.object({
    programType: ProgramTypeEnum.optional(),
    isActive: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    suitableForGroups: z.array(z.string()).optional(),
    search: z.string().max(255).optional(),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
    sortBy: z.enum(['name', 'programType', 'version', 'createdAt', 'updatedAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
/**
 * Program template response (from database)
 */
export const ProgramTemplateSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    // Classification
    programType: ProgramTypeEnum,
    version: z.string(),
    // Configuration
    defaultConfig: z.any(), // Typed as any in response, use type guards to narrow
    // Capacity
    defaultMinParticipants: z.number().int(),
    defaultMaxParticipants: z.number().int(),
    defaultVolunteersNeeded: z.number().int(),
    // Outcomes
    outcomeMetrics: z.array(z.string()),
    // Eligibility
    suitableForGroups: z.array(z.string()),
    // Monetization hints
    estimatedCostPerParticipant: z.string().nullable(),
    estimatedHoursPerVolunteer: z.string().nullable(),
    // Visibility
    isActive: z.boolean(),
    isPublic: z.boolean(),
    // Ownership
    createdBy: z.string().uuid().nullable(),
    // Metadata
    tags: z.array(z.string()),
    // Audit
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    // Deprecation
    deprecatedAt: z.string().datetime().nullable(),
    supersededBy: z.string().uuid().nullable(),
});
/**
 * Paginated response
 */
export const ProgramTemplatesResponseSchema = z.object({
    templates: z.array(ProgramTemplateSchema),
    pagination: z.object({
        total: z.number().int(),
        limit: z.number().int(),
        offset: z.number().int(),
        hasMore: z.boolean(),
    }),
});
// ============================================================================
// TYPE GUARDS
// ============================================================================
/**
 * Type guard for mentorship config
 */
export function isMentorshipConfig(config) {
    return config && 'sessionFormat' in config && 'matchingCriteria' in config;
}
/**
 * Type guard for language config
 */
export function isLanguageConfig(config) {
    return config && 'classSizeMin' in config && 'proficiencyLevels' in config;
}
/**
 * Type guard for buddy config
 */
export function isBuddyConfig(config) {
    return config && 'matchMethod' in config && 'checkInFrequency' in config;
}
/**
 * Type guard for upskilling config
 */
export function isUpskillingConfig(config) {
    return config && 'coursePlatforms' in config && 'skillTracks' in config;
}
/**
 * Type guard for weei config
 */
export function isWeeiConfig(config) {
    return config && 'programType' in config && 'placementType' in config;
}
/**
 * Get config by program type
 */
export function getConfigByType(template) {
    return template.defaultConfig;
}
/**
 * Check if template is deprecated
 */
export function isTemplateDeprecated(template) {
    return template.deprecatedAt !== null;
}
/**
 * Check if template is active and available
 */
export function isTemplateAvailable(template) {
    return template.isActive && !isTemplateDeprecated(template);
}
/**
 * Check if template is suitable for beneficiary group
 */
export function isTemplateSuitableForGroup(template, groupTags) {
    if (template.suitableForGroups.length === 0) {
        return true; // No restrictions
    }
    return template.suitableForGroups.some(tag => groupTags.includes(tag));
}
//# sourceMappingURL=program-templates.js.map