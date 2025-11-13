import { db } from '@teei/shared-schema';
import { companies } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';
import { mapToBenevityFormat } from '../connectors/benevity/mapper.js';
import { mapToGooderaFormat } from '../connectors/goodera/mapper.js';
import { mapToWorkdayFormat } from '../connectors/workday/mapper.js';

const logger = createServiceLogger('impact-in-preview');

export type Platform = 'benevity' | 'goodera' | 'workday';

/**
 * Generate preview payload for a scheduled delivery
 * This shows what would be sent without actually delivering
 */
export async function generatePreviewPayload(companyId: string, platform: Platform) {
  try {
    logger.info(`Generating preview for company ${companyId}, platform ${platform}`);

    // Get company details
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));

    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }

    // Fetch current data and format for preview
    // Note: In production, this would fetch real metrics from analytics service
    const mockMetrics = {
      totalEmployees: 1000,
      activeParticipants: 750,
      totalHoursVolunteered: 5000,
      totalDonationAmount: 50000,
      averageEngagementScore: 85,
      impactScore: 7.8,
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      },
    };

    let payload: any;

    switch (platform) {
      case 'benevity':
        payload = mapToBenevityFormat(companyId, mockMetrics);
        break;
      case 'goodera':
        payload = mapToGooderaFormat(companyId, mockMetrics);
        break;
      case 'workday':
        payload = mapToWorkdayFormat(companyId, mockMetrics);
        break;
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }

    return {
      success: true,
      preview: {
        companyId,
        companyName: company.name,
        platform,
        payload,
        generatedAt: new Date().toISOString(),
        note: 'This is a preview. No actual delivery will be made.',
      },
    };
  } catch (error: any) {
    logger.error(`Error generating preview:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get preview for a specific schedule
 */
export async function getSchedulePreview(scheduleId: string) {
  try {
    const { scheduledDeliveries } = await import('@teei/shared-schema');

    const [schedule] = await db
      .select()
      .from(scheduledDeliveries)
      .where(eq(scheduledDeliveries.id, scheduleId));

    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    return await generatePreviewPayload(schedule.companyId, schedule.platform as Platform);
  } catch (error: any) {
    logger.error(`Error getting schedule preview:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
}
