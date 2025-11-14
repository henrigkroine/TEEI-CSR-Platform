/**
 * Contract test: API Gateway → Safety & Moderation Service
 *
 * Verifies contract for content screening endpoints.
 */

import { Pact } from '@pact-foundation/pact';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import axios from 'axios';
import path from 'path';

describe('API Gateway → Safety & Moderation Service Contract', () => {
  const provider = new Pact({
    consumer: 'api-gateway',
    provider: 'safety-moderation-service',
    port: 8082,
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

  describe('POST /v1/screen/text', () => {
    it('should mark safe content as safe', async () => {
      await provider.addInteraction({
        state: 'service is available',
        uponReceiving: 'a request to screen safe content',
        withRequest: {
          method: 'POST',
          path: '/v1/screen/text',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            contentId: '123e4567-e89b-12d3-a456-426614174000',
            contentType: 'feedback_text',
            text: 'Great mentorship session today!',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            safe: true,
          },
        },
      });

      const response = await axios.post(
        `${provider.mockService.baseUrl}/v1/screen/text`,
        {
          contentId: '123e4567-e89b-12d3-a456-426614174000',
          contentType: 'feedback_text',
          text: 'Great mentorship session today!',
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      expect(response.status).toBe(200);
      expect(response.data.safe).toBe(true);

      await provider.verify();
    });

    it('should flag inappropriate content', async () => {
      await provider.addInteraction({
        state: 'service is available',
        uponReceiving: 'a request to screen inappropriate content',
        withRequest: {
          method: 'POST',
          path: '/v1/screen/text',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            contentId: '456e4567-e89b-12d3-a456-426614174456',
            contentType: 'feedback_text',
            text: 'This contains profanity damn',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            safe: false,
            flagId: '789e4567-e89b-12d3-a456-426614174789',
            reason: 'Profanity detected',
            confidence: 0.95,
            requiresHumanReview: false,
          },
        },
      });

      const response = await axios.post(
        `${provider.mockService.baseUrl}/v1/screen/text`,
        {
          contentId: '456e4567-e89b-12d3-a456-426614174456',
          contentType: 'feedback_text',
          text: 'This contains profanity damn',
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      expect(response.status).toBe(200);
      expect(response.data.safe).toBe(false);
      expect(response.data.flagId).toBeDefined();

      await provider.verify();
    });
  });

  describe('GET /v1/review-queue', () => {
    it('should return pending reviews', async () => {
      await provider.addInteraction({
        state: 'reviews are pending',
        uponReceiving: 'a request for review queue',
        withRequest: {
          method: 'GET',
          path: '/v1/review-queue',
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            items: [
              {
                id: '111e4567-e89b-12d3-a456-426614174111',
                contentId: '222e4567-e89b-12d3-a456-426614174222',
                contentType: 'message',
                text: 'Borderline content',
                flagReason: 'Unclear intent',
                confidence: 0.6,
                status: 'pending',
                raisedAt: '2025-11-13T10:00:00Z',
              },
            ],
            count: 1,
          },
        },
      });

      const response = await axios.get(`${provider.mockService.baseUrl}/v1/review-queue`);

      expect(response.status).toBe(200);
      expect(response.data.count).toBeGreaterThanOrEqual(0);

      await provider.verify();
    });
  });
});
