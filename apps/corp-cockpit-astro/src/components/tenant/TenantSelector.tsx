import { useState, useEffect } from 'react';
import { z } from 'zod';

const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  industry: z.string().optional(),
  country: z.string().optional(),
});

type Company = z.infer<typeof CompanySchema>;

interface TenantSelectorProps {
  lang: string;
  onSelect?: (companyId: string) => void;
  heading?: string;
  subheading?: string;
  compact?: boolean;
}

export default function TenantSelector({
  lang,
  onSelect,
  heading = 'Select a tenant workspace',
  subheading = 'Choose the company you need to operate today',
  compact = false,
}: TenantSelectorProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchCompanies() {
      try {
        // TODO: Replace with actual API call
        // const response = await fetch('/api/companies');
        // const data = await response.json();

        // Mock data for now
        const mockCompanies: Company[] = [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Pilot Corp Inc.',
            industry: 'Technology',
            country: 'Norway',
          },
          {
            id: '223e4567-e89b-12d3-a456-426614174001',
            name: 'Example Industries',
            industry: 'Manufacturing',
            country: 'UK',
          },
        ];

        setCompanies(mockCompanies);
        setLoading(false);
      } catch (err) {
        setError('Failed to load companies');
        setLoading(false);
      }
    }

    fetchCompanies();
  }, []);

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (companyId: string) => {
    // Save tenant ID to cookie (1 year expiry)
    document.cookie = `tenantId=${companyId}; path=/; max-age=31536000`;
    
    if (onSelect) {
      onSelect(companyId);
    } else {
      // Default behavior: navigate to cockpit
      window.location.href = `/${lang}/cockpit/${companyId}`;
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, companyId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(companyId);
    }
  };

  if (loading) {
    return (
      <div
        className={
          compact
            ? 'rounded-2xl border border-border bg-surface p-6 text-center'
            : 'flex min-h-screen items-center justify-center'
        }
      >
        <div className={compact ? '' : 'text-center'}>
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" role="status">
            <span className="sr-only">Loading companies...</span>
          </div>
          <p className="text-foreground/60">Loading companies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={
          compact
            ? 'rounded-2xl border border-border bg-surface p-6 text-center'
            : 'flex min-h-screen items-center justify-center'
        }
      >
        <div className={compact ? '' : 'card max-w-md text-center'}>
          <svg
            className="mx-auto mb-4 h-12 w-12 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="mb-2 text-lg font-semibold">Error Loading Companies</h2>
          <p className="text-foreground/60">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-4">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const containerClass = compact ? 'space-y-6' : 'flex min-h-screen items-center justify-center p-4';
  const wrapperClass = compact ? 'w-full' : 'w-full max-w-2xl';
  const headingWrapper = compact ? 'mb-4' : 'mb-8 text-center';
  const gridCols = compact ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4 sm:grid-cols-2';

  return (
    <div className={containerClass}>
      <div className={wrapperClass}>
        {(heading || subheading) && (
          <div className={headingWrapper}>
            <h1 className="mb-2 text-2xl font-semibold text-text-primary">{heading}</h1>
            <p className="text-text-secondary">{subheading}</p>
          </div>
        )}

        <div className="mb-6">
          <label htmlFor={`company-search-${lang}`} className="sr-only">
            Search companies
          </label>
          <input
            id={`company-search-${lang}`}
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-4 py-3 text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Search companies"
          />
        </div>

        <div className={gridCols}>
          {filteredCompanies.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-foreground/60">No companies found</div>
          ) : (
            filteredCompanies.map((company) => (
              <button
                key={company.id}
                onClick={() => handleSelect(company.id)}
                onKeyDown={(e) => handleKeyDown(e, company.id)}
                className="card group cursor-pointer text-left transition-all hover:border-primary hover:shadow-card-hover focus:border-primary focus:shadow-card-hover"
                aria-label={`Select ${company.name}`}
              >
                <h3 className="mb-2 text-lg font-semibold group-hover:text-primary">{company.name}</h3>
                <div className="flex flex-wrap gap-2 text-sm text-foreground/60">
                  {company.industry && (
                    <span className="rounded-full bg-border/50 px-2 py-1">{company.industry}</span>
                  )}
                  {company.country && (
                    <span className="rounded-full bg-border/50 px-2 py-1">{company.country}</span>
                  )}
                </div>
                <div className="mt-4 flex items-center text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  <span>Open dashboard</span>
                  <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
