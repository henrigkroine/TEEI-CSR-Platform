import { describe, it, expect } from 'vitest';
import { mapToBenevity, TEEIMetricsSchema } from '../connectors/benevity/mapper.js';
import { BenevityClient } from '../connectors/benevity/client.js';

describe('Benevity Mapper', () => {
  it('should map TEEI metrics to Benevity format', () => {
    const metrics = {
      companyId: '123e4567-e89b-12d3-a456-426614174000',
      periodStart: '2024-01-01T00:00:00Z',
      periodEnd: '2024-01-31T23:59:59Z',
      participantsCount: 50,
      volunteersCount: 25,
      volunteerHours: 100,
      sessionsCount: 30,
      avgIntegrationScore: 0.85,
      avgLanguageLevel: 7.5,
      avgJobReadiness: 0.75,
    };

    const result = mapToBenevity(metrics, 'org-123', 'program-1', 'Test Program');

    expect(result.organizationId).toBe('org-123');
    expect(result.programId).toBe('program-1');
    expect(result.programName).toBe('Test Program');
    expect(result.reportingPeriod.startDate).toBe('2024-01-01');
    expect(result.reportingPeriod.endDate).toBe('2024-01-31');
    expect(result.metrics).toHaveLength(7); // 4 base + 3 outcome scores

    // Check volunteer hours metric
    const volunteerHoursMetric = result.metrics.find(m => m.metricType === 'volunteer_hours');
    expect(volunteerHoursMetric?.metricValue).toBe(100);
    expect(volunteerHoursMetric?.metricUnit).toBe('hours');

    // Check integration score
    const integrationMetric = result.metrics.find(
      m => m.metricType === 'outcome_score' && m.category === 'integration'
    );
    expect(integrationMetric?.metricValue).toBe(0.85);
  });

  it('should validate TEEI metrics schema', () => {
    const validMetrics = {
      companyId: '123e4567-e89b-12d3-a456-426614174000',
      periodStart: '2024-01-01T00:00:00Z',
      periodEnd: '2024-01-31T23:59:59Z',
      participantsCount: 50,
      volunteersCount: 25,
      volunteerHours: 100,
      sessionsCount: 30,
    };

    const result = TEEIMetricsSchema.safeParse(validMetrics);
    expect(result.success).toBe(true);
  });

  it('should reject invalid metrics', () => {
    const invalidMetrics = {
      companyId: 'not-a-uuid',
      periodStart: '2024-01-01T00:00:00Z',
      periodEnd: '2024-01-31T23:59:59Z',
      participantsCount: -5, // Negative value
      volunteersCount: 25,
      volunteerHours: 100,
      sessionsCount: 30,
    };

    const result = TEEIMetricsSchema.safeParse(invalidMetrics);
    expect(result.success).toBe(false);
  });
});

describe('Benevity Client', () => {
  it('should send impact data in mock mode', async () => {
    const client = new BenevityClient({
      apiKey: 'test-key',
      webhookUrl: 'https://test.com/webhook',
      mockMode: true,
    });

    const payload = {
      organizationId: 'org-123',
      programId: 'program-1',
      reportingPeriod: {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      },
      metrics: [
        {
          metricType: 'volunteer_hours' as const,
          metricValue: 100,
          metricUnit: 'hours',
        },
      ],
      programName: 'Test Program',
      timestamp: new Date().toISOString(),
    };

    const result = await client.sendImpactData(payload);

    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();
    expect(result.message).toContain('Mock');
  });

  it('should fail with invalid payload in mock mode', async () => {
    const client = new BenevityClient({
      apiKey: 'test-key',
      webhookUrl: 'https://test.com/webhook',
      mockMode: true,
    });

    const invalidPayload = {
      organizationId: '',
      programId: 'program-1',
      reportingPeriod: {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      },
      metrics: [],
      programName: 'Test Program',
      timestamp: new Date().toISOString(),
    };

    const result = await client.sendImpactData(invalidPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should pass health check in mock mode', async () => {
    const client = new BenevityClient({
      apiKey: 'test-key',
      webhookUrl: 'https://test.com/webhook',
      mockMode: true,
    });

    const health = await client.healthCheck();
    expect(health).toBe(true);
  });
});
