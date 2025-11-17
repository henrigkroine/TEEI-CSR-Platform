/**
 * Contract test: Corp Cockpit → Reporting Service (Deck Export API)
 *
 * Verifies that the Corporate Cockpit correctly requests executive deck exports
 * from the Reporting Service and receives async job responses.
 * Ref: AGENTS.md § Worker 3 / Trust Boardroom Implementation
 */

import { Pact, Matchers } from '@pact-foundation/pact';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import axios from 'axios';
import path from 'path';

const { like, uuid, string, integer, iso8601DateTime, eachLike } = Matchers;

describe('Corp Cockpit → Deck Export API Contract', () => {
  const provider = new Pact({
    consumer: 'corp-cockpit',
    provider: 'reporting-service',
    port: 8087,
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

  describe('POST /deck/export', () => {
    it('should create export job for quarterly template', async () => {
      const exportRequest = {
        companyId: '550e8400-e29b-41d4-a716-446655440000',
        template: 'quarterly',
        periodStart: '2024-01-01T00:00:00.000Z',
        periodEnd: '2024-03-31T23:59:59.999Z',
        locale: 'en',
      };

      await provider.addInteraction({
        state: 'company has metrics data',
        uponReceiving: 'POST deck export request for quarterly template',
        withRequest: {
          method: 'POST',
          path: '/deck/export',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': like('Bearer token'),
          },
          body: exportRequest,
        },
        willRespondWith: {
          status: 202,
          headers: {
            'Content-Type': 'application/json',
            'Location': like('/deck/export/jobs/job-abc123'),
          },
          body: {
            jobId: uuid('job-abc123'),
            status: 'PENDING',
            estimatedDuration: integer(10),
            createdAt: iso8601DateTime(),
          },
        },
      });

      const response = await axios.post(
        `${provider.mockService.baseUrl}/deck/export`,
        exportRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token',
          },
        }
      );

      expect(response.status).toBe(202);
      expect(response.data.jobId).toBeDefined();
      expect(response.data.status).toBe('PENDING');
      expect(response.data.estimatedDuration).toBeGreaterThan(0);
      expect(response.headers.location).toBeDefined();

      await provider.verify();
    });

    it('should create export job for annual report template', async () => {
      const exportRequest = {
        companyId: '550e8400-e29b-41d4-a716-446655440000',
        template: 'annual',
        periodStart: '2024-01-01T00:00:00.000Z',
        periodEnd: '2024-12-31T23:59:59.999Z',
        locale: 'en',
        options: {
          includeNarratives: true,
          includeCharts: true,
          watermark: true,
        },
      };

      await provider.addInteraction({
        state: 'company has annual metrics data',
        uponReceiving: 'POST deck export request for annual template with options',
        withRequest: {
          method: 'POST',
          path: '/deck/export',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': like('Bearer token'),
          },
          body: exportRequest,
        },
        willRespondWith: {
          status: 202,
          headers: {
            'Content-Type': 'application/json',
            'Location': like('/deck/export/jobs/job-def456'),
          },
          body: {
            jobId: uuid('job-def456'),
            status: 'PENDING',
            estimatedDuration: integer(30),
            createdAt: iso8601DateTime(),
          },
        },
      });

      const response = await axios.post(
        `${provider.mockService.baseUrl}/deck/export`,
        exportRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token',
          },
        }
      );

      expect(response.status).toBe(202);
      expect(response.data.estimatedDuration).toBeGreaterThanOrEqual(10);

      await provider.verify();
    });

    it('should return 400 for invalid template', async () => {
      const invalidRequest = {
        companyId: '550e8400-e29b-41d4-a716-446655440000',
        template: 'invalid-template',
        periodStart: '2024-01-01T00:00:00.000Z',
        periodEnd: '2024-03-31T23:59:59.999Z',
        locale: 'en',
      };

      await provider.addInteraction({
        state: 'any state',
        uponReceiving: 'POST deck export with invalid template',
        withRequest: {
          method: 'POST',
          path: '/deck/export',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': like('Bearer token'),
          },
          body: invalidRequest,
        },
        willRespondWith: {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: 'Validation error',
            details: eachLike({
              field: 'template',
              message: string('Invalid template. Must be one of: quarterly, annual, investor-update, impact-deep-dive'),
            }),
          },
        },
      });

      try {
        await axios.post(
          `${provider.mockService.baseUrl}/deck/export`,
          invalidRequest,
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
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('Validation error');
      }

      await provider.verify();
    });
  });

  describe('GET /deck/export/jobs/:jobId', () => {
    it('should return job status for pending job', async () => {
      const jobId = 'job-abc123';

      await provider.addInteraction({
        state: 'export job is pending',
        uponReceiving: 'GET export job status for pending job',
        withRequest: {
          method: 'GET',
          path: `/deck/export/jobs/${jobId}`,
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
            jobId: string(jobId),
            status: 'PENDING',
            progress: integer(0),
            createdAt: iso8601DateTime(),
            updatedAt: iso8601DateTime(),
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/deck/export/jobs/${jobId}`,
        {
          headers: {
            Authorization: 'Bearer token',
            Accept: 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('PENDING');
      expect(response.data.progress).toBe(0);

      await provider.verify();
    });

    it('should return job status for in-progress job', async () => {
      const jobId = 'job-def456';

      await provider.addInteraction({
        state: 'export job is in progress',
        uponReceiving: 'GET export job status for in-progress job',
        withRequest: {
          method: 'GET',
          path: `/deck/export/jobs/${jobId}`,
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
            jobId: string(jobId),
            status: 'IN_PROGRESS',
            progress: integer(45),
            currentStep: string('Generating charts'),
            createdAt: iso8601DateTime(),
            updatedAt: iso8601DateTime(),
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/deck/export/jobs/${jobId}`,
        {
          headers: {
            Authorization: 'Bearer token',
            Accept: 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('IN_PROGRESS');
      expect(response.data.progress).toBeGreaterThan(0);
      expect(response.data.currentStep).toBeDefined();

      await provider.verify();
    });

    it('should return download URL for completed job', async () => {
      const jobId = 'job-ghi789';

      await provider.addInteraction({
        state: 'export job is completed',
        uponReceiving: 'GET export job status for completed job',
        withRequest: {
          method: 'GET',
          path: `/deck/export/jobs/${jobId}`,
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
            jobId: string(jobId),
            status: 'COMPLETED',
            progress: integer(100),
            downloadUrl: string('/deck/export/download/deck-quarterly-2024-Q1.pptx'),
            fileSize: integer(5242880),
            createdAt: iso8601DateTime(),
            updatedAt: iso8601DateTime(),
            completedAt: iso8601DateTime(),
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/deck/export/jobs/${jobId}`,
        {
          headers: {
            Authorization: 'Bearer token',
            Accept: 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('COMPLETED');
      expect(response.data.progress).toBe(100);
      expect(response.data.downloadUrl).toBeDefined();
      expect(response.data.fileSize).toBeGreaterThan(0);

      await provider.verify();
    });

    it('should return error details for failed job', async () => {
      const jobId = 'job-failed123';

      await provider.addInteraction({
        state: 'export job has failed',
        uponReceiving: 'GET export job status for failed job',
        withRequest: {
          method: 'GET',
          path: `/deck/export/jobs/${jobId}`,
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
            jobId: string(jobId),
            status: 'FAILED',
            progress: integer(65),
            error: {
              code: string('INSUFFICIENT_DATA'),
              message: string('Insufficient metrics data for the selected period'),
            },
            createdAt: iso8601DateTime(),
            updatedAt: iso8601DateTime(),
            failedAt: iso8601DateTime(),
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/deck/export/jobs/${jobId}`,
        {
          headers: {
            Authorization: 'Bearer token',
            Accept: 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('FAILED');
      expect(response.data.error).toBeDefined();
      expect(response.data.error.code).toBeDefined();

      await provider.verify();
    });

    it('should return 404 for non-existent job', async () => {
      const nonExistentJobId = 'job-nonexistent';

      await provider.addInteraction({
        state: 'export job does not exist',
        uponReceiving: 'GET export job status for non-existent job',
        withRequest: {
          method: 'GET',
          path: `/deck/export/jobs/${nonExistentJobId}`,
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
            error: 'Export job not found',
            jobId: string(nonExistentJobId),
          },
        },
      });

      try {
        await axios.get(
          `${provider.mockService.baseUrl}/deck/export/jobs/${nonExistentJobId}`,
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
        expect(error.response.data.error).toBe('Export job not found');
      }

      await provider.verify();
    });
  });

  describe('GET /deck/export/download/:filename', () => {
    it('should download completed deck file', async () => {
      const filename = 'deck-quarterly-2024-Q1.pptx';

      await provider.addInteraction({
        state: 'deck file is available for download',
        uponReceiving: 'GET download deck file',
        withRequest: {
          method: 'GET',
          path: `/deck/export/download/${filename}`,
          headers: {
            'Authorization': like('Bearer token'),
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'Content-Disposition': like(`attachment; filename="${filename}"`),
            'Content-Length': like('5242880'),
          },
          body: like('binary-pptx-content'),
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/deck/export/download/${filename}`,
        {
          headers: {
            Authorization: 'Bearer token',
          },
          responseType: 'arraybuffer',
        }
      );

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('presentation');
      expect(response.headers['content-disposition']).toContain(filename);

      await provider.verify();
    });
  });
});
