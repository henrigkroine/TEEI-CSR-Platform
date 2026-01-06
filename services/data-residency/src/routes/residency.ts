import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/index.js';
import { companyRegions } from '../db/schema.js';
import { ResidencyValidationRequestSchema, UpdateCompanyRegionSchema } from '../types/index.js';
import type { Region, ResidencyType } from '../types/index.js';
import { logResidencyCheck } from '../utils/audit.js';
import type { ResidencyCache } from '../utils/cache.js';
import type { DataResidencyConfig } from '../config.js';

interface ResidencyRoutesOptions {
  cache: ResidencyCache;
  config: DataResidencyConfig;
}

export async function residencyRoutes(
  app: FastifyInstance,
  options: ResidencyRoutesOptions
) {
  const { cache, config } = options;

  /**
   * GET /api/residency/company/:id
   * Get company's assigned region
   */
  app.get<{ Params: { id: string } }>(
    '/api/residency/company/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id: companyId } = request.params;

      // Check cache first
      const cached = await cache.get(companyId);
      if (cached) {
        return reply.code(200).send({
          companyId: cached.companyId,
          region: cached.region,
          residencyType: cached.residencyType,
          source: 'cache',
        });
      }

      // Query database
      const db = getDatabase();
      const result = await db
        .select()
        .from(companyRegions)
        .where(eq(companyRegions.companyId, companyId))
        .limit(1);

      if (result.length === 0) {
        // Company not found - return default region
        return reply.code(200).send({
          companyId,
          region: config.defaultRegion,
          residencyType: 'flexible' as ResidencyType,
          source: 'default',
        });
      }

      const companyRegion = result[0];

      // Update cache
      await cache.set(companyId, companyRegion);

      return reply.code(200).send({
        companyId: companyRegion.companyId,
        region: companyRegion.region,
        residencyType: companyRegion.residencyType,
        source: 'database',
      });
    }
  );

  /**
   * PUT /api/residency/company/:id
   * Update company's region (admin only, audit logged)
   */
  app.put<{
    Params: { id: string };
    Body: { region: Region; residencyType: ResidencyType };
  }>(
    '/api/residency/company/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { region: Region; residencyType: ResidencyType };
      }>,
      reply: FastifyReply
    ) => {
      const { id: companyId } = request.params;
      const body = UpdateCompanyRegionSchema.parse(request.body);

      const db = getDatabase();

      // Check if company region exists
      const existing = await db
        .select()
        .from(companyRegions)
        .where(eq(companyRegions.companyId, companyId))
        .limit(1);

      let result;

      if (existing.length === 0) {
        // Insert new record
        result = await db
          .insert(companyRegions)
          .values({
            companyId,
            region: body.region,
            residencyType: body.residencyType,
          })
          .returning();
      } else {
        // Update existing record
        result = await db
          .update(companyRegions)
          .set({
            region: body.region,
            residencyType: body.residencyType,
            updatedAt: new Date(),
          })
          .where(eq(companyRegions.companyId, companyId))
          .returning();
      }

      // Invalidate cache
      await cache.invalidate(companyId);

      // Log the update (for audit)
      await logResidencyCheck({
        companyId,
        requestedRegion: body.region,
        assignedRegion: body.region,
        residencyType: body.residencyType,
        allowed: true,
        operation: 'region_update',
        requestId: request.id,
      });

      return reply.code(200).send({
        companyId: result[0].companyId,
        region: result[0].region,
        residencyType: result[0].residencyType,
        updatedAt: result[0].updatedAt,
      });
    }
  );

  /**
   * POST /api/residency/validate
   * Validate if operation is allowed for company+region combination
   */
  app.post<{ Body: unknown }>(
    '/api/residency/validate',
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const body = ResidencyValidationRequestSchema.parse(request.body);
      const { companyId, requestedRegion, operation } = body;

      // Get company's assigned region
      let assignedRegion: Region;
      let residencyType: ResidencyType;

      // Check cache first
      const cached = await cache.get(companyId);
      if (cached) {
        assignedRegion = cached.region as Region;
        residencyType = cached.residencyType as ResidencyType;
      } else {
        // Query database
        const db = getDatabase();
        const result = await db
          .select()
          .from(companyRegions)
          .where(eq(companyRegions.companyId, companyId))
          .limit(1);

        if (result.length === 0) {
          // Company not found - use default region
          assignedRegion = config.defaultRegion;
          residencyType = 'flexible';
        } else {
          assignedRegion = result[0].region as Region;
          residencyType = result[0].residencyType as ResidencyType;
          // Update cache
          await cache.set(companyId, result[0]);
        }
      }

      // Validate residency
      let allowed = true;
      let reason: string | undefined;

      if (config.enforcement === 'strict') {
        if (residencyType === 'strict' && assignedRegion !== requestedRegion) {
          allowed = false;
          reason = `Company has strict ${assignedRegion} residency requirement. Cannot access ${requestedRegion} resources.`;
        }
      }

      // Log the validation check
      await logResidencyCheck({
        companyId,
        requestedRegion,
        assignedRegion,
        residencyType,
        allowed,
        operation,
        requestId: request.id,
      });

      const statusCode = allowed ? 200 : 403;

      return reply.code(statusCode).send({
        allowed,
        companyRegion: assignedRegion,
        requestedRegion,
        residencyType,
        reason,
      });
    }
  );

  /**
   * POST /api/residency/validate/bulk
   * Bulk validate multiple companies (for batch operations)
   */
  app.post<{ Body: { validations: Array<{ companyId: string; requestedRegion: Region; operation?: string }> } }>(
    '/api/residency/validate/bulk',
    async (
      request: FastifyRequest<{
        Body: { validations: Array<{ companyId: string; requestedRegion: Region; operation?: string }> };
      }>,
      reply: FastifyReply
    ) => {
      const { validations } = request.body;

      if (!Array.isArray(validations)) {
        return reply.code(400).send({ error: 'validations must be an array' });
      }

      const results = await Promise.all(
        validations.map(async (validation) => {
          const { companyId, requestedRegion, operation } = validation;

          // Get company's assigned region
          let assignedRegion: Region;
          let residencyType: ResidencyType;

          const cached = await cache.get(companyId);
          if (cached) {
            assignedRegion = cached.region as Region;
            residencyType = cached.residencyType as ResidencyType;
          } else {
            const db = getDatabase();
            const result = await db
              .select()
              .from(companyRegions)
              .where(eq(companyRegions.companyId, companyId))
              .limit(1);

            if (result.length === 0) {
              assignedRegion = config.defaultRegion;
              residencyType = 'flexible';
            } else {
              assignedRegion = result[0].region as Region;
              residencyType = result[0].residencyType as ResidencyType;
              await cache.set(companyId, result[0]);
            }
          }

          // Validate residency
          let allowed = true;
          let reason: string | undefined;

          if (config.enforcement === 'strict') {
            if (residencyType === 'strict' && assignedRegion !== requestedRegion) {
              allowed = false;
              reason = `Company has strict ${assignedRegion} residency requirement`;
            }
          }

          // Log the validation check
          await logResidencyCheck({
            companyId,
            requestedRegion,
            assignedRegion,
            residencyType,
            allowed,
            operation,
            requestId: request.id,
          });

          return {
            companyId,
            allowed,
            companyRegion: assignedRegion,
            requestedRegion,
            residencyType,
            reason,
          };
        })
      );

      return reply.code(200).send({ results });
    }
  );
}
