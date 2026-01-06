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
export declare const ProgramTypeEnum: z.ZodEnum<["mentorship", "language", "buddy", "upskilling", "weei"]>;
export type ProgramType = z.infer<typeof ProgramTypeEnum>;
/**
 * Mentorship Program Configuration
 */
export declare const MentorshipConfigSchema: z.ZodObject<{
    sessionFormat: z.ZodEnum<["1-on-1", "group", "hybrid"]>;
    sessionDuration: z.ZodNumber;
    sessionFrequency: z.ZodEnum<["weekly", "bi-weekly", "monthly", "flexible"]>;
    totalDuration: z.ZodNumber;
    totalSessionsRecommended: z.ZodOptional<z.ZodNumber>;
    matchingCriteria: z.ZodArray<z.ZodString, "many">;
    autoMatching: z.ZodBoolean;
    focusAreas: z.ZodArray<z.ZodString, "many">;
    outcomesTracked: z.ZodArray<z.ZodString, "many">;
    mentorRequirements: z.ZodOptional<z.ZodObject<{
        minExperience: z.ZodOptional<z.ZodNumber>;
        industries: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        languages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        certifications: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        minExperience?: number | undefined;
        industries?: string[] | undefined;
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
    }, {
        minExperience?: number | undefined;
        industries?: string[] | undefined;
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
    }>>;
    onboardingMaterialsUrl: z.ZodOptional<z.ZodString>;
    sessionGuidelinesUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sessionFormat: "1-on-1" | "group" | "hybrid";
    sessionDuration: number;
    sessionFrequency: "weekly" | "bi-weekly" | "monthly" | "flexible";
    totalDuration: number;
    matchingCriteria: string[];
    autoMatching: boolean;
    focusAreas: string[];
    outcomesTracked: string[];
    totalSessionsRecommended?: number | undefined;
    mentorRequirements?: {
        minExperience?: number | undefined;
        industries?: string[] | undefined;
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
    } | undefined;
    onboardingMaterialsUrl?: string | undefined;
    sessionGuidelinesUrl?: string | undefined;
}, {
    sessionFormat: "1-on-1" | "group" | "hybrid";
    sessionDuration: number;
    sessionFrequency: "weekly" | "bi-weekly" | "monthly" | "flexible";
    totalDuration: number;
    matchingCriteria: string[];
    autoMatching: boolean;
    focusAreas: string[];
    outcomesTracked: string[];
    totalSessionsRecommended?: number | undefined;
    mentorRequirements?: {
        minExperience?: number | undefined;
        industries?: string[] | undefined;
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
    } | undefined;
    onboardingMaterialsUrl?: string | undefined;
    sessionGuidelinesUrl?: string | undefined;
}>;
export type MentorshipConfig = z.infer<typeof MentorshipConfigSchema>;
/**
 * Language Program Configuration
 */
export declare const LanguageConfigSchema: z.ZodEffects<z.ZodObject<{
    classSizeMin: z.ZodNumber;
    classSizeMax: z.ZodNumber;
    sessionDuration: z.ZodNumber;
    sessionsPerWeek: z.ZodNumber;
    totalWeeks: z.ZodNumber;
    proficiencyLevels: z.ZodArray<z.ZodEnum<["A1", "A2", "B1", "B2", "C1", "C2"]>, "many">;
    targetLanguages: z.ZodArray<z.ZodString, "many">;
    deliveryMode: z.ZodEnum<["in-person", "online", "hybrid"]>;
    platform: z.ZodOptional<z.ZodString>;
    curriculumFocus: z.ZodArray<z.ZodString, "many">;
    assessmentFrequency: z.ZodEnum<["weekly", "bi-weekly", "monthly", "end-of-course"]>;
    certificationOffered: z.ZodBoolean;
    textbookRequired: z.ZodBoolean;
    textbookTitle: z.ZodOptional<z.ZodString>;
    materialsUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sessionDuration: number;
    classSizeMin: number;
    classSizeMax: number;
    sessionsPerWeek: number;
    totalWeeks: number;
    proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
    targetLanguages: string[];
    deliveryMode: "hybrid" | "in-person" | "online";
    curriculumFocus: string[];
    assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
    certificationOffered: boolean;
    textbookRequired: boolean;
    platform?: string | undefined;
    textbookTitle?: string | undefined;
    materialsUrl?: string | undefined;
}, {
    sessionDuration: number;
    classSizeMin: number;
    classSizeMax: number;
    sessionsPerWeek: number;
    totalWeeks: number;
    proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
    targetLanguages: string[];
    deliveryMode: "hybrid" | "in-person" | "online";
    curriculumFocus: string[];
    assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
    certificationOffered: boolean;
    textbookRequired: boolean;
    platform?: string | undefined;
    textbookTitle?: string | undefined;
    materialsUrl?: string | undefined;
}>, {
    sessionDuration: number;
    classSizeMin: number;
    classSizeMax: number;
    sessionsPerWeek: number;
    totalWeeks: number;
    proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
    targetLanguages: string[];
    deliveryMode: "hybrid" | "in-person" | "online";
    curriculumFocus: string[];
    assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
    certificationOffered: boolean;
    textbookRequired: boolean;
    platform?: string | undefined;
    textbookTitle?: string | undefined;
    materialsUrl?: string | undefined;
}, {
    sessionDuration: number;
    classSizeMin: number;
    classSizeMax: number;
    sessionsPerWeek: number;
    totalWeeks: number;
    proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
    targetLanguages: string[];
    deliveryMode: "hybrid" | "in-person" | "online";
    curriculumFocus: string[];
    assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
    certificationOffered: boolean;
    textbookRequired: boolean;
    platform?: string | undefined;
    textbookTitle?: string | undefined;
    materialsUrl?: string | undefined;
}>;
export type LanguageConfig = z.infer<typeof LanguageConfigSchema>;
/**
 * Buddy Program Configuration
 */
export declare const BuddyConfigSchema: z.ZodObject<{
    matchMethod: z.ZodEnum<["skill_based", "random", "interest_based", "manual"]>;
    pairDuration: z.ZodNumber;
    allowGroupBuddies: z.ZodBoolean;
    maxBuddiesPerVolunteer: z.ZodOptional<z.ZodNumber>;
    checkInFrequency: z.ZodEnum<["weekly", "bi-weekly", "monthly"]>;
    checkInFormat: z.ZodEnum<["survey", "call", "meeting", "flexible"]>;
    requiredCheckIns: z.ZodNumber;
    suggestedActivities: z.ZodArray<z.ZodString, "many">;
    mandatoryActivities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    activityTracking: z.ZodBoolean;
    primaryGoals: z.ZodArray<z.ZodString, "many">;
    buddyTrainingRequired: z.ZodBoolean;
    buddyTrainingUrl: z.ZodOptional<z.ZodString>;
    ongoingSupportUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    matchMethod: "skill_based" | "random" | "interest_based" | "manual";
    pairDuration: number;
    allowGroupBuddies: boolean;
    checkInFrequency: "weekly" | "bi-weekly" | "monthly";
    checkInFormat: "flexible" | "survey" | "call" | "meeting";
    requiredCheckIns: number;
    suggestedActivities: string[];
    activityTracking: boolean;
    primaryGoals: string[];
    buddyTrainingRequired: boolean;
    maxBuddiesPerVolunteer?: number | undefined;
    mandatoryActivities?: string[] | undefined;
    buddyTrainingUrl?: string | undefined;
    ongoingSupportUrl?: string | undefined;
}, {
    matchMethod: "skill_based" | "random" | "interest_based" | "manual";
    pairDuration: number;
    allowGroupBuddies: boolean;
    checkInFrequency: "weekly" | "bi-weekly" | "monthly";
    checkInFormat: "flexible" | "survey" | "call" | "meeting";
    requiredCheckIns: number;
    suggestedActivities: string[];
    activityTracking: boolean;
    primaryGoals: string[];
    buddyTrainingRequired: boolean;
    maxBuddiesPerVolunteer?: number | undefined;
    mandatoryActivities?: string[] | undefined;
    buddyTrainingUrl?: string | undefined;
    ongoingSupportUrl?: string | undefined;
}>;
export type BuddyConfig = z.infer<typeof BuddyConfigSchema>;
/**
 * Upskilling Program Configuration
 */
export declare const UpskillingConfigSchema: z.ZodObject<{
    coursePlatforms: z.ZodArray<z.ZodEnum<["linkedin_learning", "coursera", "udemy", "pluralsight", "custom"]>, "many">;
    platformUrls: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    skillTracks: z.ZodArray<z.ZodString, "many">;
    difficultyLevels: z.ZodArray<z.ZodEnum<["beginner", "intermediate", "advanced"]>, "many">;
    certificationRequired: z.ZodBoolean;
    certificationProvider: z.ZodOptional<z.ZodString>;
    minimumCompletionRate: z.ZodNumber;
    timeToComplete: z.ZodNumber;
    milestones: z.ZodArray<z.ZodString, "many">;
    progressTrackingFrequency: z.ZodEnum<["weekly", "bi-weekly", "monthly"]>;
    mentorSupport: z.ZodBoolean;
    peerGroupsEnabled: z.ZodBoolean;
    officeHoursUrl: z.ZodOptional<z.ZodString>;
    maxCostPerParticipant: z.ZodOptional<z.ZodNumber>;
    stipendProvided: z.ZodBoolean;
    stipendAmount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    coursePlatforms: ("custom" | "linkedin_learning" | "coursera" | "udemy" | "pluralsight")[];
    skillTracks: string[];
    difficultyLevels: ("beginner" | "intermediate" | "advanced")[];
    certificationRequired: boolean;
    minimumCompletionRate: number;
    timeToComplete: number;
    milestones: string[];
    progressTrackingFrequency: "weekly" | "bi-weekly" | "monthly";
    mentorSupport: boolean;
    peerGroupsEnabled: boolean;
    stipendProvided: boolean;
    platformUrls?: Record<string, string> | undefined;
    certificationProvider?: string | undefined;
    officeHoursUrl?: string | undefined;
    maxCostPerParticipant?: number | undefined;
    stipendAmount?: number | undefined;
}, {
    coursePlatforms: ("custom" | "linkedin_learning" | "coursera" | "udemy" | "pluralsight")[];
    skillTracks: string[];
    difficultyLevels: ("beginner" | "intermediate" | "advanced")[];
    certificationRequired: boolean;
    minimumCompletionRate: number;
    timeToComplete: number;
    milestones: string[];
    progressTrackingFrequency: "weekly" | "bi-weekly" | "monthly";
    mentorSupport: boolean;
    peerGroupsEnabled: boolean;
    stipendProvided: boolean;
    platformUrls?: Record<string, string> | undefined;
    certificationProvider?: string | undefined;
    officeHoursUrl?: string | undefined;
    maxCostPerParticipant?: number | undefined;
    stipendAmount?: number | undefined;
}>;
export type UpskillingConfig = z.infer<typeof UpskillingConfigSchema>;
/**
 * WEEI (Work Experience & Employment Integration) Configuration
 */
export declare const WeeiConfigSchema: z.ZodObject<{
    programType: z.ZodEnum<["internship", "apprenticeship", "job_placement", "work_experience", "mixed"]>;
    duration: z.ZodNumber;
    hoursPerWeek: z.ZodNumber;
    placementType: z.ZodEnum<["internal", "external_partner", "mixed"]>;
    partnerOrganizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    industries: z.ZodArray<z.ZodString, "many">;
    skillsRequired: z.ZodArray<z.ZodString, "many">;
    skillsDeveloped: z.ZodArray<z.ZodString, "many">;
    jobCoachProvided: z.ZodBoolean;
    jobCoachHours: z.ZodOptional<z.ZodNumber>;
    cvReviewProvided: z.ZodBoolean;
    interviewPrepProvided: z.ZodBoolean;
    targetOutcomes: z.ZodArray<z.ZodString, "many">;
    successMetrics: z.ZodArray<z.ZodString, "many">;
    compensated: z.ZodBoolean;
    compensationAmount: z.ZodOptional<z.ZodNumber>;
    compensationType: z.ZodOptional<z.ZodEnum<["hourly", "monthly", "stipend"]>>;
}, "strip", z.ZodTypeAny, {
    industries: string[];
    duration: number;
    programType: "internship" | "apprenticeship" | "job_placement" | "work_experience" | "mixed";
    hoursPerWeek: number;
    placementType: "mixed" | "internal" | "external_partner";
    skillsRequired: string[];
    skillsDeveloped: string[];
    jobCoachProvided: boolean;
    cvReviewProvided: boolean;
    interviewPrepProvided: boolean;
    targetOutcomes: string[];
    successMetrics: string[];
    compensated: boolean;
    partnerOrganizations?: string[] | undefined;
    jobCoachHours?: number | undefined;
    compensationAmount?: number | undefined;
    compensationType?: "monthly" | "hourly" | "stipend" | undefined;
}, {
    industries: string[];
    duration: number;
    programType: "internship" | "apprenticeship" | "job_placement" | "work_experience" | "mixed";
    hoursPerWeek: number;
    placementType: "mixed" | "internal" | "external_partner";
    skillsRequired: string[];
    skillsDeveloped: string[];
    jobCoachProvided: boolean;
    cvReviewProvided: boolean;
    interviewPrepProvided: boolean;
    targetOutcomes: string[];
    successMetrics: string[];
    compensated: boolean;
    partnerOrganizations?: string[] | undefined;
    jobCoachHours?: number | undefined;
    compensationAmount?: number | undefined;
    compensationType?: "monthly" | "hourly" | "stipend" | undefined;
}>;
export type WeeiConfig = z.infer<typeof WeeiConfigSchema>;
/**
 * Union schema for all config types
 */
export declare const ProgramTemplateConfigSchema: z.ZodUnion<[z.ZodObject<{
    sessionFormat: z.ZodEnum<["1-on-1", "group", "hybrid"]>;
    sessionDuration: z.ZodNumber;
    sessionFrequency: z.ZodEnum<["weekly", "bi-weekly", "monthly", "flexible"]>;
    totalDuration: z.ZodNumber;
    totalSessionsRecommended: z.ZodOptional<z.ZodNumber>;
    matchingCriteria: z.ZodArray<z.ZodString, "many">;
    autoMatching: z.ZodBoolean;
    focusAreas: z.ZodArray<z.ZodString, "many">;
    outcomesTracked: z.ZodArray<z.ZodString, "many">;
    mentorRequirements: z.ZodOptional<z.ZodObject<{
        minExperience: z.ZodOptional<z.ZodNumber>;
        industries: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        languages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        certifications: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        minExperience?: number | undefined;
        industries?: string[] | undefined;
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
    }, {
        minExperience?: number | undefined;
        industries?: string[] | undefined;
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
    }>>;
    onboardingMaterialsUrl: z.ZodOptional<z.ZodString>;
    sessionGuidelinesUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sessionFormat: "1-on-1" | "group" | "hybrid";
    sessionDuration: number;
    sessionFrequency: "weekly" | "bi-weekly" | "monthly" | "flexible";
    totalDuration: number;
    matchingCriteria: string[];
    autoMatching: boolean;
    focusAreas: string[];
    outcomesTracked: string[];
    totalSessionsRecommended?: number | undefined;
    mentorRequirements?: {
        minExperience?: number | undefined;
        industries?: string[] | undefined;
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
    } | undefined;
    onboardingMaterialsUrl?: string | undefined;
    sessionGuidelinesUrl?: string | undefined;
}, {
    sessionFormat: "1-on-1" | "group" | "hybrid";
    sessionDuration: number;
    sessionFrequency: "weekly" | "bi-weekly" | "monthly" | "flexible";
    totalDuration: number;
    matchingCriteria: string[];
    autoMatching: boolean;
    focusAreas: string[];
    outcomesTracked: string[];
    totalSessionsRecommended?: number | undefined;
    mentorRequirements?: {
        minExperience?: number | undefined;
        industries?: string[] | undefined;
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
    } | undefined;
    onboardingMaterialsUrl?: string | undefined;
    sessionGuidelinesUrl?: string | undefined;
}>, z.ZodEffects<z.ZodObject<{
    classSizeMin: z.ZodNumber;
    classSizeMax: z.ZodNumber;
    sessionDuration: z.ZodNumber;
    sessionsPerWeek: z.ZodNumber;
    totalWeeks: z.ZodNumber;
    proficiencyLevels: z.ZodArray<z.ZodEnum<["A1", "A2", "B1", "B2", "C1", "C2"]>, "many">;
    targetLanguages: z.ZodArray<z.ZodString, "many">;
    deliveryMode: z.ZodEnum<["in-person", "online", "hybrid"]>;
    platform: z.ZodOptional<z.ZodString>;
    curriculumFocus: z.ZodArray<z.ZodString, "many">;
    assessmentFrequency: z.ZodEnum<["weekly", "bi-weekly", "monthly", "end-of-course"]>;
    certificationOffered: z.ZodBoolean;
    textbookRequired: z.ZodBoolean;
    textbookTitle: z.ZodOptional<z.ZodString>;
    materialsUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sessionDuration: number;
    classSizeMin: number;
    classSizeMax: number;
    sessionsPerWeek: number;
    totalWeeks: number;
    proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
    targetLanguages: string[];
    deliveryMode: "hybrid" | "in-person" | "online";
    curriculumFocus: string[];
    assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
    certificationOffered: boolean;
    textbookRequired: boolean;
    platform?: string | undefined;
    textbookTitle?: string | undefined;
    materialsUrl?: string | undefined;
}, {
    sessionDuration: number;
    classSizeMin: number;
    classSizeMax: number;
    sessionsPerWeek: number;
    totalWeeks: number;
    proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
    targetLanguages: string[];
    deliveryMode: "hybrid" | "in-person" | "online";
    curriculumFocus: string[];
    assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
    certificationOffered: boolean;
    textbookRequired: boolean;
    platform?: string | undefined;
    textbookTitle?: string | undefined;
    materialsUrl?: string | undefined;
}>, {
    sessionDuration: number;
    classSizeMin: number;
    classSizeMax: number;
    sessionsPerWeek: number;
    totalWeeks: number;
    proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
    targetLanguages: string[];
    deliveryMode: "hybrid" | "in-person" | "online";
    curriculumFocus: string[];
    assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
    certificationOffered: boolean;
    textbookRequired: boolean;
    platform?: string | undefined;
    textbookTitle?: string | undefined;
    materialsUrl?: string | undefined;
}, {
    sessionDuration: number;
    classSizeMin: number;
    classSizeMax: number;
    sessionsPerWeek: number;
    totalWeeks: number;
    proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
    targetLanguages: string[];
    deliveryMode: "hybrid" | "in-person" | "online";
    curriculumFocus: string[];
    assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
    certificationOffered: boolean;
    textbookRequired: boolean;
    platform?: string | undefined;
    textbookTitle?: string | undefined;
    materialsUrl?: string | undefined;
}>, z.ZodObject<{
    matchMethod: z.ZodEnum<["skill_based", "random", "interest_based", "manual"]>;
    pairDuration: z.ZodNumber;
    allowGroupBuddies: z.ZodBoolean;
    maxBuddiesPerVolunteer: z.ZodOptional<z.ZodNumber>;
    checkInFrequency: z.ZodEnum<["weekly", "bi-weekly", "monthly"]>;
    checkInFormat: z.ZodEnum<["survey", "call", "meeting", "flexible"]>;
    requiredCheckIns: z.ZodNumber;
    suggestedActivities: z.ZodArray<z.ZodString, "many">;
    mandatoryActivities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    activityTracking: z.ZodBoolean;
    primaryGoals: z.ZodArray<z.ZodString, "many">;
    buddyTrainingRequired: z.ZodBoolean;
    buddyTrainingUrl: z.ZodOptional<z.ZodString>;
    ongoingSupportUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    matchMethod: "skill_based" | "random" | "interest_based" | "manual";
    pairDuration: number;
    allowGroupBuddies: boolean;
    checkInFrequency: "weekly" | "bi-weekly" | "monthly";
    checkInFormat: "flexible" | "survey" | "call" | "meeting";
    requiredCheckIns: number;
    suggestedActivities: string[];
    activityTracking: boolean;
    primaryGoals: string[];
    buddyTrainingRequired: boolean;
    maxBuddiesPerVolunteer?: number | undefined;
    mandatoryActivities?: string[] | undefined;
    buddyTrainingUrl?: string | undefined;
    ongoingSupportUrl?: string | undefined;
}, {
    matchMethod: "skill_based" | "random" | "interest_based" | "manual";
    pairDuration: number;
    allowGroupBuddies: boolean;
    checkInFrequency: "weekly" | "bi-weekly" | "monthly";
    checkInFormat: "flexible" | "survey" | "call" | "meeting";
    requiredCheckIns: number;
    suggestedActivities: string[];
    activityTracking: boolean;
    primaryGoals: string[];
    buddyTrainingRequired: boolean;
    maxBuddiesPerVolunteer?: number | undefined;
    mandatoryActivities?: string[] | undefined;
    buddyTrainingUrl?: string | undefined;
    ongoingSupportUrl?: string | undefined;
}>, z.ZodObject<{
    coursePlatforms: z.ZodArray<z.ZodEnum<["linkedin_learning", "coursera", "udemy", "pluralsight", "custom"]>, "many">;
    platformUrls: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    skillTracks: z.ZodArray<z.ZodString, "many">;
    difficultyLevels: z.ZodArray<z.ZodEnum<["beginner", "intermediate", "advanced"]>, "many">;
    certificationRequired: z.ZodBoolean;
    certificationProvider: z.ZodOptional<z.ZodString>;
    minimumCompletionRate: z.ZodNumber;
    timeToComplete: z.ZodNumber;
    milestones: z.ZodArray<z.ZodString, "many">;
    progressTrackingFrequency: z.ZodEnum<["weekly", "bi-weekly", "monthly"]>;
    mentorSupport: z.ZodBoolean;
    peerGroupsEnabled: z.ZodBoolean;
    officeHoursUrl: z.ZodOptional<z.ZodString>;
    maxCostPerParticipant: z.ZodOptional<z.ZodNumber>;
    stipendProvided: z.ZodBoolean;
    stipendAmount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    coursePlatforms: ("custom" | "linkedin_learning" | "coursera" | "udemy" | "pluralsight")[];
    skillTracks: string[];
    difficultyLevels: ("beginner" | "intermediate" | "advanced")[];
    certificationRequired: boolean;
    minimumCompletionRate: number;
    timeToComplete: number;
    milestones: string[];
    progressTrackingFrequency: "weekly" | "bi-weekly" | "monthly";
    mentorSupport: boolean;
    peerGroupsEnabled: boolean;
    stipendProvided: boolean;
    platformUrls?: Record<string, string> | undefined;
    certificationProvider?: string | undefined;
    officeHoursUrl?: string | undefined;
    maxCostPerParticipant?: number | undefined;
    stipendAmount?: number | undefined;
}, {
    coursePlatforms: ("custom" | "linkedin_learning" | "coursera" | "udemy" | "pluralsight")[];
    skillTracks: string[];
    difficultyLevels: ("beginner" | "intermediate" | "advanced")[];
    certificationRequired: boolean;
    minimumCompletionRate: number;
    timeToComplete: number;
    milestones: string[];
    progressTrackingFrequency: "weekly" | "bi-weekly" | "monthly";
    mentorSupport: boolean;
    peerGroupsEnabled: boolean;
    stipendProvided: boolean;
    platformUrls?: Record<string, string> | undefined;
    certificationProvider?: string | undefined;
    officeHoursUrl?: string | undefined;
    maxCostPerParticipant?: number | undefined;
    stipendAmount?: number | undefined;
}>, z.ZodObject<{
    programType: z.ZodEnum<["internship", "apprenticeship", "job_placement", "work_experience", "mixed"]>;
    duration: z.ZodNumber;
    hoursPerWeek: z.ZodNumber;
    placementType: z.ZodEnum<["internal", "external_partner", "mixed"]>;
    partnerOrganizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    industries: z.ZodArray<z.ZodString, "many">;
    skillsRequired: z.ZodArray<z.ZodString, "many">;
    skillsDeveloped: z.ZodArray<z.ZodString, "many">;
    jobCoachProvided: z.ZodBoolean;
    jobCoachHours: z.ZodOptional<z.ZodNumber>;
    cvReviewProvided: z.ZodBoolean;
    interviewPrepProvided: z.ZodBoolean;
    targetOutcomes: z.ZodArray<z.ZodString, "many">;
    successMetrics: z.ZodArray<z.ZodString, "many">;
    compensated: z.ZodBoolean;
    compensationAmount: z.ZodOptional<z.ZodNumber>;
    compensationType: z.ZodOptional<z.ZodEnum<["hourly", "monthly", "stipend"]>>;
}, "strip", z.ZodTypeAny, {
    industries: string[];
    duration: number;
    programType: "internship" | "apprenticeship" | "job_placement" | "work_experience" | "mixed";
    hoursPerWeek: number;
    placementType: "mixed" | "internal" | "external_partner";
    skillsRequired: string[];
    skillsDeveloped: string[];
    jobCoachProvided: boolean;
    cvReviewProvided: boolean;
    interviewPrepProvided: boolean;
    targetOutcomes: string[];
    successMetrics: string[];
    compensated: boolean;
    partnerOrganizations?: string[] | undefined;
    jobCoachHours?: number | undefined;
    compensationAmount?: number | undefined;
    compensationType?: "monthly" | "hourly" | "stipend" | undefined;
}, {
    industries: string[];
    duration: number;
    programType: "internship" | "apprenticeship" | "job_placement" | "work_experience" | "mixed";
    hoursPerWeek: number;
    placementType: "mixed" | "internal" | "external_partner";
    skillsRequired: string[];
    skillsDeveloped: string[];
    jobCoachProvided: boolean;
    cvReviewProvided: boolean;
    interviewPrepProvided: boolean;
    targetOutcomes: string[];
    successMetrics: string[];
    compensated: boolean;
    partnerOrganizations?: string[] | undefined;
    jobCoachHours?: number | undefined;
    compensationAmount?: number | undefined;
    compensationType?: "monthly" | "hourly" | "stipend" | undefined;
}>]>;
export type ProgramTemplateConfig = z.infer<typeof ProgramTemplateConfigSchema>;
/**
 * Create program template request
 */
export declare const CreateProgramTemplateSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodString;
    programType: z.ZodEnum<["mentorship", "language", "buddy", "upskilling", "weei"]>;
    defaultConfig: z.ZodUnion<[z.ZodObject<{
        sessionFormat: z.ZodEnum<["1-on-1", "group", "hybrid"]>;
        sessionDuration: z.ZodNumber;
        sessionFrequency: z.ZodEnum<["weekly", "bi-weekly", "monthly", "flexible"]>;
        totalDuration: z.ZodNumber;
        totalSessionsRecommended: z.ZodOptional<z.ZodNumber>;
        matchingCriteria: z.ZodArray<z.ZodString, "many">;
        autoMatching: z.ZodBoolean;
        focusAreas: z.ZodArray<z.ZodString, "many">;
        outcomesTracked: z.ZodArray<z.ZodString, "many">;
        mentorRequirements: z.ZodOptional<z.ZodObject<{
            minExperience: z.ZodOptional<z.ZodNumber>;
            industries: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            languages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            certifications: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            minExperience?: number | undefined;
            industries?: string[] | undefined;
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
        }, {
            minExperience?: number | undefined;
            industries?: string[] | undefined;
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
        }>>;
        onboardingMaterialsUrl: z.ZodOptional<z.ZodString>;
        sessionGuidelinesUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sessionFormat: "1-on-1" | "group" | "hybrid";
        sessionDuration: number;
        sessionFrequency: "weekly" | "bi-weekly" | "monthly" | "flexible";
        totalDuration: number;
        matchingCriteria: string[];
        autoMatching: boolean;
        focusAreas: string[];
        outcomesTracked: string[];
        totalSessionsRecommended?: number | undefined;
        mentorRequirements?: {
            minExperience?: number | undefined;
            industries?: string[] | undefined;
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
        } | undefined;
        onboardingMaterialsUrl?: string | undefined;
        sessionGuidelinesUrl?: string | undefined;
    }, {
        sessionFormat: "1-on-1" | "group" | "hybrid";
        sessionDuration: number;
        sessionFrequency: "weekly" | "bi-weekly" | "monthly" | "flexible";
        totalDuration: number;
        matchingCriteria: string[];
        autoMatching: boolean;
        focusAreas: string[];
        outcomesTracked: string[];
        totalSessionsRecommended?: number | undefined;
        mentorRequirements?: {
            minExperience?: number | undefined;
            industries?: string[] | undefined;
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
        } | undefined;
        onboardingMaterialsUrl?: string | undefined;
        sessionGuidelinesUrl?: string | undefined;
    }>, z.ZodEffects<z.ZodObject<{
        classSizeMin: z.ZodNumber;
        classSizeMax: z.ZodNumber;
        sessionDuration: z.ZodNumber;
        sessionsPerWeek: z.ZodNumber;
        totalWeeks: z.ZodNumber;
        proficiencyLevels: z.ZodArray<z.ZodEnum<["A1", "A2", "B1", "B2", "C1", "C2"]>, "many">;
        targetLanguages: z.ZodArray<z.ZodString, "many">;
        deliveryMode: z.ZodEnum<["in-person", "online", "hybrid"]>;
        platform: z.ZodOptional<z.ZodString>;
        curriculumFocus: z.ZodArray<z.ZodString, "many">;
        assessmentFrequency: z.ZodEnum<["weekly", "bi-weekly", "monthly", "end-of-course"]>;
        certificationOffered: z.ZodBoolean;
        textbookRequired: z.ZodBoolean;
        textbookTitle: z.ZodOptional<z.ZodString>;
        materialsUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sessionDuration: number;
        classSizeMin: number;
        classSizeMax: number;
        sessionsPerWeek: number;
        totalWeeks: number;
        proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
        targetLanguages: string[];
        deliveryMode: "hybrid" | "in-person" | "online";
        curriculumFocus: string[];
        assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
        certificationOffered: boolean;
        textbookRequired: boolean;
        platform?: string | undefined;
        textbookTitle?: string | undefined;
        materialsUrl?: string | undefined;
    }, {
        sessionDuration: number;
        classSizeMin: number;
        classSizeMax: number;
        sessionsPerWeek: number;
        totalWeeks: number;
        proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
        targetLanguages: string[];
        deliveryMode: "hybrid" | "in-person" | "online";
        curriculumFocus: string[];
        assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
        certificationOffered: boolean;
        textbookRequired: boolean;
        platform?: string | undefined;
        textbookTitle?: string | undefined;
        materialsUrl?: string | undefined;
    }>, {
        sessionDuration: number;
        classSizeMin: number;
        classSizeMax: number;
        sessionsPerWeek: number;
        totalWeeks: number;
        proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
        targetLanguages: string[];
        deliveryMode: "hybrid" | "in-person" | "online";
        curriculumFocus: string[];
        assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
        certificationOffered: boolean;
        textbookRequired: boolean;
        platform?: string | undefined;
        textbookTitle?: string | undefined;
        materialsUrl?: string | undefined;
    }, {
        sessionDuration: number;
        classSizeMin: number;
        classSizeMax: number;
        sessionsPerWeek: number;
        totalWeeks: number;
        proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
        targetLanguages: string[];
        deliveryMode: "hybrid" | "in-person" | "online";
        curriculumFocus: string[];
        assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
        certificationOffered: boolean;
        textbookRequired: boolean;
        platform?: string | undefined;
        textbookTitle?: string | undefined;
        materialsUrl?: string | undefined;
    }>, z.ZodObject<{
        matchMethod: z.ZodEnum<["skill_based", "random", "interest_based", "manual"]>;
        pairDuration: z.ZodNumber;
        allowGroupBuddies: z.ZodBoolean;
        maxBuddiesPerVolunteer: z.ZodOptional<z.ZodNumber>;
        checkInFrequency: z.ZodEnum<["weekly", "bi-weekly", "monthly"]>;
        checkInFormat: z.ZodEnum<["survey", "call", "meeting", "flexible"]>;
        requiredCheckIns: z.ZodNumber;
        suggestedActivities: z.ZodArray<z.ZodString, "many">;
        mandatoryActivities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        activityTracking: z.ZodBoolean;
        primaryGoals: z.ZodArray<z.ZodString, "many">;
        buddyTrainingRequired: z.ZodBoolean;
        buddyTrainingUrl: z.ZodOptional<z.ZodString>;
        ongoingSupportUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        matchMethod: "skill_based" | "random" | "interest_based" | "manual";
        pairDuration: number;
        allowGroupBuddies: boolean;
        checkInFrequency: "weekly" | "bi-weekly" | "monthly";
        checkInFormat: "flexible" | "survey" | "call" | "meeting";
        requiredCheckIns: number;
        suggestedActivities: string[];
        activityTracking: boolean;
        primaryGoals: string[];
        buddyTrainingRequired: boolean;
        maxBuddiesPerVolunteer?: number | undefined;
        mandatoryActivities?: string[] | undefined;
        buddyTrainingUrl?: string | undefined;
        ongoingSupportUrl?: string | undefined;
    }, {
        matchMethod: "skill_based" | "random" | "interest_based" | "manual";
        pairDuration: number;
        allowGroupBuddies: boolean;
        checkInFrequency: "weekly" | "bi-weekly" | "monthly";
        checkInFormat: "flexible" | "survey" | "call" | "meeting";
        requiredCheckIns: number;
        suggestedActivities: string[];
        activityTracking: boolean;
        primaryGoals: string[];
        buddyTrainingRequired: boolean;
        maxBuddiesPerVolunteer?: number | undefined;
        mandatoryActivities?: string[] | undefined;
        buddyTrainingUrl?: string | undefined;
        ongoingSupportUrl?: string | undefined;
    }>, z.ZodObject<{
        coursePlatforms: z.ZodArray<z.ZodEnum<["linkedin_learning", "coursera", "udemy", "pluralsight", "custom"]>, "many">;
        platformUrls: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        skillTracks: z.ZodArray<z.ZodString, "many">;
        difficultyLevels: z.ZodArray<z.ZodEnum<["beginner", "intermediate", "advanced"]>, "many">;
        certificationRequired: z.ZodBoolean;
        certificationProvider: z.ZodOptional<z.ZodString>;
        minimumCompletionRate: z.ZodNumber;
        timeToComplete: z.ZodNumber;
        milestones: z.ZodArray<z.ZodString, "many">;
        progressTrackingFrequency: z.ZodEnum<["weekly", "bi-weekly", "monthly"]>;
        mentorSupport: z.ZodBoolean;
        peerGroupsEnabled: z.ZodBoolean;
        officeHoursUrl: z.ZodOptional<z.ZodString>;
        maxCostPerParticipant: z.ZodOptional<z.ZodNumber>;
        stipendProvided: z.ZodBoolean;
        stipendAmount: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        coursePlatforms: ("custom" | "linkedin_learning" | "coursera" | "udemy" | "pluralsight")[];
        skillTracks: string[];
        difficultyLevels: ("beginner" | "intermediate" | "advanced")[];
        certificationRequired: boolean;
        minimumCompletionRate: number;
        timeToComplete: number;
        milestones: string[];
        progressTrackingFrequency: "weekly" | "bi-weekly" | "monthly";
        mentorSupport: boolean;
        peerGroupsEnabled: boolean;
        stipendProvided: boolean;
        platformUrls?: Record<string, string> | undefined;
        certificationProvider?: string | undefined;
        officeHoursUrl?: string | undefined;
        maxCostPerParticipant?: number | undefined;
        stipendAmount?: number | undefined;
    }, {
        coursePlatforms: ("custom" | "linkedin_learning" | "coursera" | "udemy" | "pluralsight")[];
        skillTracks: string[];
        difficultyLevels: ("beginner" | "intermediate" | "advanced")[];
        certificationRequired: boolean;
        minimumCompletionRate: number;
        timeToComplete: number;
        milestones: string[];
        progressTrackingFrequency: "weekly" | "bi-weekly" | "monthly";
        mentorSupport: boolean;
        peerGroupsEnabled: boolean;
        stipendProvided: boolean;
        platformUrls?: Record<string, string> | undefined;
        certificationProvider?: string | undefined;
        officeHoursUrl?: string | undefined;
        maxCostPerParticipant?: number | undefined;
        stipendAmount?: number | undefined;
    }>, z.ZodObject<{
        programType: z.ZodEnum<["internship", "apprenticeship", "job_placement", "work_experience", "mixed"]>;
        duration: z.ZodNumber;
        hoursPerWeek: z.ZodNumber;
        placementType: z.ZodEnum<["internal", "external_partner", "mixed"]>;
        partnerOrganizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        industries: z.ZodArray<z.ZodString, "many">;
        skillsRequired: z.ZodArray<z.ZodString, "many">;
        skillsDeveloped: z.ZodArray<z.ZodString, "many">;
        jobCoachProvided: z.ZodBoolean;
        jobCoachHours: z.ZodOptional<z.ZodNumber>;
        cvReviewProvided: z.ZodBoolean;
        interviewPrepProvided: z.ZodBoolean;
        targetOutcomes: z.ZodArray<z.ZodString, "many">;
        successMetrics: z.ZodArray<z.ZodString, "many">;
        compensated: z.ZodBoolean;
        compensationAmount: z.ZodOptional<z.ZodNumber>;
        compensationType: z.ZodOptional<z.ZodEnum<["hourly", "monthly", "stipend"]>>;
    }, "strip", z.ZodTypeAny, {
        industries: string[];
        duration: number;
        programType: "internship" | "apprenticeship" | "job_placement" | "work_experience" | "mixed";
        hoursPerWeek: number;
        placementType: "mixed" | "internal" | "external_partner";
        skillsRequired: string[];
        skillsDeveloped: string[];
        jobCoachProvided: boolean;
        cvReviewProvided: boolean;
        interviewPrepProvided: boolean;
        targetOutcomes: string[];
        successMetrics: string[];
        compensated: boolean;
        partnerOrganizations?: string[] | undefined;
        jobCoachHours?: number | undefined;
        compensationAmount?: number | undefined;
        compensationType?: "monthly" | "hourly" | "stipend" | undefined;
    }, {
        industries: string[];
        duration: number;
        programType: "internship" | "apprenticeship" | "job_placement" | "work_experience" | "mixed";
        hoursPerWeek: number;
        placementType: "mixed" | "internal" | "external_partner";
        skillsRequired: string[];
        skillsDeveloped: string[];
        jobCoachProvided: boolean;
        cvReviewProvided: boolean;
        interviewPrepProvided: boolean;
        targetOutcomes: string[];
        successMetrics: string[];
        compensated: boolean;
        partnerOrganizations?: string[] | undefined;
        jobCoachHours?: number | undefined;
        compensationAmount?: number | undefined;
        compensationType?: "monthly" | "hourly" | "stipend" | undefined;
    }>]>;
    outcomeMetrics: z.ZodArray<z.ZodString, "many">;
    description: z.ZodOptional<z.ZodString>;
    version: z.ZodDefault<z.ZodString>;
    defaultMinParticipants: z.ZodDefault<z.ZodNumber>;
    defaultMaxParticipants: z.ZodDefault<z.ZodNumber>;
    defaultVolunteersNeeded: z.ZodDefault<z.ZodNumber>;
    suitableForGroups: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    estimatedCostPerParticipant: z.ZodOptional<z.ZodNumber>;
    estimatedHoursPerVolunteer: z.ZodOptional<z.ZodNumber>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    isPublic: z.ZodDefault<z.ZodBoolean>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    programType: "language" | "mentorship" | "buddy" | "upskilling" | "weei";
    defaultConfig: {
        sessionFormat: "1-on-1" | "group" | "hybrid";
        sessionDuration: number;
        sessionFrequency: "weekly" | "bi-weekly" | "monthly" | "flexible";
        totalDuration: number;
        matchingCriteria: string[];
        autoMatching: boolean;
        focusAreas: string[];
        outcomesTracked: string[];
        totalSessionsRecommended?: number | undefined;
        mentorRequirements?: {
            minExperience?: number | undefined;
            industries?: string[] | undefined;
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
        } | undefined;
        onboardingMaterialsUrl?: string | undefined;
        sessionGuidelinesUrl?: string | undefined;
    } | {
        sessionDuration: number;
        classSizeMin: number;
        classSizeMax: number;
        sessionsPerWeek: number;
        totalWeeks: number;
        proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
        targetLanguages: string[];
        deliveryMode: "hybrid" | "in-person" | "online";
        curriculumFocus: string[];
        assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
        certificationOffered: boolean;
        textbookRequired: boolean;
        platform?: string | undefined;
        textbookTitle?: string | undefined;
        materialsUrl?: string | undefined;
    } | {
        matchMethod: "skill_based" | "random" | "interest_based" | "manual";
        pairDuration: number;
        allowGroupBuddies: boolean;
        checkInFrequency: "weekly" | "bi-weekly" | "monthly";
        checkInFormat: "flexible" | "survey" | "call" | "meeting";
        requiredCheckIns: number;
        suggestedActivities: string[];
        activityTracking: boolean;
        primaryGoals: string[];
        buddyTrainingRequired: boolean;
        maxBuddiesPerVolunteer?: number | undefined;
        mandatoryActivities?: string[] | undefined;
        buddyTrainingUrl?: string | undefined;
        ongoingSupportUrl?: string | undefined;
    } | {
        coursePlatforms: ("custom" | "linkedin_learning" | "coursera" | "udemy" | "pluralsight")[];
        skillTracks: string[];
        difficultyLevels: ("beginner" | "intermediate" | "advanced")[];
        certificationRequired: boolean;
        minimumCompletionRate: number;
        timeToComplete: number;
        milestones: string[];
        progressTrackingFrequency: "weekly" | "bi-weekly" | "monthly";
        mentorSupport: boolean;
        peerGroupsEnabled: boolean;
        stipendProvided: boolean;
        platformUrls?: Record<string, string> | undefined;
        certificationProvider?: string | undefined;
        officeHoursUrl?: string | undefined;
        maxCostPerParticipant?: number | undefined;
        stipendAmount?: number | undefined;
    } | {
        industries: string[];
        duration: number;
        programType: "internship" | "apprenticeship" | "job_placement" | "work_experience" | "mixed";
        hoursPerWeek: number;
        placementType: "mixed" | "internal" | "external_partner";
        skillsRequired: string[];
        skillsDeveloped: string[];
        jobCoachProvided: boolean;
        cvReviewProvided: boolean;
        interviewPrepProvided: boolean;
        targetOutcomes: string[];
        successMetrics: string[];
        compensated: boolean;
        partnerOrganizations?: string[] | undefined;
        jobCoachHours?: number | undefined;
        compensationAmount?: number | undefined;
        compensationType?: "monthly" | "hourly" | "stipend" | undefined;
    };
    outcomeMetrics: string[];
    version: string;
    defaultMinParticipants: number;
    defaultMaxParticipants: number;
    defaultVolunteersNeeded: number;
    suitableForGroups: string[];
    isActive: boolean;
    isPublic: boolean;
    tags: string[];
    description?: string | undefined;
    estimatedCostPerParticipant?: number | undefined;
    estimatedHoursPerVolunteer?: number | undefined;
}, {
    name: string;
    programType: "language" | "mentorship" | "buddy" | "upskilling" | "weei";
    defaultConfig: {
        sessionFormat: "1-on-1" | "group" | "hybrid";
        sessionDuration: number;
        sessionFrequency: "weekly" | "bi-weekly" | "monthly" | "flexible";
        totalDuration: number;
        matchingCriteria: string[];
        autoMatching: boolean;
        focusAreas: string[];
        outcomesTracked: string[];
        totalSessionsRecommended?: number | undefined;
        mentorRequirements?: {
            minExperience?: number | undefined;
            industries?: string[] | undefined;
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
        } | undefined;
        onboardingMaterialsUrl?: string | undefined;
        sessionGuidelinesUrl?: string | undefined;
    } | {
        sessionDuration: number;
        classSizeMin: number;
        classSizeMax: number;
        sessionsPerWeek: number;
        totalWeeks: number;
        proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
        targetLanguages: string[];
        deliveryMode: "hybrid" | "in-person" | "online";
        curriculumFocus: string[];
        assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
        certificationOffered: boolean;
        textbookRequired: boolean;
        platform?: string | undefined;
        textbookTitle?: string | undefined;
        materialsUrl?: string | undefined;
    } | {
        matchMethod: "skill_based" | "random" | "interest_based" | "manual";
        pairDuration: number;
        allowGroupBuddies: boolean;
        checkInFrequency: "weekly" | "bi-weekly" | "monthly";
        checkInFormat: "flexible" | "survey" | "call" | "meeting";
        requiredCheckIns: number;
        suggestedActivities: string[];
        activityTracking: boolean;
        primaryGoals: string[];
        buddyTrainingRequired: boolean;
        maxBuddiesPerVolunteer?: number | undefined;
        mandatoryActivities?: string[] | undefined;
        buddyTrainingUrl?: string | undefined;
        ongoingSupportUrl?: string | undefined;
    } | {
        coursePlatforms: ("custom" | "linkedin_learning" | "coursera" | "udemy" | "pluralsight")[];
        skillTracks: string[];
        difficultyLevels: ("beginner" | "intermediate" | "advanced")[];
        certificationRequired: boolean;
        minimumCompletionRate: number;
        timeToComplete: number;
        milestones: string[];
        progressTrackingFrequency: "weekly" | "bi-weekly" | "monthly";
        mentorSupport: boolean;
        peerGroupsEnabled: boolean;
        stipendProvided: boolean;
        platformUrls?: Record<string, string> | undefined;
        certificationProvider?: string | undefined;
        officeHoursUrl?: string | undefined;
        maxCostPerParticipant?: number | undefined;
        stipendAmount?: number | undefined;
    } | {
        industries: string[];
        duration: number;
        programType: "internship" | "apprenticeship" | "job_placement" | "work_experience" | "mixed";
        hoursPerWeek: number;
        placementType: "mixed" | "internal" | "external_partner";
        skillsRequired: string[];
        skillsDeveloped: string[];
        jobCoachProvided: boolean;
        cvReviewProvided: boolean;
        interviewPrepProvided: boolean;
        targetOutcomes: string[];
        successMetrics: string[];
        compensated: boolean;
        partnerOrganizations?: string[] | undefined;
        jobCoachHours?: number | undefined;
        compensationAmount?: number | undefined;
        compensationType?: "monthly" | "hourly" | "stipend" | undefined;
    };
    outcomeMetrics: string[];
    description?: string | undefined;
    version?: string | undefined;
    defaultMinParticipants?: number | undefined;
    defaultMaxParticipants?: number | undefined;
    defaultVolunteersNeeded?: number | undefined;
    suitableForGroups?: string[] | undefined;
    estimatedCostPerParticipant?: number | undefined;
    estimatedHoursPerVolunteer?: number | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
}>, {
    name: string;
    programType: "language" | "mentorship" | "buddy" | "upskilling" | "weei";
    defaultConfig: {
        sessionFormat: "1-on-1" | "group" | "hybrid";
        sessionDuration: number;
        sessionFrequency: "weekly" | "bi-weekly" | "monthly" | "flexible";
        totalDuration: number;
        matchingCriteria: string[];
        autoMatching: boolean;
        focusAreas: string[];
        outcomesTracked: string[];
        totalSessionsRecommended?: number | undefined;
        mentorRequirements?: {
            minExperience?: number | undefined;
            industries?: string[] | undefined;
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
        } | undefined;
        onboardingMaterialsUrl?: string | undefined;
        sessionGuidelinesUrl?: string | undefined;
    } | {
        sessionDuration: number;
        classSizeMin: number;
        classSizeMax: number;
        sessionsPerWeek: number;
        totalWeeks: number;
        proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
        targetLanguages: string[];
        deliveryMode: "hybrid" | "in-person" | "online";
        curriculumFocus: string[];
        assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
        certificationOffered: boolean;
        textbookRequired: boolean;
        platform?: string | undefined;
        textbookTitle?: string | undefined;
        materialsUrl?: string | undefined;
    } | {
        matchMethod: "skill_based" | "random" | "interest_based" | "manual";
        pairDuration: number;
        allowGroupBuddies: boolean;
        checkInFrequency: "weekly" | "bi-weekly" | "monthly";
        checkInFormat: "flexible" | "survey" | "call" | "meeting";
        requiredCheckIns: number;
        suggestedActivities: string[];
        activityTracking: boolean;
        primaryGoals: string[];
        buddyTrainingRequired: boolean;
        maxBuddiesPerVolunteer?: number | undefined;
        mandatoryActivities?: string[] | undefined;
        buddyTrainingUrl?: string | undefined;
        ongoingSupportUrl?: string | undefined;
    } | {
        coursePlatforms: ("custom" | "linkedin_learning" | "coursera" | "udemy" | "pluralsight")[];
        skillTracks: string[];
        difficultyLevels: ("beginner" | "intermediate" | "advanced")[];
        certificationRequired: boolean;
        minimumCompletionRate: number;
        timeToComplete: number;
        milestones: string[];
        progressTrackingFrequency: "weekly" | "bi-weekly" | "monthly";
        mentorSupport: boolean;
        peerGroupsEnabled: boolean;
        stipendProvided: boolean;
        platformUrls?: Record<string, string> | undefined;
        certificationProvider?: string | undefined;
        officeHoursUrl?: string | undefined;
        maxCostPerParticipant?: number | undefined;
        stipendAmount?: number | undefined;
    } | {
        industries: string[];
        duration: number;
        programType: "internship" | "apprenticeship" | "job_placement" | "work_experience" | "mixed";
        hoursPerWeek: number;
        placementType: "mixed" | "internal" | "external_partner";
        skillsRequired: string[];
        skillsDeveloped: string[];
        jobCoachProvided: boolean;
        cvReviewProvided: boolean;
        interviewPrepProvided: boolean;
        targetOutcomes: string[];
        successMetrics: string[];
        compensated: boolean;
        partnerOrganizations?: string[] | undefined;
        jobCoachHours?: number | undefined;
        compensationAmount?: number | undefined;
        compensationType?: "monthly" | "hourly" | "stipend" | undefined;
    };
    outcomeMetrics: string[];
    version: string;
    defaultMinParticipants: number;
    defaultMaxParticipants: number;
    defaultVolunteersNeeded: number;
    suitableForGroups: string[];
    isActive: boolean;
    isPublic: boolean;
    tags: string[];
    description?: string | undefined;
    estimatedCostPerParticipant?: number | undefined;
    estimatedHoursPerVolunteer?: number | undefined;
}, {
    name: string;
    programType: "language" | "mentorship" | "buddy" | "upskilling" | "weei";
    defaultConfig: {
        sessionFormat: "1-on-1" | "group" | "hybrid";
        sessionDuration: number;
        sessionFrequency: "weekly" | "bi-weekly" | "monthly" | "flexible";
        totalDuration: number;
        matchingCriteria: string[];
        autoMatching: boolean;
        focusAreas: string[];
        outcomesTracked: string[];
        totalSessionsRecommended?: number | undefined;
        mentorRequirements?: {
            minExperience?: number | undefined;
            industries?: string[] | undefined;
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
        } | undefined;
        onboardingMaterialsUrl?: string | undefined;
        sessionGuidelinesUrl?: string | undefined;
    } | {
        sessionDuration: number;
        classSizeMin: number;
        classSizeMax: number;
        sessionsPerWeek: number;
        totalWeeks: number;
        proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
        targetLanguages: string[];
        deliveryMode: "hybrid" | "in-person" | "online";
        curriculumFocus: string[];
        assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
        certificationOffered: boolean;
        textbookRequired: boolean;
        platform?: string | undefined;
        textbookTitle?: string | undefined;
        materialsUrl?: string | undefined;
    } | {
        matchMethod: "skill_based" | "random" | "interest_based" | "manual";
        pairDuration: number;
        allowGroupBuddies: boolean;
        checkInFrequency: "weekly" | "bi-weekly" | "monthly";
        checkInFormat: "flexible" | "survey" | "call" | "meeting";
        requiredCheckIns: number;
        suggestedActivities: string[];
        activityTracking: boolean;
        primaryGoals: string[];
        buddyTrainingRequired: boolean;
        maxBuddiesPerVolunteer?: number | undefined;
        mandatoryActivities?: string[] | undefined;
        buddyTrainingUrl?: string | undefined;
        ongoingSupportUrl?: string | undefined;
    } | {
        coursePlatforms: ("custom" | "linkedin_learning" | "coursera" | "udemy" | "pluralsight")[];
        skillTracks: string[];
        difficultyLevels: ("beginner" | "intermediate" | "advanced")[];
        certificationRequired: boolean;
        minimumCompletionRate: number;
        timeToComplete: number;
        milestones: string[];
        progressTrackingFrequency: "weekly" | "bi-weekly" | "monthly";
        mentorSupport: boolean;
        peerGroupsEnabled: boolean;
        stipendProvided: boolean;
        platformUrls?: Record<string, string> | undefined;
        certificationProvider?: string | undefined;
        officeHoursUrl?: string | undefined;
        maxCostPerParticipant?: number | undefined;
        stipendAmount?: number | undefined;
    } | {
        industries: string[];
        duration: number;
        programType: "internship" | "apprenticeship" | "job_placement" | "work_experience" | "mixed";
        hoursPerWeek: number;
        placementType: "mixed" | "internal" | "external_partner";
        skillsRequired: string[];
        skillsDeveloped: string[];
        jobCoachProvided: boolean;
        cvReviewProvided: boolean;
        interviewPrepProvided: boolean;
        targetOutcomes: string[];
        successMetrics: string[];
        compensated: boolean;
        partnerOrganizations?: string[] | undefined;
        jobCoachHours?: number | undefined;
        compensationAmount?: number | undefined;
        compensationType?: "monthly" | "hourly" | "stipend" | undefined;
    };
    outcomeMetrics: string[];
    description?: string | undefined;
    version?: string | undefined;
    defaultMinParticipants?: number | undefined;
    defaultMaxParticipants?: number | undefined;
    defaultVolunteersNeeded?: number | undefined;
    suitableForGroups?: string[] | undefined;
    estimatedCostPerParticipant?: number | undefined;
    estimatedHoursPerVolunteer?: number | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
}>;
export type CreateProgramTemplateInput = z.infer<typeof CreateProgramTemplateSchema>;
/**
 * Update program template request
 */
export declare const UpdateProgramTemplateSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodString>;
    defaultConfig: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
        sessionFormat: z.ZodEnum<["1-on-1", "group", "hybrid"]>;
        sessionDuration: z.ZodNumber;
        sessionFrequency: z.ZodEnum<["weekly", "bi-weekly", "monthly", "flexible"]>;
        totalDuration: z.ZodNumber;
        totalSessionsRecommended: z.ZodOptional<z.ZodNumber>;
        matchingCriteria: z.ZodArray<z.ZodString, "many">;
        autoMatching: z.ZodBoolean;
        focusAreas: z.ZodArray<z.ZodString, "many">;
        outcomesTracked: z.ZodArray<z.ZodString, "many">;
        mentorRequirements: z.ZodOptional<z.ZodObject<{
            minExperience: z.ZodOptional<z.ZodNumber>;
            industries: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            languages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            certifications: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            minExperience?: number | undefined;
            industries?: string[] | undefined;
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
        }, {
            minExperience?: number | undefined;
            industries?: string[] | undefined;
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
        }>>;
        onboardingMaterialsUrl: z.ZodOptional<z.ZodString>;
        sessionGuidelinesUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sessionFormat: "1-on-1" | "group" | "hybrid";
        sessionDuration: number;
        sessionFrequency: "weekly" | "bi-weekly" | "monthly" | "flexible";
        totalDuration: number;
        matchingCriteria: string[];
        autoMatching: boolean;
        focusAreas: string[];
        outcomesTracked: string[];
        totalSessionsRecommended?: number | undefined;
        mentorRequirements?: {
            minExperience?: number | undefined;
            industries?: string[] | undefined;
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
        } | undefined;
        onboardingMaterialsUrl?: string | undefined;
        sessionGuidelinesUrl?: string | undefined;
    }, {
        sessionFormat: "1-on-1" | "group" | "hybrid";
        sessionDuration: number;
        sessionFrequency: "weekly" | "bi-weekly" | "monthly" | "flexible";
        totalDuration: number;
        matchingCriteria: string[];
        autoMatching: boolean;
        focusAreas: string[];
        outcomesTracked: string[];
        totalSessionsRecommended?: number | undefined;
        mentorRequirements?: {
            minExperience?: number | undefined;
            industries?: string[] | undefined;
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
        } | undefined;
        onboardingMaterialsUrl?: string | undefined;
        sessionGuidelinesUrl?: string | undefined;
    }>, z.ZodEffects<z.ZodObject<{
        classSizeMin: z.ZodNumber;
        classSizeMax: z.ZodNumber;
        sessionDuration: z.ZodNumber;
        sessionsPerWeek: z.ZodNumber;
        totalWeeks: z.ZodNumber;
        proficiencyLevels: z.ZodArray<z.ZodEnum<["A1", "A2", "B1", "B2", "C1", "C2"]>, "many">;
        targetLanguages: z.ZodArray<z.ZodString, "many">;
        deliveryMode: z.ZodEnum<["in-person", "online", "hybrid"]>;
        platform: z.ZodOptional<z.ZodString>;
        curriculumFocus: z.ZodArray<z.ZodString, "many">;
        assessmentFrequency: z.ZodEnum<["weekly", "bi-weekly", "monthly", "end-of-course"]>;
        certificationOffered: z.ZodBoolean;
        textbookRequired: z.ZodBoolean;
        textbookTitle: z.ZodOptional<z.ZodString>;
        materialsUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sessionDuration: number;
        classSizeMin: number;
        classSizeMax: number;
        sessionsPerWeek: number;
        totalWeeks: number;
        proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
        targetLanguages: string[];
        deliveryMode: "hybrid" | "in-person" | "online";
        curriculumFocus: string[];
        assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
        certificationOffered: boolean;
        textbookRequired: boolean;
        platform?: string | undefined;
        textbookTitle?: string | undefined;
        materialsUrl?: string | undefined;
    }, {
        sessionDuration: number;
        classSizeMin: number;
        classSizeMax: number;
        sessionsPerWeek: number;
        totalWeeks: number;
        proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
        targetLanguages: string[];
        deliveryMode: "hybrid" | "in-person" | "online";
        curriculumFocus: string[];
        assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
        certificationOffered: boolean;
        textbookRequired: boolean;
        platform?: string | undefined;
        textbookTitle?: string | undefined;
        materialsUrl?: string | undefined;
    }>, {
        sessionDuration: number;
        classSizeMin: number;
        classSizeMax: number;
        sessionsPerWeek: number;
        totalWeeks: number;
        proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
        targetLanguages: string[];
        deliveryMode: "hybrid" | "in-person" | "online";
        curriculumFocus: string[];
        assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
        certificationOffered: boolean;
        textbookRequired: boolean;
        platform?: string | undefined;
        textbookTitle?: string | undefined;
        materialsUrl?: string | undefined;
    }, {
        sessionDuration: number;
        classSizeMin: number;
        classSizeMax: number;
        sessionsPerWeek: number;
        totalWeeks: number;
        proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
        targetLanguages: string[];
        deliveryMode: "hybrid" | "in-person" | "online";
        curriculumFocus: string[];
        assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
        certificationOffered: boolean;
        textbookRequired: boolean;
        platform?: string | undefined;
        textbookTitle?: string | undefined;
        materialsUrl?: string | undefined;
    }>, z.ZodObject<{
        matchMethod: z.ZodEnum<["skill_based", "random", "interest_based", "manual"]>;
        pairDuration: z.ZodNumber;
        allowGroupBuddies: z.ZodBoolean;
        maxBuddiesPerVolunteer: z.ZodOptional<z.ZodNumber>;
        checkInFrequency: z.ZodEnum<["weekly", "bi-weekly", "monthly"]>;
        checkInFormat: z.ZodEnum<["survey", "call", "meeting", "flexible"]>;
        requiredCheckIns: z.ZodNumber;
        suggestedActivities: z.ZodArray<z.ZodString, "many">;
        mandatoryActivities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        activityTracking: z.ZodBoolean;
        primaryGoals: z.ZodArray<z.ZodString, "many">;
        buddyTrainingRequired: z.ZodBoolean;
        buddyTrainingUrl: z.ZodOptional<z.ZodString>;
        ongoingSupportUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        matchMethod: "skill_based" | "random" | "interest_based" | "manual";
        pairDuration: number;
        allowGroupBuddies: boolean;
        checkInFrequency: "weekly" | "bi-weekly" | "monthly";
        checkInFormat: "flexible" | "survey" | "call" | "meeting";
        requiredCheckIns: number;
        suggestedActivities: string[];
        activityTracking: boolean;
        primaryGoals: string[];
        buddyTrainingRequired: boolean;
        maxBuddiesPerVolunteer?: number | undefined;
        mandatoryActivities?: string[] | undefined;
        buddyTrainingUrl?: string | undefined;
        ongoingSupportUrl?: string | undefined;
    }, {
        matchMethod: "skill_based" | "random" | "interest_based" | "manual";
        pairDuration: number;
        allowGroupBuddies: boolean;
        checkInFrequency: "weekly" | "bi-weekly" | "monthly";
        checkInFormat: "flexible" | "survey" | "call" | "meeting";
        requiredCheckIns: number;
        suggestedActivities: string[];
        activityTracking: boolean;
        primaryGoals: string[];
        buddyTrainingRequired: boolean;
        maxBuddiesPerVolunteer?: number | undefined;
        mandatoryActivities?: string[] | undefined;
        buddyTrainingUrl?: string | undefined;
        ongoingSupportUrl?: string | undefined;
    }>, z.ZodObject<{
        coursePlatforms: z.ZodArray<z.ZodEnum<["linkedin_learning", "coursera", "udemy", "pluralsight", "custom"]>, "many">;
        platformUrls: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        skillTracks: z.ZodArray<z.ZodString, "many">;
        difficultyLevels: z.ZodArray<z.ZodEnum<["beginner", "intermediate", "advanced"]>, "many">;
        certificationRequired: z.ZodBoolean;
        certificationProvider: z.ZodOptional<z.ZodString>;
        minimumCompletionRate: z.ZodNumber;
        timeToComplete: z.ZodNumber;
        milestones: z.ZodArray<z.ZodString, "many">;
        progressTrackingFrequency: z.ZodEnum<["weekly", "bi-weekly", "monthly"]>;
        mentorSupport: z.ZodBoolean;
        peerGroupsEnabled: z.ZodBoolean;
        officeHoursUrl: z.ZodOptional<z.ZodString>;
        maxCostPerParticipant: z.ZodOptional<z.ZodNumber>;
        stipendProvided: z.ZodBoolean;
        stipendAmount: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        coursePlatforms: ("custom" | "linkedin_learning" | "coursera" | "udemy" | "pluralsight")[];
        skillTracks: string[];
        difficultyLevels: ("beginner" | "intermediate" | "advanced")[];
        certificationRequired: boolean;
        minimumCompletionRate: number;
        timeToComplete: number;
        milestones: string[];
        progressTrackingFrequency: "weekly" | "bi-weekly" | "monthly";
        mentorSupport: boolean;
        peerGroupsEnabled: boolean;
        stipendProvided: boolean;
        platformUrls?: Record<string, string> | undefined;
        certificationProvider?: string | undefined;
        officeHoursUrl?: string | undefined;
        maxCostPerParticipant?: number | undefined;
        stipendAmount?: number | undefined;
    }, {
        coursePlatforms: ("custom" | "linkedin_learning" | "coursera" | "udemy" | "pluralsight")[];
        skillTracks: string[];
        difficultyLevels: ("beginner" | "intermediate" | "advanced")[];
        certificationRequired: boolean;
        minimumCompletionRate: number;
        timeToComplete: number;
        milestones: string[];
        progressTrackingFrequency: "weekly" | "bi-weekly" | "monthly";
        mentorSupport: boolean;
        peerGroupsEnabled: boolean;
        stipendProvided: boolean;
        platformUrls?: Record<string, string> | undefined;
        certificationProvider?: string | undefined;
        officeHoursUrl?: string | undefined;
        maxCostPerParticipant?: number | undefined;
        stipendAmount?: number | undefined;
    }>, z.ZodObject<{
        programType: z.ZodEnum<["internship", "apprenticeship", "job_placement", "work_experience", "mixed"]>;
        duration: z.ZodNumber;
        hoursPerWeek: z.ZodNumber;
        placementType: z.ZodEnum<["internal", "external_partner", "mixed"]>;
        partnerOrganizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        industries: z.ZodArray<z.ZodString, "many">;
        skillsRequired: z.ZodArray<z.ZodString, "many">;
        skillsDeveloped: z.ZodArray<z.ZodString, "many">;
        jobCoachProvided: z.ZodBoolean;
        jobCoachHours: z.ZodOptional<z.ZodNumber>;
        cvReviewProvided: z.ZodBoolean;
        interviewPrepProvided: z.ZodBoolean;
        targetOutcomes: z.ZodArray<z.ZodString, "many">;
        successMetrics: z.ZodArray<z.ZodString, "many">;
        compensated: z.ZodBoolean;
        compensationAmount: z.ZodOptional<z.ZodNumber>;
        compensationType: z.ZodOptional<z.ZodEnum<["hourly", "monthly", "stipend"]>>;
    }, "strip", z.ZodTypeAny, {
        industries: string[];
        duration: number;
        programType: "internship" | "apprenticeship" | "job_placement" | "work_experience" | "mixed";
        hoursPerWeek: number;
        placementType: "mixed" | "internal" | "external_partner";
        skillsRequired: string[];
        skillsDeveloped: string[];
        jobCoachProvided: boolean;
        cvReviewProvided: boolean;
        interviewPrepProvided: boolean;
        targetOutcomes: string[];
        successMetrics: string[];
        compensated: boolean;
        partnerOrganizations?: string[] | undefined;
        jobCoachHours?: number | undefined;
        compensationAmount?: number | undefined;
        compensationType?: "monthly" | "hourly" | "stipend" | undefined;
    }, {
        industries: string[];
        duration: number;
        programType: "internship" | "apprenticeship" | "job_placement" | "work_experience" | "mixed";
        hoursPerWeek: number;
        placementType: "mixed" | "internal" | "external_partner";
        skillsRequired: string[];
        skillsDeveloped: string[];
        jobCoachProvided: boolean;
        cvReviewProvided: boolean;
        interviewPrepProvided: boolean;
        targetOutcomes: string[];
        successMetrics: string[];
        compensated: boolean;
        partnerOrganizations?: string[] | undefined;
        jobCoachHours?: number | undefined;
        compensationAmount?: number | undefined;
        compensationType?: "monthly" | "hourly" | "stipend" | undefined;
    }>]>>;
    defaultMinParticipants: z.ZodOptional<z.ZodNumber>;
    defaultMaxParticipants: z.ZodOptional<z.ZodNumber>;
    defaultVolunteersNeeded: z.ZodOptional<z.ZodNumber>;
    outcomeMetrics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    suitableForGroups: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    estimatedCostPerParticipant: z.ZodOptional<z.ZodNumber>;
    estimatedHoursPerVolunteer: z.ZodOptional<z.ZodNumber>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    isPublic: z.ZodOptional<z.ZodBoolean>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    deprecatedAt: z.ZodOptional<z.ZodString>;
    supersededBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    defaultConfig?: {
        sessionFormat: "1-on-1" | "group" | "hybrid";
        sessionDuration: number;
        sessionFrequency: "weekly" | "bi-weekly" | "monthly" | "flexible";
        totalDuration: number;
        matchingCriteria: string[];
        autoMatching: boolean;
        focusAreas: string[];
        outcomesTracked: string[];
        totalSessionsRecommended?: number | undefined;
        mentorRequirements?: {
            minExperience?: number | undefined;
            industries?: string[] | undefined;
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
        } | undefined;
        onboardingMaterialsUrl?: string | undefined;
        sessionGuidelinesUrl?: string | undefined;
    } | {
        sessionDuration: number;
        classSizeMin: number;
        classSizeMax: number;
        sessionsPerWeek: number;
        totalWeeks: number;
        proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
        targetLanguages: string[];
        deliveryMode: "hybrid" | "in-person" | "online";
        curriculumFocus: string[];
        assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
        certificationOffered: boolean;
        textbookRequired: boolean;
        platform?: string | undefined;
        textbookTitle?: string | undefined;
        materialsUrl?: string | undefined;
    } | {
        matchMethod: "skill_based" | "random" | "interest_based" | "manual";
        pairDuration: number;
        allowGroupBuddies: boolean;
        checkInFrequency: "weekly" | "bi-weekly" | "monthly";
        checkInFormat: "flexible" | "survey" | "call" | "meeting";
        requiredCheckIns: number;
        suggestedActivities: string[];
        activityTracking: boolean;
        primaryGoals: string[];
        buddyTrainingRequired: boolean;
        maxBuddiesPerVolunteer?: number | undefined;
        mandatoryActivities?: string[] | undefined;
        buddyTrainingUrl?: string | undefined;
        ongoingSupportUrl?: string | undefined;
    } | {
        coursePlatforms: ("custom" | "linkedin_learning" | "coursera" | "udemy" | "pluralsight")[];
        skillTracks: string[];
        difficultyLevels: ("beginner" | "intermediate" | "advanced")[];
        certificationRequired: boolean;
        minimumCompletionRate: number;
        timeToComplete: number;
        milestones: string[];
        progressTrackingFrequency: "weekly" | "bi-weekly" | "monthly";
        mentorSupport: boolean;
        peerGroupsEnabled: boolean;
        stipendProvided: boolean;
        platformUrls?: Record<string, string> | undefined;
        certificationProvider?: string | undefined;
        officeHoursUrl?: string | undefined;
        maxCostPerParticipant?: number | undefined;
        stipendAmount?: number | undefined;
    } | {
        industries: string[];
        duration: number;
        programType: "internship" | "apprenticeship" | "job_placement" | "work_experience" | "mixed";
        hoursPerWeek: number;
        placementType: "mixed" | "internal" | "external_partner";
        skillsRequired: string[];
        skillsDeveloped: string[];
        jobCoachProvided: boolean;
        cvReviewProvided: boolean;
        interviewPrepProvided: boolean;
        targetOutcomes: string[];
        successMetrics: string[];
        compensated: boolean;
        partnerOrganizations?: string[] | undefined;
        jobCoachHours?: number | undefined;
        compensationAmount?: number | undefined;
        compensationType?: "monthly" | "hourly" | "stipend" | undefined;
    } | undefined;
    outcomeMetrics?: string[] | undefined;
    version?: string | undefined;
    defaultMinParticipants?: number | undefined;
    defaultMaxParticipants?: number | undefined;
    defaultVolunteersNeeded?: number | undefined;
    suitableForGroups?: string[] | undefined;
    estimatedCostPerParticipant?: number | undefined;
    estimatedHoursPerVolunteer?: number | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
    deprecatedAt?: string | undefined;
    supersededBy?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    defaultConfig?: {
        sessionFormat: "1-on-1" | "group" | "hybrid";
        sessionDuration: number;
        sessionFrequency: "weekly" | "bi-weekly" | "monthly" | "flexible";
        totalDuration: number;
        matchingCriteria: string[];
        autoMatching: boolean;
        focusAreas: string[];
        outcomesTracked: string[];
        totalSessionsRecommended?: number | undefined;
        mentorRequirements?: {
            minExperience?: number | undefined;
            industries?: string[] | undefined;
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
        } | undefined;
        onboardingMaterialsUrl?: string | undefined;
        sessionGuidelinesUrl?: string | undefined;
    } | {
        sessionDuration: number;
        classSizeMin: number;
        classSizeMax: number;
        sessionsPerWeek: number;
        totalWeeks: number;
        proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
        targetLanguages: string[];
        deliveryMode: "hybrid" | "in-person" | "online";
        curriculumFocus: string[];
        assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
        certificationOffered: boolean;
        textbookRequired: boolean;
        platform?: string | undefined;
        textbookTitle?: string | undefined;
        materialsUrl?: string | undefined;
    } | {
        matchMethod: "skill_based" | "random" | "interest_based" | "manual";
        pairDuration: number;
        allowGroupBuddies: boolean;
        checkInFrequency: "weekly" | "bi-weekly" | "monthly";
        checkInFormat: "flexible" | "survey" | "call" | "meeting";
        requiredCheckIns: number;
        suggestedActivities: string[];
        activityTracking: boolean;
        primaryGoals: string[];
        buddyTrainingRequired: boolean;
        maxBuddiesPerVolunteer?: number | undefined;
        mandatoryActivities?: string[] | undefined;
        buddyTrainingUrl?: string | undefined;
        ongoingSupportUrl?: string | undefined;
    } | {
        coursePlatforms: ("custom" | "linkedin_learning" | "coursera" | "udemy" | "pluralsight")[];
        skillTracks: string[];
        difficultyLevels: ("beginner" | "intermediate" | "advanced")[];
        certificationRequired: boolean;
        minimumCompletionRate: number;
        timeToComplete: number;
        milestones: string[];
        progressTrackingFrequency: "weekly" | "bi-weekly" | "monthly";
        mentorSupport: boolean;
        peerGroupsEnabled: boolean;
        stipendProvided: boolean;
        platformUrls?: Record<string, string> | undefined;
        certificationProvider?: string | undefined;
        officeHoursUrl?: string | undefined;
        maxCostPerParticipant?: number | undefined;
        stipendAmount?: number | undefined;
    } | {
        industries: string[];
        duration: number;
        programType: "internship" | "apprenticeship" | "job_placement" | "work_experience" | "mixed";
        hoursPerWeek: number;
        placementType: "mixed" | "internal" | "external_partner";
        skillsRequired: string[];
        skillsDeveloped: string[];
        jobCoachProvided: boolean;
        cvReviewProvided: boolean;
        interviewPrepProvided: boolean;
        targetOutcomes: string[];
        successMetrics: string[];
        compensated: boolean;
        partnerOrganizations?: string[] | undefined;
        jobCoachHours?: number | undefined;
        compensationAmount?: number | undefined;
        compensationType?: "monthly" | "hourly" | "stipend" | undefined;
    } | undefined;
    outcomeMetrics?: string[] | undefined;
    version?: string | undefined;
    defaultMinParticipants?: number | undefined;
    defaultMaxParticipants?: number | undefined;
    defaultVolunteersNeeded?: number | undefined;
    suitableForGroups?: string[] | undefined;
    estimatedCostPerParticipant?: number | undefined;
    estimatedHoursPerVolunteer?: number | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
    deprecatedAt?: string | undefined;
    supersededBy?: string | undefined;
}>, {
    name?: string | undefined;
    description?: string | undefined;
    defaultConfig?: {
        sessionFormat: "1-on-1" | "group" | "hybrid";
        sessionDuration: number;
        sessionFrequency: "weekly" | "bi-weekly" | "monthly" | "flexible";
        totalDuration: number;
        matchingCriteria: string[];
        autoMatching: boolean;
        focusAreas: string[];
        outcomesTracked: string[];
        totalSessionsRecommended?: number | undefined;
        mentorRequirements?: {
            minExperience?: number | undefined;
            industries?: string[] | undefined;
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
        } | undefined;
        onboardingMaterialsUrl?: string | undefined;
        sessionGuidelinesUrl?: string | undefined;
    } | {
        sessionDuration: number;
        classSizeMin: number;
        classSizeMax: number;
        sessionsPerWeek: number;
        totalWeeks: number;
        proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
        targetLanguages: string[];
        deliveryMode: "hybrid" | "in-person" | "online";
        curriculumFocus: string[];
        assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
        certificationOffered: boolean;
        textbookRequired: boolean;
        platform?: string | undefined;
        textbookTitle?: string | undefined;
        materialsUrl?: string | undefined;
    } | {
        matchMethod: "skill_based" | "random" | "interest_based" | "manual";
        pairDuration: number;
        allowGroupBuddies: boolean;
        checkInFrequency: "weekly" | "bi-weekly" | "monthly";
        checkInFormat: "flexible" | "survey" | "call" | "meeting";
        requiredCheckIns: number;
        suggestedActivities: string[];
        activityTracking: boolean;
        primaryGoals: string[];
        buddyTrainingRequired: boolean;
        maxBuddiesPerVolunteer?: number | undefined;
        mandatoryActivities?: string[] | undefined;
        buddyTrainingUrl?: string | undefined;
        ongoingSupportUrl?: string | undefined;
    } | {
        coursePlatforms: ("custom" | "linkedin_learning" | "coursera" | "udemy" | "pluralsight")[];
        skillTracks: string[];
        difficultyLevels: ("beginner" | "intermediate" | "advanced")[];
        certificationRequired: boolean;
        minimumCompletionRate: number;
        timeToComplete: number;
        milestones: string[];
        progressTrackingFrequency: "weekly" | "bi-weekly" | "monthly";
        mentorSupport: boolean;
        peerGroupsEnabled: boolean;
        stipendProvided: boolean;
        platformUrls?: Record<string, string> | undefined;
        certificationProvider?: string | undefined;
        officeHoursUrl?: string | undefined;
        maxCostPerParticipant?: number | undefined;
        stipendAmount?: number | undefined;
    } | {
        industries: string[];
        duration: number;
        programType: "internship" | "apprenticeship" | "job_placement" | "work_experience" | "mixed";
        hoursPerWeek: number;
        placementType: "mixed" | "internal" | "external_partner";
        skillsRequired: string[];
        skillsDeveloped: string[];
        jobCoachProvided: boolean;
        cvReviewProvided: boolean;
        interviewPrepProvided: boolean;
        targetOutcomes: string[];
        successMetrics: string[];
        compensated: boolean;
        partnerOrganizations?: string[] | undefined;
        jobCoachHours?: number | undefined;
        compensationAmount?: number | undefined;
        compensationType?: "monthly" | "hourly" | "stipend" | undefined;
    } | undefined;
    outcomeMetrics?: string[] | undefined;
    version?: string | undefined;
    defaultMinParticipants?: number | undefined;
    defaultMaxParticipants?: number | undefined;
    defaultVolunteersNeeded?: number | undefined;
    suitableForGroups?: string[] | undefined;
    estimatedCostPerParticipant?: number | undefined;
    estimatedHoursPerVolunteer?: number | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
    deprecatedAt?: string | undefined;
    supersededBy?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    defaultConfig?: {
        sessionFormat: "1-on-1" | "group" | "hybrid";
        sessionDuration: number;
        sessionFrequency: "weekly" | "bi-weekly" | "monthly" | "flexible";
        totalDuration: number;
        matchingCriteria: string[];
        autoMatching: boolean;
        focusAreas: string[];
        outcomesTracked: string[];
        totalSessionsRecommended?: number | undefined;
        mentorRequirements?: {
            minExperience?: number | undefined;
            industries?: string[] | undefined;
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
        } | undefined;
        onboardingMaterialsUrl?: string | undefined;
        sessionGuidelinesUrl?: string | undefined;
    } | {
        sessionDuration: number;
        classSizeMin: number;
        classSizeMax: number;
        sessionsPerWeek: number;
        totalWeeks: number;
        proficiencyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[];
        targetLanguages: string[];
        deliveryMode: "hybrid" | "in-person" | "online";
        curriculumFocus: string[];
        assessmentFrequency: "weekly" | "bi-weekly" | "monthly" | "end-of-course";
        certificationOffered: boolean;
        textbookRequired: boolean;
        platform?: string | undefined;
        textbookTitle?: string | undefined;
        materialsUrl?: string | undefined;
    } | {
        matchMethod: "skill_based" | "random" | "interest_based" | "manual";
        pairDuration: number;
        allowGroupBuddies: boolean;
        checkInFrequency: "weekly" | "bi-weekly" | "monthly";
        checkInFormat: "flexible" | "survey" | "call" | "meeting";
        requiredCheckIns: number;
        suggestedActivities: string[];
        activityTracking: boolean;
        primaryGoals: string[];
        buddyTrainingRequired: boolean;
        maxBuddiesPerVolunteer?: number | undefined;
        mandatoryActivities?: string[] | undefined;
        buddyTrainingUrl?: string | undefined;
        ongoingSupportUrl?: string | undefined;
    } | {
        coursePlatforms: ("custom" | "linkedin_learning" | "coursera" | "udemy" | "pluralsight")[];
        skillTracks: string[];
        difficultyLevels: ("beginner" | "intermediate" | "advanced")[];
        certificationRequired: boolean;
        minimumCompletionRate: number;
        timeToComplete: number;
        milestones: string[];
        progressTrackingFrequency: "weekly" | "bi-weekly" | "monthly";
        mentorSupport: boolean;
        peerGroupsEnabled: boolean;
        stipendProvided: boolean;
        platformUrls?: Record<string, string> | undefined;
        certificationProvider?: string | undefined;
        officeHoursUrl?: string | undefined;
        maxCostPerParticipant?: number | undefined;
        stipendAmount?: number | undefined;
    } | {
        industries: string[];
        duration: number;
        programType: "internship" | "apprenticeship" | "job_placement" | "work_experience" | "mixed";
        hoursPerWeek: number;
        placementType: "mixed" | "internal" | "external_partner";
        skillsRequired: string[];
        skillsDeveloped: string[];
        jobCoachProvided: boolean;
        cvReviewProvided: boolean;
        interviewPrepProvided: boolean;
        targetOutcomes: string[];
        successMetrics: string[];
        compensated: boolean;
        partnerOrganizations?: string[] | undefined;
        jobCoachHours?: number | undefined;
        compensationAmount?: number | undefined;
        compensationType?: "monthly" | "hourly" | "stipend" | undefined;
    } | undefined;
    outcomeMetrics?: string[] | undefined;
    version?: string | undefined;
    defaultMinParticipants?: number | undefined;
    defaultMaxParticipants?: number | undefined;
    defaultVolunteersNeeded?: number | undefined;
    suitableForGroups?: string[] | undefined;
    estimatedCostPerParticipant?: number | undefined;
    estimatedHoursPerVolunteer?: number | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
    deprecatedAt?: string | undefined;
    supersededBy?: string | undefined;
}>;
export type UpdateProgramTemplateInput = z.infer<typeof UpdateProgramTemplateSchema>;
/**
 * Filter/search program templates
 */
export declare const FilterProgramTemplatesSchema: z.ZodObject<{
    programType: z.ZodOptional<z.ZodEnum<["mentorship", "language", "buddy", "upskilling", "weei"]>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    isPublic: z.ZodOptional<z.ZodBoolean>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    suitableForGroups: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    search: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodEnum<["name", "programType", "version", "createdAt", "updatedAt"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    sortOrder: "asc" | "desc";
    sortBy?: "createdAt" | "name" | "programType" | "updatedAt" | "version" | undefined;
    programType?: "language" | "mentorship" | "buddy" | "upskilling" | "weei" | undefined;
    search?: string | undefined;
    suitableForGroups?: string[] | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
    sortBy?: "createdAt" | "name" | "programType" | "updatedAt" | "version" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    programType?: "language" | "mentorship" | "buddy" | "upskilling" | "weei" | undefined;
    search?: string | undefined;
    suitableForGroups?: string[] | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
}>;
export type FilterProgramTemplatesInput = z.infer<typeof FilterProgramTemplatesSchema>;
/**
 * Program template response (from database)
 */
export declare const ProgramTemplateSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    programType: z.ZodEnum<["mentorship", "language", "buddy", "upskilling", "weei"]>;
    version: z.ZodString;
    defaultConfig: z.ZodAny;
    defaultMinParticipants: z.ZodNumber;
    defaultMaxParticipants: z.ZodNumber;
    defaultVolunteersNeeded: z.ZodNumber;
    outcomeMetrics: z.ZodArray<z.ZodString, "many">;
    suitableForGroups: z.ZodArray<z.ZodString, "many">;
    estimatedCostPerParticipant: z.ZodNullable<z.ZodString>;
    estimatedHoursPerVolunteer: z.ZodNullable<z.ZodString>;
    isActive: z.ZodBoolean;
    isPublic: z.ZodBoolean;
    createdBy: z.ZodNullable<z.ZodString>;
    tags: z.ZodArray<z.ZodString, "many">;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    deprecatedAt: z.ZodNullable<z.ZodString>;
    supersededBy: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    id: string;
    name: string;
    programType: "language" | "mentorship" | "buddy" | "upskilling" | "weei";
    updatedAt: string;
    description: string | null;
    outcomeMetrics: string[];
    version: string;
    defaultMinParticipants: number;
    defaultMaxParticipants: number;
    defaultVolunteersNeeded: number;
    suitableForGroups: string[];
    estimatedCostPerParticipant: string | null;
    estimatedHoursPerVolunteer: string | null;
    isActive: boolean;
    isPublic: boolean;
    tags: string[];
    deprecatedAt: string | null;
    supersededBy: string | null;
    createdBy: string | null;
    defaultConfig?: any;
}, {
    createdAt: string;
    id: string;
    name: string;
    programType: "language" | "mentorship" | "buddy" | "upskilling" | "weei";
    updatedAt: string;
    description: string | null;
    outcomeMetrics: string[];
    version: string;
    defaultMinParticipants: number;
    defaultMaxParticipants: number;
    defaultVolunteersNeeded: number;
    suitableForGroups: string[];
    estimatedCostPerParticipant: string | null;
    estimatedHoursPerVolunteer: string | null;
    isActive: boolean;
    isPublic: boolean;
    tags: string[];
    deprecatedAt: string | null;
    supersededBy: string | null;
    createdBy: string | null;
    defaultConfig?: any;
}>;
export type ProgramTemplate = z.infer<typeof ProgramTemplateSchema>;
/**
 * Paginated response
 */
export declare const ProgramTemplatesResponseSchema: z.ZodObject<{
    templates: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        programType: z.ZodEnum<["mentorship", "language", "buddy", "upskilling", "weei"]>;
        version: z.ZodString;
        defaultConfig: z.ZodAny;
        defaultMinParticipants: z.ZodNumber;
        defaultMaxParticipants: z.ZodNumber;
        defaultVolunteersNeeded: z.ZodNumber;
        outcomeMetrics: z.ZodArray<z.ZodString, "many">;
        suitableForGroups: z.ZodArray<z.ZodString, "many">;
        estimatedCostPerParticipant: z.ZodNullable<z.ZodString>;
        estimatedHoursPerVolunteer: z.ZodNullable<z.ZodString>;
        isActive: z.ZodBoolean;
        isPublic: z.ZodBoolean;
        createdBy: z.ZodNullable<z.ZodString>;
        tags: z.ZodArray<z.ZodString, "many">;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        deprecatedAt: z.ZodNullable<z.ZodString>;
        supersededBy: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        createdAt: string;
        id: string;
        name: string;
        programType: "language" | "mentorship" | "buddy" | "upskilling" | "weei";
        updatedAt: string;
        description: string | null;
        outcomeMetrics: string[];
        version: string;
        defaultMinParticipants: number;
        defaultMaxParticipants: number;
        defaultVolunteersNeeded: number;
        suitableForGroups: string[];
        estimatedCostPerParticipant: string | null;
        estimatedHoursPerVolunteer: string | null;
        isActive: boolean;
        isPublic: boolean;
        tags: string[];
        deprecatedAt: string | null;
        supersededBy: string | null;
        createdBy: string | null;
        defaultConfig?: any;
    }, {
        createdAt: string;
        id: string;
        name: string;
        programType: "language" | "mentorship" | "buddy" | "upskilling" | "weei";
        updatedAt: string;
        description: string | null;
        outcomeMetrics: string[];
        version: string;
        defaultMinParticipants: number;
        defaultMaxParticipants: number;
        defaultVolunteersNeeded: number;
        suitableForGroups: string[];
        estimatedCostPerParticipant: string | null;
        estimatedHoursPerVolunteer: string | null;
        isActive: boolean;
        isPublic: boolean;
        tags: string[];
        deprecatedAt: string | null;
        supersededBy: string | null;
        createdBy: string | null;
        defaultConfig?: any;
    }>, "many">;
    pagination: z.ZodObject<{
        total: z.ZodNumber;
        limit: z.ZodNumber;
        offset: z.ZodNumber;
        hasMore: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    }, {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    };
    templates: {
        createdAt: string;
        id: string;
        name: string;
        programType: "language" | "mentorship" | "buddy" | "upskilling" | "weei";
        updatedAt: string;
        description: string | null;
        outcomeMetrics: string[];
        version: string;
        defaultMinParticipants: number;
        defaultMaxParticipants: number;
        defaultVolunteersNeeded: number;
        suitableForGroups: string[];
        estimatedCostPerParticipant: string | null;
        estimatedHoursPerVolunteer: string | null;
        isActive: boolean;
        isPublic: boolean;
        tags: string[];
        deprecatedAt: string | null;
        supersededBy: string | null;
        createdBy: string | null;
        defaultConfig?: any;
    }[];
}, {
    pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    };
    templates: {
        createdAt: string;
        id: string;
        name: string;
        programType: "language" | "mentorship" | "buddy" | "upskilling" | "weei";
        updatedAt: string;
        description: string | null;
        outcomeMetrics: string[];
        version: string;
        defaultMinParticipants: number;
        defaultMaxParticipants: number;
        defaultVolunteersNeeded: number;
        suitableForGroups: string[];
        estimatedCostPerParticipant: string | null;
        estimatedHoursPerVolunteer: string | null;
        isActive: boolean;
        isPublic: boolean;
        tags: string[];
        deprecatedAt: string | null;
        supersededBy: string | null;
        createdBy: string | null;
        defaultConfig?: any;
    }[];
}>;
export type ProgramTemplatesResponse = z.infer<typeof ProgramTemplatesResponseSchema>;
/**
 * Type guard for mentorship config
 */
export declare function isMentorshipConfig(config: any): config is MentorshipConfig;
/**
 * Type guard for language config
 */
export declare function isLanguageConfig(config: any): config is LanguageConfig;
/**
 * Type guard for buddy config
 */
export declare function isBuddyConfig(config: any): config is BuddyConfig;
/**
 * Type guard for upskilling config
 */
export declare function isUpskillingConfig(config: any): config is UpskillingConfig;
/**
 * Type guard for weei config
 */
export declare function isWeeiConfig(config: any): config is WeeiConfig;
/**
 * Get config by program type
 */
export declare function getConfigByType(template: ProgramTemplate): ProgramTemplateConfig;
/**
 * Check if template is deprecated
 */
export declare function isTemplateDeprecated(template: ProgramTemplate): boolean;
/**
 * Check if template is active and available
 */
export declare function isTemplateAvailable(template: ProgramTemplate): boolean;
/**
 * Check if template is suitable for beneficiary group
 */
export declare function isTemplateSuitableForGroup(template: ProgramTemplate, groupTags: string[]): boolean;
/**
 * Summary type for list views
 */
export type ProgramTemplateSummary = Pick<ProgramTemplate, 'id' | 'name' | 'programType' | 'version' | 'isActive' | 'isPublic' | 'tags' | 'estimatedCostPerParticipant'>;
/**
 * Template compatibility check result
 */
export interface TemplateCompatibility {
    isCompatible: boolean;
    reasons: string[];
    suitabilityScore: number;
}
/**
 * Template versioning info
 */
export interface TemplateVersionInfo {
    currentVersion: string;
    isDeprecated: boolean;
    supersededBy: string | null;
    deprecatedAt: string | null;
}
//# sourceMappingURL=program-templates.d.ts.map