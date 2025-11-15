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
 * Create executive summary PPTX template
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
