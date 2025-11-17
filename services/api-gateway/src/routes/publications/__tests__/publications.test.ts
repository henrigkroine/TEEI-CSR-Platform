import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerPublicationRoutes } from '../index.js';

/**
 * Contract tests for Publications API
 */
describe('Publications API Contract Tests', () => {
  let app: any;
  let authToken: string;
  let publicationId: string;
  let blockId: string;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    // Register JWT plugin
    await app.register(require('@fastify/jwt'), {
      secret: 'test-secret',
    });

    // Mock authentication
    app.decorate('authenticate', async (request: any, reply: any) => {
      request.user = {
        userId: 'test-user-id',
        tenantId: 'test-tenant-id',
        role: 'admin',
      };
    });

    await registerPublicationRoutes(app);
    await app.ready();

    // Generate test token
    authToken = app.jwt.sign({
      userId: 'test-user-id',
      tenantId: 'test-tenant-id',
      role: 'admin',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/publications', () => {
    it('should create a new publication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/publications',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          slug: 'test-publication',
          title: 'Test Publication',
          description: 'A test publication',
          visibility: 'PUBLIC',
          metaTitle: 'Test Meta Title',
          metaDescription: 'Test meta description',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data.slug).toBe('test-publication');
      expect(body.data.title).toBe('Test Publication');
      expect(body.data.status).toBe('DRAFT');

      publicationId = body.data.id;
    });

    it('should reject duplicate slug', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/publications',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          slug: 'test-publication',
          title: 'Duplicate Publication',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/publications',
        payload: {
          slug: 'unauthorized',
          title: 'Unauthorized',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /v1/publications', () => {
    it('should list all publications for tenant', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/publications',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /v1/publications/:id', () => {
    it('should get publication with blocks', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/publications/${publicationId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(publicationId);
      expect(body.data).toHaveProperty('blocks');
      expect(Array.isArray(body.data.blocks)).toBe(true);
    });

    it('should return 404 for non-existent publication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/publications/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /v1/publications/:id', () => {
    it('should update publication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/publications/${publicationId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Updated Title',
          description: 'Updated description',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Updated Title');
      expect(body.data.description).toBe('Updated description');
    });
  });

  describe('POST /v1/publications/:id/blocks', () => {
    it('should add a tile block', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/publications/${publicationId}/blocks`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          kind: 'TILE',
          payloadJson: {
            kind: 'TILE',
            tileType: 'metric',
            title: 'Total Impact',
            value: 1234,
          },
          order: 0,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.kind).toBe('TILE');
      expect(body.data).toHaveProperty('id');

      blockId = body.data.id;
    });

    it('should add a text block', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/publications/${publicationId}/blocks`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          kind: 'TEXT',
          payloadJson: {
            kind: 'TEXT',
            content: '<p>This is a test paragraph</p>',
            format: 'html',
          },
          order: 1,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.kind).toBe('TEXT');
    });
  });

  describe('PATCH /v1/publications/:id/blocks/:blockId', () => {
    it('should update block', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/publications/${publicationId}/blocks/${blockId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          payloadJson: {
            kind: 'TILE',
            tileType: 'metric',
            title: 'Updated Impact',
            value: 5678,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.payloadJson.value).toBe(5678);
    });
  });

  describe('POST /v1/publications/:id/publish', () => {
    it('should publish publication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/publications/${publicationId}/publish`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          metaTitle: 'Published Meta Title',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('LIVE');
      expect(body.data).toHaveProperty('publishedAt');
    });
  });

  describe('GET /public/publications/:slug', () => {
    it('should get public publication by slug', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/public/publications/test-publication',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.slug).toBe('test-publication');
      expect(body.data.blocks).toBeDefined();
      expect(body.data.blocks.length).toBeGreaterThan(0);

      // Should include ETag header
      expect(response.headers).toHaveProperty('etag');
      expect(response.headers).toHaveProperty('cache-control');
    });

    it('should return 304 for matching ETag', async () => {
      // First request to get ETag
      const firstResponse = await app.inject({
        method: 'GET',
        url: '/public/publications/test-publication',
      });

      const etag = firstResponse.headers.etag;

      // Second request with If-None-Match
      const secondResponse = await app.inject({
        method: 'GET',
        url: '/public/publications/test-publication',
        headers: {
          'if-none-match': etag,
        },
      });

      expect(secondResponse.statusCode).toBe(304);
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/public/publications/non-existent',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should sanitize HTML in text blocks', async () => {
      // Add a text block with potentially malicious content
      await app.inject({
        method: 'POST',
        url: `/v1/publications/${publicationId}/blocks`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          kind: 'TEXT',
          payloadJson: {
            kind: 'TEXT',
            content: '<p>Safe content</p><script>alert("xss")</script>',
            format: 'html',
          },
          order: 2,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/public/publications/test-publication',
      });

      const body = JSON.parse(response.body);
      const textBlocks = body.data.blocks.filter((b: any) => b.kind === 'TEXT');

      // Script tags should be sanitized
      textBlocks.forEach((block: any) => {
        expect(block.payloadJson.content).not.toContain('<script>');
      });
    });
  });

  describe('POST /v1/publications/:id/token', () => {
    let tokenProtectedId: string;

    beforeEach(async () => {
      // Create a TOKEN-visibility publication
      const response = await app.inject({
        method: 'POST',
        url: '/v1/publications',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          slug: 'token-protected',
          title: 'Token Protected Publication',
          visibility: 'TOKEN',
        },
      });

      tokenProtectedId = JSON.parse(response.body).data.id;
    });

    it('should rotate access token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/publications/${tokenProtectedId}/token`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          expiresInDays: 30,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('accessToken');
      expect(body.data).toHaveProperty('tokenExpiresAt');
      expect(body.data).toHaveProperty('embedUrl');
    });

    it('should reject token rotation for PUBLIC publications', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/publications/${publicationId}/token`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v1/publications/:id/stats', () => {
    it('should return analytics stats', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/publications/${publicationId}/stats`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('totalViews');
      expect(body.data).toHaveProperty('uniqueVisitors');
      expect(body.data).toHaveProperty('topReferrers');
      expect(body.data).toHaveProperty('viewsByCountry');
      expect(body.data).toHaveProperty('viewsOverTime');
    });
  });

  describe('DELETE /v1/publications/:id/blocks/:blockId', () => {
    it('should delete block', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/publications/${publicationId}/blocks/${blockId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(204);
    });
  });

  describe('DELETE /v1/publications/:id', () => {
    it('should delete publication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/publications/${publicationId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify deletion
      const getResponse = await app.inject({
        method: 'GET',
        url: `/v1/publications/${publicationId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });
  });
});
