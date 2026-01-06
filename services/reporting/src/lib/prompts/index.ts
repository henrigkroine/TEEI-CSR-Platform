import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('reporting:prompts');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type SectionType =
  | 'impact-summary'
  | 'sroi-narrative'
  | 'outcome-trends'
  | 'quarterly-report'
  | 'annual-report'
  | 'investor-update'
  | 'impact-deep-dive'
  | 'case-study'
  | 'methods-whitepaper';
export type Locale = 'en' | 'es' | 'fr' | 'uk' | 'no';

/**
 * Prompt template manager with locale support
 * Loads and compiles Handlebars templates for report generation
 */
export class PromptTemplateManager {
  private templates: Map<string, HandlebarsTemplateDelegate>;
  private templateVersions: Map<string, string>;

  constructor() {
    this.templates = new Map();
    this.templateVersions = new Map();
    this.loadTemplates();
  }

  /**
   * Load all templates from disk
   */
  private loadTemplates(): void {
    const sections: SectionType[] = [
      'impact-summary',
      'sroi-narrative',
      'outcome-trends',
      'quarterly-report',
      'annual-report',
      'investor-update',
      'impact-deep-dive',
      'case-study',
      'methods-whitepaper'
    ];
    const locales: Locale[] = ['en', 'es', 'fr', 'uk', 'no'];

    for (const section of sections) {
      for (const locale of locales) {
        try {
          const templatePath = join(__dirname, `${section}.${locale}.hbs`);
          const templateContent = readFileSync(templatePath, 'utf-8');
          const compiled = Handlebars.compile(templateContent);

          const key = this.getTemplateKey(section, locale);
          this.templates.set(key, compiled);

          // Store template version (we'll use a simple hash or version string)
          this.templateVersions.set(key, `${section}-${locale}-v1.0`);

          logger.info(`Loaded template: ${section}.${locale}.hbs`);
        } catch (error: any) {
          // If locale doesn't exist, fall back to English
          if (locale !== 'en') {
            logger.warn(`Template ${section}.${locale}.hbs not found, will use English fallback`);
          } else {
            logger.error(`Failed to load template ${section}.${locale}.hbs: ${error.message}`);
          }
        }
      }
    }

    logger.info(`Loaded ${this.templates.size} templates`);
  }

  /**
   * Get compiled template
   */
  getTemplate(section: SectionType, locale: Locale = 'en'): HandlebarsTemplateDelegate {
    const key = this.getTemplateKey(section, locale);
    const template = this.templates.get(key);

    if (!template) {
      // Fall back to English
      if (locale !== 'en') {
        logger.warn(`Template for ${section}.${locale} not found, using English`);
        return this.getTemplate(section, 'en');
      }
      throw new Error(`Template not found: ${section}.${locale}`);
    }

    return template;
  }

  /**
   * Get template version for audit trail
   */
  getTemplateVersion(section: SectionType, locale: Locale = 'en'): string {
    const key = this.getTemplateKey(section, locale);
    return this.templateVersions.get(key) || `${section}-${locale}-unknown`;
  }

  /**
   * Render template with data
   */
  render(section: SectionType, data: any, locale: Locale = 'en'): string {
    const template = this.getTemplate(section, locale);
    return template(data);
  }

  /**
   * Generate template key
   */
  private getTemplateKey(section: SectionType, locale: Locale): string {
    return `${section}:${locale}`;
  }
}

// Singleton instance
let templateManager: PromptTemplateManager | null = null;

/**
 * Get or create template manager instance
 */
export function getTemplateManager(): PromptTemplateManager {
  if (!templateManager) {
    templateManager = new PromptTemplateManager();
  }
  return templateManager;
}

/**
 * Helper to format numbers for templates
 */
Handlebars.registerHelper('formatNumber', function(value: number, decimals: number = 2) {
  if (typeof value !== 'number') return value;
  return value.toFixed(decimals);
});

/**
 * Helper to format percentages
 */
Handlebars.registerHelper('formatPercent', function(value: number) {
  if (typeof value !== 'number') return value;
  return `${(value * 100).toFixed(1)}%`;
});

/**
 * Helper to compare values
 */
Handlebars.registerHelper('trend', function(current: number, previous: number) {
  if (!previous) return 'new';
  const change = ((current - previous) / previous) * 100;
  if (change > 5) return 'improving';
  if (change < -5) return 'declining';
  return 'stable';
});
