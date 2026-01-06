/**
 * Usage Analytics Client
 *
 * Privacy-respecting analytics client for tracking user behavior
 * in the Corporate Cockpit application.
 */

import {
  EventCategory,
  EventProperties,
  UsageEvent,
  PRIVACY_DEFAULTS,
  NPSResponse,
  StuckSignal,
} from './taxonomy';

/**
 * Analytics Client Configuration
 */
export interface AnalyticsConfig {
  endpoint: string;
  apiKey?: string;
  enableAnalytics: boolean;
  debug?: boolean;
  samplingRate?: number;
  bufferSize?: number; // events to buffer before sending
  flushInterval?: number; // ms between auto-flushes
}

/**
 * Usage Analytics Client
 */
export class UsageAnalyticsClient {
  private config: AnalyticsConfig;
  private buffer: UsageEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private companyId?: string;
  private tenantId?: string;
  private flushTimer?: NodeJS.Timeout;
  private consentGiven: boolean = false;

  constructor(config: AnalyticsConfig) {
    this.config = {
      bufferSize: 10,
      flushInterval: 30000, // 30 seconds
      samplingRate: PRIVACY_DEFAULTS.SAMPLING_RATE,
      debug: false,
      ...config,
    };

    this.sessionId = this.generateSessionId();

    // Check for consent
    this.consentGiven = this.checkConsent();

    if (this.config.enableAnalytics && this.consentGiven) {
      this.startAutoFlush();
      this.trackSessionStart();
    }
  }

  /**
   * Set user context
   */
  setUser(userId: string, companyId?: string, tenantId?: string): void {
    // Hash user ID for privacy
    this.userId = PRIVACY_DEFAULTS.HASH_USER_IDS ? this.hashString(userId) : userId;
    this.companyId = companyId;
    this.tenantId = tenantId;
  }

  /**
   * Request and store analytics consent
   */
  requestConsent(): Promise<boolean> {
    return new Promise((resolve) => {
      // In production, show a consent dialog
      // For now, default to opted-in
      this.consentGiven = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('analytics_consent', 'true');
      }
      resolve(true);
    });
  }

  /**
   * Check if user has given consent
   */
  private checkConsent(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('analytics_consent') === 'true';
  }

  /**
   * Track a custom event
   */
  track(category: EventCategory, event: string, properties: Partial<EventProperties> = {}): void {
    if (!this.config.enableAnalytics || !this.consentGiven) {
      return;
    }

    // Apply sampling
    if (Math.random() > (this.config.samplingRate || 1.0)) {
      return;
    }

    const fullProperties: EventProperties = {
      sessionId: this.sessionId,
      userId: this.userId,
      companyId: this.companyId,
      tenantId: this.tenantId,
      page: typeof window !== 'undefined' ? window.location.pathname : '',
      referrer: typeof window !== 'undefined' ? document.referrer : '',
      locale: typeof navigator !== 'undefined' ? navigator.language : 'en',
      deviceType: this.getDeviceType(),
      browserName: this.getBrowserName(),
      os: this.getOS(),
      screenResolution: typeof window !== 'undefined'
        ? `${window.screen.width}x${window.screen.height}`
        : '',
      timestamp: Date.now(),
      ...properties,
    };

    // Strip PII if enabled
    const cleanedProperties = PRIVACY_DEFAULTS.STRIP_PII
      ? this.stripPII(fullProperties)
      : fullProperties;

    const usageEvent: UsageEvent = {
      category,
      event,
      properties: cleanedProperties,
    };

    this.buffer.push(usageEvent);

    if (this.config.debug) {
      console.log('[Analytics]', usageEvent);
    }

    // Flush if buffer is full
    if (this.buffer.length >= (this.config.bufferSize || 10)) {
      this.flush();
    }
  }

  /**
   * Track page view
   */
  trackPageView(page: string, properties: Partial<EventProperties> = {}): void {
    this.track(EventCategory.PAGE_VIEW, 'page_view', {
      ...properties,
      page,
    });
  }

  /**
   * Track user action
   */
  trackAction(action: string, properties: Partial<EventProperties> = {}): void {
    this.track(EventCategory.USER_ACTION, action, properties);
  }

  /**
   * Track feature usage
   */
  trackFeature(feature: string, properties: Partial<EventProperties> = {}): void {
    this.track(EventCategory.FEATURE_USAGE, feature, properties);
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric: string, value: number, properties: Partial<EventProperties> = {}): void {
    this.track(EventCategory.PERFORMANCE, metric, {
      ...properties,
      value,
    });
  }

  /**
   * Track error
   */
  trackError(error: Error, properties: Partial<EventProperties> = {}): void {
    this.track(EventCategory.ERROR, 'error', {
      ...properties,
      errorMessage: error.message,
      errorStack: error.stack?.substring(0, 500), // limit stack trace size
    });
  }

  /**
   * Track NPS response
   */
  trackNPS(score: number, comment?: string): void {
    const range =
      score <= 6 ? 'detractor' : score <= 8 ? 'passive' : 'promoter';

    this.track(EventCategory.ENGAGEMENT, 'nps_response', {
      score,
      range,
      comment: comment?.substring(0, 500), // limit comment length
    });
  }

  /**
   * Track stuck signal (user appears to be having difficulty)
   */
  trackStuck(action: string, repeatCount: number, errors: string[]): void {
    this.track(EventCategory.ENGAGEMENT, 'stuck_detected', {
      action,
      repeatCount,
      errors: errors.slice(0, 5), // limit to 5 most recent errors
    });
  }

  /**
   * Track session start
   */
  private trackSessionStart(): void {
    this.track(EventCategory.ENGAGEMENT, 'session_start');
  }

  /**
   * Track session end
   */
  trackSessionEnd(): void {
    this.track(EventCategory.ENGAGEMENT, 'session_end');
    this.flush(); // ensure events are sent
  }

  /**
   * Flush buffered events to server
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const events = [...this.buffer];
    this.buffer = [];

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
        },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        console.error('[Analytics] Failed to send events:', response.statusText);
        // Re-buffer events on failure (with limit)
        this.buffer.unshift(...events.slice(-20));
      }
    } catch (error) {
      console.error('[Analytics] Error sending events:', error);
      // Re-buffer events on error (with limit)
      this.buffer.unshift(...events.slice(-20));
    }
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval || 30000);
  }

  /**
   * Stop auto-flush timer
   */
  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    this.trackSessionEnd();
    this.stopAutoFlush();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Hash string (simple implementation - use crypto.subtle in production)
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Strip PII from event properties
   */
  private stripPII(properties: EventProperties): EventProperties {
    const stripped = { ...properties };

    // Remove potentially sensitive fields
    const sensitiveKeys = ['email', 'phone', 'address', 'ssn', 'creditCard'];
    for (const key of sensitiveKeys) {
      if (key in stripped) {
        delete stripped[key];
      }
    }

    return stripped;
  }

  /**
   * Get device type
   */
  private getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    if (typeof window === 'undefined') return 'desktop';

    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * Get browser name
   */
  private getBrowserName(): string {
    if (typeof navigator === 'undefined') return 'unknown';

    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'unknown';
  }

  /**
   * Get OS
   */
  private getOS(): string {
    if (typeof navigator === 'undefined') return 'unknown';

    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'unknown';
  }
}

/**
 * Create and export singleton instance
 */
let analyticsInstance: UsageAnalyticsClient | null = null;

export function initializeAnalytics(config: AnalyticsConfig): UsageAnalyticsClient {
  if (analyticsInstance) {
    return analyticsInstance;
  }

  analyticsInstance = new UsageAnalyticsClient(config);
  return analyticsInstance;
}

export function getAnalytics(): UsageAnalyticsClient | null {
  return analyticsInstance;
}
