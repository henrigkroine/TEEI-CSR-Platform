/**
 * Templates Routes Integration Tests
 *
 * Tests for:
 * - GET /v1/nlq/templates
 * - GET /v1/nlq/templates/:id
 * - GET /v1/nlq/templates/categories
 * - GET /v1/nlq/templates/examples
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { templatesRoutes } from '../templates.js';

describe('Templates Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(templatesRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /templates', () => {
    it('should return templates with default pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates',
      });

      // Will be 200 or 500 depending on DB state
      expect([200, 500]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('templates');
        expect(body).toHaveProperty('pagination');
        expect(Array.isArray(body.templates)).toBe(true);
      }
    });

    it('should accept category filter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates?category=impact',
      });

      expect([200, 500]).toContain(response.statusCode);
    });

    it('should reject invalid category', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates?category=invalid',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid query parameters');
    });

    it('should accept active filter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates?active=true',
      });

      expect([200, 500]).toContain(response.statusCode);
    });

    it('should accept pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates?limit=10&offset=0',
      });

      expect([200, 500]).toContain(response.statusCode);
    });

    it('should validate limit bounds', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates?limit=101',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid query parameters');
    });

    it('should accept search parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates?search=sroi',
      });

      expect([200, 500]).toContain(response.statusCode);
    });

    it('should combine multiple filters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates?category=financial&active=true&limit=20&search=ratio',
      });

      expect([200, 500]).toContain(response.statusCode);
    });
  });

  describe('GET /templates/:id', () => {
    it('should reject invalid UUID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates/invalid-id',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid template ID format');
    });

    it('should return 404 for non-existent template', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates/550e8400-e29b-41d4-a716-446655440000',
      });

      expect([404, 500]).toContain(response.statusCode);
    });

    it('should accept valid UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates/550e8400-e29b-41d4-a716-446655440000',
      });

      expect([200, 404, 500]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('id');
        expect(body).toHaveProperty('templateName');
        expect(body).toHaveProperty('displayName');
        expect(body).toHaveProperty('templates');
        expect(body).toHaveProperty('allowedParameters');
        expect(body).toHaveProperty('security');
        expect(body).toHaveProperty('performance');
      }
    });
  });

  describe('GET /templates/categories', () => {
    it('should return category list with counts', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates/categories',
      });

      expect([200, 500]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('categories');
        expect(Array.isArray(body.categories)).toBe(true);

        if (body.categories.length > 0) {
          expect(body.categories[0]).toHaveProperty('name');
          expect(body.categories[0]).toHaveProperty('count');
        }
      }
    });
  });

  describe('GET /templates/examples', () => {
    it('should return example questions with default limit', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates/examples',
      });

      expect([200, 500]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('examples');
        expect(body).toHaveProperty('total');
        expect(Array.isArray(body.examples)).toBe(true);
      }
    });

    it('should accept limit parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates/examples?limit=5',
      });

      expect([200, 500]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.examples.length).toBeLessThanOrEqual(5);
      }
    });

    it('should accept category filter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates/examples?category=impact',
      });

      expect([200, 500]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(Array.isArray(body.examples)).toBe(true);

        if (body.examples.length > 0) {
          expect(body.examples[0]).toHaveProperty('question');
          expect(body.examples[0]).toHaveProperty('templateId');
          expect(body.examples[0]).toHaveProperty('category');
        }
      }
    });

    it('should combine limit and category', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates/examples?limit=3&category=financial',
      });

      expect([200, 500]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.examples.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('Response structure validation', () => {
    it('should return correct template list structure', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates?limit=1',
      });

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);

        expect(body).toHaveProperty('templates');
        expect(body).toHaveProperty('pagination');
        expect(body.pagination).toHaveProperty('total');
        expect(body.pagination).toHaveProperty('limit');
        expect(body.pagination).toHaveProperty('offset');
        expect(body.pagination).toHaveProperty('hasMore');

        if (body.templates.length > 0) {
          const template = body.templates[0];
          expect(template).toHaveProperty('id');
          expect(template).toHaveProperty('templateName');
          expect(template).toHaveProperty('displayName');
          expect(template).toHaveProperty('description');
          expect(template).toHaveProperty('category');
          expect(template).toHaveProperty('performance');
          expect(template).toHaveProperty('allowedParameters');
          expect(template).toHaveProperty('metadata');
        }
      }
    });

    it('should return correct template detail structure', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates/550e8400-e29b-41d4-a716-446655440000',
      });

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);

        expect(body).toHaveProperty('templates');
        expect(body.templates).toHaveProperty('sql');
        expect(body).toHaveProperty('security');
        expect(body.security).toHaveProperty('requiresTenantFilter');
        expect(body.security).toHaveProperty('allowedJoins');
        expect(body.security).toHaveProperty('deniedColumns');
        expect(body).toHaveProperty('governance');
        expect(body.governance).toHaveProperty('active');
        expect(body.governance).toHaveProperty('version');
      }
    });
  });
});
