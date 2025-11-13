import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { companies } from '@teei/shared-schema';
import type { Platform } from './delivery-log.js';

const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/teei';
const queryClient = postgres(connectionString);
const db = drizzle(queryClient);

export interface ImpactInFeatureFlags {
  benevity?: boolean;
  goodera?: boolean;
  workday?: boolean;
}

export interface CompanyFeatures {
  impactIn?: ImpactInFeatureFlags;
  [key: string]: any;
}

/**
 * Get environment-level feature flags
 */
export function getEnvironmentFlags(): ImpactInFeatureFlags {
  return {
    benevity: process.env.IMPACT_IN_BENEVITY_ENABLED === 'true',
    goodera: process.env.IMPACT_IN_GOODERA_ENABLED === 'true',
    workday: process.env.IMPACT_IN_WORKDAY_ENABLED === 'true',
  };
}

/**
 * Get company-level feature flags from database
 */
export async function getCompanyFeatureFlags(companyId: string): Promise<ImpactInFeatureFlags> {
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!company || !company.features) {
    return {};
  }

  const features = company.features as CompanyFeatures;
  return features.impactIn || {};
}

/**
 * Check if a platform is enabled for a company
 * Company-level flags override environment flags
 */
export async function isPlatformEnabled(
  companyId: string,
  platform: Platform
): Promise<boolean> {
  const envFlags = getEnvironmentFlags();
  const companyFlags = await getCompanyFeatureFlags(companyId);

  // Company flag takes precedence
  if (companyFlags[platform] !== undefined) {
    return companyFlags[platform] === true;
  }

  // Fall back to environment flag
  return envFlags[platform] === true;
}

/**
 * Update company feature flags
 */
export async function updateCompanyFeatureFlags(
  companyId: string,
  impactInFlags: Partial<ImpactInFeatureFlags>
): Promise<void> {
  // Get existing features
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  const existingFeatures = (company.features as CompanyFeatures) || {};
  const existingImpactIn = existingFeatures.impactIn || {};

  // Merge new flags with existing
  const updatedFeatures: CompanyFeatures = {
    ...existingFeatures,
    impactIn: {
      ...existingImpactIn,
      ...impactInFlags,
    },
  };

  // Update in database
  await db
    .update(companies)
    .set({
      features: updatedFeatures as any,
    })
    .where(eq(companies.id, companyId));
}

/**
 * Get all feature flags (environment + company-specific)
 */
export async function getAllFeatureFlags(companyId: string): Promise<{
  environment: ImpactInFeatureFlags;
  company: ImpactInFeatureFlags;
  effective: ImpactInFeatureFlags;
}> {
  const envFlags = getEnvironmentFlags();
  const companyFlags = await getCompanyFeatureFlags(companyId);

  // Compute effective flags (company overrides environment)
  const effective: ImpactInFeatureFlags = {
    benevity: companyFlags.benevity !== undefined ? companyFlags.benevity : envFlags.benevity,
    goodera: companyFlags.goodera !== undefined ? companyFlags.goodera : envFlags.goodera,
    workday: companyFlags.workday !== undefined ? companyFlags.workday : envFlags.workday,
  };

  return {
    environment: envFlags,
    company: companyFlags,
    effective,
  };
}
