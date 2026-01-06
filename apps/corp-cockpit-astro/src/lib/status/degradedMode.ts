/**
 * Degraded Mode Feature Toggle Logic
 *
 * Manages feature availability during incidents based on priority tiers.
 * Disables non-essential features when system is degraded or experiencing outages.
 *
 * @module lib/status/degradedMode
 */

import type { SystemStatus } from '../../components/status/StatusBanner';
import type { IncidentSeverity } from '../../components/status/IncidentShelf';

/**
 * Feature priority tiers
 */
export enum FeatureTier {
  CRITICAL = 1, // Always available
  IMPORTANT = 2, // Available unless major outage
  OPTIONAL = 3, // Disabled during degraded/outage
}

/**
 * Feature identifiers
 */
export enum Feature {
  // Tier 1 - Critical (always available)
  DASHBOARD_VIEW = 'dashboard_view',
  REPORTS_VIEW = 'reports_view',
  BASIC_NAVIGATION = 'basic_navigation',
  AUTH = 'auth',

  // Tier 2 - Important
  EVIDENCE_EXPLORER = 'evidence_explorer',
  SAVED_VIEWS = 'saved_views',
  BASIC_EXPORTS = 'basic_exports', // PDF only
  Q2Q_FEED = 'q2q_feed',

  // Tier 3 - Optional
  PPTX_EXPORT = 'pptx_export',
  EXCEL_EXPORT = 'excel_export',
  BENCHMARKS = 'benchmarks',
  BOARDROOM_MODE = 'boardroom_mode',
  ADVANCED_FILTERING = 'advanced_filtering',
  CUSTOM_THEMES = 'custom_themes',
  SCHEDULED_REPORTS = 'scheduled_reports',
}

/**
 * Feature configuration
 */
const FEATURE_CONFIG: Record<Feature, { tier: FeatureTier; name: string; fallbackMessage?: string }> = {
  // Tier 1 - Critical
  [Feature.DASHBOARD_VIEW]: {
    tier: FeatureTier.CRITICAL,
    name: 'Dashboard',
  },
  [Feature.REPORTS_VIEW]: {
    tier: FeatureTier.CRITICAL,
    name: 'Reports',
  },
  [Feature.BASIC_NAVIGATION]: {
    tier: FeatureTier.CRITICAL,
    name: 'Navigation',
  },
  [Feature.AUTH]: {
    tier: FeatureTier.CRITICAL,
    name: 'Authentication',
  },

  // Tier 2 - Important
  [Feature.EVIDENCE_EXPLORER]: {
    tier: FeatureTier.IMPORTANT,
    name: 'Evidence Explorer',
    fallbackMessage: 'Evidence Explorer is temporarily unavailable. Please try again later.',
  },
  [Feature.SAVED_VIEWS]: {
    tier: FeatureTier.IMPORTANT,
    name: 'Saved Views',
    fallbackMessage: 'Saved Views are temporarily unavailable.',
  },
  [Feature.BASIC_EXPORTS]: {
    tier: FeatureTier.IMPORTANT,
    name: 'PDF Export',
    fallbackMessage: 'Export functionality is temporarily limited to PDF only.',
  },
  [Feature.Q2Q_FEED]: {
    tier: FeatureTier.IMPORTANT,
    name: 'Q2Q Feed',
    fallbackMessage: 'Q2Q Feed is temporarily unavailable.',
  },

  // Tier 3 - Optional
  [Feature.PPTX_EXPORT]: {
    tier: FeatureTier.OPTIONAL,
    name: 'PowerPoint Export',
    fallbackMessage: 'PowerPoint export is temporarily unavailable. Please use PDF export instead.',
  },
  [Feature.EXCEL_EXPORT]: {
    tier: FeatureTier.OPTIONAL,
    name: 'Excel Export',
    fallbackMessage: 'Excel export is temporarily unavailable. Please use PDF export instead.',
  },
  [Feature.BENCHMARKS]: {
    tier: FeatureTier.OPTIONAL,
    name: 'Benchmarks',
    fallbackMessage: 'Benchmarks are temporarily unavailable. Please try again later.',
  },
  [Feature.BOARDROOM_MODE]: {
    tier: FeatureTier.OPTIONAL,
    name: 'Boardroom Mode',
    fallbackMessage: 'Boardroom Mode is temporarily unavailable.',
  },
  [Feature.ADVANCED_FILTERING]: {
    tier: FeatureTier.OPTIONAL,
    name: 'Advanced Filtering',
    fallbackMessage: 'Advanced filtering is temporarily unavailable. Basic filtering is still available.',
  },
  [Feature.CUSTOM_THEMES]: {
    tier: FeatureTier.OPTIONAL,
    name: 'Custom Themes',
    fallbackMessage: 'Theme customization is temporarily unavailable.',
  },
  [Feature.SCHEDULED_REPORTS]: {
    tier: FeatureTier.OPTIONAL,
    name: 'Scheduled Reports',
    fallbackMessage: 'Scheduled reports are temporarily unavailable.',
  },
};

/**
 * Current system state
 */
interface SystemState {
  status: SystemStatus;
  activeIncidents: Array<{
    severity: IncidentSeverity;
    affectedServices: string[];
  }>;
  affectedServices: string[];
}

/**
 * Get current system state from API or cache
 */
let cachedSystemState: SystemState | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

export async function getSystemState(): Promise<SystemState> {
  const now = Date.now();

  // Return cached state if still fresh
  if (cachedSystemState && now - lastFetchTime < CACHE_DURATION) {
    return cachedSystemState;
  }

  try {
    // TODO: Fetch from Worker 1/2 API
    // const response = await fetch('/api/status/system');
    // const data = await response.json();

    // Mock implementation
    const mockState: SystemState = {
      status: 'operational',
      activeIncidents: [],
      affectedServices: [],
    };

    cachedSystemState = mockState;
    lastFetchTime = now;

    return mockState;
  } catch (error) {
    console.error('Failed to fetch system state:', error);

    // Return cached state if available, otherwise assume degraded
    if (cachedSystemState) {
      return cachedSystemState;
    }

    return {
      status: 'degraded',
      activeIncidents: [],
      affectedServices: ['Status Service'],
    };
  }
}

/**
 * Check if a feature is available based on current system state
 */
export async function isFeatureAvailable(feature: Feature): Promise<boolean> {
  const config = FEATURE_CONFIG[feature];
  const systemState = await getSystemState();

  // Critical features are always available
  if (config.tier === FeatureTier.CRITICAL) {
    return true;
  }

  // Important features are available unless major outage
  if (config.tier === FeatureTier.IMPORTANT) {
    return systemState.status !== 'major_outage';
  }

  // Optional features are only available when fully operational
  if (config.tier === FeatureTier.OPTIONAL) {
    return systemState.status === 'operational';
  }

  return true;
}

/**
 * Get fallback message for disabled feature
 */
export function getFeatureFallbackMessage(feature: Feature): string {
  const config = FEATURE_CONFIG[feature];
  return config.fallbackMessage || `${config.name} is temporarily unavailable.`;
}

/**
 * Get all disabled features for current system state
 */
export async function getDisabledFeatures(): Promise<Feature[]> {
  const disabled: Feature[] = [];

  for (const feature of Object.values(Feature)) {
    const available = await isFeatureAvailable(feature);
    if (!available) {
      disabled.push(feature);
    }
  }

  return disabled;
}

/**
 * React hook for feature availability (for use in components)
 */
export function useFeatureAvailability(feature: Feature): {
  isAvailable: boolean;
  fallbackMessage: string;
  loading: boolean;
} {
  // This would typically use React hooks, but since we're in a .ts file,
  // we'll provide a simple implementation that can be wrapped in a hook
  const [state, setState] = React.useState({
    isAvailable: true,
    loading: true,
  });

  React.useEffect(() => {
    isFeatureAvailable(feature).then((available) => {
      setState({ isAvailable: available, loading: false });
    });
  }, [feature]);

  return {
    ...state,
    fallbackMessage: getFeatureFallbackMessage(feature),
  };
}

// Note: The above React hooks would need to be moved to a separate .tsx file
// For now, we'll export a simple function that can be used

/**
 * Synchronous feature check using cached state
 */
export function isFeatureAvailableSync(feature: Feature): boolean {
  const config = FEATURE_CONFIG[feature];

  // Critical features are always available
  if (config.tier === FeatureTier.CRITICAL) {
    return true;
  }

  // Use cached state if available
  if (cachedSystemState) {
    if (config.tier === FeatureTier.IMPORTANT) {
      return cachedSystemState.status !== 'major_outage';
    }

    if (config.tier === FeatureTier.OPTIONAL) {
      return cachedSystemState.status === 'operational';
    }
  }

  // Default to available if no cached state
  return true;
}

/**
 * Feature gate component props helper
 */
export interface FeatureGateProps {
  feature: Feature;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Cache management
 */
export function clearSystemStateCache(): void {
  cachedSystemState = null;
  lastFetchTime = 0;
}

/**
 * Manual state override (for testing/admin)
 */
export function overrideSystemState(state: Partial<SystemState>): void {
  if (cachedSystemState) {
    cachedSystemState = { ...cachedSystemState, ...state };
  } else {
    cachedSystemState = {
      status: 'operational',
      activeIncidents: [],
      affectedServices: [],
      ...state,
    };
  }
  lastFetchTime = Date.now();
}

/**
 * Get feature tier configuration
 */
export function getFeatureConfig(feature: Feature) {
  return FEATURE_CONFIG[feature];
}

/**
 * Get all features by tier
 */
export function getFeaturesByTier(tier: FeatureTier): Feature[] {
  return Object.entries(FEATURE_CONFIG)
    .filter(([_, config]) => config.tier === tier)
    .map(([feature]) => feature as Feature);
}

// Import React for type checking (remove in actual implementation if not using React hooks)
declare const React: any;
