import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GenerateReportModal from './GenerateReportModal';

// Mock fetch
global.fetch = vi.fn();

describe('GenerateReportModal', () => {
  const mockOnClose = vi.fn();
  const companyId = 'test-company-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <GenerateReportModal
        companyId={companyId}
        isOpen={false}
        onClose={mockOnClose}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render modal when isOpen is true', () => {
    render(
      <GenerateReportModal
        companyId={companyId}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Generate Report')).toBeInTheDocument();
  });

  it('should display all report type options', () => {
    render(
      <GenerateReportModal
        companyId={companyId}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByLabelText(/Quarterly Report/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Annual Report/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Board Presentation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CSRD Compliance Report/i)).toBeInTheDocument();
  });

  it('should have date inputs', () => {
    render(
      <GenerateReportModal
        companyId={companyId}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();
  });

  it('should display program filter checkboxes', () => {
    render(
      <GenerateReportModal
        companyId={companyId}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByText('buddy')).toBeInTheDocument();
    expect(screen.getByText('language')).toBeInTheDocument();
    expect(screen.getByText('mentorship')).toBeInTheDocument();
    expect(screen.getByText('upskilling')).toBeInTheDocument();
  });

  it('should toggle program selection', () => {
    render(
      <GenerateReportModal
        companyId={companyId}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    const buddyCheckbox = screen.getByRole('checkbox', { name: /buddy/i });
    expect(buddyCheckbox).not.toBeChecked();
    
    fireEvent.click(buddyCheckbox);
    expect(buddyCheckbox).toBeChecked();
    
    fireEvent.click(buddyCheckbox);
    expect(buddyCheckbox).not.toBeChecked();
  });

  it('should have report options', () => {
    render(
      <GenerateReportModal
        companyId={companyId}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByLabelText(/Tone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Length/i)).toBeInTheDocument();
    expect(screen.getByText(/Include charts and visualizations/i)).toBeInTheDocument();
  });

  it('should close modal when cancel button is clicked', () => {
    render(
      <GenerateReportModal
        companyId={companyId}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should disable generate button when dates are invalid', () => {
    render(
      <GenerateReportModal
        companyId={companyId}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    const generateButton = screen.getByRole('button', { name: /Generate Report/i });
    
    // Set end date before start date
    const startDateInput = screen.getByLabelText(/Start Date/i) as HTMLInputElement;
    const endDateInput = screen.getByLabelText(/End Date/i) as HTMLInputElement;
    
    fireEvent.change(startDateInput, { target: { value: '2024-06-01' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-01' } });
    
    expect(generateButton).toBeDisabled();
  });

  it('should call API and show loading state when generating report', async () => {
    const mockReport = {
      reportId: 'report-123',
      sections: [],
      citations: [],
      metadata: {
        model: 'gpt-4',
        promptVersion: 'v1.0',
        tokensUsed: 1000,
        generatedAt: new Date().toISOString()
      }
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReport
    });

    render(
      <GenerateReportModal
        companyId={companyId}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const generateButton = screen.getByRole('button', { name: /Generate Report/i });
    fireEvent.click(generateButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/Generating.../i)).toBeInTheDocument();
    });

    // Should call API with correct parameters
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/companies/${companyId}/gen-reports/generate`),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
  });

  it('should display error message when generation fails', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Generation failed' })
    });

    render(
      <GenerateReportModal
        companyId={companyId}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Generate Report/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error generating report/i)).toBeInTheDocument();
      expect(screen.getByText(/Generation failed/i)).toBeInTheDocument();
    });
  });
});
