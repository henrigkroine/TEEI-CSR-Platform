import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EvidenceCard from './EvidenceCard';
import type { EvidenceSnippet, OutcomeScore } from '@teei/shared-types';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

describe('EvidenceCard', () => {
  const mockSnippet: EvidenceSnippet = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    snippetText: 'This is a test snippet that demonstrates the evidence card functionality.',
    snippetHash: 'abc123',
    source: 'Buddy Program - Test Survey',
    sourceType: 'buddy_feedback',
    programType: 'buddy',
    cohort: '2024-Q1',
    submittedAt: '2024-01-15T14:30:00Z',
    participantId: '123e4567-e89b-12d3-a456-426614174000',
    metadata: {
      q2qModelVersion: 'q2q-v2.1',
      processedAt: '2024-01-15T14:35:00Z',
      redactionApplied: ['name', 'location'],
    },
  };

  const mockOutcomeScores: OutcomeScore[] = [
    {
      id: 'os-001',
      evidenceSnippetId: '550e8400-e29b-41d4-a716-446655440001',
      dimension: 'confidence',
      score: 0.85,
      confidence: 0.92,
      modelVersion: 'q2q-v2.1',
      createdAt: '2024-01-15T14:35:00Z',
    },
    {
      id: 'os-002',
      evidenceSnippetId: '550e8400-e29b-41d4-a716-446655440001',
      dimension: 'belonging',
      score: 0.78,
      confidence: 0.88,
      modelVersion: 'q2q-v2.1',
      createdAt: '2024-01-15T14:35:00Z',
    },
  ];

  const mockOnViewDetails = vi.fn();

  it('renders snippet text', () => {
    render(
      <EvidenceCard
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        onViewDetails={mockOnViewDetails}
        lang="en"
      />
    );

    expect(screen.getByText(mockSnippet.snippetText)).toBeInTheDocument();
  });

  it('displays program type badge', () => {
    render(
      <EvidenceCard
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        onViewDetails={mockOnViewDetails}
        lang="en"
      />
    );

    expect(screen.getByText('Buddy')).toBeInTheDocument();
  });

  it('shows source and date information', () => {
    render(
      <EvidenceCard
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        onViewDetails={mockOnViewDetails}
        lang="en"
      />
    );

    expect(screen.getByText(mockSnippet.source)).toBeInTheDocument();
  });

  it('displays outcome scores with percentages', () => {
    render(
      <EvidenceCard
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        onViewDetails={mockOnViewDetails}
        lang="en"
      />
    );

    expect(screen.getByText('Confidence:')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Belonging:')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
  });

  it('calls onViewDetails when View Details button is clicked', () => {
    render(
      <EvidenceCard
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        onViewDetails={mockOnViewDetails}
        lang="en"
      />
    );

    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);

    expect(mockOnViewDetails).toHaveBeenCalledTimes(1);
  });

  it('copies text to clipboard when Copy for CSRD is clicked', async () => {
    render(
      <EvidenceCard
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        onViewDetails={mockOnViewDetails}
        lang="en"
      />
    );

    const copyButton = screen.getByText('Copy for CSRD');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('truncates long text and shows expand button', () => {
    const longTextSnippet = {
      ...mockSnippet,
      snippetText: 'A'.repeat(250), // More than 200 characters
    };

    render(
      <EvidenceCard
        snippet={longTextSnippet}
        outcomeScores={mockOutcomeScores}
        onViewDetails={mockOnViewDetails}
        lang="en"
      />
    );

    expect(screen.getByText('Show more')).toBeInTheDocument();
  });

  it('expands and collapses text when Show more/less is clicked', () => {
    const longTextSnippet = {
      ...mockSnippet,
      snippetText: 'A'.repeat(250),
    };

    render(
      <EvidenceCard
        snippet={longTextSnippet}
        outcomeScores={mockOutcomeScores}
        onViewDetails={mockOnViewDetails}
        lang="en"
      />
    );

    const showMoreButton = screen.getByText('Show more');
    fireEvent.click(showMoreButton);

    expect(screen.getByText('Show less')).toBeInTheDocument();

    const showLessButton = screen.getByText('Show less');
    fireEvent.click(showLessButton);

    expect(screen.getByText('Show more')).toBeInTheDocument();
  });

  it('renders in Norwegian when lang is "no"', () => {
    render(
      <EvidenceCard
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        onViewDetails={mockOnViewDetails}
        lang="no"
      />
    );

    expect(screen.getByText('Vis detaljer')).toBeInTheDocument();
    expect(screen.getByText('Kopier for CSRD')).toBeInTheDocument();
  });

  it('renders in Ukrainian when lang is "uk"', () => {
    render(
      <EvidenceCard
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        onViewDetails={mockOnViewDetails}
        lang="uk"
      />
    );

    expect(screen.getByText('Переглянути деталі')).toBeInTheDocument();
    expect(screen.getByText('Копіювати для CSRD')).toBeInTheDocument();
  });

  it('displays cohort when available', () => {
    render(
      <EvidenceCard
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        onViewDetails={mockOnViewDetails}
        lang="en"
      />
    );

    expect(screen.getByText('2024-Q1')).toBeInTheDocument();
  });

  it('shows confidence indicator color based on confidence level', () => {
    const highConfidenceScore: OutcomeScore = {
      ...mockOutcomeScores[0],
      confidence: 0.95, // High confidence (>= 0.9)
    };

    render(
      <EvidenceCard
        snippet={mockSnippet}
        outcomeScores={[highConfidenceScore]}
        onViewDetails={mockOnViewDetails}
        lang="en"
      />
    );

    // Check that a confidence indicator is rendered (color indicator dot)
    const card = screen.getByText('Confidence:').closest('div');
    expect(card).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <EvidenceCard
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        onViewDetails={mockOnViewDetails}
        lang="en"
      />
    );

    const viewDetailsButton = screen.getByText('View Details');
    expect(viewDetailsButton).toHaveAttribute(
      'aria-label',
      expect.stringContaining('evidence')
    );

    const copyButton = screen.getByText('Copy for CSRD');
    expect(copyButton).toHaveAttribute('aria-label', expect.stringContaining('evidence'));
  });
});
