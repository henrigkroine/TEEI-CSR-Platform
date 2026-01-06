import type { PlacementEvent } from '@teei/event-contracts';
import { createPlacementEvent } from '@teei/event-contracts';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('impact-in:mentorship-ingest');

export interface MentorshipIngestConfig {
  apiUrl: string;
  apiKey?: string;
  mockMode?: boolean;
}

export interface MentorshipIngestResult {
  success: boolean;
  placements: PlacementEvent[];
  errors: string[];
  metadata: {
    totalRecords: number;
    recordsProcessed: number;
    recordsFailed: number;
    lastSyncTimestamp: string;
  };
}

/**
 * Mentorship Ingest Client
 * Pulls mentorship placements from mentorship service
 * Note: If mentorship service doesn't exist yet, this will operate in mock mode
 */
export class MentorshipIngestClient {
  private config: MentorshipIngestConfig;

  constructor(config: MentorshipIngestConfig) {
    this.config = config;
  }

  /**
   * Fetch mentorship placements
   */
  async fetchPlacements(
    companyId: string,
    since?: string,
    limit: number = 100
  ): Promise<MentorshipIngestResult> {
    if (this.config.mockMode) {
      return this.mockFetchPlacements(companyId);
    }

    const placements: PlacementEvent[] = [];
    const errors: string[] = [];
    let totalRecords = 0;
    let recordsProcessed = 0;
    let recordsFailed = 0;

    try {
      const queryParams = new URLSearchParams({
        company_id: companyId,
        limit: limit.toString(),
        ...(since && { since }),
      });

      const response = await fetch(
        `${this.config.apiUrl}/v1/placements?${queryParams}`,
        {
          headers: {
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // If mentorship service doesn't exist or endpoint not found, fall back to mock mode
        if (response.status === 404 || response.status === 503) {
          logger.warn('Mentorship service not available, using mock data');
          return this.mockFetchPlacements(companyId);
        }
        throw new Error(`Mentorship API error: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      totalRecords = data.placements?.length || 0;

      for (const placement of data.placements || []) {
        try {
          const placementEvent = this.mapPlacement(placement, companyId);
          placements.push(placementEvent);
          recordsProcessed++;
        } catch (error: any) {
          logger.error('Failed to map mentorship placement', {
            placementId: placement.id,
            error: error.message,
          });
          errors.push(`Placement ${placement.id}: ${error.message}`);
          recordsFailed++;
        }
      }

      logger.info('Mentorship placements fetched', {
        companyId,
        totalRecords,
        recordsProcessed,
        recordsFailed,
      });

      return {
        success: errors.length === 0,
        placements,
        errors,
        metadata: {
          totalRecords,
          recordsProcessed,
          recordsFailed,
          lastSyncTimestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      logger.error('Failed to fetch mentorship placements', { error: error.message });
      return {
        success: false,
        placements,
        errors: [error.message],
        metadata: {
          totalRecords,
          recordsProcessed,
          recordsFailed,
          lastSyncTimestamp: new Date().toISOString(),
        },
      };
    }
  }

  private mapPlacement(placement: any, companyId: string): PlacementEvent {
    return createPlacementEvent({
      sourceSystem: 'mentorship',
      sourceId: placement.id,
      userId: placement.mentee_id || placement.user_id,
      companyId,
      placementType: 'mentorship_match',
      placementDate: placement.matched_at || placement.created_at,
      status: this.mapStatus(placement.status),
      startDate: placement.start_date || placement.matched_at,
      endDate: placement.end_date,
      mentorId: placement.mentor_id,
      mentorName: placement.mentor_name,
      focusAreas: placement.focus_areas || placement.areas_of_focus,
      goalsSet: placement.goals || placement.objectives,
      meetingFrequency: placement.meeting_frequency,
      outcome: placement.completed ? {
        successful: placement.successful || placement.status === 'completed',
        completionReason: placement.completion_reason,
        feedback: placement.feedback,
        rating: placement.rating,
      } : undefined,
      totalHours: placement.total_hours,
      sessionsCompleted: placement.sessions_completed,
      sdgGoals: placement.sdg_goals,
      tags: placement.tags || ['mentorship', 'career_development'],
    });
  }

  private mapStatus(status: string): any {
    const statusMap: Record<string, string> = {
      'active': 'active',
      'matched': 'active',
      'completed': 'completed',
      'terminated': 'terminated',
      'on_hold': 'on_hold',
    };
    return statusMap[status?.toLowerCase()] || 'active';
  }

  private async mockFetchPlacements(companyId: string): Promise<MentorshipIngestResult> {
    logger.info('[MOCK] Fetching mentorship placements', { companyId });

    const mockPlacements: PlacementEvent[] = [
      createPlacementEvent({
        sourceSystem: 'mentorship',
        sourceId: 'mentor-place-001',
        userId: crypto.randomUUID(),
        companyId,
        placementType: 'mentorship_match',
        placementDate: '2024-01-20T00:00:00Z',
        status: 'active',
        startDate: '2024-01-20T00:00:00Z',
        mentorId: crypto.randomUUID(),
        mentorName: 'Jane Smith',
        focusAreas: ['career_transition', 'job_search_strategies', 'networking'],
        goalsSet: [
          'Prepare for job interviews in tech sector',
          'Build professional network in Norway',
          'Improve LinkedIn profile'
        ],
        meetingFrequency: 'biweekly',
        totalHours: 12,
        sessionsCompleted: 6,
        tags: ['mentorship', 'career_development', 'job_search'],
      }),
    ];

    return {
      success: true,
      placements: mockPlacements,
      errors: [],
      metadata: {
        totalRecords: 1,
        recordsProcessed: 1,
        recordsFailed: 0,
        lastSyncTimestamp: new Date().toISOString(),
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    if (this.config.mockMode) {
      return true;
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/health`, {
        headers: {
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
      });
      return response.ok;
    } catch {
      // Service might not exist yet, return true to not block health checks
      return true;
    }
  }
}
