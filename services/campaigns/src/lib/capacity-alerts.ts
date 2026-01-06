/**
 * Campaign Capacity Alerts
 *
 * SWARM 6: Agent 3.3 - capacity-tracker
 *
 * Handles sending capacity alerts to appropriate recipients:
 * - 80%: Sales team (upsell opportunity)
 * - 90%: Company admin (expansion recommended)
 * - 100%: Company admin + CS (at capacity)
 * - 110%: Company admin + CS (over capacity, critical)
 */

import type { CapacityAlert } from './capacity-tracker.js';
import postgres from 'postgres';

// ============================================================================
// TYPES
// ============================================================================

export interface AlertMetadata {
  campaignId: string;
  campaignName: string;
  companyId: string;
  companyName: string;
  threshold: string;
  utilizationPercent: number;
  timestamp: Date;
}

export interface NotificationPayload {
  to: string[]; // Email addresses or user IDs
  subject: string;
  template: string;
  data: AlertMetadata & Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  channel: 'email' | 'slack' | 'webhook' | 'in_app';
}

// ============================================================================
// CAPACITY ALERTS MANAGER
// ============================================================================

export class CapacityAlertsManager {
  constructor(
    private sql: postgres.Sql,
    private notificationServiceUrl?: string
  ) {}

  /**
   * Send capacity alert to appropriate recipients
   *
   * @param campaignId - Campaign ID
   * @param threshold - Capacity threshold ('80%' | '90%' | '100%' | '110%')
   */
  async sendCapacityAlert(
    campaignId: string,
    threshold: '80%' | '90%' | '100%' | '110%'
  ): Promise<void> {
    // Get campaign details
    const campaign = await this.getCampaignDetails(campaignId);

    if (!campaign) {
      console.error(`[CapacityAlerts] Campaign ${campaignId} not found`);
      return;
    }

    // Determine recipients based on threshold
    const recipients = this.getRecipients(threshold);

    // Get recipient email addresses
    const recipientEmails = await this.getRecipientEmails(
      campaign.companyId,
      recipients
    );

    if (recipientEmails.length === 0) {
      console.warn(
        `[CapacityAlerts] No recipients found for campaign ${campaignId}, threshold ${threshold}`
      );
      return;
    }

    // Build alert metadata
    const metadata: AlertMetadata = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      companyId: campaign.companyId,
      companyName: campaign.companyName,
      threshold,
      utilizationPercent: this.parseUtilization(campaign.capacityUtilization),
      timestamp: new Date()
    };

    // Determine notification priority
    const priority = this.getPriority(threshold);

    // Build notification payload
    const notification: NotificationPayload = {
      to: recipientEmails,
      subject: this.getSubject(threshold, campaign.name),
      template: this.getTemplate(threshold),
      data: {
        ...metadata,
        message: this.getMessage(threshold, metadata.utilizationPercent),
        actionUrl: this.getActionUrl(campaign.companyId, campaignId),
        recommendations: this.getRecommendations(threshold, campaign)
      },
      priority,
      channel: 'email'
    };

    // Send notification
    await this.sendNotification(notification);

    // Log alert
    await this.logAlert(campaignId, threshold, recipientEmails, metadata);

    console.log(
      `[CapacityAlerts] Sent ${threshold} alert for campaign ${campaign.name} to ${recipientEmails.length} recipients`
    );
  }

  /**
   * Send multiple alerts for a campaign (e.g., when multiple thresholds crossed)
   */
  async sendCapacityAlerts(
    alerts: CapacityAlert[]
  ): Promise<void> {
    for (const alert of alerts) {
      try {
        await this.sendCapacityAlert(alert.campaignId, alert.threshold);
      } catch (error) {
        console.error(
          `[CapacityAlerts] Failed to send alert for campaign ${alert.campaignId}, threshold ${alert.threshold}:`,
          error
        );
      }
    }
  }

  /**
   * Check if alert should be sent (throttling to avoid spam)
   * Returns true if enough time has passed since last alert
   */
  async shouldSendAlert(
    campaignId: string,
    threshold: string
  ): Promise<boolean> {
    const THROTTLE_HOURS = {
      '80%': 24, // Send at most once per day
      '90%': 12, // Send at most twice per day
      '100%': 6, // Send every 6 hours
      '110%': 1  // Send every hour (critical)
    };

    const throttleHours = THROTTLE_HOURS[threshold as keyof typeof THROTTLE_HOURS] || 24;

    const [lastAlert] = await this.sql`
      SELECT sent_at
      FROM capacity_alerts
      WHERE
        campaign_id = ${campaignId}
        AND threshold = ${threshold}
        AND sent_at > NOW() - INTERVAL '${throttleHours} hours'
      ORDER BY sent_at DESC
      LIMIT 1
    `;

    // If no recent alert, send it
    return !lastAlert;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async getCampaignDetails(campaignId: string): Promise<any | null> {
    const [campaign] = await this.sql`
      SELECT
        c.id,
        c.name,
        c.company_id,
        comp.name as company_name,
        c.capacity_utilization,
        c.pricing_model,
        c.current_volunteers,
        c.target_volunteers,
        c.committed_seats,
        c.credit_allocation,
        c.credits_remaining
      FROM campaigns c
      LEFT JOIN companies comp ON c.company_id = comp.id
      WHERE c.id = ${campaignId}
      LIMIT 1
    `;

    if (!campaign) return null;

    return {
      id: campaign.id,
      name: campaign.name,
      companyId: campaign.company_id,
      companyName: campaign.company_name,
      capacityUtilization: campaign.capacity_utilization,
      pricingModel: campaign.pricing_model,
      currentVolunteers: campaign.current_volunteers,
      targetVolunteers: campaign.target_volunteers,
      committedSeats: campaign.committed_seats,
      creditAllocation: campaign.credit_allocation,
      creditsRemaining: campaign.credits_remaining
    };
  }

  private getRecipients(threshold: string): Array<'sales' | 'company_admin' | 'cs'> {
    switch (threshold) {
      case '80%':
        return ['sales']; // Upsell opportunity
      case '90%':
        return ['company_admin']; // Expansion recommended
      case '100%':
        return ['company_admin', 'cs']; // At capacity
      case '110%':
        return ['company_admin', 'cs']; // Over capacity (critical)
      default:
        return [];
    }
  }

  private async getRecipientEmails(
    companyId: string,
    recipients: Array<'sales' | 'company_admin' | 'cs'>
  ): Promise<string[]> {
    const emails: string[] = [];

    for (const recipient of recipients) {
      switch (recipient) {
        case 'sales':
          // TODO: Replace with actual sales team lookup
          // For now, use a configured sales email
          emails.push('sales@teei-platform.com');
          break;

        case 'company_admin':
          // Get company admin emails
          const admins = await this.sql`
            SELECT DISTINCT u.email
            FROM users u
            WHERE
              u.company_id = ${companyId}
              AND u.role IN ('admin', 'owner')
              AND u.is_active = true
          `;
          emails.push(...admins.map(a => a.email));
          break;

        case 'cs':
          // TODO: Replace with actual CS team lookup
          // For now, use a configured CS email
          emails.push('customer-success@teei-platform.com');
          break;
      }
    }

    return [...new Set(emails)]; // Remove duplicates
  }

  private getPriority(threshold: string): 'low' | 'normal' | 'high' | 'critical' {
    switch (threshold) {
      case '80%':
        return 'low';
      case '90%':
        return 'normal';
      case '100%':
        return 'high';
      case '110%':
        return 'critical';
      default:
        return 'normal';
    }
  }

  private getSubject(threshold: string, campaignName: string): string {
    switch (threshold) {
      case '80%':
        return `[TEEI] Upsell Opportunity: ${campaignName} at 80% capacity`;
      case '90%':
        return `[TEEI] Campaign Approaching Capacity: ${campaignName}`;
      case '100%':
        return `[TEEI] Campaign At Full Capacity: ${campaignName}`;
      case '110%':
        return `[TEEI CRITICAL] Campaign Over Capacity: ${campaignName}`;
      default:
        return `[TEEI] Capacity Alert: ${campaignName}`;
    }
  }

  private getTemplate(threshold: string): string {
    // These would map to templates in the notifications service
    switch (threshold) {
      case '80%':
        return 'capacity-upsell-opportunity';
      case '90%':
        return 'capacity-expansion-recommended';
      case '100%':
        return 'capacity-at-limit';
      case '110%':
        return 'capacity-over-limit-critical';
      default:
        return 'capacity-alert-generic';
    }
  }

  private getMessage(threshold: string, utilizationPercent: number): string {
    switch (threshold) {
      case '80%':
        return `Campaign is performing well at ${utilizationPercent}% capacity. This is a great opportunity to upsell additional seats or credits.`;
      case '90%':
        return `Campaign is approaching full capacity at ${utilizationPercent}%. We recommend expanding the campaign to accommodate more participants.`;
      case '100%':
        return `Campaign has reached full capacity at ${utilizationPercent}%. New enrollments may be limited. Consider expansion immediately.`;
      case '110%':
        return `CRITICAL: Campaign has exceeded maximum capacity at ${utilizationPercent}%. New enrollments are blocked. Immediate action required.`;
      default:
        return `Campaign capacity alert at ${utilizationPercent}%.`;
    }
  }

  private getActionUrl(companyId: string, campaignId: string): string {
    // URL to campaign dashboard in Corporate Cockpit
    return `https://cockpit.teei-platform.com/en/cockpit/${companyId}/campaigns/${campaignId}`;
  }

  private getRecommendations(threshold: string, campaign: any): string[] {
    const recommendations: string[] = [];

    switch (threshold) {
      case '80%':
        recommendations.push('Review campaign performance metrics (SROI, VIS)');
        recommendations.push('Identify opportunities to expand volunteer base');
        recommendations.push('Prepare upsell proposal with pricing options');
        break;

      case '90%':
        recommendations.push('Contact company admin to discuss expansion');
        recommendations.push('Prepare capacity expansion proposal');
        recommendations.push('Review budget and resource availability');
        break;

      case '100%':
        recommendations.push('Immediately contact company to expand capacity');
        recommendations.push('Review waitlist and pending enrollments');
        recommendations.push('Consider launching a parallel campaign cohort');
        break;

      case '110%':
        recommendations.push('URGENT: Expand capacity or pause new enrollments');
        recommendations.push('Review and approve pending enrollments manually');
        recommendations.push('Escalate to Customer Success team');
        recommendations.push('Consider emergency capacity increase');
        break;
    }

    // Add model-specific recommendations
    if (campaign.pricingModel === 'seats') {
      recommendations.push(`Current: ${campaign.currentVolunteers} volunteers, Committed: ${campaign.committedSeats} seats`);
      recommendations.push('Consider purchasing additional seat licenses');
    } else if (campaign.pricingModel === 'credits') {
      recommendations.push(`Credits remaining: ${campaign.creditsRemaining} / ${campaign.creditAllocation}`);
      recommendations.push('Consider purchasing additional impact credits');
    }

    return recommendations;
  }

  private async sendNotification(notification: NotificationPayload): Promise<void> {
    if (this.notificationServiceUrl) {
      // Send to actual notification service
      try {
        const response = await fetch(`${this.notificationServiceUrl}/api/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(notification)
        });

        if (!response.ok) {
          throw new Error(`Notification service returned ${response.status}`);
        }
      } catch (error) {
        console.error('[CapacityAlerts] Failed to send notification:', error);
        // Fallback: log to console
        console.log('[CapacityAlerts] NOTIFICATION (fallback):', notification);
      }
    } else {
      // Development mode: log to console
      console.log('[CapacityAlerts] NOTIFICATION:', notification);
    }
  }

  private async logAlert(
    campaignId: string,
    threshold: string,
    recipients: string[],
    metadata: AlertMetadata
  ): Promise<void> {
    try {
      // Log to capacity_alerts table for audit trail
      await this.sql`
        INSERT INTO capacity_alerts (
          campaign_id,
          threshold,
          utilization_percent,
          recipients,
          metadata,
          sent_at
        ) VALUES (
          ${campaignId},
          ${threshold},
          ${metadata.utilizationPercent},
          ${JSON.stringify(recipients)},
          ${JSON.stringify(metadata)},
          NOW()
        )
      `;
    } catch (error) {
      // If table doesn't exist, just log to console
      console.warn('[CapacityAlerts] Could not log alert to database:', error);
    }
  }

  private parseUtilization(utilization: any): number {
    if (typeof utilization === 'number') {
      return Math.round(utilization * 100);
    }
    if (typeof utilization === 'string') {
      return Math.round(parseFloat(utilization) * 100);
    }
    return 0;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new CapacityAlertsManager instance
 */
export function createCapacityAlertsManager(
  sql: postgres.Sql,
  notificationServiceUrl?: string
): CapacityAlertsManager {
  return new CapacityAlertsManager(sql, notificationServiceUrl);
}
