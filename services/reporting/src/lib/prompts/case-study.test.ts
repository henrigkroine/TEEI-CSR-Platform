/**
 * Case Study Template Tests
 *
 * Unit tests for case-study template content blocks and citation requirements
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getTemplateManager } from './index.js';
import type { SectionType, Locale } from './index.js';

describe('Case Study Template', () => {
  let templateManager: ReturnType<typeof getTemplateManager>;

  beforeAll(() => {
    templateManager = getTemplateManager();
  });

  describe('Template Loading', () => {
    it('should load case-study template for all locales', () => {
      const locales: Locale[] = ['en', 'es', 'fr', 'uk', 'no'];

      for (const locale of locales) {
        expect(() => {
          templateManager.getTemplate('case-study', locale);
        }).not.toThrow();
      }
    });

    it('should have correct version format', () => {
      const version = templateManager.getTemplateVersion('case-study', 'en');
      expect(version).toMatch(/^case-study-en-v\d+\.\d+$/);
    });
  });

  describe('Template Rendering', () => {
    const mockData = {
      companyName: 'Test Company',
      periodStart: '2024-01-01',
      periodEnd: '2024-03-31',
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
      evidenceSnippets: [
        {
          id: 'evidence-123',
          text: 'I feel more confident applying for jobs now',
          dimension: 'confidence',
          score: 0.85,
        },
        {
          id: 'evidence-456',
          text: 'The program helped me connect with my community',
          dimension: 'belonging',
          score: 0.79,
        },
      ],
    };

    it('should render English template with data', () => {
      const rendered = templateManager.render('case-study', mockData, 'en');

      expect(rendered).toContain('Test Company');
      expect(rendered).toContain('2024-01-01');
      expect(rendered).toContain('150');
      expect(rendered).toContain('5.23:1');
      expect(rendered).toContain('87.5');
    });

    it('should include all required sections in instructions', () => {
      const rendered = templateManager.render('case-study', mockData, 'en');

      const requiredSections = [
        'Executive Summary',
        'The Challenge',
        'The Intervention',
        'The Results',
        'The ROI',
        'Participant Stories',
        'Lessons Learned',
        'Call to Action',
      ];

      for (const section of requiredSections) {
        expect(rendered).toContain(section);
      }
    });

    it('should include evidence snippets with cite format', () => {
      const rendered = templateManager.render('case-study', mockData, 'en');

      expect(rendered).toContain('[cite:evidence-123]');
      expect(rendered).toContain('[cite:evidence-456]');
      expect(rendered).toContain('I feel more confident');
      expect(rendered).toContain('connect with my community');
    });

    it('should include citation requirements', () => {
      const rendered = templateManager.render('case-study', mockData, 'en');

      expect(rendered).toContain('CRITICAL');
      expect(rendered).toContain('2 citations per paragraph');
      expect(rendered).toContain('[cite:ID]');
    });

    it('should specify word count range', () => {
      const rendered = templateManager.render('case-study', mockData, 'en');

      expect(rendered).toContain('1800-2200 words');
    });

    it('should include chart auto-pull instructions', () => {
      const rendered = templateManager.render('case-study', mockData, 'en');

      expect(rendered).toContain('[CHART:');
      expect(rendered).toContain('Baseline vs. Current Outcomes');
      expect(rendered).toContain('SROI Value Breakdown');
    });

    it('should enforce Evidence Gate rules', () => {
      const rendered = templateManager.render('case-study', mockData, 'en');

      expect(rendered).toContain('Every substantive paragraph must have at least 2 citations');
      expect(rendered).toContain('do not fabricate');
    });
  });

  describe('Localization', () => {
    const mockData = {
      companyName: 'Empresa de Prueba',
      periodStart: '2024-01-01',
      periodEnd: '2024-03-31',
      participantsCount: 100,
      sroiRatio: 4.5,
      visScore: 75,
      avgConfidence: 0.7,
      avgBelonging: 0.8,
      avgJobReadiness: 0.6,
      avgLanguageLevel: 0.65,
      avgWellBeing: 0.72,
      evidenceSnippets: [
        { id: 'e1', text: 'Test', dimension: 'confidence', score: 0.8 },
      ],
    };

    it('should render Spanish template in Spanish', () => {
      const rendered = templateManager.render('case-study', mockData, 'es');

      expect(rendered).toContain('Estudio de Caso');
      expect(rendered).toContain('Resumen Ejecutivo');
      expect(rendered).toContain('ESPAÑOL');
    });

    it('should render French template in French', () => {
      const rendered = templateManager.render('case-study', mockData, 'fr');

      expect(rendered).toContain('Étude de Cas');
      expect(rendered).toContain('Résumé Exécutif');
      expect(rendered).toContain('FRANÇAIS');
    });

    it('should render Ukrainian template in Ukrainian', () => {
      const rendered = templateManager.render('case-study', mockData, 'uk');

      expect(rendered).toContain('Кейс-Дослідження');
      expect(rendered).toContain('Резюме');
      expect(rendered).toContain('УКРАЇНСЬКОЮ');
    });

    it('should render Norwegian template in Norwegian', () => {
      const rendered = templateManager.render('case-study', mockData, 'no');

      expect(rendered).toContain('Casestudie');
      expect(rendered).toContain('Sammendrag');
      expect(rendered).toContain('NORSK');
    });
  });

  describe('Template Content Validation', () => {
    it('should include baseline metrics section', () => {
      const mockDataWithBaseline = {
        companyName: 'Test',
        periodStart: '2024-01-01',
        periodEnd: '2024-03-31',
        participantsCount: 100,
        sroiRatio: 5,
        visScore: 80,
        avgConfidence: 0.8,
        avgBelonging: 0.8,
        avgJobReadiness: 0.6,
        avgLanguageLevel: 0.7,
        avgWellBeing: 0.75,
        baselineMetrics: {
          avgConfidence: 0.5,
          avgBelonging: 0.6,
          avgJobReadiness: 0.4,
          avgLanguageLevel: 0.5,
          avgWellBeing: 0.55,
        },
        evidenceSnippets: [],
      };

      const rendered = templateManager.render('case-study', mockDataWithBaseline, 'en');

      expect(rendered).toContain('Baseline Metrics');
      expect(rendered).toContain('0.5'); // Baseline confidence
    });

    it('should handle missing baseline gracefully', () => {
      const mockDataNoBaseline = {
        companyName: 'Test',
        periodStart: '2024-01-01',
        periodEnd: '2024-03-31',
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

      const rendered = templateManager.render('case-study', mockDataNoBaseline, 'en');

      expect(rendered).toContain('Baseline data not available');
    });

    it('should include VIS and SROI in value creation section', () => {
      const mockData = {
        companyName: 'Test',
        periodStart: '2024-01-01',
        periodEnd: '2024-03-31',
        participantsCount: 100,
        sroiRatio: 6.5,
        visScore: 92,
        avgConfidence: 0.8,
        avgBelonging: 0.8,
        avgJobReadiness: 0.6,
        avgLanguageLevel: 0.7,
        avgWellBeing: 0.75,
        evidenceSnippets: [],
      };

      const rendered = templateManager.render('case-study', mockData, 'en');

      expect(rendered).toContain('6.5:1');
      expect(rendered).toContain('92');
      expect(rendered).toContain('SROI');
      expect(rendered).toContain('VIS');
    });

    it('should require narrative arc structure', () => {
      const rendered = templateManager.render('case-study', {
        companyName: 'Test',
        periodStart: '2024-01-01',
        periodEnd: '2024-03-31',
        participantsCount: 100,
        sroiRatio: 5,
        visScore: 80,
        avgConfidence: 0.8,
        avgBelonging: 0.8,
        avgJobReadiness: 0.6,
        avgLanguageLevel: 0.7,
        avgWellBeing: 0.75,
        evidenceSnippets: [],
      }, 'en');

      expect(rendered).toContain('Challenge → Intervention → Results → Value → Stories → Future');
    });
  });
});
