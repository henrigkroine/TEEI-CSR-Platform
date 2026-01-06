/**
 * Adoption Tracker - Success Telemetry for Corporate Cockpit
 *
 * Tracks user adoption metrics using OpenTelemetry:
 * - Activation: First login tracking
 * - FTUE (First Time User Experience): Onboarding completion
 * - TTFV (Time to First Value): First meaningful interaction
 * - Engagement: WAU/MAU, actions per session, feature usage
 * - Retention: Week-over-week user return
 * - Value Realization: Delivery success, report generation, exports
 *
 * Built on top of existing RUM infrastructure from /src/monitoring/rum.ts
 *
 * @module utils/adoption-tracker
 * @see /docs/success/adoption_metrics.md
 */

/**
 * OpenTelemetry Types
 *
 * In production, these would come from @opentelemetry/api
 * For now, we define minimal interfaces to avoid package dependencies
 */
interface OTelSpan {
  setAttribute(key: string, value: string | number | boolean): void;
  addEvent(name: string, attributes?: Record<string, any>): void;
  end(): void;
}

interface OTelTracer {
  startSpan(name: string): OTelSpan;
}

/**
 * Adoption Event Types
 */
export enum AdoptionEvent {
  // Activation events
  USER_LOGIN_SUCCESS = 'user.login.success',
  USER_ACTIVATION = 'user.activation',

  // FTUE events
  ONBOARDING_STEP = 'user.ftue.step',
  ONBOARDING_COMPLETE = 'user.ftue.completed',

  // TTFV events
  DASHBOARD_FIRST_VIEW = 'dashboard.first_view',
  REPORT_FIRST_GENERATED = 'report.first_generated',
  EXPORT_FIRST_DOWNLOADED = 'export.first_downloaded',

  // Engagement events
  WIDGET_INTERACTED = 'widget.interacted',
  REPORT_GENERATED = 'report.generated',
  EXPORT_DOWNLOADED = 'export.downloaded',
  FILTER_APPLIED = 'filter.applied',
  SEARCH_PERFORMED = 'search.performed',

  // Session events
  SESSION_STARTED = 'user.session.started',
  SESSION_ENDED = 'user.session.ended',

  // Feature usage
  FEATURE_USED = 'feature.used',

  // Value realization
  DELIVERY_OUTCOME = 'impact_in.delivery.outcome',
}

/**
 * Onboarding steps
 */
export type OnboardingStep =
  | 'profile_setup'
  | 'role_selected'
  | 'dashboard_viewed'
  | 'tutorial_completed';

/**
 * Feature identifiers
 */
export type FeatureId =
  | 'dashboard'
  | 'reports'
  | 'exports'
  | 'approvals'
  | 'audit_mode'
  | 'partner_portal'
  | 'benchmarks'
  | 'consent_ui'
  | 'sso'
  | 'scim'
  | 'executive_pack';

/**
 * Report types
 */
export type ReportType = 'executive' | 'operational' | 'custom' | 'benchmark';

/**
 * Export formats
 */
export type ExportFormat = 'pdf' | 'csv' | 'json' | 'pptx';

/**
 * Adoption Tracker Configuration
 */
export interface AdoptionTrackerConfig {
  /** Enable adoption tracking */
  enabled: boolean;
  /** OpenTelemetry endpoint */
  otlpEndpoint?: string;
  /** Service name for traces */
  serviceName: string;
  /** Sample rate (0-1, where 1 = 100%) */
  sampleRate: number;
  /** Enable debug logging */
  debug: boolean;
  /** Enable privacy mode (anonymize user data) */
  privacyMode: boolean;
}

const DEFAULT_CONFIG: AdoptionTrackerConfig = {
  enabled: true,
  otlpEndpoint: import.meta.env.PUBLIC_OTEL_ENDPOINT || 'http://localhost:4318/v1/traces',
  serviceName: 'corp-cockpit-astro',
  sampleRate: 1.0,
  debug: import.meta.env.DEV || false,
  privacyMode: true,
};

/**
 * Session data
 */
interface SessionData {
  sessionId: string;
  userId: string;
  startedAt: number;
  lastActivityAt: number;
  actionCount: number;
  featuresUsed: Set<FeatureId>;
}

/**
 * User properties (anonymized)
 */
interface UserProperties {
  userId: string; // Hashed
  tenantId: string; // Hashed
  role?: string;
  isFirstLogin?: boolean;
  activatedAt?: number;
}

/**
 * Adoption Tracker Service
 */
export class AdoptionTracker {
  private config: AdoptionTrackerConfig;
  private isInitialized = false;
  private tracer: OTelTracer | null = null;
  private currentSession: SessionData | null = null;
  private userProperties: UserProperties | null = null;
  private sessionTimeout: NodeJS.Timeout | null = null;
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  constructor(config: Partial<AdoptionTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize adoption tracking
   */
  async initialize(userProps?: UserProperties): Promise<void> {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') return;

    // Check sampling
    if (Math.random() > this.config.sampleRate) {
      if (this.config.debug) {
        console.log('[AdoptionTracker] User not sampled');
      }
      return;
    }

    // Set user properties (anonymized if privacy mode enabled)
    if (userProps) {
      this.userProperties = this.config.privacyMode
        ? this.anonymizeUserProperties(userProps)
        : userProps;
    }

    // Initialize OpenTelemetry tracer
    await this.initializeTracer();

    // Track page visibility changes
    this.setupVisibilityTracking();

    // Track session idle timeout
    this.setupActivityTracking();

    this.isInitialized = true;

    if (this.config.debug) {
      console.log('[AdoptionTracker] Initialized', this.userProperties);
    }
  }

  /**
   * Initialize OpenTelemetry tracer
   */
  private async initializeTracer(): Promise<void> {
    // In production, this would use @opentelemetry/sdk-trace-web
    // For now, we'll create a mock tracer that sends events directly
    this.tracer = {
      startSpan: (name: string): OTelSpan => {
        const span = {
          attributes: {} as Record<string, any>,
          events: [] as Array<{ name: string; attributes?: Record<string, any> }>,

          setAttribute(key: string, value: string | number | boolean) {
            this.attributes[key] = value;
          },

          addEvent(name: string, attributes?: Record<string, any>) {
            this.events.push({ name, attributes });
          },

          end() {
            // Send span to OTLP endpoint
            if (this.config.enabled && this.config.otlpEndpoint) {
              this.sendSpan(name, this.attributes, this.events);
            }
          }.bind(this),
        };

        return span;
      },
    };
  }

  /**
   * Send span data to OpenTelemetry collector
   */
  private async sendSpan(
    name: string,
    attributes: Record<string, any>,
    events: Array<{ name: string; attributes?: Record<string, any> }>
  ): Promise<void> {
    try {
      // Add common attributes
      const enrichedAttributes = {
        ...attributes,
        'service.name': this.config.serviceName,
        'user.id': this.userProperties?.userId,
        'tenant.id': this.userProperties?.tenantId,
        'user.role': this.userProperties?.role,
        timestamp: Date.now(),
      };

      // In production, send to OTLP endpoint using fetch or beacon
      if (this.config.debug) {
        console.log('[AdoptionTracker] Span:', name, enrichedAttributes, events);
      }

      // Send to backend analytics endpoint (non-blocking)
      const payload = {
        spanName: name,
        attributes: enrichedAttributes,
        events,
        timestamp: Date.now(),
      };

      navigator.sendBeacon('/api/analytics/adoption', JSON.stringify(payload));
    } catch (error) {
      console.error('[AdoptionTracker] Failed to send span:', error);
    }
  }

  /**
   * Anonymize user properties for privacy
   */
  private anonymizeUserProperties(props: UserProperties): UserProperties {
    return {
      userId: this.hashId(props.userId),
      tenantId: this.hashId(props.tenantId),
      role: props.role,
      isFirstLogin: props.isFirstLogin,
      activatedAt: props.activatedAt,
    };
  }

  /**
   * Hash ID for privacy (simple implementation)
   */
  private hashId(id: string): string {
    // In production, use a proper hashing algorithm
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `usr_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Track user activation (first login)
   */
  trackActivation(data: {
    userId: string;
    tenantId: string;
    invitedAt: number;
    activatedAt: number;
  }): void {
    if (!this.isInitialized || !this.tracer) return;

    const timeTaken = Math.floor((data.activatedAt - data.invitedAt) / (1000 * 60 * 60 * 24)); // days

    const span = this.tracer.startSpan(AdoptionEvent.USER_ACTIVATION);
    span.setAttribute('user.id', this.hashId(data.userId));
    span.setAttribute('tenant.id', this.hashId(data.tenantId));
    span.setAttribute('invited_at', data.invitedAt);
    span.setAttribute('activated_at', data.activatedAt);
    span.setAttribute('time_taken_days', timeTaken);
    span.setAttribute('is_first_login', true);
    span.end();

    if (this.config.debug) {
      console.log('[AdoptionTracker] Activation tracked:', { timeTaken });
    }
  }

  /**
   * Track login success
   */
  trackLoginSuccess(isFirstLogin: boolean = false): void {
    if (!this.isInitialized || !this.tracer) return;

    const span = this.tracer.startSpan(AdoptionEvent.USER_LOGIN_SUCCESS);
    span.setAttribute('is_first_login', isFirstLogin);
    span.setAttribute('timestamp', Date.now());
    span.end();

    // Start new session
    if (!this.currentSession) {
      this.startSession();
    }
  }

  /**
   * Track onboarding step
   */
  trackOnboardingStep(step: OnboardingStep): void {
    if (!this.isInitialized || !this.tracer) return;

    const span = this.tracer.startSpan(AdoptionEvent.ONBOARDING_STEP);
    span.setAttribute('step', step);
    span.setAttribute('timestamp', Date.now());
    span.end();

    if (this.config.debug) {
      console.log('[AdoptionTracker] Onboarding step:', step);
    }
  }

  /**
   * Track onboarding completion
   */
  trackOnboardingComplete(data: {
    stepsCompleted: number;
    totalSteps: number;
    timeTaken: number; // minutes
  }): void {
    if (!this.isInitialized || !this.tracer) return;

    const span = this.tracer.startSpan(AdoptionEvent.ONBOARDING_COMPLETE);
    span.setAttribute('steps_completed', data.stepsCompleted);
    span.setAttribute('total_steps', data.totalSteps);
    span.setAttribute('time_taken_minutes', data.timeTaken);
    span.setAttribute('completion_rate', (data.stepsCompleted / data.totalSteps) * 100);
    span.end();

    if (this.config.debug) {
      console.log('[AdoptionTracker] Onboarding completed:', data);
    }
  }

  /**
   * Track first value realization
   */
  trackFirstValue(action: 'dashboard_view' | 'report_generated' | 'export_downloaded'): void {
    if (!this.isInitialized || !this.tracer) return;

    const event =
      action === 'dashboard_view'
        ? AdoptionEvent.DASHBOARD_FIRST_VIEW
        : action === 'report_generated'
        ? AdoptionEvent.REPORT_FIRST_GENERATED
        : AdoptionEvent.EXPORT_FIRST_DOWNLOADED;

    const span = this.tracer.startSpan(event);
    span.setAttribute('action', action);
    span.setAttribute('timestamp', Date.now());

    // Calculate days since activation if available
    if (this.userProperties?.activatedAt) {
      const daysSinceActivation = Math.floor(
        (Date.now() - this.userProperties.activatedAt) / (1000 * 60 * 60 * 24)
      );
      span.setAttribute('days_since_activation', daysSinceActivation);
    }

    span.end();

    if (this.config.debug) {
      console.log('[AdoptionTracker] First value:', action);
    }
  }

  /**
   * Track widget interaction
   */
  trackWidgetInteraction(widgetName: string, action: string): void {
    if (!this.isInitialized || !this.tracer) return;

    const span = this.tracer.startSpan(AdoptionEvent.WIDGET_INTERACTED);
    span.setAttribute('widget', widgetName);
    span.setAttribute('action', action);
    span.setAttribute('timestamp', Date.now());
    span.end();

    // Update session activity
    this.updateSessionActivity();
    this.addFeatureToSession('dashboard');
  }

  /**
   * Track report generation
   */
  trackReportGenerated(data: {
    reportType: ReportType;
    format: ExportFormat;
    generationTime: number; // ms
  }): void {
    if (!this.isInitialized || !this.tracer) return;

    const span = this.tracer.startSpan(AdoptionEvent.REPORT_GENERATED);
    span.setAttribute('report_type', data.reportType);
    span.setAttribute('format', data.format);
    span.setAttribute('generation_time_ms', data.generationTime);
    span.setAttribute('timestamp', Date.now());
    span.end();

    // Update session activity
    this.updateSessionActivity();
    this.addFeatureToSession('reports');

    if (this.config.debug) {
      console.log('[AdoptionTracker] Report generated:', data);
    }
  }

  /**
   * Track export download
   */
  trackExport(data: {
    exportType: ExportFormat;
    reportId?: string;
    fileSize: number; // bytes
  }): void {
    if (!this.isInitialized || !this.tracer) return;

    const span = this.tracer.startSpan(AdoptionEvent.EXPORT_DOWNLOADED);
    span.setAttribute('export_type', data.exportType);
    if (data.reportId) {
      span.setAttribute('report_id', data.reportId);
    }
    span.setAttribute('file_size_bytes', data.fileSize);
    span.setAttribute('timestamp', Date.now());
    span.end();

    // Update session activity
    this.updateSessionActivity();
    this.addFeatureToSession('exports');

    if (this.config.debug) {
      console.log('[AdoptionTracker] Export downloaded:', data);
    }
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: FeatureId): void {
    if (!this.isInitialized || !this.tracer) return;

    const span = this.tracer.startSpan(AdoptionEvent.FEATURE_USED);
    span.setAttribute('feature', feature);
    span.setAttribute('timestamp', Date.now());
    span.end();

    // Update session activity
    this.updateSessionActivity();
    this.addFeatureToSession(feature);
  }

  /**
   * Track delivery outcome
   */
  trackDeliveryOutcome(data: {
    deliveryId: string;
    tenantId: string;
    status: 'success' | 'failed';
    errorReason?: string;
    duration: number; // ms
  }): void {
    if (!this.isInitialized || !this.tracer) return;

    const span = this.tracer.startSpan(AdoptionEvent.DELIVERY_OUTCOME);
    span.setAttribute('delivery_id', data.deliveryId);
    span.setAttribute('tenant_id', this.hashId(data.tenantId));
    span.setAttribute('status', data.status);
    if (data.errorReason) {
      span.setAttribute('error_reason', data.errorReason);
    }
    span.setAttribute('duration_ms', data.duration);
    span.setAttribute('timestamp', Date.now());
    span.end();

    if (this.config.debug) {
      console.log('[AdoptionTracker] Delivery outcome:', data);
    }
  }

  /**
   * Start user session
   */
  private startSession(): void {
    if (!this.userProperties) return;

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.currentSession = {
      sessionId,
      userId: this.userProperties.userId,
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      actionCount: 0,
      featuresUsed: new Set<FeatureId>(),
    };

    if (this.tracer) {
      const span = this.tracer.startSpan(AdoptionEvent.SESSION_STARTED);
      span.setAttribute('session_id', sessionId);
      span.end();
    }

    // Reset session timeout
    this.resetSessionTimeout();

    if (this.config.debug) {
      console.log('[AdoptionTracker] Session started:', sessionId);
    }
  }

  /**
   * End user session
   */
  private endSession(): void {
    if (!this.currentSession || !this.tracer) return;

    const duration = Math.floor((Date.now() - this.currentSession.startedAt) / 1000); // seconds

    const span = this.tracer.startSpan(AdoptionEvent.SESSION_ENDED);
    span.setAttribute('session_id', this.currentSession.sessionId);
    span.setAttribute('duration_seconds', duration);
    span.setAttribute('action_count', this.currentSession.actionCount);
    span.setAttribute('features_used_count', this.currentSession.featuresUsed.size);
    span.setAttribute('features_list', Array.from(this.currentSession.featuresUsed).join(','));
    span.end();

    if (this.config.debug) {
      console.log('[AdoptionTracker] Session ended:', {
        duration,
        actions: this.currentSession.actionCount,
        features: this.currentSession.featuresUsed.size,
      });
    }

    this.currentSession = null;
    this.clearSessionTimeout();
  }

  /**
   * Update session activity
   */
  private updateSessionActivity(): void {
    if (!this.currentSession) {
      this.startSession();
      return;
    }

    this.currentSession.lastActivityAt = Date.now();
    this.currentSession.actionCount++;

    // Reset timeout
    this.resetSessionTimeout();
  }

  /**
   * Add feature to session
   */
  private addFeatureToSession(feature: FeatureId): void {
    if (this.currentSession) {
      this.currentSession.featuresUsed.add(feature);
    }
  }

  /**
   * Reset session timeout
   */
  private resetSessionTimeout(): void {
    this.clearSessionTimeout();

    this.sessionTimeout = setTimeout(() => {
      this.endSession();
    }, this.SESSION_TIMEOUT_MS);
  }

  /**
   * Clear session timeout
   */
  private clearSessionTimeout(): void {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
  }

  /**
   * Setup page visibility tracking
   */
  private setupVisibilityTracking(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.endSession();
      } else {
        this.startSession();
      }
    });
  }

  /**
   * Setup activity tracking
   */
  private setupActivityTracking(): void {
    // Track user interactions
    const activityEvents = ['click', 'keydown', 'scroll', 'mousemove'];

    let activityTimeout: NodeJS.Timeout | null = null;

    const handleActivity = () => {
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }

      activityTimeout = setTimeout(() => {
        this.updateSessionActivity();
      }, 1000); // Debounce activity updates
    };

    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
  }

  /**
   * Destroy tracker
   */
  destroy(): void {
    this.endSession();
    this.isInitialized = false;
  }
}

/**
 * Global instance
 */
let trackerInstance: AdoptionTracker | null = null;

/**
 * Get adoption tracker instance
 */
export function getAdoptionTracker(): AdoptionTracker {
  if (!trackerInstance) {
    trackerInstance = new AdoptionTracker();
  }
  return trackerInstance;
}

/**
 * Initialize adoption tracker
 */
export async function initializeAdoptionTracker(
  config?: Partial<AdoptionTrackerConfig>,
  userProps?: UserProperties
): Promise<AdoptionTracker> {
  const tracker = config ? new AdoptionTracker(config) : getAdoptionTracker();
  await tracker.initialize(userProps);
  return tracker;
}

/**
 * Convenience exports
 */
export const trackActivation = (data: {
  userId: string;
  tenantId: string;
  invitedAt: number;
  activatedAt: number;
}) => getAdoptionTracker().trackActivation(data);

export const trackLoginSuccess = (isFirstLogin?: boolean) =>
  getAdoptionTracker().trackLoginSuccess(isFirstLogin);

export const trackOnboardingStep = (step: OnboardingStep) =>
  getAdoptionTracker().trackOnboardingStep(step);

export const trackOnboardingComplete = (data: {
  stepsCompleted: number;
  totalSteps: number;
  timeTaken: number;
}) => getAdoptionTracker().trackOnboardingComplete(data);

export const trackFirstValue = (
  action: 'dashboard_view' | 'report_generated' | 'export_downloaded'
) => getAdoptionTracker().trackFirstValue(action);

export const trackWidgetInteraction = (widgetName: string, action: string) =>
  getAdoptionTracker().trackWidgetInteraction(widgetName, action);

export const trackReportGenerated = (data: {
  reportType: ReportType;
  format: ExportFormat;
  generationTime: number;
}) => getAdoptionTracker().trackReportGenerated(data);

export const trackExport = (data: {
  exportType: ExportFormat;
  reportId?: string;
  fileSize: number;
}) => getAdoptionTracker().trackExport(data);

export const trackFeatureUsage = (feature: FeatureId) =>
  getAdoptionTracker().trackFeatureUsage(feature);

export const trackDeliveryOutcome = (data: {
  deliveryId: string;
  tenantId: string;
  status: 'success' | 'failed';
  errorReason?: string;
  duration: number;
}) => getAdoptionTracker().trackDeliveryOutcome(data);
