import { z } from 'zod';
/**
 * Campaign Metrics Types & Validation
 *
 * SWARM 6: Beneficiary Groups, Campaigns & Monetization
 * Time-series tracking for campaign performance over time
 *
 * @see /packages/shared-schema/src/schema/campaign-metrics-snapshots.ts
 * @see /docs/METRICS_RETENTION_POLICY.md
 */
/**
 * Alert triggered at snapshot time
 */
export declare const AlertSchema: z.ZodObject<{
    type: z.ZodEnum<["capacity_warning", "capacity_critical", "budget_warning", "performance_low"]>;
    threshold: z.ZodNumber;
    currentValue: z.ZodNumber;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
    message: string;
    threshold: number;
    currentValue: number;
}, {
    type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
    message: string;
    threshold: number;
    currentValue: number;
}>;
export type Alert = z.infer<typeof AlertSchema>;
/**
 * Program instances summary
 */
export declare const ProgramInstancesSummarySchema: z.ZodObject<{
    activeCount: z.ZodNumber;
    totalCount: z.ZodNumber;
    avgOutcomeScores: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    activeCount: number;
    totalCount: number;
    avgOutcomeScores?: Record<string, number> | undefined;
}, {
    activeCount: number;
    totalCount: number;
    avgOutcomeScores?: Record<string, number> | undefined;
}>;
export type ProgramInstancesSummary = z.infer<typeof ProgramInstancesSummarySchema>;
/**
 * Engagement metrics
 */
export declare const EngagementMetricsSchema: z.ZodObject<{
    volunteerRetentionRate: z.ZodOptional<z.ZodNumber>;
    beneficiaryDropoutRate: z.ZodOptional<z.ZodNumber>;
    avgSessionsPerVolunteer: z.ZodOptional<z.ZodNumber>;
    avgSessionsPerBeneficiary: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    volunteerRetentionRate?: number | undefined;
    beneficiaryDropoutRate?: number | undefined;
    avgSessionsPerVolunteer?: number | undefined;
    avgSessionsPerBeneficiary?: number | undefined;
}, {
    volunteerRetentionRate?: number | undefined;
    beneficiaryDropoutRate?: number | undefined;
    avgSessionsPerVolunteer?: number | undefined;
    avgSessionsPerBeneficiary?: number | undefined;
}>;
export type EngagementMetrics = z.infer<typeof EngagementMetricsSchema>;
/**
 * Outcome scores by category
 */
export declare const CampaignOutcomeScoresSchema: z.ZodObject<{
    integration: z.ZodOptional<z.ZodNumber>;
    language: z.ZodOptional<z.ZodNumber>;
    jobReadiness: z.ZodOptional<z.ZodNumber>;
    wellbeing: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    integration?: number | undefined;
    language?: number | undefined;
    jobReadiness?: number | undefined;
    wellbeing?: number | undefined;
}, {
    integration?: number | undefined;
    language?: number | undefined;
    jobReadiness?: number | undefined;
    wellbeing?: number | undefined;
}>;
export type CampaignOutcomeScores = z.infer<typeof CampaignOutcomeScoresSchema>;
/**
 * Snapshot metadata
 */
export declare const SnapshotMetadataSchema: z.ZodObject<{
    generatedBy: z.ZodString;
    dataSource: z.ZodString;
    calculationDurationMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    generatedBy: string;
    dataSource: string;
    calculationDurationMs?: number | undefined;
}, {
    generatedBy: string;
    dataSource: string;
    calculationDurationMs?: number | undefined;
}>;
export type SnapshotMetadata = z.infer<typeof SnapshotMetadataSchema>;
/**
 * Full snapshot JSONB structure
 */
export declare const FullSnapshotSchema: z.ZodObject<{
    campaignName: z.ZodString;
    status: z.ZodEnum<["draft", "planned", "recruiting", "active", "paused", "completed", "closed"]>;
    programTemplateId: z.ZodString;
    beneficiaryGroupId: z.ZodString;
    companyId: z.ZodString;
    programInstances: z.ZodOptional<z.ZodObject<{
        activeCount: z.ZodNumber;
        totalCount: z.ZodNumber;
        avgOutcomeScores: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        activeCount: number;
        totalCount: number;
        avgOutcomeScores?: Record<string, number> | undefined;
    }, {
        activeCount: number;
        totalCount: number;
        avgOutcomeScores?: Record<string, number> | undefined;
    }>>;
    engagement: z.ZodOptional<z.ZodObject<{
        volunteerRetentionRate: z.ZodOptional<z.ZodNumber>;
        beneficiaryDropoutRate: z.ZodOptional<z.ZodNumber>;
        avgSessionsPerVolunteer: z.ZodOptional<z.ZodNumber>;
        avgSessionsPerBeneficiary: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        volunteerRetentionRate?: number | undefined;
        beneficiaryDropoutRate?: number | undefined;
        avgSessionsPerVolunteer?: number | undefined;
        avgSessionsPerBeneficiary?: number | undefined;
    }, {
        volunteerRetentionRate?: number | undefined;
        beneficiaryDropoutRate?: number | undefined;
        avgSessionsPerVolunteer?: number | undefined;
        avgSessionsPerBeneficiary?: number | undefined;
    }>>;
    outcomeScores: z.ZodOptional<z.ZodObject<{
        integration: z.ZodOptional<z.ZodNumber>;
        language: z.ZodOptional<z.ZodNumber>;
        jobReadiness: z.ZodOptional<z.ZodNumber>;
        wellbeing: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        integration?: number | undefined;
        language?: number | undefined;
        jobReadiness?: number | undefined;
        wellbeing?: number | undefined;
    }, {
        integration?: number | undefined;
        language?: number | undefined;
        jobReadiness?: number | undefined;
        wellbeing?: number | undefined;
    }>>;
    topEvidenceIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    alerts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["capacity_warning", "capacity_critical", "budget_warning", "performance_low"]>;
        threshold: z.ZodNumber;
        currentValue: z.ZodNumber;
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
        message: string;
        threshold: number;
        currentValue: number;
    }, {
        type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
        message: string;
        threshold: number;
        currentValue: number;
    }>, "many">>;
    snapshotMetadata: z.ZodOptional<z.ZodObject<{
        generatedBy: z.ZodString;
        dataSource: z.ZodString;
        calculationDurationMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        generatedBy: string;
        dataSource: string;
        calculationDurationMs?: number | undefined;
    }, {
        generatedBy: string;
        dataSource: string;
        calculationDurationMs?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
    campaignName: string;
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    programInstances?: {
        activeCount: number;
        totalCount: number;
        avgOutcomeScores?: Record<string, number> | undefined;
    } | undefined;
    engagement?: {
        volunteerRetentionRate?: number | undefined;
        beneficiaryDropoutRate?: number | undefined;
        avgSessionsPerVolunteer?: number | undefined;
        avgSessionsPerBeneficiary?: number | undefined;
    } | undefined;
    outcomeScores?: {
        integration?: number | undefined;
        language?: number | undefined;
        jobReadiness?: number | undefined;
        wellbeing?: number | undefined;
    } | undefined;
    topEvidenceIds?: string[] | undefined;
    alerts?: {
        type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
        message: string;
        threshold: number;
        currentValue: number;
    }[] | undefined;
    snapshotMetadata?: {
        generatedBy: string;
        dataSource: string;
        calculationDurationMs?: number | undefined;
    } | undefined;
}, {
    status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
    campaignName: string;
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    programInstances?: {
        activeCount: number;
        totalCount: number;
        avgOutcomeScores?: Record<string, number> | undefined;
    } | undefined;
    engagement?: {
        volunteerRetentionRate?: number | undefined;
        beneficiaryDropoutRate?: number | undefined;
        avgSessionsPerVolunteer?: number | undefined;
        avgSessionsPerBeneficiary?: number | undefined;
    } | undefined;
    outcomeScores?: {
        integration?: number | undefined;
        language?: number | undefined;
        jobReadiness?: number | undefined;
        wellbeing?: number | undefined;
    } | undefined;
    topEvidenceIds?: string[] | undefined;
    alerts?: {
        type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
        message: string;
        threshold: number;
        currentValue: number;
    }[] | undefined;
    snapshotMetadata?: {
        generatedBy: string;
        dataSource: string;
        calculationDurationMs?: number | undefined;
    } | undefined;
}>;
export type FullSnapshot = z.infer<typeof FullSnapshotSchema>;
/**
 * Create snapshot request
 */
export declare const CreateCampaignMetricsSnapshotSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    campaignId: z.ZodString;
    snapshotDate: z.ZodString;
    volunteersTarget: z.ZodNumber;
    volunteersCurrent: z.ZodNumber;
    volunteersUtilization: z.ZodNumber;
    beneficiariesTarget: z.ZodNumber;
    beneficiariesCurrent: z.ZodNumber;
    beneficiariesUtilization: z.ZodNumber;
    sessionsTarget: z.ZodOptional<z.ZodNumber>;
    sessionsCurrent: z.ZodNumber;
    sessionsUtilization: z.ZodOptional<z.ZodNumber>;
    budgetAllocated: z.ZodNumber;
    budgetSpent: z.ZodNumber;
    budgetRemaining: z.ZodNumber;
    budgetUtilization: z.ZodNumber;
    sroiScore: z.ZodOptional<z.ZodNumber>;
    averageVISScore: z.ZodOptional<z.ZodNumber>;
    totalHoursLogged: z.ZodDefault<z.ZodNumber>;
    totalSessionsCompleted: z.ZodDefault<z.ZodNumber>;
    seatsUsed: z.ZodOptional<z.ZodNumber>;
    seatsCommitted: z.ZodOptional<z.ZodNumber>;
    creditsConsumed: z.ZodOptional<z.ZodNumber>;
    creditsAllocated: z.ZodOptional<z.ZodNumber>;
    learnersServed: z.ZodOptional<z.ZodNumber>;
    learnersCommitted: z.ZodOptional<z.ZodNumber>;
    fullSnapshot: z.ZodObject<{
        campaignName: z.ZodString;
        status: z.ZodEnum<["draft", "planned", "recruiting", "active", "paused", "completed", "closed"]>;
        programTemplateId: z.ZodString;
        beneficiaryGroupId: z.ZodString;
        companyId: z.ZodString;
        programInstances: z.ZodOptional<z.ZodObject<{
            activeCount: z.ZodNumber;
            totalCount: z.ZodNumber;
            avgOutcomeScores: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        }, "strip", z.ZodTypeAny, {
            activeCount: number;
            totalCount: number;
            avgOutcomeScores?: Record<string, number> | undefined;
        }, {
            activeCount: number;
            totalCount: number;
            avgOutcomeScores?: Record<string, number> | undefined;
        }>>;
        engagement: z.ZodOptional<z.ZodObject<{
            volunteerRetentionRate: z.ZodOptional<z.ZodNumber>;
            beneficiaryDropoutRate: z.ZodOptional<z.ZodNumber>;
            avgSessionsPerVolunteer: z.ZodOptional<z.ZodNumber>;
            avgSessionsPerBeneficiary: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            volunteerRetentionRate?: number | undefined;
            beneficiaryDropoutRate?: number | undefined;
            avgSessionsPerVolunteer?: number | undefined;
            avgSessionsPerBeneficiary?: number | undefined;
        }, {
            volunteerRetentionRate?: number | undefined;
            beneficiaryDropoutRate?: number | undefined;
            avgSessionsPerVolunteer?: number | undefined;
            avgSessionsPerBeneficiary?: number | undefined;
        }>>;
        outcomeScores: z.ZodOptional<z.ZodObject<{
            integration: z.ZodOptional<z.ZodNumber>;
            language: z.ZodOptional<z.ZodNumber>;
            jobReadiness: z.ZodOptional<z.ZodNumber>;
            wellbeing: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            integration?: number | undefined;
            language?: number | undefined;
            jobReadiness?: number | undefined;
            wellbeing?: number | undefined;
        }, {
            integration?: number | undefined;
            language?: number | undefined;
            jobReadiness?: number | undefined;
            wellbeing?: number | undefined;
        }>>;
        topEvidenceIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        alerts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["capacity_warning", "capacity_critical", "budget_warning", "performance_low"]>;
            threshold: z.ZodNumber;
            currentValue: z.ZodNumber;
            message: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }, {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }>, "many">>;
        snapshotMetadata: z.ZodOptional<z.ZodObject<{
            generatedBy: z.ZodString;
            dataSource: z.ZodString;
            calculationDurationMs: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            generatedBy: string;
            dataSource: string;
            calculationDurationMs?: number | undefined;
        }, {
            generatedBy: string;
            dataSource: string;
            calculationDurationMs?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
        campaignName: string;
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        programInstances?: {
            activeCount: number;
            totalCount: number;
            avgOutcomeScores?: Record<string, number> | undefined;
        } | undefined;
        engagement?: {
            volunteerRetentionRate?: number | undefined;
            beneficiaryDropoutRate?: number | undefined;
            avgSessionsPerVolunteer?: number | undefined;
            avgSessionsPerBeneficiary?: number | undefined;
        } | undefined;
        outcomeScores?: {
            integration?: number | undefined;
            language?: number | undefined;
            jobReadiness?: number | undefined;
            wellbeing?: number | undefined;
        } | undefined;
        topEvidenceIds?: string[] | undefined;
        alerts?: {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }[] | undefined;
        snapshotMetadata?: {
            generatedBy: string;
            dataSource: string;
            calculationDurationMs?: number | undefined;
        } | undefined;
    }, {
        status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
        campaignName: string;
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        programInstances?: {
            activeCount: number;
            totalCount: number;
            avgOutcomeScores?: Record<string, number> | undefined;
        } | undefined;
        engagement?: {
            volunteerRetentionRate?: number | undefined;
            beneficiaryDropoutRate?: number | undefined;
            avgSessionsPerVolunteer?: number | undefined;
            avgSessionsPerBeneficiary?: number | undefined;
        } | undefined;
        outcomeScores?: {
            integration?: number | undefined;
            language?: number | undefined;
            jobReadiness?: number | undefined;
            wellbeing?: number | undefined;
        } | undefined;
        topEvidenceIds?: string[] | undefined;
        alerts?: {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }[] | undefined;
        snapshotMetadata?: {
            generatedBy: string;
            dataSource: string;
            calculationDurationMs?: number | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    campaignId: string;
    snapshotDate: string;
    volunteersTarget: number;
    volunteersCurrent: number;
    volunteersUtilization: number;
    beneficiariesTarget: number;
    beneficiariesCurrent: number;
    beneficiariesUtilization: number;
    sessionsCurrent: number;
    budgetAllocated: number;
    budgetSpent: number;
    budgetRemaining: number;
    budgetUtilization: number;
    totalHoursLogged: number;
    totalSessionsCompleted: number;
    fullSnapshot: {
        status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
        campaignName: string;
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        programInstances?: {
            activeCount: number;
            totalCount: number;
            avgOutcomeScores?: Record<string, number> | undefined;
        } | undefined;
        engagement?: {
            volunteerRetentionRate?: number | undefined;
            beneficiaryDropoutRate?: number | undefined;
            avgSessionsPerVolunteer?: number | undefined;
            avgSessionsPerBeneficiary?: number | undefined;
        } | undefined;
        outcomeScores?: {
            integration?: number | undefined;
            language?: number | undefined;
            jobReadiness?: number | undefined;
            wellbeing?: number | undefined;
        } | undefined;
        topEvidenceIds?: string[] | undefined;
        alerts?: {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }[] | undefined;
        snapshotMetadata?: {
            generatedBy: string;
            dataSource: string;
            calculationDurationMs?: number | undefined;
        } | undefined;
    };
    sessionsTarget?: number | undefined;
    sessionsUtilization?: number | undefined;
    sroiScore?: number | undefined;
    averageVISScore?: number | undefined;
    seatsUsed?: number | undefined;
    seatsCommitted?: number | undefined;
    creditsConsumed?: number | undefined;
    creditsAllocated?: number | undefined;
    learnersServed?: number | undefined;
    learnersCommitted?: number | undefined;
}, {
    campaignId: string;
    snapshotDate: string;
    volunteersTarget: number;
    volunteersCurrent: number;
    volunteersUtilization: number;
    beneficiariesTarget: number;
    beneficiariesCurrent: number;
    beneficiariesUtilization: number;
    sessionsCurrent: number;
    budgetAllocated: number;
    budgetSpent: number;
    budgetRemaining: number;
    budgetUtilization: number;
    fullSnapshot: {
        status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
        campaignName: string;
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        programInstances?: {
            activeCount: number;
            totalCount: number;
            avgOutcomeScores?: Record<string, number> | undefined;
        } | undefined;
        engagement?: {
            volunteerRetentionRate?: number | undefined;
            beneficiaryDropoutRate?: number | undefined;
            avgSessionsPerVolunteer?: number | undefined;
            avgSessionsPerBeneficiary?: number | undefined;
        } | undefined;
        outcomeScores?: {
            integration?: number | undefined;
            language?: number | undefined;
            jobReadiness?: number | undefined;
            wellbeing?: number | undefined;
        } | undefined;
        topEvidenceIds?: string[] | undefined;
        alerts?: {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }[] | undefined;
        snapshotMetadata?: {
            generatedBy: string;
            dataSource: string;
            calculationDurationMs?: number | undefined;
        } | undefined;
    };
    sessionsTarget?: number | undefined;
    sessionsUtilization?: number | undefined;
    sroiScore?: number | undefined;
    averageVISScore?: number | undefined;
    totalHoursLogged?: number | undefined;
    totalSessionsCompleted?: number | undefined;
    seatsUsed?: number | undefined;
    seatsCommitted?: number | undefined;
    creditsConsumed?: number | undefined;
    creditsAllocated?: number | undefined;
    learnersServed?: number | undefined;
    learnersCommitted?: number | undefined;
}>, {
    campaignId: string;
    snapshotDate: string;
    volunteersTarget: number;
    volunteersCurrent: number;
    volunteersUtilization: number;
    beneficiariesTarget: number;
    beneficiariesCurrent: number;
    beneficiariesUtilization: number;
    sessionsCurrent: number;
    budgetAllocated: number;
    budgetSpent: number;
    budgetRemaining: number;
    budgetUtilization: number;
    totalHoursLogged: number;
    totalSessionsCompleted: number;
    fullSnapshot: {
        status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
        campaignName: string;
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        programInstances?: {
            activeCount: number;
            totalCount: number;
            avgOutcomeScores?: Record<string, number> | undefined;
        } | undefined;
        engagement?: {
            volunteerRetentionRate?: number | undefined;
            beneficiaryDropoutRate?: number | undefined;
            avgSessionsPerVolunteer?: number | undefined;
            avgSessionsPerBeneficiary?: number | undefined;
        } | undefined;
        outcomeScores?: {
            integration?: number | undefined;
            language?: number | undefined;
            jobReadiness?: number | undefined;
            wellbeing?: number | undefined;
        } | undefined;
        topEvidenceIds?: string[] | undefined;
        alerts?: {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }[] | undefined;
        snapshotMetadata?: {
            generatedBy: string;
            dataSource: string;
            calculationDurationMs?: number | undefined;
        } | undefined;
    };
    sessionsTarget?: number | undefined;
    sessionsUtilization?: number | undefined;
    sroiScore?: number | undefined;
    averageVISScore?: number | undefined;
    seatsUsed?: number | undefined;
    seatsCommitted?: number | undefined;
    creditsConsumed?: number | undefined;
    creditsAllocated?: number | undefined;
    learnersServed?: number | undefined;
    learnersCommitted?: number | undefined;
}, {
    campaignId: string;
    snapshotDate: string;
    volunteersTarget: number;
    volunteersCurrent: number;
    volunteersUtilization: number;
    beneficiariesTarget: number;
    beneficiariesCurrent: number;
    beneficiariesUtilization: number;
    sessionsCurrent: number;
    budgetAllocated: number;
    budgetSpent: number;
    budgetRemaining: number;
    budgetUtilization: number;
    fullSnapshot: {
        status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
        campaignName: string;
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        programInstances?: {
            activeCount: number;
            totalCount: number;
            avgOutcomeScores?: Record<string, number> | undefined;
        } | undefined;
        engagement?: {
            volunteerRetentionRate?: number | undefined;
            beneficiaryDropoutRate?: number | undefined;
            avgSessionsPerVolunteer?: number | undefined;
            avgSessionsPerBeneficiary?: number | undefined;
        } | undefined;
        outcomeScores?: {
            integration?: number | undefined;
            language?: number | undefined;
            jobReadiness?: number | undefined;
            wellbeing?: number | undefined;
        } | undefined;
        topEvidenceIds?: string[] | undefined;
        alerts?: {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }[] | undefined;
        snapshotMetadata?: {
            generatedBy: string;
            dataSource: string;
            calculationDurationMs?: number | undefined;
        } | undefined;
    };
    sessionsTarget?: number | undefined;
    sessionsUtilization?: number | undefined;
    sroiScore?: number | undefined;
    averageVISScore?: number | undefined;
    totalHoursLogged?: number | undefined;
    totalSessionsCompleted?: number | undefined;
    seatsUsed?: number | undefined;
    seatsCommitted?: number | undefined;
    creditsConsumed?: number | undefined;
    creditsAllocated?: number | undefined;
    learnersServed?: number | undefined;
    learnersCommitted?: number | undefined;
}>, {
    campaignId: string;
    snapshotDate: string;
    volunteersTarget: number;
    volunteersCurrent: number;
    volunteersUtilization: number;
    beneficiariesTarget: number;
    beneficiariesCurrent: number;
    beneficiariesUtilization: number;
    sessionsCurrent: number;
    budgetAllocated: number;
    budgetSpent: number;
    budgetRemaining: number;
    budgetUtilization: number;
    totalHoursLogged: number;
    totalSessionsCompleted: number;
    fullSnapshot: {
        status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
        campaignName: string;
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        programInstances?: {
            activeCount: number;
            totalCount: number;
            avgOutcomeScores?: Record<string, number> | undefined;
        } | undefined;
        engagement?: {
            volunteerRetentionRate?: number | undefined;
            beneficiaryDropoutRate?: number | undefined;
            avgSessionsPerVolunteer?: number | undefined;
            avgSessionsPerBeneficiary?: number | undefined;
        } | undefined;
        outcomeScores?: {
            integration?: number | undefined;
            language?: number | undefined;
            jobReadiness?: number | undefined;
            wellbeing?: number | undefined;
        } | undefined;
        topEvidenceIds?: string[] | undefined;
        alerts?: {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }[] | undefined;
        snapshotMetadata?: {
            generatedBy: string;
            dataSource: string;
            calculationDurationMs?: number | undefined;
        } | undefined;
    };
    sessionsTarget?: number | undefined;
    sessionsUtilization?: number | undefined;
    sroiScore?: number | undefined;
    averageVISScore?: number | undefined;
    seatsUsed?: number | undefined;
    seatsCommitted?: number | undefined;
    creditsConsumed?: number | undefined;
    creditsAllocated?: number | undefined;
    learnersServed?: number | undefined;
    learnersCommitted?: number | undefined;
}, {
    campaignId: string;
    snapshotDate: string;
    volunteersTarget: number;
    volunteersCurrent: number;
    volunteersUtilization: number;
    beneficiariesTarget: number;
    beneficiariesCurrent: number;
    beneficiariesUtilization: number;
    sessionsCurrent: number;
    budgetAllocated: number;
    budgetSpent: number;
    budgetRemaining: number;
    budgetUtilization: number;
    fullSnapshot: {
        status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
        campaignName: string;
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        programInstances?: {
            activeCount: number;
            totalCount: number;
            avgOutcomeScores?: Record<string, number> | undefined;
        } | undefined;
        engagement?: {
            volunteerRetentionRate?: number | undefined;
            beneficiaryDropoutRate?: number | undefined;
            avgSessionsPerVolunteer?: number | undefined;
            avgSessionsPerBeneficiary?: number | undefined;
        } | undefined;
        outcomeScores?: {
            integration?: number | undefined;
            language?: number | undefined;
            jobReadiness?: number | undefined;
            wellbeing?: number | undefined;
        } | undefined;
        topEvidenceIds?: string[] | undefined;
        alerts?: {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }[] | undefined;
        snapshotMetadata?: {
            generatedBy: string;
            dataSource: string;
            calculationDurationMs?: number | undefined;
        } | undefined;
    };
    sessionsTarget?: number | undefined;
    sessionsUtilization?: number | undefined;
    sroiScore?: number | undefined;
    averageVISScore?: number | undefined;
    totalHoursLogged?: number | undefined;
    totalSessionsCompleted?: number | undefined;
    seatsUsed?: number | undefined;
    seatsCommitted?: number | undefined;
    creditsConsumed?: number | undefined;
    creditsAllocated?: number | undefined;
    learnersServed?: number | undefined;
    learnersCommitted?: number | undefined;
}>;
export type CreateCampaignMetricsSnapshotInput = z.infer<typeof CreateCampaignMetricsSnapshotSchema>;
/**
 * Filter/query snapshots
 */
export declare const FilterCampaignMetricsSnapshotsSchema: z.ZodObject<{
    campaignId: z.ZodOptional<z.ZodString>;
    campaignIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    snapshotDateFrom: z.ZodOptional<z.ZodString>;
    snapshotDateTo: z.ZodOptional<z.ZodString>;
    minVolunteersUtilization: z.ZodOptional<z.ZodNumber>;
    maxVolunteersUtilization: z.ZodOptional<z.ZodNumber>;
    minBudgetUtilization: z.ZodOptional<z.ZodNumber>;
    minSROI: z.ZodOptional<z.ZodNumber>;
    minVIS: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodEnum<["snapshotDate", "volunteersUtilization", "sroiScore", "createdAt"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    sortBy: "snapshotDate" | "volunteersUtilization" | "sroiScore" | "createdAt";
    sortOrder: "asc" | "desc";
    campaignId?: string | undefined;
    campaignIds?: string[] | undefined;
    snapshotDateFrom?: string | undefined;
    snapshotDateTo?: string | undefined;
    minVolunteersUtilization?: number | undefined;
    maxVolunteersUtilization?: number | undefined;
    minBudgetUtilization?: number | undefined;
    minSROI?: number | undefined;
    minVIS?: number | undefined;
}, {
    campaignId?: string | undefined;
    campaignIds?: string[] | undefined;
    snapshotDateFrom?: string | undefined;
    snapshotDateTo?: string | undefined;
    minVolunteersUtilization?: number | undefined;
    maxVolunteersUtilization?: number | undefined;
    minBudgetUtilization?: number | undefined;
    minSROI?: number | undefined;
    minVIS?: number | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    sortBy?: "snapshotDate" | "volunteersUtilization" | "sroiScore" | "createdAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export type FilterCampaignMetricsSnapshotsInput = z.infer<typeof FilterCampaignMetricsSnapshotsSchema>;
/**
 * Campaign metrics snapshot response (from database)
 */
export declare const CampaignMetricsSnapshotSchema: z.ZodObject<{
    id: z.ZodString;
    campaignId: z.ZodString;
    snapshotDate: z.ZodString;
    volunteersTarget: z.ZodNumber;
    volunteersCurrent: z.ZodNumber;
    volunteersUtilization: z.ZodString;
    beneficiariesTarget: z.ZodNumber;
    beneficiariesCurrent: z.ZodNumber;
    beneficiariesUtilization: z.ZodString;
    sessionsTarget: z.ZodNullable<z.ZodNumber>;
    sessionsCurrent: z.ZodNumber;
    sessionsUtilization: z.ZodNullable<z.ZodString>;
    budgetAllocated: z.ZodString;
    budgetSpent: z.ZodString;
    budgetRemaining: z.ZodString;
    budgetUtilization: z.ZodString;
    sroiScore: z.ZodNullable<z.ZodString>;
    averageVISScore: z.ZodNullable<z.ZodString>;
    totalHoursLogged: z.ZodString;
    totalSessionsCompleted: z.ZodNumber;
    seatsUsed: z.ZodNullable<z.ZodNumber>;
    seatsCommitted: z.ZodNullable<z.ZodNumber>;
    creditsConsumed: z.ZodNullable<z.ZodString>;
    creditsAllocated: z.ZodNullable<z.ZodString>;
    learnersServed: z.ZodNullable<z.ZodNumber>;
    learnersCommitted: z.ZodNullable<z.ZodNumber>;
    fullSnapshot: z.ZodObject<{
        campaignName: z.ZodString;
        status: z.ZodEnum<["draft", "planned", "recruiting", "active", "paused", "completed", "closed"]>;
        programTemplateId: z.ZodString;
        beneficiaryGroupId: z.ZodString;
        companyId: z.ZodString;
        programInstances: z.ZodOptional<z.ZodObject<{
            activeCount: z.ZodNumber;
            totalCount: z.ZodNumber;
            avgOutcomeScores: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        }, "strip", z.ZodTypeAny, {
            activeCount: number;
            totalCount: number;
            avgOutcomeScores?: Record<string, number> | undefined;
        }, {
            activeCount: number;
            totalCount: number;
            avgOutcomeScores?: Record<string, number> | undefined;
        }>>;
        engagement: z.ZodOptional<z.ZodObject<{
            volunteerRetentionRate: z.ZodOptional<z.ZodNumber>;
            beneficiaryDropoutRate: z.ZodOptional<z.ZodNumber>;
            avgSessionsPerVolunteer: z.ZodOptional<z.ZodNumber>;
            avgSessionsPerBeneficiary: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            volunteerRetentionRate?: number | undefined;
            beneficiaryDropoutRate?: number | undefined;
            avgSessionsPerVolunteer?: number | undefined;
            avgSessionsPerBeneficiary?: number | undefined;
        }, {
            volunteerRetentionRate?: number | undefined;
            beneficiaryDropoutRate?: number | undefined;
            avgSessionsPerVolunteer?: number | undefined;
            avgSessionsPerBeneficiary?: number | undefined;
        }>>;
        outcomeScores: z.ZodOptional<z.ZodObject<{
            integration: z.ZodOptional<z.ZodNumber>;
            language: z.ZodOptional<z.ZodNumber>;
            jobReadiness: z.ZodOptional<z.ZodNumber>;
            wellbeing: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            integration?: number | undefined;
            language?: number | undefined;
            jobReadiness?: number | undefined;
            wellbeing?: number | undefined;
        }, {
            integration?: number | undefined;
            language?: number | undefined;
            jobReadiness?: number | undefined;
            wellbeing?: number | undefined;
        }>>;
        topEvidenceIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        alerts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["capacity_warning", "capacity_critical", "budget_warning", "performance_low"]>;
            threshold: z.ZodNumber;
            currentValue: z.ZodNumber;
            message: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }, {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }>, "many">>;
        snapshotMetadata: z.ZodOptional<z.ZodObject<{
            generatedBy: z.ZodString;
            dataSource: z.ZodString;
            calculationDurationMs: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            generatedBy: string;
            dataSource: string;
            calculationDurationMs?: number | undefined;
        }, {
            generatedBy: string;
            dataSource: string;
            calculationDurationMs?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
        campaignName: string;
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        programInstances?: {
            activeCount: number;
            totalCount: number;
            avgOutcomeScores?: Record<string, number> | undefined;
        } | undefined;
        engagement?: {
            volunteerRetentionRate?: number | undefined;
            beneficiaryDropoutRate?: number | undefined;
            avgSessionsPerVolunteer?: number | undefined;
            avgSessionsPerBeneficiary?: number | undefined;
        } | undefined;
        outcomeScores?: {
            integration?: number | undefined;
            language?: number | undefined;
            jobReadiness?: number | undefined;
            wellbeing?: number | undefined;
        } | undefined;
        topEvidenceIds?: string[] | undefined;
        alerts?: {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }[] | undefined;
        snapshotMetadata?: {
            generatedBy: string;
            dataSource: string;
            calculationDurationMs?: number | undefined;
        } | undefined;
    }, {
        status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
        campaignName: string;
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        programInstances?: {
            activeCount: number;
            totalCount: number;
            avgOutcomeScores?: Record<string, number> | undefined;
        } | undefined;
        engagement?: {
            volunteerRetentionRate?: number | undefined;
            beneficiaryDropoutRate?: number | undefined;
            avgSessionsPerVolunteer?: number | undefined;
            avgSessionsPerBeneficiary?: number | undefined;
        } | undefined;
        outcomeScores?: {
            integration?: number | undefined;
            language?: number | undefined;
            jobReadiness?: number | undefined;
            wellbeing?: number | undefined;
        } | undefined;
        topEvidenceIds?: string[] | undefined;
        alerts?: {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }[] | undefined;
        snapshotMetadata?: {
            generatedBy: string;
            dataSource: string;
            calculationDurationMs?: number | undefined;
        } | undefined;
    }>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    campaignId: string;
    snapshotDate: string;
    volunteersTarget: number;
    volunteersCurrent: number;
    volunteersUtilization: string;
    beneficiariesTarget: number;
    beneficiariesCurrent: number;
    beneficiariesUtilization: string;
    sessionsTarget: number | null;
    sessionsCurrent: number;
    sessionsUtilization: string | null;
    budgetAllocated: string;
    budgetSpent: string;
    budgetRemaining: string;
    budgetUtilization: string;
    sroiScore: string | null;
    averageVISScore: string | null;
    totalHoursLogged: string;
    totalSessionsCompleted: number;
    seatsUsed: number | null;
    seatsCommitted: number | null;
    creditsConsumed: string | null;
    creditsAllocated: string | null;
    learnersServed: number | null;
    learnersCommitted: number | null;
    fullSnapshot: {
        status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
        campaignName: string;
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        programInstances?: {
            activeCount: number;
            totalCount: number;
            avgOutcomeScores?: Record<string, number> | undefined;
        } | undefined;
        engagement?: {
            volunteerRetentionRate?: number | undefined;
            beneficiaryDropoutRate?: number | undefined;
            avgSessionsPerVolunteer?: number | undefined;
            avgSessionsPerBeneficiary?: number | undefined;
        } | undefined;
        outcomeScores?: {
            integration?: number | undefined;
            language?: number | undefined;
            jobReadiness?: number | undefined;
            wellbeing?: number | undefined;
        } | undefined;
        topEvidenceIds?: string[] | undefined;
        alerts?: {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }[] | undefined;
        snapshotMetadata?: {
            generatedBy: string;
            dataSource: string;
            calculationDurationMs?: number | undefined;
        } | undefined;
    };
    createdAt: string;
    id: string;
}, {
    campaignId: string;
    snapshotDate: string;
    volunteersTarget: number;
    volunteersCurrent: number;
    volunteersUtilization: string;
    beneficiariesTarget: number;
    beneficiariesCurrent: number;
    beneficiariesUtilization: string;
    sessionsTarget: number | null;
    sessionsCurrent: number;
    sessionsUtilization: string | null;
    budgetAllocated: string;
    budgetSpent: string;
    budgetRemaining: string;
    budgetUtilization: string;
    sroiScore: string | null;
    averageVISScore: string | null;
    totalHoursLogged: string;
    totalSessionsCompleted: number;
    seatsUsed: number | null;
    seatsCommitted: number | null;
    creditsConsumed: string | null;
    creditsAllocated: string | null;
    learnersServed: number | null;
    learnersCommitted: number | null;
    fullSnapshot: {
        status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
        campaignName: string;
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        programInstances?: {
            activeCount: number;
            totalCount: number;
            avgOutcomeScores?: Record<string, number> | undefined;
        } | undefined;
        engagement?: {
            volunteerRetentionRate?: number | undefined;
            beneficiaryDropoutRate?: number | undefined;
            avgSessionsPerVolunteer?: number | undefined;
            avgSessionsPerBeneficiary?: number | undefined;
        } | undefined;
        outcomeScores?: {
            integration?: number | undefined;
            language?: number | undefined;
            jobReadiness?: number | undefined;
            wellbeing?: number | undefined;
        } | undefined;
        topEvidenceIds?: string[] | undefined;
        alerts?: {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }[] | undefined;
        snapshotMetadata?: {
            generatedBy: string;
            dataSource: string;
            calculationDurationMs?: number | undefined;
        } | undefined;
    };
    createdAt: string;
    id: string;
}>;
export type CampaignMetricsSnapshot = z.infer<typeof CampaignMetricsSnapshotSchema>;
/**
 * Paginated response
 */
export declare const CampaignMetricsSnapshotsResponseSchema: z.ZodObject<{
    snapshots: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        campaignId: z.ZodString;
        snapshotDate: z.ZodString;
        volunteersTarget: z.ZodNumber;
        volunteersCurrent: z.ZodNumber;
        volunteersUtilization: z.ZodString;
        beneficiariesTarget: z.ZodNumber;
        beneficiariesCurrent: z.ZodNumber;
        beneficiariesUtilization: z.ZodString;
        sessionsTarget: z.ZodNullable<z.ZodNumber>;
        sessionsCurrent: z.ZodNumber;
        sessionsUtilization: z.ZodNullable<z.ZodString>;
        budgetAllocated: z.ZodString;
        budgetSpent: z.ZodString;
        budgetRemaining: z.ZodString;
        budgetUtilization: z.ZodString;
        sroiScore: z.ZodNullable<z.ZodString>;
        averageVISScore: z.ZodNullable<z.ZodString>;
        totalHoursLogged: z.ZodString;
        totalSessionsCompleted: z.ZodNumber;
        seatsUsed: z.ZodNullable<z.ZodNumber>;
        seatsCommitted: z.ZodNullable<z.ZodNumber>;
        creditsConsumed: z.ZodNullable<z.ZodString>;
        creditsAllocated: z.ZodNullable<z.ZodString>;
        learnersServed: z.ZodNullable<z.ZodNumber>;
        learnersCommitted: z.ZodNullable<z.ZodNumber>;
        fullSnapshot: z.ZodObject<{
            campaignName: z.ZodString;
            status: z.ZodEnum<["draft", "planned", "recruiting", "active", "paused", "completed", "closed"]>;
            programTemplateId: z.ZodString;
            beneficiaryGroupId: z.ZodString;
            companyId: z.ZodString;
            programInstances: z.ZodOptional<z.ZodObject<{
                activeCount: z.ZodNumber;
                totalCount: z.ZodNumber;
                avgOutcomeScores: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
            }, "strip", z.ZodTypeAny, {
                activeCount: number;
                totalCount: number;
                avgOutcomeScores?: Record<string, number> | undefined;
            }, {
                activeCount: number;
                totalCount: number;
                avgOutcomeScores?: Record<string, number> | undefined;
            }>>;
            engagement: z.ZodOptional<z.ZodObject<{
                volunteerRetentionRate: z.ZodOptional<z.ZodNumber>;
                beneficiaryDropoutRate: z.ZodOptional<z.ZodNumber>;
                avgSessionsPerVolunteer: z.ZodOptional<z.ZodNumber>;
                avgSessionsPerBeneficiary: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                volunteerRetentionRate?: number | undefined;
                beneficiaryDropoutRate?: number | undefined;
                avgSessionsPerVolunteer?: number | undefined;
                avgSessionsPerBeneficiary?: number | undefined;
            }, {
                volunteerRetentionRate?: number | undefined;
                beneficiaryDropoutRate?: number | undefined;
                avgSessionsPerVolunteer?: number | undefined;
                avgSessionsPerBeneficiary?: number | undefined;
            }>>;
            outcomeScores: z.ZodOptional<z.ZodObject<{
                integration: z.ZodOptional<z.ZodNumber>;
                language: z.ZodOptional<z.ZodNumber>;
                jobReadiness: z.ZodOptional<z.ZodNumber>;
                wellbeing: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                integration?: number | undefined;
                language?: number | undefined;
                jobReadiness?: number | undefined;
                wellbeing?: number | undefined;
            }, {
                integration?: number | undefined;
                language?: number | undefined;
                jobReadiness?: number | undefined;
                wellbeing?: number | undefined;
            }>>;
            topEvidenceIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            alerts: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodEnum<["capacity_warning", "capacity_critical", "budget_warning", "performance_low"]>;
                threshold: z.ZodNumber;
                currentValue: z.ZodNumber;
                message: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
                message: string;
                threshold: number;
                currentValue: number;
            }, {
                type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
                message: string;
                threshold: number;
                currentValue: number;
            }>, "many">>;
            snapshotMetadata: z.ZodOptional<z.ZodObject<{
                generatedBy: z.ZodString;
                dataSource: z.ZodString;
                calculationDurationMs: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                generatedBy: string;
                dataSource: string;
                calculationDurationMs?: number | undefined;
            }, {
                generatedBy: string;
                dataSource: string;
                calculationDurationMs?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
            campaignName: string;
            programTemplateId: string;
            beneficiaryGroupId: string;
            companyId: string;
            programInstances?: {
                activeCount: number;
                totalCount: number;
                avgOutcomeScores?: Record<string, number> | undefined;
            } | undefined;
            engagement?: {
                volunteerRetentionRate?: number | undefined;
                beneficiaryDropoutRate?: number | undefined;
                avgSessionsPerVolunteer?: number | undefined;
                avgSessionsPerBeneficiary?: number | undefined;
            } | undefined;
            outcomeScores?: {
                integration?: number | undefined;
                language?: number | undefined;
                jobReadiness?: number | undefined;
                wellbeing?: number | undefined;
            } | undefined;
            topEvidenceIds?: string[] | undefined;
            alerts?: {
                type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
                message: string;
                threshold: number;
                currentValue: number;
            }[] | undefined;
            snapshotMetadata?: {
                generatedBy: string;
                dataSource: string;
                calculationDurationMs?: number | undefined;
            } | undefined;
        }, {
            status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
            campaignName: string;
            programTemplateId: string;
            beneficiaryGroupId: string;
            companyId: string;
            programInstances?: {
                activeCount: number;
                totalCount: number;
                avgOutcomeScores?: Record<string, number> | undefined;
            } | undefined;
            engagement?: {
                volunteerRetentionRate?: number | undefined;
                beneficiaryDropoutRate?: number | undefined;
                avgSessionsPerVolunteer?: number | undefined;
                avgSessionsPerBeneficiary?: number | undefined;
            } | undefined;
            outcomeScores?: {
                integration?: number | undefined;
                language?: number | undefined;
                jobReadiness?: number | undefined;
                wellbeing?: number | undefined;
            } | undefined;
            topEvidenceIds?: string[] | undefined;
            alerts?: {
                type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
                message: string;
                threshold: number;
                currentValue: number;
            }[] | undefined;
            snapshotMetadata?: {
                generatedBy: string;
                dataSource: string;
                calculationDurationMs?: number | undefined;
            } | undefined;
        }>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        campaignId: string;
        snapshotDate: string;
        volunteersTarget: number;
        volunteersCurrent: number;
        volunteersUtilization: string;
        beneficiariesTarget: number;
        beneficiariesCurrent: number;
        beneficiariesUtilization: string;
        sessionsTarget: number | null;
        sessionsCurrent: number;
        sessionsUtilization: string | null;
        budgetAllocated: string;
        budgetSpent: string;
        budgetRemaining: string;
        budgetUtilization: string;
        sroiScore: string | null;
        averageVISScore: string | null;
        totalHoursLogged: string;
        totalSessionsCompleted: number;
        seatsUsed: number | null;
        seatsCommitted: number | null;
        creditsConsumed: string | null;
        creditsAllocated: string | null;
        learnersServed: number | null;
        learnersCommitted: number | null;
        fullSnapshot: {
            status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
            campaignName: string;
            programTemplateId: string;
            beneficiaryGroupId: string;
            companyId: string;
            programInstances?: {
                activeCount: number;
                totalCount: number;
                avgOutcomeScores?: Record<string, number> | undefined;
            } | undefined;
            engagement?: {
                volunteerRetentionRate?: number | undefined;
                beneficiaryDropoutRate?: number | undefined;
                avgSessionsPerVolunteer?: number | undefined;
                avgSessionsPerBeneficiary?: number | undefined;
            } | undefined;
            outcomeScores?: {
                integration?: number | undefined;
                language?: number | undefined;
                jobReadiness?: number | undefined;
                wellbeing?: number | undefined;
            } | undefined;
            topEvidenceIds?: string[] | undefined;
            alerts?: {
                type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
                message: string;
                threshold: number;
                currentValue: number;
            }[] | undefined;
            snapshotMetadata?: {
                generatedBy: string;
                dataSource: string;
                calculationDurationMs?: number | undefined;
            } | undefined;
        };
        createdAt: string;
        id: string;
    }, {
        campaignId: string;
        snapshotDate: string;
        volunteersTarget: number;
        volunteersCurrent: number;
        volunteersUtilization: string;
        beneficiariesTarget: number;
        beneficiariesCurrent: number;
        beneficiariesUtilization: string;
        sessionsTarget: number | null;
        sessionsCurrent: number;
        sessionsUtilization: string | null;
        budgetAllocated: string;
        budgetSpent: string;
        budgetRemaining: string;
        budgetUtilization: string;
        sroiScore: string | null;
        averageVISScore: string | null;
        totalHoursLogged: string;
        totalSessionsCompleted: number;
        seatsUsed: number | null;
        seatsCommitted: number | null;
        creditsConsumed: string | null;
        creditsAllocated: string | null;
        learnersServed: number | null;
        learnersCommitted: number | null;
        fullSnapshot: {
            status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
            campaignName: string;
            programTemplateId: string;
            beneficiaryGroupId: string;
            companyId: string;
            programInstances?: {
                activeCount: number;
                totalCount: number;
                avgOutcomeScores?: Record<string, number> | undefined;
            } | undefined;
            engagement?: {
                volunteerRetentionRate?: number | undefined;
                beneficiaryDropoutRate?: number | undefined;
                avgSessionsPerVolunteer?: number | undefined;
                avgSessionsPerBeneficiary?: number | undefined;
            } | undefined;
            outcomeScores?: {
                integration?: number | undefined;
                language?: number | undefined;
                jobReadiness?: number | undefined;
                wellbeing?: number | undefined;
            } | undefined;
            topEvidenceIds?: string[] | undefined;
            alerts?: {
                type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
                message: string;
                threshold: number;
                currentValue: number;
            }[] | undefined;
            snapshotMetadata?: {
                generatedBy: string;
                dataSource: string;
                calculationDurationMs?: number | undefined;
            } | undefined;
        };
        createdAt: string;
        id: string;
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
    snapshots: {
        campaignId: string;
        snapshotDate: string;
        volunteersTarget: number;
        volunteersCurrent: number;
        volunteersUtilization: string;
        beneficiariesTarget: number;
        beneficiariesCurrent: number;
        beneficiariesUtilization: string;
        sessionsTarget: number | null;
        sessionsCurrent: number;
        sessionsUtilization: string | null;
        budgetAllocated: string;
        budgetSpent: string;
        budgetRemaining: string;
        budgetUtilization: string;
        sroiScore: string | null;
        averageVISScore: string | null;
        totalHoursLogged: string;
        totalSessionsCompleted: number;
        seatsUsed: number | null;
        seatsCommitted: number | null;
        creditsConsumed: string | null;
        creditsAllocated: string | null;
        learnersServed: number | null;
        learnersCommitted: number | null;
        fullSnapshot: {
            status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
            campaignName: string;
            programTemplateId: string;
            beneficiaryGroupId: string;
            companyId: string;
            programInstances?: {
                activeCount: number;
                totalCount: number;
                avgOutcomeScores?: Record<string, number> | undefined;
            } | undefined;
            engagement?: {
                volunteerRetentionRate?: number | undefined;
                beneficiaryDropoutRate?: number | undefined;
                avgSessionsPerVolunteer?: number | undefined;
                avgSessionsPerBeneficiary?: number | undefined;
            } | undefined;
            outcomeScores?: {
                integration?: number | undefined;
                language?: number | undefined;
                jobReadiness?: number | undefined;
                wellbeing?: number | undefined;
            } | undefined;
            topEvidenceIds?: string[] | undefined;
            alerts?: {
                type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
                message: string;
                threshold: number;
                currentValue: number;
            }[] | undefined;
            snapshotMetadata?: {
                generatedBy: string;
                dataSource: string;
                calculationDurationMs?: number | undefined;
            } | undefined;
        };
        createdAt: string;
        id: string;
    }[];
    pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    };
}, {
    snapshots: {
        campaignId: string;
        snapshotDate: string;
        volunteersTarget: number;
        volunteersCurrent: number;
        volunteersUtilization: string;
        beneficiariesTarget: number;
        beneficiariesCurrent: number;
        beneficiariesUtilization: string;
        sessionsTarget: number | null;
        sessionsCurrent: number;
        sessionsUtilization: string | null;
        budgetAllocated: string;
        budgetSpent: string;
        budgetRemaining: string;
        budgetUtilization: string;
        sroiScore: string | null;
        averageVISScore: string | null;
        totalHoursLogged: string;
        totalSessionsCompleted: number;
        seatsUsed: number | null;
        seatsCommitted: number | null;
        creditsConsumed: string | null;
        creditsAllocated: string | null;
        learnersServed: number | null;
        learnersCommitted: number | null;
        fullSnapshot: {
            status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
            campaignName: string;
            programTemplateId: string;
            beneficiaryGroupId: string;
            companyId: string;
            programInstances?: {
                activeCount: number;
                totalCount: number;
                avgOutcomeScores?: Record<string, number> | undefined;
            } | undefined;
            engagement?: {
                volunteerRetentionRate?: number | undefined;
                beneficiaryDropoutRate?: number | undefined;
                avgSessionsPerVolunteer?: number | undefined;
                avgSessionsPerBeneficiary?: number | undefined;
            } | undefined;
            outcomeScores?: {
                integration?: number | undefined;
                language?: number | undefined;
                jobReadiness?: number | undefined;
                wellbeing?: number | undefined;
            } | undefined;
            topEvidenceIds?: string[] | undefined;
            alerts?: {
                type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
                message: string;
                threshold: number;
                currentValue: number;
            }[] | undefined;
            snapshotMetadata?: {
                generatedBy: string;
                dataSource: string;
                calculationDurationMs?: number | undefined;
            } | undefined;
        };
        createdAt: string;
        id: string;
    }[];
    pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    };
}>;
export type CampaignMetricsSnapshotsResponse = z.infer<typeof CampaignMetricsSnapshotsResponseSchema>;
/**
 * Time-series data point
 */
export declare const TimeSeriesPointSchema: z.ZodObject<{
    timestamp: z.ZodString;
    value: z.ZodNumber;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    value: number;
    timestamp: string;
    metadata?: Record<string, any> | undefined;
}, {
    value: number;
    timestamp: string;
    metadata?: Record<string, any> | undefined;
}>;
export type TimeSeriesPoint = z.infer<typeof TimeSeriesPointSchema>;
/**
 * Time-series dataset
 */
export declare const TimeSeriesDatasetSchema: z.ZodObject<{
    metric: z.ZodString;
    unit: z.ZodOptional<z.ZodString>;
    points: z.ZodArray<z.ZodObject<{
        timestamp: z.ZodString;
        value: z.ZodNumber;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        timestamp: string;
        metadata?: Record<string, any> | undefined;
    }, {
        value: number;
        timestamp: string;
        metadata?: Record<string, any> | undefined;
    }>, "many">;
    aggregation: z.ZodOptional<z.ZodEnum<["sum", "avg", "min", "max", "last"]>>;
}, "strip", z.ZodTypeAny, {
    metric: string;
    points: {
        value: number;
        timestamp: string;
        metadata?: Record<string, any> | undefined;
    }[];
    unit?: string | undefined;
    aggregation?: "min" | "max" | "sum" | "avg" | "last" | undefined;
}, {
    metric: string;
    points: {
        value: number;
        timestamp: string;
        metadata?: Record<string, any> | undefined;
    }[];
    unit?: string | undefined;
    aggregation?: "min" | "max" | "sum" | "avg" | "last" | undefined;
}>;
export type TimeSeriesDataset = z.infer<typeof TimeSeriesDatasetSchema>;
/**
 * Time-series query request
 */
export declare const TimeSeriesQuerySchema: z.ZodObject<{
    campaignId: z.ZodString;
    metrics: z.ZodArray<z.ZodEnum<["volunteersUtilization", "beneficiariesUtilization", "budgetUtilization", "sroiScore", "averageVISScore", "totalHoursLogged", "totalSessionsCompleted", "creditsConsumed", "learnersServed"]>, "many">;
    startDate: z.ZodString;
    endDate: z.ZodString;
    interval: z.ZodDefault<z.ZodEnum<["hour", "day", "week", "month"]>>;
    aggregation: z.ZodOptional<z.ZodEnum<["sum", "avg", "min", "max", "last"]>>;
}, "strip", z.ZodTypeAny, {
    campaignId: string;
    metrics: ("volunteersUtilization" | "beneficiariesUtilization" | "budgetUtilization" | "sroiScore" | "averageVISScore" | "totalHoursLogged" | "totalSessionsCompleted" | "creditsConsumed" | "learnersServed")[];
    startDate: string;
    endDate: string;
    interval: "hour" | "day" | "week" | "month";
    aggregation?: "min" | "max" | "sum" | "avg" | "last" | undefined;
}, {
    campaignId: string;
    metrics: ("volunteersUtilization" | "beneficiariesUtilization" | "budgetUtilization" | "sroiScore" | "averageVISScore" | "totalHoursLogged" | "totalSessionsCompleted" | "creditsConsumed" | "learnersServed")[];
    startDate: string;
    endDate: string;
    aggregation?: "min" | "max" | "sum" | "avg" | "last" | undefined;
    interval?: "hour" | "day" | "week" | "month" | undefined;
}>;
export type TimeSeriesQuery = z.infer<typeof TimeSeriesQuerySchema>;
/**
 * Time-series response
 */
export declare const TimeSeriesResponseSchema: z.ZodObject<{
    campaignId: z.ZodString;
    period: z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>;
    interval: z.ZodString;
    datasets: z.ZodArray<z.ZodObject<{
        metric: z.ZodString;
        unit: z.ZodOptional<z.ZodString>;
        points: z.ZodArray<z.ZodObject<{
            timestamp: z.ZodString;
            value: z.ZodNumber;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            timestamp: string;
            metadata?: Record<string, any> | undefined;
        }, {
            value: number;
            timestamp: string;
            metadata?: Record<string, any> | undefined;
        }>, "many">;
        aggregation: z.ZodOptional<z.ZodEnum<["sum", "avg", "min", "max", "last"]>>;
    }, "strip", z.ZodTypeAny, {
        metric: string;
        points: {
            value: number;
            timestamp: string;
            metadata?: Record<string, any> | undefined;
        }[];
        unit?: string | undefined;
        aggregation?: "min" | "max" | "sum" | "avg" | "last" | undefined;
    }, {
        metric: string;
        points: {
            value: number;
            timestamp: string;
            metadata?: Record<string, any> | undefined;
        }[];
        unit?: string | undefined;
        aggregation?: "min" | "max" | "sum" | "avg" | "last" | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    campaignId: string;
    interval: string;
    period: {
        start: string;
        end: string;
    };
    datasets: {
        metric: string;
        points: {
            value: number;
            timestamp: string;
            metadata?: Record<string, any> | undefined;
        }[];
        unit?: string | undefined;
        aggregation?: "min" | "max" | "sum" | "avg" | "last" | undefined;
    }[];
}, {
    campaignId: string;
    interval: string;
    period: {
        start: string;
        end: string;
    };
    datasets: {
        metric: string;
        points: {
            value: number;
            timestamp: string;
            metadata?: Record<string, any> | undefined;
        }[];
        unit?: string | undefined;
        aggregation?: "min" | "max" | "sum" | "avg" | "last" | undefined;
    }[];
}>;
export type TimeSeriesResponse = z.infer<typeof TimeSeriesResponseSchema>;
/**
 * Capacity alert
 */
export declare const CapacityAlertSchema: z.ZodObject<{
    campaignId: z.ZodString;
    campaignName: z.ZodString;
    snapshotDate: z.ZodString;
    volunteersUtilization: z.ZodNumber;
    beneficiariesUtilization: z.ZodNumber;
    budgetUtilization: z.ZodNumber;
    status: z.ZodString;
    alerts: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["capacity_warning", "capacity_critical", "budget_warning", "performance_low"]>;
        threshold: z.ZodNumber;
        currentValue: z.ZodNumber;
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
        message: string;
        threshold: number;
        currentValue: number;
    }, {
        type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
        message: string;
        threshold: number;
        currentValue: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: string;
    campaignName: string;
    alerts: {
        type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
        message: string;
        threshold: number;
        currentValue: number;
    }[];
    campaignId: string;
    snapshotDate: string;
    volunteersUtilization: number;
    beneficiariesUtilization: number;
    budgetUtilization: number;
}, {
    status: string;
    campaignName: string;
    alerts: {
        type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
        message: string;
        threshold: number;
        currentValue: number;
    }[];
    campaignId: string;
    snapshotDate: string;
    volunteersUtilization: number;
    beneficiariesUtilization: number;
    budgetUtilization: number;
}>;
export type CapacityAlert = z.infer<typeof CapacityAlertSchema>;
/**
 * Capacity alerts response
 */
export declare const CapacityAlertsResponseSchema: z.ZodObject<{
    alerts: z.ZodArray<z.ZodObject<{
        campaignId: z.ZodString;
        campaignName: z.ZodString;
        snapshotDate: z.ZodString;
        volunteersUtilization: z.ZodNumber;
        beneficiariesUtilization: z.ZodNumber;
        budgetUtilization: z.ZodNumber;
        status: z.ZodString;
        alerts: z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["capacity_warning", "capacity_critical", "budget_warning", "performance_low"]>;
            threshold: z.ZodNumber;
            currentValue: z.ZodNumber;
            message: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }, {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        status: string;
        campaignName: string;
        alerts: {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }[];
        campaignId: string;
        snapshotDate: string;
        volunteersUtilization: number;
        beneficiariesUtilization: number;
        budgetUtilization: number;
    }, {
        status: string;
        campaignName: string;
        alerts: {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }[];
        campaignId: string;
        snapshotDate: string;
        volunteersUtilization: number;
        beneficiariesUtilization: number;
        budgetUtilization: number;
    }>, "many">;
    criticalCount: z.ZodNumber;
    warningCount: z.ZodNumber;
    totalCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    totalCount: number;
    alerts: {
        status: string;
        campaignName: string;
        alerts: {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }[];
        campaignId: string;
        snapshotDate: string;
        volunteersUtilization: number;
        beneficiariesUtilization: number;
        budgetUtilization: number;
    }[];
    criticalCount: number;
    warningCount: number;
}, {
    totalCount: number;
    alerts: {
        status: string;
        campaignName: string;
        alerts: {
            type: "capacity_warning" | "capacity_critical" | "budget_warning" | "performance_low";
            message: string;
            threshold: number;
            currentValue: number;
        }[];
        campaignId: string;
        snapshotDate: string;
        volunteersUtilization: number;
        beneficiariesUtilization: number;
        budgetUtilization: number;
    }[];
    criticalCount: number;
    warningCount: number;
}>;
export type CapacityAlertsResponse = z.infer<typeof CapacityAlertsResponseSchema>;
/**
 * Campaign comparison (for benchmarking)
 */
export declare const CampaignComparisonSchema: z.ZodObject<{
    campaignId: z.ZodString;
    campaignName: z.ZodString;
    metrics: z.ZodObject<{
        volunteersUtilization: z.ZodNumber;
        beneficiariesUtilization: z.ZodNumber;
        budgetUtilization: z.ZodNumber;
        sroiScore: z.ZodNullable<z.ZodNumber>;
        averageVISScore: z.ZodNullable<z.ZodNumber>;
        totalHoursLogged: z.ZodNumber;
        totalSessionsCompleted: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        volunteersUtilization: number;
        beneficiariesUtilization: number;
        budgetUtilization: number;
        sroiScore: number | null;
        averageVISScore: number | null;
        totalHoursLogged: number;
        totalSessionsCompleted: number;
    }, {
        volunteersUtilization: number;
        beneficiariesUtilization: number;
        budgetUtilization: number;
        sroiScore: number | null;
        averageVISScore: number | null;
        totalHoursLogged: number;
        totalSessionsCompleted: number;
    }>;
    rank: z.ZodOptional<z.ZodNumber>;
    percentile: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    campaignName: string;
    campaignId: string;
    metrics: {
        volunteersUtilization: number;
        beneficiariesUtilization: number;
        budgetUtilization: number;
        sroiScore: number | null;
        averageVISScore: number | null;
        totalHoursLogged: number;
        totalSessionsCompleted: number;
    };
    rank?: number | undefined;
    percentile?: number | undefined;
}, {
    campaignName: string;
    campaignId: string;
    metrics: {
        volunteersUtilization: number;
        beneficiariesUtilization: number;
        budgetUtilization: number;
        sroiScore: number | null;
        averageVISScore: number | null;
        totalHoursLogged: number;
        totalSessionsCompleted: number;
    };
    rank?: number | undefined;
    percentile?: number | undefined;
}>;
export type CampaignComparison = z.infer<typeof CampaignComparisonSchema>;
/**
 * Benchmark response
 */
export declare const BenchmarkResponseSchema: z.ZodObject<{
    targetCampaign: z.ZodObject<{
        campaignId: z.ZodString;
        campaignName: z.ZodString;
        metrics: z.ZodObject<{
            volunteersUtilization: z.ZodNumber;
            beneficiariesUtilization: z.ZodNumber;
            budgetUtilization: z.ZodNumber;
            sroiScore: z.ZodNullable<z.ZodNumber>;
            averageVISScore: z.ZodNullable<z.ZodNumber>;
            totalHoursLogged: z.ZodNumber;
            totalSessionsCompleted: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            volunteersUtilization: number;
            beneficiariesUtilization: number;
            budgetUtilization: number;
            sroiScore: number | null;
            averageVISScore: number | null;
            totalHoursLogged: number;
            totalSessionsCompleted: number;
        }, {
            volunteersUtilization: number;
            beneficiariesUtilization: number;
            budgetUtilization: number;
            sroiScore: number | null;
            averageVISScore: number | null;
            totalHoursLogged: number;
            totalSessionsCompleted: number;
        }>;
        rank: z.ZodOptional<z.ZodNumber>;
        percentile: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        campaignName: string;
        campaignId: string;
        metrics: {
            volunteersUtilization: number;
            beneficiariesUtilization: number;
            budgetUtilization: number;
            sroiScore: number | null;
            averageVISScore: number | null;
            totalHoursLogged: number;
            totalSessionsCompleted: number;
        };
        rank?: number | undefined;
        percentile?: number | undefined;
    }, {
        campaignName: string;
        campaignId: string;
        metrics: {
            volunteersUtilization: number;
            beneficiariesUtilization: number;
            budgetUtilization: number;
            sroiScore: number | null;
            averageVISScore: number | null;
            totalHoursLogged: number;
            totalSessionsCompleted: number;
        };
        rank?: number | undefined;
        percentile?: number | undefined;
    }>;
    comparisons: z.ZodArray<z.ZodObject<{
        campaignId: z.ZodString;
        campaignName: z.ZodString;
        metrics: z.ZodObject<{
            volunteersUtilization: z.ZodNumber;
            beneficiariesUtilization: z.ZodNumber;
            budgetUtilization: z.ZodNumber;
            sroiScore: z.ZodNullable<z.ZodNumber>;
            averageVISScore: z.ZodNullable<z.ZodNumber>;
            totalHoursLogged: z.ZodNumber;
            totalSessionsCompleted: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            volunteersUtilization: number;
            beneficiariesUtilization: number;
            budgetUtilization: number;
            sroiScore: number | null;
            averageVISScore: number | null;
            totalHoursLogged: number;
            totalSessionsCompleted: number;
        }, {
            volunteersUtilization: number;
            beneficiariesUtilization: number;
            budgetUtilization: number;
            sroiScore: number | null;
            averageVISScore: number | null;
            totalHoursLogged: number;
            totalSessionsCompleted: number;
        }>;
        rank: z.ZodOptional<z.ZodNumber>;
        percentile: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        campaignName: string;
        campaignId: string;
        metrics: {
            volunteersUtilization: number;
            beneficiariesUtilization: number;
            budgetUtilization: number;
            sroiScore: number | null;
            averageVISScore: number | null;
            totalHoursLogged: number;
            totalSessionsCompleted: number;
        };
        rank?: number | undefined;
        percentile?: number | undefined;
    }, {
        campaignName: string;
        campaignId: string;
        metrics: {
            volunteersUtilization: number;
            beneficiariesUtilization: number;
            budgetUtilization: number;
            sroiScore: number | null;
            averageVISScore: number | null;
            totalHoursLogged: number;
            totalSessionsCompleted: number;
        };
        rank?: number | undefined;
        percentile?: number | undefined;
    }>, "many">;
    averages: z.ZodObject<{
        volunteersUtilization: z.ZodNumber;
        budgetUtilization: z.ZodNumber;
        sroiScore: z.ZodNullable<z.ZodNumber>;
        averageVISScore: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        volunteersUtilization: number;
        budgetUtilization: number;
        sroiScore: number | null;
        averageVISScore: number | null;
    }, {
        volunteersUtilization: number;
        budgetUtilization: number;
        sroiScore: number | null;
        averageVISScore: number | null;
    }>;
    metadata: z.ZodObject<{
        totalCampaigns: z.ZodNumber;
        period: z.ZodObject<{
            start: z.ZodString;
            end: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            start: string;
            end: string;
        }, {
            start: string;
            end: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        period: {
            start: string;
            end: string;
        };
        totalCampaigns: number;
    }, {
        period: {
            start: string;
            end: string;
        };
        totalCampaigns: number;
    }>;
}, "strip", z.ZodTypeAny, {
    metadata: {
        period: {
            start: string;
            end: string;
        };
        totalCampaigns: number;
    };
    targetCampaign: {
        campaignName: string;
        campaignId: string;
        metrics: {
            volunteersUtilization: number;
            beneficiariesUtilization: number;
            budgetUtilization: number;
            sroiScore: number | null;
            averageVISScore: number | null;
            totalHoursLogged: number;
            totalSessionsCompleted: number;
        };
        rank?: number | undefined;
        percentile?: number | undefined;
    };
    comparisons: {
        campaignName: string;
        campaignId: string;
        metrics: {
            volunteersUtilization: number;
            beneficiariesUtilization: number;
            budgetUtilization: number;
            sroiScore: number | null;
            averageVISScore: number | null;
            totalHoursLogged: number;
            totalSessionsCompleted: number;
        };
        rank?: number | undefined;
        percentile?: number | undefined;
    }[];
    averages: {
        volunteersUtilization: number;
        budgetUtilization: number;
        sroiScore: number | null;
        averageVISScore: number | null;
    };
}, {
    metadata: {
        period: {
            start: string;
            end: string;
        };
        totalCampaigns: number;
    };
    targetCampaign: {
        campaignName: string;
        campaignId: string;
        metrics: {
            volunteersUtilization: number;
            beneficiariesUtilization: number;
            budgetUtilization: number;
            sroiScore: number | null;
            averageVISScore: number | null;
            totalHoursLogged: number;
            totalSessionsCompleted: number;
        };
        rank?: number | undefined;
        percentile?: number | undefined;
    };
    comparisons: {
        campaignName: string;
        campaignId: string;
        metrics: {
            volunteersUtilization: number;
            beneficiariesUtilization: number;
            budgetUtilization: number;
            sroiScore: number | null;
            averageVISScore: number | null;
            totalHoursLogged: number;
            totalSessionsCompleted: number;
        };
        rank?: number | undefined;
        percentile?: number | undefined;
    }[];
    averages: {
        volunteersUtilization: number;
        budgetUtilization: number;
        sroiScore: number | null;
        averageVISScore: number | null;
    };
}>;
export type BenchmarkResponse = z.infer<typeof BenchmarkResponseSchema>;
/**
 * Check if snapshot indicates near capacity
 */
export declare function isSnapshotNearCapacity(snapshot: CampaignMetricsSnapshot, threshold?: number): boolean;
/**
 * Check if snapshot indicates over capacity
 */
export declare function isSnapshotOverCapacity(snapshot: CampaignMetricsSnapshot): boolean;
/**
 * Check if snapshot has budget warning
 */
export declare function hasSnapshotBudgetWarning(snapshot: CampaignMetricsSnapshot, threshold?: number): boolean;
/**
 * Check if snapshot has impact metrics
 */
export declare function hasSnapshotImpactMetrics(snapshot: CampaignMetricsSnapshot): boolean;
/**
 * Check if snapshot has alerts
 */
export declare function hasSnapshotAlerts(snapshot: CampaignMetricsSnapshot): boolean;
/**
 * Get critical alerts from snapshot
 */
export declare function getCriticalAlerts(snapshot: CampaignMetricsSnapshot): Alert[];
/**
 * Snapshot summary for dashboard cards
 */
export type SnapshotSummary = {
    campaignId: string;
    snapshotDate: string;
    capacityUtilization: {
        volunteers: number;
        beneficiaries: number;
        budget: number;
    };
    impact: {
        sroi: number | null;
        vis: number | null;
        hours: number;
        sessions: number;
    };
    hasAlerts: boolean;
    alertCount: number;
};
/**
 * Trend analysis result
 */
export interface TrendAnalysis {
    metric: string;
    direction: 'up' | 'down' | 'stable';
    change: number;
    changePercent: number;
    period: {
        start: string;
        end: string;
    };
    confidence: number;
}
/**
 * Forecast data point
 */
export interface ForecastPoint {
    timestamp: string;
    predicted: number;
    lower: number;
    upper: number;
    confidence: number;
}
//# sourceMappingURL=campaign-metrics.d.ts.map