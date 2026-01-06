import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createServiceLogger } from '@teei/shared-utils';
import { createLLMClient, LLMClient } from '../lib/llm-client.js';
import { createCitationExtractor, CitationExtractor, EvidenceGateViolation } from '../lib/citations.js';
import { createRedactionEnforcer, RedactionEnforcer } from '../lib/redaction.js';
import {
  createLineageTracker,
  buildLineageMetadata,
  LineageTracker,
  SectionMetadata,
  CitationMetadata,
} from '../lib/lineage.js';
import { getTemplateManager, SectionType, Locale } from '../lib/prompts/index.js';
import { getCostAggregator } from '../middleware/cost-tracking.js';
import { getAuditIntegration } from '../lib/audit-integration.js';
import { createEvidenceLedger, EvidenceLedger } from '../evidence/ledger.js';
import { pool } from '../db/connection.js';

const logger = createServiceLogger('reporting:gen-reports');

/**
 * Request schema validation
 */
const GenerateReportRequestSchema = z.object({
  companyId: z.string().uuid(),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  locale: z.enum(['en', 'es', 'fr', 'uk', 'no']).default('en'),
  reportType: z
    .enum([
      'quarterly-report',
      'annual-report',
      'investor-update',
      'impact-deep-dive',
      'case-study',
      'methods-whitepaper'
    ])
    .optional(),
  sections: z
    .array(
      z.enum([
        'impact-summary',
        'sroi-narrative',
        'outcome-trends',
        'quarterly-report',
        'annual-report',
        'investor-update',
        'impact-deep-dive',
        'case-study',
        'methods-whitepaper',
      ])
    )
    .optional(),
  deterministic: z.boolean().default(false),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(100).max(8000).optional(),
});

type GenerateReportRequest = z.infer<typeof GenerateReportRequestSchema>;

/**
 * Response schema
 */
interface Citation {
  id: string;
  snippetId: string;
  text: string;
  relevanceScore?: number;
}

interface ReportSection {
  type: string;
  content: string;
  citations: Citation[];
  wordCount: number;
  characterCount: number;
}

interface GenerateReportResponse {
  reportId: string;
  sections: ReportSection[];
  lineage: {
    modelName: string;
    promptVersion: string;
    timestamp: string;
    tokensUsed: number;
    tokensInput: number;
    tokensOutput: number;
    estimatedCostUsd: string;
  };
  warnings?: string[];
}

/**
 * Metrics data interface for report generation
 */
interface MetricsData {
  companyName: string;
  participantsCount: number;
  sessionsCount: number;
  volunteersCount: number;
  avgConfidence: number;
  avgBelonging: number;
  avgJobReadiness: number;
  avgLanguageLevel: number;
  avgWellBeing: number;
  sroiRatio: number;
  visScore: number;
}

/**
 * Fetch metrics for a company and period from database
 */
async function fetchMetricsForPeriod(
  companyId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<MetricsData> {
  const client = await pool.connect();
  try {
    // Query company name
    const companyResult = await client.query(
      'SELECT name FROM companies WHERE id = $1',
      [companyId]
    );
    const companyName = companyResult.rows[0]?.name || 'Unknown Company';

    // Query participant count (program enrollments)
    const participantsResult = await client.query(
      `SELECT COUNT(DISTINCT pe.id) as count
       FROM program_enrollments pe
       WHERE pe.company_id = $1
         AND pe.enrolled_at >= $2
         AND pe.enrolled_at <= $3`,
      [companyId, periodStart, periodEnd]
    );
    const participantsCount = parseInt(participantsResult.rows[0]?.count || '0', 10);

    // Query session count (kintell_sessions)
    const sessionsResult = await client.query(
      `SELECT COUNT(DISTINCT ks.id) as count
       FROM kintell_sessions ks
       WHERE ks.company_id = $1
         AND ks.session_date >= $2
         AND ks.session_date <= $3`,
      [companyId, periodStart, periodEnd]
    );
    const sessionsCount = parseInt(sessionsResult.rows[0]?.count || '0', 10);

    // Query volunteer count (buddy_matches)
    const volunteersResult = await client.query(
      `SELECT COUNT(DISTINCT bm.volunteer_id) as count
       FROM buddy_matches bm
       WHERE bm.company_id = $1
         AND bm.matched_at >= $2
         AND bm.matched_at <= $3`,
      [companyId, periodStart, periodEnd]
    );
    const volunteersCount = parseInt(volunteersResult.rows[0]?.count || '0', 10);

    // Query outcome averages (outcome_scores)
    const outcomesResult = await client.query(
      `SELECT
         dimension,
         AVG(score) as avg_score
       FROM outcome_scores
       WHERE company_id = $1
         AND created_at >= $2
         AND created_at <= $3
       GROUP BY dimension`,
      [companyId, periodStart, periodEnd]
    );

    let avgConfidence = 0;
    let avgBelonging = 0;
    let avgJobReadiness = 0;
    let avgLanguageLevel = 0;
    let avgWellBeing = 0;

    for (const row of outcomesResult.rows) {
      const score = parseFloat(row.avg_score || '0');
      switch (row.dimension) {
        case 'confidence':
          avgConfidence = score;
          break;
        case 'belonging':
        case 'integration':
          avgBelonging = score;
          break;
        case 'job_readiness':
          avgJobReadiness = score;
          break;
        case 'language':
        case 'language_level':
          avgLanguageLevel = score;
          break;
        case 'wellbeing':
        case 'well_being':
          avgWellBeing = score;
          break;
      }
    }

    // Query SROI and VIS from metrics_company_period
    const metricsResult = await client.query(
      `SELECT
         sroi_ratio,
         vis_score
       FROM metrics_company_period
       WHERE company_id = $1
         AND period_start >= $2
         AND period_end <= $3
       ORDER BY period_end DESC
       LIMIT 1`,
      [companyId, periodStart, periodEnd]
    );

    const sroiRatio = metricsResult.rows[0]?.sroi_ratio
      ? parseFloat(metricsResult.rows[0].sroi_ratio)
      : 0;
    const visScore = metricsResult.rows[0]?.vis_score
      ? parseFloat(metricsResult.rows[0].vis_score)
      : 0;

    return {
      companyName,
      participantsCount,
      sessionsCount,
      volunteersCount,
      avgConfidence,
      avgBelonging,
      avgJobReadiness,
      avgLanguageLevel,
      avgWellBeing,
      sroiRatio,
      visScore,
    };
  } catch (error) {
    logger.error('Failed to fetch metrics from database', { error, companyId, periodStart, periodEnd });
    throw new Error(`Failed to fetch metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

/**
 * Report generator - orchestrates the entire generation pipeline
 */
class ReportGenerator {
  constructor(
    private llmClient: LLMClient,
    private citationExtractor: CitationExtractor,
    private redactionEnforcer: RedactionEnforcer,
    private lineageTracker: LineageTracker,
    private evidenceLedger: EvidenceLedger
  ) {}

  async generate(request: GenerateReportRequest): Promise<GenerateReportResponse> {
    const startTime = Date.now();
    const warnings: string[] = [];

    logger.info(`Generating report for company ${request.companyId}`, { request });

    // Determine sections to generate
    let sectionsToGenerate: string[];
    if (request.reportType) {
      // Use report type as a single comprehensive template
      sectionsToGenerate = [request.reportType];
      logger.info(`Using report type template: ${request.reportType}`);
    } else if (request.sections && request.sections.length > 0) {
      // Use specified sections
      sectionsToGenerate = request.sections;
      logger.info(`Generating ${sectionsToGenerate.length} sections`);
    } else {
      // Default to impact summary
      sectionsToGenerate = ['impact-summary'];
      warnings.push('No sections or report type specified, defaulting to impact-summary');
    }

    // Step 1: Extract evidence snippets from database
    const periodStart = new Date(request.period.start);
    const periodEnd = new Date(request.period.end);

    const evidenceSnippets = await this.citationExtractor.extractEvidence(
      request.companyId,
      periodStart,
      periodEnd
    );

    // EVIDENCE GATE: Enforce minimum evidence requirement
    if (evidenceSnippets.length === 0) {
      logger.error('EVIDENCE GATE BLOCKED: No evidence found for period', {
        companyId: request.companyId,
        periodStart: request.period.start,
        periodEnd: request.period.end,
      });
      throw new Error('EVIDENCE_REQUIRED: No evidence found for the specified period. Cannot generate report without evidence.');
    }

    logger.info(`Extracted ${evidenceSnippets.length} evidence snippets`);

    // Step 2: Redact PII from evidence before sending to LLM
    const redactionStartTime = Date.now();
    const { redactedSnippets, redactionMaps } = this.redactionEnforcer.redactSnippets(
      evidenceSnippets.map(s => ({ id: s.id, text: s.text, dimension: s.dimension, score: s.score }))
    );

    // Count total redactions for audit trail
    let totalRedactions = 0;
    for (const redactionMap of redactionMaps.values()) {
      totalRedactions += redactionMap.size;
    }

    // Validate that all redacted content has no PII leaks
    for (const snippet of redactedSnippets) {
      const validation = this.redactionEnforcer.validate(snippet.text);
      if (!validation.isValid) {
        logger.error('PII LEAK DETECTED after redaction', {
          snippetId: snippet.id,
          violations: validation.violations,
        });
        throw new Error(
          `PII redaction failed for snippet ${snippet.id}: ${validation.violations.join(', ')}`
        );
      }
    }

    const redactionDurationMs = Date.now() - redactionStartTime;

    logger.info(`PII redaction complete`, {
      totalSnippets: evidenceSnippets.length,
      totalRedactions,
      redactionTimeMs: redactionDurationMs,
      companyId: request.companyId,
    });

    // Emit redaction completed audit event
    try {
      const auditIntegration = getAuditIntegration();
      await auditIntegration.emitRedactionCompleted({
        reportId: `report-${Date.now()}-${request.companyId}`, // Temporary ID, will be replaced by actual reportId later
        companyId: request.companyId,
        snippetsProcessed: evidenceSnippets.length,
        piiDetectedCount: totalRedactions,
        piiRemovedCount: totalRedactions,
        leaksDetected: 0, // If we got here, no leaks were detected
        success: true,
        durationMs: redactionDurationMs,
      });
    } catch (error: any) {
      logger.warn(`Failed to emit redaction completed event: ${error.message}`);
    }

    // Step 3: Fetch metrics for the company/period from database
    const metrics = await fetchMetricsForPeriod(
      request.companyId,
      periodStart,
      periodEnd
    );

    logger.info('Fetched metrics from database', {
      companyId: request.companyId,
      companyName: metrics.companyName,
      participantsCount: metrics.participantsCount,
      sessionsCount: metrics.sessionsCount,
      volunteersCount: metrics.volunteersCount,
      sroiRatio: metrics.sroiRatio,
      visScore: metrics.visScore,
    });

    // Step 4: Generate each section using LLM
    const templateManager = getTemplateManager();
    const generatedSections: ReportSection[] = [];
    let totalTokensInput = 0;
    let totalTokensOutput = 0;

    for (const sectionType of sectionsToGenerate) {
      logger.info(`Generating section: ${sectionType}`);

      // Prepare template data
      const templateData = {
        ...metrics,
        periodStart: request.period.start,
        periodEnd: request.period.end,
        evidenceSnippets: redactedSnippets,
      };

      // Render prompt template
      const prompt = templateManager.render(
        sectionType as SectionType,
        templateData,
        request.locale
      );

      // Generate content using LLM
      const response = await this.llmClient.generateCompletion(
        [
          { role: 'system', content: 'You are an expert CSR impact analyst.' },
          { role: 'user', content: prompt },
        ],
        {
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          seed: request.deterministic ? 42 : undefined,
        }
      );

      totalTokensInput += response.tokensInput;
      totalTokensOutput += response.tokensOutput;

      // Validate citations in generated content
      const validation = this.citationExtractor.validateCitations(
        response.content,
        evidenceSnippets
      );

      // EVIDENCE GATE: Enforce citation requirements
      if (!validation.valid) {
        logger.error(`EVIDENCE GATE BLOCKED: Citation validation FAILED for ${sectionType}`, {
          errors: validation.errors,
          citationCount: validation.citationCount,
          paragraphCount: validation.paragraphCount,
          citationDensity: validation.citationDensity,
        });

        // Emit evidence gate violation event
        try {
          const auditIntegration = getAuditIntegration();
          await auditIntegration.emitEvidenceGateViolation({
            reportId: `report-${Date.now()}-${request.companyId}`,
            companyId: request.companyId,
            violations: validation.violations || [],
            totalCitationCount: validation.citationCount,
            totalParagraphCount: validation.paragraphCount,
            citationDensity: validation.citationDensity,
            rejected: true,
          });
        } catch (error: any) {
          logger.warn(`Failed to emit evidence gate violation event: ${error.message}`);
        }

        // Return 422 EVIDENCE_REQUIRED when citations fail
        throw new Error(
          `EVIDENCE_REQUIRED: Citation validation failed for section "${sectionType}". ${validation.errors.join('; ')}`
        );
      }

      // Log warnings even if valid
      if (validation.warnings && validation.warnings.length > 0) {
        logger.warn(`Citation warnings for ${sectionType}`, {
          warnings: validation.warnings,
        });
        warnings.push(...validation.warnings.map(w => `${sectionType}: ${w}`));
      }

      logger.info(`Citation validation passed for ${sectionType}`, {
        citationCount: validation.citationCount,
        paragraphCount: validation.paragraphCount,
        citationDensity: validation.citationDensity.toFixed(2),
      });

      // Extract citations from content
      const citationIds = this.citationExtractor.extractCitationIds(response.content);
      const citations: Citation[] = citationIds.map((id, index) => {
        const snippet = evidenceSnippets.find(s => s.id === id);
        return {
          id: `cite-${index}`,
          snippetId: id,
          text: snippet?.text || 'Unknown',
          relevanceScore: snippet?.relevanceScore,
        };
      });

      // Calculate content metrics
      const wordCount = response.content.trim().split(/\s+/).length;
      const characterCount = response.content.length;

      generatedSections.push({
        type: sectionType,
        content: response.content,
        citations,
        wordCount,
        characterCount,
      });
    }

    // Step 5: Build lineage metadata
    const promptVersion = templateManager.getTemplateVersion(
      sectionsToGenerate[0] as SectionType,
      request.locale
    );

    const allCitationIds = generatedSections.flatMap(s => s.citations.map(c => c.snippetId));

    const lineageMetadata = buildLineageMetadata({
      companyId: request.companyId,
      periodStart,
      periodEnd,
      modelName: this.llmClient['config'].model,
      providerName: this.llmClient['config'].provider,
      promptVersion,
      locale: request.locale,
      tokensInput: totalTokensInput,
      tokensOutput: totalTokensOutput,
      sections: sectionsToGenerate,
      citationIds: allCitationIds,
      deterministic: request.deterministic,
      temperature: request.temperature,
      durationMs: Date.now() - startTime,
    });

    // Step 6: Store lineage in database
    const sectionMetadata: SectionMetadata[] = generatedSections.map(s => ({
      sectionType: s.type,
      content: s.content,
      citationIds: s.citations.map(c => c.snippetId),
      wordCount: s.wordCount,
      characterCount: s.characterCount,
    }));

    const citationMetadata: CitationMetadata[] = [];
    let citationNumber = 1;
    for (const section of generatedSections) {
      for (const citation of section.citations) {
        citationMetadata.push({
          citationNumber: citationNumber++,
          snippetId: citation.snippetId,
          snippetText: citation.text,
          relevanceScore: citation.relevanceScore?.toString(),
        });
      }
    }

    await this.lineageTracker.storeLineage(
      lineageMetadata,
      sectionMetadata,
      citationMetadata
    );

    // Step 7: Record evidence usage in tamper-proof ledger
    logger.info('Recording evidence usage in ledger');
    for (const citationMeta of citationMetadata) {
      try {
        await this.evidenceLedger.append({
          evidenceId: citationMeta.snippetId,
          evidenceType: 'citation',
          companyId: request.companyId,
          content: citationMeta.snippetText || '', // Content to hash
          eventType: 'cited',
          reportId: lineageMetadata.reportId,
          lineageId: lineageMetadata.reportId, // Use reportId as lineageId
          operationContext: 'gen_report',
          effectiveAt: new Date(),
        });
      } catch (ledgerError: any) {
        // Don't fail the entire generation if ledger append fails
        logger.error(`Failed to append to evidence ledger: ${ledgerError.message}`, {
          evidenceId: citationMeta.snippetId,
        });
        warnings.push(`Evidence ledger append failed for citation ${citationMeta.snippetId}`);
      }
    }

    // Step 8: Track costs
    const costAggregator = getCostAggregator();
    costAggregator.addCost({
      requestId: lineageMetadata.requestId || 'unknown',
      companyId: request.companyId,
      tokensInput: totalTokensInput,
      tokensOutput: totalTokensOutput,
      tokensTotal: lineageMetadata.tokensTotal,
      estimatedCostUsd: lineageMetadata.estimatedCostUsd,
      modelName: lineageMetadata.modelName,
      provider: lineageMetadata.providerName,
      timestamp: new Date().toISOString(),
      durationMs: lineageMetadata.durationMs || 0,
    });

    logger.info(`Report generation completed`, {
      reportId: lineageMetadata.reportId,
      sectionsCount: generatedSections.length,
      citationsCount: allCitationIds.length,
      tokensTotal: lineageMetadata.tokensTotal,
      cost: lineageMetadata.estimatedCostUsd,
    });

    return {
      reportId: lineageMetadata.reportId,
      sections: generatedSections,
      lineage: {
        modelName: lineageMetadata.modelName,
        promptVersion: lineageMetadata.promptVersion,
        timestamp: new Date().toISOString(),
        tokensUsed: lineageMetadata.tokensTotal,
        tokensInput: totalTokensInput,
        tokensOutput: totalTokensOutput,
        estimatedCostUsd: lineageMetadata.estimatedCostUsd,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

/**
 * Register gen-reports routes
 */
export async function genReportsRoutes(
  app: FastifyInstance,
  options: any
): Promise<void> {
  // Initialize services
  const llmClient = createLLMClient();
  const citationExtractor = createCitationExtractor();
  const redactionEnforcer = createRedactionEnforcer();
  const lineageTracker = createLineageTracker();
  const evidenceLedger = createEvidenceLedger();

  // Initialize audit integration
  const auditIntegration = getAuditIntegration();
  try {
    await auditIntegration.connect();
    logger.info('Audit integration connected');
  } catch (error: any) {
    logger.warn(`Failed to connect audit integration: ${error.message}. Audit events will be skipped.`);
  }

  const reportGenerator = new ReportGenerator(
    llmClient,
    citationExtractor,
    redactionEnforcer,
    lineageTracker,
    evidenceLedger
  );


  /**
   * POST /gen-reports/generate
   * Generate AI report with citations
   */
  app.post<{ Body: GenerateReportRequest }>(
    '/gen-reports/generate',
    async (request: FastifyRequest<{ Body: GenerateReportRequest }>, reply: FastifyReply) => {
      try {
        // Validate request
        const validatedRequest = GenerateReportRequestSchema.parse(request.body);

        // Generate report
        const result = await reportGenerator.generate(validatedRequest);

        reply.code(200).send(result);
      } catch (error: any) {
        logger.error(`Report generation failed: ${error.message}`, { error });

        if (error.name === 'ZodError') {
          reply.code(400).send({
            error: 'Validation error',
            details: error.errors,
          });
        } else if (error instanceof EvidenceGateViolation) {
          // NEW: Handle evidence gate violations with 422 Unprocessable Entity
          logger.warn('Evidence gate violation detected', {
            violationCount: error.violations.length,
            totalCitationCount: error.totalCitationCount,
            totalParagraphCount: error.totalParagraphCount,
            citationDensity: error.citationDensity,
          });

          reply.code(422).send({
            error: 'EVIDENCE_REQUIRED',
            message: error.message,
            violations: error.violations,
            metadata: {
              totalCitationCount: error.totalCitationCount,
              totalParagraphCount: error.totalParagraphCount,
              citationDensity: error.citationDensity.toFixed(2),
            },
          });
        } else {
          reply.code(500).send({
            error: 'Report generation failed',
            message: error.message,
          });
        }
      }
    }
  );

  /**
   * GET /companies/:companyId/gen-reports
   * List generated reports for a company
   */
  app.get<{
    Params: { companyId: string };
    Querystring: {
      type?: string;
      status?: string;
      sortBy?: 'date' | 'type';
      sortOrder?: 'asc' | 'desc';
    };
  }>('/companies/:companyId/gen-reports', async (request, reply) => {
    try {
      const { companyId } = request.params;
      const { type, status, sortBy = 'date', sortOrder = 'desc' } = request.query;

      // Build query
      let query = `
        SELECT
          rl.report_id as "reportId",
          rl.period_start as "periodStart",
          rl.period_end as "periodEnd",
          rl.created_at as "generatedAt",
          rl.tokens_total as "tokensUsed",
          rl.sections,
          rl.locale
        FROM report_lineage rl
        WHERE rl.company_id = $1
      `;

      const params: any[] = [companyId];
      let paramIndex = 2;

      // Filter by type (extract from sections JSONB array)
      if (type && type !== 'all') {
        // Map frontend report types to backend section types
        const typeMap: Record<string, string> = {
          quarterly: 'quarterly-report',
          annual: 'annual-report',
          board_presentation: 'board-presentation',
          csrd: 'csrd-report',
        };
        const sectionType = typeMap[type] || type;
        query += ` AND rl.sections::text LIKE $${paramIndex}`;
        params.push(`%${sectionType}%`);
        paramIndex++;
      }

      // Note: status filtering is not available in report_lineage table
      // We'll default all reports to 'draft' status for now
      // TODO: Add status field to report_lineage table or use a separate reports table

      // Sort
      if (sortBy === 'date') {
        query += ` ORDER BY rl.created_at ${sortOrder.toUpperCase()}`;
      } else if (sortBy === 'type') {
        query += ` ORDER BY rl.sections::text ${sortOrder.toUpperCase()}`;
      }

      const result = await pool.query(query, params);

      // Map database results to frontend format
      const reports = result.rows.map((row) => {
        // Extract report type from sections array
        const sections = Array.isArray(row.sections) ? row.sections : JSON.parse(row.sections || '[]');
        let reportType: string = 'quarterly'; // default
        if (sections.length > 0) {
          const firstSection = sections[0];
          if (firstSection.includes('quarterly')) reportType = 'quarterly';
          else if (firstSection.includes('annual')) reportType = 'annual';
          else if (firstSection.includes('board')) reportType = 'board_presentation';
          else if (firstSection.includes('csrd')) reportType = 'csrd';
        }

        return {
          reportId: row.reportId,
          reportType: reportType as any,
          status: 'draft' as const, // Default to draft since status is not stored
          period: {
            from: row.periodStart.toISOString(),
            to: row.periodEnd.toISOString(),
          },
          generatedAt: row.generatedAt.toISOString(),
          tokensUsed: parseInt(row.tokensUsed, 10) || 0,
        };
      });

      // Apply status filter in memory (since it's not in DB)
      const filteredReports = status && status !== 'all'
        ? reports.filter(r => r.status === status)
        : reports;

      reply.code(200).send({ reports: filteredReports });
    } catch (error: any) {
      logger.error(`Failed to list gen-reports: ${error.message}`, { error });
      reply.code(500).send({
        error: 'Failed to list reports',
        message: error.message,
      });
    }
  });

  /**
   * DELETE /companies/:companyId/gen-reports/:reportId
   * Delete a generated report
   */
  app.delete<{
    Params: { companyId: string; reportId: string };
  }>('/companies/:companyId/gen-reports/:reportId', async (request, reply) => {
    try {
      const { companyId, reportId } = request.params;

      // Verify the report belongs to the company
      const checkResult = await pool.query(
        'SELECT id FROM report_lineage WHERE report_id = $1 AND company_id = $2',
        [reportId, companyId]
      );

      if (checkResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Report not found',
          message: 'Report does not exist or does not belong to this company',
        });
      }

      // Delete report (cascade will delete sections and citations)
      await pool.query(
        'DELETE FROM report_lineage WHERE report_id = $1 AND company_id = $2',
        [reportId, companyId]
      );

      reply.code(200).send({ success: true });
    } catch (error: any) {
      logger.error(`Failed to delete gen-report: ${error.message}`, { error });
      reply.code(500).send({
        error: 'Failed to delete report',
        message: error.message,
      });
    }
  });

  /**
   * GET /gen-reports/cost-summary
   * Get cost summary for generated reports
   */
  app.get('/gen-reports/cost-summary', async (request, reply) => {
    try {
      const costAggregator = getCostAggregator();
      const summary = costAggregator.getSummary();

      reply.code(200).send(summary);
    } catch (error: any) {
      logger.error(`Failed to get cost summary: ${error.message}`, { error });
      reply.code(500).send({
        error: 'Failed to get cost summary',
        message: error.message,
      });
    }
  });
}

