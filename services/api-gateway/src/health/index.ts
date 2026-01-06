/**
 * API Gateway Health Checks
 *
 * Provides comprehensive health monitoring with:
 * - Liveness: Is the gateway running?
 * - Readiness: Can it route requests?
 * - Startup: Has initialization completed?
 * - Dependency checks for all downstream services
 *
 * Ref: MULTI_AGENT_PLAN.md § Reliability Lead / Health Check Engineer
 */

import { FastifyInstance } from 'fastify';
import {
  HealthCheckManager,
  registerHealthRoutes,
  createHttpHealthCheck,
  HealthStatus,
} from '@teei/observability';

const SERVICES = {
  PROFILE: process.env.SERVICE_URL_PROFILE || 'http://localhost:3018',
  KINTELL: process.env.SERVICE_URL_KINTELL || 'http://localhost:3027',
  BUDDY: process.env.SERVICE_URL_BUDDY || 'http://localhost:3019',
  UPSKILLING: process.env.SERVICE_URL_UPSKILLING || 'http://localhost:3028',
  Q2Q: process.env.SERVICE_URL_Q2Q || 'http://localhost:3021',
  SAFETY: process.env.SERVICE_URL_SAFETY || 'http://localhost:3022',
};

export function createHealthManager(): HealthCheckManager {
  const healthManager = new HealthCheckManager('api-gateway', '1.0.0');

  // Register downstream service health checks
  healthManager.registerCheck(
    'unified-profile',
    createHttpHealthCheck('unified-profile', `${SERVICES.PROFILE}/health`, 2000)
  );

  healthManager.registerCheck(
    'kintell-connector',
    createHttpHealthCheck('kintell-connector', `${SERVICES.KINTELL}/health`, 2000)
  );

  healthManager.registerCheck(
    'buddy-service',
    createHttpHealthCheck('buddy-service', `${SERVICES.BUDDY}/health`, 2000)
  );

  healthManager.registerCheck(
    'upskilling-connector',
    createHttpHealthCheck('upskilling-connector', `${SERVICES.UPSKILLING}/health`, 2000)
  );

  healthManager.registerCheck(
    'q2q-ai',
    createHttpHealthCheck('q2q-ai', `${SERVICES.Q2Q}/health`, 2000)
  );

  healthManager.registerCheck(
    'safety-moderation',
    createHttpHealthCheck('safety-moderation', `${SERVICES.SAFETY}/health`, 2000)
  );

  return healthManager;
}

export function setupHealthRoutes(
  fastify: FastifyInstance,
  healthManager: HealthCheckManager
): void {
  registerHealthRoutes(fastify, healthManager);

  // Aggregate health check for all services
  fastify.get('/health/all', async (request, reply) => {
    const health = await healthManager.health();

    // Return detailed information about all downstream services
    return {
      gateway: {
        status: health.status,
        uptime: health.uptime,
      },
      services: health.dependencies?.map(dep => ({
        name: dep.name,
        status: dep.status,
        latency: dep.latency,
        message: dep.message,
      })) || [],
      timestamp: health.timestamp,
    };
  });
}
