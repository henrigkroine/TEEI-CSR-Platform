/**
 * Beneficiary Groups Schema
 *
 * PRIVACY-FIRST DESIGN FOR GDPR COMPLIANCE
 *
 * This schema defines target populations (refugees, migrants, women-in-tech, etc.)
 * for CSR campaigns while maintaining strict privacy boundaries.
 *
 * CRITICAL PRIVACY SAFEGUARDS:
 * ❌ NO individual PII stored (no names, emails, addresses, birthdates)
 * ✅ Only aggregated demographics (age ranges, not specific ages)
 * ✅ Broad legal status categories (not visa/permit details)
 * ✅ Group-level data only, never individual tracking
 * ✅ GDPR Article 9 compliant (no special category data without consent)
 *
 * @see /docs/BENEFICIARY_GROUPS_PRIVACY.md for full privacy analysis
 */

import { pgTable, uuid, varchar, timestamp, jsonb, pgEnum, text, boolean, integer, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { z } from 'zod';

// ============================
// ENUMS
// ============================

/**
 * Primary classification of beneficiary populations
 * These are broad, non-sensitive categories for program targeting
 */
export const beneficiaryGroupTypeEnum = pgEnum('beneficiary_group_type', [
  'refugees',           // UNHCR-recognized refugees
  'migrants',           // Economic migrants, not refugees
  'asylum_seekers',     // Persons seeking refugee status
  'women_in_tech',      // Women pursuing technology careers
  'youth',              // Young people (18-30)
  'seniors',            // Older adults (55+)
  'displaced_persons',  // Internally displaced or stateless
  'newcomers',          // Recent arrivals (any legal status)
  'students',           // Educational program participants
  'job_seekers',        // Unemployed or underemployed
  'caregivers',         // Parents, family caregivers
  'veterans',           // Military veterans
  'other'               // Custom category
]);

/**
 * Gender focus for programs (aggregated, not individual tracking)
 * Used for program design, not individual profiling
 */
export const genderFocusEnum = pgEnum('gender_focus', [
  'all',        // No gender targeting
  'women',      // Women-focused programs
  'men',        // Men-focused programs
  'non_binary', // Non-binary focused
  'mixed'       // Intentionally mixed groups
]);

/**
 * Language proficiency requirements (program design, not individual assessment)
 */
export const languageRequirementEnum = pgEnum('language_requirement', [
  'fluent',         // Native or near-native proficiency
  'conversational', // Basic working proficiency
  'beginner',       // A1-A2 level
  'any',            // No language requirement
  'none_required'   // Language learning is the program goal
]);

/**
 * Broad legal status categories (GDPR-safe, no specific visa/permit data)
 * Used for program eligibility, not immigration tracking
 */
export const legalStatusCategoryEnum = pgEnum('legal_status_category', [
  'refugee',        // Recognized refugee status
  'asylum_seeker',  // Asylum application pending
  'migrant',        // Legal resident/work permit
  'citizen',        // National citizen
  'student',        // Student visa/permit
  'other'           // Unspecified/mixed
]);

/**
 * Program types that can serve this beneficiary group
 * Maps to existing program infrastructure
 */
export const eligibleProgramTypeEnum = pgEnum('eligible_program_type', [
  'mentorship',  // 1-on-1 career mentorship
  'language',    // Language learning programs
  'buddy',       // Buddy matching programs
  'upskilling',  // Skills training & certifications
  'weei'         // Women's Economic Empowerment Initiative
]);

// ============================
// TYPESCRIPT TYPES FOR JSONB FIELDS
// ============================

/**
 * Age range specification (aggregated, not individual birthdates)
 * PRIVACY: Ranges only, never specific ages or dates of birth
 */
export type AgeRange = {
  min: number; // Minimum age (e.g., 18)
  max: number; // Maximum age (e.g., 35)
};

/**
 * Eligibility rules framework (JSONB - flexible for complex logic)
 * Defines who qualifies for this group WITHOUT storing individual PII
 */
export type EligibilityRules = {
  // Employment criteria (broad categories only)
  employmentStatus?: ('employed' | 'unemployed' | 'student' | 'any')[];

  // Education level (ranges, not specific qualifications)
  educationLevel?: ('primary' | 'secondary' | 'tertiary' | 'postgraduate' | 'any')[];

  // Residency duration (time ranges, not specific dates)
  residencyMonths?: {
    min?: number; // Minimum months in country
    max?: number; // Maximum months in country
  };

  // Skills tags (general categories, not personal assessments)
  requiredSkills?: string[];
  excludedSkills?: string[];

  // Custom rules (documented, auditable logic)
  customCriteria?: {
    description: string;
    validationLogic?: string; // Reference to validation function
  }[];
};

/**
 * Geographic targeting (broad regions, not individual addresses)
 * PRIVACY: City/region level only, never street addresses or postal codes
 */
export type GeographicScope = {
  countryCode: string;      // ISO 3166-1 alpha-2 (e.g., 'DE', 'NO')
  region?: string;          // State/province (e.g., 'Berlin', 'Oslo')
  city?: string;            // City name (e.g., 'Berlin', 'Oslo')
  excludedRegions?: string[]; // Regions to exclude
};

// ============================
// DRIZZLE ORM SCHEMA
// ============================

/**
 * BeneficiaryGroups Table
 *
 * Defines reusable target populations for CSR campaigns.
 * All data is AGGREGATED and GROUP-LEVEL only.
 *
 * PRIVACY DESIGN:
 * - No individual identifiers (names, emails, IDs)
 * - No precise locations (addresses, coordinates)
 * - No birthdates or ages (only age ranges)
 * - No sensitive personal data (health, religion, sexuality)
 * - No legal documents (visa numbers, permits)
 *
 * @example
 * {
 *   name: "Syrian Refugees in Berlin",
 *   groupType: "refugees",
 *   countryCode: "DE",
 *   region: "Berlin",
 *   ageRange: { min: 18, max: 45 },
 *   primaryLanguages: ["ar", "en"],
 *   eligibleProgramTypes: ["mentorship", "language"]
 * }
 */
export const beneficiaryGroups = pgTable('beneficiary_groups', {
  id: uuid('id').defaultRandom().primaryKey(),

  // ============================
  // IDENTIFICATION (Group-level only)
  // ============================

  /**
   * Human-readable group name
   * @example "Syrian Refugees in Berlin", "Afghan Women in Oslo", "Migrants in Germany"
   */
  name: varchar('name', { length: 255 }).notNull(),

  /**
   * Detailed description of this beneficiary group
   * PRIVACY: Describe the group, not individuals
   */
  description: text('description'),

  // ============================
  // CLASSIFICATION
  // ============================

  /**
   * Primary group type for categorization
   */
  groupType: beneficiaryGroupTypeEnum('group_type').notNull(),

  // ============================
  // GEOGRAPHY (Aggregated, not individual addresses)
  // ============================

  /**
   * Primary country where this group is located
   * ISO 3166-1 alpha-2 code (e.g., 'DE', 'NO', 'UK')
   */
  countryCode: varchar('country_code', { length: 2 }).notNull(),

  /**
   * Optional state/province/region targeting
   * PRIVACY: Broad region only, not postal codes
   * @example "Berlin", "Oslo", "Bavaria"
   */
  region: varchar('region', { length: 100 }),

  /**
   * Optional city targeting
   * PRIVACY: City level only, not neighborhoods or addresses
   * @example "Berlin", "Oslo", "Munich"
   */
  city: varchar('city', { length: 100 }),

  // ============================
  // DEMOGRAPHICS (Aggregated ranges, not individual data)
  // ============================

  /**
   * Age range for program targeting
   * PRIVACY: Ranges only (e.g., 18-35), NEVER specific ages or birthdates
   * NULL = no age restriction
   */
  ageRange: jsonb('age_range').$type<AgeRange>(),

  /**
   * Gender focus for program design
   * PRIVACY: Program design choice, not individual gender tracking
   */
  genderFocus: genderFocusEnum('gender_focus').default('all'),

  // ============================
  // LANGUAGE & COMMUNICATION
  // ============================

  /**
   * Primary languages spoken by this group
   * ISO 639-1 codes (e.g., ['ar', 'en'], ['fa', 'no'])
   * Used for program design (matching mentors, materials language)
   */
  primaryLanguages: jsonb('primary_languages').$type<string[]>().notNull().default([]),

  /**
   * Language proficiency requirement for program participation
   */
  languageRequirement: languageRequirementEnum('language_requirement').default('any'),

  // ============================
  // LEGAL STATUS (Broad categories only)
  // ============================

  /**
   * Broad legal status categories
   * PRIVACY: General categories only, NEVER visa numbers, permit details, or documents
   * Used for program eligibility, not immigration enforcement
   */
  legalStatusCategories: jsonb('legal_status_categories').$type<Array<typeof legalStatusCategoryEnum.enumValues[number]>>().default([]),

  // ============================
  // PROGRAM ELIGIBILITY
  // ============================

  /**
   * Which program types can serve this beneficiary group
   * Used for campaign creation and template matching
   */
  eligibleProgramTypes: jsonb('eligible_program_types').$type<Array<typeof eligibleProgramTypeEnum.enumValues[number]>>().notNull().default([]),

  /**
   * Detailed eligibility rules (JSONB for flexibility)
   * PRIVACY: Rules describe group characteristics, not individual assessments
   */
  eligibilityRules: jsonb('eligibility_rules').$type<EligibilityRules>(),

  // ============================
  // CAPACITY CONSTRAINTS
  // ============================

  /**
   * Minimum viable group size
   * Used for program viability assessment
   */
  minGroupSize: integer('min_group_size'),

  /**
   * Maximum group capacity
   * Used for resource planning
   */
  maxGroupSize: integer('max_group_size'),

  // ============================
  // METADATA & DISCOVERY
  // ============================

  /**
   * Tags for search and filtering
   * @example ['integration', 'employment', 'women', 'tech', 'language']
   */
  tags: jsonb('tags').$type<string[]>().notNull().default([]),

  /**
   * Partner organizations working with this group
   * PRIVACY: Organization names only, not contact details or agreements
   * @example ['UNHCR', 'Red Cross', 'Local NGO Name']
   */
  partnerOrganizations: jsonb('partner_organizations').$type<string[]>().default([]),

  /**
   * Additional context or notes for campaign planners
   * PRIVACY: No individual identifiers or sensitive data
   */
  internalNotes: text('internal_notes'),

  // ============================
  // STATUS & LIFECYCLE
  // ============================

  /**
   * Is this group active and available for new campaigns?
   */
  isActive: boolean('is_active').default(true).notNull(),

  /**
   * Is this group publicly visible to all companies?
   * false = only specific companies can use this group
   */
  isPublic: boolean('is_public').default(true).notNull(),

  // ============================
  // AUDIT TRAIL
  // ============================

  /**
   * Admin user who created this group definition
   */
  createdBy: uuid('created_by').references(() => users.id),

  /**
   * Last admin user who updated this group
   */
  updatedBy: uuid('updated_by').references(() => users.id),

  /**
   * Timestamps
   */
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Query performance indexes
  groupTypeIdx: index('beneficiary_groups_group_type_idx').on(table.groupType),
  countryCodeIdx: index('beneficiary_groups_country_code_idx').on(table.countryCode),
  isActiveIdx: index('beneficiary_groups_is_active_idx').on(table.isActive),
  isPublicIdx: index('beneficiary_groups_is_public_idx').on(table.isPublic),
  createdAtIdx: index('beneficiary_groups_created_at_idx').on(table.createdAt),

  // Composite indexes for common queries
  countryTypeIdx: index('beneficiary_groups_country_type_idx').on(table.countryCode, table.groupType),
  activePublicIdx: index('beneficiary_groups_active_public_idx').on(table.isActive, table.isPublic),
}));

// ============================
// ZOD VALIDATION SCHEMAS
// ============================

/**
 * Zod schema for age range validation
 */
export const ageRangeSchema = z.object({
  min: z.number().int().min(0).max(120),
  max: z.number().int().min(0).max(120),
}).refine(data => data.min <= data.max, {
  message: "Minimum age must be less than or equal to maximum age",
});

/**
 * Zod schema for eligibility rules validation
 */
export const eligibilityRulesSchema = z.object({
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

/**
 * Zod schema for creating a new beneficiary group
 * Enforces strict validation and privacy boundaries
 */
export const createBeneficiaryGroupSchema = z.object({
  // Required fields
  name: z.string()
    .min(1, "Group name is required")
    .max(255, "Group name must be 255 characters or less")
    .refine(
      (val) => !val.toLowerCase().includes('email') && !val.toLowerCase().includes('@'),
      "Group name must not contain email addresses or individual identifiers"
    ),

  groupType: z.enum(beneficiaryGroupTypeEnum.enumValues),

  countryCode: z.string()
    .length(2, "Country code must be ISO 3166-1 alpha-2 (2 letters)")
    .toUpperCase(),

  primaryLanguages: z.array(z.string().length(2))
    .min(1, "At least one primary language is required")
    .max(10, "Maximum 10 languages allowed"),

  eligibleProgramTypes: z.array(z.enum(eligibleProgramTypeEnum.enumValues))
    .min(1, "At least one eligible program type is required"),

  // Optional fields
  description: z.string().max(2000, "Description must be 2000 characters or less").optional(),
  region: z.string().max(100).optional(),
  city: z.string().max(100).optional(),

  ageRange: ageRangeSchema.optional(),
  genderFocus: z.enum(genderFocusEnum.enumValues).optional(),
  languageRequirement: z.enum(languageRequirementEnum.enumValues).optional(),

  legalStatusCategories: z.array(z.enum(legalStatusCategoryEnum.enumValues))
    .max(5, "Maximum 5 legal status categories")
    .optional(),

  eligibilityRules: eligibilityRulesSchema,

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

/**
 * Zod schema for updating a beneficiary group
 * All fields optional, same validation rules as create
 */
export const updateBeneficiaryGroupSchema = createBeneficiaryGroupSchema.partial();

/**
 * Zod schema for filtering/searching beneficiary groups
 */
export const filterBeneficiaryGroupsSchema = z.object({
  groupType: z.enum(beneficiaryGroupTypeEnum.enumValues).optional(),
  countryCode: z.string().length(2).toUpperCase().optional(),
  region: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  eligibleProgramTypes: z.array(z.enum(eligibleProgramTypeEnum.enumValues)).optional(),
  search: z.string().max(255).optional(), // Search in name/description
});

// ============================
// TYPE EXPORTS
// ============================

/**
 * TypeScript type for BeneficiaryGroup (inferred from Drizzle schema)
 */
export type BeneficiaryGroup = typeof beneficiaryGroups.$inferSelect;

/**
 * TypeScript type for creating a BeneficiaryGroup (inferred from Drizzle schema)
 */
export type NewBeneficiaryGroup = typeof beneficiaryGroups.$inferInsert;

/**
 * TypeScript type for validated create input (inferred from Zod schema)
 */
export type CreateBeneficiaryGroupInput = z.infer<typeof createBeneficiaryGroupSchema>;

/**
 * TypeScript type for validated update input (inferred from Zod schema)
 */
export type UpdateBeneficiaryGroupInput = z.infer<typeof updateBeneficiaryGroupSchema>;

/**
 * TypeScript type for validated filter input (inferred from Zod schema)
 */
export type FilterBeneficiaryGroupsInput = z.infer<typeof filterBeneficiaryGroupsSchema>;
