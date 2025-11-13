import type { FastifyPluginAsync } from 'fastify';
import { getAtAGlance } from '../controllers/atAGlance.js';
import { getOutcomes } from '../controllers/outcomes.js';
import { getQ2QFeed } from '../controllers/q2qFeed.js';
import { getSROI } from '../controllers/sroiController.js';
import { getVIS } from '../controllers/visController.js';
import { exportCSRD } from '../controllers/export.js';

export const companyRoutes: FastifyPluginAsync = async (fastify) => {
  // At-a-glance metrics
  fastify.get('/companies/:id/at-a-glance', {
    schema: {
      description: 'Get at-a-glance metrics for a company',
      tags: ['companies'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', pattern: '^\\d{4}-Q[1-4]$' },
        },
      },
    },
    handler: getAtAGlance,
  });

  // Outcome dimensions
  fastify.get('/companies/:id/outcomes', {
    schema: {
      description: 'Get outcome time series for a company',
      tags: ['companies'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          dimensions: {
            type: 'string',
            description: 'Comma-separated: integration,language,job_readiness',
          },
        },
      },
    },
    handler: getOutcomes,
  });

  // Q2Q feed
  fastify.get('/companies/:id/q2q-feed', {
    schema: {
      description: 'Get Q2Q insights feed for a company',
      tags: ['companies'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        },
      },
    },
    handler: getQ2QFeed,
  });

  // SROI
  fastify.get('/companies/:id/sroi', {
    schema: {
      description: 'Calculate SROI for a company',
      tags: ['companies'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', pattern: '^\\d{4}-Q[1-4]$' },
        },
      },
    },
    handler: getSROI,
  });

  // VIS
  fastify.get('/companies/:id/vis', {
    schema: {
      description: 'Calculate VIS for a company',
      tags: ['companies'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', pattern: '^\\d{4}-Q[1-4]$' },
          top: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
      },
    },
    handler: getVIS,
  });

  // Export
  fastify.get('/export/csrd', {
    schema: {
      description: 'Export CSRD data in CSV or JSON format',
      tags: ['export'],
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['csv', 'json'], default: 'json' },
          period: { type: 'string', pattern: '^\\d{4}-Q[1-4]$' },
        },
      },
    },
    handler: exportCSRD,
  });
};
