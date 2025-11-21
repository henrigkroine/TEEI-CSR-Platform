import type { EnrollmentEvent } from '@teei/event-contracts';
import { createEnrollmentEvent } from '@teei/event-contracts';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('impact-in:kintell-ingest');

export interface KintellIngestConfig {
  apiUrl: string; // URL of kintell-connector service
  apiKey?: string;
  mockMode?: boolean;
}

export interface KintellIngestResult {
  success: boolean;
  enrollments: EnrollmentEvent[];
  errors: string[];
  metadata: {
    totalRecords: number;
    recordsProcessed: number;
    recordsFailed: number;
    lastSyncTimestamp: string;
  };
}

/**
 * Kintell (Language) Ingest Client
 * Pulls course enrollments and session data from kintell-connector service
 */
export class KintellIngestClient {
  private config: KintellIngestConfig;

  constructor(config: KintellIngestConfig) {
    this.config = config;
  }

  /**
   * Fetch course enrollments and sessions from Kintell
   */
  async fetchEnrollments(
    companyId: string,
    since?: string,
    limit: number = 100
  ): Promise<KintellIngestResult> {
    if (this.config.mockMode) {
      return this.mockFetchEnrollments(companyId);
    }

    const enrollments: EnrollmentEvent[] = [];
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
        `${this.config.apiUrl}/v1/enrollments?${queryParams}`,
        {
          headers: {
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Kintell API error: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      totalRecords = data.enrollments?.length || 0;

      for (const enrollment of data.enrollments || []) {
        try {
          const enrollmentEvent = this.mapEnrollment(enrollment, companyId);
          enrollments.push(enrollmentEvent);
          recordsProcessed++;
        } catch (error: any) {
          logger.error('Failed to map Kintell enrollment', {
            enrollmentId: enrollment.id,
            error: error.message,
          });
          errors.push(`Enrollment ${enrollment.id}: ${error.message}`);
          recordsFailed++;
        }
      }

      logger.info('Kintell enrollments fetched', {
        companyId,
        totalRecords,
        recordsProcessed,
        recordsFailed,
      });

      return {
        success: errors.length === 0,
        enrollments,
        errors,
        metadata: {
          totalRecords,
          recordsProcessed,
          recordsFailed,
          lastSyncTimestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      logger.error('Failed to fetch Kintell enrollments', { error: error.message });
      return {
        success: false,
        enrollments,
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

  /**
   * Map Kintell enrollment to TEEI EnrollmentEvent
   */
  private mapEnrollment(enrollment: any, companyId: string): EnrollmentEvent {
    return createEnrollmentEvent({
      sourceSystem: 'kintell',
      sourceId: enrollment.id || enrollment.session_id,
      userId: enrollment.user_id,
      companyId,
      programType: 'language_course',
      programId: enrollment.course_id || enrollment.program_id,
      programName: enrollment.course_name || enrollment.program_name || 'Language Course',
      programDescription: enrollment.description,
      enrollmentDate: enrollment.enrolled_at || enrollment.created_at,
      status: this.mapStatus(enrollment.status),
      completionDate: enrollment.completed_at,
      completionPercentage: enrollment.progress_percentage,
      outcome: enrollment.completed ? {
        passed: enrollment.passed || enrollment.status === 'completed',
        score: enrollment.final_score,
        grade: enrollment.grade,
        certificateIssued: enrollment.certificate_issued,
        certificateId: enrollment.certificate_id,
      } : undefined,
      hoursCompleted: enrollment.hours_completed || enrollment.total_hours,
      estimatedHours: enrollment.estimated_hours,
      tags: enrollment.tags || ['language', 'integration'],
      cohortId: enrollment.cohort_id,
      instructorId: enrollment.instructor_id,
    });
  }

  /**
   * Map Kintell status to TEEI enrollment status
   */
  private mapStatus(status: string): any {
    const statusMap: Record<string, string> = {
      'enrolled': 'enrolled',
      'active': 'in_progress',
      'in_progress': 'in_progress',
      'completed': 'completed',
      'withdrawn': 'withdrawn',
      'failed': 'failed',
    };
    return statusMap[status?.toLowerCase()] || 'enrolled';
  }

  /**
   * Mock implementation
   */
  private async mockFetchEnrollments(companyId: string): Promise<KintellIngestResult> {
    logger.info('[MOCK] Fetching Kintell enrollments', { companyId });

    const mockEnrollments: EnrollmentEvent[] = [
      createEnrollmentEvent({
        sourceSystem: 'kintell',
        sourceId: 'kintell-enroll-001',
        userId: crypto.randomUUID(),
        companyId,
        programType: 'language_course',
        programId: 'norwegian-b1',
        programName: 'Norwegian Language B1',
        programDescription: 'Intermediate Norwegian language course',
        enrollmentDate: '2024-01-15T00:00:00Z',
        status: 'in_progress',
        completionPercentage: 65,
        hoursCompleted: 32,
        estimatedHours: 50,
        tags: ['language', 'norwegian', 'integration'],
      }),
    ];

    return {
      success: true,
      enrollments: mockEnrollments,
      errors: [],
      metadata: {
        totalRecords: 1,
        recordsProcessed: 1,
        recordsFailed: 0,
        lastSyncTimestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Health check
   */
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
