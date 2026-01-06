/**
 * Hierarchies & Consolidation Routes - Main Index
 */

import { FastifyInstance } from 'fastify';
import { registerOrgRoutes } from './orgs.js';
import { registerConsolidationRoutes } from './consolidation.js';

export async function registerHierarchiesRoutes(fastify: FastifyInstance): Promise<void> {
  await registerOrgRoutes(fastify);
  await registerConsolidationRoutes(fastify);
  // TODO: Add org-units.ts, members.ts, eliminations.ts, adjustments.ts, fx-rates.ts routes

  fastify.log.info('All hierarchies & consolidation routes registered');
}
