import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CitationTooltip from './CitationTooltip';
import type { Citation } from '../../types/reports';

describe('CitationTooltip', () => {
  const mockCitation: Citation = {
    id: 'cite-001',
    evidenceId: 'evidence-123456789',
    snippetText: 'This is a sample evidence snippet showing participant feedback.',
    source: 'Buddy feedback, 2024-Q1',
    confidence: 0.85
  };

  const mockOnViewDetails = vi.fn();

  it('should render children', () => {
    render(
      <CitationTooltip citation={mockCitation}>
        [1]
      </CitationTooltip>
    );
    expect(screen.getByText('[1]')).toBeInTheDocument();
  });

  it('should show tooltip on hover', async () => {
    render(
      <CitationTooltip citation={mockCitation}>
        [1]
      </CitationTooltip>
    );

    const trigger = screen.getByRole('button');
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText(/This is a sample evidence snippet/i)).toBeInTheDocument();
    });
  });

  it('should hide tooltip on mouse leave', async () => {
    render(
      <CitationTooltip citation={mockCitation}>
        [1]
      </CitationTooltip>
    );

    const trigger = screen.getByRole('button');
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    fireEvent.mouseLeave(trigger);

    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it('should display confidence score', async () => {
    render(
      <CitationTooltip citation={mockCitation}>
        [1]
      </CitationTooltip>
    );

    const trigger = screen.getByRole('button');
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });
  });

  it('should show medium confidence for scores 0.6-0.8', async () => {
    const mediumConfidenceCitation = { ...mockCitation, confidence: 0.7 };
    render(
      <CitationTooltip citation={mediumConfidenceCitation}>
        [1]
      </CitationTooltip>
    );

    const trigger = screen.getByRole('button');
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText('70%')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });
  });

  it('should show low confidence for scores below 0.6', async () => {
    const lowConfidenceCitation = { ...mockCitation, confidence: 0.5 };
    render(
      <CitationTooltip citation={lowConfidenceCitation}>
        [1]
      </CitationTooltip>
    );

    const trigger = screen.getByRole('button');
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });

  it('should call onViewDetails when clicked', () => {
    render(
      <CitationTooltip citation={mockCitation} onViewDetails={mockOnViewDetails}>
        [1]
      </CitationTooltip>
    );

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(mockOnViewDetails).toHaveBeenCalledWith(mockCitation);
  });

  it('should call onViewDetails when Enter key is pressed', () => {
    render(
      <CitationTooltip citation={mockCitation} onViewDetails={mockOnViewDetails}>
        [1]
      </CitationTooltip>
    );

    const trigger = screen.getByRole('button');
    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(mockOnViewDetails).toHaveBeenCalledWith(mockCitation);
  });

  it('should have proper accessibility attributes', () => {
    render(
      <CitationTooltip citation={mockCitation}>
        [1]
      </CitationTooltip>
    );

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-label', expect.stringContaining('Citation'));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('tabIndex', '0');
  });
});
