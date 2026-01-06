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

// ============================================================================
// ENUMS (matching database enums)
// ============================================================================

export const BeneficiaryGroupTypeEnum = z.enum([
  'refugees',
  'migrants',
  'asylum_seekers',
  'women_in_tech',
  'youth',
  'seniors',
  'displaced_persons',
  'newcomers',
  'students',
  'job_seekers',
  'caregivers',
  'veterans',
  'other'
]);

export const GenderFocusEnum = z.enum([
  'all',
  'women',
  'men',
  'non_binary',
  'mixed'
]);

export const LanguageRequirementEnum = z.enum([
  'fluent',
  'conversational',
  'beginner',
  'any',
  'none_required'
]);

export const LegalStatusCategoryEnum = z.enum([
  'refugee',
  'asylum_seeker',
  'migrant',
  'citizen',
  'student',
  'other'
]);

export const EligibleProgramTypeEnum = z.enum([
  'mentorship',
  'language',
  'buddy',
  'upskilling',
  'weei'
]);

// Type exports
export type BeneficiaryGroupType = z.infer<typeof BeneficiaryGroupTypeEnum>;
export type GenderFocus = z.infer<typeof GenderFocusEnum>;
export type LanguageRequirement = z.infer<typeof LanguageRequirementEnum>;
export type LegalStatusCategory = z.infer<typeof LegalStatusCategoryEnum>;
export type EligibleProgramType = z.infer<typeof EligibleProgramTypeEnum>;

// ============================================================================
// COMPLEX TYPES (JSONB fields)
// ============================================================================

/**
 * Age range specification (aggregated, not individual birthdates)
 * PRIVACY: Ranges only, never specific ages or dates of birth
 */
export const AgeRangeSchema = z.object({
  min: z.number().int().min(0).max(120),
  max: z.number().int().min(0).max(120),
}).refine(data => data.min <= data.max, {
  message: "Minimum age must be less than or equal to maximum age",
});

export type AgeRange = z.infer<typeof AgeRangeSchema>;

/**
 * Eligibility rules framework (JSONB - flexible for complex logic)
 * Defines who qualifies for this group WITHOUT storing individual PII
 */
export const EligibilityRulesSchema = z.object({
  employmentStatus: z.array(z.enum(['employed', 'unemployed', 'student', 'any'])).optional(),
  educationLevel: z.array(z.enum(['primary', 'secondary', 'tertiary', 'postgraduate', 'any'])).optional(),
  residencyMonths: z.object({
    min: z.number().int().min(0).optional(),
    max: z.number().int().min(0).optional(),
  }).refine(data => {
    if (data.min !== undefined && data.max !== undefined) {
      return data.min <= data.max;
    }
    return true;
  }, { message: "Minimum residency must be less than or equal to maximum" }).optional(),
  requiredSkills: z.array(z.string()).optional(),
  excludedSkills: z.array(z.string()).optional(),
  customCriteria: z.array(z.object({
    description: z.string(),
    validationLogic: z.string().optional(),
  })).optional(),
}).optional();

export type EligibilityRules = z.infer<typeof EligibilityRulesSchema>;

// ============================================================================
// API SCHEMAS (for requests/responses)
// ============================================================================

/**
 * Create beneficiary group request
 * Enforces strict validation and privacy boundaries
 */
export const CreateBeneficiaryGroupSchema = z.object({
  // Required fields
  name: z.string()
    .min(1, "Group name is required")
    .max(255, "Group name must be 255 characters or less")
    .refine(
      (val) => !val.toLowerCase().includes('email') && !val.toLowerCase().includes('@'),
      "Group name must not contain email addresses or individual identifiers"
    ),

  groupType: BeneficiaryGroupTypeEnum,

  countryCode: z.string()
    .length(2, "Country code must be ISO 3166-1 alpha-2 (2 letters)")
    .toUpperCase(),

  primaryLanguages: z.array(z.string().length(2))
    .min(1, "At least one primary language is required")
    .max(10, "Maximum 10 languages allowed"),

  eligibleProgramTypes: z.array(EligibleProgramTypeEnum)
    .min(1, "At least one eligible program type is required"),

  // Optional fields
  description: z.string().max(2000, "Description must be 2000 characters or less").optional(),
  region: z.string().max(100).optional(),
  city: z.string().max(100).optional(),

  ageRange: AgeRangeSchema.optional(),
  genderFocus: GenderFocusEnum.optional(),
  languageRequirement: LanguageRequirementEnum.optional(),

  legalStatusCategories: z.array(LegalStatusCategoryEnum)
    .max(5, "Maximum 5 legal status categories")
    .optional(),

  eligibilityRules: EligibilityRulesSchema,

  minGroupSize: z.number().int().min(1).max(10000).optional(),
  maxGroupSize: z.number().int().min(1).max(100000).optional(),

  tags: z.array(z.string().max(50))
    .max(20, "Maximum 20 tags allowed")
    .optional(),

  partnerOrganizations: z.array(z.string().max(255))
    .max(50, "Maximum 50 partner organizations")
    .optional(),

  internalNotes: z.string().max(5000).optional(),

  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
}).refine(
  (data) => {
    // Ensure minGroupSize <= maxGroupSize if both are provided
    if (data.minGroupSize !== undefined && data.maxGroupSize !== undefined) {
      return data.minGroupSize <= data.maxGroupSize;
    }
    return true;
  },
  {
    message: "Minimum group size must be less than or equal to maximum group size",
    path: ["minGroupSize"],
  }
).refine(
  (data) => {
    // PRIVACY CHECK: Ensure description doesn't contain email patterns
    if (data.description) {
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      return !emailPattern.test(data.description);
    }
    return true;
  },
  {
    message: "Description must not contain email addresses or individual identifiers",
    path: ["description"],
  }
).refine(
  (data) => {
    // PRIVACY CHECK: Ensure internal notes don't contain email patterns
    if (data.internalNotes) {
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      return !emailPattern.test(data.internalNotes);
    }
    return true;
  },
  {
    message: "Internal notes must not contain email addresses or individual identifiers",
    path: ["internalNotes"],
  }
);

export type CreateBeneficiaryGroupInput = z.infer<typeof CreateBeneficiaryGroupSchema>;

/**
 * Base schema for beneficiary group (without refinements)
 * Used for creating partial schemas
 */
const BeneficiaryGroupBaseSchema = z.object({
  name: z.string()
    .min(1, "Group name is required")
    .max(255, "Group name must be 255 characters or less")
    .refine(
      (val) => !val.toLowerCase().includes('email') && !val.toLowerCase().includes('@'),
      "Group name must not contain email addresses or individual identifiers"
    ),

  groupType: BeneficiaryGroupTypeEnum,

  countryCode: z.string()
    .length(2, "Country code must be ISO 3166-1 alpha-2 (2 letters)")
    .toUpperCase(),

  primaryLanguages: z.array(z.string().length(2))
    .min(1, "At least one primary language is required")
    .max(10, "Maximum 10 languages allowed"),

  eligibleProgramTypes: z.array(EligibleProgramTypeEnum)
    .min(1, "At least one eligible program type is required"),

  description: z.string().max(2000, "Description must be 2000 characters or less").optional(),
  region: z.string().max(100).optional(),
  city: z.string().max(100).optional(),

  ageRange: AgeRangeSchema.optional(),
  genderFocus: GenderFocusEnum.optional(),
  languageRequirement: LanguageRequirementEnum.optional(),

  legalStatusCategories: z.array(LegalStatusCategoryEnum)
    .max(5, "Maximum 5 legal status categories")
    .optional(),

  eligibilityRules: EligibilityRulesSchema,

  minGroupSize: z.number().int().min(1).max(10000).optional(),
  maxGroupSize: z.number().int().min(1).max(100000).optional(),

  tags: z.array(z.string().max(50))
    .max(20, "Maximum 20 tags allowed")
    .optional(),

  partnerOrganizations: z.array(z.string().max(255))
    .max(50, "Maximum 50 partner organizations")
    .optional(),

  internalNotes: z.string().max(5000).optional(),

  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

/**
 * Update beneficiary group request
 * All fields optional for partial updates
 */
export const UpdateBeneficiaryGroupSchema = BeneficiaryGroupBaseSchema.partial();

export type UpdateBeneficiaryGroupInput = z.infer<typeof UpdateBeneficiaryGroupSchema>;

/**
 * Filter/search beneficiary groups
 */
export const FilterBeneficiaryGroupsSchema = z.object({
  groupType: BeneficiaryGroupTypeEnum.optional(),
  countryCode: z.string().length(2).toUpperCase().optional(),
  region: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  eligibleProgramTypes: z.array(EligibleProgramTypeEnum).optional(),
  search: z.string().max(255).optional(), // Search in name/description
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type FilterBeneficiaryGroupsInput = z.infer<typeof FilterBeneficiaryGroupsSchema>;

/**
 * Beneficiary group response (from database)
 */
export const BeneficiaryGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),

  // Classification
  groupType: BeneficiaryGroupTypeEnum,

  // Geography
  countryCode: z.string(),
  region: z.string().nullable(),
  city: z.string().nullable(),

  // Demographics
  ageRange: AgeRangeSchema.nullable(),
  genderFocus: GenderFocusEnum,

  // Language
  primaryLanguages: z.array(z.string()),
  languageRequirement: LanguageRequirementEnum,

  // Legal status
  legalStatusCategories: z.array(LegalStatusCategoryEnum),

  // Program eligibility
  eligibleProgramTypes: z.array(EligibleProgramTypeEnum),
  eligibilityRules: EligibilityRulesSchema.nullable(),

  // Capacity
  minGroupSize: z.number().int().nullable(),
  maxGroupSize: z.number().int().nullable(),

  // Metadata
  tags: z.array(z.string()),
  partnerOrganizations: z.array(z.string()),
  internalNotes: z.string().nullable(),

  // Status
  isActive: z.boolean(),
  isPublic: z.boolean(),

  // Audit
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BeneficiaryGroup = z.infer<typeof BeneficiaryGroupSchema>;

/**
 * Paginated response
 */
export const BeneficiaryGroupsResponseSchema = z.object({
  groups: z.array(BeneficiaryGroupSchema),
  pagination: z.object({
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
    hasMore: z.boolean(),
  }),
});

export type BeneficiaryGroupsResponse = z.infer<typeof BeneficiaryGroupsResponseSchema>;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if group type is refugee-related
 */
export function isRefugeeGroup(groupType: BeneficiaryGroupType): boolean {
  return ['refugees', 'asylum_seekers', 'displaced_persons'].includes(groupType);
}

/**
 * Check if group has age restrictions
 */
export function hasAgeRestrictions(group: BeneficiaryGroup): boolean {
  return group.ageRange !== null;
}

/**
 * Check if group has gender focus
 */
export function hasGenderFocus(group: BeneficiaryGroup): boolean {
  return group.genderFocus !== 'all';
}

/**
 * Check if group is compatible with program type
 */
export function isCompatibleWithProgram(
  group: BeneficiaryGroup,
  programType: EligibleProgramType
): boolean {
  return group.eligibleProgramTypes.includes(programType);
}

/**
 * Check if group is within capacity
 */
export function isWithinCapacity(
  group: BeneficiaryGroup,
  currentSize: number
): boolean {
  if (group.maxGroupSize !== null && currentSize > group.maxGroupSize) {
    return false;
  }
  return true;
}

/**
 * Check if group meets minimum size requirement
 */
export function meetsMinimumSize(
  group: BeneficiaryGroup,
  currentSize: number
): boolean {
  if (group.minGroupSize !== null && currentSize < group.minGroupSize) {
    return false;
  }
  return true;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Summary type for list views
 */
export type BeneficiaryGroupSummary = Pick<
  BeneficiaryGroup,
  'id' | 'name' | 'groupType' | 'countryCode' | 'region' | 'city' | 'tags' | 'isActive'
>;

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
