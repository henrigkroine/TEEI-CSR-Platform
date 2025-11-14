/**
 * PPTX Generator
 *
 * PowerPoint export engine for executive reports.
 * Uses pptxgenjs library for server-side PPTX generation.
 *
 * @module utils/pptxGenerator
 */

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
  subject?: string;
  layout?: 'LAYOUT_4x3' | 'LAYOUT_16x9' | 'LAYOUT_WIDE';
  theme?: 'default' | 'corporate' | 'minimalist';
  includeWatermark?: boolean;
  watermarkText?: string;
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
  try {
    // TODO: Implement with pptxgenjs
    // const pptx = new PptxGenJS();

    // // Set properties
    // pptx.author = options.author;
    // pptx.company = options.company;
    // pptx.subject = options.subject || 'Executive Report';
    // pptx.title = options.title;
    // pptx.layout = options.layout || 'LAYOUT_16x9';

    // // Apply theme
    // applyTheme(pptx, options.theme || 'default');

    // // Generate slides
    // for (const slideConfig of slides) {
    //   const slide = pptx.addSlide();
    //   await renderSlide(slide, slideConfig, options);
    // }

    // // Add watermark if enabled
    // if (options.includeWatermark && options.watermarkText) {
    //   addWatermarkToAllSlides(pptx, options.watermarkText);
    // }

    // // Generate and return buffer
    // const buffer = await pptx.write('arraybuffer');
    // return Buffer.from(buffer);

    console.log('[PPTX] Generated presentation:', {
      title: options.title,
      slides: slides.length,
      theme: options.theme,
    });

    // Mock: Return empty buffer
    // In production, this would return the actual PPTX
    return Buffer.from('Mock PPTX content');
  } catch (error) {
    console.error('[PPTX] Generation failed:', error);
    throw new Error('Failed to generate PPTX');
  }
}

/**
 * Render individual slide
 */
async function renderSlide(
  slide: any,
  config: PPTXSlide,
  options: PPTXOptions
): Promise<void> {
  switch (config.type) {
    case 'title':
      renderTitleSlide(slide, config, options);
      break;
    case 'content':
      renderContentSlide(slide, config);
      break;
    case 'chart':
      renderChartSlide(slide, config);
      break;
    case 'data-table':
      renderTableSlide(slide, config);
      break;
    case 'two-column':
      renderTwoColumnSlide(slide, config);
      break;
    case 'image':
      renderImageSlide(slide, config);
      break;
    default:
      throw new Error(`Unknown slide type: ${config.type}`);
  }

  // Add speaker notes if provided
  if (config.notes) {
    slide.addNotes(config.notes);
  }
}

/**
 * Render title slide
 */
function renderTitleSlide(slide: any, config: PPTXSlide, options: PPTXOptions): void {
  // Add title
  slide.addText(config.title, {
    x: 0.5,
    y: 1.5,
    w: 9.0,
    h: 1.5,
    fontSize: 44,
    bold: true,
    color: '363636',
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
      color: '666666',
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
    color: '999999',
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
    color: '999999',
    align: 'center',
  });
}

/**
 * Render content slide with bullets
 */
function renderContentSlide(slide: any, config: PPTXSlide): void {
  // Add title
  slide.addText(config.title, {
    x: 0.5,
    y: 0.5,
    w: 9.0,
    h: 0.75,
    fontSize: 32,
    bold: true,
    color: '363636',
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
      color: '666666',
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
      color: '666666',
      lineSpacing: 24,
    });
  }
}

/**
 * Render chart slide
 */
function renderChartSlide(slide: any, config: PPTXSlide): void {
  // Add title
  slide.addText(config.title, {
    x: 0.5,
    y: 0.5,
    w: 9.0,
    h: 0.75,
    fontSize: 32,
    bold: true,
    color: '363636',
  });

  // Add chart
  if (config.chart) {
    const chartData = convertChartData(config.chart);
    slide.addChart(config.chart.type.toUpperCase(), chartData, {
      x: 1.0,
      y: 1.5,
      w: 8.0,
      h: 4.0,
      showTitle: true,
      title: config.chart.title,
      showLegend: true,
      legendPos: 'r',
    });
  }
}

/**
 * Render table slide
 */
function renderTableSlide(slide: any, config: PPTXSlide): void {
  // Add title
  slide.addText(config.title, {
    x: 0.5,
    y: 0.5,
    w: 9.0,
    h: 0.75,
    fontSize: 32,
    bold: true,
    color: '363636',
  });

  // Add table
  if (config.table) {
    const tableData = [config.table.headers, ...config.table.rows];
    slide.addTable(tableData, {
      x: 0.5,
      y: 1.5,
      w: 9.0,
      h: 4.0,
      fontSize: 14,
      border: { pt: 1, color: 'CCCCCC' },
      fill: { color: 'F7F7F7' },
      color: '363636',
      colW: config.table.columnWidths,
      rowH: 0.4,
      valign: 'middle',
    });
  }
}

/**
 * Render two-column slide
 */
function renderTwoColumnSlide(slide: any, config: PPTXSlide): void {
  // Add title
  slide.addText(config.title, {
    x: 0.5,
    y: 0.5,
    w: 9.0,
    h: 0.75,
    fontSize: 32,
    bold: true,
    color: '363636',
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
      color: '666666',
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
      color: '666666',
    });
  }
}

/**
 * Render image slide
 */
function renderImageSlide(slide: any, config: PPTXSlide): void {
  // Add title
  slide.addText(config.title, {
    x: 0.5,
    y: 0.5,
    w: 9.0,
    h: 0.75,
    fontSize: 32,
    bold: true,
    color: '363636',
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
          color: '999999',
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
 * Apply theme to presentation
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
  // Apply theme configuration to pptx instance
  // pptx.theme = themeConfig;
}

/**
 * Add watermark to all slides
 */
function addWatermarkToAllSlides(pptx: any, text: string): void {
  // This would iterate through all slides and add a watermark
  // For each slide:
  // slide.addText(text, {
  //   x: 0,
  //   y: 0,
  //   w: '100%',
  //   h: '100%',
  //   fontSize: 60,
  //   color: 'CCCCCC',
  //   align: 'center',
  //   valign: 'middle',
  //   rotate: 45,
  //   transparency: 70,
  // });
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
