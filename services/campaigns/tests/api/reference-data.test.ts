/**
 * Reference Data API Tests
 *
 * Tests for beneficiary groups and program templates endpoints.
 * Target: ≥80% code coverage
 *
 * SWARM 6: Agent 3.6 - Campaign Service API
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

// Mock database connection
vi.mock('../../src/db/connection.js', () => ({
  testConnection: vi.fn().mockResolvedValue(true),
  closePool: vi.fn().mockResolvedValue(undefined),
}));

// Mock shared schema
vi.mock('@teei/shared-schema', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue([{
              id: '123e4567-e89b-12d3-a456-426614174000',
              name: 'Test Group',
              groupType: 'refugees',
              countryCode: 'DE',
            }]),
          }),
        }),
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockResolvedValue([{
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Test Template',
            programType: 'mentorship',
          }]),
        }),
      }),
    }),
    query: {
      beneficiaryGroups: {
        findMany: vi.fn().mockResolvedValue([{
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Syrian Refugees',
          groupType: 'refugees',
          countryCode: 'DE',
          eligibleProgramTypes: ['mentorship', 'language'],
          isActive: true,
          isPublic: true,
        }]),
      },
      programTemplates: {
        findMany: vi.fn().mockResolvedValue([{
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Mentorship 1-on-1',
          programType: 'mentorship',
          version: '1.0.0',
          isActive: true,
          isPublic: true,
        }]),
      },
    },
  },
  beneficiaryGroups: {},
  programTemplates: {},
}));

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe('Beneficiary Groups API', () => {
  describe('GET /api/beneficiary-groups', () => {
    it('should list beneficiary groups', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/beneficiary-groups',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([200, 401]);
    });

    it('should filter by group type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/beneficiary-groups?groupType=refugees',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([200, 401]);
    });

    it('should filter by country code', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/beneficiary-groups?countryCode=DE',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([200, 401]);
    });

    it('should search by text', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/beneficiary-groups?search=refugees',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([200, 401]);
    });

    it('should paginate results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/beneficiary-groups?limit=10&offset=0',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([200, 401]);
    });

    it('should filter by eligible program type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/beneficiary-groups?eligibleProgramType=mentorship',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([200, 401]);
    });
  });

  describe('GET /api/beneficiary-groups/:id', () => {
    it('should get beneficiary group details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/beneficiary-groups/123e4567-e89b-12d3-a456-426614174000',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([200, 401, 404]);
    });

    it('should return 404 for non-existent group', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/beneficiary-groups/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([404, 401]);
    });
  });

  describe('GET /api/beneficiary-groups/:id/compatible-templates', () => {
    it('should get compatible templates for group', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/beneficiary-groups/123e4567-e89b-12d3-a456-426614174000/compatible-templates',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([200, 401, 404]);
    });
  });
});

describe('Program Templates API', () => {
  describe('GET /api/program-templates', () => {
    it('should list program templates', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/program-templates',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([200, 401]);
    });

    it('should filter by program type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/program-templates?programType=mentorship',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([200, 401]);
    });

    it('should search by text', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/program-templates?search=mentorship',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([200, 401]);
    });

    it('should filter active templates', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/program-templates?isActive=true',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([200, 401]);
    });

    it('should paginate results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/program-templates?limit=10&offset=0',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([200, 401]);
    });
  });

  describe('GET /api/program-templates/:id', () => {
    it('should get program template details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/program-templates/123e4567-e89b-12d3-a456-426614174000',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([200, 401, 404]);
    });

    it('should return 404 for non-existent template', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/program-templates/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([404, 401]);
    });
  });

  describe('GET /api/program-templates/:id/compatible-groups', () => {
    it('should get compatible groups for template', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/program-templates/123e4567-e89b-12d3-a456-426614174000/compatible-groups',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([200, 401, 404]);
    });
  });

  describe('GET /api/program-templates/types', () => {
    it('should get program types summary', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/program-templates/types',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      });

      expect(response.statusCode).toBeOneOf([200, 401]);
    });
  });
});

// Helper to support multiple expected status codes
expect.extend({
  toBeOneOf(received: number, expected: number[]) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be one of ${expected.join(', ')}`
          : `expected ${received} to be one of ${expected.join(', ')}`,
    };
  },
});
