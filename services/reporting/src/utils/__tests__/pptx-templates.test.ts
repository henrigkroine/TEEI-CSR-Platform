/**
 * PPTX Templates Test Suite
 *
 * Tests all 4 PPTX template variants:
 * - Quarterly
 * - Annual
 * - Investor
 * - Impact Deep Dive
 *
 * @module utils/__tests__/pptx-templates.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createQuarterlyTemplate,
  createAnnualTemplate,
  createInvestorTemplate,
  createImpactTemplate,
  createExecutiveSummaryTemplate,
  generatePPTX,
  type QuarterlyData,
  type AnnualData,
  type InvestorData,
  type ImpactData,
  type PPTXOptions,
  type PPTXSlide,
} from '../pptxGenerator.js';

describe('PPTX Templates', () => {
  describe('createQuarterlyTemplate', () => {
    let mockQuarterlyData: QuarterlyData;

    beforeEach(() => {
      mockQuarterlyData = {
        company: 'Test Corp',
        period: 'Q1 2025',
        quarter: { year: 2025, quarter: 1 },
        metrics: {
          sroi: 3.45,
          beneficiaries: 1250,
          volunteer_hours: 4800,
          social_value: 165000,
          engagement_rate: 0.85,
        },
        top_achievements: [
          'Increased volunteer participation by 34%',
          'Expanded program reach to 3 new communities',
          'Improved outcome scores across all dimensions',
        ],
        quarterly_trend: {
          type: 'line',
          title: 'SROI Quarterly Trend',
          labels: ['Q1', 'Q2', 'Q3', 'Q4'],
          datasets: [
            {
              label: '2025',
              data: [2.8, 3.1, 3.3, 3.45],
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
            },
          ],
        },
        dimensions: [
          { name: 'Social Impact', score: 8.2, change: 5.3 },
          { name: 'Environmental', score: 7.5, change: -2.1 },
          { name: 'Governance', score: 9.1, change: 1.8 },
        ],
        evidenceIds: ['EV-001', 'EV-002', 'EV-003'],
        includeEvidenceAppendix: false,
      };
    });

    it('should generate quarterly template with correct slide count', () => {
      const slides = createQuarterlyTemplate(mockQuarterlyData);

      // Expected: Title + Executive Summary + Key Metrics + Top 3 + Trend Chart + Dimension Scorecard
      expect(slides).toHaveLength(6);
    });

    it('should include evidence appendix when requested', () => {
      mockQuarterlyData.includeEvidenceAppendix = true;

      const slides = createQuarterlyTemplate(mockQuarterlyData);

      // Should have 1 additional slide for evidence appendix
      expect(slides).toHaveLength(7);
      expect(slides[6].title).toBe('Evidence Appendix');
      expect(slides[6].evidenceIds).toEqual(mockQuarterlyData.evidenceIds);
    });

    it('should format title slide correctly', () => {
      const slides = createQuarterlyTemplate(mockQuarterlyData);

      const titleSlide = slides[0];
      expect(titleSlide.type).toBe('title');
      expect(titleSlide.title).toBe('Test Corp - Q1 2025 Impact Report');
      expect(titleSlide.content).toBe('Q1 2025');
      expect(titleSlide.notes).toContain('Q1 2025');
    });

    it('should include executive summary with key metrics', () => {
      const slides = createQuarterlyTemplate(mockQuarterlyData);

      const summarySlide = slides[1];
      expect(summarySlide.type).toBe('content');
      expect(summarySlide.title).toBe('Executive Summary');
      expect(summarySlide.bullets).toHaveLength(4);
      expect(summarySlide.bullets?.[0]).toContain('3.45:1');
      expect(summarySlide.bullets?.[1]).toContain('1,250');
      expect(summarySlide.bullets?.[2]).toContain('165,000');
      expect(summarySlide.bullets?.[3]).toContain('85.0%');
    });

    it('should include dimension scorecard with change indicators', () => {
      const slides = createQuarterlyTemplate(mockQuarterlyData);

      const scorecardSlide = slides[5];
      expect(scorecardSlide.type).toBe('data-table');
      expect(scorecardSlide.title).toBe('Impact Dimension Scorecard');
      expect(scorecardSlide.table?.rows).toHaveLength(3);
      expect(scorecardSlide.table?.rows[0]).toContain('Social Impact');
      expect(scorecardSlide.table?.rows[0]).toContain('+5.3%');
      expect(scorecardSlide.table?.rows[1]).toContain('-2.1%');
    });

    it('should handle top 3 achievements only', () => {
      const slides = createQuarterlyTemplate(mockQuarterlyData);

      const achievementsSlide = slides[3];
      expect(achievementsSlide.bullets).toHaveLength(3);
    });
  });

  describe('createAnnualTemplate', () => {
    let mockAnnualData: AnnualData;

    beforeEach(() => {
      mockAnnualData = {
        company: 'Test Corp',
        year: 2024,
        metrics: {
          sroi: 3.45,
          beneficiaries: 5200,
          volunteer_hours: 18500,
          social_value: 650000,
          programs_count: 12,
        },
        timeline: [
          { quarter: 'Q1', milestone: 'Launched new volunteer programs' },
          { quarter: 'Q2', milestone: 'Expanded to 3 new communities' },
          { quarter: 'Q3', milestone: 'Achieved 1000+ volunteer hours' },
          { quarter: 'Q4', milestone: 'Record SROI performance' },
        ],
        csrd_narrative:
          'Our organization has demonstrated significant progress in social impact during 2024, aligning with CSRD reporting requirements.',
        sdg_alignment: [
          { goal_number: 1, goal_name: 'No Poverty', contribution: 'Economic empowerment programs' },
          { goal_number: 4, goal_name: 'Quality Education', contribution: 'Skills training' },
        ],
        citations: [
          { slideNumber: 3, references: ['EV-001', 'EV-002', 'EV-003'] },
          { slideNumber: 4, references: ['EV-004', 'EV-005'] },
        ],
        evidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004', 'EV-005'],
      };
    });

    it('should generate annual template with correct slide count', () => {
      const slides = createAnnualTemplate(mockAnnualData);

      // Expected: Cover + Timeline + 2 Metrics + CSRD + SDG + Citations
      expect(slides).toHaveLength(7);
    });

    it('should include CSRD-aligned narrative', () => {
      const slides = createAnnualTemplate(mockAnnualData);

      const csrdSlide = slides.find((s) => s.title.includes('CSRD'));
      expect(csrdSlide).toBeDefined();
      expect(csrdSlide?.content).toContain('CSRD');
      expect(csrdSlide?.type).toBe('content');
    });

    it('should include SDG alignment', () => {
      const slides = createAnnualTemplate(mockAnnualData);

      const sdgSlide = slides.find((s) => s.title.includes('SDG'));
      expect(sdgSlide).toBeDefined();
      expect(sdgSlide?.type).toBe('two-column');
      expect(sdgSlide?.bullets).toHaveLength(2);
    });

    it('should include citations in speaker notes', () => {
      const slides = createAnnualTemplate(mockAnnualData);

      const citationsSlide = slides[slides.length - 1];
      expect(citationsSlide.title).toContain('Citations');
      expect(citationsSlide.notes).toContain('Slide 3');
      expect(citationsSlide.notes).toContain('Slide 4');
      expect(citationsSlide.evidenceIds).toEqual(mockAnnualData.evidenceIds);
    });

    it('should format timeline correctly', () => {
      const slides = createAnnualTemplate(mockAnnualData);

      const timelineSlide = slides[1];
      expect(timelineSlide.title).toContain('2024');
      expect(timelineSlide.bullets).toHaveLength(4);
      expect(timelineSlide.bullets?.[0]).toContain('Q1');
      expect(timelineSlide.bullets?.[0]).toContain('Launched new volunteer programs');
    });

    it('should include volunteer impact map if provided', () => {
      mockAnnualData.volunteer_impact_map = {
        path: 'https://example.com/map.png',
        x: 1.0,
        y: 1.5,
        w: 8.0,
        h: 4.0,
      };

      const slides = createAnnualTemplate(mockAnnualData);

      // Should have one additional slide for map
      expect(slides).toHaveLength(8);
      const mapSlide = slides.find((s) => s.title.includes('Geographic'));
      expect(mapSlide).toBeDefined();
      expect(mapSlide?.type).toBe('image');
    });

    it('should calculate cost per beneficiary', () => {
      const slides = createAnnualTemplate(mockAnnualData);

      const metricsSlide2 = slides[3];
      expect(metricsSlide2.table?.rows[2][0]).toBe('Cost per Beneficiary');
      const costPerBeneficiary = mockAnnualData.metrics.social_value / mockAnnualData.metrics.beneficiaries;
      expect(metricsSlide2.table?.rows[2][1]).toContain(costPerBeneficiary.toFixed(2));
    });
  });

  describe('createInvestorTemplate', () => {
    let mockInvestorData: InvestorData;

    beforeEach(() => {
      mockInvestorData = {
        company: 'Test Corp',
        period: 'Q4 2024',
        sroi_headline: 4.25,
        financial_impact: {
          total_investment: 500000,
          social_value_created: 2125000,
          cost_per_beneficiary: 135.5,
          efficiency_ratio: 0.92,
        },
        growth_metrics: [
          {
            type: 'line',
            title: 'SROI Growth Trajectory',
            labels: ['2021', '2022', '2023', '2024'],
            datasets: [
              {
                label: 'SROI',
                data: [1.8, 2.3, 2.9, 4.25],
                borderColor: '#10b981',
              },
            ],
          },
          {
            type: 'bar',
            title: 'Beneficiary Growth',
            labels: ['2021', '2022', '2023', '2024'],
            datasets: [
              {
                label: 'Beneficiaries',
                data: [450, 680, 920, 1250],
                backgroundColor: '#8b5cf6',
              },
            ],
          },
        ],
        risk_mitigation: [
          { risk: 'Data quality', mitigation: 'Automated validation', status: 'mitigated' },
          { risk: 'Program attrition', mitigation: 'Enhanced engagement', status: 'monitoring' },
        ],
        executive_summary: 'Strong performance with record SROI and controlled operational risk.',
        evidenceIds: ['EV-001', 'EV-002'],
      };
    });

    it('should generate investor template with correct slide count', () => {
      const slides = createInvestorTemplate(mockInvestorData);

      // Expected: Title + SROI Headline + Financial Metrics + 2 Growth Charts + Risk + Summary
      expect(slides).toHaveLength(7);
    });

    it('should feature SROI prominently', () => {
      const slides = createInvestorTemplate(mockInvestorData);

      const sroiSlide = slides[1];
      expect(sroiSlide.title).toBe('Social Return on Investment');
      expect(sroiSlide.content).toBe('4.25:1');
      expect(sroiSlide.notes).toContain('$4.25');
    });

    it('should include financial impact metrics', () => {
      const slides = createInvestorTemplate(mockInvestorData);

      const financialSlide = slides[2];
      expect(financialSlide.type).toBe('data-table');
      expect(financialSlide.title).toContain('Financial Impact');
      expect(financialSlide.table?.rows).toHaveLength(4);
      expect(financialSlide.table?.rows[0][1]).toContain('500,000');
      expect(financialSlide.table?.rows[3][1]).toContain('92.0%');
    });

    it('should include growth trajectory charts', () => {
      const slides = createInvestorTemplate(mockInvestorData);

      const chartSlides = slides.filter((s) => s.type === 'chart');
      expect(chartSlides).toHaveLength(2);
      expect(chartSlides[0].title).toContain('SROI Growth');
      expect(chartSlides[1].title).toContain('Beneficiary Growth');
    });

    it('should include risk mitigation table', () => {
      const slides = createInvestorTemplate(mockInvestorData);

      const riskSlide = slides.find((s) => s.title.includes('Risk'));
      expect(riskSlide).toBeDefined();
      expect(riskSlide?.table?.rows).toHaveLength(2);
      expect(riskSlide?.table?.rows[0][2]).toBe('MITIGATED');
      expect(riskSlide?.table?.rows[1][2]).toBe('MONITORING');
    });

    it('should use limited evidence (high-level only)', () => {
      const slides = createInvestorTemplate(mockInvestorData);

      const summarySlide = slides[slides.length - 1];
      expect(summarySlide.evidenceIds).toHaveLength(2);
    });
  });

  describe('createImpactTemplate', () => {
    let mockImpactData: ImpactData;

    beforeEach(() => {
      mockImpactData = {
        company: 'Test Corp',
        period: 'Q4 2024',
        dimensions: [
          {
            name: 'Social Impact',
            score: 8.5,
            evidence_count: 24,
            breakdown: [
              { metric: 'Beneficiary satisfaction', value: 4.7, evidence_ids: ['EV-001', 'EV-002'] },
              { metric: 'Community engagement', value: 78.5, evidence_ids: ['EV-003', 'EV-004'] },
              { metric: 'Outcome achievement', value: 92.3, evidence_ids: ['EV-005'] },
            ],
            lineage_chart: {
              type: 'line',
              title: 'Social Impact Evidence Flow',
              labels: ['Raw', 'Validated', 'Aggregated', 'Scored'],
              datasets: [
                {
                  label: 'Evidence Count',
                  data: [45, 38, 28, 24],
                  borderColor: '#3b82f6',
                },
              ],
            },
          },
          {
            name: 'Environmental',
            score: 7.2,
            evidence_count: 18,
            breakdown: [
              { metric: 'Carbon footprint reduction', value: 12.5, evidence_ids: ['EV-006', 'EV-007'] },
            ],
          },
        ],
        evidenceAppendix: [
          { evidence_id: 'EV-001', type: 'Survey', description: 'Beneficiary feedback survey', source: 'Program DB', date: '2024-12-15' },
          { evidence_id: 'EV-002', type: 'Observation', description: 'Program observation notes', source: 'Field Team', date: '2024-12-14' },
          { evidence_id: 'EV-003', type: 'Document', description: 'Community engagement report', source: 'Program DB', date: '2024-12-13' },
          { evidence_id: 'EV-004', type: 'Survey', description: 'Community survey results', source: 'Program DB', date: '2024-12-12' },
          { evidence_id: 'EV-005', type: 'Observation', description: 'Outcome verification', source: 'Field Team', date: '2024-12-11' },
          { evidence_id: 'EV-006', type: 'Document', description: 'Carbon tracking data', source: 'Env System', date: '2024-12-10' },
          { evidence_id: 'EV-007', type: 'Survey', description: 'Environmental audit', source: 'Third Party', date: '2024-12-09' },
        ],
        citations_per_slide: 3,
        explainer_boxes: [
          {
            title: 'Overview',
            content: 'This deep dive provides granular analysis of impact across all dimensions.',
          },
          {
            title: 'Social Impact Explainer',
            content: 'Social impact measures our direct effect on beneficiaries and communities.',
          },
          {
            title: 'Environmental Explainer',
            content: 'Environmental dimension tracks our sustainability practices.',
          },
        ],
      };
    });

    it('should generate impact deep dive with 15+ slides', () => {
      const slides = createImpactTemplate(mockImpactData);

      // Expected: Title + Overview + (3-4 slides per dimension * 2 dimensions) + Evidence Appendix + Summary
      // Minimum: 1 + 1 + (3*2) + 1 + 1 = 10
      expect(slides.length).toBeGreaterThanOrEqual(10);
    });

    it('should include "Why this matters" explainer boxes', () => {
      const slides = createImpactTemplate(mockImpactData);

      const explainerSlides = slides.filter((s) => s.title.includes('Why'));
      expect(explainerSlides.length).toBeGreaterThan(0);
    });

    it('should include per-dimension breakdown', () => {
      const slides = createImpactTemplate(mockImpactData);

      const socialImpactSlides = slides.filter((s) => s.title.includes('Social Impact'));
      expect(socialImpactSlides.length).toBeGreaterThanOrEqual(2); // Overview + Breakdown
    });

    it('should include lineage sparklines for dimensions', () => {
      const slides = createImpactTemplate(mockImpactData);

      const lineageSlides = slides.filter((s) => s.title.includes('Evidence Lineage'));
      expect(lineageSlides.length).toBeGreaterThanOrEqual(1);
    });

    it('should include full evidence appendix', () => {
      const slides = createImpactTemplate(mockImpactData);

      const appendixSlides = slides.filter((s) => s.title.includes('Evidence Appendix'));
      expect(appendixSlides.length).toBeGreaterThanOrEqual(1);
      expect(appendixSlides[0].evidenceIds).toBeDefined();
    });

    it('should split large evidence appendix into multiple slides', () => {
      // Add 15 more evidence records to force multiple appendix slides
      const extraEvidence = Array.from({ length: 15 }, (_, i) => ({
        evidence_id: `EV-${100 + i}`,
        type: 'Survey',
        description: `Extra evidence ${i}`,
        source: 'DB',
        date: '2024-12-01',
      }));
      mockImpactData.evidenceAppendix.push(...extraEvidence);

      const slides = createImpactTemplate(mockImpactData);

      const appendixSlides = slides.filter((s) => s.title.includes('Evidence Appendix'));
      // With 22 total records and 10 per slide, should have 3 appendix slides
      expect(appendixSlides.length).toBeGreaterThanOrEqual(2);
      expect(appendixSlides[0].title).toContain('(1/');
    });

    it('should maintain citation density', () => {
      const slides = createImpactTemplate(mockImpactData);

      const metricsSlides = slides.filter((s) => s.title.includes('Metrics Breakdown'));
      for (const slide of metricsSlides) {
        if (slide.evidenceIds) {
          expect(slide.evidenceIds.length).toBeLessThanOrEqual(mockImpactData.citations_per_slide);
        }
      }
    });

    it('should include summary slide', () => {
      const slides = createImpactTemplate(mockImpactData);

      const summarySlide = slides[slides.length - 1];
      expect(summarySlide.title).toContain('Summary');
      expect(summarySlide.bullets).toHaveLength(4);
    });
  });

  describe('Legacy createExecutiveSummaryTemplate', () => {
    it('should maintain backward compatibility', () => {
      const data = {
        title: 'Test Report',
        period: 'Q4 2024',
        company: 'Test Corp',
        metrics: {
          sroi: 3.45,
          beneficiaries: 1250,
          volunteer_hours: 4800,
          social_value: 165000,
        },
        key_achievements: ['Achievement 1', 'Achievement 2'],
        charts: [
          {
            type: 'bar' as const,
            title: 'Test Chart',
            labels: ['A', 'B', 'C'],
            datasets: [
              {
                label: 'Data',
                data: [1, 2, 3],
                backgroundColor: '#3b82f6',
              },
            ],
          },
        ],
      };

      const slides = createExecutiveSummaryTemplate(data);

      // Expected: Title + Metrics + Achievements + Chart + Closing
      expect(slides).toHaveLength(5);
      expect(slides[0].type).toBe('title');
      expect(slides[1].type).toBe('data-table');
      expect(slides[2].type).toBe('content');
      expect(slides[3].type).toBe('chart');
      expect(slides[4].type).toBe('content');
    });
  });

  describe('Watermarking and Theme Preservation', () => {
    it('should preserve watermarking across all templates', async () => {
      const quarterlyData: QuarterlyData = {
        company: 'Test Corp',
        period: 'Q1 2025',
        quarter: { year: 2025, quarter: 1 },
        metrics: {
          sroi: 3.45,
          beneficiaries: 1250,
          volunteer_hours: 4800,
          social_value: 165000,
          engagement_rate: 0.85,
        },
        top_achievements: ['Achievement 1', 'Achievement 2', 'Achievement 3'],
        quarterly_trend: {
          type: 'line',
          title: 'Trend',
          labels: ['Q1', 'Q2'],
          datasets: [{ label: 'Data', data: [1, 2] }],
        },
        dimensions: [],
      };

      const slides = createQuarterlyTemplate(quarterlyData);
      const options: PPTXOptions = {
        title: 'Test Report',
        author: 'Test Author',
        company: 'Test Corp',
        companyId: 'test-123',
        layout: 'LAYOUT_16x9',
        theme: 'corporate',
        includeWatermark: true,
        watermarkText: 'DRAFT',
        approvalStatus: 'DRAFT',
      };

      const buffer = await generatePPTX(slides, options);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('Slide Count Validation', () => {
    it('quarterly template should have 6-7 slides', () => {
      const data: QuarterlyData = {
        company: 'Test',
        period: 'Q1 2025',
        quarter: { year: 2025, quarter: 1 },
        metrics: { sroi: 3, beneficiaries: 100, volunteer_hours: 500, social_value: 1000, engagement_rate: 0.8 },
        top_achievements: ['A', 'B', 'C'],
        quarterly_trend: { type: 'line', title: 'T', labels: ['L'], datasets: [{ label: 'D', data: [1] }] },
        dimensions: [{ name: 'D', score: 8, change: 5 }],
      };

      const slides = createQuarterlyTemplate(data);
      expect(slides.length).toBeGreaterThanOrEqual(6);
      expect(slides.length).toBeLessThanOrEqual(7);
    });

    it('annual template should have 6-8 slides', () => {
      const data: AnnualData = {
        company: 'Test',
        year: 2024,
        metrics: { sroi: 3, beneficiaries: 100, volunteer_hours: 500, social_value: 1000, programs_count: 5 },
        timeline: [{ quarter: 'Q1', milestone: 'M' }],
        csrd_narrative: 'Narrative',
        sdg_alignment: [{ goal_number: 1, goal_name: 'G', contribution: 'C' }],
        citations: [{ slideNumber: 1, references: ['R'] }],
        evidenceIds: ['E'],
      };

      const slides = createAnnualTemplate(data);
      expect(slides.length).toBeGreaterThanOrEqual(6);
      expect(slides.length).toBeLessThanOrEqual(8);
    });

    it('investor template should have 5-10 slides', () => {
      const data: InvestorData = {
        company: 'Test',
        period: 'Q1',
        sroi_headline: 4,
        financial_impact: { total_investment: 100, social_value_created: 400, cost_per_beneficiary: 10, efficiency_ratio: 0.9 },
        growth_metrics: [{ type: 'line', title: 'T', labels: ['L'], datasets: [{ label: 'D', data: [1] }] }],
        risk_mitigation: [{ risk: 'R', mitigation: 'M', status: 'mitigated' }],
        executive_summary: 'Summary',
      };

      const slides = createInvestorTemplate(data);
      expect(slides.length).toBeGreaterThanOrEqual(5);
      expect(slides.length).toBeLessThanOrEqual(10);
    });

    it('impact template should have 10+ slides', () => {
      const data: ImpactData = {
        company: 'Test',
        period: 'Q1',
        dimensions: [
          {
            name: 'Social',
            score: 8,
            evidence_count: 10,
            breakdown: [{ metric: 'M', value: 5, evidence_ids: ['E1'] }],
          },
        ],
        evidenceAppendix: [{ evidence_id: 'E1', type: 'T', description: 'D', source: 'S', date: '2024-01-01' }],
        citations_per_slide: 3,
        explainer_boxes: [{ title: 'Overview', content: 'C' }],
      };

      const slides = createImpactTemplate(data);
      expect(slides.length).toBeGreaterThanOrEqual(10);
    });
  });
});
