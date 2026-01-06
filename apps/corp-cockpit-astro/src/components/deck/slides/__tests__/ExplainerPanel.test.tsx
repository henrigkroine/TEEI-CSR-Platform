/**
 * ExplainerPanel Component Tests
 *
 * Test suite for contextual explanation panels.
 *
 * @module deck/slides/__tests__/ExplainerPanel.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExplainerPanel } from '../ExplainerPanel';

describe('ExplainerPanel', () => {
  const defaultProps = {
    title: 'Why this section?',
    explanation: 'This section demonstrates our commitment to sustainable development goals.',
    evidenceCount: 5,
  };

  describe('Rendering', () => {
    it('should render with title', () => {
      render(<ExplainerPanel {...defaultProps} />);

      expect(screen.getByTestId('explainer-panel')).toBeInTheDocument();
      expect(screen.getByTestId('explainer-title')).toHaveTextContent(
        'Why this section?'
      );
    });

    it('should render with explanation text', () => {
      render(<ExplainerPanel {...defaultProps} />);

      expect(screen.getByTestId('explainer-text')).toHaveTextContent(
        'This section demonstrates our commitment to sustainable development goals.'
      );
    });

    it('should render with evidence count', () => {
      render(<ExplainerPanel {...defaultProps} />);

      const evidenceCount = screen.getByTestId('evidence-count');
      expect(evidenceCount).toHaveTextContent('Based on');
      expect(evidenceCount).toHaveTextContent('5');
      expect(evidenceCount).toHaveTextContent('pieces of evidence');
    });

    it('should render with custom title', () => {
      render(<ExplainerPanel {...defaultProps} title="Important Context" />);

      expect(screen.getByTestId('explainer-title')).toHaveTextContent('Important Context');
    });
  });

  describe('Evidence Count Display', () => {
    it('should display singular "piece" for count of 1', () => {
      render(<ExplainerPanel {...defaultProps} evidenceCount={1} />);

      const evidenceCount = screen.getByTestId('evidence-count');
      expect(evidenceCount).toHaveTextContent('1');
      expect(evidenceCount).toHaveTextContent('piece of evidence');
      expect(evidenceCount).not.toHaveTextContent('pieces');
    });

    it('should display plural "pieces" for count > 1', () => {
      render(<ExplainerPanel {...defaultProps} evidenceCount={10} />);

      const evidenceCount = screen.getByTestId('evidence-count');
      expect(evidenceCount).toHaveTextContent('10');
      expect(evidenceCount).toHaveTextContent('pieces of evidence');
    });

    it('should display plural "pieces" for count of 0', () => {
      render(<ExplainerPanel {...defaultProps} evidenceCount={0} />);

      const evidenceCount = screen.getByTestId('evidence-count');
      expect(evidenceCount).toHaveTextContent('0');
      expect(evidenceCount).toHaveTextContent('pieces of evidence');
    });

    it('should bold the evidence count number', () => {
      render(<ExplainerPanel {...defaultProps} evidenceCount={42} />);

      const evidenceCount = screen.getByTestId('evidence-count');
      const boldElement = evidenceCount.querySelector('.font-bold');
      expect(boldElement).toHaveTextContent('42');
    });
  });

  describe('Variant Styles', () => {
    it('should render with default variant', () => {
      render(<ExplainerPanel {...defaultProps} />);

      const panel = screen.getByTestId('explainer-panel');
      expect(panel).toHaveClass('p-4');
    });

    it('should render with compact variant', () => {
      render(<ExplainerPanel {...defaultProps} variant="compact" />);

      const panel = screen.getByTestId('explainer-panel');
      expect(panel).toHaveClass('p-3');
    });

    it('should adjust icon size for compact variant', () => {
      const { container: defaultContainer } = render(
        <ExplainerPanel {...defaultProps} variant="default" />
      );
      const { container: compactContainer } = render(
        <ExplainerPanel {...defaultProps} variant="compact" />
      );

      const defaultIcon = defaultContainer.querySelector('svg');
      const compactIcon = compactContainer.querySelector('svg');

      expect(defaultIcon).toHaveClass('w-6', 'h-6');
      expect(compactIcon).toHaveClass('w-5', 'h-5');
    });

    it('should adjust title size for compact variant', () => {
      render(<ExplainerPanel {...defaultProps} variant="compact" />);

      const title = screen.getByTestId('explainer-title');
      expect(title).toHaveClass('text-base');
    });

    it('should adjust text size for compact variant', () => {
      render(<ExplainerPanel {...defaultProps} variant="compact" />);

      const text = screen.getByTestId('explainer-text');
      expect(text).toHaveClass('text-sm');
    });
  });

  describe('Accessibility', () => {
    it('should have role="complementary"', () => {
      render(<ExplainerPanel {...defaultProps} />);

      const panel = screen.getByTestId('explainer-panel');
      expect(panel).toHaveAttribute('role', 'complementary');
    });

    it('should have descriptive aria-label', () => {
      render(<ExplainerPanel {...defaultProps} />);

      const panel = screen.getByTestId('explainer-panel');
      expect(panel).toHaveAttribute('aria-label', 'Section explanation');
    });

    it('should use semantic heading for title', () => {
      render(<ExplainerPanel {...defaultProps} />);

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
        'Why this section?'
      );
    });

    it('should mark icons as aria-hidden', () => {
      const { container } = render(<ExplainerPanel {...defaultProps} />);

      const icons = container.querySelectorAll('svg');
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Visual Styling', () => {
    it('should have blue border and background', () => {
      render(<ExplainerPanel {...defaultProps} />);

      const panel = screen.getByTestId('explainer-panel');
      expect(panel).toHaveClass('border-l-4');
      expect(panel).toHaveClass('border-blue-500');
      expect(panel).toHaveClass('bg-blue-50');
    });

    it('should have dark mode classes', () => {
      render(<ExplainerPanel {...defaultProps} />);

      const panel = screen.getByTestId('explainer-panel');
      expect(panel.className).toContain('dark:border-blue-400');
      expect(panel.className).toContain('dark:bg-blue-950/30');
    });

    it('should have rounded corners', () => {
      render(<ExplainerPanel {...defaultProps} />);

      const panel = screen.getByTestId('explainer-panel');
      expect(panel).toHaveClass('rounded-r-lg');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty title', () => {
      render(<ExplainerPanel {...defaultProps} title="" />);

      const title = screen.getByTestId('explainer-title');
      expect(title).toBeEmptyDOMElement();
    });

    it('should handle empty explanation', () => {
      render(<ExplainerPanel {...defaultProps} explanation="" />);

      const text = screen.getByTestId('explainer-text');
      expect(text).toBeEmptyDOMElement();
    });

    it('should handle very long explanation text', () => {
      const longExplanation = 'A'.repeat(500);
      render(<ExplainerPanel {...defaultProps} explanation={longExplanation} />);

      expect(screen.getByTestId('explainer-text')).toHaveTextContent(longExplanation);
    });

    it('should handle large evidence counts', () => {
      render(<ExplainerPanel {...defaultProps} evidenceCount={9999} />);

      const evidenceCount = screen.getByTestId('evidence-count');
      expect(evidenceCount).toHaveTextContent('9999');
    });

    it('should handle negative evidence count gracefully', () => {
      render(<ExplainerPanel {...defaultProps} evidenceCount={-5} />);

      const evidenceCount = screen.getByTestId('evidence-count');
      expect(evidenceCount).toHaveTextContent('-5');
      // Should still show plural form for negative numbers
      expect(evidenceCount).toHaveTextContent('pieces of evidence');
    });
  });

  describe('Icon Rendering', () => {
    it('should render play icon for title', () => {
      const { container } = render(<ExplainerPanel {...defaultProps} />);

      const titleIcon = container.querySelector('.text-blue-600.dark\\:text-blue-400');
      expect(titleIcon).toBeInTheDocument();
    });

    it('should render list icon for evidence count', () => {
      const { container } = render(<ExplainerPanel {...defaultProps} />);

      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBe(2); // Title icon + evidence count icon
    });
  });
});
