/**
 * Guardrails Types
 * Worker 10: AI/ML Explainability & Guardrails
 *
 * Types for safety moderation, evidence gating, and budget enforcement
 */
import { z } from 'zod';
export declare const SafetyCategorySchema: z.ZodEnum<["hate", "violence", "self-harm", "sexual", "sexual/minors", "harassment", "dangerous"]>;
export type SafetyCategory = z.infer<typeof SafetyCategorySchema>;
export declare const SafetyViolationSchema: z.ZodObject<{
    category: z.ZodEnum<["hate", "violence", "self-harm", "sexual", "sexual/minors", "harassment", "dangerous"]>;
    confidence: z.ZodNumber;
    flaggedText: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
}, "strip", z.ZodTypeAny, {
    category: "hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous";
    confidence: number;
    severity?: "low" | "medium" | "high" | undefined;
    flaggedText?: string | undefined;
}, {
    category: "hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous";
    confidence: number;
    severity?: "low" | "medium" | "high" | undefined;
    flaggedText?: string | undefined;
}>;
export type SafetyViolation = z.infer<typeof SafetyViolationSchema>;
export declare const SafetyCheckResultSchema: z.ZodObject<{
    passed: z.ZodBoolean;
    violations: z.ZodArray<z.ZodObject<{
        category: z.ZodEnum<["hate", "violence", "self-harm", "sexual", "sexual/minors", "harassment", "dangerous"]>;
        confidence: z.ZodNumber;
        flaggedText: z.ZodOptional<z.ZodString>;
        severity: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
    }, "strip", z.ZodTypeAny, {
        category: "hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous";
        confidence: number;
        severity?: "low" | "medium" | "high" | undefined;
        flaggedText?: string | undefined;
    }, {
        category: "hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous";
        confidence: number;
        severity?: "low" | "medium" | "high" | undefined;
        flaggedText?: string | undefined;
    }>, "many">;
    categoriesChecked: z.ZodArray<z.ZodEnum<["hate", "violence", "self-harm", "sexual", "sexual/minors", "harassment", "dangerous"]>, "many">;
    rationale: z.ZodOptional<z.ZodString>;
    action: z.ZodEnum<["allow", "warn", "block"]>;
    checkDurationMs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    passed: boolean;
    violations: {
        category: "hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous";
        confidence: number;
        severity?: "low" | "medium" | "high" | undefined;
        flaggedText?: string | undefined;
    }[];
    categoriesChecked: ("hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous")[];
    action: "allow" | "warn" | "block";
    checkDurationMs: number;
    rationale?: string | undefined;
}, {
    passed: boolean;
    violations: {
        category: "hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous";
        confidence: number;
        severity?: "low" | "medium" | "high" | undefined;
        flaggedText?: string | undefined;
    }[];
    categoriesChecked: ("hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous")[];
    action: "allow" | "warn" | "block";
    checkDurationMs: number;
    rationale?: string | undefined;
}>;
export type SafetyCheckResult = z.infer<typeof SafetyCheckResultSchema>;
export declare const SafetyCheckRequestSchema: z.ZodObject<{
    text: z.ZodString;
    companyId: z.ZodString;
    operation: z.ZodString;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    companyId: string;
    text: string;
    operation: string;
    context?: Record<string, any> | undefined;
}, {
    companyId: string;
    text: string;
    operation: string;
    context?: Record<string, any> | undefined;
}>;
export type SafetyCheckRequest = z.infer<typeof SafetyCheckRequestSchema>;
export declare const EvidenceGateConfigSchema: z.ZodObject<{
    minCitationsPerParagraph: z.ZodDefault<z.ZodNumber>;
    minCitationDensity: z.ZodDefault<z.ZodNumber>;
    failFast: z.ZodDefault<z.ZodBoolean>;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    minCitationsPerParagraph: number;
    minCitationDensity: number;
    failFast: boolean;
    enabled: boolean;
}, {
    minCitationsPerParagraph?: number | undefined;
    minCitationDensity?: number | undefined;
    failFast?: boolean | undefined;
    enabled?: boolean | undefined;
}>;
export type EvidenceGateConfig = z.infer<typeof EvidenceGateConfigSchema>;
export declare const EvidenceGateResultSchema: z.ZodObject<{
    passed: z.ZodBoolean;
    citationCount: z.ZodNumber;
    paragraphCount: z.ZodNumber;
    citationDensity: z.ZodNumber;
    minCitationsRequired: z.ZodNumber;
    errors: z.ZodArray<z.ZodString, "many">;
    warnings: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    errors: string[];
    warnings: string[];
    passed: boolean;
    citationCount: number;
    paragraphCount: number;
    citationDensity: number;
    minCitationsRequired: number;
}, {
    errors: string[];
    warnings: string[];
    passed: boolean;
    citationCount: number;
    paragraphCount: number;
    citationDensity: number;
    minCitationsRequired: number;
}>;
export type EvidenceGateResult = z.infer<typeof EvidenceGateResultSchema>;
export declare const EvidenceGateRequestSchema: z.ZodObject<{
    generatedText: z.ZodString;
    availableEvidenceIds: z.ZodArray<z.ZodString, "many">;
    config: z.ZodOptional<z.ZodObject<{
        minCitationsPerParagraph: z.ZodDefault<z.ZodNumber>;
        minCitationDensity: z.ZodDefault<z.ZodNumber>;
        failFast: z.ZodDefault<z.ZodBoolean>;
        enabled: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        minCitationsPerParagraph: number;
        minCitationDensity: number;
        failFast: boolean;
        enabled: boolean;
    }, {
        minCitationsPerParagraph?: number | undefined;
        minCitationDensity?: number | undefined;
        failFast?: boolean | undefined;
        enabled?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    generatedText: string;
    availableEvidenceIds: string[];
    config?: {
        minCitationsPerParagraph: number;
        minCitationDensity: number;
        failFast: boolean;
        enabled: boolean;
    } | undefined;
}, {
    generatedText: string;
    availableEvidenceIds: string[];
    config?: {
        minCitationsPerParagraph?: number | undefined;
        minCitationDensity?: number | undefined;
        failFast?: boolean | undefined;
        enabled?: boolean | undefined;
    } | undefined;
}>;
export type EvidenceGateRequest = z.infer<typeof EvidenceGateRequestSchema>;
export declare const BudgetCheckRequestSchema: z.ZodObject<{
    companyId: z.ZodString;
    estimatedCostUsd: z.ZodNumber;
    operation: z.ZodString;
}, "strip", z.ZodTypeAny, {
    companyId: string;
    operation: string;
    estimatedCostUsd: number;
}, {
    companyId: string;
    operation: string;
    estimatedCostUsd: number;
}>;
export type BudgetCheckRequest = z.infer<typeof BudgetCheckRequestSchema>;
export declare const BudgetCheckResultSchema: z.ZodObject<{
    allowed: z.ZodBoolean;
    limitUsd: z.ZodNumber;
    usedUsd: z.ZodNumber;
    remainingUsd: z.ZodNumber;
    thisCostUsd: z.ZodNumber;
    period: z.ZodEnum<["daily", "monthly"]>;
    resetAt: z.ZodString;
    thresholdReached: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    period: "monthly" | "daily";
    allowed: boolean;
    limitUsd: number;
    usedUsd: number;
    remainingUsd: number;
    thisCostUsd: number;
    resetAt: string;
    thresholdReached: boolean;
    message?: string | undefined;
}, {
    period: "monthly" | "daily";
    allowed: boolean;
    limitUsd: number;
    usedUsd: number;
    remainingUsd: number;
    thisCostUsd: number;
    resetAt: string;
    thresholdReached: boolean;
    message?: string | undefined;
}>;
export type BudgetCheckResult = z.infer<typeof BudgetCheckResultSchema>;
export declare const GuardrailsResultSchema: z.ZodObject<{
    safety: z.ZodObject<{
        passed: z.ZodBoolean;
        violations: z.ZodArray<z.ZodObject<{
            category: z.ZodEnum<["hate", "violence", "self-harm", "sexual", "sexual/minors", "harassment", "dangerous"]>;
            confidence: z.ZodNumber;
            flaggedText: z.ZodOptional<z.ZodString>;
            severity: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
        }, "strip", z.ZodTypeAny, {
            category: "hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous";
            confidence: number;
            severity?: "low" | "medium" | "high" | undefined;
            flaggedText?: string | undefined;
        }, {
            category: "hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous";
            confidence: number;
            severity?: "low" | "medium" | "high" | undefined;
            flaggedText?: string | undefined;
        }>, "many">;
        categoriesChecked: z.ZodArray<z.ZodEnum<["hate", "violence", "self-harm", "sexual", "sexual/minors", "harassment", "dangerous"]>, "many">;
        rationale: z.ZodOptional<z.ZodString>;
        action: z.ZodEnum<["allow", "warn", "block"]>;
        checkDurationMs: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        passed: boolean;
        violations: {
            category: "hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous";
            confidence: number;
            severity?: "low" | "medium" | "high" | undefined;
            flaggedText?: string | undefined;
        }[];
        categoriesChecked: ("hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous")[];
        action: "allow" | "warn" | "block";
        checkDurationMs: number;
        rationale?: string | undefined;
    }, {
        passed: boolean;
        violations: {
            category: "hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous";
            confidence: number;
            severity?: "low" | "medium" | "high" | undefined;
            flaggedText?: string | undefined;
        }[];
        categoriesChecked: ("hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous")[];
        action: "allow" | "warn" | "block";
        checkDurationMs: number;
        rationale?: string | undefined;
    }>;
    evidence: z.ZodOptional<z.ZodObject<{
        passed: z.ZodBoolean;
        citationCount: z.ZodNumber;
        paragraphCount: z.ZodNumber;
        citationDensity: z.ZodNumber;
        minCitationsRequired: z.ZodNumber;
        errors: z.ZodArray<z.ZodString, "many">;
        warnings: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        errors: string[];
        warnings: string[];
        passed: boolean;
        citationCount: number;
        paragraphCount: number;
        citationDensity: number;
        minCitationsRequired: number;
    }, {
        errors: string[];
        warnings: string[];
        passed: boolean;
        citationCount: number;
        paragraphCount: number;
        citationDensity: number;
        minCitationsRequired: number;
    }>>;
    budget: z.ZodObject<{
        allowed: z.ZodBoolean;
        limitUsd: z.ZodNumber;
        usedUsd: z.ZodNumber;
        remainingUsd: z.ZodNumber;
        thisCostUsd: z.ZodNumber;
        period: z.ZodEnum<["daily", "monthly"]>;
        resetAt: z.ZodString;
        thresholdReached: z.ZodBoolean;
        message: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        period: "monthly" | "daily";
        allowed: boolean;
        limitUsd: number;
        usedUsd: number;
        remainingUsd: number;
        thisCostUsd: number;
        resetAt: string;
        thresholdReached: boolean;
        message?: string | undefined;
    }, {
        period: "monthly" | "daily";
        allowed: boolean;
        limitUsd: number;
        usedUsd: number;
        remainingUsd: number;
        thisCostUsd: number;
        resetAt: string;
        thresholdReached: boolean;
        message?: string | undefined;
    }>;
    overallPassed: z.ZodBoolean;
    blockedReason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    safety: {
        passed: boolean;
        violations: {
            category: "hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous";
            confidence: number;
            severity?: "low" | "medium" | "high" | undefined;
            flaggedText?: string | undefined;
        }[];
        categoriesChecked: ("hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous")[];
        action: "allow" | "warn" | "block";
        checkDurationMs: number;
        rationale?: string | undefined;
    };
    budget: {
        period: "monthly" | "daily";
        allowed: boolean;
        limitUsd: number;
        usedUsd: number;
        remainingUsd: number;
        thisCostUsd: number;
        resetAt: string;
        thresholdReached: boolean;
        message?: string | undefined;
    };
    overallPassed: boolean;
    evidence?: {
        errors: string[];
        warnings: string[];
        passed: boolean;
        citationCount: number;
        paragraphCount: number;
        citationDensity: number;
        minCitationsRequired: number;
    } | undefined;
    blockedReason?: string | undefined;
}, {
    safety: {
        passed: boolean;
        violations: {
            category: "hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous";
            confidence: number;
            severity?: "low" | "medium" | "high" | undefined;
            flaggedText?: string | undefined;
        }[];
        categoriesChecked: ("hate" | "violence" | "self-harm" | "sexual" | "sexual/minors" | "harassment" | "dangerous")[];
        action: "allow" | "warn" | "block";
        checkDurationMs: number;
        rationale?: string | undefined;
    };
    budget: {
        period: "monthly" | "daily";
        allowed: boolean;
        limitUsd: number;
        usedUsd: number;
        remainingUsd: number;
        thisCostUsd: number;
        resetAt: string;
        thresholdReached: boolean;
        message?: string | undefined;
    };
    overallPassed: boolean;
    evidence?: {
        errors: string[];
        warnings: string[];
        passed: boolean;
        citationCount: number;
        paragraphCount: number;
        citationDensity: number;
        minCitationsRequired: number;
    } | undefined;
    blockedReason?: string | undefined;
}>;
export type GuardrailsResult = z.infer<typeof GuardrailsResultSchema>;
//# sourceMappingURL=guardrails.d.ts.map