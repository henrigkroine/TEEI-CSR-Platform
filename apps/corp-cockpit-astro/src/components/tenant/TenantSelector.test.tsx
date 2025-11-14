import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TenantSelector from './TenantSelector';

describe('TenantSelector', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders loading state initially', () => {
    render(<TenantSelector lang="en" onSelect={mockOnSelect} />);
    expect(screen.getByText('Loading companies...')).toBeInTheDocument();
  });

  it('renders company list after loading', async () => {
    render(<TenantSelector lang="en" onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Pilot Corp Inc.')).toBeInTheDocument();
      expect(screen.getByText('Example Industries')).toBeInTheDocument();
    });
  });

  it('renders welcome message and search input', async () => {
    render(<TenantSelector lang="en" onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Welcome to TEEI CSR Platform')).toBeInTheDocument();
      expect(screen.getByText('Select your company to continue')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search companies...')).toBeInTheDocument();
    });
  });

  it('filters companies based on search query', async () => {
    render(<TenantSelector lang="en" onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Pilot Corp Inc.')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search companies...');
    fireEvent.change(searchInput, { target: { value: 'Pilot' } });

    expect(screen.getByText('Pilot Corp Inc.')).toBeInTheDocument();
    expect(screen.queryByText('Example Industries')).not.toBeInTheDocument();
  });

  it('shows "No companies found" when search has no results', async () => {
    render(<TenantSelector lang="en" onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Pilot Corp Inc.')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search companies...');
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

    expect(screen.getByText('No companies found')).toBeInTheDocument();
  });

  it('calls onSelect with company id and tenant data when company is clicked', async () => {
    render(<TenantSelector lang="en" onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Pilot Corp Inc.')).toBeInTheDocument();
    });

    const companyButton = screen.getByLabelText('Select Pilot Corp Inc.');
    fireEvent.click(companyButton);

    expect(mockOnSelect).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174000',
      expect.objectContaining({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Pilot Corp Inc.',
        industry: 'Technology',
        country: 'Norway',
      })
    );
  });

  it('stores tenant data in localStorage and sessionStorage when company is selected', async () => {
    render(<TenantSelector lang="en" onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Pilot Corp Inc.')).toBeInTheDocument();
    });

    const companyButton = screen.getByLabelText('Select Pilot Corp Inc.');
    fireEvent.click(companyButton);

    const storedLocalTenant = localStorage.getItem('tenant');
    const storedSessionTenant = sessionStorage.getItem('tenant');

    expect(storedLocalTenant).toBeTruthy();
    expect(storedSessionTenant).toBeTruthy();

    const parsedLocal = JSON.parse(storedLocalTenant!);
    const parsedSession = JSON.parse(storedSessionTenant!);

    expect(parsedLocal.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(parsedLocal.name).toBe('Pilot Corp Inc.');
    expect(parsedSession.id).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('handles keyboard navigation (Enter key)', async () => {
    render(<TenantSelector lang="en" onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Pilot Corp Inc.')).toBeInTheDocument();
    });

    const companyButton = screen.getByLabelText('Select Pilot Corp Inc.');
    fireEvent.keyDown(companyButton, { key: 'Enter', code: 'Enter' });

    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('handles keyboard navigation (Space key)', async () => {
    render(<TenantSelector lang="en" onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Pilot Corp Inc.')).toBeInTheDocument();
    });

    const companyButton = screen.getByLabelText('Select Pilot Corp Inc.');
    fireEvent.keyDown(companyButton, { key: ' ', code: 'Space' });

    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('has proper ARIA labels for accessibility', async () => {
    render(<TenantSelector lang="en" onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Pilot Corp Inc.')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText('Search companies');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('aria-label', 'Search companies');

    const companyButton = screen.getByLabelText('Select Pilot Corp Inc.');
    expect(companyButton).toBeInTheDocument();
  });

  it('displays company metadata (industry and country)', async () => {
    render(<TenantSelector lang="en" onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Technology')).toBeInTheDocument();
      expect(screen.getByText('Norway')).toBeInTheDocument();
      expect(screen.getByText('Manufacturing')).toBeInTheDocument();
      expect(screen.getByText('UK')).toBeInTheDocument();
    });
  });
});
