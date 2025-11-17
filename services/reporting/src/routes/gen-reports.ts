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
    .enum(['quarterly-report', 'annual-report', 'investor-update', 'impact-deep-dive'])
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
 * Report generator - orchestrates the entire generation pipeline
 */
class ReportGenerator {
  constructor(
    private llmClient: LLMClient,
    private citationExtractor: CitationExtractor,
    private redactionEnforcer: RedactionEnforcer,
    private lineageTracker: LineageTracker
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

    if (evidenceSnippets.length === 0) {
      warnings.push('Insufficient evidence found for the period. Report quality may be limited.');
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

    // Step 3: Fetch metrics for the company/period
    // TODO: Query metrics_company_period table
    const metrics = {
      companyName: 'Sample Company', // TODO: Fetch from database
      participantsCount: 150,
      sessionsCount: 450,
      volunteersCount: 30,
      avgConfidence: 0.78,
      avgBelonging: 0.82,
      avgJobReadiness: 0.65,
      avgLanguageLevel: 0.71,
      avgWellBeing: 0.76,
      sroiRatio: 5.23,
      visScore: 87.5,
    };

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

      if (!validation.valid) {
        logger.error(`Citation validation FAILED for ${sectionType}`, {
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

        // In strict mode, fail the entire generation if citations are invalid
        throw new Error(
          `Citation validation failed for section "${sectionType}": ${validation.errors.join('; ')}`
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

    // Step 7: Track costs
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
    lineageTracker
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
