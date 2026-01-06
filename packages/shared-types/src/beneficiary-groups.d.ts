import { z } from 'zod';
/**
 * Beneficiary Groups Types & Validation
 *
 * SWARM 6: Beneficiary Groups, Campaigns & Monetization
 * Privacy-first design for GDPR compliance
 *
 * @see /docs/BENEFICIARY_GROUPS_PRIVACY.md
 * @see /packages/shared-schema/src/schema/beneficiary-groups.ts
 */
export declare const BeneficiaryGroupTypeEnum: z.ZodEnum<["refugees", "migrants", "asylum_seekers", "women_in_tech", "youth", "seniors", "displaced_persons", "newcomers", "students", "job_seekers", "caregivers", "veterans", "other"]>;
export declare const GenderFocusEnum: z.ZodEnum<["all", "women", "men", "non_binary", "mixed"]>;
export declare const LanguageRequirementEnum: z.ZodEnum<["fluent", "conversational", "beginner", "any", "none_required"]>;
export declare const LegalStatusCategoryEnum: z.ZodEnum<["refugee", "asylum_seeker", "migrant", "citizen", "student", "other"]>;
export declare const EligibleProgramTypeEnum: z.ZodEnum<["mentorship", "language", "buddy", "upskilling", "weei"]>;
export type BeneficiaryGroupType = z.infer<typeof BeneficiaryGroupTypeEnum>;
export type GenderFocus = z.infer<typeof GenderFocusEnum>;
export type LanguageRequirement = z.infer<typeof LanguageRequirementEnum>;
export type LegalStatusCategory = z.infer<typeof LegalStatusCategoryEnum>;
export type EligibleProgramType = z.infer<typeof EligibleProgramTypeEnum>;
/**
 * Age range specification (aggregated, not individual birthdates)
 * PRIVACY: Ranges only, never specific ages or dates of birth
 */
export declare const AgeRangeSchema: z.ZodEffects<z.ZodObject<{
    min: z.ZodNumber;
    max: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    min: number;
    max: number;
}, {
    min: number;
    max: number;
}>, {
    min: number;
    max: number;
}, {
    min: number;
    max: number;
}>;
export type AgeRange = z.infer<typeof AgeRangeSchema>;
/**
 * Eligibility rules framework (JSONB - flexible for complex logic)
 * Defines who qualifies for this group WITHOUT storing individual PII
 */
export declare const EligibilityRulesSchema: z.ZodOptional<z.ZodObject<{
    employmentStatus: z.ZodOptional<z.ZodArray<z.ZodEnum<["employed", "unemployed", "student", "any"]>, "many">>;
    educationLevel: z.ZodOptional<z.ZodArray<z.ZodEnum<["primary", "secondary", "tertiary", "postgraduate", "any"]>, "many">>;
    residencyMonths: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        min: z.ZodOptional<z.ZodNumber>;
        max: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        min?: number | undefined;
        max?: number | undefined;
    }, {
        min?: number | undefined;
        max?: number | undefined;
    }>, {
        min?: number | undefined;
        max?: number | undefined;
    }, {
        min?: number | undefined;
        max?: number | undefined;
    }>>;
    requiredSkills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    excludedSkills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    customCriteria: z.ZodOptional<z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        validationLogic: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        validationLogic?: string | undefined;
    }, {
        description: string;
        validationLogic?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
    educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
    residencyMonths?: {
        min?: number | undefined;
        max?: number | undefined;
    } | undefined;
    requiredSkills?: string[] | undefined;
    excludedSkills?: string[] | undefined;
    customCriteria?: {
        description: string;
        validationLogic?: string | undefined;
    }[] | undefined;
}, {
    employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
    educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
    residencyMonths?: {
        min?: number | undefined;
        max?: number | undefined;
    } | undefined;
    requiredSkills?: string[] | undefined;
    excludedSkills?: string[] | undefined;
    customCriteria?: {
        description: string;
        validationLogic?: string | undefined;
    }[] | undefined;
}>>;
export type EligibilityRules = z.infer<typeof EligibilityRulesSchema>;
/**
 * Create beneficiary group request
 * Enforces strict validation and privacy boundaries
 */
export declare const CreateBeneficiaryGroupSchema: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodObject<{
    name: z.ZodEffects<z.ZodString, string, string>;
    groupType: z.ZodEnum<["refugees", "migrants", "asylum_seekers", "women_in_tech", "youth", "seniors", "displaced_persons", "newcomers", "students", "job_seekers", "caregivers", "veterans", "other"]>;
    countryCode: z.ZodString;
    primaryLanguages: z.ZodArray<z.ZodString, "many">;
    eligibleProgramTypes: z.ZodArray<z.ZodEnum<["mentorship", "language", "buddy", "upskilling", "weei"]>, "many">;
    description: z.ZodOptional<z.ZodString>;
    region: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    ageRange: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        min: number;
        max: number;
    }, {
        min: number;
        max: number;
    }>, {
        min: number;
        max: number;
    }, {
        min: number;
        max: number;
    }>>;
    genderFocus: z.ZodOptional<z.ZodEnum<["all", "women", "men", "non_binary", "mixed"]>>;
    languageRequirement: z.ZodOptional<z.ZodEnum<["fluent", "conversational", "beginner", "any", "none_required"]>>;
    legalStatusCategories: z.ZodOptional<z.ZodArray<z.ZodEnum<["refugee", "asylum_seeker", "migrant", "citizen", "student", "other"]>, "many">>;
    eligibilityRules: z.ZodOptional<z.ZodObject<{
        employmentStatus: z.ZodOptional<z.ZodArray<z.ZodEnum<["employed", "unemployed", "student", "any"]>, "many">>;
        educationLevel: z.ZodOptional<z.ZodArray<z.ZodEnum<["primary", "secondary", "tertiary", "postgraduate", "any"]>, "many">>;
        residencyMonths: z.ZodOptional<z.ZodEffects<z.ZodObject<{
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            min?: number | undefined;
            max?: number | undefined;
        }, {
            min?: number | undefined;
            max?: number | undefined;
        }>, {
            min?: number | undefined;
            max?: number | undefined;
        }, {
            min?: number | undefined;
            max?: number | undefined;
        }>>;
        requiredSkills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        excludedSkills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        customCriteria: z.ZodOptional<z.ZodArray<z.ZodObject<{
            description: z.ZodString;
            validationLogic: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            description: string;
            validationLogic?: string | undefined;
        }, {
            description: string;
            validationLogic?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    }, {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    }>>;
    minGroupSize: z.ZodOptional<z.ZodNumber>;
    maxGroupSize: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    partnerOrganizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    internalNotes: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    isPublic: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    groupType: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans";
    countryCode: string;
    primaryLanguages: string[];
    eligibleProgramTypes: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[];
    partnerOrganizations?: string[] | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
    internalNotes?: string | undefined;
    region?: string | undefined;
    city?: string | undefined;
    ageRange?: {
        min: number;
        max: number;
    } | undefined;
    genderFocus?: "mixed" | "all" | "women" | "men" | "non_binary" | undefined;
    languageRequirement?: "beginner" | "fluent" | "conversational" | "any" | "none_required" | undefined;
    legalStatusCategories?: ("other" | "refugee" | "asylum_seeker" | "migrant" | "citizen" | "student")[] | undefined;
    eligibilityRules?: {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    } | undefined;
    minGroupSize?: number | undefined;
    maxGroupSize?: number | undefined;
}, {
    name: string;
    groupType: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans";
    countryCode: string;
    primaryLanguages: string[];
    eligibleProgramTypes: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[];
    partnerOrganizations?: string[] | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
    internalNotes?: string | undefined;
    region?: string | undefined;
    city?: string | undefined;
    ageRange?: {
        min: number;
        max: number;
    } | undefined;
    genderFocus?: "mixed" | "all" | "women" | "men" | "non_binary" | undefined;
    languageRequirement?: "beginner" | "fluent" | "conversational" | "any" | "none_required" | undefined;
    legalStatusCategories?: ("other" | "refugee" | "asylum_seeker" | "migrant" | "citizen" | "student")[] | undefined;
    eligibilityRules?: {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    } | undefined;
    minGroupSize?: number | undefined;
    maxGroupSize?: number | undefined;
}>, {
    name: string;
    groupType: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans";
    countryCode: string;
    primaryLanguages: string[];
    eligibleProgramTypes: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[];
    partnerOrganizations?: string[] | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
    internalNotes?: string | undefined;
    region?: string | undefined;
    city?: string | undefined;
    ageRange?: {
        min: number;
        max: number;
    } | undefined;
    genderFocus?: "mixed" | "all" | "women" | "men" | "non_binary" | undefined;
    languageRequirement?: "beginner" | "fluent" | "conversational" | "any" | "none_required" | undefined;
    legalStatusCategories?: ("other" | "refugee" | "asylum_seeker" | "migrant" | "citizen" | "student")[] | undefined;
    eligibilityRules?: {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    } | undefined;
    minGroupSize?: number | undefined;
    maxGroupSize?: number | undefined;
}, {
    name: string;
    groupType: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans";
    countryCode: string;
    primaryLanguages: string[];
    eligibleProgramTypes: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[];
    partnerOrganizations?: string[] | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
    internalNotes?: string | undefined;
    region?: string | undefined;
    city?: string | undefined;
    ageRange?: {
        min: number;
        max: number;
    } | undefined;
    genderFocus?: "mixed" | "all" | "women" | "men" | "non_binary" | undefined;
    languageRequirement?: "beginner" | "fluent" | "conversational" | "any" | "none_required" | undefined;
    legalStatusCategories?: ("other" | "refugee" | "asylum_seeker" | "migrant" | "citizen" | "student")[] | undefined;
    eligibilityRules?: {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    } | undefined;
    minGroupSize?: number | undefined;
    maxGroupSize?: number | undefined;
}>, {
    name: string;
    groupType: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans";
    countryCode: string;
    primaryLanguages: string[];
    eligibleProgramTypes: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[];
    partnerOrganizations?: string[] | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
    internalNotes?: string | undefined;
    region?: string | undefined;
    city?: string | undefined;
    ageRange?: {
        min: number;
        max: number;
    } | undefined;
    genderFocus?: "mixed" | "all" | "women" | "men" | "non_binary" | undefined;
    languageRequirement?: "beginner" | "fluent" | "conversational" | "any" | "none_required" | undefined;
    legalStatusCategories?: ("other" | "refugee" | "asylum_seeker" | "migrant" | "citizen" | "student")[] | undefined;
    eligibilityRules?: {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    } | undefined;
    minGroupSize?: number | undefined;
    maxGroupSize?: number | undefined;
}, {
    name: string;
    groupType: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans";
    countryCode: string;
    primaryLanguages: string[];
    eligibleProgramTypes: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[];
    partnerOrganizations?: string[] | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
    internalNotes?: string | undefined;
    region?: string | undefined;
    city?: string | undefined;
    ageRange?: {
        min: number;
        max: number;
    } | undefined;
    genderFocus?: "mixed" | "all" | "women" | "men" | "non_binary" | undefined;
    languageRequirement?: "beginner" | "fluent" | "conversational" | "any" | "none_required" | undefined;
    legalStatusCategories?: ("other" | "refugee" | "asylum_seeker" | "migrant" | "citizen" | "student")[] | undefined;
    eligibilityRules?: {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    } | undefined;
    minGroupSize?: number | undefined;
    maxGroupSize?: number | undefined;
}>, {
    name: string;
    groupType: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans";
    countryCode: string;
    primaryLanguages: string[];
    eligibleProgramTypes: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[];
    partnerOrganizations?: string[] | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
    internalNotes?: string | undefined;
    region?: string | undefined;
    city?: string | undefined;
    ageRange?: {
        min: number;
        max: number;
    } | undefined;
    genderFocus?: "mixed" | "all" | "women" | "men" | "non_binary" | undefined;
    languageRequirement?: "beginner" | "fluent" | "conversational" | "any" | "none_required" | undefined;
    legalStatusCategories?: ("other" | "refugee" | "asylum_seeker" | "migrant" | "citizen" | "student")[] | undefined;
    eligibilityRules?: {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    } | undefined;
    minGroupSize?: number | undefined;
    maxGroupSize?: number | undefined;
}, {
    name: string;
    groupType: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans";
    countryCode: string;
    primaryLanguages: string[];
    eligibleProgramTypes: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[];
    partnerOrganizations?: string[] | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
    internalNotes?: string | undefined;
    region?: string | undefined;
    city?: string | undefined;
    ageRange?: {
        min: number;
        max: number;
    } | undefined;
    genderFocus?: "mixed" | "all" | "women" | "men" | "non_binary" | undefined;
    languageRequirement?: "beginner" | "fluent" | "conversational" | "any" | "none_required" | undefined;
    legalStatusCategories?: ("other" | "refugee" | "asylum_seeker" | "migrant" | "citizen" | "student")[] | undefined;
    eligibilityRules?: {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    } | undefined;
    minGroupSize?: number | undefined;
    maxGroupSize?: number | undefined;
}>;
export type CreateBeneficiaryGroupInput = z.infer<typeof CreateBeneficiaryGroupSchema>;
/**
 * Update beneficiary group request
 * All fields optional for partial updates
 */
export declare const UpdateBeneficiaryGroupSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    groupType: z.ZodOptional<z.ZodEnum<["refugees", "migrants", "asylum_seekers", "women_in_tech", "youth", "seniors", "displaced_persons", "newcomers", "students", "job_seekers", "caregivers", "veterans", "other"]>>;
    countryCode: z.ZodOptional<z.ZodString>;
    primaryLanguages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    eligibleProgramTypes: z.ZodOptional<z.ZodArray<z.ZodEnum<["mentorship", "language", "buddy", "upskilling", "weei"]>, "many">>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    region: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    city: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    ageRange: z.ZodOptional<z.ZodOptional<z.ZodEffects<z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        min: number;
        max: number;
    }, {
        min: number;
        max: number;
    }>, {
        min: number;
        max: number;
    }, {
        min: number;
        max: number;
    }>>>;
    genderFocus: z.ZodOptional<z.ZodOptional<z.ZodEnum<["all", "women", "men", "non_binary", "mixed"]>>>;
    languageRequirement: z.ZodOptional<z.ZodOptional<z.ZodEnum<["fluent", "conversational", "beginner", "any", "none_required"]>>>;
    legalStatusCategories: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodEnum<["refugee", "asylum_seeker", "migrant", "citizen", "student", "other"]>, "many">>>;
    eligibilityRules: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        employmentStatus: z.ZodOptional<z.ZodArray<z.ZodEnum<["employed", "unemployed", "student", "any"]>, "many">>;
        educationLevel: z.ZodOptional<z.ZodArray<z.ZodEnum<["primary", "secondary", "tertiary", "postgraduate", "any"]>, "many">>;
        residencyMonths: z.ZodOptional<z.ZodEffects<z.ZodObject<{
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            min?: number | undefined;
            max?: number | undefined;
        }, {
            min?: number | undefined;
            max?: number | undefined;
        }>, {
            min?: number | undefined;
            max?: number | undefined;
        }, {
            min?: number | undefined;
            max?: number | undefined;
        }>>;
        requiredSkills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        excludedSkills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        customCriteria: z.ZodOptional<z.ZodArray<z.ZodObject<{
            description: z.ZodString;
            validationLogic: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            description: string;
            validationLogic?: string | undefined;
        }, {
            description: string;
            validationLogic?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    }, {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    }>>>;
    minGroupSize: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    maxGroupSize: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    partnerOrganizations: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    internalNotes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    isActive: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    isPublic: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    partnerOrganizations?: string[] | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
    internalNotes?: string | undefined;
    groupType?: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans" | undefined;
    countryCode?: string | undefined;
    primaryLanguages?: string[] | undefined;
    eligibleProgramTypes?: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[] | undefined;
    region?: string | undefined;
    city?: string | undefined;
    ageRange?: {
        min: number;
        max: number;
    } | undefined;
    genderFocus?: "mixed" | "all" | "women" | "men" | "non_binary" | undefined;
    languageRequirement?: "beginner" | "fluent" | "conversational" | "any" | "none_required" | undefined;
    legalStatusCategories?: ("other" | "refugee" | "asylum_seeker" | "migrant" | "citizen" | "student")[] | undefined;
    eligibilityRules?: {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    } | undefined;
    minGroupSize?: number | undefined;
    maxGroupSize?: number | undefined;
}, {
    name?: string | undefined;
    partnerOrganizations?: string[] | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
    internalNotes?: string | undefined;
    groupType?: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans" | undefined;
    countryCode?: string | undefined;
    primaryLanguages?: string[] | undefined;
    eligibleProgramTypes?: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[] | undefined;
    region?: string | undefined;
    city?: string | undefined;
    ageRange?: {
        min: number;
        max: number;
    } | undefined;
    genderFocus?: "mixed" | "all" | "women" | "men" | "non_binary" | undefined;
    languageRequirement?: "beginner" | "fluent" | "conversational" | "any" | "none_required" | undefined;
    legalStatusCategories?: ("other" | "refugee" | "asylum_seeker" | "migrant" | "citizen" | "student")[] | undefined;
    eligibilityRules?: {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    } | undefined;
    minGroupSize?: number | undefined;
    maxGroupSize?: number | undefined;
}>;
export type UpdateBeneficiaryGroupInput = z.infer<typeof UpdateBeneficiaryGroupSchema>;
/**
 * Filter/search beneficiary groups
 */
export declare const FilterBeneficiaryGroupsSchema: z.ZodObject<{
    groupType: z.ZodOptional<z.ZodEnum<["refugees", "migrants", "asylum_seekers", "women_in_tech", "youth", "seniors", "displaced_persons", "newcomers", "students", "job_seekers", "caregivers", "veterans", "other"]>>;
    countryCode: z.ZodOptional<z.ZodString>;
    region: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    isPublic: z.ZodOptional<z.ZodBoolean>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    eligibleProgramTypes: z.ZodOptional<z.ZodArray<z.ZodEnum<["mentorship", "language", "buddy", "upskilling", "weei"]>, "many">>;
    search: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    search?: string | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
    groupType?: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans" | undefined;
    countryCode?: string | undefined;
    eligibleProgramTypes?: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[] | undefined;
    region?: string | undefined;
    city?: string | undefined;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
    search?: string | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    tags?: string[] | undefined;
    groupType?: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans" | undefined;
    countryCode?: string | undefined;
    eligibleProgramTypes?: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[] | undefined;
    region?: string | undefined;
    city?: string | undefined;
}>;
export type FilterBeneficiaryGroupsInput = z.infer<typeof FilterBeneficiaryGroupsSchema>;
/**
 * Beneficiary group response (from database)
 */
export declare const BeneficiaryGroupSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    groupType: z.ZodEnum<["refugees", "migrants", "asylum_seekers", "women_in_tech", "youth", "seniors", "displaced_persons", "newcomers", "students", "job_seekers", "caregivers", "veterans", "other"]>;
    countryCode: z.ZodString;
    region: z.ZodNullable<z.ZodString>;
    city: z.ZodNullable<z.ZodString>;
    ageRange: z.ZodNullable<z.ZodEffects<z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        min: number;
        max: number;
    }, {
        min: number;
        max: number;
    }>, {
        min: number;
        max: number;
    }, {
        min: number;
        max: number;
    }>>;
    genderFocus: z.ZodEnum<["all", "women", "men", "non_binary", "mixed"]>;
    primaryLanguages: z.ZodArray<z.ZodString, "many">;
    languageRequirement: z.ZodEnum<["fluent", "conversational", "beginner", "any", "none_required"]>;
    legalStatusCategories: z.ZodArray<z.ZodEnum<["refugee", "asylum_seeker", "migrant", "citizen", "student", "other"]>, "many">;
    eligibleProgramTypes: z.ZodArray<z.ZodEnum<["mentorship", "language", "buddy", "upskilling", "weei"]>, "many">;
    eligibilityRules: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        employmentStatus: z.ZodOptional<z.ZodArray<z.ZodEnum<["employed", "unemployed", "student", "any"]>, "many">>;
        educationLevel: z.ZodOptional<z.ZodArray<z.ZodEnum<["primary", "secondary", "tertiary", "postgraduate", "any"]>, "many">>;
        residencyMonths: z.ZodOptional<z.ZodEffects<z.ZodObject<{
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            min?: number | undefined;
            max?: number | undefined;
        }, {
            min?: number | undefined;
            max?: number | undefined;
        }>, {
            min?: number | undefined;
            max?: number | undefined;
        }, {
            min?: number | undefined;
            max?: number | undefined;
        }>>;
        requiredSkills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        excludedSkills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        customCriteria: z.ZodOptional<z.ZodArray<z.ZodObject<{
            description: z.ZodString;
            validationLogic: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            description: string;
            validationLogic?: string | undefined;
        }, {
            description: string;
            validationLogic?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    }, {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    }>>>;
    minGroupSize: z.ZodNullable<z.ZodNumber>;
    maxGroupSize: z.ZodNullable<z.ZodNumber>;
    tags: z.ZodArray<z.ZodString, "many">;
    partnerOrganizations: z.ZodArray<z.ZodString, "many">;
    internalNotes: z.ZodNullable<z.ZodString>;
    isActive: z.ZodBoolean;
    isPublic: z.ZodBoolean;
    createdBy: z.ZodNullable<z.ZodString>;
    updatedBy: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    id: string;
    name: string;
    partnerOrganizations: string[];
    updatedAt: string;
    description: string | null;
    isActive: boolean;
    isPublic: boolean;
    tags: string[];
    createdBy: string | null;
    internalNotes: string | null;
    groupType: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans";
    countryCode: string;
    primaryLanguages: string[];
    eligibleProgramTypes: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[];
    region: string | null;
    city: string | null;
    ageRange: {
        min: number;
        max: number;
    } | null;
    genderFocus: "mixed" | "all" | "women" | "men" | "non_binary";
    languageRequirement: "beginner" | "fluent" | "conversational" | "any" | "none_required";
    legalStatusCategories: ("other" | "refugee" | "asylum_seeker" | "migrant" | "citizen" | "student")[];
    minGroupSize: number | null;
    maxGroupSize: number | null;
    updatedBy: string | null;
    eligibilityRules?: {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    } | null | undefined;
}, {
    createdAt: string;
    id: string;
    name: string;
    partnerOrganizations: string[];
    updatedAt: string;
    description: string | null;
    isActive: boolean;
    isPublic: boolean;
    tags: string[];
    createdBy: string | null;
    internalNotes: string | null;
    groupType: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans";
    countryCode: string;
    primaryLanguages: string[];
    eligibleProgramTypes: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[];
    region: string | null;
    city: string | null;
    ageRange: {
        min: number;
        max: number;
    } | null;
    genderFocus: "mixed" | "all" | "women" | "men" | "non_binary";
    languageRequirement: "beginner" | "fluent" | "conversational" | "any" | "none_required";
    legalStatusCategories: ("other" | "refugee" | "asylum_seeker" | "migrant" | "citizen" | "student")[];
    minGroupSize: number | null;
    maxGroupSize: number | null;
    updatedBy: string | null;
    eligibilityRules?: {
        employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
        educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
        residencyMonths?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        requiredSkills?: string[] | undefined;
        excludedSkills?: string[] | undefined;
        customCriteria?: {
            description: string;
            validationLogic?: string | undefined;
        }[] | undefined;
    } | null | undefined;
}>;
export type BeneficiaryGroup = z.infer<typeof BeneficiaryGroupSchema>;
/**
 * Paginated response
 */
export declare const BeneficiaryGroupsResponseSchema: z.ZodObject<{
    groups: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        groupType: z.ZodEnum<["refugees", "migrants", "asylum_seekers", "women_in_tech", "youth", "seniors", "displaced_persons", "newcomers", "students", "job_seekers", "caregivers", "veterans", "other"]>;
        countryCode: z.ZodString;
        region: z.ZodNullable<z.ZodString>;
        city: z.ZodNullable<z.ZodString>;
        ageRange: z.ZodNullable<z.ZodEffects<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        genderFocus: z.ZodEnum<["all", "women", "men", "non_binary", "mixed"]>;
        primaryLanguages: z.ZodArray<z.ZodString, "many">;
        languageRequirement: z.ZodEnum<["fluent", "conversational", "beginner", "any", "none_required"]>;
        legalStatusCategories: z.ZodArray<z.ZodEnum<["refugee", "asylum_seeker", "migrant", "citizen", "student", "other"]>, "many">;
        eligibleProgramTypes: z.ZodArray<z.ZodEnum<["mentorship", "language", "buddy", "upskilling", "weei"]>, "many">;
        eligibilityRules: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            employmentStatus: z.ZodOptional<z.ZodArray<z.ZodEnum<["employed", "unemployed", "student", "any"]>, "many">>;
            educationLevel: z.ZodOptional<z.ZodArray<z.ZodEnum<["primary", "secondary", "tertiary", "postgraduate", "any"]>, "many">>;
            residencyMonths: z.ZodOptional<z.ZodEffects<z.ZodObject<{
                min: z.ZodOptional<z.ZodNumber>;
                max: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                min?: number | undefined;
                max?: number | undefined;
            }, {
                min?: number | undefined;
                max?: number | undefined;
            }>, {
                min?: number | undefined;
                max?: number | undefined;
            }, {
                min?: number | undefined;
                max?: number | undefined;
            }>>;
            requiredSkills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            excludedSkills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            customCriteria: z.ZodOptional<z.ZodArray<z.ZodObject<{
                description: z.ZodString;
                validationLogic: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                description: string;
                validationLogic?: string | undefined;
            }, {
                description: string;
                validationLogic?: string | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
            educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
            residencyMonths?: {
                min?: number | undefined;
                max?: number | undefined;
            } | undefined;
            requiredSkills?: string[] | undefined;
            excludedSkills?: string[] | undefined;
            customCriteria?: {
                description: string;
                validationLogic?: string | undefined;
            }[] | undefined;
        }, {
            employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
            educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
            residencyMonths?: {
                min?: number | undefined;
                max?: number | undefined;
            } | undefined;
            requiredSkills?: string[] | undefined;
            excludedSkills?: string[] | undefined;
            customCriteria?: {
                description: string;
                validationLogic?: string | undefined;
            }[] | undefined;
        }>>>;
        minGroupSize: z.ZodNullable<z.ZodNumber>;
        maxGroupSize: z.ZodNullable<z.ZodNumber>;
        tags: z.ZodArray<z.ZodString, "many">;
        partnerOrganizations: z.ZodArray<z.ZodString, "many">;
        internalNotes: z.ZodNullable<z.ZodString>;
        isActive: z.ZodBoolean;
        isPublic: z.ZodBoolean;
        createdBy: z.ZodNullable<z.ZodString>;
        updatedBy: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        createdAt: string;
        id: string;
        name: string;
        partnerOrganizations: string[];
        updatedAt: string;
        description: string | null;
        isActive: boolean;
        isPublic: boolean;
        tags: string[];
        createdBy: string | null;
        internalNotes: string | null;
        groupType: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans";
        countryCode: string;
        primaryLanguages: string[];
        eligibleProgramTypes: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[];
        region: string | null;
        city: string | null;
        ageRange: {
            min: number;
            max: number;
        } | null;
        genderFocus: "mixed" | "all" | "women" | "men" | "non_binary";
        languageRequirement: "beginner" | "fluent" | "conversational" | "any" | "none_required";
        legalStatusCategories: ("other" | "refugee" | "asylum_seeker" | "migrant" | "citizen" | "student")[];
        minGroupSize: number | null;
        maxGroupSize: number | null;
        updatedBy: string | null;
        eligibilityRules?: {
            employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
            educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
            residencyMonths?: {
                min?: number | undefined;
                max?: number | undefined;
            } | undefined;
            requiredSkills?: string[] | undefined;
            excludedSkills?: string[] | undefined;
            customCriteria?: {
                description: string;
                validationLogic?: string | undefined;
            }[] | undefined;
        } | null | undefined;
    }, {
        createdAt: string;
        id: string;
        name: string;
        partnerOrganizations: string[];
        updatedAt: string;
        description: string | null;
        isActive: boolean;
        isPublic: boolean;
        tags: string[];
        createdBy: string | null;
        internalNotes: string | null;
        groupType: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans";
        countryCode: string;
        primaryLanguages: string[];
        eligibleProgramTypes: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[];
        region: string | null;
        city: string | null;
        ageRange: {
            min: number;
            max: number;
        } | null;
        genderFocus: "mixed" | "all" | "women" | "men" | "non_binary";
        languageRequirement: "beginner" | "fluent" | "conversational" | "any" | "none_required";
        legalStatusCategories: ("other" | "refugee" | "asylum_seeker" | "migrant" | "citizen" | "student")[];
        minGroupSize: number | null;
        maxGroupSize: number | null;
        updatedBy: string | null;
        eligibilityRules?: {
            employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
            educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
            residencyMonths?: {
                min?: number | undefined;
                max?: number | undefined;
            } | undefined;
            requiredSkills?: string[] | undefined;
            excludedSkills?: string[] | undefined;
            customCriteria?: {
                description: string;
                validationLogic?: string | undefined;
            }[] | undefined;
        } | null | undefined;
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
    groups: {
        createdAt: string;
        id: string;
        name: string;
        partnerOrganizations: string[];
        updatedAt: string;
        description: string | null;
        isActive: boolean;
        isPublic: boolean;
        tags: string[];
        createdBy: string | null;
        internalNotes: string | null;
        groupType: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans";
        countryCode: string;
        primaryLanguages: string[];
        eligibleProgramTypes: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[];
        region: string | null;
        city: string | null;
        ageRange: {
            min: number;
            max: number;
        } | null;
        genderFocus: "mixed" | "all" | "women" | "men" | "non_binary";
        languageRequirement: "beginner" | "fluent" | "conversational" | "any" | "none_required";
        legalStatusCategories: ("other" | "refugee" | "asylum_seeker" | "migrant" | "citizen" | "student")[];
        minGroupSize: number | null;
        maxGroupSize: number | null;
        updatedBy: string | null;
        eligibilityRules?: {
            employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
            educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
            residencyMonths?: {
                min?: number | undefined;
                max?: number | undefined;
            } | undefined;
            requiredSkills?: string[] | undefined;
            excludedSkills?: string[] | undefined;
            customCriteria?: {
                description: string;
                validationLogic?: string | undefined;
            }[] | undefined;
        } | null | undefined;
    }[];
}, {
    pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    };
    groups: {
        createdAt: string;
        id: string;
        name: string;
        partnerOrganizations: string[];
        updatedAt: string;
        description: string | null;
        isActive: boolean;
        isPublic: boolean;
        tags: string[];
        createdBy: string | null;
        internalNotes: string | null;
        groupType: "other" | "refugees" | "migrants" | "asylum_seekers" | "women_in_tech" | "youth" | "seniors" | "displaced_persons" | "newcomers" | "students" | "job_seekers" | "caregivers" | "veterans";
        countryCode: string;
        primaryLanguages: string[];
        eligibleProgramTypes: ("language" | "mentorship" | "buddy" | "upskilling" | "weei")[];
        region: string | null;
        city: string | null;
        ageRange: {
            min: number;
            max: number;
        } | null;
        genderFocus: "mixed" | "all" | "women" | "men" | "non_binary";
        languageRequirement: "beginner" | "fluent" | "conversational" | "any" | "none_required";
        legalStatusCategories: ("other" | "refugee" | "asylum_seeker" | "migrant" | "citizen" | "student")[];
        minGroupSize: number | null;
        maxGroupSize: number | null;
        updatedBy: string | null;
        eligibilityRules?: {
            employmentStatus?: ("any" | "student" | "employed" | "unemployed")[] | undefined;
            educationLevel?: ("any" | "primary" | "secondary" | "tertiary" | "postgraduate")[] | undefined;
            residencyMonths?: {
                min?: number | undefined;
                max?: number | undefined;
            } | undefined;
            requiredSkills?: string[] | undefined;
            excludedSkills?: string[] | undefined;
            customCriteria?: {
                description: string;
                validationLogic?: string | undefined;
            }[] | undefined;
        } | null | undefined;
    }[];
}>;
export type BeneficiaryGroupsResponse = z.infer<typeof BeneficiaryGroupsResponseSchema>;
/**
 * Check if group type is refugee-related
 */
export declare function isRefugeeGroup(groupType: BeneficiaryGroupType): boolean;
/**
 * Check if group has age restrictions
 */
export declare function hasAgeRestrictions(group: BeneficiaryGroup): boolean;
/**
 * Check if group has gender focus
 */
export declare function hasGenderFocus(group: BeneficiaryGroup): boolean;
/**
 * Check if group is compatible with program type
 */
export declare function isCompatibleWithProgram(group: BeneficiaryGroup, programType: EligibleProgramType): boolean;
/**
 * Check if group is within capacity
 */
export declare function isWithinCapacity(group: BeneficiaryGroup, currentSize: number): boolean;
/**
 * Check if group meets minimum size requirement
 */
export declare function meetsMinimumSize(group: BeneficiaryGroup, currentSize: number): boolean;
/**
 * Summary type for list views
 */
export type BeneficiaryGroupSummary = Pick<BeneficiaryGroup, 'id' | 'name' | 'groupType' | 'countryCode' | 'region' | 'city' | 'tags' | 'isActive'>;
/**
 * Create input with defaults
 */
export type BeneficiaryGroupCreateDefaults = Partial<CreateBeneficiaryGroupInput> & {
    name: string;
    groupType: BeneficiaryGroupType;
    countryCode: string;
    primaryLanguages: string[];
    eligibleProgramTypes: EligibleProgramType[];
};
//# sourceMappingURL=beneficiary-groups.d.ts.map