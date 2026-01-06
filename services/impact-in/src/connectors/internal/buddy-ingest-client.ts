import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('impact-in:buddy-ingest');

export interface BuddyIngestConfig {
  apiUrl: string;
  apiKey?: string;
  mockMode?: boolean;
}

export interface BuddyMatch {
  id: string;
  userId: string;
  buddyId: string;
  matchDate: string;
  status: string;
  focusAreas?: string[];
  goalsSet?: string[];
}

export interface BuddyEvent {
  id: string;
  matchId: string;
  eventType: string;
  eventDate: string;
  duration?: number;
  notes?: string;
  tags?: string[];
}

export interface BuddyIngestResult {
  success: boolean;
  matches: BuddyMatch[];
  events: BuddyEvent[];
  errors: string[];
  metadata: {
    totalRecords: number;
    recordsProcessed: number;
    recordsFailed: number;
    lastSyncTimestamp: string;
  };
}

/**
 * Buddy Ingest Client
 * Pulls buddy matches and events from buddy-connector service
 */
export class BuddyIngestClient {
  private config: BuddyIngestConfig;

  constructor(config: BuddyIngestConfig) {
    this.config = config;
  }

  /**
   * Fetch buddy matches and events
   */
  async fetchBuddyData(
    companyId: string,
    since?: string,
    limit: number = 100
  ): Promise<BuddyIngestResult> {
    if (this.config.mockMode) {
      return this.mockFetchBuddyData(companyId);
    }

    const matches: BuddyMatch[] = [];
    const events: BuddyEvent[] = [];
    const errors: string[] = [];
    let totalRecords = 0;
    let recordsProcessed = 0;
    let recordsFailed = 0;

    try {
      // Fetch matches
      const matchesResponse = await this.fetchMatches(companyId, since, limit);
      matches.push(...matchesResponse.matches);
      totalRecords += matchesResponse.totalRecords;
      recordsProcessed += matchesResponse.recordsProcessed;
      recordsFailed += matchesResponse.recordsFailed;
      errors.push(...matchesResponse.errors);

      // Fetch events
      const eventsResponse = await this.fetchEvents(companyId, since, limit);
      events.push(...eventsResponse.events);
      totalRecords += eventsResponse.totalRecords;
      recordsProcessed += eventsResponse.recordsProcessed;
      recordsFailed += eventsResponse.recordsFailed;
      errors.push(...eventsResponse.errors);

      logger.info('Buddy data fetched', {
        companyId,
        totalRecords,
        recordsProcessed,
        recordsFailed,
      });

      return {
        success: errors.length === 0,
        matches,
        events,
        errors,
        metadata: {
          totalRecords,
          recordsProcessed,
          recordsFailed,
          lastSyncTimestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      logger.error('Failed to fetch buddy data', { error: error.message });
      return {
        success: false,
        matches,
        events,
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

  private async fetchMatches(
    companyId: string,
    since?: string,
    limit: number = 100
  ): Promise<{
    matches: BuddyMatch[];
    totalRecords: number;
    recordsProcessed: number;
    recordsFailed: number;
    errors: string[];
  }> {
    const queryParams = new URLSearchParams({
      company_id: companyId,
      limit: limit.toString(),
      ...(since && { since }),
    });

    const response = await fetch(
      `${this.config.apiUrl}/v1/matches?${queryParams}`,
      {
        headers: {
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Buddy API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const matches: BuddyMatch[] = [];
    const errors: string[] = [];
    let recordsProcessed = 0;
    let recordsFailed = 0;

    for (const match of data.matches || []) {
      try {
        matches.push({
          id: match.id,
          userId: match.user_id || match.mentee_id,
          buddyId: match.buddy_id || match.mentor_id,
          matchDate: match.matched_at || match.created_at,
          status: match.status,
          focusAreas: match.focus_areas,
          goalsSet: match.goals,
        });
        recordsProcessed++;
      } catch (error: any) {
        logger.error('Failed to map buddy match', {
          matchId: match.id,
          error: error.message,
        });
        errors.push(`Match ${match.id}: ${error.message}`);
        recordsFailed++;
      }
    }

    return {
      matches,
      totalRecords: data.matches?.length || 0,
      recordsProcessed,
      recordsFailed,
      errors,
    };
  }

  private async fetchEvents(
    companyId: string,
    since?: string,
    limit: number = 100
  ): Promise<{
    events: BuddyEvent[];
    totalRecords: number;
    recordsProcessed: number;
    recordsFailed: number;
    errors: string[];
  }> {
    const queryParams = new URLSearchParams({
      company_id: companyId,
      limit: limit.toString(),
      ...(since && { since }),
    });

    const response = await fetch(
      `${this.config.apiUrl}/v1/events?${queryParams}`,
      {
        headers: {
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Buddy API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const events: BuddyEvent[] = [];
    const errors: string[] = [];
    let recordsProcessed = 0;
    let recordsFailed = 0;

    for (const event of data.events || []) {
      try {
        events.push({
          id: event.id,
          matchId: event.match_id,
          eventType: event.event_type || event.type,
          eventDate: event.event_date || event.occurred_at,
          duration: event.duration_minutes,
          notes: event.notes,
          tags: event.tags,
        });
        recordsProcessed++;
      } catch (error: any) {
        logger.error('Failed to map buddy event', {
          eventId: event.id,
          error: error.message,
        });
        errors.push(`Event ${event.id}: ${error.message}`);
        recordsFailed++;
      }
    }

    return {
      events,
      totalRecords: data.events?.length || 0,
      recordsProcessed,
      recordsFailed,
      errors,
    };
  }

  private async mockFetchBuddyData(companyId: string): Promise<BuddyIngestResult> {
    logger.info('[MOCK] Fetching buddy data', { companyId });

    const mockMatches: BuddyMatch[] = [
      {
        id: 'buddy-match-001',
        userId: crypto.randomUUID(),
        buddyId: crypto.randomUUID(),
        matchDate: '2024-01-10T00:00:00Z',
        status: 'active',
        focusAreas: ['language_practice', 'job_search'],
        goalsSet: ['Improve conversational Norwegian', 'Prepare for job interviews'],
      },
    ];

    const mockEvents: BuddyEvent[] = [
      {
        id: 'buddy-event-001',
        matchId: 'buddy-match-001',
        eventType: 'check_in',
        eventDate: '2024-02-15T10:00:00Z',
        duration: 60,
        notes: 'Discussed job application strategies',
        tags: ['productive', 'career_focused'],
      },
    ];

    return {
      success: true,
      matches: mockMatches,
      events: mockEvents,
      errors: [],
      metadata: {
        totalRecords: 2,
        recordsProcessed: 2,
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
      return false;
    }
  }
}
