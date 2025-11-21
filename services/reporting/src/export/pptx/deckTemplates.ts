/**
 * Deck Template Generators
 *
 * Pre-built templates for executive presentations:
 * - Quarterly Report
 * - Annual Report
 * - Investor Update
 * - Impact Deep Dive
 *
 * @module export/pptx/deckTemplates
 */

import type { DeckDefinition, SlideDefinition, SlideBlock, DeckTemplate } from '@teei/shared-types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Template data for deck generation
 */
export interface TemplateData {
  companyId: string;
  companyName: string;
  period: {
    start: string;
    end: string;
  };
  locale: string;
  metrics?: {
    sroi?: number;
    vis?: number;
    beneficiaries?: number;
    volunteer_hours?: number;
    social_value?: number;
    engagement_rate?: number;
    outcome_improvement?: number;
  };
  key_achievements?: string[];
  evidenceIds?: string[];
  charts?: Array<{
    type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
    title: string;
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string;
    }>;
  }>;
}

/**
 * Generate Quarterly Report deck
 */
export function generateQuarterlyDeck(data: TemplateData): DeckDefinition {
  const deckId = uuidv4();
  const slides: SlideDefinition[] = [];

  // Slide 1: Title
  slides.push(createTitleSlide(1, data, 'Quarterly Impact Report'));

  // Slide 2: Metrics At-a-Glance
  if (data.metrics) {
    slides.push(createMetricsGridSlide(2, data));
  }

  // Slide 3: Key Achievements
  if (data.key_achievements && data.key_achievements.length > 0) {
    slides.push(createKeyAchievementsSlide(3, data));
  }

  // Slide 4-6: Charts (if provided)
  if (data.charts) {
    data.charts.slice(0, 3).forEach((chart, index) => {
      slides.push(createChartSlide(4 + index, chart, data.evidenceIds));
    });
  }

  // Slide 7: Evidence Summary
  if (data.evidenceIds && data.evidenceIds.length > 0) {
    slides.push(createEvidenceSummarySlide(7, data));
  }

  // Slide 8: Closing
  slides.push(createClosingSlide(8, data));

  return {
    id: deckId,
    title: `${data.companyName} - Quarterly Impact Report`,
    subtitle: `${data.period.start} to ${data.period.end}`,
    template: 'quarterly',
    companyId: data.companyId,
    period: data.period,
    locale: data.locale as any,
    slides,
    metadata: {
      author: 'TEEI CSR Platform',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '2.0',
      approvalStatus: 'draft',
    },
  };
}

/**
 * Generate Annual Report deck
 */
export function generateAnnualDeck(data: TemplateData): DeckDefinition {
  const deckId = uuidv4();
  const slides: SlideDefinition[] = [];

  // Slide 1: Title
  slides.push(createTitleSlide(1, data, 'Annual Impact Report'));

  // Slide 2: Executive Summary
  slides.push(createExecutiveSummarySlide(2, data));

  // Slide 3: Metrics At-a-Glance
  if (data.metrics) {
    slides.push(createMetricsGridSlide(3, data));
  }

  // Slide 4: SROI Deep Dive
  if (data.metrics?.sroi) {
    slides.push(createSROISlide(4, data));
  }

  // Slide 5: VIS Deep Dive
  if (data.metrics?.vis) {
    slides.push(createVISSlide(5, data));
  }

  // Slide 6: Key Achievements
  if (data.key_achievements && data.key_achievements.length > 0) {
    slides.push(createKeyAchievementsSlide(6, data));
  }

  // Slide 7-10: Charts
  if (data.charts) {
    data.charts.forEach((chart, index) => {
      slides.push(createChartSlide(7 + index, chart, data.evidenceIds));
    });
  }

  // Slide 11: Evidence Summary
  if (data.evidenceIds && data.evidenceIds.length > 0) {
    slides.push(createEvidenceSummarySlide(11, data));
  }

  // Slide 12: Year in Review (narrative)
  slides.push(createYearInReviewSlide(12, data));

  // Slide 13: Looking Forward
  slides.push(createLookingForwardSlide(13, data));

  // Slide 14: Closing
  slides.push(createClosingSlide(14, data));

  return {
    id: deckId,
    title: `${data.companyName} - Annual Impact Report`,
    subtitle: `${data.period.start} to ${data.period.end}`,
    template: 'annual',
    companyId: data.companyId,
    period: data.period,
    locale: data.locale as any,
    slides,
    metadata: {
      author: 'TEEI CSR Platform',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '2.0',
      approvalStatus: 'draft',
    },
  };
}

/**
 * Generate Investor Update deck
 */
export function generateInvestorDeck(data: TemplateData): DeckDefinition {
  const deckId = uuidv4();
  const slides: SlideDefinition[] = [];

  // Slide 1: Title
  slides.push(createTitleSlide(1, data, 'Investor Update - ESG Impact'));

  // Slide 2: Investment Thesis
  slides.push(createInvestmentThesisSlide(2, data));

  // Slide 3: Impact Metrics Overview
  if (data.metrics) {
    slides.push(createMetricsGridSlide(3, data));
  }

  // Slide 4: SROI Analysis
  if (data.metrics?.sroi) {
    slides.push(createSROISlide(4, data));
  }

  // Slide 5-7: Charts (focus on trends)
  if (data.charts) {
    data.charts.forEach((chart, index) => {
      slides.push(createChartSlide(5 + index, chart, data.evidenceIds));
    });
  }

  // Slide 8: ESG Alignment
  slides.push(createESGAlignmentSlide(8, data));

  // Slide 9: Evidence & Validation
  if (data.evidenceIds && data.evidenceIds.length > 0) {
    slides.push(createEvidenceSummarySlide(9, data));
  }

  // Slide 10: Closing
  slides.push(createClosingSlide(10, data));

  return {
    id: deckId,
    title: `${data.companyName} - Investor Update`,
    subtitle: `ESG Impact Performance - ${data.period.start} to ${data.period.end}`,
    template: 'investor',
    companyId: data.companyId,
    period: data.period,
    locale: data.locale as any,
    slides,
    metadata: {
      author: 'TEEI CSR Platform',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '2.0',
      approvalStatus: 'draft',
    },
  };
}

/**
 * Generate Impact Deep Dive deck
 */
export function generateImpactDeck(data: TemplateData): DeckDefinition {
  const deckId = uuidv4();
  const slides: SlideDefinition[] = [];

  // Slide 1: Title
  slides.push(createTitleSlide(1, data, 'Impact Deep Dive'));

  // Slide 2: Methodology Overview
  slides.push(createMethodologySlide(2, data));

  // Slide 3: Impact Framework
  slides.push(createImpactFrameworkSlide(3, data));

  // Slide 4: Metrics Breakdown
  if (data.metrics) {
    slides.push(createMetricsGridSlide(4, data));
  }

  // Slide 5: SROI Calculation
  if (data.metrics?.sroi) {
    slides.push(createSROIDeepDiveSlide(5, data));
  }

  // Slide 6: VIS Calculation
  if (data.metrics?.vis) {
    slides.push(createVISDeepDiveSlide(6, data));
  }

  // Slide 7-10: Data Visualizations
  if (data.charts) {
    data.charts.forEach((chart, index) => {
      slides.push(createChartSlide(7 + index, chart, data.evidenceIds));
    });
  }

  // Slide 11: Evidence Lineage
  if (data.evidenceIds && data.evidenceIds.length > 0) {
    slides.push(createEvidenceLineageSlide(11, data));
  }

  // Slide 12: Quality Assurance
  slides.push(createQualityAssuranceSlide(12, data));

  // Slide 13: Limitations & Assumptions
  slides.push(createLimitationsSlide(13, data));

  // Slide 14: Closing
  slides.push(createClosingSlide(14, data));

  return {
    id: deckId,
    title: `${data.companyName} - Impact Deep Dive`,
    subtitle: `Methodology & Evidence - ${data.period.start} to ${data.period.end}`,
    template: 'impact',
    companyId: data.companyId,
    period: data.period,
    locale: data.locale as any,
    slides,
    metadata: {
      author: 'TEEI CSR Platform',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '2.0',
      approvalStatus: 'draft',
    },
  };
}

// ============================================================================
// Slide Builders
// ============================================================================

function createTitleSlide(slideNumber: number, data: TemplateData, subtitle: string): SlideDefinition {
  const titleBlock: SlideBlock = {
    id: uuidv4(),
    type: 'title',
    title: `${data.companyName}`,
    content: subtitle,
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'title-only',
    blocks: [titleBlock],
    notes: 'Cover slide - press any key to advance',
  };
}

function createMetricsGridSlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const metricsBlock: SlideBlock = {
    id: uuidv4(),
    type: 'metrics-grid',
    title: 'Impact At-a-Glance',
    metricsConfig: {
      metrics: [
        {
          label: 'Social ROI',
          value: data.metrics?.sroi ? `${data.metrics.sroi.toFixed(2)}:1` : 'N/A',
        },
        {
          label: 'Volunteer Impact Score',
          value: data.metrics?.vis ? data.metrics.vis.toFixed(1) : 'N/A',
        },
        {
          label: 'Beneficiaries',
          value: data.metrics?.beneficiaries?.toLocaleString() || 'N/A',
        },
        {
          label: 'Volunteer Hours',
          value: data.metrics?.volunteer_hours?.toLocaleString() || 'N/A',
        },
        {
          label: 'Social Value',
          value: data.metrics?.social_value ? `$${data.metrics.social_value.toLocaleString()}` : 'N/A',
        },
        {
          label: 'Engagement Rate',
          value: data.metrics?.engagement_rate ? `${(data.metrics.engagement_rate * 100).toFixed(1)}%` : 'N/A',
        },
      ],
    },
    explainer: {
      title: 'Why this section?',
      content:
        'These core metrics provide a snapshot of your overall impact. SROI measures value creation, VIS measures volunteer contribution quality, and beneficiary counts show reach.',
    },
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'content',
    blocks: [metricsBlock],
    notes:
      'Key metrics overview. SROI = Social Return on Investment, VIS = Volunteer Impact Score. All metrics are evidence-backed.',
    evidenceIds: data.evidenceIds,
  };
}

function createKeyAchievementsSlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const achievementsBlock: SlideBlock = {
    id: uuidv4(),
    type: 'key-achievements',
    title: 'Key Achievements',
    bullets: data.key_achievements || [],
    citations: data.key_achievements?.map((_, index) => ({
      paragraphIndex: index,
      citationCount: 1,
      citationIds: [`cite-achievement-${index}`],
      evidenceIds: data.evidenceIds || [],
    })),
    explainer: {
      title: 'Why this section?',
      content:
        'Highlights major accomplishments during the period, backed by evidence from feedback, surveys, and program data.',
    },
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'content',
    blocks: [achievementsBlock],
    notes: 'Major accomplishments with evidence citations. Each achievement is backed by qualitative or quantitative data.',
    evidenceIds: data.evidenceIds,
  };
}

function createChartSlide(
  slideNumber: number,
  chart: TemplateData['charts'][0],
  evidenceIds?: string[]
): SlideDefinition {
  const chartBlock: SlideBlock = {
    id: uuidv4(),
    type: 'chart',
    title: chart.title,
    chartConfig: {
      type: chart.type,
      labels: chart.labels,
      datasets: chart.datasets,
    },
    explainer: {
      title: 'Why this visualization?',
      content: `This chart illustrates trends and patterns in ${chart.title.toLowerCase()}. Data is aggregated from program metrics and validated evidence.`,
    },
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'chart',
    blocks: [chartBlock],
    notes: `Chart: ${chart.title}. Data points are derived from evidence-backed metrics.`,
    evidenceIds,
  };
}

function createEvidenceSummarySlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const evidenceBlock: SlideBlock = {
    id: uuidv4(),
    type: 'evidence-summary',
    title: 'Evidence & Validation',
    content: `This report is backed by ${data.evidenceIds?.length || 0} evidence snippets from feedback, surveys, and program data. All metrics include citation trails for full transparency.`,
    explainer: {
      title: 'Why evidence matters',
      content:
        'Evidence-based reporting ensures accountability and credibility. Each claim is backed by anonymized, validated data sources.',
    },
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'content',
    blocks: [evidenceBlock],
    notes: `Evidence summary. ${data.evidenceIds?.length || 0} total evidence snippets support this report.`,
    evidenceIds: data.evidenceIds,
  };
}

function createClosingSlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const closingBlock: SlideBlock = {
    id: uuidv4(),
    type: 'narrative',
    title: 'Thank You',
    content:
      'Together, we continue to create measurable impact and drive positive change in our communities. For questions or additional details, please contact your CSR program manager.',
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'content',
    blocks: [closingBlock],
    notes: 'Closing slide - thank you message',
  };
}

// Additional slide builders for specialized slides

function createExecutiveSummarySlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const summaryBlock: SlideBlock = {
    id: uuidv4(),
    type: 'narrative',
    title: 'Executive Summary',
    content: `${data.companyName} achieved significant social impact during the period ${data.period.start} to ${data.period.end}. Our programs generated a social return on investment of ${data.metrics?.sroi?.toFixed(2) || 'N/A'}:1, reaching ${data.metrics?.beneficiaries?.toLocaleString() || 'N/A'} beneficiaries through ${data.metrics?.volunteer_hours?.toLocaleString() || 'N/A'} volunteer hours.`,
    citations: [
      {
        paragraphIndex: 0,
        citationCount: 3,
        citationIds: ['cite-summary-1', 'cite-summary-2', 'cite-summary-3'],
        evidenceIds: data.evidenceIds || [],
      },
    ],
    explainer: {
      title: 'Why this section?',
      content:
        'Executive summary provides a high-level overview of impact for board members and stakeholders.',
    },
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'content',
    blocks: [summaryBlock],
    notes: 'Executive summary with key highlights',
    evidenceIds: data.evidenceIds,
  };
}

function createSROISlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const sroiBlock: SlideBlock = {
    id: uuidv4(),
    type: 'narrative',
    title: 'Social Return on Investment (SROI)',
    content: `Our programs achieved an SROI of ${data.metrics?.sroi?.toFixed(2) || 'N/A'}:1, meaning every $1 invested generated $${data.metrics?.sroi?.toFixed(2) || 'N/A'} in social value. This metric is calculated using validated outcome scores and monetized impact values.`,
    citations: [
      {
        paragraphIndex: 0,
        citationCount: 2,
        citationIds: ['cite-sroi-1', 'cite-sroi-2'],
        evidenceIds: data.evidenceIds || [],
      },
    ],
    explainer: {
      title: 'How SROI is calculated',
      content:
        'SROI = (Social Value Created) / (Investment). Social value is monetized based on outcome improvements (belonging, confidence, skills) using validated proxy values.',
    },
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'content',
    blocks: [sroiBlock],
    notes: 'SROI deep dive - calculation methodology and evidence',
    evidenceIds: data.evidenceIds,
  };
}

function createVISSlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const visBlock: SlideBlock = {
    id: uuidv4(),
    type: 'narrative',
    title: 'Volunteer Impact Score (VIS)',
    content: `Our volunteer programs achieved a VIS of ${data.metrics?.vis?.toFixed(1) || 'N/A'}, reflecting high-quality mentorship and meaningful engagement. VIS measures volunteer contribution effectiveness based on session quality, feedback sentiment, and outcome improvements.`,
    citations: [
      {
        paragraphIndex: 0,
        citationCount: 2,
        citationIds: ['cite-vis-1', 'cite-vis-2'],
        evidenceIds: data.evidenceIds || [],
      },
    ],
    explainer: {
      title: 'How VIS is calculated',
      content:
        'VIS = (Hours × Session Quality × Outcome Weight). Higher scores indicate more impactful volunteer contributions.',
    },
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'content',
    blocks: [visBlock],
    notes: 'VIS deep dive - calculation methodology and evidence',
    evidenceIds: data.evidenceIds,
  };
}

function createYearInReviewSlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const reviewBlock: SlideBlock = {
    id: uuidv4(),
    type: 'narrative',
    title: 'Year in Review',
    content: `${new Date(data.period.end).getFullYear()} was a transformative year for our CSR programs. We expanded reach, deepened impact, and strengthened our commitment to measurable outcomes. Key milestones included program expansions, new partnerships, and improved participant outcomes across all dimensions.`,
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'content',
    blocks: [reviewBlock],
    notes: 'Year in review narrative',
  };
}

function createLookingForwardSlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const forwardBlock: SlideBlock = {
    id: uuidv4(),
    type: 'narrative',
    title: 'Looking Forward',
    content: `As we move into ${new Date(data.period.end).getFullYear() + 1}, we remain committed to evidence-based impact, transparent reporting, and continuous improvement. Our focus areas include expanding program reach, enhancing volunteer quality, and deepening partnerships.`,
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'content',
    blocks: [forwardBlock],
    notes: 'Future outlook and priorities',
  };
}

function createInvestmentThesisSlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const thesisBlock: SlideBlock = {
    id: uuidv4(),
    type: 'narrative',
    title: 'Investment Thesis: ESG Impact',
    content: `${data.companyName}'s CSR programs deliver measurable ESG value through evidence-backed social impact. Our approach combines volunteer engagement, participant outcomes, and rigorous metrics to create sustainable value for stakeholders and communities.`,
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'content',
    blocks: [thesisBlock],
    notes: 'Investment thesis for ESG-focused stakeholders',
  };
}

function createESGAlignmentSlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const esgBlock: SlideBlock = {
    id: uuidv4(),
    type: 'two-column',
    title: 'ESG Alignment',
    bullets: [
      'Social: Community impact and inclusion',
      'Governance: Transparent, evidence-based reporting',
      'Environmental: Sustainable program design',
      'UN SDGs: Alignment with Goals 4, 8, 10, 17',
    ],
    explainer: {
      title: 'Why ESG matters',
      content:
        'ESG alignment demonstrates responsible business practices and long-term value creation for stakeholders.',
    },
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'two-column',
    blocks: [esgBlock],
    notes: 'ESG alignment and UN SDG mapping',
  };
}

function createMethodologySlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const methodBlock: SlideBlock = {
    id: uuidv4(),
    type: 'narrative',
    title: 'Impact Methodology',
    content: `Our impact measurement follows industry best practices: (1) Evidence collection from multiple sources, (2) Anonymization and redaction of PII, (3) Quantitative metric calculation (SROI, VIS), (4) Qualitative-to-quantitative translation (Q2Q), (5) Citation-based validation, and (6) Transparent reporting with full lineage.`,
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'content',
    blocks: [methodBlock],
    notes: 'Methodology overview - how we measure impact',
  };
}

function createImpactFrameworkSlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const frameworkBlock: SlideBlock = {
    id: uuidv4(),
    type: 'two-column',
    title: 'Impact Framework',
    bullets: [
      'Inputs: Volunteer hours, program investment',
      'Activities: Sessions, events, mentorship',
      'Outputs: Participants served, sessions delivered',
      'Outcomes: Belonging, confidence, skills',
      'Impact: Social value created (monetized)',
    ],
    explainer: {
      title: 'Theory of Change',
      content:
        'Our framework maps inputs through activities, outputs, outcomes, and impact to demonstrate causal pathways.',
    },
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'two-column',
    blocks: [frameworkBlock],
    notes: 'Impact framework - Theory of Change model',
  };
}

function createSROIDeepDiveSlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const sroiDeepBlock: SlideBlock = {
    id: uuidv4(),
    type: 'narrative',
    title: 'SROI Calculation Deep Dive',
    content: `SROI is calculated as (Social Value Created) / (Total Investment). Social value is derived from outcome improvements (belonging +${data.metrics?.outcome_improvement || 0}%, confidence +${data.metrics?.outcome_improvement || 0}%, skills +${data.metrics?.outcome_improvement || 0}%) multiplied by validated proxy values per participant. Total investment includes volunteer time (valued at market rate) plus program costs. Final SROI: ${data.metrics?.sroi?.toFixed(2) || 'N/A'}:1.`,
    citations: [
      {
        paragraphIndex: 0,
        citationCount: 3,
        citationIds: ['cite-sroi-calc-1', 'cite-sroi-calc-2', 'cite-sroi-calc-3'],
        evidenceIds: data.evidenceIds || [],
      },
    ],
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'content',
    blocks: [sroiDeepBlock],
    notes: 'Detailed SROI calculation with proxy values and assumptions',
    evidenceIds: data.evidenceIds,
  };
}

function createVISDeepDiveSlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const visDeepBlock: SlideBlock = {
    id: uuidv4(),
    type: 'narrative',
    title: 'VIS Calculation Deep Dive',
    content: `VIS = (Hours × Session Quality × Outcome Weight). Session quality is derived from feedback sentiment analysis (0-1 scale). Outcome weight reflects the magnitude of participant improvement (belonging, confidence, skills). Hours are normalized to account for session length variability. Final VIS: ${data.metrics?.vis?.toFixed(1) || 'N/A'}.`,
    citations: [
      {
        paragraphIndex: 0,
        citationCount: 2,
        citationIds: ['cite-vis-calc-1', 'cite-vis-calc-2'],
        evidenceIds: data.evidenceIds || [],
      },
    ],
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'content',
    blocks: [visDeepBlock],
    notes: 'Detailed VIS calculation with quality scoring and outcome weighting',
    evidenceIds: data.evidenceIds,
  };
}

function createEvidenceLineageSlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const lineageBlock: SlideBlock = {
    id: uuidv4(),
    type: 'evidence-summary',
    title: 'Evidence Lineage & Traceability',
    content: `All metrics in this report are traceable to ${data.evidenceIds?.length || 0} evidence snippets. Evidence sources include: (1) Buddy feedback, (2) Kintell learning progress, (3) Survey responses, (4) Session logs, and (5) Outcome assessments. Each citation includes evidence ID, timestamp, and anonymization status.`,
    explainer: {
      title: 'Why lineage matters',
      content:
        'Full lineage ensures transparency, auditability, and trust. Every metric can be traced back to source data.',
    },
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'content',
    blocks: [lineageBlock],
    notes: 'Evidence lineage and traceability - full audit trail',
    evidenceIds: data.evidenceIds,
  };
}

function createQualityAssuranceSlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const qaBlock: SlideBlock = {
    id: uuidv4(),
    type: 'narrative',
    title: 'Quality Assurance',
    content: `All data undergoes rigorous QA: (1) PII redaction pre-LLM, (2) Citation density validation (≥1 per paragraph), (3) Schema validation for all metrics, (4) Freshness checks (<24h SLA), (5) Anomaly detection for outliers, and (6) Manual spot-checks by program managers.`,
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'content',
    blocks: [qaBlock],
    notes: 'Quality assurance processes and validation steps',
  };
}

function createLimitationsSlide(slideNumber: number, data: TemplateData): SlideDefinition {
  const limitationsBlock: SlideBlock = {
    id: uuidv4(),
    type: 'narrative',
    title: 'Limitations & Assumptions',
    content: `This analysis includes assumptions: (1) Proxy values are based on industry benchmarks, (2) Self-reported data may include bias, (3) Long-term outcomes are extrapolated from short-term improvements, (4) Attribution assumes program causality (not correlation), and (5) Monetization uses UK/NO labor market proxies.`,
    order: 1,
  };

  return {
    id: uuidv4(),
    slideNumber,
    template: 'content',
    blocks: [limitationsBlock],
    notes: 'Limitations, assumptions, and caveats for transparency',
  };
}

/**
 * Get template generator by name
 */
export function getTemplateGenerator(template: DeckTemplate): (data: TemplateData) => DeckDefinition {
  const generators = {
    quarterly: generateQuarterlyDeck,
    annual: generateAnnualDeck,
    investor: generateInvestorDeck,
    impact: generateImpactDeck,
  };

  return generators[template];
}

/**
 * Get template metadata
 */
export function getTemplateMetadata(template: DeckTemplate) {
  const metadata = {
    quarterly: {
      id: 'quarterly' as const,
      name: 'Quarterly Report',
      description: 'Impact summary for board presentations (8 slides)',
      defaultSlides: ['title', 'metrics-grid', 'key-achievements', 'chart', 'evidence-summary', 'closing'],
      supportedLocales: ['en', 'es', 'fr', 'no', 'uk'],
      estimatedSlides: 8,
    },
    annual: {
      id: 'annual' as const,
      name: 'Annual Report',
      description: 'Comprehensive yearly impact review (14 slides)',
      defaultSlides: [
        'title',
        'executive-summary',
        'metrics-grid',
        'sroi',
        'vis',
        'key-achievements',
        'chart',
        'evidence-summary',
        'year-in-review',
        'looking-forward',
        'closing',
      ],
      supportedLocales: ['en', 'es', 'fr', 'no', 'uk'],
      estimatedSlides: 14,
    },
    investor: {
      id: 'investor' as const,
      name: 'Investor Update',
      description: 'ESG impact for investors and stakeholders (10 slides)',
      defaultSlides: [
        'title',
        'investment-thesis',
        'metrics-grid',
        'sroi',
        'chart',
        'esg-alignment',
        'evidence-summary',
        'closing',
      ],
      supportedLocales: ['en', 'es', 'fr', 'no', 'uk'],
      estimatedSlides: 10,
    },
    impact: {
      id: 'impact' as const,
      name: 'Impact Deep Dive',
      description: 'Methodology and evidence deep dive (14 slides)',
      defaultSlides: [
        'title',
        'methodology',
        'framework',
        'metrics-grid',
        'sroi-deep-dive',
        'vis-deep-dive',
        'chart',
        'evidence-lineage',
        'quality-assurance',
        'limitations',
        'closing',
      ],
      supportedLocales: ['en', 'es', 'fr', 'no', 'uk'],
      estimatedSlides: 14,
    },
  };

  return metadata[template];
}
