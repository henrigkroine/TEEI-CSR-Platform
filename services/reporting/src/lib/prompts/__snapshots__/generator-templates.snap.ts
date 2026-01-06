/**
 * Snapshot Tests for Generator Templates
 *
 * Captures template output to detect unintended changes
 */

import { describe, it, expect } from 'vitest';
import { getTemplateManager } from '../index.js';

describe('Generator Template Snapshots', () => {
  const templateManager = getTemplateManager();

  const mockData = {
    companyName: 'ACME Integration Corp',
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
        id: 'evidence-snapshot-1',
        text: 'I feel much more confident in my job search abilities now',
        dimension: 'confidence',
        score: 0.88,
      },
      {
        id: 'evidence-snapshot-2',
        text: 'The program helped me build meaningful connections',
        dimension: 'belonging',
        score: 0.82,
      },
    ],
  };

  describe('Case Study Template Snapshots', () => {
    it('should match English case-study template snapshot', () => {
      const rendered = templateManager.render('case-study', mockData, 'en');
      expect(rendered).toMatchSnapshot();
    });

    it('should maintain consistent structure across renders', () => {
      const rendered1 = templateManager.render('case-study', mockData, 'en');
      const rendered2 = templateManager.render('case-study', mockData, 'en');
      expect(rendered1).toBe(rendered2);
    });

    it('should have expected section count', () => {
      const rendered = templateManager.render('case-study', mockData, 'en');
      // Count section headers (8 required sections)
      const sectionHeaders = rendered.match(/^\d\.\s+\*\*/gm) || [];
      expect(sectionHeaders.length).toBeGreaterThanOrEqual(8);
    });

    it('should include all evidence snippet IDs', () => {
      const rendered = templateManager.render('case-study', mockData, 'en');
      expect(rendered).toContain('[cite:evidence-snapshot-1]');
      expect(rendered).toContain('[cite:evidence-snapshot-2]');
    });
  });

  describe('Methods Whitepaper Template Snapshots', () => {
    const whitepaperData = {
      ...mockData,
      dataQuality: {
        snippetCount: 500,
        avgConfidence: 0.85,
        dimensionsCovered: 5,
        completeness: 0.95,
        citationDensity: 2.5,
        testPassRate: 0.94,
      },
    };

    it('should match English methods-whitepaper template snapshot', () => {
      const rendered = templateManager.render('methods-whitepaper', whitepaperData, 'en');
      expect(rendered).toMatchSnapshot();
    });

    it('should maintain consistent structure across renders', () => {
      const rendered1 = templateManager.render('methods-whitepaper', whitepaperData, 'en');
      const rendered2 = templateManager.render('methods-whitepaper', whitepaperData, 'en');
      expect(rendered1).toBe(rendered2);
    });

    it('should have expected section count', () => {
      const rendered = templateManager.render('methods-whitepaper', whitepaperData, 'en');
      // Count section headers (8 required sections)
      const sectionHeaders = rendered.match(/^\d\.\s+\*\*/gm) || [];
      expect(sectionHeaders.length).toBeGreaterThanOrEqual(8);
    });

    it('should include data quality metadata', () => {
      const rendered = templateManager.render('methods-whitepaper', whitepaperData, 'en');
      expect(rendered).toContain('500'); // snippetCount
      expect(rendered).toContain('0.95'); // completeness
    });
  });

  describe('Template Length Validation', () => {
    it('case-study template should be substantial', () => {
      const rendered = templateManager.render('case-study', mockData, 'en');
      // Template instructions should be at least 3000 characters
      expect(rendered.length).toBeGreaterThan(3000);
    });

    it('methods-whitepaper template should be substantial', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');
      // Template instructions should be at least 4000 characters
      expect(rendered.length).toBeGreaterThan(4000);
    });
  });

  describe('Citation Instruction Validation', () => {
    it('case-study should include citation requirements in every section', () => {
      const rendered = templateManager.render('case-study', mockData, 'en');
      const criticalMarkers = rendered.match(/CRITICAL:/g) || [];
      // Should have CRITICAL markers for each major section
      expect(criticalMarkers.length).toBeGreaterThanOrEqual(8);
    });

    it('methods-whitepaper should include citation requirements', () => {
      const rendered = templateManager.render('methods-whitepaper', mockData, 'en');
      const citationRefs = rendered.match(/\[cite:ID\]/g) || [];
      // Should reference citation format multiple times
      expect(citationRefs.length).toBeGreaterThanOrEqual(5);
    });
  });
});
