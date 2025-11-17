import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import { config } from 'dotenv';
import { registerProxyRoutes } from './routes/proxy.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerPrivacyRoutes } from './routes/privacy.js';
import { registerPublicationRoutes } from './routes/publications/index.js';
import { createHealthManager, setupHealthRoutes } from './health/index.js';

// Load environment variables
config();

// Environment configuration
const PORT = parseInt(process.env.PORT_API_GATEWAY || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: NODE_ENV === 'production' ? 'info' : 'debug',
    transport: NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    } : undefined
  },
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
  disableRequestLogging: false,
  trustProxy: true
});

// Create health check manager
const healthManager = createHealthManager();

/**
 * Initialize and configure the API Gateway
 */
async function initializeGateway() {
  try {
    // Setup enhanced health check routes
    setupHealthRoutes(fastify, healthManager);
    healthManager.setAlive(true);

    // Register JWT plugin for authentication
    await fastify.register(fastifyJwt, {
      secret: JWT_SECRET,
      sign: {
        expiresIn: '24h'
      },
      verify: {
        algorithms: ['HS256']
      }
    });

    fastify.log.info('JWT plugin registered');

    // Register rate limiting plugin
    await fastify.register(fastifyRateLimit, {
      max: 100, // Maximum 100 requests
      timeWindow: '1 minute', // Per minute
      cache: 10000, // Cache size
      allowList: ['127.0.0.1'], // Whitelist localhost
      redis: process.env.REDIS_URL ? {
        // Redis configuration for distributed rate limiting
        url: process.env.REDIS_URL
      } : undefined,
      skipOnError: true, // Skip rate limiting on errors
      keyGenerator: (request) => {
        // Use user ID if authenticated, otherwise IP address
        const user = (request as any).user;
        return user?.userId || request.ip;
      },
      errorResponseBuilder: (request, context) => {
        return {
          success: false,
          error: 'Rate Limit Exceeded',
          message: `Too many requests. Please try again in ${Math.ceil(context.after / 1000)} seconds.`,
          retryAfter: context.after
        };
      }
    });

    fastify.log.info('Rate limiting plugin registered');

    // CORS configuration
    fastify.addHook('onRequest', async (request, reply) => {
      const origin = request.headers.origin || '*';
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
      reply.header('Access-Control-Allow-Credentials', 'true');

      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        reply.status(200).send();
      }
    });

    // Request logging hook
    fastify.addHook('onRequest', async (request, reply) => {
      request.log.info({
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent']
      }, 'Incoming request');
    });

    // Response logging hook
    fastify.addHook('onResponse', async (request, reply) => {
      request.log.info({
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.getResponseTime()
      }, 'Request completed');
    });

    // Error handler
    fastify.setErrorHandler((error, request, reply) => {
      request.log.error({
        error,
        url: request.url,
        method: request.method
      }, 'Request error');

      // Don't expose internal errors in production
      const message = NODE_ENV === 'production'
        ? 'Internal Server Error'
        : error.message;

      reply.status(error.statusCode || 500).send({
        success: false,
        error: error.name || 'InternalServerError',
        message,
        ...(NODE_ENV === 'development' && { stack: error.stack })
      });
    });

    // Not found handler
    fastify.setNotFoundHandler((request, reply) => {
      reply.status(404).send({
        success: false,
        error: 'Not Found',
        message: `Route ${request.method} ${request.url} not found`
      });
    });

    // Root endpoint
    fastify.get('/', async (request, reply) => {
      return {
        success: true,
        service: 'TEEI CSR Platform API Gateway',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        endpoints: {
          health: '/health',
          healthAll: '/health/all',
          profile: '/v1/profile/*',
          kintell: '/v1/kintell/*',
          buddy: '/v1/buddy/*',
          upskilling: '/v1/upskilling/*',
          q2q: '/v1/q2q/*',
          safety: '/v1/safety/*',
          privacy: '/v1/privacy/*'
        },
        apiVersion: 'v1',
        deprecation: {
          unversionedEndpoints: 'Deprecated - use /v1/* prefixed endpoints'
        }
      };
    });

    // Register health check routes
    await registerHealthRoutes(fastify);

    // Register GDPR privacy routes
    await registerPrivacyRoutes(fastify);

    // Register publication routes
    await registerPublicationRoutes(fastify);

    // Register proxy routes (must be last to avoid conflicts)
    await registerProxyRoutes(fastify);

    fastify.log.info('All routes and plugins registered successfully');

  } catch (error) {
    fastify.log.error({ error }, 'Failed to initialize gateway');
    throw error;
  }
}

/**
 * Start the API Gateway server
 */
async function start() {
  try {
    await initializeGateway();

    await fastify.listen({
      port: PORT,
      host: HOST
    });

    // Mark service as ready after successful initialization
    healthManager.setReady(true);

    fastify.log.info(`🚀 API Gateway running on http://${HOST}:${PORT}`);
    fastify.log.info(`📊 Environment: ${NODE_ENV}`);
    fastify.log.info(`🔐 JWT Authentication: Enabled`);
    fastify.log.info(`⚡ Rate Limiting: Enabled (100 req/min)`);
    fastify.log.info(`🏥 Health Check: http://${HOST}:${PORT}/health`);

  } catch (error) {
    fastify.log.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string) {
  fastify.log.info(`${signal} received, shutting down gracefully...`);

  // Mark service as shutting down (stops accepting new traffic)
  healthManager.setShuttingDown(true);

  try {
    await fastify.close();
    fastify.log.info('Server closed successfully');
    process.exit(0);
  } catch (error) {
    fastify.log.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  fastify.log.error({ error }, 'Uncaught Exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  fastify.log.error({ promise, reason }, 'Unhandled Rejection');
  process.exit(1);
});

// Start the server
start();
