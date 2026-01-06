/**
 * DeckComposer Component Tests
 *
 * Test suite for deck composition workflow.
 *
 * @module deck/__tests__/DeckComposer.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeckComposer } from '../DeckComposer';
import type { DeckConfig } from '../types';

describe('DeckComposer', () => {
  const mockOnExport = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    companyId: 'test-company-123',
    periodStart: new Date('2025-01-01'),
    periodEnd: new Date('2025-03-31'),
    onExport: mockOnExport,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default template step', () => {
      render(<DeckComposer {...defaultProps} />);

      expect(screen.getByText('Create Boardroom Deck')).toBeInTheDocument();
      expect(screen.getByText('Select Template')).toBeInTheDocument();
      expect(screen.getByText('Quarterly Report')).toBeInTheDocument();
    });

    it('should display period dates in header', () => {
      render(<DeckComposer {...defaultProps} />);

      expect(screen.getByText(/1\/1\/2025.*3\/31\/2025/)).toBeInTheDocument();
    });

    it('should render step indicator with 3 steps', () => {
      render(<DeckComposer {...defaultProps} />);

      expect(screen.getByText('Template')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('should render close button when onClose provided', () => {
      render(<DeckComposer {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close deck composer');
      expect(closeButton).toBeInTheDocument();
    });

    it('should not render close button when onClose not provided', () => {
      render(<DeckComposer {...defaultProps} onClose={undefined} />);

      const closeButton = screen.queryByLabelText('Close deck composer');
      expect(closeButton).not.toBeInTheDocument();
    });
  });

  describe('Template Selection', () => {
    it('should allow selecting a template', () => {
      render(<DeckComposer {...defaultProps} />);

      const annualTemplate = screen.getByRole('radio', { name: /Annual Report/i });
      fireEvent.click(annualTemplate);

      expect(annualTemplate).toHaveAttribute('aria-checked', 'true');
    });

    it('should initialize default tiles when template is selected', () => {
      render(<DeckComposer {...defaultProps} />);

      // Select annual template (has 7 default tiles)
      const annualTemplate = screen.getByRole('radio', { name: /Annual Report/i });
      fireEvent.click(annualTemplate);

      // Move to tiles step
      const continueButton = screen.getByText('Continue →');
      fireEvent.click(continueButton);

      // Should see selected tiles count
      expect(screen.getByText(/7 \/ 8 selected/)).toBeInTheDocument();
    });

    it('should show all 4 templates', () => {
      render(<DeckComposer {...defaultProps} />);

      expect(screen.getByText('Quarterly Report')).toBeInTheDocument();
      expect(screen.getByText('Annual Report')).toBeInTheDocument();
      expect(screen.getByText('Investor Update')).toBeInTheDocument();
      expect(screen.getByText('Impact Deep Dive')).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    it('should navigate from template to tiles step', () => {
      render(<DeckComposer {...defaultProps} />);

      const continueButton = screen.getByText('Continue →');
      fireEvent.click(continueButton);

      expect(screen.getByText('Select Tiles')).toBeInTheDocument();
    });

    it('should navigate from tiles to preview step', async () => {
      render(<DeckComposer {...defaultProps} />);

      // Step 1: Continue from template
      fireEvent.click(screen.getByText('Continue →'));

      // Step 2: Continue from tiles (should have default tiles)
      await waitFor(() => {
        const continueButton = screen.getByText('Continue →');
        expect(continueButton).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText('Continue →'));

      // Should be on preview step
      expect(screen.getByText('Deck Preview')).toBeInTheDocument();
    });

    it('should navigate back from tiles to template', () => {
      render(<DeckComposer {...defaultProps} />);

      // Go to tiles step
      fireEvent.click(screen.getByText('Continue →'));

      // Go back
      const backButton = screen.getByText('← Back');
      fireEvent.click(backButton);

      // Should be back on template step
      expect(screen.getByText('Select Template')).toBeInTheDocument();
    });

    it('should navigate back from preview to tiles', async () => {
      render(<DeckComposer {...defaultProps} />);

      // Navigate to preview
      fireEvent.click(screen.getByText('Continue →'));
      await waitFor(() => {
        fireEvent.click(screen.getByText('Continue →'));
      });

      // Go back
      const backButton = screen.getByText('← Back');
      fireEvent.click(backButton);

      // Should be back on tiles step
      expect(screen.getByText('Select Tiles')).toBeInTheDocument();
    });

    it('should disable continue button on tiles step when no tiles selected', async () => {
      render(<DeckComposer {...defaultProps} />);

      // Go to tiles step
      fireEvent.click(screen.getByText('Continue →'));

      // Remove all tiles (select quarterly has 4 default tiles)
      await waitFor(() => {
        const removeBtns = screen.getAllByLabelText(/Remove/);
        removeBtns.forEach((btn) => fireEvent.click(btn));
      });

      // Continue button should be disabled
      const continueButton = screen.getByText('Continue →');
      expect(continueButton).toBeDisabled();
    });
  });

  describe('Tile Selection', () => {
    it('should allow selecting and deselecting tiles', async () => {
      render(<DeckComposer {...defaultProps} />);

      // Navigate to tiles step
      fireEvent.click(screen.getByText('Continue →'));

      // Wait for tiles to load
      await waitFor(() => {
        expect(screen.getByText('SROI Metric Card')).toBeInTheDocument();
      });

      // Should have 4 default tiles (quarterly template)
      expect(screen.getByText(/4 \/ 8 selected/)).toBeInTheDocument();

      // Add a new tile
      const integrationScoreTile = screen.getByLabelText(/Integration Score/);
      fireEvent.click(integrationScoreTile);

      // Should now have 5 tiles
      expect(screen.getByText(/5 \/ 8 selected/)).toBeInTheDocument();
    });

    it('should enforce max tiles limit of 8', async () => {
      render(<DeckComposer {...defaultProps} />);

      // Select annual template (has 7 default tiles)
      const annualTemplate = screen.getByRole('radio', { name: /Annual Report/i });
      fireEvent.click(annualTemplate);

      // Navigate to tiles step
      fireEvent.click(screen.getByText('Continue →'));

      await waitFor(() => {
        expect(screen.getByText(/7 \/ 8 selected/)).toBeInTheDocument();
      });

      // Try to add one more tile (should work, reaching max)
      const integrationScoreTile = screen.getByLabelText(/Integration Score/);
      fireEvent.click(integrationScoreTile);

      // Should now have 8 tiles
      expect(screen.getByText(/8 \/ 8 selected/)).toBeInTheDocument();

      // Warning should appear
      expect(
        screen.getByText('Maximum tiles selected. Remove a tile to add another.')
      ).toBeInTheDocument();
    });
  });

  describe('Options Configuration', () => {
    it('should allow selecting locale', async () => {
      render(<DeckComposer {...defaultProps} />);

      // Navigate to tiles step
      fireEvent.click(screen.getByText('Continue →'));

      await waitFor(() => {
        const localeSelect = screen.getByLabelText('Language');
        expect(localeSelect).toBeInTheDocument();
      });

      const localeSelect = screen.getByLabelText('Language') as HTMLSelectElement;
      fireEvent.change(localeSelect, { target: { value: 'fr' } });

      expect(localeSelect.value).toBe('fr');
    });

    it('should allow selecting theme', async () => {
      render(<DeckComposer {...defaultProps} />);

      // Navigate to tiles step
      fireEvent.click(screen.getByText('Continue →'));

      await waitFor(() => {
        const themeSelect = screen.getByLabelText('Theme');
        expect(themeSelect).toBeInTheDocument();
      });

      const themeSelect = screen.getByLabelText('Theme') as HTMLSelectElement;
      fireEvent.change(themeSelect, { target: { value: 'corporate' } });

      expect(themeSelect.value).toBe('corporate');
    });

    it('should allow enabling watermark', async () => {
      render(<DeckComposer {...defaultProps} />);

      // Navigate to tiles step
      fireEvent.click(screen.getByText('Continue →'));

      await waitFor(() => {
        const watermarkCheckbox = screen.getByLabelText('Include watermark');
        expect(watermarkCheckbox).toBeInTheDocument();
      });

      const watermarkCheckbox = screen.getByLabelText('Include watermark');
      fireEvent.click(watermarkCheckbox);

      // Watermark text input should appear
      const watermarkInput = screen.getByPlaceholderText(/Watermark text/);
      expect(watermarkInput).toBeInTheDocument();

      fireEvent.change(watermarkInput, { target: { value: 'CONFIDENTIAL' } });
      expect((watermarkInput as HTMLInputElement).value).toBe('CONFIDENTIAL');
    });
  });

  describe('Preview', () => {
    it('should show deck statistics on preview step', async () => {
      render(<DeckComposer {...defaultProps} />);

      // Navigate to preview
      fireEvent.click(screen.getByText('Continue →'));
      await waitFor(() => {
        fireEvent.click(screen.getByText('Continue →'));
      });

      // Should show statistics
      expect(screen.getByText('Total Slides')).toBeInTheDocument();
      expect(screen.getByText('Estimated Citations')).toBeInTheDocument();
      expect(screen.getByText('Estimated Pages')).toBeInTheDocument();
    });

    it('should show slide order with all slides', async () => {
      render(<DeckComposer {...defaultProps} />);

      // Navigate to preview
      fireEvent.click(screen.getByText('Continue →'));
      await waitFor(() => {
        fireEvent.click(screen.getByText('Continue →'));
      });

      // Should show slide order section
      expect(screen.getByText('Slide Order')).toBeInTheDocument();

      // Should have cover slide
      expect(screen.getByText(/Quarterly Report.*Cover/)).toBeInTheDocument();

      // Should have closing slide
      expect(screen.getByText('Looking Forward')).toBeInTheDocument();
    });

    it('should display theme preview', async () => {
      render(<DeckComposer {...defaultProps} />);

      // Navigate to preview
      fireEvent.click(screen.getByText('Continue →'));
      await waitFor(() => {
        fireEvent.click(screen.getByText('Continue →'));
      });

      // Should show theme preview
      expect(screen.getByText('Theme Preview')).toBeInTheDocument();
      expect(screen.getByText(/Default Theme/)).toBeInTheDocument();
    });
  });

  describe('Export', () => {
    it('should call onExport with correct config', async () => {
      render(<DeckComposer {...defaultProps} />);

      // Navigate to preview
      fireEvent.click(screen.getByText('Continue →'));
      await waitFor(() => {
        fireEvent.click(screen.getByText('Continue →'));
      });

      // Click export
      const exportButton = screen.getByText('Export Deck');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockOnExport).toHaveBeenCalledWith(
          expect.objectContaining({
            template: 'quarterly',
            companyId: 'test-company-123',
            locale: 'en',
            theme: 'default',
            includeWatermark: false,
          })
        );
      });
    });

    it('should show loading state during export', async () => {
      mockOnExport.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<DeckComposer {...defaultProps} />);

      // Navigate to preview
      fireEvent.click(screen.getByText('Continue →'));
      await waitFor(() => {
        fireEvent.click(screen.getByText('Continue →'));
      });

      // Click export
      const exportButton = screen.getByText('Export Deck');
      fireEvent.click(exportButton);

      // Should show loading state
      expect(screen.getByText('Exporting...')).toBeInTheDocument();

      // Wait for export to complete
      await waitFor(
        () => {
          expect(screen.queryByText('Exporting...')).not.toBeInTheDocument();
        },
        { timeout: 200 }
      );
    });

    it('should handle export errors gracefully', async () => {
      const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockOnExport.mockRejectedValue(new Error('Export failed'));

      render(<DeckComposer {...defaultProps} />);

      // Navigate to preview
      fireEvent.click(screen.getByText('Continue →'));
      await waitFor(() => {
        fireEvent.click(screen.getByText('Continue →'));
      });

      // Click export
      const exportButton = screen.getByText('Export Deck');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Failed to export deck. Please try again.'
        );
      });

      mockAlert.mockRestore();
    });

    it('should disable export button when no tiles selected', async () => {
      render(<DeckComposer {...defaultProps} />);

      // Navigate to tiles step
      fireEvent.click(screen.getByText('Continue →'));

      // Remove all tiles
      await waitFor(() => {
        const removeBtns = screen.getAllByLabelText(/Remove/);
        removeBtns.forEach((btn) => fireEvent.click(btn));
      });

      // Try to go to preview (button should be disabled)
      const continueButton = screen.getByText('Continue →');
      expect(continueButton).toBeDisabled();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button clicked', () => {
      render(<DeckComposer {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close deck composer');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<DeckComposer {...defaultProps} />);

      expect(screen.getByRole('radiogroup', { name: 'Deck template selection' })).toBeInTheDocument();
    });

    it('should support keyboard navigation in step indicator', async () => {
      render(<DeckComposer {...defaultProps} />);

      // Navigate to tiles step first
      fireEvent.click(screen.getByText('Continue →'));

      // Step indicators should be clickable
      const templateStep = screen.getByText('Template').closest('button');
      expect(templateStep).toBeInTheDocument();

      if (templateStep) {
        fireEvent.click(templateStep);
        // Should navigate back to template step
        expect(screen.getByText('Select Template')).toBeInTheDocument();
      }
    });
  });
});
