/**
 * Contract test: API Gateway → Unified Profile Service
 *
 * Verifies that the API Gateway correctly proxies requests to the Unified Profile Service
 * and that both services agree on the request/response contract.
 */

import { Pact } from '@pact-foundation/pact';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import axios from 'axios';
import path from 'path';

describe('API Gateway → Unified Profile Service Contract', () => {
  const provider = new Pact({
    consumer: 'api-gateway',
    provider: 'unified-profile-service',
    port: 8080,
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

  describe('GET /v1/profile/:id', () => {
    it('should return user profile when user exists', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      await provider.addInteraction({
        state: 'user exists',
        uponReceiving: 'a request for user profile',
        withRequest: {
          method: 'GET',
          path: `/v1/profile/${userId}`,
          headers: {
            'Accept': 'application/json',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            id: userId,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            role: 'apprentice',
            tenantId: '456e4567-e89b-12d3-a456-426614174001',
            externalMappings: {
              kintell: 'K12345',
              buddy: 'B67890',
            },
            enrollments: [],
            journeyFlags: {
              isBuddyMatched: true,
              hasCompletedLanguage: false,
              hasCompletedMentorship: false,
              hasCompletedCourse: false,
            },
          },
        },
      });

      const response = await axios.get(`${provider.mockService.baseUrl}/v1/profile/${userId}`, {
        headers: { Accept: 'application/json' },
      });

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(userId);
      expect(response.data.firstName).toBe('John');
      expect(response.data.externalMappings).toHaveProperty('kintell');

      await provider.verify();
    });

    it('should return 404 when user does not exist', async () => {
      const userId = '999e4567-e89b-12d3-a456-426614174999';

      await provider.addInteraction({
        state: 'user does not exist',
        uponReceiving: 'a request for non-existent user',
        withRequest: {
          method: 'GET',
          path: `/v1/profile/${userId}`,
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: false,
            error: 'NotFoundError',
            message: `User with id ${userId} not found`,
          },
        },
      });

      try {
        await axios.get(`${provider.mockService.baseUrl}/v1/profile/${userId}`);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.success).toBe(false);
      }

      await provider.verify();
    });
  });

  describe('PUT /v1/profile/:id', () => {
    it('should update user profile', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      await provider.addInteraction({
        state: 'user exists',
        uponReceiving: 'a request to update user profile',
        withRequest: {
          method: 'PUT',
          path: `/v1/profile/${userId}`,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            firstName: 'Jane',
            email: 'jane.doe@example.com',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            id: userId,
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane.doe@example.com',
            role: 'apprentice',
            tenantId: '456e4567-e89b-12d3-a456-426614174001',
          },
        },
      });

      const response = await axios.put(
        `${provider.mockService.baseUrl}/v1/profile/${userId}`,
        { firstName: 'Jane', email: 'jane.doe@example.com' },
        { headers: { 'Content-Type': 'application/json' } }
      );

      expect(response.status).toBe(200);
      expect(response.data.firstName).toBe('Jane');

      await provider.verify();
    });
  });

  describe('POST /v1/profile/mapping', () => {
    it('should create external ID mapping', async () => {
      await provider.addInteraction({
        state: 'user exists',
        uponReceiving: 'a request to create external mapping',
        withRequest: {
          method: 'POST',
          path: '/v1/profile/mapping',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            userId: '123e4567-e89b-12d3-a456-426614174000',
            externalSystem: 'kintell',
            externalId: 'K12345',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            id: '789e4567-e89b-12d3-a456-426614174789',
            userId: '123e4567-e89b-12d3-a456-426614174000',
            externalSystem: 'kintell',
            externalId: 'K12345',
          },
        },
      });

      const response = await axios.post(
        `${provider.mockService.baseUrl}/v1/profile/mapping`,
        {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          externalSystem: 'kintell',
          externalId: 'K12345',
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      expect(response.status).toBe(200);
      expect(response.data.externalSystem).toBe('kintell');

      await provider.verify();
    });
  });
});
