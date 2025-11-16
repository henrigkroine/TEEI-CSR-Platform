/**
 * Usage Analytics Event Taxonomy
 *
 * Defines all trackable events in the Corporate Cockpit application.
 * Privacy-respecting: minimal PII, opt-in, differential privacy where applicable.
 */

/**
 * Event Categories
 */
export enum EventCategory {
  PAGE_VIEW = 'page_view',
  USER_ACTION = 'user_action',
  FEATURE_USAGE = 'feature_usage',
  PERFORMANCE = 'performance',
  ERROR = 'error',
  ENGAGEMENT = 'engagement',
}

/**
 * Page View Events
 */
export enum PageViewEvent {
  DASHBOARD_VIEW = 'dashboard_view',
  REPORT_VIEW = 'report_view',
  ADMIN_VIEW = 'admin_view',
  ANALYTICS_VIEW = 'analytics_view',
  SROI_VIEW = 'sroi_view',
  VIS_VIEW = 'vis_view',
  Q2Q_VIEW = 'q2q_view',
  TRENDS_VIEW = 'trends_view',
}

/**
 * User Action Events
 */
export enum UserActionEvent {
  // Navigation
  NAV_CLICK = 'nav_click',
  BREADCRUMB_CLICK = 'breadcrumb_click',
  EXTERNAL_LINK_CLICK = 'external_link_click',

  // Interactions
  FILTER_APPLY = 'filter_apply',
  DATE_RANGE_CHANGE = 'date_range_change',
  SORT_CHANGE = 'sort_change',
  SEARCH = 'search',

  // Data Actions
  EXPORT_CSV = 'export_csv',
  EXPORT_PDF = 'export_pdf',
  EXPORT_PPTX = 'export_pptx',
  SHARE = 'share',
  PRINT = 'print',

  // Admin Actions
  CONFIG_CHANGE = 'config_change',
  THEME_CHANGE = 'theme_change',
  INTEGRATION_TOGGLE = 'integration_toggle',
  SCHEDULE_CREATE = 'schedule_create',
  SCHEDULE_EDIT = 'schedule_edit',
  SCHEDULE_DELETE = 'schedule_delete',

  // Auth
  LOGIN = 'login',
  LOGOUT = 'logout',
  SESSION_TIMEOUT = 'session_timeout',
}

/**
 * Feature Usage Events
 */
export enum FeatureEvent {
  // Dashboard Features
  WIDGET_EXPAND = 'widget_expand',
  WIDGET_COLLAPSE = 'widget_collapse',
  CHART_INTERACTION = 'chart_interaction',
  TOOLTIP_VIEW = 'tooltip_view',

  // Reporting
  REPORT_GENERATE = 'report_generate',
  REPORT_DOWNLOAD = 'report_download',
  REPORT_SHARE = 'report_share',
  WATERMARK_VIEW = 'watermark_view',

  // AI/Q2Q
  Q2Q_QUERY = 'q2q_query',
  Q2Q_RESULT_VIEW = 'q2q_result_view',
  INSIGHT_VIEW = 'insight_view',
  CITATION_CLICK = 'citation_click',

  // Collaboration
  COMMENT_ADD = 'comment_add',
  ANNOTATION_ADD = 'annotation_add',

  // Accessibility
  A11Y_FEATURE_USE = 'a11y_feature_use',
  KEYBOARD_NAV = 'keyboard_nav',
  SCREEN_READER = 'screen_reader',
}

/**
 * Performance Events
 */
export enum PerformanceEvent {
  PAGE_LOAD = 'page_load',
  INTERACTION_DELAY = 'interaction_delay',
  CHART_RENDER = 'chart_render',
  API_LATENCY = 'api_latency',
  CACHE_HIT = 'cache_hit',
  CACHE_MISS = 'cache_miss',
}

/**
 * Error Events
 */
export enum ErrorEvent {
  API_ERROR = 'api_error',
  RENDER_ERROR = 'render_error',
  VALIDATION_ERROR = 'validation_error',
  NETWORK_ERROR = 'network_error',
  AUTH_ERROR = 'auth_error',
}

/**
 * Engagement Events
 */
export enum EngagementEvent {
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  ACTIVE_TIME = 'active_time',
  IDLE_TIME = 'idle_time',
  NPS_RESPONSE = 'nps_response',
  FEEDBACK_SUBMIT = 'feedback_submit',
  STUCK_DETECTED = 'stuck_detected',
}

/**
 * Event Properties (common to all events)
 */
export interface EventProperties {
  // Session Context
  sessionId: string;
  userId?: string; // anonymized/hashed
  tenantId?: string;
  companyId?: string;

  // Page Context
  page: string;
  referrer?: string;
  locale: string;

  // Device Context
  deviceType: 'desktop' | 'tablet' | 'mobile';
  browserName?: string;
  browserVersion?: string;
  os?: string;
  screenResolution?: string;

  // Timing
  timestamp: number; // Unix timestamp in ms

  // Optional custom properties
  [key: string]: any;
}

/**
 * Funnel Stage
 */
export enum FunnelStage {
  // Onboarding
  SIGNUP = 'signup',
  PROFILE_COMPLETE = 'profile_complete',
  FIRST_LOGIN = 'first_login',

  // Activation
  DASHBOARD_VISIT = 'dashboard_visit',
  FIRST_FILTER = 'first_filter',
  FIRST_EXPORT = 'first_export',

  // Engagement
  WEEKLY_ACTIVE = 'weekly_active',
  MONTHLY_ACTIVE = 'monthly_active',
  REPORT_GENERATED = 'report_generated',

  // Retention
  RETURN_VISIT_7D = 'return_visit_7d',
  RETURN_VISIT_30D = 'return_visit_30d',

  // Advanced Usage
  ADMIN_FEATURE_USE = 'admin_feature_use',
  INTEGRATION_ENABLED = 'integration_enabled',
  SCHEDULE_CREATED = 'schedule_created',
}

/**
 * NPS Score Range
 */
export enum NPSRange {
  DETRACTOR = 'detractor', // 0-6
  PASSIVE = 'passive', // 7-8
  PROMOTER = 'promoter', // 9-10
}

/**
 * Usage Analytics Event
 */
export interface UsageEvent {
  category: EventCategory;
  event: string;
  properties: EventProperties;
}

/**
 * Retention Cohort
 */
export interface RetentionCohort {
  cohortDate: string; // YYYY-MM-DD
  cohortSize: number;
  retention: {
    day1: number;
    day7: number;
    day30: number;
    day90: number;
  };
}

/**
 * Funnel Analysis
 */
export interface FunnelAnalysis {
  stages: FunnelStage[];
  counts: number[];
  conversionRates: number[];
  dropoffRates: number[];
  avgTimeToNextStage: number[]; // in seconds
}

/**
 * NPS Survey Response
 */
export interface NPSResponse {
  score: number; // 0-10
  range: NPSRange;
  comment?: string;
  timestamp: number;
  userId?: string; // anonymized
  page: string;
}

/**
 * Stuck Detection Signal
 */
export interface StuckSignal {
  userId?: string; // anonymized
  sessionId: string;
  page: string;
  action: string;
  repeatCount: number; // how many times same action repeated
  timeSinceLastProgress: number; // seconds
  errorsSeen: string[];
  timestamp: number;
}

/**
 * Privacy-preserving defaults
 */
export const PRIVACY_DEFAULTS = {
  // Hash user IDs before sending
  HASH_USER_IDS: true,

  // Strip PII from event properties
  STRIP_PII: true,

  // Add noise to counts (differential privacy)
  ADD_NOISE: true,
  NOISE_EPSILON: 0.1,

  // Sampling rate (reduce data volume)
  SAMPLING_RATE: 1.0, // 100% for now, can reduce to 0.1 (10%) in production

  // Opt-in requirement
  REQUIRE_OPT_IN: true,

  // Data retention
  RETENTION_DAYS: 90,
} as const;
