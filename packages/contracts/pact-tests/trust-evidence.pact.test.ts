/**
 * Contract test: API Gateway → Reporting Service (Trust API - Evidence)
 *
 * Verifies that the API Gateway correctly proxies requests to the Trust API
 * for evidence retrieval and citation validation.
 * Ref: AGENTS.md § Worker 3 / Trust Boardroom Implementation
 */

import { Pact, Matchers } from '@pact-foundation/pact';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import axios from 'axios';
import path from 'path';

const { like, uuid, string, integer, decimal, eachLike, regex } = Matchers;

describe('API Gateway → Trust API (Evidence) Contract', () => {
  const provider = new Pact({
    consumer: 'api-gateway',
    provider: 'reporting-service',
    port: 8085,
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'info',
  });

  beforeAll(async () => {
    await provider.setup();
  });

  afterAll(async () => {
    await provider.finalize();
  });

  describe('GET /trust/v1/evidence/:reportId', () => {
    it('should return evidence with citations for valid report', async () => {
      const reportId = '123e4567-e89b-12d3-a456-426614174000';

      await provider.addInteraction({
        state: 'report exists with citations',
        uponReceiving: 'GET evidence for report',
        withRequest: {
          method: 'GET',
          path: `/trust/v1/evidence/${reportId}`,
          headers: {
            'Authorization': like('Bearer token'),
            'Accept': 'application/json',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            reportId: uuid(reportId),
            citations: eachLike({
              id: uuid('cite-abc123'),
              snippetId: uuid('snip-def456'),
              relevanceScore: decimal(0.85),
              snippetHash: regex(/^[a-f0-9]{64}$/, 'abc123def456789012345678901234567890123456789012345678901234abcd'),
              text: string('150 young participants completed the program'),
              source: string('kintell_sessions'),
              createdAt: like('2024-11-14T10:30:00.000Z'),
            }),
            evidenceCount: integer(42),
            metadata: {
              generatedAt: like('2024-11-14T10:30:00.000Z'),
              version: string('1.0.0'),
            },
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/trust/v1/evidence/${reportId}`,
        {
          headers: {
            Authorization: 'Bearer token',
            Accept: 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.reportId).toBe(reportId);
      expect(response.data.citations).toBeInstanceOf(Array);
      expect(response.data.citations.length).toBeGreaterThan(0);
      expect(response.data.citations[0].snippetHash).toMatch(/^[a-f0-9]{64}$/);
      expect(response.data.evidenceCount).toBeGreaterThan(0);

      await provider.verify();
    });

    it('should return 404 when report does not exist', async () => {
      const nonExistentReportId = '999e9999-e99b-99d9-a999-999999999999';

      await provider.addInteraction({
        state: 'report does not exist',
        uponReceiving: 'GET evidence for non-existent report',
        withRequest: {
          method: 'GET',
          path: `/trust/v1/evidence/${nonExistentReportId}`,
          headers: {
            'Authorization': like('Bearer token'),
            'Accept': 'application/json',
          },
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: 'Report not found',
            reportId: uuid(nonExistentReportId),
          },
        },
      });

      try {
        await axios.get(
          `${provider.mockService.baseUrl}/trust/v1/evidence/${nonExistentReportId}`,
          {
            headers: {
              Authorization: 'Bearer token',
              Accept: 'application/json',
            },
          }
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error).toBe('Report not found');
      }

      await provider.verify();
    });

    it('should return empty citations array when report has no evidence', async () => {
      const reportIdNoEvidence = '456e7890-e12b-34c5-d678-567890123456';

      await provider.addInteraction({
        state: 'report exists without citations',
        uponReceiving: 'GET evidence for report with no citations',
        withRequest: {
          method: 'GET',
          path: `/trust/v1/evidence/${reportIdNoEvidence}`,
          headers: {
            'Authorization': like('Bearer token'),
            'Accept': 'application/json',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            reportId: uuid(reportIdNoEvidence),
            citations: [],
            evidenceCount: integer(0),
            metadata: {
              generatedAt: like('2024-11-14T10:30:00.000Z'),
              version: string('1.0.0'),
            },
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/trust/v1/evidence/${reportIdNoEvidence}`,
        {
          headers: {
            Authorization: 'Bearer token',
            Accept: 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.citations).toEqual([]);
      expect(response.data.evidenceCount).toBe(0);

      await provider.verify();
    });
  });

  describe('POST /trust/v1/evidence/verify', () => {
    it('should verify citation integrity successfully', async () => {
      const verificationRequest = {
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        citationIds: ['cite-abc123', 'cite-def456'],
      };

      await provider.addInteraction({
        state: 'citations exist and are valid',
        uponReceiving: 'POST verify citation integrity',
        withRequest: {
          method: 'POST',
          path: '/trust/v1/evidence/verify',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': like('Bearer token'),
          },
          body: verificationRequest,
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            reportId: uuid(verificationRequest.reportId),
            verified: true,
            results: eachLike({
              citationId: string('cite-abc123'),
              valid: true,
              snippetHash: regex(/^[a-f0-9]{64}$/, 'abc123def456789012345678901234567890123456789012345678901234abcd'),
              matchesSource: true,
            }),
            verifiedAt: like('2024-11-14T10:30:00.000Z'),
          },
        },
      });

      const response = await axios.post(
        `${provider.mockService.baseUrl}/trust/v1/evidence/verify`,
        verificationRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.verified).toBe(true);
      expect(response.data.results).toBeInstanceOf(Array);
      expect(response.data.results[0].valid).toBe(true);

      await provider.verify();
    });

    it('should detect tampered citations', async () => {
      const verificationRequest = {
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        citationIds: ['cite-tampered'],
      };

      await provider.addInteraction({
        state: 'citation has been tampered with',
        uponReceiving: 'POST verify tampered citation',
        withRequest: {
          method: 'POST',
          path: '/trust/v1/evidence/verify',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': like('Bearer token'),
          },
          body: verificationRequest,
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            reportId: uuid(verificationRequest.reportId),
            verified: false,
            results: eachLike({
              citationId: string('cite-tampered'),
              valid: false,
              snippetHash: regex(/^[a-f0-9]{64}$/, 'tampered123456789012345678901234567890123456789012345678901234'),
              matchesSource: false,
              reason: string('Hash mismatch detected'),
            }),
            verifiedAt: like('2024-11-14T10:30:00.000Z'),
          },
        },
      });

      const response = await axios.post(
        `${provider.mockService.baseUrl}/trust/v1/evidence/verify`,
        verificationRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.verified).toBe(false);
      expect(response.data.results[0].valid).toBe(false);
      expect(response.data.results[0].reason).toBeDefined();

      await provider.verify();
    });
  });
});
