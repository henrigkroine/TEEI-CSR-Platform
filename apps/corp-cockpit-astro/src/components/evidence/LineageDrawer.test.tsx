import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LineageDrawer from './LineageDrawer';
import { getLineageData } from '@lib/mockLineageData';

// Mock the fetch API
global.fetch = vi.fn();

describe('LineageDrawer', () => {
  const defaultProps = {
    metricId: 'sroi',
    metricName: 'Social Return on Investment',
    isOpen: true,
    onClose: vi.fn(),
    companyId: 'test-company-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <LineageDrawer {...defaultProps} isOpen={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows loading state initially', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API not available'));

    render(<LineageDrawer {...defaultProps} />);

    expect(screen.getByText('Loading lineage...')).toBeInTheDocument();
  });

  it('displays metric header information', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API not available'));

    render(<LineageDrawer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Evidence Lineage')).toBeInTheDocument();
      expect(screen.getByText('Social Return on Investment')).toBeInTheDocument();
    });
  });

  it('displays aggregation logic section', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API not available'));

    render(<LineageDrawer {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText('How is this metric calculated?')
      ).toBeInTheDocument();
      expect(screen.getByText(/SROI = Total Social Value/)).toBeInTheDocument();
    });
  });

  it('displays evidence IDs section with counts', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API not available'));

    render(<LineageDrawer {...defaultProps} />);

    await waitFor(() => {
      const mockData = getLineageData('sroi');
      expect(
        screen.getByText(`Contributing Evidence (${mockData.totalEvidenceCount} items)`)
      ).toBeInTheDocument();
    });
  });

  it('displays sample snippets preview', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API not available'));

    render(<LineageDrawer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Sample Evidence Snippets')).toBeInTheDocument();
      // Check for at least one sample snippet
      expect(
        screen.getByText(/I feel more confident speaking in meetings/)
      ).toBeInTheDocument();
    });
  });

  it('displays lineage metadata section', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API not available'));

    render(<LineageDrawer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Lineage Metadata')).toBeInTheDocument();
      expect(screen.getByText('Q2Q Model Version:')).toBeInTheDocument();
      expect(screen.getByText('Last Updated:')).toBeInTheDocument();
      expect(screen.getByText('Data Freshness:')).toBeInTheDocument();
    });
  });

  it('shows different freshness indicators', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API not available'));

    render(<LineageDrawer {...defaultProps} />);

    await waitFor(() => {
      const freshnessIndicator = screen.getByText('current');
      expect(freshnessIndicator).toHaveClass(
        expect.stringContaining('bg-green')
      );
    });
  });

  it('calls onClose when close button is clicked', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API not available'));

    render(<LineageDrawer {...defaultProps} />);

    await waitFor(() => {
      const closeButton = screen.getByLabelText('Close lineage drawer');
      fireEvent.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onClose when Escape key is pressed', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API not available'));

    render(<LineageDrawer {...defaultProps} />);

    await waitFor(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('displays View all evidence button', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API not available'));

    render(<LineageDrawer {...defaultProps} />);

    await waitFor(() => {
      const mockData = getLineageData('sroi');
      expect(
        screen.getByText(`View all ${mockData.totalEvidenceCount} evidence items →`)
      ).toBeInTheDocument();
    });
  });

  it('handles error state gracefully', async () => {
    // Mock both API and dynamic import to fail
    (global.fetch as any).mockRejectedValueOnce(new Error('API not available'));
    vi.mock('@lib/mockLineageData', () => {
      throw new Error('Mock data not available');
    });

    render(<LineageDrawer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/error occurred/i)).toBeInTheDocument();
    });
  });

  it('uses API data when available', async () => {
    const apiData = {
      ...getLineageData('sroi'),
      metricValue: 4.5, // Different value to verify API data is used
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => apiData,
    });

    render(<LineageDrawer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('4.5')).toBeInTheDocument();
    });
  });

  it('falls back to mock data when API fails', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(<LineageDrawer {...defaultProps} />);

    await waitFor(() => {
      const mockData = getLineageData('sroi');
      expect(screen.getByText(mockData.metricValue.toString())).toBeInTheDocument();
    });
  });

  it('handles different metric IDs correctly', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API not available'));

    render(<LineageDrawer {...defaultProps} metricId="vis" metricName="VIS" />);

    await waitFor(() => {
      const mockData = getLineageData('vis');
      expect(screen.getByText(mockData.metricValue.toString())).toBeInTheDocument();
    });
  });

  it('renders evidence chain items with contribution weights', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API not available'));

    render(<LineageDrawer {...defaultProps} />);

    await waitFor(() => {
      // Check for contribution weight percentages
      const weights = screen.getAllByText(/%/);
      expect(weights.length).toBeGreaterThan(0);
    });
  });

  it('displays confidence scores for sample snippets', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API not available'));

    render(<LineageDrawer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Confidence:/)).toHaveLength(
        getLineageData('sroi').sampleSnippets.length
      );
    });
  });

  it('shows parameters in aggregation logic when available', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API not available'));

    render(<LineageDrawer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Parameters')).toBeInTheDocument();
      expect(screen.getByText('Total Investment')).toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API not available'));

    render(<LineageDrawer {...defaultProps} />);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'lineage-drawer-title');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });
});
