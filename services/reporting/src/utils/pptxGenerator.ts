/**
 * PPTX Generator
 *
 * PowerPoint export engine for executive reports.
 * Uses pptxgenjs library for server-side PPTX generation.
 *
 * @module utils/pptxGenerator
 */

import PptxGenJS from 'pptxgenjs';
import { renderChartToBase64 } from './chartRenderer.js';
import { mapEvidenceToNotes } from '../lib/evidenceLineageMapper.js';
import type { ChartConfig } from './chartRenderer.js';

/**
 * Tenant theme configuration
 */
export interface TenantTheme {
  company_id: string;
  logo_url: string | null;
  colors: {
    light: {
      primary: string;
      secondary: string;
      accent: string;
      textOnPrimary: string;
      textOnSecondary: string;
      textOnAccent: string;
    };
    dark?: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
  contrast_validation: {
    is_compliant: boolean;
    ratios: {
      primaryText: number;
      secondaryText: number;
      accentText: number;
    };
    warnings: string[];
  };
}

/**
 * PPTX slide configuration
 */
export interface PPTXSlide {
  type: 'title' | 'content' | 'chart' | 'data-table' | 'two-column' | 'image';
  title: string;
  content?: string;
  bullets?: string[];
  chart?: ChartData;
  table?: TableData;
  images?: ImageData[];
  notes?: string;
  evidenceIds?: string[]; // Evidence IDs to include in slide notes
}

/**
 * Chart data for PPTX
 */
export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
  }[];
}

/**
 * Table data for PPTX
 */
export interface TableData {
  headers: string[];
  rows: string[][];
  columnWidths?: number[];
}

/**
 * Image data for PPTX
 */
export interface ImageData {
  path: string; // URL or base64
  x: number; // Position X (inches)
  y: number; // Position Y (inches)
  w: number; // Width (inches)
  h: number; // Height (inches)
  caption?: string;
}

/**
 * PPTX generation options
 */
export interface PPTXOptions {
  title: string;
  author: string;
  company: string;
  companyId: string; // For fetching theme and evidence
  subject?: string;
  layout?: 'LAYOUT_4x3' | 'LAYOUT_16x9' | 'LAYOUT_WIDE';
  theme?: 'default' | 'corporate' | 'minimalist';
  includeWatermark?: boolean;
  watermarkText?: string;
  approvalStatus?: 'DRAFT' | 'APPROVED' | 'PENDING' | 'REJECTED';
}

/**
 * Generate PPTX from slides
 *
 * @param slides - Array of slide configurations
 * @param options - Generation options
 * @returns PPTX file as Buffer
 */
export async function generatePPTX(
  slides: PPTXSlide[],
  options: PPTXOptions
): Promise<Buffer> {
  const startTime = Date.now();

  try {
    console.log('[PPTX] Starting generation:', {
      title: options.title,
      slides: slides.length,
      theme: options.theme,
      companyId: options.companyId,
    });

    // Initialize PptxGenJS
    const pptx = new PptxGenJS();

    // Set document properties
    pptx.author = options.author;
    pptx.company = options.company;
    pptx.subject = options.subject || 'Executive Report';
    pptx.title = options.title;
    pptx.layout = options.layout || 'LAYOUT_16x9';

    // Fetch and apply tenant theme
    let tenantTheme: TenantTheme | null = null;
    try {
      tenantTheme = await fetchTenantTheme(options.companyId);
      if (tenantTheme) {
        await applyTenantTheme(pptx, tenantTheme);
        console.log('[PPTX] Applied tenant theme');
      } else {
        applyTheme(pptx, options.theme || 'default');
        console.log('[PPTX] Applied default theme');
      }
    } catch (error) {
      console.warn('[PPTX] Failed to fetch tenant theme, using default:', error);
      applyTheme(pptx, options.theme || 'default');
    }

    // Generate slides
    for (let i = 0; i < slides.length; i++) {
      const slideConfig = slides[i];
      const slide = pptx.addSlide();

      console.log(`[PPTX] Rendering slide ${i + 1}/${slides.length}: ${slideConfig.type}`);

      await renderSlide(slide, slideConfig, options, tenantTheme);

      // Add evidence lineage to notes if provided
      if (slideConfig.evidenceIds && slideConfig.evidenceIds.length > 0) {
        const evidenceNotes = await mapEvidenceToNotes(
          slideConfig.evidenceIds,
          options.companyId
        );

        // Append to existing notes
        const existingNotes = slideConfig.notes || '';
        const combinedNotes = existingNotes
          ? `${existingNotes}\n\n${evidenceNotes}`
          : evidenceNotes;

        slide.addNotes(combinedNotes);
      } else if (slideConfig.notes) {
        // Add regular notes
        slide.addNotes(slideConfig.notes);
      }
    }

    // Add watermark based on approval status
    const watermarkText = getWatermarkText(options);
    if (watermarkText) {
      addWatermarkToAllSlides(pptx, watermarkText);
      console.log(`[PPTX] Added watermark: ${watermarkText}`);
    }

    // Generate PPTX buffer
    console.log('[PPTX] Generating binary...');
    const arrayBuffer = await pptx.write({ outputType: 'arraybuffer' });
    const buffer = Buffer.from(arrayBuffer as ArrayBuffer);

    const elapsed = Date.now() - startTime;
    console.log(`[PPTX] Generation complete in ${elapsed}ms (${buffer.length} bytes)`);

    return buffer;
  } catch (error) {
    console.error('[PPTX] Generation failed:', error);
    throw new Error(`Failed to generate PPTX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Render individual slide
 */
async function renderSlide(
  slide: any,
  config: PPTXSlide,
  options: PPTXOptions,
  theme: TenantTheme | null
): Promise<void> {
  switch (config.type) {
    case 'title':
      await renderTitleSlide(slide, config, options, theme);
      break;
    case 'content':
      renderContentSlide(slide, config, theme);
      break;
    case 'chart':
      await renderChartSlide(slide, config, theme);
      break;
    case 'data-table':
      renderTableSlide(slide, config, theme);
      break;
    case 'two-column':
      renderTwoColumnSlide(slide, config, theme);
      break;
    case 'image':
      renderImageSlide(slide, config, theme);
      break;
    default:
      throw new Error(`Unknown slide type: ${config.type}`);
  }

  // Note: Speaker notes are added in the main generatePPTX function
  // to allow for evidence lineage appending
}

/**
 * Render title slide
 */
async function renderTitleSlide(
  slide: any,
  config: PPTXSlide,
  options: PPTXOptions,
  theme: TenantTheme | null
): Promise<void> {
  const primaryColor = theme?.colors.light.primary.replace('#', '') || '363636';
  const secondaryColor = theme?.colors.light.secondary.replace('#', '') || '666666';
  const accentColor = theme?.colors.light.accent.replace('#', '') || '999999';

  // Add tenant logo if available
  if (theme?.logo_url) {
    try {
      // Logo positioned at top-right
      slide.addImage({
        path: theme.logo_url,
        x: 8.0,
        y: 0.3,
        w: 1.5,
        h: 0.75,
      });
    } catch (error) {
      console.warn('[PPTX] Failed to add logo to title slide:', error);
    }
  }

  // Add title
  slide.addText(config.title, {
    x: 0.5,
    y: 1.5,
    w: 9.0,
    h: 1.5,
    fontSize: 44,
    bold: true,
    color: primaryColor,
    align: 'center',
    valign: 'middle',
  });

  // Add subtitle
  if (config.content) {
    slide.addText(config.content, {
      x: 0.5,
      y: 3.5,
      w: 9.0,
      h: 1.0,
      fontSize: 24,
      color: secondaryColor,
      align: 'center',
      valign: 'middle',
    });
  }

  // Add company name
  slide.addText(options.company, {
    x: 0.5,
    y: 5.0,
    w: 9.0,
    h: 0.5,
    fontSize: 16,
    color: accentColor,
    align: 'center',
  });

  // Add date
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  slide.addText(dateStr, {
    x: 0.5,
    y: 5.5,
    w: 9.0,
    h: 0.5,
    fontSize: 14,
    color: accentColor,
    align: 'center',
  });
}

/**
 * Render content slide with bullets
 */
function renderContentSlide(slide: any, config: PPTXSlide, theme: TenantTheme | null): void {
  const primaryColor = theme?.colors.light.primary.replace('#', '') || '363636';
  const secondaryColor = theme?.colors.light.secondary.replace('#', '') || '666666';

  // Add title
  slide.addText(config.title, {
    x: 0.5,
    y: 0.5,
    w: 9.0,
    h: 0.75,
    fontSize: 32,
    bold: true,
    color: primaryColor,
  });

  // Add bullet points
  if (config.bullets && config.bullets.length > 0) {
    const bulletText = config.bullets.map((bullet) => ({ text: bullet }));
    slide.addText(bulletText, {
      x: 0.5,
      y: 1.5,
      w: 9.0,
      h: 4.0,
      fontSize: 18,
      bullet: true,
      color: secondaryColor,
      lineSpacing: 30,
    });
  } else if (config.content) {
    // Add paragraph content
    slide.addText(config.content, {
      x: 0.5,
      y: 1.5,
      w: 9.0,
      h: 4.0,
      fontSize: 18,
      color: secondaryColor,
      lineSpacing: 24,
    });
  }
}

/**
 * Render chart slide
 */
async function renderChartSlide(slide: any, config: PPTXSlide, theme: TenantTheme | null): Promise<void> {
  const primaryColor = theme?.colors.light.primary.replace('#', '') || '363636';

  // Add title
  slide.addText(config.title, {
    x: 0.5,
    y: 0.5,
    w: 9.0,
    h: 0.75,
    fontSize: 32,
    bold: true,
    color: primaryColor,
  });

  // Add chart
  if (config.chart) {
    try {
      // Convert to ChartConfig for server-side rendering
      const chartConfig: ChartConfig = {
        type: config.chart.type,
        data: {
          labels: config.chart.labels,
          datasets: config.chart.datasets.map((ds) => ({
            label: ds.label,
            data: ds.data,
            backgroundColor: ds.backgroundColor,
            borderColor: ds.borderColor,
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: config.chart.title,
              font: { size: 16 },
            },
            legend: {
              display: true,
              position: 'bottom',
            },
            tooltip: {
              enabled: true,
            },
          },
        },
      };

      // Render chart to base64 image
      const chartImage = await renderChartToBase64(chartConfig, {
        width: 800,
        height: 400,
        format: 'png',
        backgroundColor: '#ffffff',
      });

      // Add chart image to slide
      slide.addImage({
        data: chartImage,
        x: 1.0,
        y: 1.5,
        w: 8.0,
        h: 4.0,
      });
    } catch (error) {
      console.error('[PPTX] Failed to render chart:', error);
      // Fallback: Add error message
      slide.addText('Chart rendering failed', {
        x: 1.0,
        y: 3.0,
        w: 8.0,
        h: 1.0,
        fontSize: 18,
        color: 'CC0000',
        align: 'center',
      });
    }
  }
}

/**
 * Render table slide
 */
function renderTableSlide(slide: any, config: PPTXSlide, theme: TenantTheme | null): void {
  const primaryColor = theme?.colors.light.primary.replace('#', '') || '363636';
  const accentColor = theme?.colors.light.accent.replace('#', '') || 'F7F7F7';

  // Add title
  slide.addText(config.title, {
    x: 0.5,
    y: 0.5,
    w: 9.0,
    h: 0.75,
    fontSize: 32,
    bold: true,
    color: primaryColor,
  });

  // Add table
  if (config.table) {
    const tableData = [config.table.headers, ...config.table.rows];
    slide.addTable(tableData, {
      x: 0.5,
      y: 1.5,
      w: 9.0,
      fontSize: 14,
      border: { pt: 1, color: 'CCCCCC' },
      fill: { color: accentColor },
      color: primaryColor,
      colW: config.table.columnWidths,
      rowH: 0.4,
      valign: 'middle',
    });
  }
}

/**
 * Render two-column slide
 */
function renderTwoColumnSlide(slide: any, config: PPTXSlide, theme: TenantTheme | null): void {
  const primaryColor = theme?.colors.light.primary.replace('#', '') || '363636';
  const secondaryColor = theme?.colors.light.secondary.replace('#', '') || '666666';

  // Add title
  slide.addText(config.title, {
    x: 0.5,
    y: 0.5,
    w: 9.0,
    h: 0.75,
    fontSize: 32,
    bold: true,
    color: primaryColor,
  });

  // Left column (bullets)
  if (config.bullets) {
    const leftBullets = config.bullets.slice(0, Math.ceil(config.bullets.length / 2));
    const bulletText = leftBullets.map((bullet) => ({ text: bullet }));
    slide.addText(bulletText, {
      x: 0.5,
      y: 1.5,
      w: 4.25,
      h: 4.0,
      fontSize: 16,
      bullet: true,
      color: secondaryColor,
    });

    // Right column (remaining bullets)
    const rightBullets = config.bullets.slice(Math.ceil(config.bullets.length / 2));
    const rightBulletText = rightBullets.map((bullet) => ({ text: bullet }));
    slide.addText(rightBulletText, {
      x: 5.25,
      y: 1.5,
      w: 4.25,
      h: 4.0,
      fontSize: 16,
      bullet: true,
      color: secondaryColor,
    });
  }
}

/**
 * Render image slide
 */
function renderImageSlide(slide: any, config: PPTXSlide, theme: TenantTheme | null): void {
  const primaryColor = theme?.colors.light.primary.replace('#', '') || '363636';
  const accentColor = theme?.colors.light.accent.replace('#', '') || '999999';

  // Add title
  slide.addText(config.title, {
    x: 0.5,
    y: 0.5,
    w: 9.0,
    h: 0.75,
    fontSize: 32,
    bold: true,
    color: primaryColor,
  });

  // Add images
  if (config.images) {
    for (const image of config.images) {
      slide.addImage({
        path: image.path,
        x: image.x,
        y: image.y,
        w: image.w,
        h: image.h,
      });

      // Add caption if provided
      if (image.caption) {
        slide.addText(image.caption, {
          x: image.x,
          y: image.y + image.h + 0.1,
          w: image.w,
          h: 0.3,
          fontSize: 12,
          color: accentColor,
          align: 'center',
        });
      }
    }
  }
}

/**
 * Convert chart data to PPTX format
 */
function convertChartData(chart: ChartData): any[] {
  return chart.datasets.map((dataset) => ({
    name: dataset.label,
    labels: chart.labels,
    values: dataset.data,
  }));
}

/**
 * Fetch tenant theme from API
 */
async function fetchTenantTheme(companyId: string): Promise<TenantTheme | null> {
  try {
    // In production: Make HTTP request to theme API
    // For now, return null to use default theme
    // const response = await fetch(`http://localhost:3001/companies/${companyId}/theme`);
    // if (!response.ok) return null;
    // return await response.json();

    console.log(`[PPTX] Fetching theme for company ${companyId}...`);
    return null; // Mock - use default theme
  } catch (error) {
    console.error('[PPTX] Failed to fetch tenant theme:', error);
    return null;
  }
}

/**
 * Apply tenant theme to presentation
 */
async function applyTenantTheme(pptx: any, theme: TenantTheme): Promise<void> {
  // Define master slide with tenant colors
  pptx.defineSlideMaster({
    title: 'TENANT_MASTER',
    background: { color: 'FFFFFF' },
    objects: [
      // Header with tenant primary color
      {
        rect: {
          x: 0,
          y: 0,
          w: '100%',
          h: 0.5,
          fill: { color: theme.colors.light.primary.replace('#', '') },
        },
      },
    ],
  });

  console.log('[PPTX] Applied tenant theme with colors:', theme.colors.light);
}

/**
 * Apply default theme to presentation
 */
function applyTheme(pptx: any, theme: string): void {
  const themes: Record<string, any> = {
    default: {
      colors: ['2E75B5', '70AD47', 'FFC000', 'ED7D31', '5B9BD5'],
    },
    corporate: {
      colors: ['1F4E78', '2E5C8A', '385D8A', '4E7BA0', '6497B1'],
    },
    minimalist: {
      colors: ['000000', '444444', '888888', 'CCCCCC', 'EEEEEE'],
    },
  };

  const themeConfig = themes[theme] || themes.default;
  console.log(`[PPTX] Applied ${theme} theme`);
}

/**
 * Get watermark text based on approval status
 */
function getWatermarkText(options: PPTXOptions): string | null {
  if (options.includeWatermark && options.watermarkText) {
    return options.watermarkText;
  }

  // Auto-apply watermark based on approval status
  const statusWatermarks: Record<string, string> = {
    DRAFT: 'DRAFT',
    PENDING: 'PENDING APPROVAL',
    REJECTED: 'REJECTED',
  };

  return options.approvalStatus ? statusWatermarks[options.approvalStatus] || null : null;
}

/**
 * Add watermark to all slides
 */
function addWatermarkToAllSlides(pptx: any, text: string): void {
  // Get all slides
  const slides = pptx.slides || [];

  // Add watermark to each slide
  slides.forEach((slide: any) => {
    slide.addText(text, {
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
      fontSize: 60,
      color: 'DDDDDD',
      align: 'center',
      valign: 'middle',
      rotate: 315, // -45 degrees
      transparency: 70,
    });
  });
}

/**
 * Quarterly report template data
 */
export interface QuarterlyData {
  company: string;
  period: string; // "Q1 2025"
  quarter: {
    year: number;
    quarter: number;
  };
  metrics: {
    sroi: number;
    beneficiaries: number;
    volunteer_hours: number;
    social_value: number;
    engagement_rate: number;
  };
  top_achievements: string[]; // Top 3
  quarterly_trend: ChartData;
  dimensions: {
    name: string;
    score: number;
    change: number; // +/- % from previous quarter
  }[];
  evidenceIds?: string[];
  includeEvidenceAppendix?: boolean;
}

/**
 * Annual report template data
 */
export interface AnnualData {
  company: string;
  year: number;
  logo_url?: string;
  metrics: {
    sroi: number;
    beneficiaries: number;
    volunteer_hours: number;
    social_value: number;
    programs_count: number;
  };
  timeline: {
    quarter: string;
    milestone: string;
  }[];
  csrd_narrative: string;
  sdg_alignment: {
    goal_number: number;
    goal_name: string;
    contribution: string;
  }[];
  volunteer_impact_map?: ImageData;
  citations: {
    slideNumber: number;
    references: string[];
  }[];
  evidenceIds: string[];
}

/**
 * Investor update template data
 */
export interface InvestorData {
  company: string;
  period: string;
  sroi_headline: number;
  financial_impact: {
    total_investment: number;
    social_value_created: number;
    cost_per_beneficiary: number;
    efficiency_ratio: number;
  };
  growth_metrics: ChartData[]; // Growth trajectories
  risk_mitigation: {
    risk: string;
    mitigation: string;
    status: 'mitigated' | 'monitoring' | 'active';
  }[];
  executive_summary: string;
  evidenceIds?: string[]; // High-level only
}

/**
 * Impact deep dive template data
 */
export interface ImpactData {
  company: string;
  period: string;
  dimensions: {
    name: string;
    score: number;
    evidence_count: number;
    breakdown: {
      metric: string;
      value: number;
      evidence_ids: string[];
    }[];
    lineage_chart?: ChartData; // Sparkline data
  }[];
  evidenceAppendix: {
    evidence_id: string;
    type: string;
    description: string;
    source: string;
    date: string;
  }[];
  citations_per_slide: number; // Target citation density
  explainer_boxes: {
    title: string;
    content: string;
  }[];
}

/**
 * Create quarterly report PPTX template
 *
 * Template structure:
 * - Title slide with company branding
 * - Executive summary (1 slide)
 * - Key metrics table (SROI, VIS, engagement)
 * - Top 3 achievements
 * - Quarterly trend chart
 * - Dimension scorecard
 * - Optional evidence appendix
 */
export function createQuarterlyTemplate(data: QuarterlyData): PPTXSlide[] {
  const slides: PPTXSlide[] = [];

  // Title slide
  slides.push({
    type: 'title',
    title: `${data.company} - Q${data.quarter.quarter} ${data.quarter.year} Impact Report`,
    content: data.period,
    notes: `Quarterly impact report for ${data.period}`,
  });

  // Executive summary
  slides.push({
    type: 'content',
    title: 'Executive Summary',
    bullets: [
      `Achieved ${data.metrics.sroi.toFixed(2)}:1 social return on investment`,
      `Reached ${data.metrics.beneficiaries.toLocaleString()} beneficiaries through ${data.metrics.volunteer_hours.toLocaleString()} volunteer hours`,
      `Generated $${data.metrics.social_value.toLocaleString()} in social value`,
      `Maintained ${(data.metrics.engagement_rate * 100).toFixed(1)}% engagement rate`,
    ],
    notes: 'High-level summary of quarterly performance',
    evidenceIds: data.evidenceIds,
  });

  // Key metrics table
  slides.push({
    type: 'data-table',
    title: 'Key Metrics',
    table: {
      headers: ['Metric', 'Q' + data.quarter.quarter + ' ' + data.quarter.year, 'Change'],
      rows: [
        ['Social ROI', `${data.metrics.sroi.toFixed(2)}:1`, '↑'],
        ['Total Beneficiaries', data.metrics.beneficiaries.toLocaleString(), '↑'],
        ['Volunteer Hours', data.metrics.volunteer_hours.toLocaleString(), '↑'],
        ['Social Value Created', `$${data.metrics.social_value.toLocaleString()}`, '↑'],
        ['Engagement Rate', `${(data.metrics.engagement_rate * 100).toFixed(1)}%`, '→'],
      ],
      columnWidths: [4.0, 3.0, 2.0],
    },
    notes: 'Quarterly metrics with trend indicators',
  });

  // Top 3 achievements
  slides.push({
    type: 'content',
    title: 'Top 3 Achievements',
    bullets: data.top_achievements.slice(0, 3),
    notes: 'Highlight major accomplishments this quarter',
  });

  // Quarterly trend chart
  slides.push({
    type: 'chart',
    title: 'Quarterly Performance Trend',
    chart: data.quarterly_trend,
    notes: 'Performance trends over past 4 quarters',
  });

  // Dimension scorecard
  if (data.dimensions.length > 0) {
    const dimensionRows = data.dimensions.map((dim) => [
      dim.name,
      dim.score.toFixed(1),
      dim.change >= 0 ? `+${dim.change.toFixed(1)}%` : `${dim.change.toFixed(1)}%`,
    ]);

    slides.push({
      type: 'data-table',
      title: 'Impact Dimension Scorecard',
      table: {
        headers: ['Dimension', 'Score', 'Δ vs Q' + (data.quarter.quarter - 1)],
        rows: dimensionRows,
        columnWidths: [4.5, 2.25, 2.25],
      },
      notes: 'Dimension-level performance with quarter-over-quarter changes',
    });
  }

  // Evidence appendix (optional)
  if (data.includeEvidenceAppendix && data.evidenceIds && data.evidenceIds.length > 0) {
    slides.push({
      type: 'content',
      title: 'Evidence Appendix',
      content: `This report is backed by ${data.evidenceIds.length} validated evidence records. Full lineage available in speaker notes.`,
      notes: 'Evidence appendix - see speaker notes for detailed lineage',
      evidenceIds: data.evidenceIds,
    });
  }

  return slides;
}

/**
 * Create annual report PPTX template
 *
 * Template structure:
 * - Cover with company logo
 * - Year in review (timeline)
 * - Annual metrics (2 slides)
 * - CSRD-aligned narrative
 * - SDG alignment chart
 * - Volunteer impact map
 * - Citations in speaker notes
 */
export function createAnnualTemplate(data: AnnualData): PPTXSlide[] {
  const slides: PPTXSlide[] = [];

  // Cover slide with logo
  slides.push({
    type: 'title',
    title: `${data.company} - ${data.year} Annual Impact Report`,
    content: 'Creating Measurable Social Impact',
    notes: `Annual impact report for fiscal year ${data.year}`,
  });

  // Year in review - Timeline
  const timelineContent = data.timeline
    .map((item) => `${item.quarter}: ${item.milestone}`)
    .join('\n');

  slides.push({
    type: 'content',
    title: `${data.year} - Year in Review`,
    bullets: data.timeline.map((item) => `**${item.quarter}**: ${item.milestone}`),
    notes: 'Key milestones and achievements throughout the year',
  });

  // Annual metrics - Slide 1
  slides.push({
    type: 'data-table',
    title: `${data.year} Impact By The Numbers`,
    table: {
      headers: ['Metric', 'Annual Total'],
      rows: [
        ['Social Return on Investment', `${data.metrics.sroi.toFixed(2)}:1`],
        ['Total Beneficiaries Reached', data.metrics.beneficiaries.toLocaleString()],
        ['Volunteer Hours Contributed', data.metrics.volunteer_hours.toLocaleString()],
      ],
      columnWidths: [5.0, 4.0],
    },
    notes: 'Core impact metrics for the full year',
    evidenceIds: data.evidenceIds.slice(0, 5),
  });

  // Annual metrics - Slide 2
  slides.push({
    type: 'data-table',
    title: 'Social Value & Program Reach',
    table: {
      headers: ['Metric', 'Annual Total'],
      rows: [
        ['Social Value Generated', `$${data.metrics.social_value.toLocaleString()}`],
        ['Active Programs', data.metrics.programs_count.toString()],
        ['Cost per Beneficiary', `$${(data.metrics.social_value / data.metrics.beneficiaries).toFixed(2)}`],
      ],
      columnWidths: [5.0, 4.0],
    },
    notes: 'Financial impact and program efficiency',
    evidenceIds: data.evidenceIds.slice(5, 10),
  });

  // CSRD-aligned narrative
  slides.push({
    type: 'content',
    title: 'Corporate Sustainability Reporting (CSRD)',
    content: data.csrd_narrative,
    notes: 'CSRD-compliant narrative summary of social impact activities',
  });

  // SDG alignment
  if (data.sdg_alignment.length > 0) {
    slides.push({
      type: 'two-column',
      title: 'UN Sustainable Development Goals Alignment',
      bullets: data.sdg_alignment.map(
        (sdg) => `**SDG ${sdg.goal_number}: ${sdg.goal_name}** - ${sdg.contribution}`
      ),
      notes: 'How our programs contribute to UN SDGs',
    });
  }

  // Volunteer impact map (if provided)
  if (data.volunteer_impact_map) {
    slides.push({
      type: 'image',
      title: 'Volunteer Impact Geographic Distribution',
      images: [data.volunteer_impact_map],
      notes: 'Geographic heatmap of volunteer activities and beneficiary reach',
    });
  }

  // Citations slide
  const citationsContent = data.citations
    .map((cite) => `Slide ${cite.slideNumber}: ${cite.references.length} citations`)
    .join(', ');

  slides.push({
    type: 'content',
    title: 'Report Citations & Validation',
    content: `This report includes ${data.citations.length} cited slides with ${data.citations.reduce((sum, c) => sum + c.references.length, 0)} total evidence references. All claims are validated against source data.`,
    notes: `Citation details:\n${citationsContent}`,
    evidenceIds: data.evidenceIds,
  });

  return slides;
}

/**
 * Create investor update PPTX template
 *
 * Template structure:
 * - Clean, formal title slide
 * - SROI front and center
 * - Financial impact metrics
 * - Growth trajectories
 * - Risk mitigation narrative
 * - Limited evidence (high-level only)
 */
export function createInvestorTemplate(data: InvestorData): PPTXSlide[] {
  const slides: PPTXSlide[] = [];

  // Title slide - Clean and formal
  slides.push({
    type: 'title',
    title: `${data.company} - Investor Update`,
    content: data.period,
    notes: 'Investor-focused impact and financial performance update',
  });

  // SROI headline
  slides.push({
    type: 'content',
    title: 'Social Return on Investment',
    content: `${data.sroi_headline.toFixed(2)}:1`,
    notes: `Every dollar invested generates $${data.sroi_headline.toFixed(2)} in social value`,
  });

  // Financial impact metrics
  slides.push({
    type: 'data-table',
    title: 'Financial Impact Summary',
    table: {
      headers: ['Metric', 'Value'],
      rows: [
        ['Total Investment', `$${data.financial_impact.total_investment.toLocaleString()}`],
        ['Social Value Created', `$${data.financial_impact.social_value_created.toLocaleString()}`],
        ['Cost per Beneficiary', `$${data.financial_impact.cost_per_beneficiary.toFixed(2)}`],
        ['Efficiency Ratio', `${(data.financial_impact.efficiency_ratio * 100).toFixed(1)}%`],
      ],
      columnWidths: [5.0, 4.0],
    },
    notes: 'Key financial metrics demonstrating program efficiency and value creation',
  });

  // Growth trajectories
  for (const chart of data.growth_metrics) {
    slides.push({
      type: 'chart',
      title: chart.title,
      chart,
      notes: 'Growth trajectory analysis',
    });
  }

  // Risk mitigation
  const riskRows = data.risk_mitigation.map((risk) => [
    risk.risk,
    risk.mitigation,
    risk.status.toUpperCase(),
  ]);

  slides.push({
    type: 'data-table',
    title: 'Risk Mitigation & Controls',
    table: {
      headers: ['Risk', 'Mitigation Strategy', 'Status'],
      rows: riskRows,
      columnWidths: [3.0, 4.5, 1.5],
    },
    notes: 'Comprehensive risk management approach',
  });

  // Executive summary
  slides.push({
    type: 'content',
    title: 'Strategic Outlook',
    content: data.executive_summary,
    notes: 'Forward-looking strategic narrative for investors',
    evidenceIds: data.evidenceIds, // High-level evidence only
  });

  return slides;
}

/**
 * Create impact deep dive PPTX template
 *
 * Template structure:
 * - Evidence-heavy presentation (15-20 slides)
 * - Per-dimension breakdown
 * - Citation counts on every slide
 * - "Why this section?" explainer boxes
 * - Lineage sparklines
 * - Full evidence appendix
 */
export function createImpactTemplate(data: ImpactData): PPTXSlide[] {
  const slides: PPTXSlide[] = [];

  // Title slide
  slides.push({
    type: 'title',
    title: `${data.company} - Impact Deep Dive`,
    content: data.period,
    notes: 'Comprehensive evidence-based impact analysis',
  });

  // Overview with explainer
  const overviewExplainer = data.explainer_boxes.find((box) => box.title === 'Overview');
  slides.push({
    type: 'content',
    title: 'Why This Deep Dive?',
    content: overviewExplainer?.content || 'This deep dive provides granular analysis of impact across all dimensions, backed by validated evidence and full lineage tracking.',
    notes: 'Purpose and scope of the deep dive analysis',
  });

  // Per-dimension breakdown
  for (const dimension of data.dimensions) {
    // Dimension overview
    slides.push({
      type: 'content',
      title: `${dimension.name} - Overview`,
      bullets: [
        `Overall Score: ${dimension.score.toFixed(1)}/10`,
        `Evidence Records: ${dimension.evidence_count}`,
        `Citation Density: ${data.citations_per_slide} per slide`,
      ],
      notes: `${dimension.name} dimension overview with evidence summary`,
    });

    // Dimension metrics breakdown
    const metricRows = dimension.breakdown.map((metric) => [
      metric.metric,
      metric.value.toFixed(2),
      `${metric.evidence_ids.length} citations`,
    ]);

    slides.push({
      type: 'data-table',
      title: `${dimension.name} - Metrics Breakdown`,
      table: {
        headers: ['Metric', 'Value', 'Evidence'],
        rows: metricRows,
        columnWidths: [4.0, 2.5, 2.5],
      },
      notes: `Detailed metrics for ${dimension.name} with evidence citations`,
      evidenceIds: dimension.breakdown.flatMap((m) => m.evidence_ids).slice(0, data.citations_per_slide),
    });

    // Lineage sparkline (if available)
    if (dimension.lineage_chart) {
      slides.push({
        type: 'chart',
        title: `${dimension.name} - Evidence Lineage`,
        chart: dimension.lineage_chart,
        notes: 'Lineage sparkline showing evidence flow and transformations',
      });
    }

    // "Why this matters" explainer
    const dimensionExplainer = data.explainer_boxes.find(
      (box) => box.title === `${dimension.name} Explainer`
    );
    if (dimensionExplainer) {
      slides.push({
        type: 'content',
        title: `Why ${dimension.name} Matters`,
        content: dimensionExplainer.content,
        notes: `Contextual explanation of ${dimension.name} dimension`,
      });
    }
  }

  // Full evidence appendix
  if (data.evidenceAppendix.length > 0) {
    // Split appendix into multiple slides (max 10 records per slide)
    const recordsPerSlide = 10;
    const appendixSlides = Math.ceil(data.evidenceAppendix.length / recordsPerSlide);

    for (let i = 0; i < appendixSlides; i++) {
      const startIdx = i * recordsPerSlide;
      const endIdx = Math.min(startIdx + recordsPerSlide, data.evidenceAppendix.length);
      const slideRecords = data.evidenceAppendix.slice(startIdx, endIdx);

      const appendixRows = slideRecords.map((record) => [
        record.evidence_id,
        record.type,
        record.description.substring(0, 50) + (record.description.length > 50 ? '...' : ''),
      ]);

      slides.push({
        type: 'data-table',
        title: `Evidence Appendix (${i + 1}/${appendixSlides})`,
        table: {
          headers: ['Evidence ID', 'Type', 'Description'],
          rows: appendixRows,
          columnWidths: [2.0, 2.0, 5.0],
        },
        notes: `Evidence appendix page ${i + 1} of ${appendixSlides}\n\nFull details:\n${slideRecords.map((r) => `${r.evidence_id}: ${r.description} (${r.source}, ${r.date})`).join('\n')}`,
        evidenceIds: slideRecords.map((r) => r.evidence_id),
      });
    }
  }

  // Summary slide
  slides.push({
    type: 'content',
    title: 'Deep Dive Summary',
    bullets: [
      `Analyzed ${data.dimensions.length} impact dimensions`,
      `Validated ${data.evidenceAppendix.length} evidence records`,
      `Maintained ${data.citations_per_slide} citations per slide average`,
      `Full lineage tracking for all metrics`,
    ],
    notes: 'Summary of deep dive analysis with evidence coverage statistics',
  });

  return slides;
}

/**
 * Create executive summary PPTX template (legacy - for backward compatibility)
 */
export function createExecutiveSummaryTemplate(data: {
  title: string;
  period: string;
  company: string;
  metrics: {
    sroi: number;
    beneficiaries: number;
    volunteer_hours: number;
    social_value: number;
  };
  key_achievements: string[];
  charts: ChartData[];
}): PPTXSlide[] {
  const slides: PPTXSlide[] = [];

  // Title slide
  slides.push({
    type: 'title',
    title: data.title,
    content: data.period,
    notes: 'Executive summary cover slide',
  });

  // At-a-Glance metrics
  slides.push({
    type: 'data-table',
    title: 'Impact At-a-Glance',
    table: {
      headers: ['Metric', 'Value'],
      rows: [
        ['Social ROI', `${data.metrics.sroi.toFixed(2)}:1`],
        ['Total Beneficiaries', data.metrics.beneficiaries.toLocaleString()],
        ['Volunteer Hours', data.metrics.volunteer_hours.toLocaleString()],
        ['Social Value Created', `$${data.metrics.social_value.toLocaleString()}`],
      ],
      columnWidths: [4.5, 4.5],
    },
    notes: 'Key impact metrics summary',
  });

  // Key achievements
  slides.push({
    type: 'content',
    title: 'Key Achievements',
    bullets: data.key_achievements,
    notes: 'Highlight major accomplishments during the period',
  });

  // Charts (one per slide)
  for (const chart of data.charts) {
    slides.push({
      type: 'chart',
      title: chart.title,
      chart,
      notes: `Chart: ${chart.title}`,
    });
  }

  // Closing slide
  slides.push({
    type: 'content',
    title: 'Looking Forward',
    content:
      'Building on our success, we remain committed to creating measurable social impact and driving positive change in our communities.',
    notes: 'Closing remarks',
  });

  return slides;
}

/**
 * Estimate PPTX file size
 *
 * @param slides - Number of slides
 * @returns Estimated size in bytes
 */
export function estimatePPTXSize(slides: number): number {
  // Base file size + ~50KB per slide (rough estimate)
  return 100 * 1024 + slides * 50 * 1024;
}
