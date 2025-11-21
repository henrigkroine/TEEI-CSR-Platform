/**
 * Kintell Internal Connector Client
 * Pulls language and mentorship session data from kintell-connector service
 * Ingests internal TEEI event data for impact tracking
 */

import { request } from 'undici';
import { createServiceLogger } from '@teei/shared-utils';
import type {
  KintellSessionCompleted,
  KintellSessionScheduled,
  KintellRatingCreated,
} from '@teei/event-contracts';

const logger = createServiceLogger('impact-in:kintell');

export interface KintellClientConfig {
  baseUrl: string; // Kintell connector service URL
  apiKey?: string; // Internal service API key
  companyId: string;
}

export interface KintellSession {
  sessionId: string;
  externalSessionId?: string;
  sessionType: 'language' | 'mentorship';
  participantId: string;
  volunteerId: string;
  scheduledAt: string;
  completedAt?: string;
  durationMinutes?: number;
  topics?: string[];
  languageLevel?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface KintellRating {
  ratingId: string;
  sessionId: string;
  participantId: string;
  volunteerId: string;
  rating: number;
  feedback?: string;
  createdAt: string;
}

export interface SyncResult {
  sessions: (KintellSessionCompleted | KintellSessionScheduled)[];
  ratings: KintellRatingCreated[];
  errors: string[];
  syncedAt: Date;
}

/**
 * Kintell Internal Connector Client
 */
export class KintellClient {
  private config: KintellClientConfig;

  constructor(config: KintellClientConfig) {
    this.config = config;
  }

  /**
   * Sync Kintell session data since a given timestamp
   * @param since - Fetch sessions updated since this timestamp (ISO 8601)
   * @param limit - Maximum number of records to fetch (default: 500)
   */
  async sync(since?: string, limit: number = 500): Promise<SyncResult> {
    logger.info('Starting Kintell sync', { since, limit });

    const result: SyncResult = {
      sessions: [],
      ratings: [],
      errors: [],
      syncedAt: new Date(),
    };

    try {
      // Fetch sessions
      try {
        const sessions = await this.fetchSessions(since, limit);
        result.sessions = sessions;
      } catch (error: any) {
        logger.error('Failed to fetch sessions', { error: error.message });
        result.errors.push(`Sessions: ${error.message}`);
      }

      // Fetch ratings
      try {
        const ratings = await this.fetchRatings(since, limit);
        result.ratings = ratings;
      } catch (error: any) {
        logger.error('Failed to fetch ratings', { error: error.message });
        result.errors.push(`Ratings: ${error.message}`);
      }

      logger.info('Kintell sync completed', {
        sessions: result.sessions.length,
        ratings: result.ratings.length,
        errors: result.errors.length,
      });

      return result;
    } catch (error: any) {
      logger.error('Kintell sync failed', { error: error.message });
      result.errors.push(`Sync failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Fetch sessions from Kintell connector
   */
  private async fetchSessions(
    since?: string,
    limit: number = 500
  ): Promise<(KintellSessionCompleted | KintellSessionScheduled)[]> {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      companyId: this.config.companyId,
      ...(since && { since }),
    });

    const url = `${this.config.baseUrl}/api/sessions?${queryParams}`;

    logger.debug('Fetching Kintell sessions', { url });

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
      throw new Error(`Kintell API error (${response.statusCode}): ${body}`);
    }

    const data: { sessions: KintellSession[] } = await response.body.json();

    const events: (KintellSessionCompleted | KintellSessionScheduled)[] = [];

    for (const session of data.sessions) {
      try {
        if (session.status === 'completed' && session.completedAt) {
          events.push(this.mapCompletedSession(session));
        } else if (session.status === 'scheduled') {
          events.push(this.mapScheduledSession(session));
        }
      } catch (error: any) {
        logger.warn('Failed to map session', { sessionId: session.sessionId, error: error.message });
      }
    }

    logger.info('Fetched Kintell sessions', { count: events.length });

    return events;
  }

  /**
   * Fetch ratings from Kintell connector
   */
  private async fetchRatings(since?: string, limit: number = 500): Promise<KintellRatingCreated[]> {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      companyId: this.config.companyId,
      ...(since && { since }),
    });

    const url = `${this.config.baseUrl}/api/ratings?${queryParams}`;

    logger.debug('Fetching Kintell ratings', { url });

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
      throw new Error(`Kintell API error (${response.statusCode}): ${body}`);
    }

    const data: { ratings: KintellRating[] } = await response.body.json();

    const events: KintellRatingCreated[] = [];

    for (const rating of data.ratings) {
      try {
        events.push(this.mapRating(rating));
      } catch (error: any) {
        logger.warn('Failed to map rating', { ratingId: rating.ratingId, error: error.message });
      }
    }

    logger.info('Fetched Kintell ratings', { count: events.length });

    return events;
  }

  /**
   * Map Kintell session to completed event
   */
  private mapCompletedSession(session: KintellSession): KintellSessionCompleted {
    return {
      id: crypto.randomUUID(),
      version: 'v1',
      timestamp: new Date().toISOString(),
      type: 'kintell.session.completed',
      data: {
        sessionId: session.sessionId,
        externalSessionId: session.externalSessionId,
        sessionType: session.sessionType,
        participantId: session.participantId,
        volunteerId: session.volunteerId,
        scheduledAt: session.scheduledAt,
        completedAt: session.completedAt!,
        durationMinutes: session.durationMinutes || 60,
        topics: session.topics,
        languageLevel: session.languageLevel,
      },
    };
  }

  /**
   * Map Kintell session to scheduled event
   */
  private mapScheduledSession(session: KintellSession): KintellSessionScheduled {
    return {
      id: crypto.randomUUID(),
      version: 'v1',
      timestamp: new Date().toISOString(),
      type: 'kintell.session.scheduled',
      data: {
        sessionId: session.sessionId,
        externalSessionId: session.externalSessionId,
        sessionType: session.sessionType,
        participantId: session.participantId,
        volunteerId: session.volunteerId,
        scheduledAt: session.scheduledAt,
        durationMinutes: session.durationMinutes || 60,
        topics: session.topics,
      },
    };
  }

  /**
   * Map Kintell rating to event
   */
  private mapRating(rating: KintellRating): KintellRatingCreated {
    return {
      id: crypto.randomUUID(),
      version: 'v1',
      timestamp: new Date().toISOString(),
      type: 'kintell.rating.created',
      data: {
        ratingId: rating.ratingId,
        sessionId: rating.sessionId,
        participantId: rating.participantId,
        volunteerId: rating.volunteerId,
        rating: rating.rating,
        feedback: rating.feedback,
        createdAt: rating.createdAt,
      },
    };
  }

  /**
   * Health check - verify Kintell connector connectivity
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
      logger.error('Kintell health check failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }
}

/**
 * Create Kintell client from environment variables
 */
export function createKintellClient(companyId: string): KintellClient {
  const config: KintellClientConfig = {
    baseUrl: process.env.KINTELL_CONNECTOR_URL || 'http://kintell-connector:3010',
    apiKey: process.env.KINTELL_API_KEY,
    companyId,
  };

  return new KintellClient(config);
}
