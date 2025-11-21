/**
 * Allowed Regions Routes
 * Exposes regional configuration and validation for AI services
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('allowed-regions');

/**
 * Supported data regions
 */
export type DataRegion = 'us' | 'eu' | 'uk' | 'ap' | 'global';

/**
 * Region metadata
 */
interface RegionMetadata {
  region: DataRegion;
  displayName: string;
  locations: string[];
  aiServicesAvailable: string[];
  dataClassification: 'general' | 'sensitive' | 'restricted';
  certifications: string[];
}

/**
 * Regional metadata (could be loaded from DB in production)
 */
const REGION_METADATA: Record<DataRegion, RegionMetadata> = {
  us: {
    region: 'us',
    displayName: 'United States',
    locations: ['us-east-1', 'us-west-2'],
    aiServicesAvailable: ['openai', 'anthropic', 'google'],
    dataClassification: 'general',
    certifications: ['SOC2', 'ISO27001', 'HIPAA'],
  },
  eu: {
    region: 'eu',
    displayName: 'European Union',
    locations: ['eu-west-1', 'eu-central-1'],
    aiServicesAvailable: ['openai', 'anthropic', 'google'],
    dataClassification: 'sensitive',
    certifications: ['GDPR', 'SOC2', 'ISO27001'],
  },
  uk: {
    region: 'uk',
    displayName: 'United Kingdom',
    locations: ['uk-south-1'],
    aiServicesAvailable: ['openai', 'anthropic'],
    dataClassification: 'sensitive',
    certifications: ['GDPR', 'SOC2', 'ISO27001'],
  },
  ap: {
    region: 'ap',
    displayName: 'Asia Pacific',
    locations: ['ap-southeast-1', 'ap-northeast-1'],
    aiServicesAvailable: ['openai', 'google'],
    dataClassification: 'general',
    certifications: ['SOC2', 'ISO27001'],
  },
  global: {
    region: 'global',
    displayName: 'Global (Multi-Region)',
    locations: ['all'],
    aiServicesAvailable: ['openai', 'anthropic', 'google'],
    dataClassification: 'general',
    certifications: ['SOC2'],
  },
};

/**
 * Company region allowlist (in production, fetch from DB)
 */
const companyAllowedRegions = new Map<string, DataRegion[]>();

/**
 * Register allowed regions routes
 */
export function allowedRegionsRoutes(app: FastifyInstance, prefix: string = '/api/residency') {
  /**
   * GET /api/residency/regions
   * List all available regions with metadata
   */
  app.get(`${prefix}/regions`, async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({
      regions: Object.values(REGION_METADATA),
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/residency/regions/:region
   * Get metadata for a specific region
   */
  app.get(`${prefix}/regions/:region`, async (req: FastifyRequest, reply: FastifyReply) => {
    const { region } = req.params as { region: DataRegion };

    const metadata = REGION_METADATA[region];

    if (!metadata) {
      return reply.code(404).send({
        error: 'REGION_NOT_FOUND',
        message: `Region ${region} not found`,
      });
    }

    return reply.code(200).send(metadata);
  });

  /**
   * GET /api/residency/company/:companyId/allowed-regions
   * Get allowed regions for a company
   */
  app.get(`${prefix}/company/:companyId/allowed-regions`, async (req: FastifyRequest, reply: FastifyReply) => {
    const { companyId } = req.params as { companyId: string };

    // In production: fetch from database
    const allowedRegions = companyAllowedRegions.get(companyId) || ['global'];

    return reply.code(200).send({
      companyId,
      allowedRegions,
      metadata: allowedRegions.map((r) => REGION_METADATA[r]),
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * PUT /api/residency/company/:companyId/allowed-regions
   * Update allowed regions for a company
   */
  app.put(`${prefix}/company/:companyId/allowed-regions`, async (req: FastifyRequest, reply: FastifyReply) => {
    const { companyId } = req.params as { companyId: string };
    const { allowedRegions } = req.body as { allowedRegions: DataRegion[] };

    // Validate regions
    const validRegions: DataRegion[] = ['us', 'eu', 'uk', 'ap', 'global'];
    const invalidRegions = allowedRegions.filter((r) => !validRegions.includes(r));

    if (invalidRegions.length > 0) {
      return reply.code(400).send({
        error: 'INVALID_REGIONS',
        message: `Invalid regions: ${invalidRegions.join(', ')}`,
        validRegions,
      });
    }

    // Update allowlist (in production: update database)
    companyAllowedRegions.set(companyId, allowedRegions);

    logger.info(`Updated allowed regions for company ${companyId}: ${allowedRegions.join(', ')}`);

    return reply.code(200).send({
      companyId,
      allowedRegions,
      updatedAt: new Date().toISOString(),
    });
  });

  /**
   * POST /api/residency/validate-region-access
   * Validate if a company can access a specific region
   */
  app.post(`${prefix}/validate-region-access`, async (req: FastifyRequest, reply: FastifyReply) => {
    const { companyId, requestedRegion } = req.body as {
      companyId: string;
      requestedRegion: DataRegion;
    };

    const allowedRegions = companyAllowedRegions.get(companyId) || ['global'];

    const allowed =
      allowedRegions.includes(requestedRegion) || allowedRegions.includes('global');

    return reply.code(200).send({
      companyId,
      requestedRegion,
      allowed,
      allowedRegions,
      reason: allowed
        ? 'Region is in allowed list'
        : `Region ${requestedRegion} not in allowed list: ${allowedRegions.join(', ')}`,
      timestamp: new Date().toISOString(),
    });
  });
}
