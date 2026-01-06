/**
 * Unified Profile Service Health Checks
 *
 * Provides comprehensive health monitoring with:
 * - Database connectivity check
 * - NATS event bus connectivity check
 * - Service readiness status
 *
 * Ref: MULTI_AGENT_PLAN.md § Reliability Lead / Health Check Engineer
 */

import { FastifyInstance } from 'fastify';
import {
  HealthCheckManager,
  registerHealthRoutes,
  createDatabaseHealthCheck,
  createNatsHealthCheck,
} from '@teei/observability';
import { getDb } from '@teei/shared-schema';
import { getEventBus } from '@teei/shared-utils';

export function createHealthManager(): HealthCheckManager {
  const healthManager = new HealthCheckManager('unified-profile', '1.0.0');

  // Database health check
  healthManager.registerCheck(
    'database',
    createDatabaseHealthCheck('postgres', async () => {
      try {
        const db = getDb();
        // Simple connectivity check - execute a lightweight query
        await db.execute('SELECT 1');
        return true;
      } catch (error) {
        return false;
      }
    })
  );

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

  return healthManager;
}

export function setupHealthRoutes(
  fastify: FastifyInstance,
  healthManager: HealthCheckManager
): void {
  registerHealthRoutes(fastify, healthManager);
}
