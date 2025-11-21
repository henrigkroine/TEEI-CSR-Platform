import { describe, it, expect, beforeEach } from 'vitest';
import { WorkdayIngestClient } from '../connectors/workday/ingest-client.js';

describe('WorkdayIngestClient', () => {
  let client: WorkdayIngestClient;
  const mockCompanyId = 'test-company-123';

  beforeEach(() => {
    client = new WorkdayIngestClient({
      apiUrl: 'https://api.workday.com',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tenantId: 'test-tenant',
      mockMode: true, // Use mock mode for tests
    });
  });

  describe('fetchDirectory', () => {
    it('should fetch directory entries in mock mode', async () => {
      const result = await client.fetchDirectory(mockCompanyId);

      expect(result.success).toBe(true);
      expect(result.directoryEntries).toBeDefined();
      expect(result.directoryEntries.length).toBeGreaterThan(0);
      expect(result.metadata.totalRecords).toBeGreaterThan(0);
      expect(result.metadata.recordsProcessed).toBe(result.directoryEntries.length);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid DirectoryEntry schema', async () => {
      const result = await client.fetchDirectory(mockCompanyId);
      const entry = result.directoryEntries[0];

      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('type', 'ingest.directory.synced');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('data');

      // Validate data structure
      expect(entry.data).toHaveProperty('sourceSystem', 'workday');
      expect(entry.data).toHaveProperty('externalUserId');
      expect(entry.data).toHaveProperty('companyId');
      expect(entry.data).toHaveProperty('email');
      expect(entry.data).toHaveProperty('firstName');
      expect(entry.data).toHaveProperty('lastName');
      expect(entry.data).toHaveProperty('status');
    });

    it('should include PII fields for later redaction', async () => {
      const result = await client.fetchDirectory(mockCompanyId);
      const entry = result.directoryEntries[0];

      // These fields should be present but will be redacted before persistence
      expect(entry.data.email).toBeDefined();
      expect(entry.data.firstName).toBeDefined();
      expect(entry.data.lastName).toBeDefined();
    });

    it('should include organization hierarchy', async () => {
      const result = await client.fetchDirectory(mockCompanyId);
      const entry = result.directoryEntries[0];

      expect(entry.data).toHaveProperty('department');
      expect(entry.data).toHaveProperty('jobTitle');
      expect(entry.data).toHaveProperty('location');
    });

    it('should include employment status', async () => {
      const result = await client.fetchDirectory(mockCompanyId);
      const entry = result.directoryEntries[0];

      expect(entry.data.status).toBeOneOf(['active', 'inactive', 'terminated', 'on_leave']);
      expect(entry.data).toHaveProperty('employeeType');
    });
  });

  describe('healthCheck', () => {
    it('should return true in mock mode', async () => {
      const isHealthy = await client.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });
});
