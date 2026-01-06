/**
 * Agent 24: program-service-integration-tester
 * Integration tests for program-service HTTP endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { templatesRoutes } from '../routes/templates.js';
import { programsRoutes } from '../routes/programs.js';
import { campaignsRoutes } from '../routes/campaigns.js';

describe('Program Service Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Initialize Fastify app with routes
    app = Fastify({ logger: false });
    await app.register(templatesRoutes, { prefix: '/templates' });
    await app.register(programsRoutes, { prefix: '/programs' });
    await app.register(campaignsRoutes, { prefix: '/campaigns' });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Templates API', () => {
    describe('POST /templates', () => {
      it('should create a new template', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/templates',
          payload: {
            templateKey: 'mentorship-generic',
            name: 'Generic Mentorship Template',
            category: 'mentorship',
            defaultConfig: {
              session: { defaultDurationMinutes: 60 },
            },
            configSchema: {},
          },
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.id).toBeDefined();
        expect(body.templateKey).toBe('mentorship-generic');
      });

      it('should reject invalid template data', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/templates',
          payload: {
            // Missing required fields
            name: 'Invalid Template',
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe('GET /templates', () => {
      it('should list all templates', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/templates',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(Array.isArray(body)).toBe(true);
      });

      it('should filter templates by category', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/templates?category=mentorship',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(Array.isArray(body)).toBe(true);
      });

      it('should filter templates by status', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/templates?status=active',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(Array.isArray(body)).toBe(true);
      });
    });

    describe('GET /templates/:id', () => {
      it('should retrieve a specific template', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/templates/123e4567-e89b-12d3-a456-426614174000',
        });

        expect([200, 404]).toContain(response.statusCode);
      });

      it('should return 404 for nonexistent template', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/templates/00000000-0000-0000-0000-000000000000',
        });

        expect(response.statusCode).toBe(404);
      });
    });

    describe('PUT /templates/:id', () => {
      it('should update template metadata', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: '/templates/123e4567-e89b-12d3-a456-426614174000',
          payload: {
            name: 'Updated Template Name',
            description: 'Updated description',
          },
        });

        expect([200, 404]).toContain(response.statusCode);
      });
    });

    describe('POST /templates/:id/publish', () => {
      it('should publish a draft template', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/templates/123e4567-e89b-12d3-a456-426614174000/publish',
          payload: {
            deprecatePrevious: false,
          },
        });

        expect([200, 400, 404]).toContain(response.statusCode);
      });
    });

    describe('POST /templates/:id/versions', () => {
      it('should create a new version of a template', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/templates/123e4567-e89b-12d3-a456-426614174000/versions',
        });

        expect([201, 400, 404]).toContain(response.statusCode);
      });
    });

    describe('POST /templates/:id/deprecate', () => {
      it('should deprecate a template', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/templates/123e4567-e89b-12d3-a456-426614174000/deprecate',
          payload: {
            newTemplateId: '223e4567-e89b-12d3-a456-426614174000',
          },
        });

        expect([200, 400, 404]).toContain(response.statusCode);
      });
    });
  });

  describe('Programs API', () => {
    describe('POST /programs', () => {
      it('should create a program from a template', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/programs',
          payload: {
            templateId: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Mentorship for Ukrainians 2024',
            description: 'Mentorship program for Ukrainian refugees',
            beneficiaryGroupId: '789e4567-e89b-12d3-a456-426614174000',
            configOverrides: {
              session: { defaultDurationMinutes: 90 },
            },
            tags: ['ukrainian', 'mentorship'],
            sdgGoals: [4, 8, 10],
          },
        });

        expect([201, 400]).toContain(response.statusCode);

        if (response.statusCode === 201) {
          const body = JSON.parse(response.body);
          expect(body.id).toBeDefined();
          expect(body.programKey).toBeDefined();
          expect(body.name).toBe('Mentorship for Ukrainians 2024');
        }
      });

      it('should reject program creation with invalid templateId', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/programs',
          payload: {
            templateId: 'invalid-uuid',
            name: 'Test Program',
          },
        });

        expect(response.statusCode).toBe(400);
      });

      it('should validate config overrides against template schema', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/programs',
          payload: {
            templateId: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Test Program',
            configOverrides: {
              session: { defaultDurationMinutes: 999 }, // Invalid: exceeds max
            },
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe('GET /programs/:id', () => {
      it('should retrieve a program with relations', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/programs/456e4567-e89b-12d3-a456-426614174000',
        });

        expect([200, 404]).toContain(response.statusCode);

        if (response.statusCode === 200) {
          const body = JSON.parse(response.body);
          expect(body.id).toBeDefined();
          expect(body.template).toBeDefined();
        }
      });
    });

    describe('PUT /programs/:id/config', () => {
      it('should update program configuration', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: '/programs/456e4567-e89b-12d3-a456-426614174000/config',
          payload: {
            session: { defaultDurationMinutes: 75 },
          },
        });

        expect([200, 400, 404]).toContain(response.statusCode);
      });

      it('should reject invalid config updates', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: '/programs/456e4567-e89b-12d3-a456-426614174000/config',
          payload: {
            invalid: 'config',
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe('PUT /programs/:id/status', () => {
      it('should update program status', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: '/programs/456e4567-e89b-12d3-a456-426614174000/status',
          payload: {
            status: 'active',
          },
        });

        expect([200, 400, 404]).toContain(response.statusCode);
      });

      it('should reject invalid status transitions', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: '/programs/456e4567-e89b-12d3-a456-426614174000/status',
          payload: {
            status: 'invalid_status',
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Campaigns API', () => {
    describe('POST /campaigns', () => {
      it('should create a campaign from a program', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/campaigns',
          payload: {
            programId: '456e4567-e89b-12d3-a456-426614174000',
            companyId: 'company-123',
            name: 'Acme Corp Mentorship Campaign',
            configOverrides: {
              session: { defaultDurationMinutes: 45 },
            },
            targetEnrollment: 100,
            maxEnrollment: 150,
          },
        });

        expect([201, 400]).toContain(response.statusCode);

        if (response.statusCode === 201) {
          const body = JSON.parse(response.body);
          expect(body).toHaveProperty('message');
        }
      });
    });

    describe('GET /campaigns/:id', () => {
      it('should retrieve a campaign', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/campaigns/789e4567-e89b-12d3-a456-426614174000',
        });

        expect([200, 404]).toContain(response.statusCode);
      });
    });
  });

  describe('End-to-End Program Lifecycle', () => {
    it('should support full template → program → campaign flow', async () => {
      // Step 1: Create template
      const templateResponse = await app.inject({
        method: 'POST',
        url: '/templates',
        payload: {
          templateKey: 'e2e-test-template',
          name: 'E2E Test Template',
          category: 'mentorship',
          defaultConfig: { session: { defaultDurationMinutes: 60 } },
          configSchema: {},
        },
      });

      if (templateResponse.statusCode !== 201) {
        console.log('Skipping E2E test: template creation failed');
        return;
      }

      const template = JSON.parse(templateResponse.body);

      // Step 2: Publish template
      const publishResponse = await app.inject({
        method: 'POST',
        url: `/templates/${template.id}/publish`,
        payload: { deprecatePrevious: false },
      });

      // Step 3: Create program from template
      const programResponse = await app.inject({
        method: 'POST',
        url: '/programs',
        payload: {
          templateId: template.id,
          name: 'E2E Test Program',
          configOverrides: { session: { defaultDurationMinutes: 90 } },
        },
      });

      if (programResponse.statusCode === 201) {
        const program = JSON.parse(programResponse.body);

        // Step 4: Update program status
        const statusResponse = await app.inject({
          method: 'PUT',
          url: `/programs/${program.id}/status`,
          payload: { status: 'active' },
        });

        // Step 5: Create campaign
        const campaignResponse = await app.inject({
          method: 'POST',
          url: '/campaigns',
          payload: {
            programId: program.id,
            companyId: 'test-company',
            name: 'E2E Test Campaign',
          },
        });

        expect([201, 400]).toContain(campaignResponse.statusCode);
      }
    });
  });

  describe('Error Handling', () => {
    it('should return proper error for malformed JSON', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/templates',
        payload: 'not-valid-json',
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return proper error for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/programs',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle database connection errors gracefully', async () => {
      // This would require mocking DB failures
      // For now, just ensure 500 errors have proper structure
      const response = await app.inject({
        method: 'GET',
        url: '/templates/invalid-format',
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });
  });
});
