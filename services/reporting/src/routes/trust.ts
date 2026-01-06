/**
 * Trust API Routes
 *
 * Provides transparency endpoints for Trust Boardroom:
 * - Evidence lineage and citations
 * - Integrity ledger verification
 * - Data retention and residency policies
 *
 * @module routes/trust
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, inArray } from 'drizzle-orm';
import {
  reportLineage,
  reportCitations,
  evidenceSnippets,
  dataRetentionPolicies,
} from '@teei/shared-schema';
import { createServiceLogger } from '@teei/shared-utils';
import { createRedactionEnforcer } from '../lib/redaction.js';

const logger = createServiceLogger('reporting:trust');

// Initialize database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable not set');
}
const client = postgres(connectionString);
const db = drizzle(client);

// Initialize PII redaction
const redactionEnforcer = createRedactionEnforcer();

/**
 * Evidence response schema
 */
interface EvidenceResponse {
  reportId: string;
  companyId: string;
  citations: Array<{
    citationId: string;
    snippetId: string;
    snippetText: string;
    relevanceScore: string | null;
    snippetHash: string;
    dimension: string;
    score: number;
  }>;
  evidenceCount: number;
  lineage: {
    modelName: string;
    promptVersion: string;
    timestamp: string;
    tokensUsed: number;
  };
}

/**
 * Ledger response schema
 */
interface LedgerResponse {
  reportId: string;
  companyId: string;
  entries: Array<{
    entryId: string;
    timestamp: string;
    operation: string;
    actor: string;
    metadata: any;
  }>;
  verified: boolean;
  tamperLog: Array<{
    timestamp: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  integrityScore: number;
}

/**
 * Policies response schema
 */
interface PoliciesResponse {
  regions: Array<{
    region: string;
    dataResidency: string;
    regulations: string[];
  }>;
  residency: {
    eu: { allowed: boolean; locations: string[] };
    us: { allowed: boolean; locations: string[] };
    uk: { allowed: boolean; locations: string[] };
  };
  gdpr: {
    enabled: boolean;
    retention: Array<{
      category: string;
      retentionDays: number;
      legalBasis: string;
      deletionMethod: string;
    }>;
  };
}

/**
 * Compute SHA-256 hash of snippet text for verification
 */
function computeSnippetHash(text: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
}

/**
 * GET /trust/v1/evidence/:reportId
 * Returns evidence lineage and citations for a report
 */
async function getEvidenceEndpoint(
  request: FastifyRequest<{ Params: { reportId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { reportId } = request.params;

  try {
    logger.info(`Fetching evidence for report ${reportId}`);

    // Query report lineage
    const [lineageRecord] = await db
      .select()
      .from(reportLineage)
      .where(eq(reportLineage.reportId, reportId))
      .limit(1);

    if (!lineageRecord) {
      return reply.code(404).send({
        error: 'Report not found',
        message: `No report found with ID: ${reportId}`,
      });
    }

    // Tenant scoping check - extract companyId from JWT or request context
    // For now, using the lineage record's companyId
    const companyId = lineageRecord.companyId;

    // Query all citations for this report
    const citationsRecords = await db
      .select({
        citationId: reportCitations.id,
        snippetId: reportCitations.snippetId,
        snippetText: reportCitations.snippetText,
        relevanceScore: reportCitations.relevanceScore,
        citationNumber: reportCitations.citationNumber,
      })
      .from(reportCitations)
      .where(eq(reportCitations.lineageId, lineageRecord.id))
      .orderBy(reportCitations.citationNumber);

    // Get unique snippet IDs to fetch additional metadata
    const snippetIds = citationsRecords.map((c) => c.snippetId);

    // Query evidence_snippets for additional metadata (dimension, score)
    // Note: evidence_snippets table structure from citations.ts shows it has outcomeScoreId
    const snippetsMetadata = await db
      .select({
        id: evidenceSnippets.id,
        snippetText: evidenceSnippets.snippetText,
        outcomeScoreId: evidenceSnippets.outcomeScoreId,
      })
      .from(evidenceSnippets)
      .where(inArray(evidenceSnippets.id, snippetIds));

    // Build citations response with PII redaction
    const citations = citationsRecords.map((citation) => {
      const snippetMeta = snippetsMetadata.find((s) => s.id === citation.snippetId);

      // Apply PII redaction to snippet text
      const redactedText = citation.snippetText
        ? redactionEnforcer.redact(citation.snippetText)
        : 'N/A';

      // Validate no PII leaks after redaction
      const validation = redactionEnforcer.validate(redactedText);
      if (!validation.isValid) {
        logger.warn('PII leak detected in evidence snippet, masking entirely', {
          snippetId: citation.snippetId,
          violations: validation.violations,
        });
        // Mask entire snippet if PII detected after redaction
        return {
          citationId: citation.citationId,
          snippetId: citation.snippetId,
          snippetText: '[REDACTED]',
          relevanceScore: citation.relevanceScore,
          snippetHash: computeSnippetHash('[REDACTED]'),
          dimension: 'unknown',
          score: 0,
        };
      }

      return {
        citationId: citation.citationId,
        snippetId: citation.snippetId,
        snippetText: redactedText,
        relevanceScore: citation.relevanceScore,
        snippetHash: computeSnippetHash(redactedText),
        dimension: 'unknown', // TODO: Join with outcome_scores to get dimension
        score: 0, // TODO: Join with outcome_scores to get score
      };
    });

    const response: EvidenceResponse = {
      reportId,
      companyId,
      citations,
      evidenceCount: citations.length,
      lineage: {
        modelName: lineageRecord.modelName,
        promptVersion: lineageRecord.promptVersion,
        timestamp: lineageRecord.createdAt?.toISOString() || new Date().toISOString(),
        tokensUsed: lineageRecord.tokensTotal,
      },
    };

    logger.info(`Returned ${citations.length} citations for report ${reportId}`);
    reply.code(200).send(response);
  } catch (error: any) {
    logger.error(`Failed to fetch evidence for report ${reportId}:`, error);
    reply.code(500).send({
      error: 'Internal server error',
      message: 'Failed to retrieve evidence data',
    });
  }
}

/**
 * GET /trust/v1/ledger/:reportId
 * Returns integrity ledger and tamper detection results
 */
async function getLedgerEndpoint(
  request: FastifyRequest<{ Params: { reportId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { reportId } = request.params;

  try {
    logger.info(`Fetching ledger for report ${reportId}`);

    // Query report lineage for basic verification
    const [lineageRecord] = await db
      .select()
      .from(reportLineage)
      .where(eq(reportLineage.reportId, reportId))
      .limit(1);

    if (!lineageRecord) {
      return reply.code(404).send({
        error: 'Report not found',
        message: `No report found with ID: ${reportId}`,
      });
    }

    const companyId = lineageRecord.companyId;

    // TODO: Query evidence_ledger table once it's created
    // For now, construct a basic ledger from report_lineage metadata
    const entries = [
      {
        entryId: lineageRecord.id,
        timestamp: lineageRecord.createdAt?.toISOString() || new Date().toISOString(),
        operation: 'REPORT_GENERATED',
        actor: lineageRecord.createdBy || 'system',
        metadata: {
          modelName: lineageRecord.modelName,
          promptVersion: lineageRecord.promptVersion,
          tokensTotal: lineageRecord.tokensTotal,
          citationCount: lineageRecord.citationCount,
        },
      },
    ];

    // Run basic integrity verification
    const tamperLog: Array<{
      timestamp: string;
      issue: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    let integrityScore = 100;

    // Check 1: Verify citation count matches actual citations
    const citationsCount = await db
      .select()
      .from(reportCitations)
      .where(eq(reportCitations.lineageId, lineageRecord.id));

    if (citationsCount.length !== lineageRecord.citationCount) {
      tamperLog.push({
        timestamp: new Date().toISOString(),
        issue: `Citation count mismatch: expected ${lineageRecord.citationCount}, found ${citationsCount.length}`,
        severity: 'high',
      });
      integrityScore -= 30;
    }

    // Check 2: Verify tokens are within reasonable bounds
    if (lineageRecord.tokensTotal < lineageRecord.tokensInput + lineageRecord.tokensOutput) {
      tamperLog.push({
        timestamp: new Date().toISOString(),
        issue: 'Token accounting inconsistency detected',
        severity: 'medium',
      });
      integrityScore -= 15;
    }

    // Check 3: Verify timestamps are reasonable
    const reportAge = Date.now() - (lineageRecord.createdAt?.getTime() || Date.now());
    if (reportAge < 0) {
      tamperLog.push({
        timestamp: new Date().toISOString(),
        issue: 'Report created_at timestamp is in the future',
        severity: 'high',
      });
      integrityScore -= 40;
    }

    const verified = tamperLog.length === 0;
    integrityScore = Math.max(0, integrityScore);

    const response: LedgerResponse = {
      reportId,
      companyId,
      entries,
      verified,
      tamperLog,
      integrityScore,
    };

    logger.info(
      `Ledger verification for report ${reportId}: verified=${verified}, score=${integrityScore}`
    );
    reply.code(200).send(response);
  } catch (error: any) {
    logger.error(`Failed to fetch ledger for report ${reportId}:`, error);
    reply.code(500).send({
      error: 'Internal server error',
      message: 'Failed to retrieve ledger data',
    });
  }
}

/**
 * GET /trust/v1/policies
 * Returns data retention and residency policies (public endpoint)
 */
async function getPoliciesEndpoint(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    logger.info('Fetching data retention and residency policies');

    // Query active retention policies from database
    const policies = await db
      .select({
        dataCategory: dataRetentionPolicies.dataCategory,
        retentionPeriodDays: dataRetentionPolicies.retentionPeriodDays,
        legalBasis: dataRetentionPolicies.legalBasis,
        deletionMethod: dataRetentionPolicies.deletionMethod,
      })
      .from(dataRetentionPolicies)
      .where(eq(dataRetentionPolicies.active, true));

    // TODO: Query services/data-residency/ for actual region rules
    // For now, return static configuration
    const response: PoliciesResponse = {
      regions: [
        {
          region: 'eu',
          dataResidency: 'EU-WEST-1',
          regulations: ['GDPR', 'ePrivacy Directive'],
        },
        {
          region: 'us',
          dataResidency: 'US-EAST-1',
          regulations: ['CCPA', 'SOC 2'],
        },
        {
          region: 'uk',
          dataResidency: 'UK-LONDON-1',
          regulations: ['UK GDPR', 'Data Protection Act 2018'],
        },
      ],
      residency: {
        eu: {
          allowed: true,
          locations: ['eu-west-1', 'eu-central-1'],
        },
        us: {
          allowed: true,
          locations: ['us-east-1', 'us-west-2'],
        },
        uk: {
          allowed: true,
          locations: ['uk-london-1'],
        },
      },
      gdpr: {
        enabled: true,
        retention: policies.map((p) => ({
          category: p.dataCategory,
          retentionDays: p.retentionPeriodDays,
          legalBasis: p.legalBasis,
          deletionMethod: p.deletionMethod,
        })),
      },
    };

    logger.info(`Returned ${policies.length} retention policies`);
    reply.code(200).send(response);
  } catch (error: any) {
    logger.error('Failed to fetch policies:', error);
    reply.code(500).send({
      error: 'Internal server error',
      message: 'Failed to retrieve policy data',
    });
  }
}

/**
 * Register Trust API routes
 */
export async function trustRoutes(
  fastify: FastifyInstance,
  options: any
): Promise<void> {
  /**
   * GET /trust/v1/evidence/:reportId
   * Returns evidence lineage and citations for a report
   */
  fastify.get<{ Params: { reportId: string } }>(
    '/trust/v1/evidence/:reportId',
    {
      schema: {
        description: 'Get evidence lineage and citations for a report',
        tags: ['Trust'],
        params: {
          type: 'object',
          required: ['reportId'],
          properties: {
            reportId: {
              type: 'string',
              format: 'uuid',
              description: 'Report ID',
            },
          },
        },
        response: {
          200: {
            description: 'Evidence data',
            type: 'object',
            properties: {
              reportId: { type: 'string' },
              companyId: { type: 'string' },
              citations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    citationId: { type: 'string' },
                    snippetId: { type: 'string' },
                    snippetText: { type: 'string' },
                    relevanceScore: { type: 'string', nullable: true },
                    snippetHash: { type: 'string' },
                    dimension: { type: 'string' },
                    score: { type: 'number' },
                  },
                },
              },
              evidenceCount: { type: 'number' },
              lineage: {
                type: 'object',
                properties: {
                  modelName: { type: 'string' },
                  promptVersion: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                  tokensUsed: { type: 'number' },
                },
              },
            },
          },
          404: {
            description: 'Report not found',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    getEvidenceEndpoint
  );

  /**
   * GET /trust/v1/ledger/:reportId
   * Returns integrity ledger and verification results
   */
  fastify.get<{ Params: { reportId: string } }>(
    '/trust/v1/ledger/:reportId',
    {
      schema: {
        description: 'Get integrity ledger for a report',
        tags: ['Trust'],
        params: {
          type: 'object',
          required: ['reportId'],
          properties: {
            reportId: {
              type: 'string',
              format: 'uuid',
              description: 'Report ID',
            },
          },
        },
        response: {
          200: {
            description: 'Ledger data',
            type: 'object',
            properties: {
              reportId: { type: 'string' },
              companyId: { type: 'string' },
              entries: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    entryId: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                    operation: { type: 'string' },
                    actor: { type: 'string' },
                    metadata: { type: 'object' },
                  },
                },
              },
              verified: { type: 'boolean' },
              tamperLog: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    timestamp: { type: 'string', format: 'date-time' },
                    issue: { type: 'string' },
                    severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                  },
                },
              },
              integrityScore: { type: 'number' },
            },
          },
          404: {
            description: 'Report not found',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    getLedgerEndpoint
  );

  /**
   * GET /trust/v1/policies
   * Returns data retention and residency policies (public endpoint)
   */
  fastify.get(
    '/trust/v1/policies',
    {
      schema: {
        description: 'Get data retention and residency policies',
        tags: ['Trust'],
        response: {
          200: {
            description: 'Policy data',
            type: 'object',
            properties: {
              regions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    region: { type: 'string' },
                    dataResidency: { type: 'string' },
                    regulations: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                },
              },
              residency: {
                type: 'object',
                properties: {
                  eu: {
                    type: 'object',
                    properties: {
                      allowed: { type: 'boolean' },
                      locations: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                  },
                  us: {
                    type: 'object',
                    properties: {
                      allowed: { type: 'boolean' },
                      locations: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                  },
                  uk: {
                    type: 'object',
                    properties: {
                      allowed: { type: 'boolean' },
                      locations: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                  },
                },
              },
              gdpr: {
                type: 'object',
                properties: {
                  enabled: { type: 'boolean' },
                  retention: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        category: { type: 'string' },
                        retentionDays: { type: 'number' },
                        legalBasis: { type: 'string' },
                        deletionMethod: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    getPoliciesEndpoint
  );

  logger.info('Trust API routes registered');
}
