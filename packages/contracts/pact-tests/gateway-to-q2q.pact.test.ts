/**
 * Contract test: API Gateway → Q2Q AI Service
 *
 * Verifies contract between Gateway and Q2Q AI service for text classification.
 */

import { Pact } from '@pact-foundation/pact';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import axios from 'axios';
import path from 'path';

describe('API Gateway → Q2Q AI Service Contract', () => {
  const provider = new Pact({
    consumer: 'api-gateway',
    provider: 'q2q-ai-service',
    port: 8081,
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

  describe('POST /v1/classify/text', () => {
    it('should classify text successfully', async () => {
      await provider.addInteraction({
        state: 'service is available',
        uponReceiving: 'a request to classify text',
        withRequest: {
          method: 'POST',
          path: '/v1/classify/text',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            text: 'I improved my communication skills through mentorship',
            userId: '123e4567-e89b-12d3-a456-426614174000',
            contextType: 'conversation',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            classification: {
              scores: {
                communication: 0.85,
                teamwork: 0.45,
                problem_solving: 0.30,
              },
              metadata: {
                model: 'stub',
                version: '1.0.0',
              },
              scoreIds: {
                communication: '111e4567-e89b-12d3-a456-426614174111',
                teamwork: '222e4567-e89b-12d3-a456-426614174222',
                problem_solving: '333e4567-e89b-12d3-a456-426614174333',
              },
            },
            message: 'Text classified successfully',
          },
        },
      });

      const response = await axios.post(
        `${provider.mockService.baseUrl}/v1/classify/text`,
        {
          text: 'I improved my communication skills through mentorship',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          contextType: 'conversation',
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.classification.scores).toHaveProperty('communication');

      await provider.verify();
    });
  });

  describe('GET /v1/taxonomy', () => {
    it('should return outcome taxonomy', async () => {
      await provider.addInteraction({
        state: 'taxonomy is available',
        uponReceiving: 'a request for taxonomy',
        withRequest: {
          method: 'GET',
          path: '/v1/taxonomy',
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            dimensions: [
              {
                dimension: 'communication',
                label: 'Communication',
                description: 'Ability to express ideas clearly',
                category: 'employability',
              },
              {
                dimension: 'teamwork',
                label: 'Teamwork',
                description: 'Ability to collaborate effectively',
                category: 'employability',
              },
            ],
            count: 2,
          },
        },
      });

      const response = await axios.get(`${provider.mockService.baseUrl}/v1/taxonomy`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.dimensions).toHaveLength(2);

      await provider.verify();
    });
  });
});
