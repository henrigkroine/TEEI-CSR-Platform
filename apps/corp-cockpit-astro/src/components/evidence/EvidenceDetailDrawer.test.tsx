import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EvidenceDetailDrawer from './EvidenceDetailDrawer';
import type { EvidenceSnippet, OutcomeScore } from '@teei/shared-types';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

describe('EvidenceDetailDrawer', () => {
  const mockSnippet: EvidenceSnippet = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    snippetText: 'This is a detailed test snippet for the drawer component.',
    snippetHash: 'abc123def456',
    source: 'Buddy Program - Detailed Survey',
    sourceType: 'buddy_feedback',
    programType: 'buddy',
    cohort: '2024-Q1',
    submittedAt: '2024-01-15T14:30:00Z',
    participantId: '123e4567-e89b-12d3-a456-426614174000',
    metadata: {
      q2qModelVersion: 'q2q-v2.1',
      processedAt: '2024-01-15T14:35:00Z',
      redactionApplied: ['name', 'location', 'email'],
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

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <EvidenceDetailDrawer
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        isOpen={false}
        onClose={mockOnClose}
        lang="en"
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when snippet is null', () => {
    const { container } = render(
      <EvidenceDetailDrawer
        snippet={null}
        outcomeScores={[]}
        isOpen={true}
        onClose={mockOnClose}
        lang="en"
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('displays drawer header with title', () => {
    render(
      <EvidenceDetailDrawer
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="en"
      />
    );

    expect(screen.getByText('Evidence Details')).toBeInTheDocument();
    expect(screen.getByText('Buddy Program')).toBeInTheDocument();
  });

  it('displays full evidence text', () => {
    render(
      <EvidenceDetailDrawer
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="en"
      />
    );

    expect(screen.getByText(mockSnippet.snippetText)).toBeInTheDocument();
  });

  it('displays metadata section with all fields', () => {
    render(
      <EvidenceDetailDrawer
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="en"
      />
    );

    expect(screen.getByText('Metadata')).toBeInTheDocument();
    expect(screen.getByText('Program')).toBeInTheDocument();
    expect(screen.getByText('Source Type')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Cohort')).toBeInTheDocument();
    expect(screen.getByText('Date Collected')).toBeInTheDocument();
  });

  it('displays outcome scores section', () => {
    render(
      <EvidenceDetailDrawer
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="en"
      />
    );

    expect(screen.getByText('Outcome Scores')).toBeInTheDocument();
    expect(screen.getByText('Confidence')).toBeInTheDocument();
    expect(screen.getByText('Belonging')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
  });

  it('displays confidence levels with proper colors', () => {
    render(
      <EvidenceDetailDrawer
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="en"
      />
    );

    // High confidence (92%) should show "High"
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('displays provenance section with hash and model version', () => {
    render(
      <EvidenceDetailDrawer
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="en"
      />
    );

    expect(screen.getByText('Provenance Chain')).toBeInTheDocument();
    expect(screen.getByText('Evidence Hash')).toBeInTheDocument();
    expect(screen.getByText(mockSnippet.snippetHash)).toBeInTheDocument();
    expect(screen.getByText('Q2Q Model Version')).toBeInTheDocument();
    expect(screen.getByText('q2q-v2.1')).toBeInTheDocument();
  });

  it('displays redacted fields', () => {
    render(
      <EvidenceDetailDrawer
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="en"
      />
    );

    expect(screen.getByText('Redacted Fields')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('location')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
  });

  it('shows privacy notice', () => {
    render(
      <EvidenceDetailDrawer
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="en"
      />
    );

    expect(
      screen.getByText(/anonymized and all personally identifiable information/)
    ).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <EvidenceDetailDrawer
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="en"
      />
    );

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(
      <EvidenceDetailDrawer
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="en"
      />
    );

    const backdrop = screen.getByRole('dialog').previousSibling;
    fireEvent.click(backdrop as Element);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    render(
      <EvidenceDetailDrawer
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="en"
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('copies full text to clipboard when Copy button is clicked', async () => {
    render(
      <EvidenceDetailDrawer
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="en"
      />
    );

    const copyButton = screen.getByText('Copy Full Text for CSRD');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(screen.getByText('Copied to Clipboard!')).toBeInTheDocument();
    });
  });

  it('renders in Norwegian when lang is "no"', () => {
    render(
      <EvidenceDetailDrawer
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="no"
      />
    );

    expect(screen.getByText('Evidensdetaljer')).toBeInTheDocument();
    expect(screen.getByText('Metadata')).toBeInTheDocument();
    expect(screen.getByText('Resultatpoeng')).toBeInTheDocument();
  });

  it('renders in Ukrainian when lang is "uk"', () => {
    render(
      <EvidenceDetailDrawer
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="uk"
      />
    );

    expect(screen.getByText('Деталі доказів')).toBeInTheDocument();
    expect(screen.getByText('Метадані')).toBeInTheDocument();
    expect(screen.getByText('Оцінки результатів')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <EvidenceDetailDrawer
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="en"
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'evidence-drawer-title');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('displays participant ID when available', () => {
    render(
      <EvidenceDetailDrawer
        snippet={mockSnippet}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="en"
      />
    );

    expect(screen.getByText('Participant ID (Internal)')).toBeInTheDocument();
    expect(screen.getByText(mockSnippet.participantId!)).toBeInTheDocument();
  });

  it('handles snippet without metadata gracefully', () => {
    const snippetWithoutMetadata = {
      ...mockSnippet,
      metadata: undefined,
    };

    render(
      <EvidenceDetailDrawer
        snippet={snippetWithoutMetadata}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="en"
      />
    );

    expect(screen.getByText('Evidence Details')).toBeInTheDocument();
  });

  it('handles snippet without cohort gracefully', () => {
    const snippetWithoutCohort = {
      ...mockSnippet,
      cohort: undefined,
    };

    render(
      <EvidenceDetailDrawer
        snippet={snippetWithoutCohort}
        outcomeScores={mockOutcomeScores}
        isOpen={true}
        onClose={mockOnClose}
        lang="en"
      />
    );

    expect(screen.queryByText('Cohort')).not.toBeInTheDocument();
  });
});
