import { z } from 'zod';
/**
 * Campaigns Types & Validation
 *
 * SWARM 6: Beneficiary Groups, Campaigns & Monetization
 * Sellable CSR products linking templates, beneficiary groups, and commercial terms
 *
 * @see /packages/shared-schema/src/schema/campaigns.ts
 * @see /docs/CAMPAIGN_LIFECYCLE.md
 * @see /docs/CAMPAIGN_PRICING_MODELS.md
 */
export declare const CampaignStatusEnum: z.ZodEnum<["draft", "planned", "recruiting", "active", "paused", "completed", "closed"]>;
export declare const PricingModelEnum: z.ZodEnum<["seats", "credits", "bundle", "iaas", "custom"]>;
export declare const CampaignPriorityEnum: z.ZodEnum<["low", "medium", "high", "critical"]>;
export type CampaignStatus = z.infer<typeof CampaignStatusEnum>;
export type PricingModel = z.infer<typeof PricingModelEnum>;
export type CampaignPriority = z.infer<typeof CampaignPriorityEnum>;
/**
 * IAAS (Impact-as-a-Service) pricing metrics
 */
export declare const IAASMetricsSchema: z.ZodObject<{
    learnersCommitted: z.ZodNumber;
    pricePerLearner: z.ZodNumber;
    outcomesGuaranteed: z.ZodArray<z.ZodString, "many">;
    outcomeThresholds: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    learnersCommitted: number;
    pricePerLearner: number;
    outcomesGuaranteed: string[];
    outcomeThresholds?: Record<string, number> | undefined;
}, {
    learnersCommitted: number;
    pricePerLearner: number;
    outcomesGuaranteed: string[];
    outcomeThresholds?: Record<string, number> | undefined;
}>;
export type IAASMetrics = z.infer<typeof IAASMetricsSchema>;
/**
 * Custom pricing terms
 */
export declare const CustomPricingTermsSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    fixedFee: z.ZodOptional<z.ZodNumber>;
    variableComponents: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        unit: z.ZodString;
        rate: z.ZodNumber;
        cap: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        unit: string;
        name: string;
        rate: number;
        cap?: number | undefined;
    }, {
        unit: string;
        name: string;
        rate: number;
        cap?: number | undefined;
    }>, "many">>;
    milestonePayments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        milestone: z.ZodString;
        amount: z.ZodNumber;
        dueDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        milestone: string;
        amount: number;
        dueDate?: string | undefined;
    }, {
        milestone: string;
        amount: number;
        dueDate?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    fixedFee?: number | undefined;
    variableComponents?: {
        unit: string;
        name: string;
        rate: number;
        cap?: number | undefined;
    }[] | undefined;
    milestonePayments?: {
        milestone: string;
        amount: number;
        dueDate?: string | undefined;
    }[] | undefined;
}, {
    description?: string | undefined;
    fixedFee?: number | undefined;
    variableComponents?: {
        unit: string;
        name: string;
        rate: number;
        cap?: number | undefined;
    }[] | undefined;
    milestonePayments?: {
        milestone: string;
        amount: number;
        dueDate?: string | undefined;
    }[] | undefined;
}>;
export type CustomPricingTerms = z.infer<typeof CustomPricingTermsSchema>;
/**
 * Configuration overrides from template
 */
export declare const ConfigOverridesSchema: z.ZodRecord<z.ZodString, z.ZodAny>;
export type ConfigOverrides = z.infer<typeof ConfigOverridesSchema>;
/**
 * Create campaign request
 */
export declare const CreateCampaignSchema: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodObject<{
    name: z.ZodString;
    companyId: z.ZodString;
    programTemplateId: z.ZodString;
    beneficiaryGroupId: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    targetVolunteers: z.ZodNumber;
    targetBeneficiaries: z.ZodNumber;
    budgetAllocated: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    pricingModel: z.ZodEnum<["seats", "credits", "bundle", "iaas", "custom"]>;
    description: z.ZodOptional<z.ZodString>;
    quarter: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["draft", "planned", "recruiting", "active", "paused", "completed", "closed"]>>;
    priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "critical"]>>;
    maxSessions: z.ZodOptional<z.ZodNumber>;
    committedSeats: z.ZodOptional<z.ZodNumber>;
    seatPricePerMonth: z.ZodOptional<z.ZodNumber>;
    creditAllocation: z.ZodOptional<z.ZodNumber>;
    creditConsumptionRate: z.ZodOptional<z.ZodNumber>;
    iaasMetrics: z.ZodOptional<z.ZodObject<{
        learnersCommitted: z.ZodNumber;
        pricePerLearner: z.ZodNumber;
        outcomesGuaranteed: z.ZodArray<z.ZodString, "many">;
        outcomeThresholds: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    }, {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    }>>;
    l2iSubscriptionId: z.ZodOptional<z.ZodString>;
    bundleAllocationPercentage: z.ZodOptional<z.ZodNumber>;
    customPricingTerms: z.ZodOptional<z.ZodObject<{
        description: z.ZodOptional<z.ZodString>;
        fixedFee: z.ZodOptional<z.ZodNumber>;
        variableComponents: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            unit: z.ZodString;
            rate: z.ZodNumber;
            cap: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }, {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }>, "many">>;
        milestonePayments: z.ZodOptional<z.ZodArray<z.ZodObject<{
            milestone: z.ZodString;
            amount: z.ZodNumber;
            dueDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }, {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    }, {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    }>>;
    configOverrides: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    internalNotes: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    budgetAllocated: number;
    startDate: string;
    endDate: string;
    name: string;
    targetVolunteers: number;
    targetBeneficiaries: number;
    currency: string;
    pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    maxSessions?: number | undefined;
    committedSeats?: number | undefined;
    seatPricePerMonth?: number | undefined;
    creditAllocation?: number | undefined;
    creditConsumptionRate?: number | undefined;
    iaasMetrics?: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | undefined;
    l2iSubscriptionId?: string | undefined;
    bundleAllocationPercentage?: number | undefined;
    customPricingTerms?: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | undefined;
    configOverrides?: Record<string, any> | undefined;
    internalNotes?: string | undefined;
}, {
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    budgetAllocated: number;
    startDate: string;
    endDate: string;
    name: string;
    targetVolunteers: number;
    targetBeneficiaries: number;
    pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    currency?: string | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    maxSessions?: number | undefined;
    committedSeats?: number | undefined;
    seatPricePerMonth?: number | undefined;
    creditAllocation?: number | undefined;
    creditConsumptionRate?: number | undefined;
    iaasMetrics?: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | undefined;
    l2iSubscriptionId?: string | undefined;
    bundleAllocationPercentage?: number | undefined;
    customPricingTerms?: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | undefined;
    configOverrides?: Record<string, any> | undefined;
    internalNotes?: string | undefined;
}>, {
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    budgetAllocated: number;
    startDate: string;
    endDate: string;
    name: string;
    targetVolunteers: number;
    targetBeneficiaries: number;
    currency: string;
    pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    maxSessions?: number | undefined;
    committedSeats?: number | undefined;
    seatPricePerMonth?: number | undefined;
    creditAllocation?: number | undefined;
    creditConsumptionRate?: number | undefined;
    iaasMetrics?: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | undefined;
    l2iSubscriptionId?: string | undefined;
    bundleAllocationPercentage?: number | undefined;
    customPricingTerms?: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | undefined;
    configOverrides?: Record<string, any> | undefined;
    internalNotes?: string | undefined;
}, {
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    budgetAllocated: number;
    startDate: string;
    endDate: string;
    name: string;
    targetVolunteers: number;
    targetBeneficiaries: number;
    pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    currency?: string | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    maxSessions?: number | undefined;
    committedSeats?: number | undefined;
    seatPricePerMonth?: number | undefined;
    creditAllocation?: number | undefined;
    creditConsumptionRate?: number | undefined;
    iaasMetrics?: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | undefined;
    l2iSubscriptionId?: string | undefined;
    bundleAllocationPercentage?: number | undefined;
    customPricingTerms?: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | undefined;
    configOverrides?: Record<string, any> | undefined;
    internalNotes?: string | undefined;
}>, {
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    budgetAllocated: number;
    startDate: string;
    endDate: string;
    name: string;
    targetVolunteers: number;
    targetBeneficiaries: number;
    currency: string;
    pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    maxSessions?: number | undefined;
    committedSeats?: number | undefined;
    seatPricePerMonth?: number | undefined;
    creditAllocation?: number | undefined;
    creditConsumptionRate?: number | undefined;
    iaasMetrics?: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | undefined;
    l2iSubscriptionId?: string | undefined;
    bundleAllocationPercentage?: number | undefined;
    customPricingTerms?: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | undefined;
    configOverrides?: Record<string, any> | undefined;
    internalNotes?: string | undefined;
}, {
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    budgetAllocated: number;
    startDate: string;
    endDate: string;
    name: string;
    targetVolunteers: number;
    targetBeneficiaries: number;
    pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    currency?: string | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    maxSessions?: number | undefined;
    committedSeats?: number | undefined;
    seatPricePerMonth?: number | undefined;
    creditAllocation?: number | undefined;
    creditConsumptionRate?: number | undefined;
    iaasMetrics?: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | undefined;
    l2iSubscriptionId?: string | undefined;
    bundleAllocationPercentage?: number | undefined;
    customPricingTerms?: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | undefined;
    configOverrides?: Record<string, any> | undefined;
    internalNotes?: string | undefined;
}>, {
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    budgetAllocated: number;
    startDate: string;
    endDate: string;
    name: string;
    targetVolunteers: number;
    targetBeneficiaries: number;
    currency: string;
    pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    maxSessions?: number | undefined;
    committedSeats?: number | undefined;
    seatPricePerMonth?: number | undefined;
    creditAllocation?: number | undefined;
    creditConsumptionRate?: number | undefined;
    iaasMetrics?: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | undefined;
    l2iSubscriptionId?: string | undefined;
    bundleAllocationPercentage?: number | undefined;
    customPricingTerms?: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | undefined;
    configOverrides?: Record<string, any> | undefined;
    internalNotes?: string | undefined;
}, {
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    budgetAllocated: number;
    startDate: string;
    endDate: string;
    name: string;
    targetVolunteers: number;
    targetBeneficiaries: number;
    pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    currency?: string | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    maxSessions?: number | undefined;
    committedSeats?: number | undefined;
    seatPricePerMonth?: number | undefined;
    creditAllocation?: number | undefined;
    creditConsumptionRate?: number | undefined;
    iaasMetrics?: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | undefined;
    l2iSubscriptionId?: string | undefined;
    bundleAllocationPercentage?: number | undefined;
    customPricingTerms?: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | undefined;
    configOverrides?: Record<string, any> | undefined;
    internalNotes?: string | undefined;
}>, {
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    budgetAllocated: number;
    startDate: string;
    endDate: string;
    name: string;
    targetVolunteers: number;
    targetBeneficiaries: number;
    currency: string;
    pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    maxSessions?: number | undefined;
    committedSeats?: number | undefined;
    seatPricePerMonth?: number | undefined;
    creditAllocation?: number | undefined;
    creditConsumptionRate?: number | undefined;
    iaasMetrics?: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | undefined;
    l2iSubscriptionId?: string | undefined;
    bundleAllocationPercentage?: number | undefined;
    customPricingTerms?: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | undefined;
    configOverrides?: Record<string, any> | undefined;
    internalNotes?: string | undefined;
}, {
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    budgetAllocated: number;
    startDate: string;
    endDate: string;
    name: string;
    targetVolunteers: number;
    targetBeneficiaries: number;
    pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    currency?: string | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    maxSessions?: number | undefined;
    committedSeats?: number | undefined;
    seatPricePerMonth?: number | undefined;
    creditAllocation?: number | undefined;
    creditConsumptionRate?: number | undefined;
    iaasMetrics?: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | undefined;
    l2iSubscriptionId?: string | undefined;
    bundleAllocationPercentage?: number | undefined;
    customPricingTerms?: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | undefined;
    configOverrides?: Record<string, any> | undefined;
    internalNotes?: string | undefined;
}>, {
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    budgetAllocated: number;
    startDate: string;
    endDate: string;
    name: string;
    targetVolunteers: number;
    targetBeneficiaries: number;
    currency: string;
    pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    maxSessions?: number | undefined;
    committedSeats?: number | undefined;
    seatPricePerMonth?: number | undefined;
    creditAllocation?: number | undefined;
    creditConsumptionRate?: number | undefined;
    iaasMetrics?: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | undefined;
    l2iSubscriptionId?: string | undefined;
    bundleAllocationPercentage?: number | undefined;
    customPricingTerms?: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | undefined;
    configOverrides?: Record<string, any> | undefined;
    internalNotes?: string | undefined;
}, {
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    budgetAllocated: number;
    startDate: string;
    endDate: string;
    name: string;
    targetVolunteers: number;
    targetBeneficiaries: number;
    pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    currency?: string | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    maxSessions?: number | undefined;
    committedSeats?: number | undefined;
    seatPricePerMonth?: number | undefined;
    creditAllocation?: number | undefined;
    creditConsumptionRate?: number | undefined;
    iaasMetrics?: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | undefined;
    l2iSubscriptionId?: string | undefined;
    bundleAllocationPercentage?: number | undefined;
    customPricingTerms?: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | undefined;
    configOverrides?: Record<string, any> | undefined;
    internalNotes?: string | undefined;
}>;
export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
/**
 * Update campaign request
 * All fields optional except those that shouldn't change
 */
export declare const UpdateCampaignSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    quarter: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["draft", "planned", "recruiting", "active", "paused", "completed", "closed"]>>;
    priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "critical"]>>;
    targetVolunteers: z.ZodOptional<z.ZodNumber>;
    targetBeneficiaries: z.ZodOptional<z.ZodNumber>;
    maxSessions: z.ZodOptional<z.ZodNumber>;
    budgetAllocated: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodString>;
    committedSeats: z.ZodOptional<z.ZodNumber>;
    seatPricePerMonth: z.ZodOptional<z.ZodNumber>;
    creditAllocation: z.ZodOptional<z.ZodNumber>;
    creditConsumptionRate: z.ZodOptional<z.ZodNumber>;
    iaasMetrics: z.ZodOptional<z.ZodObject<{
        learnersCommitted: z.ZodNumber;
        pricePerLearner: z.ZodNumber;
        outcomesGuaranteed: z.ZodArray<z.ZodString, "many">;
        outcomeThresholds: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    }, {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    }>>;
    bundleAllocationPercentage: z.ZodOptional<z.ZodNumber>;
    customPricingTerms: z.ZodOptional<z.ZodObject<{
        description: z.ZodOptional<z.ZodString>;
        fixedFee: z.ZodOptional<z.ZodNumber>;
        variableComponents: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            unit: z.ZodString;
            rate: z.ZodNumber;
            cap: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }, {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }>, "many">>;
        milestonePayments: z.ZodOptional<z.ZodArray<z.ZodObject<{
            milestone: z.ZodString;
            amount: z.ZodNumber;
            dueDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }, {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    }, {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    }>>;
    configOverrides: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    internalNotes: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    isArchived: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    budgetAllocated?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    name?: string | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    targetVolunteers?: number | undefined;
    targetBeneficiaries?: number | undefined;
    currency?: string | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    maxSessions?: number | undefined;
    committedSeats?: number | undefined;
    seatPricePerMonth?: number | undefined;
    creditAllocation?: number | undefined;
    creditConsumptionRate?: number | undefined;
    iaasMetrics?: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | undefined;
    bundleAllocationPercentage?: number | undefined;
    customPricingTerms?: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | undefined;
    configOverrides?: Record<string, any> | undefined;
    internalNotes?: string | undefined;
    isArchived?: boolean | undefined;
}, {
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    budgetAllocated?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    name?: string | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    targetVolunteers?: number | undefined;
    targetBeneficiaries?: number | undefined;
    currency?: string | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    maxSessions?: number | undefined;
    committedSeats?: number | undefined;
    seatPricePerMonth?: number | undefined;
    creditAllocation?: number | undefined;
    creditConsumptionRate?: number | undefined;
    iaasMetrics?: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | undefined;
    bundleAllocationPercentage?: number | undefined;
    customPricingTerms?: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | undefined;
    configOverrides?: Record<string, any> | undefined;
    internalNotes?: string | undefined;
    isArchived?: boolean | undefined;
}>, {
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    budgetAllocated?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    name?: string | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    targetVolunteers?: number | undefined;
    targetBeneficiaries?: number | undefined;
    currency?: string | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    maxSessions?: number | undefined;
    committedSeats?: number | undefined;
    seatPricePerMonth?: number | undefined;
    creditAllocation?: number | undefined;
    creditConsumptionRate?: number | undefined;
    iaasMetrics?: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | undefined;
    bundleAllocationPercentage?: number | undefined;
    customPricingTerms?: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | undefined;
    configOverrides?: Record<string, any> | undefined;
    internalNotes?: string | undefined;
    isArchived?: boolean | undefined;
}, {
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    budgetAllocated?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    name?: string | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    targetVolunteers?: number | undefined;
    targetBeneficiaries?: number | undefined;
    currency?: string | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    maxSessions?: number | undefined;
    committedSeats?: number | undefined;
    seatPricePerMonth?: number | undefined;
    creditAllocation?: number | undefined;
    creditConsumptionRate?: number | undefined;
    iaasMetrics?: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | undefined;
    bundleAllocationPercentage?: number | undefined;
    customPricingTerms?: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | undefined;
    configOverrides?: Record<string, any> | undefined;
    internalNotes?: string | undefined;
    isArchived?: boolean | undefined;
}>;
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>;
/**
 * Filter/search campaigns
 */
export declare const FilterCampaignsSchema: z.ZodObject<{
    companyId: z.ZodOptional<z.ZodString>;
    programTemplateId: z.ZodOptional<z.ZodString>;
    beneficiaryGroupId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["draft", "planned", "recruiting", "active", "paused", "completed", "closed"]>>;
    statuses: z.ZodOptional<z.ZodArray<z.ZodEnum<["draft", "planned", "recruiting", "active", "paused", "completed", "closed"]>, "many">>;
    priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "critical"]>>;
    pricingModel: z.ZodOptional<z.ZodEnum<["seats", "credits", "bundle", "iaas", "custom"]>>;
    l2iSubscriptionId: z.ZodOptional<z.ZodString>;
    startDateFrom: z.ZodOptional<z.ZodString>;
    startDateTo: z.ZodOptional<z.ZodString>;
    endDateFrom: z.ZodOptional<z.ZodString>;
    endDateTo: z.ZodOptional<z.ZodString>;
    quarter: z.ZodOptional<z.ZodString>;
    isNearCapacity: z.ZodOptional<z.ZodBoolean>;
    isOverCapacity: z.ZodOptional<z.ZodBoolean>;
    isHighValue: z.ZodOptional<z.ZodBoolean>;
    minUpsellScore: z.ZodOptional<z.ZodNumber>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    isArchived: z.ZodOptional<z.ZodBoolean>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    search: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodEnum<["name", "startDate", "endDate", "status", "capacityUtilization", "upsellOpportunityScore", "createdAt"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    sortOrder: "asc" | "desc";
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    programTemplateId?: string | undefined;
    beneficiaryGroupId?: string | undefined;
    companyId?: string | undefined;
    sortBy?: "status" | "createdAt" | "startDate" | "endDate" | "name" | "capacityUtilization" | "upsellOpportunityScore" | undefined;
    statuses?: ("draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed")[] | undefined;
    startDateFrom?: string | undefined;
    startDateTo?: string | undefined;
    endDateFrom?: string | undefined;
    endDateTo?: string | undefined;
    search?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    pricingModel?: "custom" | "seats" | "credits" | "bundle" | "iaas" | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    l2iSubscriptionId?: string | undefined;
    isArchived?: boolean | undefined;
    isNearCapacity?: boolean | undefined;
    isOverCapacity?: boolean | undefined;
    isHighValue?: boolean | undefined;
    minUpsellScore?: number | undefined;
}, {
    status?: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed" | undefined;
    programTemplateId?: string | undefined;
    beneficiaryGroupId?: string | undefined;
    companyId?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    sortBy?: "status" | "createdAt" | "startDate" | "endDate" | "name" | "capacityUtilization" | "upsellOpportunityScore" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    statuses?: ("draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed")[] | undefined;
    startDateFrom?: string | undefined;
    startDateTo?: string | undefined;
    endDateFrom?: string | undefined;
    endDateTo?: string | undefined;
    search?: string | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    pricingModel?: "custom" | "seats" | "credits" | "bundle" | "iaas" | undefined;
    quarter?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    l2iSubscriptionId?: string | undefined;
    isArchived?: boolean | undefined;
    isNearCapacity?: boolean | undefined;
    isOverCapacity?: boolean | undefined;
    isHighValue?: boolean | undefined;
    minUpsellScore?: number | undefined;
}>;
export type FilterCampaignsInput = z.infer<typeof FilterCampaignsSchema>;
/**
 * Campaign response (from database)
 */
export declare const CampaignSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    companyId: z.ZodString;
    programTemplateId: z.ZodString;
    beneficiaryGroupId: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    quarter: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["draft", "planned", "recruiting", "active", "paused", "completed", "closed"]>;
    priority: z.ZodEnum<["low", "medium", "high", "critical"]>;
    targetVolunteers: z.ZodNumber;
    currentVolunteers: z.ZodNumber;
    targetBeneficiaries: z.ZodNumber;
    currentBeneficiaries: z.ZodNumber;
    maxSessions: z.ZodNullable<z.ZodNumber>;
    currentSessions: z.ZodNumber;
    budgetAllocated: z.ZodString;
    budgetSpent: z.ZodString;
    currency: z.ZodString;
    pricingModel: z.ZodEnum<["seats", "credits", "bundle", "iaas", "custom"]>;
    committedSeats: z.ZodNullable<z.ZodNumber>;
    seatPricePerMonth: z.ZodNullable<z.ZodString>;
    creditAllocation: z.ZodNullable<z.ZodNumber>;
    creditConsumptionRate: z.ZodNullable<z.ZodString>;
    creditsRemaining: z.ZodNullable<z.ZodNumber>;
    iaasMetrics: z.ZodNullable<z.ZodObject<{
        learnersCommitted: z.ZodNumber;
        pricePerLearner: z.ZodNumber;
        outcomesGuaranteed: z.ZodArray<z.ZodString, "many">;
        outcomeThresholds: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    }, {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    }>>;
    l2iSubscriptionId: z.ZodNullable<z.ZodString>;
    bundleAllocationPercentage: z.ZodNullable<z.ZodString>;
    customPricingTerms: z.ZodNullable<z.ZodObject<{
        description: z.ZodOptional<z.ZodString>;
        fixedFee: z.ZodOptional<z.ZodNumber>;
        variableComponents: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            unit: z.ZodString;
            rate: z.ZodNumber;
            cap: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }, {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }>, "many">>;
        milestonePayments: z.ZodOptional<z.ZodArray<z.ZodObject<{
            milestone: z.ZodString;
            amount: z.ZodNumber;
            dueDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }, {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    }, {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    }>>;
    configOverrides: z.ZodRecord<z.ZodString, z.ZodAny>;
    cumulativeSROI: z.ZodNullable<z.ZodString>;
    averageVIS: z.ZodNullable<z.ZodString>;
    totalHoursLogged: z.ZodString;
    totalSessionsCompleted: z.ZodNumber;
    capacityUtilization: z.ZodString;
    isNearCapacity: z.ZodBoolean;
    isOverCapacity: z.ZodBoolean;
    isHighValue: z.ZodBoolean;
    upsellOpportunityScore: z.ZodNumber;
    evidenceSnippetIds: z.ZodArray<z.ZodString, "many">;
    tags: z.ZodArray<z.ZodString, "many">;
    internalNotes: z.ZodNullable<z.ZodString>;
    isActive: z.ZodBoolean;
    isArchived: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    lastMetricsUpdateAt: z.ZodNullable<z.ZodString>;
    createdBy: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    budgetAllocated: string;
    budgetSpent: string;
    totalHoursLogged: string;
    totalSessionsCompleted: number;
    createdAt: string;
    id: string;
    startDate: string;
    endDate: string;
    name: string;
    updatedAt: string;
    description: string | null;
    isActive: boolean;
    tags: string[];
    createdBy: string | null;
    targetVolunteers: number;
    targetBeneficiaries: number;
    currency: string;
    pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
    quarter: string | null;
    priority: "low" | "medium" | "high" | "critical";
    maxSessions: number | null;
    committedSeats: number | null;
    seatPricePerMonth: string | null;
    creditAllocation: number | null;
    creditConsumptionRate: string | null;
    iaasMetrics: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | null;
    l2iSubscriptionId: string | null;
    bundleAllocationPercentage: string | null;
    customPricingTerms: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | null;
    configOverrides: Record<string, any>;
    internalNotes: string | null;
    isArchived: boolean;
    isNearCapacity: boolean;
    isOverCapacity: boolean;
    isHighValue: boolean;
    capacityUtilization: string;
    upsellOpportunityScore: number;
    currentVolunteers: number;
    currentBeneficiaries: number;
    currentSessions: number;
    creditsRemaining: number | null;
    cumulativeSROI: string | null;
    averageVIS: string | null;
    evidenceSnippetIds: string[];
    lastMetricsUpdateAt: string | null;
}, {
    status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;
    budgetAllocated: string;
    budgetSpent: string;
    totalHoursLogged: string;
    totalSessionsCompleted: number;
    createdAt: string;
    id: string;
    startDate: string;
    endDate: string;
    name: string;
    updatedAt: string;
    description: string | null;
    isActive: boolean;
    tags: string[];
    createdBy: string | null;
    targetVolunteers: number;
    targetBeneficiaries: number;
    currency: string;
    pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
    quarter: string | null;
    priority: "low" | "medium" | "high" | "critical";
    maxSessions: number | null;
    committedSeats: number | null;
    seatPricePerMonth: string | null;
    creditAllocation: number | null;
    creditConsumptionRate: string | null;
    iaasMetrics: {
        learnersCommitted: number;
        pricePerLearner: number;
        outcomesGuaranteed: string[];
        outcomeThresholds?: Record<string, number> | undefined;
    } | null;
    l2iSubscriptionId: string | null;
    bundleAllocationPercentage: string | null;
    customPricingTerms: {
        description?: string | undefined;
        fixedFee?: number | undefined;
        variableComponents?: {
            unit: string;
            name: string;
            rate: number;
            cap?: number | undefined;
        }[] | undefined;
        milestonePayments?: {
            milestone: string;
            amount: number;
            dueDate?: string | undefined;
        }[] | undefined;
    } | null;
    configOverrides: Record<string, any>;
    internalNotes: string | null;
    isArchived: boolean;
    isNearCapacity: boolean;
    isOverCapacity: boolean;
    isHighValue: boolean;
    capacityUtilization: string;
    upsellOpportunityScore: number;
    currentVolunteers: number;
    currentBeneficiaries: number;
    currentSessions: number;
    creditsRemaining: number | null;
    cumulativeSROI: string | null;
    averageVIS: string | null;
    evidenceSnippetIds: string[];
    lastMetricsUpdateAt: string | null;
}>;
export type Campaign = z.infer<typeof CampaignSchema>;
/**
 * Paginated response
 */
export declare const CampaignsResponseSchema: z.ZodObject<{
    campaigns: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        companyId: z.ZodString;
        programTemplateId: z.ZodString;
        beneficiaryGroupId: z.ZodString;
        startDate: z.ZodString;
        endDate: z.ZodString;
        quarter: z.ZodNullable<z.ZodString>;
        status: z.ZodEnum<["draft", "planned", "recruiting", "active", "paused", "completed", "closed"]>;
        priority: z.ZodEnum<["low", "medium", "high", "critical"]>;
        targetVolunteers: z.ZodNumber;
        currentVolunteers: z.ZodNumber;
        targetBeneficiaries: z.ZodNumber;
        currentBeneficiaries: z.ZodNumber;
        maxSessions: z.ZodNullable<z.ZodNumber>;
        currentSessions: z.ZodNumber;
        budgetAllocated: z.ZodString;
        budgetSpent: z.ZodString;
        currency: z.ZodString;
        pricingModel: z.ZodEnum<["seats", "credits", "bundle", "iaas", "custom"]>;
        committedSeats: z.ZodNullable<z.ZodNumber>;
        seatPricePerMonth: z.ZodNullable<z.ZodString>;
        creditAllocation: z.ZodNullable<z.ZodNumber>;
        creditConsumptionRate: z.ZodNullable<z.ZodString>;
        creditsRemaining: z.ZodNullable<z.ZodNumber>;
        iaasMetrics: z.ZodNullable<z.ZodObject<{
            learnersCommitted: z.ZodNumber;
            pricePerLearner: z.ZodNumber;
            outcomesGuaranteed: z.ZodArray<z.ZodString, "many">;
            outcomeThresholds: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        }, "strip", z.ZodTypeAny, {
            learnersCommitted: number;
            pricePerLearner: number;
            outcomesGuaranteed: string[];
            outcomeThresholds?: Record<string, number> | undefined;
        }, {
            learnersCommitted: number;
            pricePerLearner: number;
            outcomesGuaranteed: string[];
            outcomeThresholds?: Record<string, number> | undefined;
        }>>;
        l2iSubscriptionId: z.ZodNullable<z.ZodString>;
        bundleAllocationPercentage: z.ZodNullable<z.ZodString>;
        customPricingTerms: z.ZodNullable<z.ZodObject<{
            description: z.ZodOptional<z.ZodString>;
            fixedFee: z.ZodOptional<z.ZodNumber>;
            variableComponents: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                unit: z.ZodString;
                rate: z.ZodNumber;
                cap: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                unit: string;
                name: string;
                rate: number;
                cap?: number | undefined;
            }, {
                unit: string;
                name: string;
                rate: number;
                cap?: number | undefined;
            }>, "many">>;
            milestonePayments: z.ZodOptional<z.ZodArray<z.ZodObject<{
                milestone: z.ZodString;
                amount: z.ZodNumber;
                dueDate: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                milestone: string;
                amount: number;
                dueDate?: string | undefined;
            }, {
                milestone: string;
                amount: number;
                dueDate?: string | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            description?: string | undefined;
            fixedFee?: number | undefined;
            variableComponents?: {
                unit: string;
                name: string;
                rate: number;
                cap?: number | undefined;
            }[] | undefined;
            milestonePayments?: {
                milestone: string;
                amount: number;
                dueDate?: string | undefined;
            }[] | undefined;
        }, {
            description?: string | undefined;
            fixedFee?: number | undefined;
            variableComponents?: {
                unit: string;
                name: string;
                rate: number;
                cap?: number | undefined;
            }[] | undefined;
            milestonePayments?: {
                milestone: string;
                amount: number;
                dueDate?: string | undefined;
            }[] | undefined;
        }>>;
        configOverrides: z.ZodRecord<z.ZodString, z.ZodAny>;
        cumulativeSROI: z.ZodNullable<z.ZodString>;
        averageVIS: z.ZodNullable<z.ZodString>;
        totalHoursLogged: z.ZodString;
        totalSessionsCompleted: z.ZodNumber;
        capacityUtilization: z.ZodString;
        isNearCapacity: z.ZodBoolean;
        isOverCapacity: z.ZodBoolean;
        isHighValue: z.ZodBoolean;
        upsellOpportunityScore: z.ZodNumber;
        evidenceSnippetIds: z.ZodArray<z.ZodString, "many">;
        tags: z.ZodArray<z.ZodString, "many">;
        internalNotes: z.ZodNullable<z.ZodString>;
        isActive: z.ZodBoolean;
        isArchived: z.ZodBoolean;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        lastMetricsUpdateAt: z.ZodNullable<z.ZodString>;
        createdBy: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        budgetAllocated: string;
        budgetSpent: string;
        totalHoursLogged: string;
        totalSessionsCompleted: number;
        createdAt: string;
        id: string;
        startDate: string;
        endDate: string;
        name: string;
        updatedAt: string;
        description: string | null;
        isActive: boolean;
        tags: string[];
        createdBy: string | null;
        targetVolunteers: number;
        targetBeneficiaries: number;
        currency: string;
        pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
        quarter: string | null;
        priority: "low" | "medium" | "high" | "critical";
        maxSessions: number | null;
        committedSeats: number | null;
        seatPricePerMonth: string | null;
        creditAllocation: number | null;
        creditConsumptionRate: string | null;
        iaasMetrics: {
            learnersCommitted: number;
            pricePerLearner: number;
            outcomesGuaranteed: string[];
            outcomeThresholds?: Record<string, number> | undefined;
        } | null;
        l2iSubscriptionId: string | null;
        bundleAllocationPercentage: string | null;
        customPricingTerms: {
            description?: string | undefined;
            fixedFee?: number | undefined;
            variableComponents?: {
                unit: string;
                name: string;
                rate: number;
                cap?: number | undefined;
            }[] | undefined;
            milestonePayments?: {
                milestone: string;
                amount: number;
                dueDate?: string | undefined;
            }[] | undefined;
        } | null;
        configOverrides: Record<string, any>;
        internalNotes: string | null;
        isArchived: boolean;
        isNearCapacity: boolean;
        isOverCapacity: boolean;
        isHighValue: boolean;
        capacityUtilization: string;
        upsellOpportunityScore: number;
        currentVolunteers: number;
        currentBeneficiaries: number;
        currentSessions: number;
        creditsRemaining: number | null;
        cumulativeSROI: string | null;
        averageVIS: string | null;
        evidenceSnippetIds: string[];
        lastMetricsUpdateAt: string | null;
    }, {
        status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        budgetAllocated: string;
        budgetSpent: string;
        totalHoursLogged: string;
        totalSessionsCompleted: number;
        createdAt: string;
        id: string;
        startDate: string;
        endDate: string;
        name: string;
        updatedAt: string;
        description: string | null;
        isActive: boolean;
        tags: string[];
        createdBy: string | null;
        targetVolunteers: number;
        targetBeneficiaries: number;
        currency: string;
        pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
        quarter: string | null;
        priority: "low" | "medium" | "high" | "critical";
        maxSessions: number | null;
        committedSeats: number | null;
        seatPricePerMonth: string | null;
        creditAllocation: number | null;
        creditConsumptionRate: string | null;
        iaasMetrics: {
            learnersCommitted: number;
            pricePerLearner: number;
            outcomesGuaranteed: string[];
            outcomeThresholds?: Record<string, number> | undefined;
        } | null;
        l2iSubscriptionId: string | null;
        bundleAllocationPercentage: string | null;
        customPricingTerms: {
            description?: string | undefined;
            fixedFee?: number | undefined;
            variableComponents?: {
                unit: string;
                name: string;
                rate: number;
                cap?: number | undefined;
            }[] | undefined;
            milestonePayments?: {
                milestone: string;
                amount: number;
                dueDate?: string | undefined;
            }[] | undefined;
        } | null;
        configOverrides: Record<string, any>;
        internalNotes: string | null;
        isArchived: boolean;
        isNearCapacity: boolean;
        isOverCapacity: boolean;
        isHighValue: boolean;
        capacityUtilization: string;
        upsellOpportunityScore: number;
        currentVolunteers: number;
        currentBeneficiaries: number;
        currentSessions: number;
        creditsRemaining: number | null;
        cumulativeSROI: string | null;
        averageVIS: string | null;
        evidenceSnippetIds: string[];
        lastMetricsUpdateAt: string | null;
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
    campaigns: {
        status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        budgetAllocated: string;
        budgetSpent: string;
        totalHoursLogged: string;
        totalSessionsCompleted: number;
        createdAt: string;
        id: string;
        startDate: string;
        endDate: string;
        name: string;
        updatedAt: string;
        description: string | null;
        isActive: boolean;
        tags: string[];
        createdBy: string | null;
        targetVolunteers: number;
        targetBeneficiaries: number;
        currency: string;
        pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
        quarter: string | null;
        priority: "low" | "medium" | "high" | "critical";
        maxSessions: number | null;
        committedSeats: number | null;
        seatPricePerMonth: string | null;
        creditAllocation: number | null;
        creditConsumptionRate: string | null;
        iaasMetrics: {
            learnersCommitted: number;
            pricePerLearner: number;
            outcomesGuaranteed: string[];
            outcomeThresholds?: Record<string, number> | undefined;
        } | null;
        l2iSubscriptionId: string | null;
        bundleAllocationPercentage: string | null;
        customPricingTerms: {
            description?: string | undefined;
            fixedFee?: number | undefined;
            variableComponents?: {
                unit: string;
                name: string;
                rate: number;
                cap?: number | undefined;
            }[] | undefined;
            milestonePayments?: {
                milestone: string;
                amount: number;
                dueDate?: string | undefined;
            }[] | undefined;
        } | null;
        configOverrides: Record<string, any>;
        internalNotes: string | null;
        isArchived: boolean;
        isNearCapacity: boolean;
        isOverCapacity: boolean;
        isHighValue: boolean;
        capacityUtilization: string;
        upsellOpportunityScore: number;
        currentVolunteers: number;
        currentBeneficiaries: number;
        currentSessions: number;
        creditsRemaining: number | null;
        cumulativeSROI: string | null;
        averageVIS: string | null;
        evidenceSnippetIds: string[];
        lastMetricsUpdateAt: string | null;
    }[];
}, {
    pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    };
    campaigns: {
        status: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
        programTemplateId: string;
        beneficiaryGroupId: string;
        companyId: string;
        budgetAllocated: string;
        budgetSpent: string;
        totalHoursLogged: string;
        totalSessionsCompleted: number;
        createdAt: string;
        id: string;
        startDate: string;
        endDate: string;
        name: string;
        updatedAt: string;
        description: string | null;
        isActive: boolean;
        tags: string[];
        createdBy: string | null;
        targetVolunteers: number;
        targetBeneficiaries: number;
        currency: string;
        pricingModel: "custom" | "seats" | "credits" | "bundle" | "iaas";
        quarter: string | null;
        priority: "low" | "medium" | "high" | "critical";
        maxSessions: number | null;
        committedSeats: number | null;
        seatPricePerMonth: string | null;
        creditAllocation: number | null;
        creditConsumptionRate: string | null;
        iaasMetrics: {
            learnersCommitted: number;
            pricePerLearner: number;
            outcomesGuaranteed: string[];
            outcomeThresholds?: Record<string, number> | undefined;
        } | null;
        l2iSubscriptionId: string | null;
        bundleAllocationPercentage: string | null;
        customPricingTerms: {
            description?: string | undefined;
            fixedFee?: number | undefined;
            variableComponents?: {
                unit: string;
                name: string;
                rate: number;
                cap?: number | undefined;
            }[] | undefined;
            milestonePayments?: {
                milestone: string;
                amount: number;
                dueDate?: string | undefined;
            }[] | undefined;
        } | null;
        configOverrides: Record<string, any>;
        internalNotes: string | null;
        isArchived: boolean;
        isNearCapacity: boolean;
        isOverCapacity: boolean;
        isHighValue: boolean;
        capacityUtilization: string;
        upsellOpportunityScore: number;
        currentVolunteers: number;
        currentBeneficiaries: number;
        currentSessions: number;
        creditsRemaining: number | null;
        cumulativeSROI: string | null;
        averageVIS: string | null;
        evidenceSnippetIds: string[];
        lastMetricsUpdateAt: string | null;
    }[];
}>;
export type CampaignsResponse = z.infer<typeof CampaignsResponseSchema>;
/**
 * Check if campaign uses seats pricing
 */
export declare function isSeatsPricing(campaign: Campaign): boolean;
/**
 * Check if campaign uses credits pricing
 */
export declare function isCreditsPricing(campaign: Campaign): boolean;
/**
 * Check if campaign uses bundle pricing
 */
export declare function isBundlePricing(campaign: Campaign): boolean;
/**
 * Check if campaign uses IAAS pricing
 */
export declare function isIAASPricing(campaign: Campaign): boolean;
/**
 * Check if campaign uses custom pricing
 */
export declare function isCustomPricing(campaign: Campaign): boolean;
/**
 * Check if campaign is active
 */
export declare function isCampaignActive(campaign: Campaign): boolean;
/**
 * Check if campaign is completed
 */
export declare function isCampaignCompleted(campaign: Campaign): boolean;
/**
 * Check if campaign can be started
 */
export declare function canStartCampaign(campaign: Campaign): boolean;
/**
 * Check if campaign can be paused
 */
export declare function canPauseCampaign(campaign: Campaign): boolean;
/**
 * Check if campaign can be resumed
 */
export declare function canResumeCampaign(campaign: Campaign): boolean;
/**
 * Check if campaign is near capacity
 */
export declare function isCampaignNearCapacity(campaign: Campaign, threshold?: number): boolean;
/**
 * Check if campaign is over capacity
 */
export declare function isCampaignOverCapacity(campaign: Campaign): boolean;
/**
 * Check if campaign has budget remaining
 */
export declare function hasBudgetRemaining(campaign: Campaign): boolean;
/**
 * Check if campaign is within date range
 */
export declare function isCampaignInDateRange(campaign: Campaign, date?: Date): boolean;
/**
 * Summary type for list views
 */
export type CampaignSummary = Pick<Campaign, 'id' | 'name' | 'status' | 'priority' | 'pricingModel' | 'startDate' | 'endDate' | 'capacityUtilization' | 'isNearCapacity' | 'isOverCapacity' | 'tags' | 'companyId'>;
/**
 * Capacity metrics
 */
export interface CampaignCapacityMetrics {
    volunteers: {
        target: number;
        current: number;
        utilization: number;
    };
    beneficiaries: {
        target: number;
        current: number;
        utilization: number;
    };
    sessions: {
        target: number | null;
        current: number;
        utilization: number | null;
    };
    budget: {
        allocated: number;
        spent: number;
        remaining: number;
        utilization: number;
    };
}
/**
 * Impact metrics
 */
export interface CampaignImpactMetrics {
    sroi: number | null;
    vis: number | null;
    totalHours: number;
    totalSessions: number;
    evidenceCount: number;
}
/**
 * State transition input
 */
export declare const CampaignStateTransitionSchema: z.ZodObject<{
    targetStatus: z.ZodEnum<["draft", "planned", "recruiting", "active", "paused", "completed", "closed"]>;
    reason: z.ZodOptional<z.ZodString>;
    effectiveDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    targetStatus: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
    reason?: string | undefined;
    effectiveDate?: string | undefined;
}, {
    targetStatus: "draft" | "planned" | "recruiting" | "active" | "paused" | "completed" | "closed";
    reason?: string | undefined;
    effectiveDate?: string | undefined;
}>;
export type CampaignStateTransition = z.infer<typeof CampaignStateTransitionSchema>;
//# sourceMappingURL=campaigns.d.ts.map