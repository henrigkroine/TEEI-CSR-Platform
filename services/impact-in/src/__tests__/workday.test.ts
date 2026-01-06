import { describe, it, expect } from 'vitest';
import { mapToWorkday } from '../connectors/workday/mapper.js';
import { WorkdayClient } from '../connectors/workday/client.js';

describe('Workday Mapper', () => {
  it('should map TEEI metrics to Workday format', () => {
    const metrics = {
      companyId: '123e4567-e89b-12d3-a456-426614174000',
      periodStart: '2024-01-01T00:00:00Z',
      periodEnd: '2024-01-31T23:59:59Z',
      participantsCount: 50,
      volunteersCount: 25,
      volunteerHours: 100,
      sessionsCount: 30,
    };

    const result = mapToWorkday(metrics, 'org-123', 'program-1', 'Test Program');

    expect(result.organizationId).toBe('org-123');
    expect(result.reportingPeriod.startDate).toBe('2024-01-01');
    expect(result.reportingPeriod.endDate).toBe('2024-01-31');
    expect(result.volunteerActivities.length).toBeGreaterThanOrEqual(1);
    expect(result.programEnrollments).toHaveLength(1);

    // Check volunteer activities
    const volunteerActivity = result.volunteerActivities.find(
      a => a.activityType === 'volunteer'
    );
    expect(volunteerActivity?.volunteerHours).toBe(100);
    expect(volunteerActivity?.participantCount).toBe(25);
    expect(volunteerActivity?.status).toBe('completed');

    // Check program enrollments
    const enrollment = result.programEnrollments[0];
    expect(enrollment.programId).toBe('program-1');
    expect(enrollment.enrollmentCount).toBe(50);
  });

  it('should include mentorship activity when sessions exist', () => {
    const metrics = {
      companyId: '123e4567-e89b-12d3-a456-426614174000',
      periodStart: '2024-01-01T00:00:00Z',
      periodEnd: '2024-01-31T23:59:59Z',
      participantsCount: 50,
      volunteersCount: 25,
      volunteerHours: 100,
      sessionsCount: 30,
    };

    const result = mapToWorkday(metrics, 'org-123');

    const mentorshipActivity = result.volunteerActivities.find(
      a => a.activityType === 'mentorship'
    );

    expect(mentorshipActivity).toBeDefined();
    expect(mentorshipActivity?.volunteerHours).toBe(45); // 30 sessions * 1.5 hours
    expect(mentorshipActivity?.participantCount).toBe(50);
  });
});

describe('Workday Client', () => {
  it('should send volunteer data in mock mode', async () => {
    const client = new WorkdayClient({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tenantId: 'test-tenant',
      apiUrl: 'https://test.workday.com',
      mockMode: true,
    });

    const payload = {
      organizationId: 'org-123',
      reportingPeriod: {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      },
      volunteerActivities: [
        {
          activityId: 'act-1',
          activityName: 'Test Activity',
          activityType: 'volunteer' as const,
          volunteerHours: 100,
          participantCount: 25,
          activityDate: '2024-01-31',
          status: 'completed' as const,
        },
      ],
      programEnrollments: [
        {
          programId: 'program-1',
          programName: 'Test Program',
          enrollmentCount: 50,
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
        },
      ],
      metadata: {
        source: 'TEEI Platform',
        version: '1.0',
        timestamp: new Date().toISOString(),
      },
    };

    const result = await client.sendVolunteerData(payload);

    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();
    expect(result.activitiesProcessed).toBe(1);
    expect(result.enrollmentsProcessed).toBe(1);
  });

  it('should fail with invalid payload in mock mode', async () => {
    const client = new WorkdayClient({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tenantId: 'test-tenant',
      apiUrl: 'https://test.workday.com',
      mockMode: true,
    });

    const invalidPayload = {
      organizationId: '',
      reportingPeriod: {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      },
      volunteerActivities: [],
      programEnrollments: [],
      metadata: {
        source: 'TEEI Platform',
        version: '1.0',
        timestamp: new Date().toISOString(),
      },
    };

    const result = await client.sendVolunteerData(invalidPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should pass health check in mock mode', async () => {
    const client = new WorkdayClient({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tenantId: 'test-tenant',
      apiUrl: 'https://test.workday.com',
      mockMode: true,
    });

    const health = await client.healthCheck();
    expect(health).toBe(true);
  });
});
