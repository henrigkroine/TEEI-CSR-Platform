import { describe, it, expect } from 'vitest';
import { mapToGoodera, createBatchPayload, splitIntoBatches } from '../connectors/goodera/mapper.js';
import { GooderaClient } from '../connectors/goodera/client.js';

describe('Goodera Mapper', () => {
  it('should map TEEI metrics to Goodera format', () => {
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

    const result = mapToGoodera(metrics, 'org-123', 'project-1');

    expect(result.organizationId).toBe('org-123');
    expect(result.projectId).toBe('project-1');
    expect(result.reportingPeriod.from).toBe('2024-01-01');
    expect(result.reportingPeriod.to).toBe('2024-01-31');
    expect(result.impactDimensions.length).toBeGreaterThanOrEqual(4);

    // Check volunteer hours dimension
    const volunteerHoursDim = result.impactDimensions.find(
      d => d.dimensionId === 'volunteer_hours'
    );
    expect(volunteerHoursDim?.value).toBe(100);
    expect(volunteerHoursDim?.unit).toBe('hours');

    // Check integration outcome (converted to percentage)
    const integrationDim = result.impactDimensions.find(
      d => d.dimensionId === 'integration_outcome'
    );
    expect(integrationDim?.value).toBe(85); // 0.85 * 100
    expect(integrationDim?.unit).toBe('percentage');
  });

  it('should create batch payload with max 100 records', () => {
    const payloads = Array(150).fill(null).map((_, i) => ({
      projectId: 'project-1',
      organizationId: 'org-123',
      reportingPeriod: { from: '2024-01-01', to: '2024-01-31' },
      impactDimensions: [],
      metadata: {
        source: 'TEEI Platform',
        timestamp: new Date().toISOString(),
        version: '1.0',
      },
    }));

    const batch = createBatchPayload(payloads);

    expect(batch.records).toHaveLength(100);
  });

  it('should split payloads into batches of 100', () => {
    const payloads = Array(250).fill(null).map((_, i) => ({
      projectId: 'project-1',
      organizationId: 'org-123',
      reportingPeriod: { from: '2024-01-01', to: '2024-01-31' },
      impactDimensions: [],
      metadata: {
        source: 'TEEI Platform',
        timestamp: new Date().toISOString(),
        version: '1.0',
      },
    }));

    const batches = splitIntoBatches(payloads);

    expect(batches).toHaveLength(3);
    expect(batches[0].records).toHaveLength(100);
    expect(batches[1].records).toHaveLength(100);
    expect(batches[2].records).toHaveLength(50);
  });
});

describe('Goodera Client', () => {
  it('should send single impact data in mock mode', async () => {
    const client = new GooderaClient({
      apiKey: 'test-key',
      apiUrl: 'https://test.com/api',
      mockMode: true,
    });

    const payload = {
      projectId: 'project-1',
      organizationId: 'org-123',
      reportingPeriod: { from: '2024-01-01', to: '2024-01-31' },
      impactDimensions: [
        {
          dimensionId: 'volunteer_hours',
          dimensionName: 'Volunteer Hours',
          value: 100,
          unit: 'hours',
        },
      ],
      metadata: {
        source: 'TEEI Platform',
        timestamp: new Date().toISOString(),
        version: '1.0',
      },
    };

    const result = await client.sendImpactData(payload);

    expect(result.success).toBe(true);
    expect(result.recordsProcessed).toBe(1);
    expect(result.transactionId).toBeDefined();
  });

  it('should send batch impact data in mock mode', async () => {
    const client = new GooderaClient({
      apiKey: 'test-key',
      apiUrl: 'https://test.com/api',
      mockMode: true,
    });

    const batch = {
      records: Array(50).fill(null).map(() => ({
        projectId: 'project-1',
        organizationId: 'org-123',
        reportingPeriod: { from: '2024-01-01', to: '2024-01-31' },
        impactDimensions: [],
        metadata: {
          source: 'TEEI Platform',
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      })),
    };

    const result = await client.sendBatchImpactData(batch);

    expect(result.success).toBe(true);
    expect(result.recordsProcessed).toBe(50);
  });

  it('should reject batch with more than 100 records', async () => {
    const client = new GooderaClient({
      apiKey: 'test-key',
      apiUrl: 'https://test.com/api',
      mockMode: true,
    });

    const batch = {
      records: Array(101).fill(null).map(() => ({
        projectId: 'project-1',
        organizationId: 'org-123',
        reportingPeriod: { from: '2024-01-01', to: '2024-01-31' },
        impactDimensions: [],
        metadata: {
          source: 'TEEI Platform',
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      })),
    };

    const result = await client.sendBatchImpactData(batch);

    expect(result.success).toBe(false);
    expect(result.error).toContain('exceeds maximum');
  });

  it('should pass health check in mock mode', async () => {
    const client = new GooderaClient({
      apiKey: 'test-key',
      apiUrl: 'https://test.com/api',
      mockMode: true,
    });

    const health = await client.healthCheck();
    expect(health).toBe(true);
  });
});
