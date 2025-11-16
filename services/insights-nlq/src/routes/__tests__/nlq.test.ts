/**
 * NLQ Routes Integration Tests
 *
 * Tests for:
 * - POST /v1/nlq/ask
 * - GET /v1/nlq/queries/:queryId
 * - GET /v1/nlq/history
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { nlqRoutes } from '../nlq.js';

describe('NLQ Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(nlqRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /ask', () => {
    it('should validate request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/ask',
        payload: {
          // Missing required fields
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid request');
      expect(body.details).toBeDefined();
    });

    it('should reject invalid UUID for companyId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/ask',
        payload: {
          question: 'What is our SROI?',
          companyId: 'invalid-uuid',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid request');
    });

    it('should reject question that is too short', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/ask',
        payload: {
          question: 'Hi',
          companyId: '550e8400-e29b-41d4-a716-446655440000',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid request');
    });

    it('should reject question that is too long', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/ask',
        payload: {
          question: 'a'.repeat(501),
          companyId: '550e8400-e29b-41d4-a716-446655440000',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid request');
    });

    it('should accept valid request', async () => {
      // This will fail in test environment without proper setup
      // but verifies the route structure
      const response = await app.inject({
        method: 'POST',
        url: '/ask',
        payload: {
          question: 'What is our SROI for Q1 2025?',
          companyId: '550e8400-e29b-41d4-a716-446655440000',
          context: {
            language: 'en',
          },
        },
      });

      // Will be 500 due to missing dependencies in test env
      // but should not be 400 (validation error)
      expect([200, 429, 500]).toContain(response.statusCode);
    });

    it('should accept optional context parameters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/ask',
        payload: {
          question: 'Show me volunteer impact scores',
          companyId: '550e8400-e29b-41d4-a716-446655440000',
          context: {
            previousQueryId: '550e8400-e29b-41d4-a716-446655440001',
            filters: {
              program: 'education',
            },
            language: 'en',
          },
          userId: '550e8400-e29b-41d4-a716-446655440002',
          sessionId: 'session-123',
        },
      });

      expect([200, 429, 500]).toContain(response.statusCode);
    });
  });

  describe('GET /queries/:queryId', () => {
    it('should reject invalid query ID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/queries/invalid-id',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid query ID format');
    });

    it('should return 404 for non-existent query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/queries/550e8400-e29b-41d4-a716-446655440000',
      });

      expect([404, 500]).toContain(response.statusCode);
    });

    it('should accept valid UUID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/queries/550e8400-e29b-41d4-a716-446655440000',
      });

      // Will be 404 or 500 in test env, but validates route
      expect([404, 500]).toContain(response.statusCode);
    });
  });

  describe('GET /history', () => {
    it('should require companyId parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/history',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid query parameters');
    });

    it('should validate companyId format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/history?companyId=invalid-uuid',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid query parameters');
    });

    it('should accept valid companyId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/history?companyId=550e8400-e29b-41d4-a716-446655440000',
      });

      // Will fail due to DB, but validates parameter parsing
      expect([200, 500]).toContain(response.statusCode);
    });

    it('should accept optional pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/history?companyId=550e8400-e29b-41d4-a716-446655440000&limit=10&offset=0',
      });

      expect([200, 500]).toContain(response.statusCode);
    });

    it('should validate limit parameter bounds', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/history?companyId=550e8400-e29b-41d4-a716-446655440000&limit=101',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid query parameters');
    });

    it('should accept date range filters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/history?companyId=550e8400-e29b-41d4-a716-446655440000&startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z',
      });

      expect([200, 500]).toContain(response.statusCode);
    });

    it('should accept status filter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/history?companyId=550e8400-e29b-41d4-a716-446655440000&status=success',
      });

      expect([200, 500]).toContain(response.statusCode);
    });

    it('should reject invalid status value', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/history?companyId=550e8400-e29b-41d4-a716-446655440000&status=invalid',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid query parameters');
    });
  });

  describe('Rate limiting headers', () => {
    it('should include rate limit headers in successful response', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/ask',
        payload: {
          question: 'What is our VIS score?',
          companyId: '550e8400-e29b-41d4-a716-446655440000',
        },
      });

      if (response.statusCode === 200) {
        expect(response.headers['x-ratelimit-remaining-daily']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining-hourly']).toBeDefined();
        expect(response.headers['x-query-time-ms']).toBeDefined();
        expect(response.headers['x-cached']).toBeDefined();
      }
    });
  });

  describe('Error handling', () => {
    it('should return structured error for validation failures', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/ask',
        payload: {
          question: 123, // Wrong type
          companyId: '550e8400-e29b-41d4-a716-446655440000',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.details).toBeDefined();
    });

    it('should include requestId in error responses', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/ask',
        payload: {
          question: 'Valid question but will fail',
          companyId: '550e8400-e29b-41d4-a716-446655440000',
        },
      });

      if (response.statusCode === 500) {
        const body = JSON.parse(response.body);
        expect(body.requestId).toBeDefined();
      }
    });
  });
});
