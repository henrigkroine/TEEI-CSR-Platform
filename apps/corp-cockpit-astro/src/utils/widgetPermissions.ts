import { hasPermission, type Permission, type Role } from '../types/roles';

/**
 * Widget Permission System
 *
 * Controls visibility and functionality of dashboard widgets based on user role
 */

/**
 * Widget identifiers
 */
export const WIDGETS = {
  AT_A_GLANCE: 'at-a-glance',
  SROI_PANEL: 'sroi-panel',
  VIS_PANEL: 'vis-panel',
  Q2Q_FEED: 'q2q-feed',
  TREND_CHART: 'trend-chart',
  EXPORT_BUTTONS: 'export-buttons',
  EVIDENCE_EXPLORER: 'evidence-explorer',
  LINEAGE_DRAWER: 'lineage-drawer',
  REPORT_GENERATOR: 'report-generator',
  SAVED_VIEWS: 'saved-views',
  SHARE_LINKS: 'share-links',
  IMPACTIN_MONITOR: 'impactin-monitor',
} as const;

export type WidgetId = typeof WIDGETS[keyof typeof WIDGETS];

/**
 * Widget-to-permission mapping
 *
 * Defines which permission is required to VIEW each widget
 */
const WIDGET_PERMISSIONS: Record<WidgetId, Permission> = {
  [WIDGETS.AT_A_GLANCE]: 'VIEW_WIDGETS',
  [WIDGETS.SROI_PANEL]: 'VIEW_WIDGETS',
  [WIDGETS.VIS_PANEL]: 'VIEW_WIDGETS',
  [WIDGETS.Q2Q_FEED]: 'VIEW_WIDGETS',
  [WIDGETS.TREND_CHART]: 'VIEW_WIDGETS',
  [WIDGETS.EXPORT_BUTTONS]: 'EXPORT_DATA',
  [WIDGETS.EVIDENCE_EXPLORER]: 'VIEW_EVIDENCE',
  [WIDGETS.LINEAGE_DRAWER]: 'VIEW_EVIDENCE',
  [WIDGETS.REPORT_GENERATOR]: 'GENERATE_REPORTS',
  [WIDGETS.SAVED_VIEWS]: 'CREATE_VIEWS',
  [WIDGETS.SHARE_LINKS]: 'CREATE_SHARE_LINKS',
  [WIDGETS.IMPACTIN_MONITOR]: 'VIEW_IMPACTIN_MONITOR',
};

/**
 * Widget configuration permissions
 *
 * Defines which permission is required to CONFIGURE each widget
 */
const WIDGET_CONFIGURE_PERMISSIONS: Record<WidgetId, Permission> = {
  [WIDGETS.AT_A_GLANCE]: 'CONFIGURE_WIDGETS',
  [WIDGETS.SROI_PANEL]: 'CONFIGURE_WIDGETS',
  [WIDGETS.VIS_PANEL]: 'CONFIGURE_WIDGETS',
  [WIDGETS.Q2Q_FEED]: 'CONFIGURE_WIDGETS',
  [WIDGETS.TREND_CHART]: 'CONFIGURE_WIDGETS',
  [WIDGETS.EXPORT_BUTTONS]: 'EXPORT_DATA',
  [WIDGETS.EVIDENCE_EXPLORER]: 'ADMIN_CONSOLE',
  [WIDGETS.LINEAGE_DRAWER]: 'ADMIN_CONSOLE',
  [WIDGETS.REPORT_GENERATOR]: 'SCHEDULE_REPORTS',
  [WIDGETS.SAVED_VIEWS]: 'DELETE_OTHERS_VIEWS',
  [WIDGETS.SHARE_LINKS]: 'REVOKE_SHARE_LINKS',
  [WIDGETS.IMPACTIN_MONITOR]: 'REPLAY_IMPACTIN_DELIVERY',
};

/**
 * Checks if a user can view a specific widget
 */
export function canViewWidget(role: Role, widgetId: WidgetId): boolean {
  const requiredPermission = WIDGET_PERMISSIONS[widgetId];
  return hasPermission(role, requiredPermission);
}

/**
 * Checks if a user can configure a specific widget
 */
export function canConfigureWidget(role: Role, widgetId: WidgetId): boolean {
  const requiredPermission = WIDGET_CONFIGURE_PERMISSIONS[widgetId];
  return hasPermission(role, requiredPermission);
}

/**
 * Returns a list of widgets the user can view
 */
export function getVisibleWidgets(role: Role): WidgetId[] {
  return (Object.keys(WIDGETS) as Array<keyof typeof WIDGETS>)
    .map((key) => WIDGETS[key])
    .filter((widgetId) => canViewWidget(role, widgetId));
}

/**
 * Returns a list of widgets the user can configure
 */
export function getConfigurableWidgets(role: Role): WidgetId[] {
  return (Object.keys(WIDGETS) as Array<keyof typeof WIDGETS>)
    .map((key) => WIDGETS[key])
    .filter((widgetId) => canConfigureWidget(role, widgetId));
}

/**
 * Widget metadata for UI rendering
 */
export interface WidgetMetadata {
  id: WidgetId;
  name: string;
  description: string;
  requiredPermission: Permission;
  icon?: string;
}

export const WIDGET_METADATA: Record<WidgetId, WidgetMetadata> = {
  [WIDGETS.AT_A_GLANCE]: {
    id: WIDGETS.AT_A_GLANCE,
    name: 'At-a-Glance',
    description: 'High-level overview of key metrics',
    requiredPermission: 'VIEW_WIDGETS',
    icon: '📊',
  },
  [WIDGETS.SROI_PANEL]: {
    id: WIDGETS.SROI_PANEL,
    name: 'SROI Calculator',
    description: 'Social Return on Investment analysis',
    requiredPermission: 'VIEW_WIDGETS',
    icon: '💰',
  },
  [WIDGETS.VIS_PANEL]: {
    id: WIDGETS.VIS_PANEL,
    name: 'VIS Leaderboard',
    description: 'Volunteer Impact Scores and rankings',
    requiredPermission: 'VIEW_WIDGETS',
    icon: '🏆',
  },
  [WIDGETS.Q2Q_FEED]: {
    id: WIDGETS.Q2Q_FEED,
    name: 'Q2Q Insights Feed',
    description: 'Qualitative-to-Quantitative feedback insights',
    requiredPermission: 'VIEW_WIDGETS',
    icon: '💬',
  },
  [WIDGETS.TREND_CHART]: {
    id: WIDGETS.TREND_CHART,
    name: 'Trend Chart',
    description: 'Historical data visualization',
    requiredPermission: 'VIEW_WIDGETS',
    icon: '📈',
  },
  [WIDGETS.EXPORT_BUTTONS]: {
    id: WIDGETS.EXPORT_BUTTONS,
    name: 'Data Export',
    description: 'Export data in multiple formats',
    requiredPermission: 'EXPORT_DATA',
    icon: '⬇️',
  },
  [WIDGETS.EVIDENCE_EXPLORER]: {
    id: WIDGETS.EVIDENCE_EXPLORER,
    name: 'Evidence Explorer',
    description: 'Browse and search evidence sets',
    requiredPermission: 'VIEW_EVIDENCE',
    icon: '🔍',
  },
  [WIDGETS.LINEAGE_DRAWER]: {
    id: WIDGETS.LINEAGE_DRAWER,
    name: 'Data Lineage',
    description: 'Trace metrics to source evidence',
    requiredPermission: 'VIEW_EVIDENCE',
    icon: '🔗',
  },
  [WIDGETS.REPORT_GENERATOR]: {
    id: WIDGETS.REPORT_GENERATOR,
    name: 'Report Generator',
    description: 'Generate custom impact reports',
    requiredPermission: 'GENERATE_REPORTS',
    icon: '📄',
  },
  [WIDGETS.SAVED_VIEWS]: {
    id: WIDGETS.SAVED_VIEWS,
    name: 'Saved Views',
    description: 'Manage saved dashboard configurations',
    requiredPermission: 'CREATE_VIEWS',
    icon: '💾',
  },
  [WIDGETS.SHARE_LINKS]: {
    id: WIDGETS.SHARE_LINKS,
    name: 'Share Links',
    description: 'Create shareable dashboard links',
    requiredPermission: 'CREATE_SHARE_LINKS',
    icon: '🔗',
  },
  [WIDGETS.IMPACTIN_MONITOR]: {
    id: WIDGETS.IMPACTIN_MONITOR,
    name: 'Impact-In Monitor',
    description: 'Track third-party integration deliveries',
    requiredPermission: 'VIEW_IMPACTIN_MONITOR',
    icon: '📡',
  },
};
