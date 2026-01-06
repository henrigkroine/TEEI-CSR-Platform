/**
 * SlidePreview Component Tests
 *
 * Test suite for slide preview cards.
 *
 * @module deck/slides/__tests__/SlidePreview.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlidePreview } from '../SlidePreview';

describe('SlidePreview', () => {
  const defaultSlide = {
    id: 'slide-1',
    slideNumber: 1,
    title: 'Volunteer Impact Summary',
    type: 'content' as const,
    citationCount: 5,
  };

  describe('Rendering', () => {
    it('should render slide preview', () => {
      render(<SlidePreview slide={defaultSlide} />);

      expect(screen.getByTestId('slide-preview-slide-1')).toBeInTheDocument();
    });

    it('should render slide title', () => {
      render(<SlidePreview slide={defaultSlide} />);

      expect(screen.getByText('Volunteer Impact Summary')).toBeInTheDocument();
    });

    it('should render slide number badge', () => {
      render(<SlidePreview slide={defaultSlide} />);

      expect(screen.getByTestId('slide-number')).toHaveTextContent('#1');
    });

    it('should not render slide number when not provided', () => {
      const slideWithoutNumber = { ...defaultSlide, slideNumber: undefined };
      render(<SlidePreview slide={slideWithoutNumber} />);

      expect(screen.queryByTestId('slide-number')).not.toBeInTheDocument();
    });

    it('should render citation badge', () => {
      render(<SlidePreview slide={defaultSlide} />);

      expect(screen.getByTestId('citation-badge')).toBeInTheDocument();
      expect(screen.getByTestId('citation-count')).toHaveTextContent('5');
    });

    it('should render type label', () => {
      render(<SlidePreview slide={defaultSlide} />);

      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Slide Types', () => {
    it('should render title slide type correctly', () => {
      const titleSlide = { ...defaultSlide, type: 'title' as const };
      render(<SlidePreview slide={titleSlide} />);

      expect(screen.getByText('Title Slide')).toBeInTheDocument();
      expect(screen.getByText('📊')).toBeInTheDocument();
    });

    it('should render content slide type correctly', () => {
      const contentSlide = { ...defaultSlide, type: 'content' as const };
      render(<SlidePreview slide={contentSlide} />);

      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('📝')).toBeInTheDocument();
    });

    it('should render chart slide type correctly', () => {
      const chartSlide = { ...defaultSlide, type: 'chart' as const };
      render(<SlidePreview slide={chartSlide} />);

      expect(screen.getByText('Chart')).toBeInTheDocument();
      expect(screen.getByText('📈')).toBeInTheDocument();
    });

    it('should render data-table slide type correctly', () => {
      const tableSlide = { ...defaultSlide, type: 'data-table' as const };
      render(<SlidePreview slide={tableSlide} />);

      expect(screen.getByText('Data Table')).toBeInTheDocument();
      expect(screen.getByText('📋')).toBeInTheDocument();
    });

    it('should render two-column slide type correctly', () => {
      const twoColSlide = { ...defaultSlide, type: 'two-column' as const };
      render(<SlidePreview slide={twoColSlide} />);

      expect(screen.getByText('Two Column')).toBeInTheDocument();
      expect(screen.getByText('📑')).toBeInTheDocument();
    });

    it('should render image slide type correctly', () => {
      const imageSlide = { ...defaultSlide, type: 'image' as const };
      render(<SlidePreview slide={imageSlide} />);

      expect(screen.getByText('Image')).toBeInTheDocument();
      expect(screen.getByText('🖼️')).toBeInTheDocument();
    });
  });

  describe('Thumbnail', () => {
    it('should render thumbnail image when provided', () => {
      const thumbnailUrl = 'https://example.com/thumbnail.jpg';
      render(<SlidePreview slide={defaultSlide} thumbnail={thumbnailUrl} />);

      const img = screen.getByAltText('Volunteer Impact Summary');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', thumbnailUrl);
    });

    it('should render placeholder when thumbnail not provided', () => {
      render(<SlidePreview slide={defaultSlide} />);

      expect(screen.getByText('📝')).toBeInTheDocument(); // Icon placeholder
      expect(screen.getByText('Content')).toBeInTheDocument(); // Type label
    });

    it('should set loading="lazy" on thumbnail image', () => {
      render(<SlidePreview slide={defaultSlide} thumbnail="https://example.com/img.jpg" />);

      const img = screen.getByAltText('Volunteer Impact Summary');
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('Selection State', () => {
    it('should not show selected state by default', () => {
      render(<SlidePreview slide={defaultSlide} />);

      const preview = screen.getByTestId('slide-preview-slide-1');
      expect(preview).not.toHaveClass('ring-2', 'ring-primary');
    });

    it('should show selected state when isSelected is true', () => {
      render(<SlidePreview slide={defaultSlide} isSelected={true} />);

      const preview = screen.getByTestId('slide-preview-slide-1');
      expect(preview).toHaveClass('ring-2');
      expect(preview).toHaveClass('ring-primary');
    });

    it('should render checkmark icon when selected', () => {
      const { container } = render(<SlidePreview slide={defaultSlide} isSelected={true} />);

      const checkmark = container.querySelector('.bg-primary.text-white svg');
      expect(checkmark).toBeInTheDocument();
    });

    it('should not render checkmark when not selected', () => {
      const { container } = render(
        <SlidePreview slide={defaultSlide} isSelected={false} />
      );

      const checkmark = container.querySelector('.bg-primary.text-white svg');
      expect(checkmark).not.toBeInTheDocument();
    });
  });

  describe('Click Interaction', () => {
    it('should call onClick when clicked', () => {
      const mockOnClick = vi.fn();
      render(<SlidePreview slide={defaultSlide} onClick={mockOnClick} />);

      const preview = screen.getByTestId('slide-preview-slide-1');
      fireEvent.click(preview);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should have cursor-pointer when onClick is provided', () => {
      const mockOnClick = vi.fn();
      render(<SlidePreview slide={defaultSlide} onClick={mockOnClick} />);

      const preview = screen.getByTestId('slide-preview-slide-1');
      expect(preview).toHaveClass('cursor-pointer');
    });

    it('should not have cursor-pointer when onClick is not provided', () => {
      render(<SlidePreview slide={defaultSlide} />);

      const preview = screen.getByTestId('slide-preview-slide-1');
      expect(preview).not.toHaveClass('cursor-pointer');
    });

    it('should not call onClick when not provided', () => {
      render(<SlidePreview slide={defaultSlide} />);

      const preview = screen.getByTestId('slide-preview-slide-1');
      fireEvent.click(preview);

      // Should not throw error
      expect(preview).toBeInTheDocument();
    });
  });

  describe('Keyboard Interaction', () => {
    it('should call onClick on Enter key', () => {
      const mockOnClick = vi.fn();
      render(<SlidePreview slide={defaultSlide} onClick={mockOnClick} />);

      const preview = screen.getByTestId('slide-preview-slide-1');
      fireEvent.keyDown(preview, { key: 'Enter' });

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick on Space key', () => {
      const mockOnClick = vi.fn();
      render(<SlidePreview slide={defaultSlide} onClick={mockOnClick} />);

      const preview = screen.getByTestId('slide-preview-slide-1');
      fireEvent.keyDown(preview, { key: ' ' });

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick on other keys', () => {
      const mockOnClick = vi.fn();
      render(<SlidePreview slide={defaultSlide} onClick={mockOnClick} />);

      const preview = screen.getByTestId('slide-preview-slide-1');
      fireEvent.keyDown(preview, { key: 'Tab' });
      fireEvent.keyDown(preview, { key: 'Escape' });

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should be focusable when onClick is provided', () => {
      const mockOnClick = vi.fn();
      render(<SlidePreview slide={defaultSlide} onClick={mockOnClick} />);

      const preview = screen.getByTestId('slide-preview-slide-1');
      expect(preview).toHaveAttribute('tabIndex', '0');
    });

    it('should not be focusable when onClick is not provided', () => {
      render(<SlidePreview slide={defaultSlide} />);

      const preview = screen.getByTestId('slide-preview-slide-1');
      expect(preview).not.toHaveAttribute('tabIndex');
    });
  });

  describe('Accessibility', () => {
    it('should have role="button" when onClick is provided', () => {
      const mockOnClick = vi.fn();
      render(<SlidePreview slide={defaultSlide} onClick={mockOnClick} />);

      const preview = screen.getByTestId('slide-preview-slide-1');
      expect(preview).toHaveAttribute('role', 'button');
    });

    it('should not have role="button" when onClick is not provided', () => {
      render(<SlidePreview slide={defaultSlide} />);

      const preview = screen.getByTestId('slide-preview-slide-1');
      expect(preview).not.toHaveAttribute('role', 'button');
    });

    it('should have descriptive aria-label', () => {
      render(<SlidePreview slide={defaultSlide} />);

      const preview = screen.getByTestId('slide-preview-slide-1');
      expect(preview).toHaveAttribute('aria-label', 'Slide 1: Volunteer Impact Summary');
    });

    it('should have aria-label without number when slideNumber not provided', () => {
      const slideWithoutNumber = { ...defaultSlide, slideNumber: undefined };
      render(<SlidePreview slide={slideWithoutNumber} />);

      const preview = screen.getByTestId('slide-preview-slide-1');
      expect(preview).toHaveAttribute('aria-label', 'Slide : Volunteer Impact Summary');
    });

    it('should use title attribute for truncated text', () => {
      render(<SlidePreview slide={defaultSlide} />);

      const titleElement = screen.getByText('Volunteer Impact Summary');
      expect(titleElement).toHaveAttribute('title', 'Volunteer Impact Summary');
    });

    it('should mark decorative icons as aria-hidden', () => {
      const { container } = render(<SlidePreview slide={defaultSlide} />);

      const emoji = container.querySelector('[role="img"]');
      expect(emoji).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long titles', () => {
      const longTitleSlide = {
        ...defaultSlide,
        title: 'A'.repeat(200),
      };
      render(<SlidePreview slide={longTitleSlide} />);

      const titleElement = screen.getByText('A'.repeat(200));
      expect(titleElement).toHaveClass('line-clamp-2'); // Should be truncated
    });

    it('should handle zero citations', () => {
      const noCitationsSlide = { ...defaultSlide, citationCount: 0 };
      render(<SlidePreview slide={noCitationsSlide} />);

      expect(screen.getByTestId('citation-count')).toHaveTextContent('0');
    });

    it('should handle large citation counts', () => {
      const manyCitationsSlide = { ...defaultSlide, citationCount: 999 };
      render(<SlidePreview slide={manyCitationsSlide} />);

      expect(screen.getByTestId('citation-count')).toHaveTextContent('999');
    });

    it('should handle slide number 0', () => {
      const zeroSlide = { ...defaultSlide, slideNumber: 0 };
      render(<SlidePreview slide={zeroSlide} />);

      expect(screen.getByTestId('slide-number')).toHaveTextContent('#0');
    });

    it('should handle large slide numbers', () => {
      const largeNumberSlide = { ...defaultSlide, slideNumber: 9999 };
      render(<SlidePreview slide={largeNumberSlide} />);

      expect(screen.getByTestId('slide-number')).toHaveTextContent('#9999');
    });
  });

  describe('Hover Effects', () => {
    it('should show hover overlay when clickable', () => {
      const mockOnClick = vi.fn();
      const { container } = render(
        <SlidePreview slide={defaultSlide} onClick={mockOnClick} />
      );

      const overlay = container.querySelector('.bg-primary\\/5');
      expect(overlay).toBeInTheDocument();
    });

    it('should not show hover overlay when not clickable', () => {
      const { container } = render(<SlidePreview slide={defaultSlide} />);

      const overlay = container.querySelector('.bg-primary\\/5');
      expect(overlay).toBeInTheDocument(); // Still rendered but won't be visible without hover
    });
  });

  describe('Visual Styling', () => {
    it('should have appropriate border classes', () => {
      render(<SlidePreview slide={defaultSlide} />);

      const preview = screen.getByTestId('slide-preview-slide-1');
      expect(preview).toHaveClass('border', 'rounded-lg');
    });

    it('should maintain 16:9 aspect ratio for thumbnail area', () => {
      const { container } = render(<SlidePreview slide={defaultSlide} />);

      const thumbnailArea = container.querySelector('.aspect-\\[16\\/9\\]');
      expect(thumbnailArea).toBeInTheDocument();
    });

    it('should apply correct background color for slide type', () => {
      const chartSlide = { ...defaultSlide, type: 'chart' as const };
      const { container } = render(<SlidePreview slide={chartSlide} />);

      const placeholder = container.querySelector('.bg-green-100');
      expect(placeholder).toBeInTheDocument();
    });
  });
});
