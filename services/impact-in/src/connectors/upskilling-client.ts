/**
 * Upskilling Internal Connector Client
 * Pulls course completion and credential data from upskilling-connector service
 */

import { request } from 'undici';
import { createServiceLogger } from '@teei/shared-utils';
import type {
  UpskillingCourseCompleted,
  UpskillingCredentialIssued,
  UpskillingProgressUpdated,
} from '@teei/event-contracts';

const logger = createServiceLogger('impact-in:upskilling');

export interface UpskillingClientConfig {
  baseUrl: string;
  apiKey?: string;
  companyId: string;
}

export interface UpskillingCourse {
  courseId: string;
  userId: string;
  courseName: string;
  courseProvider: string;
  completedAt?: string;
  progressPercent?: number;
  certificateUrl?: string;
  status: 'in_progress' | 'completed';
}

export interface UpskillingCredential {
  credentialId: string;
  userId: string;
  credentialType: string;
  credentialName: string;
  issuer: string;
  issuedAt: string;
  expiresAt?: string;
  verificationUrl?: string;
}

export interface SyncResult {
  courses: (UpskillingCourseCompleted | UpskillingProgressUpdated)[];
  credentials: UpskillingCredentialIssued[];
  errors: string[];
  syncedAt: Date;
}

/**
 * Upskilling Internal Connector Client
 */
export class UpskillingClient {
  private config: UpskillingClientConfig;

  constructor(config: UpskillingClientConfig) {
    this.config = config;
  }

  /**
   * Sync upskilling data since a given timestamp
   */
  async sync(since?: string, limit: number = 500): Promise<SyncResult> {
    logger.info('Starting Upskilling sync', { since, limit });

    const result: SyncResult = {
      courses: [],
      credentials: [],
      errors: [],
      syncedAt: new Date(),
    };

    try {
      // Fetch courses
      try {
        const courses = await this.fetchCourses(since, limit);
        result.courses = courses;
      } catch (error: any) {
        logger.error('Failed to fetch courses', { error: error.message });
        result.errors.push(`Courses: ${error.message}`);
      }

      // Fetch credentials
      try {
        const credentials = await this.fetchCredentials(since, limit);
        result.credentials = credentials;
      } catch (error: any) {
        logger.error('Failed to fetch credentials', { error: error.message });
        result.errors.push(`Credentials: ${error.message}`);
      }

      logger.info('Upskilling sync completed', {
        courses: result.courses.length,
        credentials: result.credentials.length,
        errors: result.errors.length,
      });

      return result;
    } catch (error: any) {
      logger.error('Upskilling sync failed', { error: error.message });
      result.errors.push(`Sync failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Fetch courses from upskilling connector
   */
  private async fetchCourses(
    since?: string,
    limit: number = 500
  ): Promise<(UpskillingCourseCompleted | UpskillingProgressUpdated)[]> {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      companyId: this.config.companyId,
      ...(since && { since }),
    });

    const url = `${this.config.baseUrl}/api/courses?${queryParams}`;

    logger.debug('Fetching upskilling courses', { url });

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
      throw new Error(`Upskilling API error (${response.statusCode}): ${body}`);
    }

    const data: { courses: UpskillingCourse[] } = await response.body.json();

    const events: (UpskillingCourseCompleted | UpskillingProgressUpdated)[] = [];

    for (const course of data.courses) {
      try {
        if (course.status === 'completed' && course.completedAt) {
          events.push(this.mapCourseCompleted(course));
        } else if (course.status === 'in_progress' && course.progressPercent !== undefined) {
          events.push(this.mapProgressUpdated(course));
        }
      } catch (error: any) {
        logger.warn('Failed to map course', { courseId: course.courseId, error: error.message });
      }
    }

    logger.info('Fetched upskilling courses', { count: events.length });

    return events;
  }

  /**
   * Fetch credentials from upskilling connector
   */
  private async fetchCredentials(
    since?: string,
    limit: number = 500
  ): Promise<UpskillingCredentialIssued[]> {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      companyId: this.config.companyId,
      ...(since && { since }),
    });

    const url = `${this.config.baseUrl}/api/credentials?${queryParams}`;

    logger.debug('Fetching upskilling credentials', { url });

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
      throw new Error(`Upskilling API error (${response.statusCode}): ${body}`);
    }

    const data: { credentials: UpskillingCredential[] } = await response.body.json();

    const events: UpskillingCredentialIssued[] = [];

    for (const credential of data.credentials) {
      try {
        events.push(this.mapCredential(credential));
      } catch (error: any) {
        logger.warn('Failed to map credential', {
          credentialId: credential.credentialId,
          error: error.message,
        });
      }
    }

    logger.info('Fetched upskilling credentials', { count: events.length });

    return events;
  }

  /**
   * Map course to completed event
   */
  private mapCourseCompleted(course: UpskillingCourse): UpskillingCourseCompleted {
    return {
      id: crypto.randomUUID(),
      version: 'v1',
      timestamp: new Date().toISOString(),
      type: 'upskilling.course.completed',
      data: {
        courseId: course.courseId,
        userId: course.userId,
        courseName: course.courseName,
        provider: course.courseProvider,
        completedAt: course.completedAt!,
        certificateUrl: course.certificateUrl,
      },
    };
  }

  /**
   * Map course to progress updated event
   */
  private mapProgressUpdated(course: UpskillingCourse): UpskillingProgressUpdated {
    return {
      id: crypto.randomUUID(),
      version: 'v1',
      timestamp: new Date().toISOString(),
      type: 'upskilling.progress.updated',
      data: {
        courseId: course.courseId,
        userId: course.userId,
        courseName: course.courseName,
        provider: course.courseProvider,
        progressPercent: course.progressPercent!,
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  /**
   * Map credential to issued event
   */
  private mapCredential(credential: UpskillingCredential): UpskillingCredentialIssued {
    return {
      id: crypto.randomUUID(),
      version: 'v1',
      timestamp: new Date().toISOString(),
      type: 'upskilling.credential.issued',
      data: {
        credentialId: credential.credentialId,
        userId: credential.userId,
        credentialType: credential.credentialType,
        credentialName: credential.credentialName,
        issuer: credential.issuer,
        issuedAt: credential.issuedAt,
        expiresAt: credential.expiresAt,
        verificationUrl: credential.verificationUrl,
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
 * Create Upskilling client from environment variables
 */
export function createUpskillingClient(companyId: string): UpskillingClient {
  const config: UpskillingClientConfig = {
    baseUrl: process.env.UPSKILLING_CONNECTOR_URL || 'http://upskilling-connector:3011',
    apiKey: process.env.UPSKILLING_API_KEY,
    companyId,
  };

  return new UpskillingClient(config);
}
