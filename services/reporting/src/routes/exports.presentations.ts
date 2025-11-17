/**
 * Presentation Exports Routes
 *
 * API endpoints for generating executive packs:
 * - POST /exports/presentations - Generate PDF/PPTX
 * - GET /exports/:id/status - Check generation status
 * - GET /exports/:id/download - Download generated files
 *
 * @module routes/exports.presentations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  generateReportId,
  generateEvidenceHash,
  generateWatermarkedPDFHTML,
  createSignatureBlockHTML,
  type PDFWatermarkConfig,
  type IDStampConfig,
  type SignatureBlockConfig,
} from '../../utils/pdfWatermark.js';
import {
  generatePPTX,
  createExecutiveSummaryTemplate,
  createQuarterlyTemplate,
  createAnnualTemplate,
  createInvestorTemplate,
  createImpactTemplate,
  type PPTXOptions,
  type PPTXSlide,
  type QuarterlyData,
  type AnnualData,
  type InvestorData,
  type ImpactData,
} from '../utils/pptxGenerator.js';

/**
 * Export request body
 */
interface ExportRequest {
  format: 'pdf' | 'pptx' | 'both';
  companyId: string;
  reportId?: string;
  period: string;
  template: 'quarterly' | 'annual' | 'investor' | 'impact' | 'executive'; // Template selection
  narrative: {
    tone: 'formal' | 'conversational' | 'technical';
    length: 'brief' | 'standard' | 'detailed';
    audience: 'board' | 'management' | 'public';
    promptInstructions: string;
  };
  watermark: PDFWatermarkConfig;
  includeEvidenceAppendix: boolean;
}

/**
 * Export status response
 */
interface ExportStatus {
  exportId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  message: string;
  pdfUrl?: string;
  pptxUrl?: string;
  completedAt?: string;
  error?: string;
}

/**
 * In-memory export job storage
 * In production, use Redis or database
 */
const exportJobs = new Map<string, ExportStatus>();

/**
 * Register presentation export routes
 */
export default async function exportsRoutes(fastify: FastifyInstance) {
  /**
   * POST /exports/presentations
   * Start export generation
   */
  fastify.post('/exports/presentations', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as ExportRequest;

    try {
      // Generate export ID
      const exportId = generateReportId(body.companyId, body.period);

      // Initialize job status
      const jobStatus: ExportStatus = {
        exportId,
        status: 'pending',
        progress: 0,
        message: 'Export queued',
      };
      exportJobs.set(exportId, jobStatus);

      // Start async generation
      generateExportAsync(exportId, body).catch((error) => {
        console.error(`[Exports] Generation failed for ${exportId}:`, error);
        const job = exportJobs.get(exportId);
        if (job) {
          job.status = 'failed';
          job.error = error.message;
          exportJobs.set(exportId, job);
        }
      });

      reply.code(202).send({
        exportId,
        message: 'Export generation started',
        statusUrl: `/exports/${exportId}/status`,
      });
    } catch (error) {
      console.error('[Exports] Error starting export:', error);
      reply.code(500).send({
        error: 'Failed to start export',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /exports/:id/status
   * Check export status
   */
  fastify.get(
    '/exports/:id/status',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      const status = exportJobs.get(id);

      if (!status) {
        reply.code(404).send({ error: 'Export not found' });
        return;
      }

      reply.send(status);
    }
  );

  /**
   * GET /exports/:id/download
   * Download generated export
   */
  fastify.get(
    '/exports/:id/download',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { format?: 'pdf' | 'pptx' };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const { format = 'pdf' } = request.query;

      const status = exportJobs.get(id);

      if (!status || status.status !== 'completed') {
        reply.code(404).send({ error: 'Export not ready or not found' });
        return;
      }

      const url = format === 'pdf' ? status.pdfUrl : status.pptxUrl;

      if (!url) {
        reply.code(404).send({ error: `${format.toUpperCase()} not available for this export` });
        return;
      }

      // In production, redirect to signed S3 URL or serve from storage
      reply.redirect(302, url);
    }
  );
}

/**
 * Generate export asynchronously
 */
async function generateExportAsync(exportId: string, request: ExportRequest): Promise<void> {
  const updateProgress = (progress: number, message: string) => {
    const job = exportJobs.get(exportId);
    if (job) {
      job.status = 'generating';
      job.progress = progress;
      job.message = message;
      exportJobs.set(exportId, job);
    }
  };

  try {
    updateProgress(10, 'Collecting report data...');

    // Simulate fetching report data
    await sleep(1000);
    const reportData = await fetchReportData(request);

    updateProgress(30, 'Generating narrative...');

    // Generate narrative using Worker 2 AI
    await sleep(1500);
    const narrative = await generateNarrative(request, reportData);

    updateProgress(50, 'Creating watermarked PDF...');

    // Generate PDF if requested
    let pdfUrl: string | undefined;
    if (request.format === 'pdf' || request.format === 'both') {
      await sleep(2000);
      pdfUrl = await generatePDF(exportId, request, reportData, narrative);
    }

    updateProgress(75, 'Creating PowerPoint deck...');

    // Generate PPTX if requested
    let pptxUrl: string | undefined;
    if (request.format === 'pptx' || request.format === 'both') {
      await sleep(1500);
      pptxUrl = await generatePPTXDeck(exportId, request, reportData, narrative);
    }

    updateProgress(95, 'Finalizing export...');
    await sleep(500);

    // Mark as complete
    const job = exportJobs.get(exportId);
    if (job) {
      job.status = 'completed';
      job.progress = 100;
      job.message = 'Export completed';
      job.pdfUrl = pdfUrl;
      job.pptxUrl = pptxUrl;
      job.completedAt = new Date().toISOString();
      exportJobs.set(exportId, job);
    }
  } catch (error) {
    throw new Error(`Export generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch report data from database
 */
async function fetchReportData(request: ExportRequest): Promise<any> {
  // Mock implementation - in production, query database
  return {
    companyName: `Company ${request.companyId}`,
    period: request.period,
    metrics: {
      sroi: 3.45,
      beneficiaries: 1250,
      volunteer_hours: 4800,
      social_value: 165000,
    },
    key_achievements: [
      'Increased volunteer participation by 34%',
      'Expanded program reach to 3 new communities',
      'Improved outcome scores across all dimensions',
      'Achieved 98% beneficiary satisfaction rating',
    ],
    evidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004', 'EV-005'],
    approvedBy: null, // Set if report is approved
  };
}

/**
 * Generate narrative using Worker 2 AI
 */
async function generateNarrative(request: ExportRequest, data: any): Promise<string> {
  // Mock implementation - in production, call Worker 2 AI service
  const { tone, length, audience } = request.narrative;

  let narrative = '';

  if (tone === 'formal') {
    narrative = `Our organization achieved significant outcomes during ${data.period}, demonstrating a social return on investment of ${data.metrics.sroi}:1.`;
  } else if (tone === 'conversational') {
    narrative = `We're proud to share the impact we made during ${data.period}. Our programs created real value with a ${data.metrics.sroi}:1 social return.`;
  } else {
    narrative = `Quantitative analysis for ${data.period} indicates SROI ratio of ${data.metrics.sroi}:1 based on validated evidence.`;
  }

  if (length === 'detailed') {
    narrative += `\n\nOur programs reached ${data.metrics.beneficiaries.toLocaleString()} beneficiaries through ${data.metrics.volunteer_hours.toLocaleString()} volunteer hours, generating $${data.metrics.social_value.toLocaleString()} in social value.`;
  }

  return narrative;
}

/**
 * Generate watermarked PDF
 */
async function generatePDF(
  exportId: string,
  request: ExportRequest,
  data: any,
  narrative: string
): Promise<string> {
  // Generate evidence hash
  const evidenceHash = generateEvidenceHash(data.evidenceIds);

  // Create content HTML
  const contentHTML = `
    <h1>${data.companyName} - Impact Report</h1>
    <h2>${data.period}</h2>

    <h3>Executive Summary</h3>
    <p>${narrative}</p>

    <h3>Key Metrics</h3>
    <table>
      <tr>
        <th>Metric</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>Social ROI</td>
        <td>${data.metrics.sroi.toFixed(2)}:1</td>
      </tr>
      <tr>
        <td>Total Beneficiaries</td>
        <td>${data.metrics.beneficiaries.toLocaleString()}</td>
      </tr>
      <tr>
        <td>Volunteer Hours</td>
        <td>${data.metrics.volunteer_hours.toLocaleString()}</td>
      </tr>
      <tr>
        <td>Social Value Created</td>
        <td>$${data.metrics.social_value.toLocaleString()}</td>
      </tr>
    </table>

    <h3>Key Achievements</h3>
    <ul>
      ${data.key_achievements.map((achievement: string) => `<li>${achievement}</li>`).join('\n')}
    </ul>
  `;

  // Create ID stamp
  const idStamp: IDStampConfig = {
    reportId: exportId,
    generatedAt: new Date(),
    evidenceHash,
    pageNumber: 1,
    totalPages: 1,
  };

  // Create signature block if approved
  let signatureBlock: SignatureBlockConfig | undefined;
  if (data.approvedBy) {
    signatureBlock = {
      approverName: data.approvedBy.name,
      approverTitle: data.approvedBy.title,
      approvedAt: new Date(data.approvedBy.approvedAt),
    };
  }

  // Generate watermarked HTML
  const finalHTML = generateWatermarkedPDFHTML(
    contentHTML,
    request.watermark,
    idStamp,
    signatureBlock
  );

  // In production, render with Playwright and upload to S3
  // For now, return mock URL
  const mockUrl = `/exports/${exportId}/files/report.pdf`;

  console.log('[Exports] Generated PDF:', mockUrl);

  return mockUrl;
}

/**
 * Generate PowerPoint deck
 */
async function generatePPTXDeck(
  exportId: string,
  request: ExportRequest,
  data: any,
  narrative: string
): Promise<string> {
  // Validate template selection
  const validTemplates = ['quarterly', 'annual', 'investor', 'impact', 'executive'];
  if (!validTemplates.includes(request.template)) {
    throw new Error(`Invalid template: ${request.template}. Must be one of: ${validTemplates.join(', ')}`);
  }

  // Create slides using selected template
  let slides: PPTXSlide[];

  switch (request.template) {
    case 'quarterly':
      slides = createQuarterlyTemplate(buildQuarterlyData(data, request));
      break;

    case 'annual':
      slides = createAnnualTemplate(buildAnnualData(data, request, narrative));
      break;

    case 'investor':
      slides = createInvestorTemplate(buildInvestorData(data, request, narrative));
      break;

    case 'impact':
      slides = createImpactTemplate(buildImpactData(data, request));
      break;

    case 'executive':
    default:
      // Legacy executive summary template
      slides = createExecutiveSummaryTemplate({
        title: `${data.companyName} - Impact Report`,
        period: data.period,
        company: data.companyName,
        metrics: data.metrics,
        key_achievements: data.key_achievements,
        charts: [
          {
            type: 'bar',
            title: 'Impact Metrics Overview',
            labels: ['SROI', 'Beneficiaries', 'Hours', 'Value ($k)'],
            datasets: [
              {
                label: 'Q4 2024',
                data: [
                  data.metrics.sroi,
                  data.metrics.beneficiaries / 100,
                  data.metrics.volunteer_hours / 100,
                  data.metrics.social_value / 1000,
                ],
                backgroundColor: '#3b82f6',
              },
            ],
          },
        ],
      });
      break;
  }

  console.log(`[Exports] Generated ${slides.length} slides using ${request.template} template`);

  // Generate PPTX options
  const options: PPTXOptions = {
    title: `${data.companyName} - Impact Report`,
    author: 'TEEI CSR Platform',
    company: data.companyName,
    companyId: request.companyId,
    subject: `Impact Report for ${data.period}`,
    layout: 'LAYOUT_16x9',
    theme: 'corporate',
    includeWatermark: request.watermark.enabled,
    watermarkText: request.watermark.text,
    approvalStatus: data.approvedBy ? 'APPROVED' : 'DRAFT',
  };

  // Generate PPTX (currently returns mock buffer)
  const pptxBuffer = await generatePPTX(slides, options);

  // In production, upload to S3
  // For now, return mock URL
  const mockUrl = `/exports/${exportId}/files/presentation.pptx`;

  console.log('[Exports] Generated PPTX:', mockUrl);

  return mockUrl;
}

/**
 * Build quarterly template data
 */
function buildQuarterlyData(data: any, request: ExportRequest): QuarterlyData {
  // Parse period (e.g., "Q1 2025")
  const periodMatch = request.period.match(/Q(\d) (\d{4})/);
  const quarter = periodMatch ? parseInt(periodMatch[1]) : 1;
  const year = periodMatch ? parseInt(periodMatch[2]) : new Date().getFullYear();

  return {
    company: data.companyName,
    period: request.period,
    quarter: { year, quarter },
    metrics: {
      sroi: data.metrics.sroi,
      beneficiaries: data.metrics.beneficiaries,
      volunteer_hours: data.metrics.volunteer_hours,
      social_value: data.metrics.social_value,
      engagement_rate: 0.85, // Mock - in production, fetch from DB
    },
    top_achievements: data.key_achievements.slice(0, 3),
    quarterly_trend: {
      type: 'line',
      title: 'SROI Quarterly Trend',
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        {
          label: year.toString(),
          data: [2.8, 3.1, 3.3, data.metrics.sroi],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
        },
      ],
    },
    dimensions: [
      { name: 'Social Impact', score: 8.2, change: 5.3 },
      { name: 'Environmental', score: 7.5, change: -2.1 },
      { name: 'Governance', score: 9.1, change: 1.8 },
    ],
    evidenceIds: data.evidenceIds,
    includeEvidenceAppendix: request.includeEvidenceAppendix,
  };
}

/**
 * Build annual template data
 */
function buildAnnualData(data: any, request: ExportRequest, narrative: string): AnnualData {
  const year = new Date().getFullYear();

  return {
    company: data.companyName,
    year,
    metrics: {
      sroi: data.metrics.sroi,
      beneficiaries: data.metrics.beneficiaries,
      volunteer_hours: data.metrics.volunteer_hours,
      social_value: data.metrics.social_value,
      programs_count: 12, // Mock
    },
    timeline: [
      { quarter: 'Q1', milestone: 'Launched new volunteer programs' },
      { quarter: 'Q2', milestone: 'Expanded to 3 new communities' },
      { quarter: 'Q3', milestone: 'Achieved 1000+ volunteer hours' },
      { quarter: 'Q4', milestone: 'Record SROI performance' },
    ],
    csrd_narrative: narrative,
    sdg_alignment: [
      { goal_number: 1, goal_name: 'No Poverty', contribution: 'Economic empowerment programs' },
      { goal_number: 4, goal_name: 'Quality Education', contribution: 'Skills training initiatives' },
      { goal_number: 8, goal_name: 'Decent Work', contribution: 'Job placement support' },
    ],
    citations: [
      { slideNumber: 3, references: ['EV-001', 'EV-002', 'EV-003'] },
      { slideNumber: 4, references: ['EV-004', 'EV-005'] },
    ],
    evidenceIds: data.evidenceIds,
  };
}

/**
 * Build investor template data
 */
function buildInvestorData(data: any, request: ExportRequest, narrative: string): InvestorData {
  return {
    company: data.companyName,
    period: request.period,
    sroi_headline: data.metrics.sroi,
    financial_impact: {
      total_investment: 500000, // Mock
      social_value_created: data.metrics.social_value,
      cost_per_beneficiary: data.metrics.social_value / data.metrics.beneficiaries,
      efficiency_ratio: 0.92, // Mock
    },
    growth_metrics: [
      {
        type: 'line',
        title: 'SROI Growth Trajectory',
        labels: ['2021', '2022', '2023', '2024'],
        datasets: [
          {
            label: 'SROI',
            data: [1.8, 2.3, 2.9, data.metrics.sroi],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
          },
        ],
      },
      {
        type: 'bar',
        title: 'Beneficiary Growth',
        labels: ['2021', '2022', '2023', '2024'],
        datasets: [
          {
            label: 'Beneficiaries',
            data: [450, 680, 920, data.metrics.beneficiaries],
            backgroundColor: '#8b5cf6',
          },
        ],
      },
    ],
    risk_mitigation: [
      { risk: 'Data quality', mitigation: 'Automated validation pipelines', status: 'mitigated' },
      { risk: 'Program attrition', mitigation: 'Enhanced engagement tracking', status: 'monitoring' },
      { risk: 'Impact measurement', mitigation: 'Third-party audits', status: 'mitigated' },
    ],
    executive_summary: narrative,
    evidenceIds: data.evidenceIds?.slice(0, 3), // Limited evidence
  };
}

/**
 * Build impact deep dive template data
 */
function buildImpactData(data: any, request: ExportRequest): ImpactData {
  return {
    company: data.companyName,
    period: request.period,
    dimensions: [
      {
        name: 'Social Impact',
        score: 8.5,
        evidence_count: 24,
        breakdown: [
          { metric: 'Beneficiary satisfaction', value: 4.7, evidence_ids: ['EV-001', 'EV-002'] },
          { metric: 'Community engagement', value: 78.5, evidence_ids: ['EV-003', 'EV-004'] },
          { metric: 'Outcome achievement', value: 92.3, evidence_ids: ['EV-005'] },
        ],
        lineage_chart: {
          type: 'line',
          title: 'Social Impact Evidence Flow',
          labels: ['Raw', 'Validated', 'Aggregated', 'Scored'],
          datasets: [
            {
              label: 'Evidence Count',
              data: [45, 38, 28, 24],
              borderColor: '#3b82f6',
            },
          ],
        },
      },
      {
        name: 'Environmental',
        score: 7.2,
        evidence_count: 18,
        breakdown: [
          { metric: 'Carbon footprint reduction', value: 12.5, evidence_ids: ['EV-006', 'EV-007'] },
          { metric: 'Resource efficiency', value: 85.0, evidence_ids: ['EV-008'] },
        ],
      },
      {
        name: 'Governance',
        score: 9.1,
        evidence_count: 15,
        breakdown: [
          { metric: 'Policy compliance', value: 100, evidence_ids: ['EV-009', 'EV-010'] },
          { metric: 'Transparency score', value: 94.5, evidence_ids: ['EV-011'] },
        ],
      },
    ],
    evidenceAppendix: data.evidenceIds.map((id: string, idx: number) => ({
      evidence_id: id,
      type: idx % 3 === 0 ? 'Survey' : idx % 3 === 1 ? 'Observation' : 'Document',
      description: `Evidence record for ${id} - detailed description of the evidence and its validation`,
      source: 'Program Database',
      date: '2024-12-15',
    })),
    citations_per_slide: 3,
    explainer_boxes: [
      {
        title: 'Overview',
        content: 'This deep dive provides granular analysis of impact across all dimensions, backed by validated evidence and full lineage tracking.',
      },
      {
        title: 'Social Impact Explainer',
        content: 'Social impact measures our direct effect on beneficiaries and communities, including satisfaction, engagement, and outcome achievement.',
      },
      {
        title: 'Environmental Explainer',
        content: 'Environmental dimension tracks our sustainability practices and resource efficiency.',
      },
      {
        title: 'Governance Explainer',
        content: 'Governance ensures compliance, transparency, and ethical operation of all programs.',
      },
    ],
  };
}

/**
 * Helper: Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
