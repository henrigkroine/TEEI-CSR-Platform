/**
 * Contract test: API Gateway → Reporting Service (Trust API - Ledger)
 *
 * Verifies that the API Gateway correctly proxies requests to the Trust API
 * for immutable audit ledger operations and integrity verification.
 * Ref: AGENTS.md § Worker 3 / Trust Boardroom Implementation
 */

import { Pact, Matchers } from '@pact-foundation/pact';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import axios from 'axios';
import path from 'path';

const { like, uuid, string, integer, regex, eachLike, boolean } = Matchers;

describe('API Gateway → Trust API (Ledger) Contract', () => {
  const provider = new Pact({
    consumer: 'api-gateway',
    provider: 'reporting-service',
    port: 8086,
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

  describe('GET /trust/v1/ledger/:reportId', () => {
    it('should return ledger entries for valid report', async () => {
      const reportId = '123e4567-e89b-12d3-a456-426614174000';

      await provider.addInteraction({
        state: 'report has ledger entries',
        uponReceiving: 'GET ledger entries for report',
        withRequest: {
          method: 'GET',
          path: `/trust/v1/ledger/${reportId}`,
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
            entries: eachLike({
              id: uuid('entry-abc123'),
              eventType: string('REPORT_GENERATED'),
              timestamp: like('2024-11-14T10:30:00.000Z'),
              actor: string('system'),
              metadata: {
                modelName: string('gpt-4-turbo'),
                promptVersion: string('v2.1.0'),
                citationCount: integer(42),
              },
              hash: regex(/^[a-f0-9]{64}$/, 'abc123def456789012345678901234567890123456789012345678901234abcd'),
              previousHash: regex(/^[a-f0-9]{64}$/, '0000000000000000000000000000000000000000000000000000000000000000'),
            }),
            chainValid: boolean(true),
            entryCount: integer(5),
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/trust/v1/ledger/${reportId}`,
        {
          headers: {
            Authorization: 'Bearer token',
            Accept: 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.reportId).toBe(reportId);
      expect(response.data.entries).toBeInstanceOf(Array);
      expect(response.data.entries.length).toBeGreaterThan(0);
      expect(response.data.chainValid).toBe(true);
      expect(response.data.entries[0].hash).toMatch(/^[a-f0-9]{64}$/);

      await provider.verify();
    });

    it('should detect broken chain integrity', async () => {
      const reportId = '456e7890-e12b-34c5-d678-567890123456';

      await provider.addInteraction({
        state: 'report ledger has broken chain',
        uponReceiving: 'GET ledger with integrity violation',
        withRequest: {
          method: 'GET',
          path: `/trust/v1/ledger/${reportId}`,
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
            entries: eachLike({
              id: uuid('entry-tampered'),
              eventType: string('REPORT_GENERATED'),
              timestamp: like('2024-11-14T10:30:00.000Z'),
              actor: string('system'),
              metadata: {},
              hash: regex(/^[a-f0-9]{64}$/, 'tampered123456789012345678901234567890123456789012345678901234'),
              previousHash: regex(/^[a-f0-9]{64}$/, 'previous123456789012345678901234567890123456789012345678901234'),
            }),
            chainValid: boolean(false),
            entryCount: integer(3),
            integrityViolation: {
              detected: true,
              entryId: string('entry-tampered'),
              reason: string('Hash chain broken at entry 2'),
            },
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/trust/v1/ledger/${reportId}`,
        {
          headers: {
            Authorization: 'Bearer token',
            Accept: 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.chainValid).toBe(false);
      expect(response.data.integrityViolation).toBeDefined();
      expect(response.data.integrityViolation.detected).toBe(true);

      await provider.verify();
    });

    it('should return 404 for non-existent report', async () => {
      const nonExistentReportId = '999e9999-e99b-99d9-a999-999999999999';

      await provider.addInteraction({
        state: 'report ledger does not exist',
        uponReceiving: 'GET ledger for non-existent report',
        withRequest: {
          method: 'GET',
          path: `/trust/v1/ledger/${nonExistentReportId}`,
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
            error: 'Ledger not found',
            reportId: uuid(nonExistentReportId),
          },
        },
      });

      try {
        await axios.get(
          `${provider.mockService.baseUrl}/trust/v1/ledger/${nonExistentReportId}`,
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
        expect(error.response.data.error).toBe('Ledger not found');
      }

      await provider.verify();
    });
  });

  describe('POST /trust/v1/ledger/:reportId/append', () => {
    it('should append new ledger entry', async () => {
      const reportId = '123e4567-e89b-12d3-a456-426614174000';
      const appendRequest = {
        eventType: 'REPORT_APPROVED',
        actor: 'user@example.com',
        metadata: {
          approverRole: 'CSR_MANAGER',
          comments: 'Approved for publication',
        },
      };

      await provider.addInteraction({
        state: 'report ledger is valid',
        uponReceiving: 'POST append ledger entry',
        withRequest: {
          method: 'POST',
          path: `/trust/v1/ledger/${reportId}/append`,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': like('Bearer token'),
          },
          body: appendRequest,
        },
        willRespondWith: {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            reportId: uuid(reportId),
            entry: {
              id: uuid('entry-new123'),
              eventType: string(appendRequest.eventType),
              timestamp: like('2024-11-14T10:35:00.000Z'),
              actor: string(appendRequest.actor),
              metadata: like(appendRequest.metadata),
              hash: regex(/^[a-f0-9]{64}$/, 'newhash1234567890123456789012345678901234567890123456789012345'),
              previousHash: regex(/^[a-f0-9]{64}$/, 'prevhash1234567890123456789012345678901234567890123456789012345'),
            },
            chainValid: boolean(true),
          },
        },
      });

      const response = await axios.post(
        `${provider.mockService.baseUrl}/trust/v1/ledger/${reportId}/append`,
        appendRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token',
          },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.entry.eventType).toBe(appendRequest.eventType);
      expect(response.data.entry.actor).toBe(appendRequest.actor);
      expect(response.data.chainValid).toBe(true);

      await provider.verify();
    });

    it('should reject append when chain is broken', async () => {
      const reportId = '456e7890-e12b-34c5-d678-567890123456';
      const appendRequest = {
        eventType: 'REPORT_APPROVED',
        actor: 'user@example.com',
        metadata: {},
      };

      await provider.addInteraction({
        state: 'report ledger chain is broken',
        uponReceiving: 'POST append to broken ledger',
        withRequest: {
          method: 'POST',
          path: `/trust/v1/ledger/${reportId}/append`,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': like('Bearer token'),
          },
          body: appendRequest,
        },
        willRespondWith: {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: 'Cannot append to broken ledger chain',
            reportId: uuid(reportId),
            chainValid: boolean(false),
          },
        },
      });

      try {
        await axios.post(
          `${provider.mockService.baseUrl}/trust/v1/ledger/${reportId}/append`,
          appendRequest,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer token',
            },
          }
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.response.status).toBe(409);
        expect(error.response.data.error).toContain('Cannot append');
      }

      await provider.verify();
    });
  });

  describe('GET /trust/v1/ledger/:reportId/verify', () => {
    it('should verify full ledger chain integrity', async () => {
      const reportId = '123e4567-e89b-12d3-a456-426614174000';

      await provider.addInteraction({
        state: 'report ledger is valid',
        uponReceiving: 'GET verify ledger chain',
        withRequest: {
          method: 'GET',
          path: `/trust/v1/ledger/${reportId}/verify`,
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
            chainValid: boolean(true),
            entryCount: integer(5),
            verifiedAt: like('2024-11-14T10:30:00.000Z'),
            genesisHash: regex(/^[a-f0-9]{64}$/, '0000000000000000000000000000000000000000000000000000000000000000'),
            headHash: regex(/^[a-f0-9]{64}$/, 'headhash1234567890123456789012345678901234567890123456789012345'),
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/trust/v1/ledger/${reportId}/verify`,
        {
          headers: {
            Authorization: 'Bearer token',
            Accept: 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.chainValid).toBe(true);
      expect(response.data.entryCount).toBeGreaterThan(0);
      expect(response.data.genesisHash).toMatch(/^[a-f0-9]{64}$/);
      expect(response.data.headHash).toMatch(/^[a-f0-9]{64}$/);

      await provider.verify();
    });
  });
});
