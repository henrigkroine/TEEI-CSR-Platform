/**
 * Campaign Service Application Setup
 *
 * Configures Fastify instance with:
 * - Security middleware (helmet, CORS, rate limiting)
 * - JWT authentication
 * - Route registration
 * - Error handling
 * - OpenAPI documentation
 *
 * SWARM 6: Agent 3.6 - Campaign Service API
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { campaignRoutes } from './routes/campaigns.js';
import { beneficiaryGroupRoutes } from './routes/beneficiary-groups.js';
import { programTemplateRoutes } from './routes/program-templates.js';
import { pricingInsightsRoutes } from './routes/pricing-insights.js';
import { upsellOpportunitiesRoutes } from './routes/upsell-opportunities.js';

/**
 * Build Fastify application
 * @returns Configured Fastify instance
 */
export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // ========================================================================
  // SECURITY MIDDLEWARE
  // ========================================================================

  /**
   * Helmet - Security headers
   */
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  /**
   * CORS - Cross-Origin Resource Sharing
   */
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4321',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  /**
   * Rate Limiting - Prevent abuse
   */
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
    errorResponseBuilder: (request, context) => {
      return {
        success: false,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
        retryAfter: context.ttl,
      };
    },
  });

  // ========================================================================
  // JWT AUTHENTICATION
  // ========================================================================

  /**
   * JWT Plugin - Token verification
   */
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'teei-campaigns-secret-change-in-production',
    sign: {
      expiresIn: '24h',
    },
  });

  // ========================================================================
  // ERROR HANDLING
  // ========================================================================

  /**
   * Global error handler
   */
  fastify.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;

    fastify.log.error({
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    });

    // Don't leak error details in production
    const message =
      process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Internal Server Error'
        : error.message;

    reply.status(statusCode).send({
      success: false,
      error: error.name || 'Error',
      message,
      statusCode,
    });
  });

  /**
   * 404 Not Found handler
   */
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
    });
  });

  // ========================================================================
  // HEALTH CHECK ENDPOINT
  // ========================================================================

  fastify.get('/health', async (request, reply) => {
    return {
      success: true,
      service: 'campaigns',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  fastify.get('/', async (request, reply) => {
    return {
      service: 'TEEI Campaign Service',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        campaigns: '/campaigns',
        beneficiaryGroups: '/beneficiary-groups',
        programTemplates: '/program-templates',
        health: '/health',
      },
    };
  });

  // ========================================================================
  // ROUTE REGISTRATION
  // ========================================================================

  /**
   * Campaign routes
   * - POST /campaigns - Create campaign
   * - GET /campaigns/:id - Get campaign details
   * - PATCH /campaigns/:id - Update campaign
   * - DELETE /campaigns/:id - Soft delete campaign
   * - GET /campaigns - List campaigns with filters
   * - GET /campaigns/:id/metrics - Get campaign metrics
   * - GET /campaigns/:id/instances - List program instances
   * - POST /campaigns/:id/transition - Manual state transition
   */
  await fastify.register(campaignRoutes, { prefix: '/api' });

  /**
   * Beneficiary Group routes
   * - GET /beneficiary-groups - List groups
   * - GET /beneficiary-groups/:id - Get group details
   * - GET /beneficiary-groups/:id/compatible-templates - Get compatible templates
   */
  await fastify.register(beneficiaryGroupRoutes, { prefix: '/api' });

  /**
   * Program Template routes
   * - GET /program-templates - List templates
   * - GET /program-templates/:id - Get template details
   * - GET /program-templates/:id/compatible-groups - Get compatible groups
   * - GET /program-templates/types - Get program types summary
   */
  await fastify.register(programTemplateRoutes, { prefix: '/api' });

  /**
   * Pricing Insights routes (Agent 5.3)
   * - GET /campaigns/:id/pricing - Campaign pricing analytics
   * - GET /companies/:id/pricing-signals - All signals for company
   * - GET /companies/:id/pricing-report - Comprehensive report
   * - GET /campaigns/:id/pricing/export - Export campaign pricing
   * - GET /companies/:id/pricing-signals/export - Export all signals
   * - GET /companies/:id/pricing-report/export - Export report
   */
  await fastify.register(pricingInsightsRoutes, { prefix: '/api' });

  /**
   * Upsell Opportunities routes (Agent 5.4)
   * - GET /companies/:companyId/upsell-opportunities - All upsell recommendations
   * - GET /campaigns/:campaignId/upsell-potential - Specific campaign upsell potential
   * - GET /companies/:companyId/bundle-opportunities - Bundle consolidation opportunities
   * - GET /upsell/expansion-opportunities - All expansion opportunities (admin)
   * - GET /upsell/high-performers - All high-performing campaigns (admin)
   */
  await fastify.register(upsellOpportunitiesRoutes, { prefix: '/api' });

  // ========================================================================
  // OPENAPI DOCUMENTATION
  // ========================================================================

  // OpenAPI spec available at /openapi.yaml (static file)

  return fastify;
}
