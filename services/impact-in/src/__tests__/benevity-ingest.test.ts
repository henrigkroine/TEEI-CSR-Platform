import { describe, it, expect, beforeEach } from 'vitest';
import { BenevityIngestClient } from '../connectors/benevity/ingest-client.js';

describe('BenevityIngestClient', () => {
  let client: BenevityIngestClient;
  const mockCompanyId = 'test-company-123';

  beforeEach(() => {
    client = new BenevityIngestClient({
      apiUrl: 'https://api.benevity.com',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tenantId: 'test-tenant',
      mockMode: true, // Use mock mode for tests
    });
  });

  describe('fetchVolunteerActivities', () => {
    it('should fetch volunteer activities in mock mode', async () => {
      const result = await client.fetchVolunteerActivities(mockCompanyId);

      expect(result.success).toBe(true);
      expect(result.volunteers).toBeDefined();
      expect(result.volunteers.length).toBeGreaterThan(0);
      expect(result.metadata.totalRecords).toBeGreaterThan(0);
      expect(result.metadata.recordsProcessed).toBe(result.volunteers.length);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid VolunteerEvent schema', async () => {
      const result = await client.fetchVolunteerActivities(mockCompanyId);
      const volunteer = result.volunteers[0];

      expect(volunteer).toHaveProperty('id');
      expect(volunteer).toHaveProperty('type', 'ingest.volunteer.logged');
      expect(volunteer).toHaveProperty('timestamp');
      expect(volunteer).toHaveProperty('data');

      // Validate data structure
      expect(volunteer.data).toHaveProperty('sourceSystem', 'benevity');
      expect(volunteer.data).toHaveProperty('userId');
      expect(volunteer.data).toHaveProperty('companyId');
      expect(volunteer.data).toHaveProperty('activityName');
      expect(volunteer.data).toHaveProperty('hoursLogged');
      expect(volunteer.data.hoursLogged).toBeGreaterThan(0);
    });

    it('should handle pagination with limit', async () => {
      const result = await client.fetchVolunteerActivities(mockCompanyId, undefined, 50);

      expect(result.success).toBe(true);
      expect(result.volunteers.length).toBeLessThanOrEqual(50);
    });

    it('should filter by since date', async () => {
      const since = new Date('2024-01-01').toISOString();
      const result = await client.fetchVolunteerActivities(mockCompanyId, since);

      expect(result.success).toBe(true);
      // In mock mode, should still return results
      expect(result.volunteers).toBeDefined();
    });
  });

  describe('fetchDonations', () => {
    it('should fetch donations in mock mode', async () => {
      const result = await client.fetchDonations(mockCompanyId);

      expect(result.success).toBe(true);
      expect(result.donations).toBeDefined();
      expect(result.donations.length).toBeGreaterThan(0);
      expect(result.metadata.totalRecords).toBeGreaterThan(0);
      expect(result.metadata.recordsProcessed).toBe(result.donations.length);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid DonationEvent schema', async () => {
      const result = await client.fetchDonations(mockCompanyId);
      const donation = result.donations[0];

      expect(donation).toHaveProperty('id');
      expect(donation).toHaveProperty('type', 'ingest.donation.made');
      expect(donation).toHaveProperty('timestamp');
      expect(donation).toHaveProperty('data');

      // Validate data structure
      expect(donation.data).toHaveProperty('sourceSystem', 'benevity');
      expect(donation.data).toHaveProperty('userId');
      expect(donation.data).toHaveProperty('companyId');
      expect(donation.data).toHaveProperty('amount');
      expect(donation.data).toHaveProperty('currency');
      expect(donation.data.amount).toBeGreaterThan(0);
    });

    it('should include company match information when present', async () => {
      const result = await client.fetchDonations(mockCompanyId);
      const donation = result.donations[0];

      if (donation.data.companyMatch) {
        expect(donation.data.companyMatch).toHaveProperty('matched');
        if (donation.data.companyMatch.matched) {
          expect(donation.data.companyMatch).toHaveProperty('matchAmount');
          expect(donation.data.companyMatch).toHaveProperty('matchRatio');
        }
      }
    });
  });

  describe('healthCheck', () => {
    it('should return true in mock mode', async () => {
      const isHealthy = await client.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });
});
