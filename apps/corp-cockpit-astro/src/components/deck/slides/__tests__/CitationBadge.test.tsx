/**
 * CitationBadge Component Tests
 *
 * Test suite for citation count badge with validation.
 *
 * @module deck/slides/__tests__/CitationBadge.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CitationBadge } from '../CitationBadge';

describe('CitationBadge', () => {
  describe('Rendering', () => {
    it('should render with citation count', () => {
      render(<CitationBadge count={5} />);

      expect(screen.getByTestId('citation-badge')).toBeInTheDocument();
      expect(screen.getByTestId('citation-count')).toHaveTextContent('5');
    });

    it('should display singular "citation" for count of 1', () => {
      render(<CitationBadge count={1} />);

      expect(screen.getByText('citation')).toBeInTheDocument();
      expect(screen.queryByText('citations')).not.toBeInTheDocument();
    });

    it('should display plural "citations" for count > 1', () => {
      render(<CitationBadge count={3} />);

      expect(screen.getByText('citations')).toBeInTheDocument();
      expect(screen.queryByText(/^citation$/)).not.toBeInTheDocument();
    });

    it('should display plural "citations" for count of 0', () => {
      render(<CitationBadge count={0} />);

      expect(screen.getByText('citations')).toBeInTheDocument();
    });
  });

  describe('Validation States', () => {
    it('should show green background when count meets minimum', () => {
      render(<CitationBadge count={3} minRequired={2} />);

      const badge = screen.getByTestId('citation-badge');
      expect(badge).toHaveClass('bg-green-100');
      expect(badge).toHaveClass('text-green-800');
    });

    it('should show red background when count is below minimum', () => {
      render(<CitationBadge count={1} minRequired={3} />);

      const badge = screen.getByTestId('citation-badge');
      expect(badge).toHaveClass('bg-red-100');
      expect(badge).toHaveClass('text-red-800');
    });

    it('should show green background when count equals minimum', () => {
      render(<CitationBadge count={5} minRequired={5} />);

      const badge = screen.getByTestId('citation-badge');
      expect(badge).toHaveClass('bg-green-100');
    });

    it('should use default minRequired of 1', () => {
      const { rerender } = render(<CitationBadge count={0} />);

      let badge = screen.getByTestId('citation-badge');
      expect(badge).toHaveClass('bg-red-100');

      rerender(<CitationBadge count={1} />);
      badge = screen.getByTestId('citation-badge');
      expect(badge).toHaveClass('bg-green-100');
    });
  });

  describe('Warning Message', () => {
    it('should show minimum requirement warning when validation fails', () => {
      render(<CitationBadge count={2} minRequired={5} />);

      const warning = screen.getByTestId('citation-warning');
      expect(warning).toBeInTheDocument();
      expect(warning).toHaveTextContent('(min: 5)');
    });

    it('should not show warning when validation passes', () => {
      render(<CitationBadge count={5} minRequired={3} />);

      expect(screen.queryByTestId('citation-warning')).not.toBeInTheDocument();
    });

    it('should not show warning when minRequired is 0', () => {
      render(<CitationBadge count={0} minRequired={0} />);

      expect(screen.queryByTestId('citation-warning')).not.toBeInTheDocument();
    });
  });

  describe('Success Indicator', () => {
    it('should show success checkmark when validation passes', () => {
      render(<CitationBadge count={5} minRequired={3} />);

      expect(screen.getByTestId('citation-success-icon')).toBeInTheDocument();
    });

    it('should not show success checkmark when validation fails', () => {
      render(<CitationBadge count={2} minRequired={5} />);

      expect(screen.queryByTestId('citation-success-icon')).not.toBeInTheDocument();
    });

    it('should not show success checkmark when minRequired is 0', () => {
      render(<CitationBadge count={10} minRequired={0} />);

      expect(screen.queryByTestId('citation-success-icon')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="status"', () => {
      render(<CitationBadge count={3} minRequired={2} />);

      const badge = screen.getByTestId('citation-badge');
      expect(badge).toHaveAttribute('role', 'status');
    });

    it('should have descriptive aria-label when valid', () => {
      render(<CitationBadge count={5} minRequired={3} />);

      const badge = screen.getByTestId('citation-badge');
      expect(badge).toHaveAttribute('aria-label', '5 citations');
    });

    it('should have descriptive aria-label when invalid', () => {
      render(<CitationBadge count={2} minRequired={5} />);

      const badge = screen.getByTestId('citation-badge');
      expect(badge).toHaveAttribute('aria-label', '2 citations, minimum 5 required');
    });

    it('should have aria-label with singular form', () => {
      render(<CitationBadge count={1} minRequired={0} />);

      const badge = screen.getByTestId('citation-badge');
      expect(badge).toHaveAttribute('aria-label', '1 citation');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero count', () => {
      render(<CitationBadge count={0} minRequired={1} />);

      expect(screen.getByTestId('citation-count')).toHaveTextContent('0');
      expect(screen.getByTestId('citation-badge')).toHaveClass('bg-red-100');
    });

    it('should handle large counts', () => {
      render(<CitationBadge count={999} minRequired={1} />);

      expect(screen.getByTestId('citation-count')).toHaveTextContent('999');
      expect(screen.getByTestId('citation-badge')).toHaveClass('bg-green-100');
    });

    it('should handle negative minRequired gracefully', () => {
      render(<CitationBadge count={5} minRequired={-1} />);

      // Should be valid since 5 >= -1
      expect(screen.getByTestId('citation-badge')).toHaveClass('bg-green-100');
    });

    it('should handle very large minRequired', () => {
      render(<CitationBadge count={10} minRequired={1000} />);

      expect(screen.getByTestId('citation-warning')).toHaveTextContent('(min: 1000)');
      expect(screen.getByTestId('citation-badge')).toHaveClass('bg-red-100');
    });
  });

  describe('Dark Mode Classes', () => {
    it('should include dark mode classes for valid state', () => {
      render(<CitationBadge count={5} minRequired={2} />);

      const badge = screen.getByTestId('citation-badge');
      expect(badge.className).toContain('dark:bg-green-900');
      expect(badge.className).toContain('dark:text-green-200');
    });

    it('should include dark mode classes for invalid state', () => {
      render(<CitationBadge count={1} minRequired={5} />);

      const badge = screen.getByTestId('citation-badge');
      expect(badge.className).toContain('dark:bg-red-900');
      expect(badge.className).toContain('dark:text-red-200');
    });
  });
});
