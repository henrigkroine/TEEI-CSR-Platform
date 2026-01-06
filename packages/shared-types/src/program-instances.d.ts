import { z } from 'zod';
/**
 * Program Instances Types & Validation
 *
 * SWARM 6: Beneficiary Groups, Campaigns & Monetization
 * Runtime execution of campaigns with inherited configuration
 *
 * @see /packages/shared-schema/src/schema/program-instances.ts
 * @see /docs/INSTANCE_LIFECYCLE.md
 */
export declare const ProgramInstanceStatusEnum: z.ZodEnum<["planned", "active", "paused", "completed"]>;
export type ProgramInstanceStatus = z.infer<typeof ProgramInstanceStatusEnum>;
/**
 * Outcome scores by dimension
 */
export declare const OutcomeScoresSchema: z.ZodRecord<z.ZodString, z.ZodNumber>;
export type OutcomeScores = z.infer<typeof OutcomeScoresSchema>;
/**
 * Create program instance request
 */
export declare const CreateProgramInstanceSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodString;
    campaignId: z.ZodString;
    programTemplateId: z.ZodOptional<z.ZodString>;
    companyId: z.ZodOptional<z.ZodString>;
    beneficiaryGroupId: z.ZodOptional<z.ZodString>;
    startDate: z.ZodString;
    endDate: z.ZodString;
    config: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
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
    status: z.ZodOptional<z.ZodEnum<["planned", "active", "paused", "completed"]>>;
    enrolledVolunteers: z.ZodDefault<z.ZodNumber>;
    enrolledBeneficiaries: z.ZodDefault<z.ZodNumber>;
    activePairs: z.ZodOptional<z.ZodNumber>;
    activeGroups: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    campaignId: string;
    startDate: string;
    endDate: string;
    name: string;
    enrolledVolunteers: number;
    enrolledBeneficiaries: number;
    status?: "planned" | "active" | "paused" | "completed" | undefined;
    programTemplateId?: string | undefined;
    beneficiaryGroupId?: string | undefined;
    companyId?: string | undefined;
    config?: {
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
    activePairs?: number | undefined;
    activeGroups?: number | undefined;
}, {
    campaignId: string;
    startDate: string;
    endDate: string;
    name: string;
    status?: "planned" | "active" | "paused" | "completed" | undefined;
    programTemplateId?: string | undefined;
    beneficiaryGroupId?: string | undefined;
    companyId?: string | undefined;
    config?: {
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
    enrolledVolunteers?: number | undefined;
    enrolledBeneficiaries?: number | undefined;
    activePairs?: number | undefined;
    activeGroups?: number | undefined;
}>, {
    campaignId: string;
    startDate: string;
    endDate: string;
    name: string;
    enrolledVolunteers: number;
    enrolledBeneficiaries: number;
    status?: "planned" | "active" | "paused" | "completed" | undefined;
    programTemplateId?: string | undefined;
    beneficiaryGroupId?: string | undefined;
    companyId?: string | undefined;
    config?: {
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
    activePairs?: number | undefined;
    activeGroups?: number | undefined;
}, {
    campaignId: string;
    startDate: string;
    endDate: string;
    name: string;
    status?: "planned" | "active" | "paused" | "completed" | undefined;
    programTemplateId?: string | undefined;
    beneficiaryGroupId?: string | undefined;
    companyId?: string | undefined;
    config?: {
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
    enrolledVolunteers?: number | undefined;
    enrolledBeneficiaries?: number | undefined;
    activePairs?: number | undefined;
    activeGroups?: number | undefined;
}>;
export type CreateProgramInstanceInput = z.infer<typeof CreateProgramInstanceSchema>;
/**
 * Update program instance request
 */
export declare const UpdateProgramInstanceSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["planned", "active", "paused", "completed"]>>;
    config: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
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
    enrolledVolunteers: z.ZodOptional<z.ZodNumber>;
    enrolledBeneficiaries: z.ZodOptional<z.ZodNumber>;
    activePairs: z.ZodOptional<z.ZodNumber>;
    activeGroups: z.ZodOptional<z.ZodNumber>;
    totalSessionsHeld: z.ZodOptional<z.ZodNumber>;
    totalHoursLogged: z.ZodOptional<z.ZodNumber>;
    sroiScore: z.ZodOptional<z.ZodNumber>;
    averageVISScore: z.ZodOptional<z.ZodNumber>;
    outcomeScores: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    volunteersConsumed: z.ZodOptional<z.ZodNumber>;
    creditsConsumed: z.ZodOptional<z.ZodNumber>;
    learnersServed: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: "planned" | "active" | "paused" | "completed" | undefined;
    outcomeScores?: Record<string, number> | undefined;
    sroiScore?: number | undefined;
    averageVISScore?: number | undefined;
    totalHoursLogged?: number | undefined;
    creditsConsumed?: number | undefined;
    learnersServed?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    name?: string | undefined;
    config?: {
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
    enrolledVolunteers?: number | undefined;
    enrolledBeneficiaries?: number | undefined;
    activePairs?: number | undefined;
    activeGroups?: number | undefined;
    totalSessionsHeld?: number | undefined;
    volunteersConsumed?: number | undefined;
}, {
    status?: "planned" | "active" | "paused" | "completed" | undefined;
    outcomeScores?: Record<string, number> | undefined;
    sroiScore?: number | undefined;
    averageVISScore?: number | undefined;
    totalHoursLogged?: number | undefined;
    creditsConsumed?: number | undefined;
    learnersServed?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    name?: string | undefined;
    config?: {
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
    enrolledVolunteers?: number | undefined;
    enrolledBeneficiaries?: number | undefined;
    activePairs?: number | undefined;
    activeGroups?: number | undefined;
    totalSessionsHeld?: number | undefined;
    volunteersConsumed?: number | undefined;
}>, {
    status?: "planned" | "active" | "paused" | "completed" | undefined;
    outcomeScores?: Record<string, number> | undefined;
    sroiScore?: number | undefined;
    averageVISScore?: number | undefined;
    totalHoursLogged?: number | undefined;
    creditsConsumed?: number | undefined;
    learnersServed?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    name?: string | undefined;
    config?: {
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
    enrolledVolunteers?: number | undefined;
    enrolledBeneficiaries?: number | undefined;
    activePairs?: number | undefined;
    activeGroups?: number | undefined;
    totalSessionsHeld?: number | undefined;
    volunteersConsumed?: number | undefined;
}, {
    status?: "planned" | "active" | "paused" | "completed" | undefined;
    outcomeScores?: Record<string, number> | undefined;
    sroiScore?: number | undefined;
    averageVISScore?: number | undefined;
    totalHoursLogged?: number | undefined;
    creditsConsumed?: number | undefined;
    learnersServed?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    name?: string | undefined;
    config?: {
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
    enrolledVolunteers?: number | undefined;
    enrolledBeneficiaries?: number | undefined;
    activePairs?: number | undefined;
    activeGroups?: number | undefined;
    totalSessionsHeld?: number | undefined;
    volunteersConsumed?: number | undefined;
}>;
export type UpdateProgramInstanceInput = z.infer<typeof UpdateProgramInstanceSchema>;
/**
 * Filter/search program instances
 */
export declare const FilterProgramInstancesSchema: z.ZodObject<{
    campaignId: z.ZodOptional<z.ZodString>;
    companyId: z.ZodOptional<z.ZodString>;
    programTemplateId: z.ZodOptional<z.ZodString>;
    beneficiaryGroupId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["planned", "active", "paused", "completed"]>>;
    statuses: z.ZodOptional<z.ZodArray<z.ZodEnum<["planned", "active", "paused", "completed"]>, "many">>;
    startDateFrom: z.ZodOptional<z.ZodString>;
    startDateTo: z.ZodOptional<z.ZodString>;
    endDateFrom: z.ZodOptional<z.ZodString>;
    endDateTo: z.ZodOptional<z.ZodString>;
    hasActivity: z.ZodOptional<z.ZodBoolean>;
    minSessions: z.ZodOptional<z.ZodNumber>;
    minHours: z.ZodOptional<z.ZodNumber>;
    minSROI: z.ZodOptional<z.ZodNumber>;
    minVIS: z.ZodOptional<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodEnum<["name", "startDate", "endDate", "status", "totalHoursLogged", "sroiScore", "createdAt"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    sortOrder: "asc" | "desc";
    status?: "planned" | "active" | "paused" | "completed" | undefined;
    programTemplateId?: string | undefined;
    beneficiaryGroupId?: string | undefined;
    companyId?: string | undefined;
    campaignId?: string | undefined;
    minSROI?: number | undefined;
    minVIS?: number | undefined;
    sortBy?: "status" | "sroiScore" | "totalHoursLogged" | "createdAt" | "startDate" | "endDate" | "name" | undefined;
    statuses?: ("planned" | "active" | "paused" | "completed")[] | undefined;
    startDateFrom?: string | undefined;
    startDateTo?: string | undefined;
    endDateFrom?: string | undefined;
    endDateTo?: string | undefined;
    hasActivity?: boolean | undefined;
    minSessions?: number | undefined;
    minHours?: number | undefined;
    search?: string | undefined;
}, {
    status?: "planned" | "active" | "paused" | "completed" | undefined;
    programTemplateId?: string | undefined;
    beneficiaryGroupId?: string | undefined;
    companyId?: string | undefined;
    campaignId?: string | undefined;
    minSROI?: number | undefined;
    minVIS?: number | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    sortBy?: "status" | "sroiScore" | "totalHoursLogged" | "createdAt" | "startDate" | "endDate" | "name" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    statuses?: ("planned" | "active" | "paused" | "completed")[] | undefined;
    startDateFrom?: string | undefined;
    startDateTo?: string | undefined;
    endDateFrom?: string | undefined;
    endDateTo?: string | undefined;
    hasActivity?: boolean | undefined;
    minSessions?: number | undefined;
    minHours?: number | undefined;
    search?: string | undefined;
}>;
export type FilterProgramInstancesInput = z.infer<typeof FilterProgramInstancesSchema>;
/**
 * Program instance response (from database)
 */
export declare const ProgramInstanceSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    campaignId: z.ZodString;
    programTemplateId: z.ZodString;
    companyId: z.ZodString;
    beneficiaryGroupId: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    status: z.ZodEnum<["planned", "active", "paused", "completed"]>;
    config: z.ZodAny;
    enrolledVolunteers: z.ZodNumber;
    enrolledBeneficiaries: z.ZodNumber;
    activePairs: z.ZodNullable<z.ZodNumber>;
    activeGroups: z.ZodNullable<z.ZodNumber>;
    totalSessionsHeld: z.ZodNumber;
    totalHoursLogged: z.ZodString;
    sroiScore: z.ZodNullable<z.ZodString>;
    averageVISScore: z.ZodNullable<z.ZodString>;
    outcomeScores: z.ZodRecord<z.ZodString, z.ZodNumber>;
    volunteersConsumed: z.ZodNumber;
    creditsConsumed: z.ZodNullable<z.ZodString>;
    learnersServed: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    lastActivityAt: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "planned" | "active" | "paused" | "completed";
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    outcomeScores: Record<string, number>;
    campaignId: string;
    sroiScore: string | null;
    averageVISScore: string | null;
    totalHoursLogged: string;
    creditsConsumed: string | null;
    learnersServed: number;
    createdAt: string;
    id: string;
    startDate: string;
    endDate: string;
    name: string;
    enrolledVolunteers: number;
    enrolledBeneficiaries: number;
    activePairs: number | null;
    activeGroups: number | null;
    totalSessionsHeld: number;
    volunteersConsumed: number;
    updatedAt: string;
    lastActivityAt: string | null;
    config?: any;
}, {
    status: "planned" | "active" | "paused" | "completed";
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    outcomeScores: Record<string, number>;
    campaignId: string;
    sroiScore: string | null;
    averageVISScore: string | null;
    totalHoursLogged: string;
    creditsConsumed: string | null;
    learnersServed: number;
    createdAt: string;
    id: string;
    startDate: string;
    endDate: string;
    name: string;
    enrolledVolunteers: number;
    enrolledBeneficiaries: number;
    activePairs: number | null;
    activeGroups: number | null;
    totalSessionsHeld: number;
    volunteersConsumed: number;
    updatedAt: string;
    lastActivityAt: string | null;
    config?: any;
}>;
export type ProgramInstance = z.infer<typeof ProgramInstanceSchema>;
/**
 * Paginated response
 */
export declare const ProgramInstancesResponseSchema: z.ZodObject<{
    instances: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        campaignId: z.ZodString;
        programTemplateId: z.ZodString;
        companyId: z.ZodString;
        beneficiaryGroupId: z.ZodString;
        startDate: z.ZodString;
        endDate: z.ZodString;
        status: z.ZodEnum<["planned", "active", "paused", "completed"]>;
        config: z.ZodAny;
        enrolledVolunteers: z.ZodNumber;
        enrolledBeneficiaries: z.ZodNumber;
        activePairs: z.ZodNullable<z.ZodNumber>;
        activeGroups: z.ZodNullable<z.ZodNumber>;
        totalSessionsHeld: z.ZodNumber;
        totalHoursLogged: z.ZodString;
        sroiScore: z.ZodNullable<z.ZodString>;
        averageVISScore: z.ZodNullable<z.ZodString>;
        outcomeScores: z.ZodRecord<z.ZodString, z.ZodNumber>;
        volunteersConsumed: z.ZodNumber;
        creditsConsumed: z.ZodNullable<z.ZodString>;
        learnersServed: z.ZodNumber;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        lastActivityAt: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "planned" | "active" | "paused" | "completed";
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        outcomeScores: Record<string, number>;
        campaignId: string;
        sroiScore: string | null;
        averageVISScore: string | null;
        totalHoursLogged: string;
        creditsConsumed: string | null;
        learnersServed: number;
        createdAt: string;
        id: string;
        startDate: string;
        endDate: string;
        name: string;
        enrolledVolunteers: number;
        enrolledBeneficiaries: number;
        activePairs: number | null;
        activeGroups: number | null;
        totalSessionsHeld: number;
        volunteersConsumed: number;
        updatedAt: string;
        lastActivityAt: string | null;
        config?: any;
    }, {
        status: "planned" | "active" | "paused" | "completed";
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        outcomeScores: Record<string, number>;
        campaignId: string;
        sroiScore: string | null;
        averageVISScore: string | null;
        totalHoursLogged: string;
        creditsConsumed: string | null;
        learnersServed: number;
        createdAt: string;
        id: string;
        startDate: string;
        endDate: string;
        name: string;
        enrolledVolunteers: number;
        enrolledBeneficiaries: number;
        activePairs: number | null;
        activeGroups: number | null;
        totalSessionsHeld: number;
        volunteersConsumed: number;
        updatedAt: string;
        lastActivityAt: string | null;
        config?: any;
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
    instances: {
        status: "planned" | "active" | "paused" | "completed";
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        outcomeScores: Record<string, number>;
        campaignId: string;
        sroiScore: string | null;
        averageVISScore: string | null;
        totalHoursLogged: string;
        creditsConsumed: string | null;
        learnersServed: number;
        createdAt: string;
        id: string;
        startDate: string;
        endDate: string;
        name: string;
        enrolledVolunteers: number;
        enrolledBeneficiaries: number;
        activePairs: number | null;
        activeGroups: number | null;
        totalSessionsHeld: number;
        volunteersConsumed: number;
        updatedAt: string;
        lastActivityAt: string | null;
        config?: any;
    }[];
}, {
    pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    };
    instances: {
        status: "planned" | "active" | "paused" | "completed";
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        outcomeScores: Record<string, number>;
        campaignId: string;
        sroiScore: string | null;
        averageVISScore: string | null;
        totalHoursLogged: string;
        creditsConsumed: string | null;
        learnersServed: number;
        createdAt: string;
        id: string;
        startDate: string;
        endDate: string;
        name: string;
        enrolledVolunteers: number;
        enrolledBeneficiaries: number;
        activePairs: number | null;
        activeGroups: number | null;
        totalSessionsHeld: number;
        volunteersConsumed: number;
        updatedAt: string;
        lastActivityAt: string | null;
        config?: any;
    }[];
}>;
export type ProgramInstancesResponse = z.infer<typeof ProgramInstancesResponseSchema>;
/**
 * Activity log entry (for tracking sessions/events)
 */
export declare const InstanceActivityLogSchema: z.ZodObject<{
    id: z.ZodString;
    programInstanceId: z.ZodString;
    activityType: z.ZodEnum<["session", "check-in", "milestone", "completion", "other"]>;
    activityDate: z.ZodString;
    duration: z.ZodOptional<z.ZodNumber>;
    participantCount: z.ZodOptional<z.ZodNumber>;
    description: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    id: string;
    programInstanceId: string;
    activityType: "session" | "check-in" | "milestone" | "completion" | "other";
    activityDate: string;
    metadata?: Record<string, any> | undefined;
    duration?: number | undefined;
    participantCount?: number | undefined;
    description?: string | undefined;
}, {
    createdAt: string;
    id: string;
    programInstanceId: string;
    activityType: "session" | "check-in" | "milestone" | "completion" | "other";
    activityDate: string;
    metadata?: Record<string, any> | undefined;
    duration?: number | undefined;
    participantCount?: number | undefined;
    description?: string | undefined;
}>;
export type InstanceActivityLog = z.infer<typeof InstanceActivityLogSchema>;
/**
 * Metrics update request (for aggregation jobs)
 */
export declare const UpdateInstanceMetricsSchema: z.ZodObject<{
    totalSessionsHeld: z.ZodNumber;
    totalHoursLogged: z.ZodNumber;
    sroiScore: z.ZodOptional<z.ZodNumber>;
    averageVISScore: z.ZodOptional<z.ZodNumber>;
    outcomeScores: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    volunteersConsumed: z.ZodNumber;
    creditsConsumed: z.ZodOptional<z.ZodNumber>;
    learnersServed: z.ZodNumber;
    lastActivityAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    totalHoursLogged: number;
    learnersServed: number;
    totalSessionsHeld: number;
    volunteersConsumed: number;
    outcomeScores?: Record<string, number> | undefined;
    sroiScore?: number | undefined;
    averageVISScore?: number | undefined;
    creditsConsumed?: number | undefined;
    lastActivityAt?: string | undefined;
}, {
    totalHoursLogged: number;
    learnersServed: number;
    totalSessionsHeld: number;
    volunteersConsumed: number;
    outcomeScores?: Record<string, number> | undefined;
    sroiScore?: number | undefined;
    averageVISScore?: number | undefined;
    creditsConsumed?: number | undefined;
    lastActivityAt?: string | undefined;
}>;
export type UpdateInstanceMetrics = z.infer<typeof UpdateInstanceMetricsSchema>;
/**
 * Check if instance is active
 */
export declare function isInstanceActive(instance: ProgramInstance): boolean;
/**
 * Check if instance is completed
 */
export declare function isInstanceCompleted(instance: ProgramInstance): boolean;
/**
 * Check if instance can be started
 */
export declare function canStartInstance(instance: ProgramInstance): boolean;
/**
 * Check if instance can be paused
 */
export declare function canPauseInstance(instance: ProgramInstance): boolean;
/**
 * Check if instance can be resumed
 */
export declare function canResumeInstance(instance: ProgramInstance): boolean;
/**
 * Check if instance can be completed
 */
export declare function canCompleteInstance(instance: ProgramInstance): boolean;
/**
 * Check if instance has activity
 */
export declare function hasActivity(instance: ProgramInstance): boolean;
/**
 * Check if instance has participants
 */
export declare function hasParticipants(instance: ProgramInstance): boolean;
/**
 * Check if instance has impact metrics
 */
export declare function hasImpactMetrics(instance: ProgramInstance): boolean;
/**
 * Check if instance is within date range
 */
export declare function isInstanceInDateRange(instance: ProgramInstance, date?: Date): boolean;
/**
 * Check if instance is overdue
 */
export declare function isInstanceOverdue(instance: ProgramInstance): boolean;
/**
 * Summary type for list views
 */
export type ProgramInstanceSummary = Pick<ProgramInstance, 'id' | 'name' | 'status' | 'campaignId' | 'startDate' | 'endDate' | 'enrolledVolunteers' | 'enrolledBeneficiaries' | 'totalSessionsHeld' | 'totalHoursLogged'>;
/**
 * Participant metrics
 */
export interface InstanceParticipantMetrics {
    volunteers: {
        enrolled: number;
        consumed: number;
        active: number;
    };
    beneficiaries: {
        enrolled: number;
        served: number;
        active: number;
    };
    pairs: number | null;
    groups: number | null;
}
/**
 * Activity metrics
 */
export interface InstanceActivityMetrics {
    sessions: {
        total: number;
        avgPerWeek: number;
        avgDuration: number;
    };
    hours: {
        total: number;
        avgPerVolunteer: number;
        avgPerBeneficiary: number;
    };
    lastActivity: string | null;
}
/**
 * Impact metrics
 */
export interface InstanceImpactMetrics {
    sroi: number | null;
    vis: number | null;
    outcomeScores: OutcomeScores;
    evidenceCount: number;
}
/**
 * Capacity consumption
 */
export interface InstanceCapacityConsumption {
    volunteers: number;
    credits: number | null;
    learners: number;
    percentage: number;
}
/**
 * State transition input
 */
export declare const InstanceStateTransitionSchema: z.ZodObject<{
    targetStatus: z.ZodEnum<["planned", "active", "paused", "completed"]>;
    reason: z.ZodOptional<z.ZodString>;
    effectiveDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    targetStatus: "planned" | "active" | "paused" | "completed";
    reason?: string | undefined;
    effectiveDate?: string | undefined;
}, {
    targetStatus: "planned" | "active" | "paused" | "completed";
    reason?: string | undefined;
    effectiveDate?: string | undefined;
}>;
export type InstanceStateTransition = z.infer<typeof InstanceStateTransitionSchema>;
/**
 * Aggregation result (for rolling up to campaign)
 */
export interface InstanceAggregation {
    totalInstances: number;
    activeInstances: number;
    completedInstances: number;
    totalVolunteers: number;
    totalBeneficiaries: number;
    totalSessions: number;
    totalHours: number;
    avgSROI: number | null;
    avgVIS: number | null;
    totalCreditsConsumed: number;
    totalLearnersServed: number;
}
//# sourceMappingURL=program-instances.d.ts.map