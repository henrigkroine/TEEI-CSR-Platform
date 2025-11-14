import mjml2html from 'mjml';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('notifications:template-compiler');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '../templates');

/**
 * Template compilation result
 */
export interface CompiledTemplate {
  html: string;
  text: string;
  subject?: string;
}

/**
 * Template cache to avoid recompiling
 */
const templateCache = new Map<string, { mjml: string; compiled: Handlebars.TemplateDelegate }>();

/**
 * Load and compile MJML template
 */
function loadTemplate(templateId: string): { mjml: string; compiled: Handlebars.TemplateDelegate } {
  // Check cache first
  if (templateCache.has(templateId)) {
    return templateCache.get(templateId)!;
  }

  try {
    const templatePath = join(TEMPLATES_DIR, `${templateId}.mjml`);
    const mjmlContent = readFileSync(templatePath, 'utf-8');
    const compiled = Handlebars.compile(mjmlContent);

    templateCache.set(templateId, { mjml: mjmlContent, compiled });
    logger.info(`Template compiled and cached: ${templateId}`);

    return { mjml: mjmlContent, compiled };
  } catch (error: any) {
    logger.error(`Failed to load template ${templateId}:`, error);
    throw new Error(`Template not found: ${templateId}`);
  }
}

/**
 * Compile template with variables
 */
export function compileTemplate(
  templateId: string,
  variables: Record<string, any>
): CompiledTemplate {
  try {
    const { compiled } = loadTemplate(templateId);

    // Render MJML with variables
    const mjmlWithVars = compiled(variables);

    // Convert MJML to HTML
    const { html, errors } = mjml2html(mjmlWithVars, {
      validationLevel: 'soft',
      minify: true,
    });

    if (errors.length > 0) {
      logger.warn(`MJML compilation warnings for ${templateId}:`, errors);
    }

    // Generate plain text version (basic HTML to text conversion)
    const text = htmlToText(html);

    return { html, text };
  } catch (error: any) {
    logger.error(`Template compilation failed for ${templateId}:`, error);
    throw error;
  }
}

/**
 * Compile template subject line with variables
 */
export function compileSubject(subject: string, variables: Record<string, any>): string {
  const template = Handlebars.compile(subject);
  return template(variables);
}

/**
 * Basic HTML to text conversion
 * Strips HTML tags and formats for plain text email
 */
function htmlToText(html: string): string {
  return html
    // Remove scripts and styles
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Convert common tags
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Register custom Handlebars helpers
 */
Handlebars.registerHelper('formatDate', function (date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
});

Handlebars.registerHelper('formatNumber', function (num: number) {
  return num.toLocaleString('en-US');
});

Handlebars.registerHelper('formatCurrency', function (amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
});

Handlebars.registerHelper('formatPercent', function (value: number, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
});

logger.info('Template compiler initialized');
