/**
 * Stuck Detector
 *
 * Detects when users appear to be having difficulty and creates Jira tickets
 */

import { getAnalytics } from './client';

/**
 * Stuck Signal Configuration
 */
export interface StuckConfig {
  // How many times same action repeated before flagging
  repeatThreshold: number;

  // Time window to detect repeats (ms)
  timeWindow: number;

  // Time since last progress (ms)
  stuckThreshold: number;

  // Enable Jira integration
  jiraEnabled: boolean;

  // Jira project key
  jiraProject?: string;
}

/**
 * Action History Entry
 */
interface ActionEntry {
  action: string;
  timestamp: number;
  page: string;
}

/**
 * Error History Entry
 */
interface ErrorEntry {
  error: string;
  timestamp: number;
}

/**
 * Stuck Detector Class
 */
export class StuckDetector {
  private config: StuckConfig;
  private actionHistory: ActionEntry[] = [];
  private errorHistory: ErrorEntry[] = [];
  private lastProgressTime: number = Date.now();
  private alreadyFlagged: Set<string> = new Set();

  constructor(config: Partial<StuckConfig> = {}) {
    this.config = {
      repeatThreshold: 5,
      timeWindow: 60000, // 1 minute
      stuckThreshold: 300000, // 5 minutes
      jiraEnabled: false,
      ...config,
    };
  }

  /**
   * Track user action
   */
  trackAction(action: string, page: string): void {
    const now = Date.now();

    // Add to history
    this.actionHistory.push({ action, timestamp: now, page });

    // Clean old entries
    this.cleanActionHistory();

    // Check for stuck patterns
    this.checkForStuckPatterns(action, page);
  }

  /**
   * Track error encountered
   */
  trackError(error: string): void {
    this.errorHistory.push({
      error,
      timestamp: Date.now(),
    });

    // Clean old errors
    this.cleanErrorHistory();
  }

  /**
   * Mark progress (user completed something successfully)
   */
  markProgress(): void {
    this.lastProgressTime = Date.now();
  }

  /**
   * Clean old action history
   */
  private cleanActionHistory(): void {
    const cutoff = Date.now() - this.config.timeWindow;
    this.actionHistory = this.actionHistory.filter(
      entry => entry.timestamp > cutoff
    );
  }

  /**
   * Clean old error history
   */
  private cleanErrorHistory(): void {
    const cutoff = Date.now() - this.config.timeWindow;
    this.errorHistory = this.errorHistory.filter(
      entry => entry.timestamp > cutoff
    );
  }

  /**
   * Check for stuck patterns
   */
  private checkForStuckPatterns(currentAction: string, currentPage: string): void {
    const now = Date.now();

    // Count recent repeats of same action
    const recentRepeats = this.actionHistory.filter(
      entry => entry.action === currentAction
    ).length;

    // Time since last progress
    const timeSinceProgress = now - this.lastProgressTime;

    // Check if user appears stuck
    const isRepeatStuck = recentRepeats >= this.config.repeatThreshold;
    const isTimeStuck = timeSinceProgress >= this.config.stuckThreshold;
    const hasErrors = this.errorHistory.length > 0;

    if ((isRepeatStuck || isTimeStuck) && hasErrors) {
      const signalKey = `${currentPage}:${currentAction}`;

      // Only flag once per session per page+action combo
      if (!this.alreadyFlagged.has(signalKey)) {
        this.alreadyFlagged.add(signalKey);
        this.flagStuckUser(currentAction, currentPage, recentRepeats, timeSinceProgress);
      }
    }
  }

  /**
   * Flag stuck user and create Jira ticket
   */
  private async flagStuckUser(
    action: string,
    page: string,
    repeatCount: number,
    timeSinceProgress: number
  ): Promise<void> {
    const errors = this.errorHistory.map(e => e.error);

    // Track stuck signal in analytics
    const analytics = getAnalytics();
    if (analytics) {
      analytics.trackStuck(action, repeatCount, errors);
    }

    // Create Jira ticket if enabled
    if (this.config.jiraEnabled && this.config.jiraProject) {
      await this.createJiraTicket(action, page, repeatCount, timeSinceProgress, errors);
    }

    console.warn('[StuckDetector] User appears stuck', {
      action,
      page,
      repeatCount,
      timeSinceProgress: Math.round(timeSinceProgress / 1000),
      errors,
    });
  }

  /**
   * Create Jira ticket for stuck user
   */
  private async createJiraTicket(
    action: string,
    page: string,
    repeatCount: number,
    timeSinceProgress: number,
    errors: string[]
  ): Promise<void> {
    try {
      const description = `
User appears to be stuck on the Corporate Cockpit.

**Details:**
- Page: ${page}
- Action: ${action}
- Repeat Count: ${repeatCount}
- Time Since Progress: ${Math.round(timeSinceProgress / 1000)}s
- Errors Encountered: ${errors.length}

**Recent Errors:**
${errors.slice(0, 5).map(e => `- ${e}`).join('\n')}

**Recommended Actions:**
1. Review UX for this flow
2. Check for confusing UI elements
3. Verify error messages are helpful
4. Consider adding inline help or tooltips

**Priority:** Medium (affects user experience)
**Labels:** ux-issue, user-stuck, auto-generated
      `.trim();

      const jiraPayload = {
        fields: {
          project: {
            key: this.config.jiraProject,
          },
          summary: `User Stuck: ${action} on ${page}`,
          description,
          issuetype: {
            name: 'Task',
          },
          priority: {
            name: 'Medium',
          },
          labels: ['ux-issue', 'user-stuck', 'auto-generated'],
        },
      };

      // Call Jira API (would need actual endpoint and auth)
      const response = await fetch('/api/v1/jira/create-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jiraPayload),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[StuckDetector] Jira ticket created:', data.key);
      } else {
        console.error('[StuckDetector] Failed to create Jira ticket');
      }
    } catch (error) {
      console.error('[StuckDetector] Error creating Jira ticket:', error);
    }
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.actionHistory = [];
    this.errorHistory = [];
    this.lastProgressTime = Date.now();
    this.alreadyFlagged.clear();
  }
}

/**
 * Global stuck detector instance
 */
let stuckDetectorInstance: StuckDetector | null = null;

export function initializeStuckDetector(config: Partial<StuckConfig> = {}): StuckDetector {
  if (stuckDetectorInstance) {
    return stuckDetectorInstance;
  }

  stuckDetectorInstance = new StuckDetector(config);
  return stuckDetectorInstance;
}

export function getStuckDetector(): StuckDetector | null {
  return stuckDetectorInstance;
}
