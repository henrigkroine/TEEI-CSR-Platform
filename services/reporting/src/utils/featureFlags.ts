/**
 * Feature Flags System for Phase C Pilot
 *
 * Allows toggling features on/off without code changes
 * Useful for:
 * - Rolling out pilot features gradually
 * - A/B testing
 * - Emergency feature disabling
 * - Tenant-specific feature access
 */

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  rolloutPercentage?: number; // 0-100, for gradual rollout
}

/**
 * Phase C Feature Flags
 * Set via environment variables or database
 */
export const FEATURE_FLAGS = {
  // Slice B: Evidence Explorer
  EVIDENCE_EXPLORER: 'evidence_explorer',
  EVIDENCE_LINEAGE: 'evidence_lineage',

  // Slice C: Generative Reporting
  GEN_REPORTS: 'gen_reports',
  GEN_REPORTS_CITATIONS: 'gen_reports_citations',

  // Slice D: Exports & Scheduling
  PDF_EXPORTS: 'pdf_exports',
  SCHEDULED_REPORTS: 'scheduled_reports',

  // Slice E: Performance features
  WEB_VITALS: 'web_vitals',

  // Slice F: Saved Views
  SAVED_VIEWS: 'saved_views',
  SHARE_LINKS: 'share_links',
  BOARDROOM_MODE: 'boardroom_mode',

  // Slice G: Impact-In Monitor
  IMPACT_IN_MONITOR: 'impact_in_monitor',

  // Slice H: Theming
  THEMING: 'theming',
  THEME_EDITOR: 'theme_editor',
} as const;

export type FeatureFlagName = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

/**
 * Default feature flag configuration
 * Can be overridden by environment variables or database
 */
const DEFAULT_FLAGS: Record<FeatureFlagName, boolean> = {
  // Enable all features in development
  [FEATURE_FLAGS.EVIDENCE_EXPLORER]: process.env.FEATURE_EVIDENCE_EXPLORER === 'true',
  [FEATURE_FLAGS.EVIDENCE_LINEAGE]: process.env.FEATURE_EVIDENCE_LINEAGE === 'true',
  [FEATURE_FLAGS.GEN_REPORTS]: process.env.FEATURE_GEN_REPORTS === 'true',
  [FEATURE_FLAGS.GEN_REPORTS_CITATIONS]: process.env.FEATURE_GEN_REPORTS_CITATIONS === 'true',
  [FEATURE_FLAGS.PDF_EXPORTS]: process.env.FEATURE_PDF_EXPORTS === 'true',
  [FEATURE_FLAGS.SCHEDULED_REPORTS]: process.env.FEATURE_SCHEDULED_REPORTS === 'true',
  [FEATURE_FLAGS.WEB_VITALS]: process.env.FEATURE_WEB_VITALS === 'true',
  [FEATURE_FLAGS.SAVED_VIEWS]: process.env.FEATURE_SAVED_VIEWS === 'true',
  [FEATURE_FLAGS.SHARE_LINKS]: process.env.FEATURE_SHARE_LINKS === 'true',
  [FEATURE_FLAGS.BOARDROOM_MODE]: process.env.FEATURE_BOARDROOM_MODE === 'true',
  [FEATURE_FLAGS.IMPACT_IN_MONITOR]: process.env.FEATURE_IMPACT_IN_MONITOR === 'true',
  [FEATURE_FLAGS.THEMING]: process.env.FEATURE_THEMING === 'true',
  [FEATURE_FLAGS.THEME_EDITOR]: process.env.FEATURE_THEME_EDITOR === 'true',
};

// In-memory cache of feature flags (can be moved to Redis for distributed systems)
let featureFlagCache: Record<FeatureFlagName, boolean> = { ...DEFAULT_FLAGS };

/**
 * Check if a feature is enabled
 *
 * @param flagName - Name of the feature flag
 * @param tenantId - Optional tenant ID for tenant-specific flags
 * @returns true if feature is enabled, false otherwise
 */
export function isFeatureEnabled(
  flagName: FeatureFlagName,
  tenantId?: string
): boolean {
  // TODO: Check database for tenant-specific overrides
  // const tenantOverride = await db.query.featureFlags.findFirst({
  //   where: and(
  //     eq(featureFlags.name, flagName),
  //     eq(featureFlags.tenantId, tenantId)
  //   )
  // });
  //
  // if (tenantOverride !== undefined) {
  //   return tenantOverride.enabled;
  // }

  return featureFlagCache[flagName] ?? false;
}

/**
 * Enable a feature flag (runtime)
 * Useful for admin dashboard or emergency toggles
 */
export function enableFeature(flagName: FeatureFlagName): void {
  featureFlagCache[flagName] = true;
  console.log(`Feature flag enabled: ${flagName}`);
}

/**
 * Disable a feature flag (runtime)
 * Useful for emergency rollback
 */
export function disableFeature(flagName: FeatureFlagName): void {
  featureFlagCache[flagName] = false;
  console.log(`Feature flag disabled: ${flagName}`);
}

/**
 * Get all feature flags and their current state
 * Useful for admin dashboard
 */
export function getAllFeatureFlags(): Record<FeatureFlagName, boolean> {
  return { ...featureFlagCache };
}

/**
 * Middleware to check feature flag before allowing access to route
 *
 * Usage:
 * ```ts
 * fastify.get('/api/gen-reports', {
 *   preHandler: requireFeature(FEATURE_FLAGS.GEN_REPORTS)
 * }, async (request, reply) => {
 *   // Only executes if gen_reports feature is enabled
 * });
 * ```
 */
export function requireFeature(flagName: FeatureFlagName) {
  return async (request: any, reply: any) => {
    const tenantId = request.tenantId;
    const isEnabled = isFeatureEnabled(flagName, tenantId);

    if (!isEnabled) {
      return reply.status(403).send({
        error: 'Feature Disabled',
        message: `Feature '${flagName}' is not enabled`,
      });
    }
  };
}

/**
 * Initialize feature flags from environment
 * Call this on server startup
 */
export function initializeFeatureFlags(): void {
  console.log('Initializing feature flags...');

  for (const [name, value] of Object.entries(DEFAULT_FLAGS)) {
    console.log(`  ${name}: ${value ? '✅ enabled' : '❌ disabled'}`);
  }

  console.log('Feature flags initialized');
}
