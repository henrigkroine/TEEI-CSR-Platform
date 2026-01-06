/**
 * Buddy Internal Connector Client
 * Pulls buddy match and event data from buddy-connector service
 */

import { request } from 'undici';
import { createServiceLogger } from '@teei/shared-utils';
import type {
  BuddyMatchCreated,
  BuddyEventLogged,
  BuddyCheckinCompleted,
  BuddyFeedbackSubmitted,
} from '@teei/event-contracts';

const logger = createServiceLogger('impact-in:buddy');

export interface BuddyClientConfig {
  baseUrl: string;
  apiKey?: string;
  companyId: string;
}

export interface BuddyMatch {
  matchId: string;
  participantId: string;
  buddyId: string;
  matchedAt: string;
  matchingCriteria?: {
    language?: string;
    interests?: string[];
    location?: string;
  };
  status: 'active' | 'ended';
}

export interface BuddyEvent {
  eventId: string;
  matchId: string;
  eventType: 'meetup' | 'activity' | 'checkin' | 'milestone';
  loggedAt: string;
  description?: string;
  durationMinutes?: number;
  location?: string;
}

export interface BuddyCheckin {
  checkinId: string;
  matchId: string;
  participantId: string;
  buddyId: string;
  completedAt: string;
  wellbeingScore?: number;
  progressNotes?: string;
}

export interface BuddyFeedback {
  feedbackId: string;
  matchId: string;
  submittedBy: string;
  rating: number;
  comments?: string;
  submittedAt: string;
}

export interface SyncResult {
  matches: BuddyMatchCreated[];
  events: BuddyEventLogged[];
  checkins: BuddyCheckinCompleted[];
  feedback: BuddyFeedbackSubmitted[];
  errors: string[];
  syncedAt: Date;
}

/**
 * Buddy Internal Connector Client
 */
export class BuddyClient {
  private config: BuddyClientConfig;

  constructor(config: BuddyClientConfig) {
    this.config = config;
  }

  /**
   * Sync buddy system data since a given timestamp
   */
  async sync(since?: string, limit: number = 500): Promise<SyncResult> {
    logger.info('Starting Buddy sync', { since, limit });

    const result: SyncResult = {
      matches: [],
      events: [],
      checkins: [],
      feedback: [],
      errors: [],
      syncedAt: new Date(),
    };

    try {
      // Fetch matches
      try {
        const matches = await this.fetchMatches(since, limit);
        result.matches = matches;
      } catch (error: any) {
        logger.error('Failed to fetch matches', { error: error.message });
        result.errors.push(`Matches: ${error.message}`);
      }

      // Fetch events
      try {
        const events = await this.fetchEvents(since, limit);
        result.events = events;
      } catch (error: any) {
        logger.error('Failed to fetch events', { error: error.message });
        result.errors.push(`Events: ${error.message}`);
      }

      // Fetch checkins
      try {
        const checkins = await this.fetchCheckins(since, limit);
        result.checkins = checkins;
      } catch (error: any) {
        logger.error('Failed to fetch checkins', { error: error.message });
        result.errors.push(`Checkins: ${error.message}`);
      }

      // Fetch feedback
      try {
        const feedback = await this.fetchFeedback(since, limit);
        result.feedback = feedback;
      } catch (error: any) {
        logger.error('Failed to fetch feedback', { error: error.message });
        result.errors.push(`Feedback: ${error.message}`);
      }

      logger.info('Buddy sync completed', {
        matches: result.matches.length,
        events: result.events.length,
        checkins: result.checkins.length,
        feedback: result.feedback.length,
        errors: result.errors.length,
      });

      return result;
    } catch (error: any) {
      logger.error('Buddy sync failed', { error: error.message });
      result.errors.push(`Sync failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Fetch buddy matches
   */
  private async fetchMatches(since?: string, limit: number = 500): Promise<BuddyMatchCreated[]> {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      companyId: this.config.companyId,
      ...(since && { since }),
    });

    const url = `${this.config.baseUrl}/api/matches?${queryParams}`;

    logger.debug('Fetching buddy matches', { url });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    const response = await request(url, {
      method: 'GET',
      headers,
    });

    if (response.statusCode !== 200) {
      const body = await response.body.text();
      throw new Error(`Buddy API error (${response.statusCode}): ${body}`);
    }

    const data: { matches: BuddyMatch[] } = await response.body.json();

    const events: BuddyMatchCreated[] = [];

    for (const match of data.matches) {
      try {
        events.push(this.mapMatch(match));
      } catch (error: any) {
        logger.warn('Failed to map match', { matchId: match.matchId, error: error.message });
      }
    }

    logger.info('Fetched buddy matches', { count: events.length });

    return events;
  }

  /**
   * Fetch buddy events
   */
  private async fetchEvents(since?: string, limit: number = 500): Promise<BuddyEventLogged[]> {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      companyId: this.config.companyId,
      ...(since && { since }),
    });

    const url = `${this.config.baseUrl}/api/events?${queryParams}`;

    logger.debug('Fetching buddy events', { url });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    const response = await request(url, {
      method: 'GET',
      headers,
    });

    if (response.statusCode !== 200) {
      const body = await response.body.text();
      throw new Error(`Buddy API error (${response.statusCode}): ${body}`);
    }

    const data: { events: BuddyEvent[] } = await response.body.json();

    const events: BuddyEventLogged[] = [];

    for (const event of data.events) {
      try {
        events.push(this.mapEvent(event));
      } catch (error: any) {
        logger.warn('Failed to map event', { eventId: event.eventId, error: error.message });
      }
    }

    logger.info('Fetched buddy events', { count: events.length });

    return events;
  }

  /**
   * Fetch buddy checkins
   */
  private async fetchCheckins(since?: string, limit: number = 500): Promise<BuddyCheckinCompleted[]> {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      companyId: this.config.companyId,
      ...(since && { since }),
    });

    const url = `${this.config.baseUrl}/api/checkins?${queryParams}`;

    logger.debug('Fetching buddy checkins', { url });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    const response = await request(url, {
      method: 'GET',
      headers,
    });

    if (response.statusCode !== 200) {
      const body = await response.body.text();
      throw new Error(`Buddy API error (${response.statusCode}): ${body}`);
    }

    const data: { checkins: BuddyCheckin[] } = await response.body.json();

    const events: BuddyCheckinCompleted[] = [];

    for (const checkin of data.checkins) {
      try {
        events.push(this.mapCheckin(checkin));
      } catch (error: any) {
        logger.warn('Failed to map checkin', { checkinId: checkin.checkinId, error: error.message });
      }
    }

    logger.info('Fetched buddy checkins', { count: events.length });

    return events;
  }

  /**
   * Fetch buddy feedback
   */
  private async fetchFeedback(since?: string, limit: number = 500): Promise<BuddyFeedbackSubmitted[]> {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      companyId: this.config.companyId,
      ...(since && { since }),
    });

    const url = `${this.config.baseUrl}/api/feedback?${queryParams}`;

    logger.debug('Fetching buddy feedback', { url });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    const response = await request(url, {
      method: 'GET',
      headers,
    });

    if (response.statusCode !== 200) {
      const body = await response.body.text();
      throw new Error(`Buddy API error (${response.statusCode}): ${body}`);
    }

    const data: { feedback: BuddyFeedback[] } = await response.body.json();

    const events: BuddyFeedbackSubmitted[] = [];

    for (const feedback of data.feedback) {
      try {
        events.push(this.mapFeedback(feedback));
      } catch (error: any) {
        logger.warn('Failed to map feedback', { feedbackId: feedback.feedbackId, error: error.message });
      }
    }

    logger.info('Fetched buddy feedback', { count: events.length });

    return events;
  }

  /**
   * Map buddy match to event
   */
  private mapMatch(match: BuddyMatch): BuddyMatchCreated {
    return {
      id: crypto.randomUUID(),
      version: 'v1',
      timestamp: new Date().toISOString(),
      type: 'buddy.match.created',
      data: {
        matchId: match.matchId,
        participantId: match.participantId,
        buddyId: match.buddyId,
        matchedAt: match.matchedAt,
        matchingCriteria: match.matchingCriteria,
      },
    };
  }

  /**
   * Map buddy event to event logged
   */
  private mapEvent(event: BuddyEvent): BuddyEventLogged {
    return {
      id: crypto.randomUUID(),
      version: 'v1',
      timestamp: new Date().toISOString(),
      type: 'buddy.event.logged',
      data: {
        eventId: event.eventId,
        matchId: event.matchId,
        eventType: event.eventType,
        loggedAt: event.loggedAt,
        description: event.description,
        durationMinutes: event.durationMinutes,
        location: event.location,
      },
    };
  }

  /**
   * Map buddy checkin to event
   */
  private mapCheckin(checkin: BuddyCheckin): BuddyCheckinCompleted {
    return {
      id: crypto.randomUUID(),
      version: 'v1',
      timestamp: new Date().toISOString(),
      type: 'buddy.checkin.completed',
      data: {
        checkinId: checkin.checkinId,
        matchId: checkin.matchId,
        participantId: checkin.participantId,
        buddyId: checkin.buddyId,
        completedAt: checkin.completedAt,
        wellbeingScore: checkin.wellbeingScore,
        progressNotes: checkin.progressNotes,
      },
    };
  }

  /**
   * Map buddy feedback to event
   */
  private mapFeedback(feedback: BuddyFeedback): BuddyFeedbackSubmitted {
    return {
      id: crypto.randomUUID(),
      version: 'v1',
      timestamp: new Date().toISOString(),
      type: 'buddy.feedback.submitted',
      data: {
        feedbackId: feedback.feedbackId,
        matchId: feedback.matchId,
        submittedBy: feedback.submittedBy,
        rating: feedback.rating,
        comments: feedback.comments,
        submittedAt: feedback.submittedAt,
      },
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${this.config.baseUrl}/health`;

      const headers: Record<string, string> = {};
      if (this.config.apiKey) {
        headers['X-API-Key'] = this.config.apiKey;
      }

      const response = await request(url, {
        method: 'GET',
        headers,
      });

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return { success: true };
      }

      return { success: false, error: `HTTP ${response.statusCode}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * Create Buddy client from environment variables
 */
export function createBuddyClient(companyId: string): BuddyClient {
  const config: BuddyClientConfig = {
    baseUrl: process.env.BUDDY_CONNECTOR_URL || 'http://buddy-connector:3012',
    apiKey: process.env.BUDDY_API_KEY,
    companyId,
  };

  return new BuddyClient(config);
}
