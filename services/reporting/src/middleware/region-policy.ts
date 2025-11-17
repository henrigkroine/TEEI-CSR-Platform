/**
 * Region Policy Middleware
 * Enforces data residency and region-aware model selection
 */

import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import {
  selectRegionalEndpoint,
  validateRegion,
  logRegionDecision,
  DataRegion,
  RegionPolicy,
  RegionPolicyError,
} from '@teei/model-registry';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('region-policy');

/**
 * Extract region from request headers
 */
export function extractRegionFromHeaders(req: FastifyRequest): DataRegion | undefined {
  const regionHeader = req.headers['x-data-region'] as string | undefined;

  if (!regionHeader) {
    return undefined;
  }

  const region = regionHeader.toLowerCase() as DataRegion;

  // Validate region value
  const validRegions: DataRegion[] = ['us', 'eu', 'uk', 'ap', 'global'];
  if (!validRegions.includes(region)) {
    logger.warn(`Invalid region header value: ${regionHeader}`);
    return undefined;
  }

  return region;
}

/**
 * Middleware to validate and enforce region policy
 */
export function createRegionPolicyMiddleware(getPolicy: (tenantId: string) => RegionPolicy) {
  return async (req: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
    // Extract tenant ID from request (adjust based on your auth strategy)
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default';

    // Extract requested region
    const requestRegion = extractRegionFromHeaders(req);

    // Get tenant's region policy
    const policy = getPolicy(tenantId);

    // Validate region if specified
    if (requestRegion) {
      const validation = validateRegion(requestRegion, policy);

      if (!validation.allowed) {
        logger.error(`Region policy violation for tenant ${tenantId}:`, validation.reason);

        return reply.code(403).send({
          error: 'REGION_POLICY_VIOLATION',
          message: validation.reason || 'Requested region is not allowed',
          allowedRegions: policy.allowedRegions,
          requestedRegion: requestRegion,
        });
      }
    }

    // Attach region context to request
    (req as any).regionContext = {
      tenantId,
      requestRegion,
      policy,
    };

    done();
  };
}

/**
 * Select model endpoint with region awareness
 */
export function selectModelWithRegion(
  modelId: string,
  tenantId: string,
  requestRegion: DataRegion | undefined,
  policy: RegionPolicy
): {
  baseUrl: string;
  modelId: string;
  region: DataRegion;
} {
  try {
    const endpoint = selectRegionalEndpoint(modelId, requestRegion, policy);

    // Log decision for audit trail
    logRegionDecision(tenantId, modelId, requestRegion, endpoint.region, policy);

    return {
      baseUrl: endpoint.baseUrl,
      modelId: endpoint.modelId,
      region: endpoint.region,
    };
  } catch (error) {
    if (error instanceof RegionPolicyError) {
      logger.error(`Region policy error for tenant ${tenantId}:`, error.message);
      throw error;
    }
    throw error;
  }
}

/**
 * Helper to get region context from request
 */
export function getRegionContext(req: FastifyRequest): {
  tenantId: string;
  requestRegion: DataRegion | undefined;
  policy: RegionPolicy;
} | null {
  return (req as any).regionContext || null;
}
