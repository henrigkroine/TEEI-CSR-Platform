import type { EnrollmentEvent } from '@teei/event-contracts';
import { createEnrollmentEvent } from '@teei/event-contracts';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('impact-in:upskilling-ingest');

export interface UpskillingIngestConfig {
  apiUrl: string;
  apiKey?: string;
  mockMode?: boolean;
}

export interface UpskillingIngestResult {
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
 * Upskilling Ingest Client
 * Pulls course enrollments and completions from upskilling-connector service
 */
export class UpskillingIngestClient {
  private config: UpskillingIngestConfig;

  constructor(config: UpskillingIngestConfig) {
    this.config = config;
  }

  /**
   * Fetch upskilling course enrollments
   */
  async fetchEnrollments(
    companyId: string,
    since?: string,
    limit: number = 100
  ): Promise<UpskillingIngestResult> {
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
        throw new Error(`Upskilling API error: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      totalRecords = data.enrollments?.length || 0;

      for (const enrollment of data.enrollments || []) {
        try {
          const enrollmentEvent = this.mapEnrollment(enrollment, companyId);
          enrollments.push(enrollmentEvent);
          recordsProcessed++;
        } catch (error: any) {
          logger.error('Failed to map upskilling enrollment', {
            enrollmentId: enrollment.id,
            error: error.message,
          });
          errors.push(`Enrollment ${enrollment.id}: ${error.message}`);
          recordsFailed++;
        }
      }

      logger.info('Upskilling enrollments fetched', {
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
      logger.error('Failed to fetch upskilling enrollments', { error: error.message });
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

  private mapEnrollment(enrollment: any, companyId: string): EnrollmentEvent {
    return createEnrollmentEvent({
      sourceSystem: 'upskilling',
      sourceId: enrollment.id,
      userId: enrollment.user_id,
      companyId,
      programType: 'upskilling_course',
      programId: enrollment.course_id,
      programName: enrollment.course_name || enrollment.title,
      programDescription: enrollment.description,
      enrollmentDate: enrollment.enrolled_at || enrollment.created_at,
      status: this.mapStatus(enrollment.status),
      completionDate: enrollment.completed_at,
      completionPercentage: enrollment.progress || enrollment.completion_percentage,
      outcome: enrollment.completed ? {
        passed: enrollment.passed || enrollment.status === 'completed',
        score: enrollment.score || enrollment.final_score,
        grade: enrollment.grade,
        certificateIssued: enrollment.credential_issued || enrollment.certificate_issued,
        certificateId: enrollment.credential_id || enrollment.certificate_id,
      } : undefined,
      hoursCompleted: enrollment.hours_completed,
      estimatedHours: enrollment.estimated_hours || enrollment.duration_hours,
      sdgGoals: enrollment.sdg_goals,
      tags: enrollment.tags || ['upskilling', 'professional_development'],
      cohortId: enrollment.cohort_id,
      instructorId: enrollment.instructor_id,
    });
  }

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

  private async mockFetchEnrollments(companyId: string): Promise<UpskillingIngestResult> {
    logger.info('[MOCK] Fetching upskilling enrollments', { companyId });

    const mockEnrollments: EnrollmentEvent[] = [
      createEnrollmentEvent({
        sourceSystem: 'upskilling',
        sourceId: 'upskill-enroll-001',
        userId: crypto.randomUUID(),
        companyId,
        programType: 'upskilling_course',
        programId: 'data-analytics-101',
        programName: 'Data Analytics Fundamentals',
        programDescription: 'Introduction to data analysis and visualization',
        enrollmentDate: '2024-02-01T00:00:00Z',
        status: 'completed',
        completionDate: '2024-03-15T00:00:00Z',
        completionPercentage: 100,
        outcome: {
          passed: true,
          score: 92,
          grade: 'A',
          certificateIssued: true,
          certificateId: 'CERT-DA-001',
        },
        hoursCompleted: 40,
        estimatedHours: 40,
        tags: ['upskilling', 'data_analytics', 'career_development'],
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
