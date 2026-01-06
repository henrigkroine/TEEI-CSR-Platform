import { describe, it, expect, beforeAll } from 'vitest';
import { getTemplateManager, type SectionType, type Locale } from './index.js';

describe('PromptTemplateManager', () => {
  let templateManager: ReturnType<typeof getTemplateManager>;

  beforeAll(() => {
    templateManager = getTemplateManager();
  });

  describe('Template Loading', () => {
    it('should load all section types including new generators', () => {
      const sections: SectionType[] = [
        'impact-summary',
        'sroi-narrative',
        'outcome-trends',
        'quarterly-report',
        'annual-report',
        'investor-update',
        'impact-deep-dive',
        'case-study',
        'methods-whitepaper',
      ];

      sections.forEach(section => {
        expect(() => {
          templateManager.getTemplate(section, 'en');
        }).not.toThrow();
      });
    });

    it('should load case-study template', () => {
      const template = templateManager.getTemplate('case-study', 'en');
      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    it('should load methods-whitepaper template', () => {
      const template = templateManager.getTemplate('methods-whitepaper', 'en');
      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    it('should fallback to English for unsupported locales', () => {
      // Most templates only exist in English initially
      const template = templateManager.getTemplate('case-study', 'fr');
      expect(template).toBeDefined();
    });
  });

  describe('Template Rendering - Case Study', () => {
    it('should render case-study template with required data', () => {
      const mockData = {
        companyName: 'Test Company',
        periodStart: '2024-01-01',
        periodEnd: '2024-12-31',
        participantsCount: 150,
        sessionsCount: 450,
        volunteersCount: 30,
        programType: 'mentorship',
        targetDemographic: 'young-adults',
        sroiRatio: 5.23,
        visScore: 87.5,
        avgConfidence: 0.78,
        avgBelonging: 0.82,
        avgJobReadiness: 0.65,
        avgLanguageLevel: 0.71,
        avgWellBeing: 0.76,
        confidenceDelta: 0.12,
        belongingDelta: 0.15,
        jobReadinessDelta: 0.08,
        languageLevelDelta: 0.10,
        wellBeingDelta: 0.11,
        evidenceSnippets: [
          {
            id: 'ev-001',
            text: 'Sample evidence snippet',
            dimension: 'confidence',
            score: 0.85,
            confidence: 0.92,
          },
        ],
      };

      const rendered = templateManager.render('case-study', mockData, 'en');

      // Verify key sections are present
      expect(rendered).toContain('Customer Case Study');
      expect(rendered).toContain('Test Company');
      expect(rendered).toContain('SROI');
      expect(rendered).toContain('VIS');
      expect(rendered).toContain('Executive Summary');
      expect(rendered).toContain('The Challenge');
      expect(rendered).toContain('The Intervention');
      expect(rendered).toContain('The Transformation');
      expect(rendered).toContain('Value Created');
      expect(rendered).toContain('[cite:ev-001]');
    });

    it('should include chart placeholders in case-study template', () => {
      const mockData = {
        companyName: 'Test Company',
        periodStart: '2024-01-01',
        periodEnd: '2024-12-31',
        sroiRatio: 5.23,
        visScore: 87.5,
        evidenceSnippets: [],
        participantsCount: 150,
        sessionsCount: 450,
        volunteersCount: 30,
      };

      const rendered = templateManager.render('case-study', mockData, 'en');

      // Verify chart placeholders
      expect(rendered).toMatch(/\[\[CHART:/);
    });
  });

  describe('Template Rendering - Methods Whitepaper', () => {
    it('should render methods-whitepaper template with required data', () => {
      const mockData = {
        companyName: 'Test Company',
        periodStart: '2024-01-01',
        periodEnd: '2024-12-31',
        sroiRatio: 5.23,
        visScore: 87.5,
        evidenceCount: 250,
        dataQualityScore: 94,
        lineageCoverage: 92,
        avgConfidence: 0.78,
        avgBelonging: 0.82,
        avgJobReadiness: 0.65,
        avgLanguageLevel: 0.71,
        avgWellBeing: 0.76,
        schemaValidationPass: 98,
        nullRate: 2.1,
        outlierCount: 3,
        refIntegrityPass: 99,
        freshnessStatus: 'On-time',
        evidenceSnippets: [
          {
            id: 'ev-001',
            text: 'Sample lineage evidence',
            dimension: 'data-quality',
            score: 0.95,
            confidence: 0.98,
            lineageId: 'lineage-001',
          },
        ],
      };

      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      // Verify key sections are present
      expect(rendered).toContain('Methods Whitepaper');
      expect(rendered).toContain('Test Company');
      expect(rendered).toContain('SROI');
      expect(rendered).toContain('VIS');
      expect(rendered).toContain('Abstract');
      expect(rendered).toContain('Social Return on Investment');
      expect(rendered).toContain('Volunteer Impact Score');
      expect(rendered).toContain('Data Sources');
      expect(rendered).toContain('Lineage');
      expect(rendered).toContain('Data Quality');
      expect(rendered).toContain('Validation');
      expect(rendered).toContain('[cite:ev-001]');
    });

    it('should include table placeholders in methods-whitepaper template', () => {
      const mockData = {
        companyName: 'Test Company',
        periodStart: '2024-01-01',
        periodEnd: '2024-12-31',
        sroiRatio: 5.23,
        visScore: 87.5,
        evidenceSnippets: [],
        evidenceCount: 250,
        dataQualityScore: 94,
        lineageCoverage: 92,
      };

      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');

      // Verify table placeholders
      expect(rendered).toMatch(/\[\[TABLE:/);
    });
  });

  describe('Template Versioning', () => {
    it('should return version string for case-study template', () => {
      const version = templateManager.getTemplateVersion('case-study', 'en');
      expect(version).toContain('case-study');
      expect(version).toContain('en');
    });

    it('should return version string for methods-whitepaper template', () => {
      const version = templateManager.getTemplateVersion('methods-whitepaper', 'en');
      expect(version).toContain('methods-whitepaper');
      expect(version).toContain('en');
    });
  });

  describe('Handlebars Helpers', () => {
    it('should format numbers correctly', () => {
      const mockData = {
        companyName: 'Test',
        sroiRatio: 5.234567,
        evidenceSnippets: [],
        periodStart: '2024-01-01',
        periodEnd: '2024-12-31',
      };

      const rendered = templateManager.render('case-study', mockData, 'en');
      expect(rendered).toContain('5.23');
    });

    it('should format percentages correctly', () => {
      const mockData = {
        companyName: 'Test',
        avgConfidence: 0.7845,
        evidenceSnippets: [],
        periodStart: '2024-01-01',
        periodEnd: '2024-12-31',
      };

      const rendered = templateManager.render('case-study', mockData, 'en');
      expect(rendered).toContain('78.5%');
    });
  });

  describe('Citation Requirements', () => {
    it('should include citation instructions in case-study template', () => {
      const mockData = {
        companyName: 'Test',
        evidenceSnippets: [],
        periodStart: '2024-01-01',
        periodEnd: '2024-12-31',
        sroiRatio: 5.23,
        visScore: 87.5,
      };

      const rendered = templateManager.render('case-study', mockData, 'en');
      expect(rendered).toContain('citation');
      expect(rendered).toContain('[cite:');
      expect(rendered).toMatch(/minimum.*citation/i);
    });

    it('should include citation instructions in methods-whitepaper template', () => {
      const mockData = {
        companyName: 'Test',
        evidenceSnippets: [],
        periodStart: '2024-01-01',
        periodEnd: '2024-12-31',
        sroiRatio: 5.23,
        visScore: 87.5,
        evidenceCount: 250,
        dataQualityScore: 94,
        lineageCoverage: 92,
      };

      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');
      expect(rendered).toContain('citation');
      expect(rendered).toContain('[cite:');
      expect(rendered).toMatch(/lineage/i);
    });
  });

  describe('Multi-locale Support', () => {
    const locales: Locale[] = ['en', 'es', 'fr', 'uk', 'no'];

    locales.forEach(locale => {
      it(`should handle ${locale} locale gracefully`, () => {
        expect(() => {
          templateManager.getTemplate('case-study', locale);
        }).not.toThrow();

        expect(() => {
          templateManager.getTemplate('methods-whitepaper', locale);
        }).not.toThrow();
      });
    });
  });
});
