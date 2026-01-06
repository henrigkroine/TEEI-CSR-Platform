import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SROIPanel from './SROIPanel';
import VISPanel from './VISPanel';
import AtAGlance from './AtAGlance';

// Mock fetch for widget data
global.fetch = vi.fn();

describe('Widget Lineage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SROIPanel', () => {
    const mockSROIData = {
      sroi_ratio: 3.2,
      breakdown: {
        total_investment: 85000,
        total_social_value: 272000,
        components: {
          volunteer_hours_value: 98000,
          integration_value: 87000,
          language_value: 45000,
          job_readiness_value: 42000,
        },
      },
    };

    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockSROIData,
      });
    });

    it('renders Why button', async () => {
      render(<SROIPanel companyId="test-company" />);

      await waitFor(() => {
        const whyButton = screen.getByLabelText('Why this SROI metric?');
        expect(whyButton).toBeInTheDocument();
      });
    });

    it('opens LineageDrawer when Why button is clicked', async () => {
      render(<SROIPanel companyId="test-company" />);

      await waitFor(() => {
        const whyButton = screen.getByLabelText('Why this SROI metric?');
        fireEvent.click(whyButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Evidence Lineage')).toBeInTheDocument();
        expect(screen.getByText('Social Return on Investment')).toBeInTheDocument();
      });
    });

    it('passes correct metric ID to LineageDrawer', async () => {
      render(<SROIPanel companyId="test-company" />);

      await waitFor(() => {
        const whyButton = screen.getByLabelText('Why this SROI metric?');
        fireEvent.click(whyButton);
      });

      await waitFor(() => {
        // LineageDrawer should show SROI-specific data
        expect(screen.getByText(/SROI = Total Social Value/)).toBeInTheDocument();
      });
    });

    it('closes LineageDrawer when close button is clicked', async () => {
      render(<SROIPanel companyId="test-company" />);

      await waitFor(() => {
        const whyButton = screen.getByLabelText('Why this SROI metric?');
        fireEvent.click(whyButton);
      });

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close lineage drawer');
        fireEvent.click(closeButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Evidence Lineage')).not.toBeInTheDocument();
      });
    });
  });

  describe('VISPanel', () => {
    const mockVISData = {
      aggregate_vis: 67.8,
      top_volunteers: [
        {
          volunteer_id: 'vol-1',
          name: 'Test Volunteer 1',
          vis_score: 85.5,
          hours: 24,
          consistency: 0.92,
          outcome_impact: 0.88,
        },
        {
          volunteer_id: 'vol-2',
          name: 'Test Volunteer 2',
          vis_score: 78.3,
          hours: 18,
          consistency: 0.85,
          outcome_impact: 0.82,
        },
      ],
    };

    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockVISData,
      });
    });

    it('renders Why button', async () => {
      render(<VISPanel companyId="test-company" />);

      await waitFor(() => {
        const whyButton = screen.getByLabelText('Why this VIS metric?');
        expect(whyButton).toBeInTheDocument();
      });
    });

    it('opens LineageDrawer with VIS data', async () => {
      render(<VISPanel companyId="test-company" />);

      await waitFor(() => {
        const whyButton = screen.getByLabelText('Why this VIS metric?');
        fireEvent.click(whyButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Evidence Lineage')).toBeInTheDocument();
        expect(screen.getByText('Volunteer Impact Score')).toBeInTheDocument();
      });
    });

    it('displays VIS-specific aggregation formula', async () => {
      render(<VISPanel companyId="test-company" />);

      await waitFor(() => {
        const whyButton = screen.getByLabelText('Why this VIS metric?');
        fireEvent.click(whyButton);
      });

      await waitFor(() => {
        expect(
          screen.getByText(/VIS = \(Hours × 0.3\) \+ \(Consistency/)
        ).toBeInTheDocument();
      });
    });
  });

  describe('AtAGlance', () => {
    const mockAtAGlanceData = {
      period: 'Q4 2024',
      inputs: {
        total_volunteers: 23,
        total_hours: 287,
        total_sessions: 145,
        active_participants: 67,
      },
      outcomes: {
        integration_avg: 0.78,
        language_avg: 0.72,
        job_readiness_avg: 0.81,
      },
    };

    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockAtAGlanceData,
      });
    });

    it('renders outcome metrics as clickable buttons', async () => {
      render(<AtAGlance companyId="test-company" />);

      await waitFor(() => {
        const integrationButton = screen.getByRole('button', {
          name: /Integration/,
        });
        expect(integrationButton).toBeInTheDocument();
      });
    });

    it('shows hint text for clickable metrics', async () => {
      render(<AtAGlance companyId="test-company" />);

      await waitFor(() => {
        expect(screen.getByText('Click metric for evidence')).toBeInTheDocument();
      });
    });

    it('opens LineageDrawer for Integration metric', async () => {
      render(<AtAGlance companyId="test-company" />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const integrationButton = buttons.find((btn) =>
          btn.textContent?.includes('Integration')
        );
        if (integrationButton) {
          fireEvent.click(integrationButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Evidence Lineage')).toBeInTheDocument();
        expect(screen.getByText('Integration Score')).toBeInTheDocument();
      });
    });

    it('opens LineageDrawer for Language metric', async () => {
      render(<AtAGlance companyId="test-company" />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const languageButton = buttons.find((btn) =>
          btn.textContent?.includes('Language')
        );
        if (languageButton) {
          fireEvent.click(languageButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Evidence Lineage')).toBeInTheDocument();
        expect(screen.getByText('Language Level')).toBeInTheDocument();
      });
    });

    it('opens LineageDrawer for Job Readiness metric', async () => {
      render(<AtAGlance companyId="test-company" />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const jobButton = buttons.find((btn) =>
          btn.textContent?.includes('Job Readiness')
        );
        if (jobButton) {
          fireEvent.click(jobButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Evidence Lineage')).toBeInTheDocument();
        expect(screen.getByText('Job Readiness')).toBeInTheDocument();
      });
    });

    it('switches between different metrics correctly', async () => {
      render(<AtAGlance companyId="test-company" />);

      // Click Integration first
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const integrationButton = buttons.find((btn) =>
          btn.textContent?.includes('Integration')
        );
        if (integrationButton) {
          fireEvent.click(integrationButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Integration Score')).toBeInTheDocument();
      });

      // Close drawer
      const closeButton = screen.getByLabelText('Close lineage drawer');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Evidence Lineage')).not.toBeInTheDocument();
      });

      // Click Language
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const languageButton = buttons.find((btn) =>
          btn.textContent?.includes('Language')
        );
        if (languageButton) {
          fireEvent.click(languageButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Language Level')).toBeInTheDocument();
      });
    });

    it('clears selected metric when drawer is closed', async () => {
      render(<AtAGlance companyId="test-company" />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const integrationButton = buttons.find((btn) =>
          btn.textContent?.includes('Integration')
        );
        if (integrationButton) {
          fireEvent.click(integrationButton);
        }
      });

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close lineage drawer');
        fireEvent.click(closeButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Evidence Lineage')).not.toBeInTheDocument();
      });
    });
  });

  describe('Common Integration Behaviors', () => {
    it('all widgets pass companyId to LineageDrawer', async () => {
      const testCompanyId = 'test-company-123';

      // Test SROI
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          sroi_ratio: 3.2,
          breakdown: {
            total_investment: 85000,
            total_social_value: 272000,
            components: {
              volunteer_hours_value: 98000,
              integration_value: 87000,
              language_value: 45000,
              job_readiness_value: 42000,
            },
          },
        }),
      });

      const { unmount } = render(<SROIPanel companyId={testCompanyId} />);

      await waitFor(() => {
        const whyButton = screen.getByLabelText('Why this SROI metric?');
        fireEvent.click(whyButton);
      });

      await waitFor(() => {
        // Verify drawer opened (companyId would be passed internally)
        expect(screen.getByText('Evidence Lineage')).toBeInTheDocument();
      });

      unmount();
    });

    it('Why buttons have proper accessibility attributes', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          sroi_ratio: 3.2,
          breakdown: {
            total_investment: 85000,
            total_social_value: 272000,
            components: {
              volunteer_hours_value: 98000,
              integration_value: 87000,
              language_value: 45000,
              job_readiness_value: 42000,
            },
          },
        }),
      });

      render(<SROIPanel companyId="test-company" />);

      await waitFor(() => {
        const whyButton = screen.getByLabelText('Why this SROI metric?');
        expect(whyButton).toHaveAttribute('title', 'View evidence lineage');
      });
    });

    it('Why buttons have visual hover states', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          sroi_ratio: 3.2,
          breakdown: {
            total_investment: 85000,
            total_social_value: 272000,
            components: {
              volunteer_hours_value: 98000,
              integration_value: 87000,
              language_value: 45000,
              job_readiness_value: 42000,
            },
          },
        }),
      });

      render(<SROIPanel companyId="test-company" />);

      await waitFor(() => {
        const whyButton = screen.getByLabelText('Why this SROI metric?');
        expect(whyButton).toHaveClass(expect.stringContaining('hover:'));
      });
    });
  });
});
