/**
 * Deck Template Generators Tests
 *
 * Unit tests for all 4 deck templates:
 * - Quarterly Report
 * - Annual Report
 * - Investor Update
 * - Impact Deep Dive
 */

import { describe, it, expect } from 'vitest';
import {
  generateQuarterlyDeck,
  generateAnnualDeck,
  generateInvestorDeck,
  generateImpactDeck,
  getTemplateMetadata,
  getTemplateGenerator,
  type TemplateData,
} from './deckTemplates';

const mockTemplateData: TemplateData = {
  companyId: '550e8400-e29b-41d4-a716-446655440000',
  companyName: 'Test Company Inc.',
  period: {
    start: '2024-10-01',
    end: '2024-12-31',
  },
  locale: 'en',
  metrics: {
    sroi: 3.45,
    vis: 72.3,
    beneficiaries: 1250,
    volunteer_hours: 4800,
    social_value: 165000,
    engagement_rate: 0.82,
    outcome_improvement: 78,
  },
  key_achievements: [
    'Increased volunteer participation by 34%',
    'Expanded program reach to 3 new communities',
    'Improved outcome scores across all dimensions',
  ],
  evidenceIds: ['ev-001', 'ev-002', 'ev-003', 'ev-004', 'ev-005'],
  charts: [
    {
      type: 'bar',
      title: 'Outcome Improvements',
      labels: ['Belonging', 'Confidence', 'Skills', 'Connection'],
      datasets: [
        {
          label: 'Improvement %',
          data: [82, 78, 85, 76],
          backgroundColor: '#3b82f6',
        },
      ],
    },
  ],
};

describe('Deck Template Generators', () => {
  describe('generateQuarterlyDeck', () => {
    it('should generate a valid quarterly deck', () => {
      const deck = generateQuarterlyDeck(mockTemplateData);

      expect(deck).toBeDefined();
      expect(deck.id).toBeDefined();
      expect(deck.template).toBe('quarterly');
      expect(deck.title).toContain('Test Company Inc.');
      expect(deck.title).toContain('Quarterly Impact Report');
      expect(deck.companyId).toBe(mockTemplateData.companyId);
      expect(deck.period).toEqual(mockTemplateData.period);
      expect(deck.locale).toBe('en');
    });

    it('should have the correct number of slides', () => {
      const deck = generateQuarterlyDeck(mockTemplateData);

      // Quarterly deck: Title + Metrics + Achievements + 3 Charts (or fewer if fewer charts) + Evidence + Closing
      expect(deck.slides.length).toBeGreaterThanOrEqual(5);
      expect(deck.slides.length).toBeLessThanOrEqual(8);
    });

    it('should include title slide as first slide', () => {
      const deck = generateQuarterlyDeck(mockTemplateData);

      const firstSlide = deck.slides[0];
      expect(firstSlide).toBeDefined();
      expect(firstSlide.slideNumber).toBe(1);
      expect(firstSlide.template).toBe('title-only');
      expect(firstSlide.blocks[0].type).toBe('title');
    });

    it('should include metadata', () => {
      const deck = generateQuarterlyDeck(mockTemplateData);

      expect(deck.metadata).toBeDefined();
      expect(deck.metadata!.author).toBe('TEEI CSR Platform');
      expect(deck.metadata!.approvalStatus).toBe('draft');
      expect(deck.metadata!.version).toBe('2.0');
    });
  });

  describe('generateAnnualDeck', () => {
    it('should generate a valid annual deck', () => {
      const deck = generateAnnualDeck(mockTemplateData);

      expect(deck).toBeDefined();
      expect(deck.template).toBe('annual');
      expect(deck.title).toContain('Annual Impact Report');
    });

    it('should have more slides than quarterly', () => {
      const quarterlyDeck = generateQuarterlyDeck(mockTemplateData);
      const annualDeck = generateAnnualDeck(mockTemplateData);

      expect(annualDeck.slides.length).toBeGreaterThan(quarterlyDeck.slides.length);
    });

    it('should include executive summary slide', () => {
      const deck = generateAnnualDeck(mockTemplateData);

      const executiveSummarySlide = deck.slides.find(
        (slide) => slide.blocks[0]?.title === 'Executive Summary'
      );
      expect(executiveSummarySlide).toBeDefined();
    });
  });

  describe('generateInvestorDeck', () => {
    it('should generate a valid investor deck', () => {
      const deck = generateInvestorDeck(mockTemplateData);

      expect(deck).toBeDefined();
      expect(deck.template).toBe('investor');
      expect(deck.title).toContain('Investor Update');
      expect(deck.subtitle).toContain('ESG Impact Performance');
    });

    it('should include investment thesis slide', () => {
      const deck = generateInvestorDeck(mockTemplateData);

      const thesisSlide = deck.slides.find(
        (slide) => slide.blocks[0]?.title === 'Investment Thesis: ESG Impact'
      );
      expect(thesisSlide).toBeDefined();
    });

    it('should include ESG alignment slide', () => {
      const deck = generateInvestorDeck(mockTemplateData);

      const esgSlide = deck.slides.find(
        (slide) => slide.blocks[0]?.title === 'ESG Alignment'
      );
      expect(esgSlide).toBeDefined();
    });
  });

  describe('generateImpactDeck', () => {
    it('should generate a valid impact deep dive deck', () => {
      const deck = generateImpactDeck(mockTemplateData);

      expect(deck).toBeDefined();
      expect(deck.template).toBe('impact');
      expect(deck.title).toContain('Impact Deep Dive');
      expect(deck.subtitle).toContain('Methodology & Evidence');
    });

    it('should include methodology slide', () => {
      const deck = generateImpactDeck(mockTemplateData);

      const methodologySlide = deck.slides.find(
        (slide) => slide.blocks[0]?.title === 'Impact Methodology'
      );
      expect(methodologySlide).toBeDefined();
    });

    it('should include quality assurance slide', () => {
      const deck = generateImpactDeck(mockTemplateData);

      const qaSlide = deck.slides.find(
        (slide) => slide.blocks[0]?.title === 'Quality Assurance'
      );
      expect(qaSlide).toBeDefined();
    });

    it('should include limitations slide', () => {
      const deck = generateImpactDeck(mockTemplateData);

      const limitationsSlide = deck.slides.find(
        (slide) => slide.blocks[0]?.title === 'Limitations & Assumptions'
      );
      expect(limitationsSlide).toBeDefined();
    });
  });

  describe('getTemplateMetadata', () => {
    it('should return metadata for quarterly template', () => {
      const metadata = getTemplateMetadata('quarterly');

      expect(metadata.id).toBe('quarterly');
      expect(metadata.name).toBe('Quarterly Report');
      expect(metadata.estimatedSlides).toBe(8);
      expect(metadata.supportedLocales).toContain('en');
    });

    it('should return metadata for annual template', () => {
      const metadata = getTemplateMetadata('annual');

      expect(metadata.id).toBe('annual');
      expect(metadata.name).toBe('Annual Report');
      expect(metadata.estimatedSlides).toBe(14);
    });

    it('should return metadata for investor template', () => {
      const metadata = getTemplateMetadata('investor');

      expect(metadata.id).toBe('investor');
      expect(metadata.name).toBe('Investor Update');
      expect(metadata.estimatedSlides).toBe(10);
    });

    it('should return metadata for impact template', () => {
      const metadata = getTemplateMetadata('impact');

      expect(metadata.id).toBe('impact');
      expect(metadata.name).toBe('Impact Deep Dive');
      expect(metadata.estimatedSlides).toBe(14);
    });
  });

  describe('getTemplateGenerator', () => {
    it('should return generator function for each template', () => {
      const quarterlyGenerator = getTemplateGenerator('quarterly');
      const annualGenerator = getTemplateGenerator('annual');
      const investorGenerator = getTemplateGenerator('investor');
      const impactGenerator = getTemplateGenerator('impact');

      expect(quarterlyGenerator).toBe(generateQuarterlyDeck);
      expect(annualGenerator).toBe(generateAnnualDeck);
      expect(investorGenerator).toBe(generateInvestorDeck);
      expect(impactGenerator).toBe(generateImpactDeck);
    });

    it('should generate decks correctly via generator function', () => {
      const generator = getTemplateGenerator('quarterly');
      const deck = generator(mockTemplateData);

      expect(deck).toBeDefined();
      expect(deck.template).toBe('quarterly');
    });
  });

  describe('Slide Block Validation', () => {
    it('should include citations in narrative blocks', () => {
      const deck = generateAnnualDeck(mockTemplateData);

      const executiveSummary = deck.slides.find(
        (slide) => slide.blocks[0]?.title === 'Executive Summary'
      );

      expect(executiveSummary).toBeDefined();
      const block = executiveSummary!.blocks[0];
      expect(block.citations).toBeDefined();
      expect(block.citations!.length).toBeGreaterThan(0);
    });

    it('should include explainer panels in blocks', () => {
      const deck = generateQuarterlyDeck(mockTemplateData);

      const metricsSlide = deck.slides.find(
        (slide) => slide.blocks[0]?.title === 'Impact At-a-Glance'
      );

      expect(metricsSlide).toBeDefined();
      const block = metricsSlide!.blocks[0];
      expect(block.explainer).toBeDefined();
      expect(block.explainer!.title).toBe('Why this section?');
      expect(block.explainer!.content).toBeTruthy();
    });

    it('should include evidence IDs in slides', () => {
      const deck = generateQuarterlyDeck(mockTemplateData);

      const evidenceSummarySlide = deck.slides.find(
        (slide) => slide.blocks[0]?.title === 'Evidence & Validation'
      );

      expect(evidenceSummarySlide).toBeDefined();
      expect(evidenceSummarySlide!.evidenceIds).toBeDefined();
      expect(evidenceSummarySlide!.evidenceIds!.length).toBeGreaterThan(0);
    });
  });

  describe('Chart Integration', () => {
    it('should include chart blocks when charts provided', () => {
      const deck = generateQuarterlyDeck(mockTemplateData);

      const chartSlides = deck.slides.filter(
        (slide) => slide.blocks[0]?.type === 'chart'
      );

      expect(chartSlides.length).toBeGreaterThan(0);
    });

    it('should preserve chart configuration', () => {
      const deck = generateQuarterlyDeck(mockTemplateData);

      const chartSlide = deck.slides.find(
        (slide) => slide.blocks[0]?.type === 'chart'
      );

      expect(chartSlide).toBeDefined();
      const chartBlock = chartSlide!.blocks[0];
      expect(chartBlock.chartConfig).toBeDefined();
      expect(chartBlock.chartConfig!.type).toBe('bar');
      expect(chartBlock.chartConfig!.labels.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics Grid Integration', () => {
    it('should include metrics grid block', () => {
      const deck = generateQuarterlyDeck(mockTemplateData);

      const metricsSlide = deck.slides.find(
        (slide) => slide.blocks[0]?.type === 'metrics-grid'
      );

      expect(metricsSlide).toBeDefined();
      const block = metricsSlide!.blocks[0];
      expect(block.metricsConfig).toBeDefined();
      expect(block.metricsConfig!.metrics.length).toBeGreaterThan(0);
    });

    it('should format metric values correctly', () => {
      const deck = generateQuarterlyDeck(mockTemplateData);

      const metricsSlide = deck.slides.find(
        (slide) => slide.blocks[0]?.type === 'metrics-grid'
      );

      expect(metricsSlide).toBeDefined();
      const block = metricsSlide!.blocks[0];
      const sroiMetric = block.metricsConfig!.metrics.find((m) => m.label === 'Social ROI');

      expect(sroiMetric).toBeDefined();
      expect(sroiMetric!.value).toBe('3.45:1');
    });
  });
});
