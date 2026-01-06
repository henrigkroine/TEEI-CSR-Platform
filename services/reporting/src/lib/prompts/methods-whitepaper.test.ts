/**
 * Methods Whitepaper Template Tests
 *
 * Unit tests for methods-whitepaper template content blocks and technical accuracy
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getTemplateManager } from './index.js';
import type { Locale } from './index.js';

describe('Methods Whitepaper Template', () => {
  let templateManager: ReturnType<typeof getTemplateManager>;

  beforeAll(() => {
    templateManager = getTemplateManager();
  });

  describe('Template Loading', () => {
    it('should load methods-whitepaper template for all locales', () => {
      const locales: Locale[] = ['en', 'es', 'fr', 'uk', 'no'];

      for (const locale of locales) {
        expect(() => {
          templateManager.getTemplate('methods-whitepaper', locale);
        }).not.toThrow();
      }
    });

    it('should have correct version format', () => {
      const version = templateManager.getTemplateVersion('methods-whitepaper', 'en');
      expect(version).toMatch(/^methods-whitepaper-en-v\d+\.\d+$/);
    });
  });

  describe('Template Rendering', () => {
    const mockData = {
      companyName: 'Test Research Org',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
      participantsCount: 200,
      sessionsCount: 600,
      volunteersCount: 40,
      avgConfidence: 0.82,
      avgBelonging: 0.85,
      avgJobReadiness: 0.68,
      avgLanguageLevel: 0.74,
      avgWellBeing: 0.79,
      sroiRatio: 5.8,
      visScore: 88.5,
      evidenceSnippets: [
        {
          id: 'evidence-789',
          text: 'Methodological transparency is key',
          dimension: 'quality',
          score: 0.92,
        },
      ],
      dataQuality: {
        snippetCount: 500,
        avgConfidence: 0.85,
        dimensionsCovered: 5,
        completeness: 0.95,
        citationDensity: 2.5,
        testPassRate: 0.94,
      },
    };

    it('should render English template with data', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('Test Research Org');
      expect(rendered).toContain('5.8:1');
      expect(rendered).toContain('88.5');
      expect(rendered).toContain('Methods Whitepaper');
    });

    it('should include all required methodology sections', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      const requiredSections = [
        'Executive Summary',
        'Defining VIS and SROI',
        'Data Sources & Lineage',
        'VIS Calculation Methodology',
        'SROI Calculation Methodology',
        'Data Quality & Governance',
        'Limitations & Future Enhancements',
        'Conclusion',
      ];

      for (const section of requiredSections) {
        expect(rendered).toContain(section);
      }
    });

    it('should include VIS formula components', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('Component A');
      expect(rendered).toContain('Component B');
      expect(rendered).toContain('Component C');
      expect(rendered).toContain('0.4'); // 40% weight
      expect(rendered).toContain('0.2'); // 20% weight
      expect(rendered).toContain('Participant Satisfaction with Volunteers');
    });

    it('should include SROI formula components', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('Numerator');
      expect(rendered).toContain('Denominator');
      expect(rendered).toContain('Monetization');
      expect(rendered).toContain('Social Value');
      expect(rendered).toContain('Program Costs');
    });

    it('should include data quality metadata', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('500'); // snippetCount
      expect(rendered).toContain('0.95'); // completeness
      expect(rendered).toContain('2.5'); // citation density
    });

    it('should reference Q2Q AI pipeline', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('Q2Q');
      expect(rendered).toContain('Qualitative-to-Quantitative');
      expect(rendered).toContain('NLP');
      expect(rendered).toContain('AI classification');
    });

    it('should include OpenLineage lineage tracking', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('OpenLineage');
      expect(rendered).toContain('lineage');
      expect(rendered).toContain('dataset');
      expect(rendered).toContain('audit trail');
    });

    it('should include Great Expectations data quality', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('Great Expectations');
      expect(rendered).toContain('GE');
      expect(rendered).toContain('test suite');
      expect(rendered).toContain('data quality');
    });

    it('should include GDPR compliance section', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('GDPR');
      expect(rendered).toContain('data residency');
      expect(rendered).toContain('TTL');
      expect(rendered).toContain('DSAR');
      expect(rendered).toContain('anonymization');
    });

    it('should specify word count range', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('2500-3000 words');
    });

    it('should include table auto-generation instructions', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('[TABLE:');
      expect(rendered).toContain('Evidence Snippet Statistics');
      expect(rendered).toContain('GE Test Suite Coverage');
      expect(rendered).toContain('VIS Component Breakdown');
      expect(rendered).toContain('SROI Numerator Breakdown');
      expect(rendered).toContain('Lineage Metadata');
    });

    it('should enforce academic rigor requirements', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('formulas');
      expect(rendered).toContain('validation');
      expect(rendered).toContain('limitations');
      expect(rendered).toContain('transparency');
      expect(rendered).toContain('technical whitepaper');
    });
  });

  describe('Localization', () => {
    const mockData = {
      companyName: 'Organización de Investigación',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
      participantsCount: 150,
      sroiRatio: 5.5,
      visScore: 85,
      avgConfidence: 0.8,
      avgBelonging: 0.8,
      avgJobReadiness: 0.6,
      avgLanguageLevel: 0.7,
      avgWellBeing: 0.75,
      evidenceSnippets: [
        { id: 'e1', text: 'Test', dimension: 'quality', score: 0.9 },
      ],
    };

    it('should render Spanish template in Spanish', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'es');

      expect(rendered).toContain('Libro Blanco');
      expect(rendered).toContain('Metodología');
      expect(rendered).toContain('ESPAÑOL');
    });

    it('should render French template in French', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'fr');

      expect(rendered).toContain('Livre Blanc');
      expect(rendered).toContain('Méthodologie');
      expect(rendered).toContain('FRANÇAIS');
    });

    it('should render Ukrainian template in Ukrainian', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'uk');

      expect(rendered).toContain('Методологічний');
      expect(rendered).toContain('Звіт');
      expect(rendered).toContain('УКРАЇНСЬКОЮ');
    });

    it('should render Norwegian template in Norwegian', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'no');

      expect(rendered).toContain('Metodologi');
      expect(rendered).toContain('Whitepaper');
      expect(rendered).toContain('NORSK');
    });
  });

  describe('Technical Content Validation', () => {
    const mockData = {
      companyName: 'Test',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
      participantsCount: 100,
      sessionsCount: 300,
      volunteersCount: 20,
      sroiRatio: 5.0,
      visScore: 80,
      avgConfidence: 0.8,
      avgBelonging: 0.8,
      avgJobReadiness: 0.6,
      avgLanguageLevel: 0.7,
      avgWellBeing: 0.75,
      evidenceSnippets: [],
    };

    it('should include VIS interpretation thresholds', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('0-40');
      expect(rendered).toContain('41-70');
      expect(rendered).toContain('71-100');
      expect(rendered).toContain('Low volunteer impact');
      expect(rendered).toContain('Moderate volunteer impact');
      expect(rendered).toContain('High volunteer impact');
    });

    it('should include SROI sensitivity analysis', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('Sensitivity');
      expect(rendered).toContain('volunteer hour valuation');
      expect(rendered).toContain('Counterfactual');
      expect(rendered).toContain('Deadweight');
      expect(rendered).toContain('Attribution');
    });

    it('should include AI classification limitations', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('AI may misclassify');
      expect(rendered).toContain('5-10% error rate');
      expect(rendered).toContain('confidence scores');
    });

    it('should include counterfactual gap acknowledgment', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('No RCT control group');
      expect(rendered).toContain('counterfactual');
      expect(rendered).toContain('Limitations');
    });

    it('should include future enhancement roadmap', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('Future Enhancements');
      expect(rendered).toContain('Validation');
      expect(rendered).toContain('RCT design');
      expect(rendered).toContain('Longitudinal tracking');
      expect(rendered).toContain('dbt metrics');
    });

    it('should require transparency on proxies', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('proxy');
      expect(rendered).toContain('research-based');
      expect(rendered).toContain('not actual');
    });
  });

  describe('Citation Requirements', () => {
    it('should enforce minimum 2 citations per paragraph', () => {
      const mockData = {
        companyName: 'Test',
        periodStart: '2024-01-01',
        periodEnd: '2024-12-31',
        participantsCount: 100,
        sroiRatio: 5,
        visScore: 80,
        avgConfidence: 0.8,
        avgBelonging: 0.8,
        avgJobReadiness: 0.6,
        avgLanguageLevel: 0.7,
        avgWellBeing: 0.75,
        evidenceSnippets: [],
      };

      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      expect(rendered).toContain('minimum 2 per paragraph');
      expect(rendered).toContain('[cite:ID]');
      expect(rendered).toContain('Every calculation step must cite source evidence');
    });
  });
});
