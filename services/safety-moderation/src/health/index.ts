/**
 * Safety Moderation Service Health Checks
 *
 * Provides comprehensive health monitoring with:
 * - NATS event bus connectivity check
 * - Service readiness status
 * - Content moderation API availability (future)
 *
 * Ref: MULTI_AGENT_PLAN.md § Reliability Lead / Health Check Engineer
 */

import { FastifyInstance } from 'fastify';
import {
  HealthCheckManager,
  registerHealthRoutes,
  createNatsHealthCheck,
} from '@teei/observability';
import { getEventBus } from '@teei/shared-utils';

export function createHealthManager(): HealthCheckManager {
  const healthManager = new HealthCheckManager('safety-moderation', '1.0.0');

  // NATS health check
  healthManager.registerCheck(
    'nats',
    createNatsHealthCheck('nats-event-bus', async () => {
      try {
        const eventBus = getEventBus();
        return eventBus.isConnected();
      } catch (error) {
        return false;
      }
    })
  );

  // Future: Add external moderation API health check

  return healthManager;
}

export function setupHealthRoutes(
  fastify: FastifyInstance,
  healthManager: HealthCheckManager
): void {
  registerHealthRoutes(fastify, healthManager);
}
