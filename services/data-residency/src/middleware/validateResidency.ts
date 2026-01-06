import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/index.js';
import { companyRegions } from '../db/schema.js';
import type { Region, ResidencyType } from '../types/index.js';
import { logResidencyCheck } from '../utils/audit.js';
import type { ResidencyCache } from '../utils/cache.js';
import type { DataResidencyConfig } from '../config.js';

interface ValidateResidencyOptions {
  cache: ResidencyCache;
  config: DataResidencyConfig;
}

/**
 * Fastify middleware to validate data residency
 * Throws 403 if company's data residency policy is violated
 *
 * Usage:
 * app.addHook('onRequest', validateResidencyMiddleware(cache, config));
 *
 * Expects request to have:
 * - headers['x-company-id'] - Company UUID
 * - headers['x-requested-region'] - Target region for the operation (optional, defaults to current region)
 */
export function createValidateResidencyMiddleware(options: ValidateResidencyOptions) {
  const { cache, config } = options;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip health checks and internal endpoints
    if (request.url.startsWith('/health') || request.url.startsWith('/metrics')) {
      return;
    }

    const companyId = request.headers['x-company-id'] as string | undefined;

    // If no company ID, skip validation (might be public endpoint)
    if (!companyId) {
      return;
    }

    const requestedRegion = (request.headers['x-requested-region'] as Region) || config.currentRegion;

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
        reason = `GDPR violation: Company has strict ${assignedRegion} residency requirement. Cannot access ${requestedRegion} resources.`;
      }
    }

    // Log the validation check
    await logResidencyCheck({
      companyId,
      requestedRegion,
      assignedRegion,
      residencyType,
      allowed,
      operation: `${request.method} ${request.url}`,
      requestId: request.id,
    });

    // Add residency info to request headers for downstream services
    request.headers['x-data-region'] = assignedRegion;
    request.headers['x-residency-type'] = residencyType;

    // Reject request if not allowed
    if (!allowed) {
      return reply.code(403).send({
        error: 'Data Residency Violation',
        message: reason,
        companyRegion: assignedRegion,
        requestedRegion,
      });
    }
  };
}
