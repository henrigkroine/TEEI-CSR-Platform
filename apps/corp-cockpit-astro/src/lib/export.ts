/**
 * CSV Export Utility
 * Provides functions to export data to CSV format
 */

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV(
  data: any[],
  columns?: ExportColumn[]
): string {
  if (data.length === 0) {
    return '';
  }

  // If no columns specified, use all keys from first object
  const cols = columns || Object.keys(data[0]).map(key => ({ key, label: key }));

  // Create header row
  const header = cols.map(col => escapeCSVValue(col.label)).join(',');

  // Create data rows
  const rows = data.map(row => {
    return cols
      .map(col => {
        const value = row[col.key];
        const formatted = col.format ? col.format(value) : value;
        return escapeCSVValue(formatted);
      })
      .join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Escape a value for CSV format
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Download data as CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export array to CSV and trigger download
 */
export function exportToCSV(
  data: any[],
  filename: string,
  columns?: ExportColumn[]
): void {
  const csv = arrayToCSV(data, columns);
  downloadCSV(csv, filename);
}

/**
 * Export metrics data to CSV
 */
export async function exportMetricsToCSV(
  companyId: string,
  period: string = 'last-6-months',
  token?: string
): Promise<void> {
  try {
    const baseUrl = import.meta.env.PUBLIC_ANALYTICS_SERVICE_URL || 'http://localhost:3007';
    const url = `${baseUrl}/metrics/company/${companyId}/period/${period}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch metrics: ${response.statusText}`);
    }

    const data = await response.json();

    // Define columns for metrics export
    const columns: ExportColumn[] = [
      { key: 'period', label: 'Period' },
      { key: 'participantsCount', label: 'Participants' },
      { key: 'volunteersCount', label: 'Volunteers' },
      { key: 'sessionsCount', label: 'Sessions' },
      { key: 'avgIntegrationScore', label: 'Avg Integration Score', format: (v) => v?.toFixed(2) || '' },
      { key: 'avgLanguageLevel', label: 'Avg Language Level', format: (v) => v?.toFixed(2) || '' },
      { key: 'avgJobReadiness', label: 'Avg Job Readiness', format: (v) => v?.toFixed(2) || '' },
      { key: 'sroiRatio', label: 'SROI Ratio', format: (v) => v?.toFixed(2) || '' },
      { key: 'visScore', label: 'VIS Score', format: (v) => v?.toFixed(1) || '' },
    ];

    const filename = `metrics-${companyId}-${period}-${new Date().toISOString().split('T')[0]}.csv`;

    // If data is array, export directly; if single object, wrap in array
    const dataArray = Array.isArray(data) ? data : [data];

    exportToCSV(dataArray, filename, columns);
  } catch (error) {
    console.error('Failed to export metrics:', error);
    throw error;
  }
}

/**
 * Export Q2Q feed to CSV
 */
export async function exportQ2QFeedToCSV(
  companyId: string,
  filters?: {
    dimension?: string;
    sentiment?: string;
    startDate?: string;
    endDate?: string;
  },
  token?: string
): Promise<void> {
  try {
    const baseUrl = import.meta.env.PUBLIC_ANALYTICS_SERVICE_URL || 'http://localhost:3007';
    const params = new URLSearchParams();
    params.append('limit', '1000'); // Get all records for export

    if (filters?.dimension) params.append('dimension', filters.dimension);
    if (filters?.sentiment) params.append('sentiment', filters.sentiment);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const url = `${baseUrl}/metrics/company/${companyId}/q2q-feed?${params.toString()}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch Q2Q feed: ${response.statusText}`);
    }

    const data = await response.json();

    // Define columns for Q2Q export
    const columns: ExportColumn[] = [
      { key: 'timestamp', label: 'Date', format: (v) => new Date(v).toLocaleString() },
      { key: 'participantId', label: 'Participant ID' },
      { key: 'snippet', label: 'Text Snippet' },
      { key: 'confidence', label: 'Confidence', format: (v) => v?.toFixed(2) || '' },
      { key: 'belonging', label: 'Belonging', format: (v) => v?.toFixed(2) || '' },
      { key: 'languageComfort', label: 'Language Comfort' },
      { key: 'sentiment', label: 'Sentiment' },
      { key: 'classificationMethod', label: 'Classification Method' },
    ];

    const filename = `q2q-feed-${companyId}-${new Date().toISOString().split('T')[0]}.csv`;

    exportToCSV(data, filename, columns);
  } catch (error) {
    console.error('Failed to export Q2Q feed:', error);
    throw error;
  }
}
