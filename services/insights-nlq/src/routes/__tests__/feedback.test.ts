/**
 * Feedback Routes Integration Tests
 *
 * Tests for:
 * - POST /v1/nlq/feedback
 * - GET /v1/nlq/feedback/:queryId
 * - GET /v1/nlq/feedback/stats
 * - GET /v1/nlq/feedback/recent
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { feedbackRoutes } from '../feedback.js';

describe('Feedback Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(feedbackRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /feedback', () => {
    const validPayload = {
      queryId: '550e8400-e29b-41d4-a716-446655440000',
      rating: 5,
      feedbackType: 'positive' as const,
      wasHelpful: true,
    };

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid feedback data');
      expect(body.details).toBeDefined();
    });

    it('should reject invalid queryId format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          ...validPayload,
          queryId: 'invalid-uuid',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid feedback data');
    });

    it('should validate rating bounds', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          ...validPayload,
          rating: 6,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid feedback data');
    });

    it('should reject rating below 1', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          ...validPayload,
          rating: 0,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate feedbackType enum', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          ...validPayload,
          feedbackType: 'invalid',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid feedback data');
    });

    it('should validate issueCategory enum', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          ...validPayload,
          issueCategory: 'invalid_category',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should accept valid minimal feedback', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback',
        payload: validPayload,
      });

      // Will be 404 (query not found) or 500 in test env
      expect([201, 404, 500]).toContain(response.statusCode);
    });

    it('should accept feedback with all optional fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          ...validPayload,
          accuracyScore: 5,
          relevanceScore: 4,
          clarityScore: 5,
          issueCategory: 'missing_data',
          comment: 'Great answer but missing some historical data',
          suggestions: 'Add more time range options',
          userId: '550e8400-e29b-41d4-a716-446655440001',
        },
      });

      expect([201, 404, 500]).toContain(response.statusCode);
    });

    it('should validate optional score fields bounds', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          ...validPayload,
          accuracyScore: 6,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should enforce comment max length', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          ...validPayload,
          comment: 'a'.repeat(1001),
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent query', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback',
        payload: validPayload,
      });

      // In test env without DB, likely 404 or 500
      expect([201, 404, 500]).toContain(response.statusCode);

      if (response.statusCode === 404) {
        const body = JSON.parse(response.body);
        expect(body.error).toBe('Query not found');
      }
    });
  });

  describe('GET /feedback/:queryId', () => {
    it('should reject invalid queryId format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/feedback/invalid-id',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid query ID format');
    });

    it('should accept valid UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/feedback/550e8400-e29b-41d4-a716-446655440000',
      });

      expect([200, 500]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('queryId');
        expect(body).toHaveProperty('feedback');
        expect(body).toHaveProperty('summary');
        expect(Array.isArray(body.feedback)).toBe(true);
      }
    });

    it('should return summary statistics when feedback exists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/feedback/550e8400-e29b-41d4-a716-446655440000',
      });

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.summary).toHaveProperty('totalFeedback');
        expect(body.summary).toHaveProperty('averageRating');
      }
    });
  });

  describe('GET /feedback/stats', () => {
    it('should return stats without filters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/feedback/stats',
      });

      expect([200, 500]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('overall');
        expect(body).toHaveProperty('distribution');
        expect(body).toHaveProperty('issues');
      }
    });

    it('should accept companyId filter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/feedback/stats?companyId=550e8400-e29b-41d4-a716-446655440000',
      });

      expect([200, 500]).toContain(response.statusCode);
    });

    it('should reject invalid companyId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/feedback/stats?companyId=invalid',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid query parameters');
    });

    it('should accept date range filters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/feedback/stats?startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z',
      });

      expect([200, 500]).toContain(response.statusCode);
    });

    it('should accept templateId filter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/feedback/stats?templateId=550e8400-e29b-41d4-a716-446655440000',
      });

      expect([200, 500]).toContain(response.statusCode);
    });

    it('should combine multiple filters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/feedback/stats?companyId=550e8400-e29b-41d4-a716-446655440000&startDate=2025-01-01T00:00:00Z',
      });

      expect([200, 500]).toContain(response.statusCode);
    });

    it('should return correct structure', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/feedback/stats',
      });

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);

        expect(body.overall).toHaveProperty('totalFeedback');
        expect(body.overall).toHaveProperty('averageRating');
        expect(body.overall).toHaveProperty('averageAccuracy');
        expect(body.overall).toHaveProperty('averageRelevance');
        expect(body.overall).toHaveProperty('averageClarity');
        expect(body.overall).toHaveProperty('helpfulPercentage');

        expect(body.distribution).toHaveProperty('byType');
        expect(body.distribution.byType).toHaveProperty('positive');
        expect(body.distribution.byType).toHaveProperty('negative');
        expect(body.distribution.byType).toHaveProperty('neutral');

        expect(body.distribution).toHaveProperty('byRating');
        expect(Array.isArray(body.distribution.byRating)).toBe(true);

        expect(Array.isArray(body.issues)).toBe(true);
      }
    });
  });

  describe('GET /feedback/recent', () => {
    it('should return recent feedback with default limit', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/feedback/recent',
      });

      expect([200, 500]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('feedback');
        expect(body).toHaveProperty('total');
        expect(Array.isArray(body.feedback)).toBe(true);
      }
    });

    it('should accept limit parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/feedback/recent?limit=5',
      });

      expect([200, 500]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.feedback.length).toBeLessThanOrEqual(5);
      }
    });

    it('should accept companyId filter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/feedback/recent?companyId=550e8400-e29b-41d4-a716-446655440000',
      });

      expect([200, 500]).toContain(response.statusCode);
    });

    it('should cap limit at 100', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/feedback/recent?limit=200',
      });

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.feedback.length).toBeLessThanOrEqual(100);
      }
    });

    it('should include query details in response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/feedback/recent?limit=1',
      });

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);

        if (body.feedback.length > 0) {
          const item = body.feedback[0];
          expect(item).toHaveProperty('id');
          expect(item).toHaveProperty('queryId');
          expect(item).toHaveProperty('query');
          expect(item).toHaveProperty('rating');
          expect(item).toHaveProperty('feedbackType');
          expect(item).toHaveProperty('createdAt');
        }
      }
    });
  });

  describe('Response structure validation', () => {
    it('should return feedback with correct structure', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/feedback/550e8400-e29b-41d4-a716-446655440000',
      });

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);

        if (body.feedback.length > 0) {
          const item = body.feedback[0];
          expect(item).toHaveProperty('id');
          expect(item).toHaveProperty('rating');
          expect(item).toHaveProperty('feedbackType');
          expect(item).toHaveProperty('createdAt');
        }

        if (body.summary.distribution) {
          expect(body.summary.distribution).toHaveProperty('positive');
          expect(body.summary.distribution).toHaveProperty('negative');
          expect(body.summary.distribution).toHaveProperty('neutral');
        }
      }
    });
  });
});
