/**
 * AI Prompt Audit Types
 * Worker 10: AI/ML Explainability & Guardrails
 *
 * Defines types for AI prompt audit trail, explainability, and guardrails
 */
import { z } from 'zod';
export declare const SafetyCheckDetailsSchema: z.ZodObject<{
    categoriesChecked: z.ZodArray<z.ZodString, "many">;
    violations: z.ZodArray<z.ZodObject<{
        category: z.ZodString;
        confidence: z.ZodNumber;
        flaggedText: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        category: string;
        confidence: number;
        flaggedText?: string | undefined;
    }, {
        category: string;
        confidence: number;
        flaggedText?: string | undefined;
    }>, "many">;
    rationale: z.ZodOptional<z.ZodString>;
    checkDurationMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    violations: {
        category: string;
        confidence: number;
        flaggedText?: string | undefined;
    }[];
    categoriesChecked: string[];
    rationale?: string | undefined;
    checkDurationMs?: number | undefined;
}, {
    violations: {
        category: string;
        confidence: number;
        flaggedText?: string | undefined;
    }[];
    categoriesChecked: string[];
    rationale?: string | undefined;
    checkDurationMs?: number | undefined;
}>;
export declare const EvidenceGateDetailsSchema: z.ZodObject<{
    minCitationsRequired: z.ZodNumber;
    actualCitations: z.ZodNumber;
    citationDensity: z.ZodNumber;
    paragraphCount: z.ZodNumber;
    warnings: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    paragraphCount: number;
    citationDensity: number;
    minCitationsRequired: number;
    actualCitations: number;
    warnings?: string[] | undefined;
}, {
    paragraphCount: number;
    citationDensity: number;
    minCitationsRequired: number;
    actualCitations: number;
    warnings?: string[] | undefined;
}>;
export declare const BudgetCheckDetailsSchema: z.ZodObject<{
    limitUsd: z.ZodNumber;
    usedUsd: z.ZodNumber;
    remainingUsd: z.ZodNumber;
    thisCostUsd: z.ZodNumber;
    period: z.ZodEnum<["daily", "monthly"]>;
    resetAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    period: "monthly" | "daily";
    limitUsd: number;
    usedUsd: number;
    remainingUsd: number;
    thisCostUsd: number;
    resetAt: string;
}, {
    period: "monthly" | "daily";
    limitUsd: number;
    usedUsd: number;
    remainingUsd: number;
    thisCostUsd: number;
    resetAt: string;
}>;
export type SafetyCheckDetails = z.infer<typeof SafetyCheckDetailsSchema>;
export type EvidenceGateDetails = z.infer<typeof EvidenceGateDetailsSchema>;
export type BudgetCheckDetails = z.infer<typeof BudgetCheckDetailsSchema>;
export declare const SectionExplanationSchema: z.ZodObject<{
    sectionType: z.ZodString;
    whyThisSection: z.ZodString;
    topEvidenceIds: z.ZodArray<z.ZodString, "many">;
    variablesUsed: z.ZodRecord<z.ZodString, z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    topEvidenceIds: string[];
    sectionType: string;
    whyThisSection: string;
    variablesUsed: Record<string, any>;
}, {
    topEvidenceIds: string[];
    sectionType: string;
    whyThisSection: string;
    variablesUsed: Record<string, any>;
}>;
export type SectionExplanation = z.infer<typeof SectionExplanationSchema>;
export declare const PromptRecordStatusSchema: z.ZodEnum<["success", "failed", "blocked_safety", "blocked_evidence", "blocked_budget"]>;
export declare const PromptRecordSchema: z.ZodObject<{
    id: z.ZodString;
    requestId: z.ZodString;
    companyId: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    modelName: z.ZodString;
    modelVersion: z.ZodOptional<z.ZodString>;
    provider: z.ZodEnum<["openai", "anthropic", "google", "azure"]>;
    region: z.ZodOptional<z.ZodString>;
    promptTemplate: z.ZodOptional<z.ZodString>;
    promptHash: z.ZodString;
    promptVariables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    outputHash: z.ZodString;
    outputSummary: z.ZodOptional<z.ZodString>;
    evidenceIds: z.ZodArray<z.ZodString, "many">;
    citationCount: z.ZodDefault<z.ZodNumber>;
    topK: z.ZodOptional<z.ZodNumber>;
    tokensInput: z.ZodNumber;
    tokensOutput: z.ZodNumber;
    tokensTotal: z.ZodNumber;
    costUsd: z.ZodNumber;
    latencyMs: z.ZodNumber;
    createdAt: z.ZodString;
    safetyCheckPassed: z.ZodBoolean;
    safetyCheckDetails: z.ZodOptional<z.ZodObject<{
        categoriesChecked: z.ZodArray<z.ZodString, "many">;
        violations: z.ZodArray<z.ZodObject<{
            category: z.ZodString;
            confidence: z.ZodNumber;
            flaggedText: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            category: string;
            confidence: number;
            flaggedText?: string | undefined;
        }, {
            category: string;
            confidence: number;
            flaggedText?: string | undefined;
        }>, "many">;
        rationale: z.ZodOptional<z.ZodString>;
        checkDurationMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        violations: {
            category: string;
            confidence: number;
            flaggedText?: string | undefined;
        }[];
        categoriesChecked: string[];
        rationale?: string | undefined;
        checkDurationMs?: number | undefined;
    }, {
        violations: {
            category: string;
            confidence: number;
            flaggedText?: string | undefined;
        }[];
        categoriesChecked: string[];
        rationale?: string | undefined;
        checkDurationMs?: number | undefined;
    }>>;
    evidenceGatePassed: z.ZodBoolean;
    evidenceGateDetails: z.ZodOptional<z.ZodObject<{
        minCitationsRequired: z.ZodNumber;
        actualCitations: z.ZodNumber;
        citationDensity: z.ZodNumber;
        paragraphCount: z.ZodNumber;
        warnings: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        paragraphCount: number;
        citationDensity: number;
        minCitationsRequired: number;
        actualCitations: number;
        warnings?: string[] | undefined;
    }, {
        paragraphCount: number;
        citationDensity: number;
        minCitationsRequired: number;
        actualCitations: number;
        warnings?: string[] | undefined;
    }>>;
    budgetCheckPassed: z.ZodBoolean;
    budgetCheckDetails: z.ZodOptional<z.ZodObject<{
        limitUsd: z.ZodNumber;
        usedUsd: z.ZodNumber;
        remainingUsd: z.ZodNumber;
        thisCostUsd: z.ZodNumber;
        period: z.ZodEnum<["daily", "monthly"]>;
        resetAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        period: "monthly" | "daily";
        limitUsd: number;
        usedUsd: number;
        remainingUsd: number;
        thisCostUsd: number;
        resetAt: string;
    }, {
        period: "monthly" | "daily";
        limitUsd: number;
        usedUsd: number;
        remainingUsd: number;
        thisCostUsd: number;
        resetAt: string;
    }>>;
    status: z.ZodEnum<["success", "failed", "blocked_safety", "blocked_evidence", "blocked_budget"]>;
    errorMessage: z.ZodOptional<z.ZodString>;
    sectionExplanations: z.ZodOptional<z.ZodArray<z.ZodObject<{
        sectionType: z.ZodString;
        whyThisSection: z.ZodString;
        topEvidenceIds: z.ZodArray<z.ZodString, "many">;
        variablesUsed: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        topEvidenceIds: string[];
        sectionType: string;
        whyThisSection: string;
        variablesUsed: Record<string, any>;
    }, {
        topEvidenceIds: string[];
        sectionType: string;
        whyThisSection: string;
        variablesUsed: Record<string, any>;
    }>, "many">>;
    retryCount: z.ZodDefault<z.ZodNumber>;
    parentRequestId: z.ZodOptional<z.ZodString>;
    operation: z.ZodEnum<["report-generation", "nlq-query", "q2q-classification", "other"]>;
    createdBy: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "failed" | "success" | "blocked_safety" | "blocked_evidence" | "blocked_budget";
    companyId: string;
    createdAt: string;
    id: string;
    operation: "other" | "report-generation" | "nlq-query" | "q2q-classification";
    provider: "openai" | "anthropic" | "google" | "azure";
    tokensInput: number;
    tokensOutput: number;
    tokensTotal: number;
    costUsd: number;
    requestId: string;
    latencyMs: number;
    citationCount: number;
    modelName: string;
    promptHash: string;
    outputHash: string;
    evidenceIds: string[];
    safetyCheckPassed: boolean;
    evidenceGatePassed: boolean;
    budgetCheckPassed: boolean;
    retryCount: number;
    updatedAt?: string | undefined;
    createdBy?: string | undefined;
    region?: string | undefined;
    userId?: string | undefined;
    promptTemplate?: string | undefined;
    promptVariables?: Record<string, any> | undefined;
    modelVersion?: string | undefined;
    outputSummary?: string | undefined;
    topK?: number | undefined;
    safetyCheckDetails?: {
        violations: {
            category: string;
            confidence: number;
            flaggedText?: string | undefined;
        }[];
        categoriesChecked: string[];
        rationale?: string | undefined;
        checkDurationMs?: number | undefined;
    } | undefined;
    evidenceGateDetails?: {
        paragraphCount: number;
        citationDensity: number;
        minCitationsRequired: number;
        actualCitations: number;
        warnings?: string[] | undefined;
    } | undefined;
    budgetCheckDetails?: {
        period: "monthly" | "daily";
        limitUsd: number;
        usedUsd: number;
        remainingUsd: number;
        thisCostUsd: number;
        resetAt: string;
    } | undefined;
    errorMessage?: string | undefined;
    sectionExplanations?: {
        topEvidenceIds: string[];
        sectionType: string;
        whyThisSection: string;
        variablesUsed: Record<string, any>;
    }[] | undefined;
    parentRequestId?: string | undefined;
}, {
    status: "failed" | "success" | "blocked_safety" | "blocked_evidence" | "blocked_budget";
    companyId: string;
    createdAt: string;
    id: string;
    operation: "other" | "report-generation" | "nlq-query" | "q2q-classification";
    provider: "openai" | "anthropic" | "google" | "azure";
    tokensInput: number;
    tokensOutput: number;
    tokensTotal: number;
    costUsd: number;
    requestId: string;
    latencyMs: number;
    modelName: string;
    promptHash: string;
    outputHash: string;
    evidenceIds: string[];
    safetyCheckPassed: boolean;
    evidenceGatePassed: boolean;
    budgetCheckPassed: boolean;
    updatedAt?: string | undefined;
    createdBy?: string | undefined;
    region?: string | undefined;
    userId?: string | undefined;
    promptTemplate?: string | undefined;
    promptVariables?: Record<string, any> | undefined;
    citationCount?: number | undefined;
    modelVersion?: string | undefined;
    outputSummary?: string | undefined;
    topK?: number | undefined;
    safetyCheckDetails?: {
        violations: {
            category: string;
            confidence: number;
            flaggedText?: string | undefined;
        }[];
        categoriesChecked: string[];
        rationale?: string | undefined;
        checkDurationMs?: number | undefined;
    } | undefined;
    evidenceGateDetails?: {
        paragraphCount: number;
        citationDensity: number;
        minCitationsRequired: number;
        actualCitations: number;
        warnings?: string[] | undefined;
    } | undefined;
    budgetCheckDetails?: {
        period: "monthly" | "daily";
        limitUsd: number;
        usedUsd: number;
        remainingUsd: number;
        thisCostUsd: number;
        resetAt: string;
    } | undefined;
    errorMessage?: string | undefined;
    sectionExplanations?: {
        topEvidenceIds: string[];
        sectionType: string;
        whyThisSection: string;
        variablesUsed: Record<string, any>;
    }[] | undefined;
    retryCount?: number | undefined;
    parentRequestId?: string | undefined;
}>;
export type PromptRecord = z.infer<typeof PromptRecordSchema>;
export type PromptRecordStatus = z.infer<typeof PromptRecordStatusSchema>;
export declare const CreatePromptRecordSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    requestId: z.ZodString;
    companyId: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    modelName: z.ZodString;
    modelVersion: z.ZodOptional<z.ZodString>;
    provider: z.ZodEnum<["openai", "anthropic", "google", "azure"]>;
    region: z.ZodOptional<z.ZodString>;
    promptTemplate: z.ZodOptional<z.ZodString>;
    promptHash: z.ZodString;
    promptVariables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    outputHash: z.ZodString;
    outputSummary: z.ZodOptional<z.ZodString>;
    evidenceIds: z.ZodArray<z.ZodString, "many">;
    citationCount: z.ZodDefault<z.ZodNumber>;
    topK: z.ZodOptional<z.ZodNumber>;
    tokensInput: z.ZodNumber;
    tokensOutput: z.ZodNumber;
    tokensTotal: z.ZodNumber;
    costUsd: z.ZodNumber;
    latencyMs: z.ZodNumber;
    createdAt: z.ZodString;
    safetyCheckPassed: z.ZodBoolean;
    safetyCheckDetails: z.ZodOptional<z.ZodObject<{
        categoriesChecked: z.ZodArray<z.ZodString, "many">;
        violations: z.ZodArray<z.ZodObject<{
            category: z.ZodString;
            confidence: z.ZodNumber;
            flaggedText: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            category: string;
            confidence: number;
            flaggedText?: string | undefined;
        }, {
            category: string;
            confidence: number;
            flaggedText?: string | undefined;
        }>, "many">;
        rationale: z.ZodOptional<z.ZodString>;
        checkDurationMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        violations: {
            category: string;
            confidence: number;
            flaggedText?: string | undefined;
        }[];
        categoriesChecked: string[];
        rationale?: string | undefined;
        checkDurationMs?: number | undefined;
    }, {
        violations: {
            category: string;
            confidence: number;
            flaggedText?: string | undefined;
        }[];
        categoriesChecked: string[];
        rationale?: string | undefined;
        checkDurationMs?: number | undefined;
    }>>;
    evidenceGatePassed: z.ZodBoolean;
    evidenceGateDetails: z.ZodOptional<z.ZodObject<{
        minCitationsRequired: z.ZodNumber;
        actualCitations: z.ZodNumber;
        citationDensity: z.ZodNumber;
        paragraphCount: z.ZodNumber;
        warnings: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        paragraphCount: number;
        citationDensity: number;
        minCitationsRequired: number;
        actualCitations: number;
        warnings?: string[] | undefined;
    }, {
        paragraphCount: number;
        citationDensity: number;
        minCitationsRequired: number;
        actualCitations: number;
        warnings?: string[] | undefined;
    }>>;
    budgetCheckPassed: z.ZodBoolean;
    budgetCheckDetails: z.ZodOptional<z.ZodObject<{
        limitUsd: z.ZodNumber;
        usedUsd: z.ZodNumber;
        remainingUsd: z.ZodNumber;
        thisCostUsd: z.ZodNumber;
        period: z.ZodEnum<["daily", "monthly"]>;
        resetAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        period: "monthly" | "daily";
        limitUsd: number;
        usedUsd: number;
        remainingUsd: number;
        thisCostUsd: number;
        resetAt: string;
    }, {
        period: "monthly" | "daily";
        limitUsd: number;
        usedUsd: number;
        remainingUsd: number;
        thisCostUsd: number;
        resetAt: string;
    }>>;
    status: z.ZodEnum<["success", "failed", "blocked_safety", "blocked_evidence", "blocked_budget"]>;
    errorMessage: z.ZodOptional<z.ZodString>;
    sectionExplanations: z.ZodOptional<z.ZodArray<z.ZodObject<{
        sectionType: z.ZodString;
        whyThisSection: z.ZodString;
        topEvidenceIds: z.ZodArray<z.ZodString, "many">;
        variablesUsed: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        topEvidenceIds: string[];
        sectionType: string;
        whyThisSection: string;
        variablesUsed: Record<string, any>;
    }, {
        topEvidenceIds: string[];
        sectionType: string;
        whyThisSection: string;
        variablesUsed: Record<string, any>;
    }>, "many">>;
    retryCount: z.ZodDefault<z.ZodNumber>;
    parentRequestId: z.ZodOptional<z.ZodString>;
    operation: z.ZodEnum<["report-generation", "nlq-query", "q2q-classification", "other"]>;
    createdBy: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "createdAt" | "id" | "updatedAt">, "strip", z.ZodTypeAny, {
    status: "failed" | "success" | "blocked_safety" | "blocked_evidence" | "blocked_budget";
    companyId: string;
    operation: "other" | "report-generation" | "nlq-query" | "q2q-classification";
    provider: "openai" | "anthropic" | "google" | "azure";
    tokensInput: number;
    tokensOutput: number;
    tokensTotal: number;
    costUsd: number;
    requestId: string;
    latencyMs: number;
    citationCount: number;
    modelName: string;
    promptHash: string;
    outputHash: string;
    evidenceIds: string[];
    safetyCheckPassed: boolean;
    evidenceGatePassed: boolean;
    budgetCheckPassed: boolean;
    retryCount: number;
    createdBy?: string | undefined;
    region?: string | undefined;
    userId?: string | undefined;
    promptTemplate?: string | undefined;
    promptVariables?: Record<string, any> | undefined;
    modelVersion?: string | undefined;
    outputSummary?: string | undefined;
    topK?: number | undefined;
    safetyCheckDetails?: {
        violations: {
            category: string;
            confidence: number;
            flaggedText?: string | undefined;
        }[];
        categoriesChecked: string[];
        rationale?: string | undefined;
        checkDurationMs?: number | undefined;
    } | undefined;
    evidenceGateDetails?: {
        paragraphCount: number;
        citationDensity: number;
        minCitationsRequired: number;
        actualCitations: number;
        warnings?: string[] | undefined;
    } | undefined;
    budgetCheckDetails?: {
        period: "monthly" | "daily";
        limitUsd: number;
        usedUsd: number;
        remainingUsd: number;
        thisCostUsd: number;
        resetAt: string;
    } | undefined;
    errorMessage?: string | undefined;
    sectionExplanations?: {
        topEvidenceIds: string[];
        sectionType: string;
        whyThisSection: string;
        variablesUsed: Record<string, any>;
    }[] | undefined;
    parentRequestId?: string | undefined;
}, {
    status: "failed" | "success" | "blocked_safety" | "blocked_evidence" | "blocked_budget";
    companyId: string;
    operation: "other" | "report-generation" | "nlq-query" | "q2q-classification";
    provider: "openai" | "anthropic" | "google" | "azure";
    tokensInput: number;
    tokensOutput: number;
    tokensTotal: number;
    costUsd: number;
    requestId: string;
    latencyMs: number;
    modelName: string;
    promptHash: string;
    outputHash: string;
    evidenceIds: string[];
    safetyCheckPassed: boolean;
    evidenceGatePassed: boolean;
    budgetCheckPassed: boolean;
    createdBy?: string | undefined;
    region?: string | undefined;
    userId?: string | undefined;
    promptTemplate?: string | undefined;
    promptVariables?: Record<string, any> | undefined;
    citationCount?: number | undefined;
    modelVersion?: string | undefined;
    outputSummary?: string | undefined;
    topK?: number | undefined;
    safetyCheckDetails?: {
        violations: {
            category: string;
            confidence: number;
            flaggedText?: string | undefined;
        }[];
        categoriesChecked: string[];
        rationale?: string | undefined;
        checkDurationMs?: number | undefined;
    } | undefined;
    evidenceGateDetails?: {
        paragraphCount: number;
        citationDensity: number;
        minCitationsRequired: number;
        actualCitations: number;
        warnings?: string[] | undefined;
    } | undefined;
    budgetCheckDetails?: {
        period: "monthly" | "daily";
        limitUsd: number;
        usedUsd: number;
        remainingUsd: number;
        thisCostUsd: number;
        resetAt: string;
    } | undefined;
    errorMessage?: string | undefined;
    sectionExplanations?: {
        topEvidenceIds: string[];
        sectionType: string;
        whyThisSection: string;
        variablesUsed: Record<string, any>;
    }[] | undefined;
    retryCount?: number | undefined;
    parentRequestId?: string | undefined;
}>;
export type CreatePromptRecord = z.infer<typeof CreatePromptRecordSchema>;
export declare const AIBudgetConfigSchema: z.ZodObject<{
    id: z.ZodString;
    companyId: z.ZodString;
    dailyLimitUsd: z.ZodNumber;
    monthlyLimitUsd: z.ZodNumber;
    dailyUsedUsd: z.ZodNumber;
    monthlyUsedUsd: z.ZodNumber;
    dailyResetAt: z.ZodString;
    monthlyResetAt: z.ZodString;
    alertThresholdPct: z.ZodDefault<z.ZodNumber>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodString;
    updatedAt: z.ZodOptional<z.ZodString>;
    createdBy: z.ZodOptional<z.ZodString>;
    updatedBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    companyId: string;
    createdAt: string;
    id: string;
    enabled: boolean;
    dailyLimitUsd: number;
    monthlyLimitUsd: number;
    dailyUsedUsd: number;
    monthlyUsedUsd: number;
    dailyResetAt: string;
    monthlyResetAt: string;
    alertThresholdPct: number;
    updatedAt?: string | undefined;
    createdBy?: string | undefined;
    updatedBy?: string | undefined;
}, {
    companyId: string;
    createdAt: string;
    id: string;
    dailyLimitUsd: number;
    monthlyLimitUsd: number;
    dailyUsedUsd: number;
    monthlyUsedUsd: number;
    dailyResetAt: string;
    monthlyResetAt: string;
    updatedAt?: string | undefined;
    createdBy?: string | undefined;
    updatedBy?: string | undefined;
    enabled?: boolean | undefined;
    alertThresholdPct?: number | undefined;
}>;
export type AIBudgetConfig = z.infer<typeof AIBudgetConfigSchema>;
export declare const AISafetyPolicySchema: z.ZodObject<{
    id: z.ZodString;
    companyId: z.ZodOptional<z.ZodString>;
    isGlobal: z.ZodDefault<z.ZodBoolean>;
    blockedCategories: z.ZodArray<z.ZodString, "many">;
    warningCategories: z.ZodArray<z.ZodString, "many">;
    minConfidenceThreshold: z.ZodDefault<z.ZodNumber>;
    blockOnViolation: z.ZodDefault<z.ZodBoolean>;
    logViolations: z.ZodDefault<z.ZodBoolean>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodString;
    updatedAt: z.ZodOptional<z.ZodString>;
    createdBy: z.ZodOptional<z.ZodString>;
    updatedBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    id: string;
    enabled: boolean;
    isGlobal: boolean;
    blockedCategories: string[];
    warningCategories: string[];
    minConfidenceThreshold: number;
    blockOnViolation: boolean;
    logViolations: boolean;
    companyId?: string | undefined;
    updatedAt?: string | undefined;
    createdBy?: string | undefined;
    updatedBy?: string | undefined;
}, {
    createdAt: string;
    id: string;
    blockedCategories: string[];
    warningCategories: string[];
    companyId?: string | undefined;
    updatedAt?: string | undefined;
    createdBy?: string | undefined;
    updatedBy?: string | undefined;
    enabled?: boolean | undefined;
    isGlobal?: boolean | undefined;
    minConfidenceThreshold?: number | undefined;
    blockOnViolation?: boolean | undefined;
    logViolations?: boolean | undefined;
}>;
export type AISafetyPolicy = z.infer<typeof AISafetyPolicySchema>;
export declare const AuditQueryFiltersSchema: z.ZodObject<{
    companyId: z.ZodString;
    since: z.ZodOptional<z.ZodString>;
    until: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    operation: z.ZodOptional<z.ZodEnum<["report-generation", "nlq-query", "q2q-classification", "other"]>>;
    status: z.ZodOptional<z.ZodEnum<["success", "failed", "blocked_safety", "blocked_evidence", "blocked_budget"]>>;
    safetyCheckPassed: z.ZodOptional<z.ZodBoolean>;
    evidenceGatePassed: z.ZodOptional<z.ZodBoolean>;
    budgetCheckPassed: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    companyId: string;
    limit: number;
    offset: number;
    status?: "failed" | "success" | "blocked_safety" | "blocked_evidence" | "blocked_budget" | undefined;
    operation?: "other" | "report-generation" | "nlq-query" | "q2q-classification" | undefined;
    model?: string | undefined;
    safetyCheckPassed?: boolean | undefined;
    evidenceGatePassed?: boolean | undefined;
    budgetCheckPassed?: boolean | undefined;
    since?: string | undefined;
    until?: string | undefined;
}, {
    companyId: string;
    status?: "failed" | "success" | "blocked_safety" | "blocked_evidence" | "blocked_budget" | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    operation?: "other" | "report-generation" | "nlq-query" | "q2q-classification" | undefined;
    model?: string | undefined;
    safetyCheckPassed?: boolean | undefined;
    evidenceGatePassed?: boolean | undefined;
    budgetCheckPassed?: boolean | undefined;
    since?: string | undefined;
    until?: string | undefined;
}>;
export type AuditQueryFilters = z.infer<typeof AuditQueryFiltersSchema>;
export declare const ExplainRequestSchema: z.ZodObject<{
    promptRecordId: z.ZodString;
    includePrompt: z.ZodDefault<z.ZodBoolean>;
    includeOutput: z.ZodDefault<z.ZodBoolean>;
    includeEvidence: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    promptRecordId: string;
    includePrompt: boolean;
    includeOutput: boolean;
    includeEvidence: boolean;
}, {
    promptRecordId: string;
    includePrompt?: boolean | undefined;
    includeOutput?: boolean | undefined;
    includeEvidence?: boolean | undefined;
}>;
export type ExplainRequest = z.infer<typeof ExplainRequestSchema>;
export declare const ExplainResponseSchema: z.ZodObject<{
    promptRecord: z.ZodObject<{
        id: z.ZodString;
        requestId: z.ZodString;
        companyId: z.ZodString;
        userId: z.ZodOptional<z.ZodString>;
        modelName: z.ZodString;
        modelVersion: z.ZodOptional<z.ZodString>;
        provider: z.ZodEnum<["openai", "anthropic", "google", "azure"]>;
        region: z.ZodOptional<z.ZodString>;
        promptTemplate: z.ZodOptional<z.ZodString>;
        promptHash: z.ZodString;
        promptVariables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        outputHash: z.ZodString;
        outputSummary: z.ZodOptional<z.ZodString>;
        evidenceIds: z.ZodArray<z.ZodString, "many">;
        citationCount: z.ZodDefault<z.ZodNumber>;
        topK: z.ZodOptional<z.ZodNumber>;
        tokensInput: z.ZodNumber;
        tokensOutput: z.ZodNumber;
        tokensTotal: z.ZodNumber;
        costUsd: z.ZodNumber;
        latencyMs: z.ZodNumber;
        createdAt: z.ZodString;
        safetyCheckPassed: z.ZodBoolean;
        safetyCheckDetails: z.ZodOptional<z.ZodObject<{
            categoriesChecked: z.ZodArray<z.ZodString, "many">;
            violations: z.ZodArray<z.ZodObject<{
                category: z.ZodString;
                confidence: z.ZodNumber;
                flaggedText: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                category: string;
                confidence: number;
                flaggedText?: string | undefined;
            }, {
                category: string;
                confidence: number;
                flaggedText?: string | undefined;
            }>, "many">;
            rationale: z.ZodOptional<z.ZodString>;
            checkDurationMs: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            violations: {
                category: string;
                confidence: number;
                flaggedText?: string | undefined;
            }[];
            categoriesChecked: string[];
            rationale?: string | undefined;
            checkDurationMs?: number | undefined;
        }, {
            violations: {
                category: string;
                confidence: number;
                flaggedText?: string | undefined;
            }[];
            categoriesChecked: string[];
            rationale?: string | undefined;
            checkDurationMs?: number | undefined;
        }>>;
        evidenceGatePassed: z.ZodBoolean;
        evidenceGateDetails: z.ZodOptional<z.ZodObject<{
            minCitationsRequired: z.ZodNumber;
            actualCitations: z.ZodNumber;
            citationDensity: z.ZodNumber;
            paragraphCount: z.ZodNumber;
            warnings: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            paragraphCount: number;
            citationDensity: number;
            minCitationsRequired: number;
            actualCitations: number;
            warnings?: string[] | undefined;
        }, {
            paragraphCount: number;
            citationDensity: number;
            minCitationsRequired: number;
            actualCitations: number;
            warnings?: string[] | undefined;
        }>>;
        budgetCheckPassed: z.ZodBoolean;
        budgetCheckDetails: z.ZodOptional<z.ZodObject<{
            limitUsd: z.ZodNumber;
            usedUsd: z.ZodNumber;
            remainingUsd: z.ZodNumber;
            thisCostUsd: z.ZodNumber;
            period: z.ZodEnum<["daily", "monthly"]>;
            resetAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            period: "monthly" | "daily";
            limitUsd: number;
            usedUsd: number;
            remainingUsd: number;
            thisCostUsd: number;
            resetAt: string;
        }, {
            period: "monthly" | "daily";
            limitUsd: number;
            usedUsd: number;
            remainingUsd: number;
            thisCostUsd: number;
            resetAt: string;
        }>>;
        status: z.ZodEnum<["success", "failed", "blocked_safety", "blocked_evidence", "blocked_budget"]>;
        errorMessage: z.ZodOptional<z.ZodString>;
        sectionExplanations: z.ZodOptional<z.ZodArray<z.ZodObject<{
            sectionType: z.ZodString;
            whyThisSection: z.ZodString;
            topEvidenceIds: z.ZodArray<z.ZodString, "many">;
            variablesUsed: z.ZodRecord<z.ZodString, z.ZodAny>;
        }, "strip", z.ZodTypeAny, {
            topEvidenceIds: string[];
            sectionType: string;
            whyThisSection: string;
            variablesUsed: Record<string, any>;
        }, {
            topEvidenceIds: string[];
            sectionType: string;
            whyThisSection: string;
            variablesUsed: Record<string, any>;
        }>, "many">>;
        retryCount: z.ZodDefault<z.ZodNumber>;
        parentRequestId: z.ZodOptional<z.ZodString>;
        operation: z.ZodEnum<["report-generation", "nlq-query", "q2q-classification", "other"]>;
        createdBy: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "failed" | "success" | "blocked_safety" | "blocked_evidence" | "blocked_budget";
        companyId: string;
        createdAt: string;
        id: string;
        operation: "other" | "report-generation" | "nlq-query" | "q2q-classification";
        provider: "openai" | "anthropic" | "google" | "azure";
        tokensInput: number;
        tokensOutput: number;
        tokensTotal: number;
        costUsd: number;
        requestId: string;
        latencyMs: number;
        citationCount: number;
        modelName: string;
        promptHash: string;
        outputHash: string;
        evidenceIds: string[];
        safetyCheckPassed: boolean;
        evidenceGatePassed: boolean;
        budgetCheckPassed: boolean;
        retryCount: number;
        updatedAt?: string | undefined;
        createdBy?: string | undefined;
        region?: string | undefined;
        userId?: string | undefined;
        promptTemplate?: string | undefined;
        promptVariables?: Record<string, any> | undefined;
        modelVersion?: string | undefined;
        outputSummary?: string | undefined;
        topK?: number | undefined;
        safetyCheckDetails?: {
            violations: {
                category: string;
                confidence: number;
                flaggedText?: string | undefined;
            }[];
            categoriesChecked: string[];
            rationale?: string | undefined;
            checkDurationMs?: number | undefined;
        } | undefined;
        evidenceGateDetails?: {
            paragraphCount: number;
            citationDensity: number;
            minCitationsRequired: number;
            actualCitations: number;
            warnings?: string[] | undefined;
        } | undefined;
        budgetCheckDetails?: {
            period: "monthly" | "daily";
            limitUsd: number;
            usedUsd: number;
            remainingUsd: number;
            thisCostUsd: number;
            resetAt: string;
        } | undefined;
        errorMessage?: string | undefined;
        sectionExplanations?: {
            topEvidenceIds: string[];
            sectionType: string;
            whyThisSection: string;
            variablesUsed: Record<string, any>;
        }[] | undefined;
        parentRequestId?: string | undefined;
    }, {
        status: "failed" | "success" | "blocked_safety" | "blocked_evidence" | "blocked_budget";
        companyId: string;
        createdAt: string;
        id: string;
        operation: "other" | "report-generation" | "nlq-query" | "q2q-classification";
        provider: "openai" | "anthropic" | "google" | "azure";
        tokensInput: number;
        tokensOutput: number;
        tokensTotal: number;
        costUsd: number;
        requestId: string;
        latencyMs: number;
        modelName: string;
        promptHash: string;
        outputHash: string;
        evidenceIds: string[];
        safetyCheckPassed: boolean;
        evidenceGatePassed: boolean;
        budgetCheckPassed: boolean;
        updatedAt?: string | undefined;
        createdBy?: string | undefined;
        region?: string | undefined;
        userId?: string | undefined;
        promptTemplate?: string | undefined;
        promptVariables?: Record<string, any> | undefined;
        citationCount?: number | undefined;
        modelVersion?: string | undefined;
        outputSummary?: string | undefined;
        topK?: number | undefined;
        safetyCheckDetails?: {
            violations: {
                category: string;
                confidence: number;
                flaggedText?: string | undefined;
            }[];
            categoriesChecked: string[];
            rationale?: string | undefined;
            checkDurationMs?: number | undefined;
        } | undefined;
        evidenceGateDetails?: {
            paragraphCount: number;
            citationDensity: number;
            minCitationsRequired: number;
            actualCitations: number;
            warnings?: string[] | undefined;
        } | undefined;
        budgetCheckDetails?: {
            period: "monthly" | "daily";
            limitUsd: number;
            usedUsd: number;
            remainingUsd: number;
            thisCostUsd: number;
            resetAt: string;
        } | undefined;
        errorMessage?: string | undefined;
        sectionExplanations?: {
            topEvidenceIds: string[];
            sectionType: string;
            whyThisSection: string;
            variablesUsed: Record<string, any>;
        }[] | undefined;
        retryCount?: number | undefined;
        parentRequestId?: string | undefined;
    }>;
    promptTemplate: z.ZodOptional<z.ZodString>;
    promptReconstructed: z.ZodOptional<z.ZodString>;
    outputFull: z.ZodOptional<z.ZodString>;
    evidenceSnippets: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
        dimension: z.ZodOptional<z.ZodString>;
        score: z.ZodOptional<z.ZodNumber>;
        relevanceScore: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        text: string;
        relevanceScore?: number | undefined;
        dimension?: string | undefined;
        score?: number | undefined;
    }, {
        id: string;
        text: string;
        relevanceScore?: number | undefined;
        dimension?: string | undefined;
        score?: number | undefined;
    }>, "many">>;
    sectionBreakdown: z.ZodOptional<z.ZodArray<z.ZodObject<{
        sectionType: z.ZodString;
        reasoning: z.ZodString;
        evidenceUsed: z.ZodArray<z.ZodString, "many">;
        variables: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        sectionType: string;
        reasoning: string;
        evidenceUsed: string[];
        variables: Record<string, any>;
    }, {
        sectionType: string;
        reasoning: string;
        evidenceUsed: string[];
        variables: Record<string, any>;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    promptRecord: {
        status: "failed" | "success" | "blocked_safety" | "blocked_evidence" | "blocked_budget";
        companyId: string;
        createdAt: string;
        id: string;
        operation: "other" | "report-generation" | "nlq-query" | "q2q-classification";
        provider: "openai" | "anthropic" | "google" | "azure";
        tokensInput: number;
        tokensOutput: number;
        tokensTotal: number;
        costUsd: number;
        requestId: string;
        latencyMs: number;
        citationCount: number;
        modelName: string;
        promptHash: string;
        outputHash: string;
        evidenceIds: string[];
        safetyCheckPassed: boolean;
        evidenceGatePassed: boolean;
        budgetCheckPassed: boolean;
        retryCount: number;
        updatedAt?: string | undefined;
        createdBy?: string | undefined;
        region?: string | undefined;
        userId?: string | undefined;
        promptTemplate?: string | undefined;
        promptVariables?: Record<string, any> | undefined;
        modelVersion?: string | undefined;
        outputSummary?: string | undefined;
        topK?: number | undefined;
        safetyCheckDetails?: {
            violations: {
                category: string;
                confidence: number;
                flaggedText?: string | undefined;
            }[];
            categoriesChecked: string[];
            rationale?: string | undefined;
            checkDurationMs?: number | undefined;
        } | undefined;
        evidenceGateDetails?: {
            paragraphCount: number;
            citationDensity: number;
            minCitationsRequired: number;
            actualCitations: number;
            warnings?: string[] | undefined;
        } | undefined;
        budgetCheckDetails?: {
            period: "monthly" | "daily";
            limitUsd: number;
            usedUsd: number;
            remainingUsd: number;
            thisCostUsd: number;
            resetAt: string;
        } | undefined;
        errorMessage?: string | undefined;
        sectionExplanations?: {
            topEvidenceIds: string[];
            sectionType: string;
            whyThisSection: string;
            variablesUsed: Record<string, any>;
        }[] | undefined;
        parentRequestId?: string | undefined;
    };
    promptTemplate?: string | undefined;
    evidenceSnippets?: {
        id: string;
        text: string;
        relevanceScore?: number | undefined;
        dimension?: string | undefined;
        score?: number | undefined;
    }[] | undefined;
    promptReconstructed?: string | undefined;
    outputFull?: string | undefined;
    sectionBreakdown?: {
        sectionType: string;
        reasoning: string;
        evidenceUsed: string[];
        variables: Record<string, any>;
    }[] | undefined;
}, {
    promptRecord: {
        status: "failed" | "success" | "blocked_safety" | "blocked_evidence" | "blocked_budget";
        companyId: string;
        createdAt: string;
        id: string;
        operation: "other" | "report-generation" | "nlq-query" | "q2q-classification";
        provider: "openai" | "anthropic" | "google" | "azure";
        tokensInput: number;
        tokensOutput: number;
        tokensTotal: number;
        costUsd: number;
        requestId: string;
        latencyMs: number;
        modelName: string;
        promptHash: string;
        outputHash: string;
        evidenceIds: string[];
        safetyCheckPassed: boolean;
        evidenceGatePassed: boolean;
        budgetCheckPassed: boolean;
        updatedAt?: string | undefined;
        createdBy?: string | undefined;
        region?: string | undefined;
        userId?: string | undefined;
        promptTemplate?: string | undefined;
        promptVariables?: Record<string, any> | undefined;
        citationCount?: number | undefined;
        modelVersion?: string | undefined;
        outputSummary?: string | undefined;
        topK?: number | undefined;
        safetyCheckDetails?: {
            violations: {
                category: string;
                confidence: number;
                flaggedText?: string | undefined;
            }[];
            categoriesChecked: string[];
            rationale?: string | undefined;
            checkDurationMs?: number | undefined;
        } | undefined;
        evidenceGateDetails?: {
            paragraphCount: number;
            citationDensity: number;
            minCitationsRequired: number;
            actualCitations: number;
            warnings?: string[] | undefined;
        } | undefined;
        budgetCheckDetails?: {
            period: "monthly" | "daily";
            limitUsd: number;
            usedUsd: number;
            remainingUsd: number;
            thisCostUsd: number;
            resetAt: string;
        } | undefined;
        errorMessage?: string | undefined;
        sectionExplanations?: {
            topEvidenceIds: string[];
            sectionType: string;
            whyThisSection: string;
            variablesUsed: Record<string, any>;
        }[] | undefined;
        retryCount?: number | undefined;
        parentRequestId?: string | undefined;
    };
    promptTemplate?: string | undefined;
    evidenceSnippets?: {
        id: string;
        text: string;
        relevanceScore?: number | undefined;
        dimension?: string | undefined;
        score?: number | undefined;
    }[] | undefined;
    promptReconstructed?: string | undefined;
    outputFull?: string | undefined;
    sectionBreakdown?: {
        sectionType: string;
        reasoning: string;
        evidenceUsed: string[];
        variables: Record<string, any>;
    }[] | undefined;
}>;
export type ExplainResponse = z.infer<typeof ExplainResponseSchema>;
//# sourceMappingURL=prompt-record.d.ts.map