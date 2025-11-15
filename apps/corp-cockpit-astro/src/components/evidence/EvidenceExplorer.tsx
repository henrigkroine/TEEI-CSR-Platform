import { useState, useEffect } from 'react';
import type { EvidenceResponse, EvidenceFilters, OutcomeDimension } from '@teei/shared-types';

interface EvidenceExplorerProps {
  companyId: string;
  lang: string;
}

export default function EvidenceExplorer({ companyId, lang }: EvidenceExplorerProps) {
  const [evidence, setEvidence] = useState<EvidenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [programType, setProgramType] = useState<string>('');
  const [dimension, setDimension] = useState<OutcomeDimension | ''>('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-03-31');

  useEffect(() => {
    fetchEvidence();
  }, [programType, dimension, startDate, endDate]);

  async function fetchEvidence() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('limit', '20');
      params.append('offset', '0');
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (programType) params.append('programType', programType);
      if (dimension) params.append('dimension', dimension);
      if (search) params.append('search', search);

      const response = await fetch(`/api/evidence?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch evidence');
      }

      const data: EvidenceResponse = await response.json();
      setEvidence(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function exportCSRD() {
    try {
      const response = await fetch(
        `/api/evidence/export/csrd?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        throw new Error('Failed to generate CSRD export');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `csrd-export-${startDate}-to-${endDate}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export evidence for CSRD');
    }
  }

  function getDimensionLabel(dim: OutcomeDimension): string {
    const labels: Record<OutcomeDimension, string> = {
      confidence: 'Confidence',
      belonging: 'Belonging',
      lang_level_proxy: 'Language Level',
      job_readiness: 'Job Readiness',
      well_being: 'Well-being',
    };
    return labels[dim];
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Evidence Explorer</h1>
          <p className="mt-2 text-foreground/60">
            Browse Q2Q evidence with full traceability and lineage
          </p>
        </div>
        <button onClick={exportCSRD} className="btn-primary">
          Export for CSRD
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Filters</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Date range */}
          <div>
            <label htmlFor="start-date" className="mb-1 block text-sm font-medium">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>

          <div>
            <label htmlFor="end-date" className="mb-1 block text-sm font-medium">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>

          {/* Program type */}
          <div>
            <label htmlFor="program-type" className="mb-1 block text-sm font-medium">
              Program
            </label>
            <select
              id="program-type"
              value={programType}
              onChange={(e) => setProgramType(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <option value="">All Programs</option>
              <option value="buddy">Buddy</option>
              <option value="language">Language Connect</option>
              <option value="mentorship">Mentorship</option>
              <option value="upskilling">Upskilling</option>
            </select>
          </div>

          {/* Dimension */}
          <div>
            <label htmlFor="dimension" className="mb-1 block text-sm font-medium">
              Outcome Dimension
            </label>
            <select
              id="dimension"
              value={dimension}
              onChange={(e) => setDimension(e.target.value as OutcomeDimension | '')}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <option value="">All Dimensions</option>
              <option value="confidence">Confidence</option>
              <option value="belonging">Belonging</option>
              <option value="lang_level_proxy">Language Level</option>
              <option value="job_readiness">Job Readiness</option>
              <option value="well_being">Well-being</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4">
          <label htmlFor="search" className="mb-1 block text-sm font-medium">
            Search in snippets
          </label>
          <div className="flex gap-2">
            <input
              id="search"
              type="text"
              placeholder="Search for keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
            <button onClick={fetchEvidence} className="btn-primary">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="card text-center py-12">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-foreground/60">Loading evidence...</p>
        </div>
      ) : error ? (
        <div className="card text-center py-12">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchEvidence} className="btn-secondary mt-4">
            Retry
          </button>
        </div>
      ) : evidence ? (
        <>
          <div className="flex items-center justify-between text-sm text-foreground/60">
            <span>
              Showing {evidence.pagination.offset + 1} -{' '}
              {Math.min(
                evidence.pagination.offset + evidence.pagination.limit,
                evidence.pagination.total
              )}{' '}
              of {evidence.pagination.total} evidence snippets
            </span>
          </div>

          <div className="space-y-4">
            {evidence.evidence.map(({ snippet, outcomeScores }) => (
              <div key={snippet.id} className="card">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground/60">
                      {snippet.source}
                    </div>
                    <div className="text-xs text-foreground/40">
                      {new Date(snippet.submittedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {snippet.programType}
                  </span>
                </div>

                <p className="mb-4 text-foreground">{snippet.snippetText}</p>

                {/* Outcome scores */}
                <div className="flex flex-wrap gap-2">
                  {outcomeScores.map((score) => (
                    <div
                      key={score.id}
                      className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm"
                    >
                      <span className="font-medium">{getDimensionLabel(score.dimension)}:</span>
                      <span className="text-foreground/60">
                        {(score.score * 100).toFixed(0)}%
                      </span>
                      <span className="text-xs text-foreground/40">
                        (conf: {(score.confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {evidence.pagination.hasMore && (
            <div className="text-center">
              <button className="btn-secondary">Load More</button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
