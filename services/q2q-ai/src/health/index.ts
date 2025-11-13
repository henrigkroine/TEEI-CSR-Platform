/**
 * Q2Q AI Service Health Checks
 *
 * Provides comprehensive health monitoring with:
 * - Service readiness status
 * - Model availability checks (future)
 *
 * Ref: MULTI_AGENT_PLAN.md § Reliability Lead / Health Check Engineer
 */

import { FastifyInstance } from 'fastify';
import {
  HealthCheckManager,
  registerHealthRoutes,
} from '@teei/observability';

export function createHealthManager(): HealthCheckManager {
  const healthManager = new HealthCheckManager('q2q-ai', '1.0.0');

  // Currently no external dependencies
  // Future: Add ML model availability checks

  return healthManager;
}

export function setupHealthRoutes(
  fastify: FastifyInstance,
  healthManager: HealthCheckManager
): void {
  registerHealthRoutes(fastify, healthManager);
}
