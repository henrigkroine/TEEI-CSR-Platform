import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BenevityIngestClient } from '../connectors/benevity/ingest-client.js';
import { GooderaIngestClient } from '../connectors/goodera/ingest-client.js';
import { WorkdayIngestClient } from '../connectors/workday/ingest-client.js';
import { KintellIngestClient } from '../connectors/internal/kintell-ingest-client.js';
import { UpskillingIngestClient } from '../connectors/internal/upskilling-ingest-client.js';
import { BuddyIngestClient } from '../connectors/internal/buddy-ingest-client.js';
import { MentorshipIngestClient } from '../connectors/internal/mentorship-ingest-client.js';
import { createServiceLogger } from '@teei/shared-utils';
import { z } from 'zod';

const logger = createServiceLogger('impact-in:ingest-routes');

/**
 * Query params schema for ingest endpoints
 */
const IngestQuerySchema = z.object({
  company_id: z.string().uuid(),
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});

type IngestQuery = z.infer<typeof IngestQuerySchema>;

/**
 * Register ingest routes for all connectors
 */
export async function registerIngestRoutes(fastify: FastifyInstance) {
  /**
   * POST /v1/ingest/benevity/volunteers
   * Ingest volunteer activities from Benevity
   */
  fastify.post('/benevity/volunteers', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = IngestQuerySchema.parse(request.query);
      const client = createBenevityIngestClient();

      logger.info('Starting Benevity volunteer ingest', {
        companyId: query.company_id,
        since: query.since,
      });

      const result = await client.fetchVolunteerActivities(
        query.company_id,
        query.since,
        query.limit
      );

      // TODO: Persist events to database
      // TODO: Emit events to event bus
      // TODO: Apply PII redaction

      return reply.code(200).send({
        success: result.success,
        summary: {
          volunteers: result.volunteers.length,
          donations: result.donations.length,
        },
        metadata: result.metadata,
        errors: result.errors,
      });
    } catch (error: any) {
      logger.error('Benevity volunteer ingest failed', { error: error.message });
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * POST /v1/ingest/benevity/donations
   * Ingest donations from Benevity
   */
  fastify.post('/benevity/donations', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = IngestQuerySchema.parse(request.query);
      const client = createBenevityIngestClient();

      logger.info('Starting Benevity donation ingest', {
        companyId: query.company_id,
        since: query.since,
      });

      const result = await client.fetchDonations(
        query.company_id,
        query.since,
        query.limit
      );

      return reply.code(200).send({
        success: result.success,
        summary: {
          volunteers: result.volunteers.length,
          donations: result.donations.length,
        },
        metadata: result.metadata,
        errors: result.errors,
      });
    } catch (error: any) {
      logger.error('Benevity donation ingest failed', { error: error.message });
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * POST /v1/ingest/goodera/volunteers
   * Ingest volunteer activities from Goodera
   */
  fastify.post('/goodera/volunteers', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = IngestQuerySchema.parse(request.query);
      const client = createGooderaIngestClient();

      logger.info('Starting Goodera volunteer ingest', {
        companyId: query.company_id,
        since: query.since,
      });

      const result = await client.fetchVolunteerActivities(
        query.company_id,
        query.since,
        query.limit
      );

      return reply.code(200).send({
        success: result.success,
        summary: {
          volunteers: result.volunteers.length,
          donations: result.donations.length,
        },
        metadata: result.metadata,
        errors: result.errors,
      });
    } catch (error: any) {
      logger.error('Goodera volunteer ingest failed', { error: error.message });
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * POST /v1/ingest/goodera/donations
   * Ingest donations from Goodera
   */
  fastify.post('/goodera/donations', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = IngestQuerySchema.parse(request.query);
      const client = createGooderaIngestClient();

      logger.info('Starting Goodera donation ingest', {
        companyId: query.company_id,
        since: query.since,
      });

      const result = await client.fetchDonations(
        query.company_id,
        query.since,
        query.limit
      );

      return reply.code(200).send({
        success: result.success,
        summary: {
          volunteers: result.volunteers.length,
          donations: result.donations.length,
        },
        metadata: result.metadata,
        errors: result.errors,
      });
    } catch (error: any) {
      logger.error('Goodera donation ingest failed', { error: error.message });
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * POST /v1/ingest/workday/directory
   * Ingest employee directory from Workday SCIM
   */
  fastify.post('/workday/directory', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = IngestQuerySchema.parse(request.query);
      const client = createWorkdayIngestClient();

      logger.info('Starting Workday directory sync', {
        companyId: query.company_id,
      });

      const result = await client.fetchDirectory(query.company_id);

      // TODO: Apply PII redaction BEFORE persisting
      // TODO: Persist directory entries to database
      // TODO: Emit events to event bus

      return reply.code(200).send({
        success: result.success,
        summary: {
          directoryEntries: result.directoryEntries.length,
        },
        metadata: result.metadata,
        errors: result.errors,
      });
    } catch (error: any) {
      logger.error('Workday directory sync failed', { error: error.message });
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * POST /v1/ingest/kintell/enrollments
   * Ingest language course enrollments from Kintell
   */
  fastify.post('/kintell/enrollments', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = IngestQuerySchema.parse(request.query);
      const client = createKintellIngestClient();

      logger.info('Starting Kintell enrollment ingest', {
        companyId: query.company_id,
        since: query.since,
      });

      const result = await client.fetchEnrollments(
        query.company_id,
        query.since,
        query.limit
      );

      return reply.code(200).send({
        success: result.success,
        summary: {
          enrollments: result.enrollments.length,
        },
        metadata: result.metadata,
        errors: result.errors,
      });
    } catch (error: any) {
      logger.error('Kintell enrollment ingest failed', { error: error.message });
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * POST /v1/ingest/upskilling/enrollments
   * Ingest upskilling course enrollments
   */
  fastify.post('/upskilling/enrollments', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = IngestQuerySchema.parse(request.query);
      const client = createUpskillingIngestClient();

      logger.info('Starting upskilling enrollment ingest', {
        companyId: query.company_id,
        since: query.since,
      });

      const result = await client.fetchEnrollments(
        query.company_id,
        query.since,
        query.limit
      );

      return reply.code(200).send({
        success: result.success,
        summary: {
          enrollments: result.enrollments.length,
        },
        metadata: result.metadata,
        errors: result.errors,
      });
    } catch (error: any) {
      logger.error('Upskilling enrollment ingest failed', { error: error.message });
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * POST /v1/ingest/buddy/data
   * Ingest buddy matches and events
   */
  fastify.post('/buddy/data', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = IngestQuerySchema.parse(request.query);
      const client = createBuddyIngestClient();

      logger.info('Starting buddy data ingest', {
        companyId: query.company_id,
        since: query.since,
      });

      const result = await client.fetchBuddyData(
        query.company_id,
        query.since,
        query.limit
      );

      return reply.code(200).send({
        success: result.success,
        summary: {
          matches: result.matches.length,
          events: result.events.length,
        },
        metadata: result.metadata,
        errors: result.errors,
      });
    } catch (error: any) {
      logger.error('Buddy data ingest failed', { error: error.message });
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * POST /v1/ingest/mentorship/placements
   * Ingest mentorship placements
   */
  fastify.post('/mentorship/placements', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = IngestQuerySchema.parse(request.query);
      const client = createMentorshipIngestClient();

      logger.info('Starting mentorship placement ingest', {
        companyId: query.company_id,
        since: query.since,
      });

      const result = await client.fetchPlacements(
        query.company_id,
        query.since,
        query.limit
      );

      return reply.code(200).send({
        success: result.success,
        summary: {
          placements: result.placements.length,
        },
        metadata: result.metadata,
        errors: result.errors,
      });
    } catch (error: any) {
      logger.error('Mentorship placement ingest failed', { error: error.message });
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * POST /v1/ingest/all
   * Trigger all ingest jobs for a company (convenience endpoint)
   */
  fastify.post('/all', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = IngestQuerySchema.parse(request.query);

      logger.info('Starting full ingest for all connectors', {
        companyId: query.company_id,
        since: query.since,
      });

      const results = await Promise.allSettled([
        // External connectors
        createBenevityIngestClient().fetchVolunteerActivities(query.company_id, query.since, query.limit),
        createBenevityIngestClient().fetchDonations(query.company_id, query.since, query.limit),
        createGooderaIngestClient().fetchVolunteerActivities(query.company_id, query.since, query.limit),
        createGooderaIngestClient().fetchDonations(query.company_id, query.since, query.limit),
        createWorkdayIngestClient().fetchDirectory(query.company_id),
        // Internal connectors
        createKintellIngestClient().fetchEnrollments(query.company_id, query.since, query.limit),
        createUpskillingIngestClient().fetchEnrollments(query.company_id, query.since, query.limit),
        createBuddyIngestClient().fetchBuddyData(query.company_id, query.since, query.limit),
        createMentorshipIngestClient().fetchPlacements(query.company_id, query.since, query.limit),
      ]);

      const summary = {
        total: results.length,
        successful: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
        failed: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length,
      };

      logger.info('Full ingest completed', { companyId: query.company_id, summary });

      return reply.code(200).send({
        success: summary.failed === 0,
        summary,
        results: results.map((r, i) => ({
          connector: ['benevity-volunteers', 'benevity-donations', 'goodera-volunteers', 'goodera-donations', 'workday-directory', 'kintell-enrollments', 'upskilling-enrollments', 'buddy-data', 'mentorship-placements'][i],
          status: r.status,
          ...(r.status === 'fulfilled' ? { data: r.value.metadata } : { error: r.reason?.message }),
        })),
      });
    } catch (error: any) {
      logger.error('Full ingest failed', { error: error.message });
      return reply.code(500).send({ error: error.message });
    }
  });
}

/**
 * Client factory functions (load config from env vars)
 */
function createBenevityIngestClient(): BenevityIngestClient {
  return new BenevityIngestClient({
    apiUrl: process.env.BENEVITY_API_URL || 'https://api.benevity.com',
    clientId: process.env.BENEVITY_CLIENT_ID || '',
    clientSecret: process.env.BENEVITY_CLIENT_SECRET || '',
    tenantId: process.env.BENEVITY_TENANT_ID || '',
    mockMode: process.env.NODE_ENV === 'development' || !process.env.BENEVITY_CLIENT_ID,
  });
}

function createGooderaIngestClient(): GooderaIngestClient {
  return new GooderaIngestClient({
    apiUrl: process.env.GOODERA_API_URL || 'https://api.goodera.com',
    apiKey: process.env.GOODERA_API_KEY || '',
    projectId: process.env.GOODERA_PROJECT_ID || '',
    mockMode: process.env.NODE_ENV === 'development' || !process.env.GOODERA_API_KEY,
  });
}

function createWorkdayIngestClient(): WorkdayIngestClient {
  return new WorkdayIngestClient({
    apiUrl: process.env.WORKDAY_API_URL || 'https://api.workday.com',
    clientId: process.env.WORKDAY_CLIENT_ID || '',
    clientSecret: process.env.WORKDAY_CLIENT_SECRET || '',
    tenantId: process.env.WORKDAY_TENANT_ID || '',
    mockMode: process.env.NODE_ENV === 'development' || !process.env.WORKDAY_CLIENT_ID,
  });
}

function createKintellIngestClient(): KintellIngestClient {
  return new KintellIngestClient({
    apiUrl: process.env.KINTELL_CONNECTOR_URL || 'http://localhost:3002',
    apiKey: process.env.INTERNAL_API_KEY,
    mockMode: process.env.NODE_ENV === 'development',
  });
}

function createUpskillingIngestClient(): UpskillingIngestClient {
  return new UpskillingIngestClient({
    apiUrl: process.env.UPSKILLING_CONNECTOR_URL || 'http://localhost:3003',
    apiKey: process.env.INTERNAL_API_KEY,
    mockMode: process.env.NODE_ENV === 'development',
  });
}

function createBuddyIngestClient(): BuddyIngestClient {
  return new BuddyIngestClient({
    apiUrl: process.env.BUDDY_CONNECTOR_URL || 'http://localhost:3010',
    apiKey: process.env.INTERNAL_API_KEY,
    mockMode: process.env.NODE_ENV === 'development',
  });
}

function createMentorshipIngestClient(): MentorshipIngestClient {
  return new MentorshipIngestClient({
    apiUrl: process.env.MENTORSHIP_SERVICE_URL || 'http://localhost:3011',
    apiKey: process.env.INTERNAL_API_KEY,
    mockMode: true, // Default to mock mode since service may not exist yet
  });
}
