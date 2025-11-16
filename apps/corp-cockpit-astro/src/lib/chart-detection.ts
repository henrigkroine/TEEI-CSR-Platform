/**
 * Chart Type Detection for NLQ Results
 *
 * Automatically detects the best chart type for displaying data based on:
 * - Data structure and column types
 * - Number of columns and rows
 * - Data patterns (time series, categorical, numerical)
 * - Statistical properties
 *
 * @module chart-detection
 */

export type ChartType = 'table' | 'bar' | 'line' | 'pie' | 'doughnut' | 'comparison';

/**
 * Column type detected from data analysis
 */
export type ColumnType = 'date' | 'number' | 'percentage' | 'ratio' | 'string' | 'boolean';

/**
 * Column metadata after analysis
 */
export interface ColumnMetadata {
  name: string;
  type: ColumnType;
  sampleValues: any[];
  uniqueCount: number;
  nullCount: number;
  min?: number;
  max?: number;
  isTimeSeries?: boolean;
  isCategory?: boolean;
}

/**
 * Chart detection result
 */
export interface ChartDetectionResult {
  chartType: ChartType;
  confidence: number; // 0-1 scale
  reasoning: string;
  columns: ColumnMetadata[];
  suggestedConfig?: any;
}

/**
 * Detect column type from sample values
 */
function detectColumnType(values: any[]): ColumnType {
  if (values.length === 0) return 'string';

  // Filter out null/undefined
  const validValues = values.filter((v) => v != null);
  if (validValues.length === 0) return 'string';

  const sample = validValues[0];

  // Check for boolean
  if (typeof sample === 'boolean') return 'boolean';

  // Check for number
  if (typeof sample === 'number') {
    // Check if it's a percentage (0-100 range or 0-1 range)
    const allInRange = validValues.every(
      (v) => typeof v === 'number' && ((v >= 0 && v <= 100) || (v >= 0 && v <= 1))
    );
    if (allInRange && validValues.some((v) => v > 1)) {
      return 'percentage';
    }
    if (allInRange && validValues.every((v) => v >= 0 && v <= 1)) {
      return 'ratio';
    }
    return 'number';
  }

  // Check for date
  if (sample instanceof Date) return 'date';
  if (typeof sample === 'string') {
    // Try parsing as date
    const parsed = new Date(sample);
    if (!isNaN(parsed.getTime())) {
      // Check if it looks like a date string
      if (/^\d{4}-\d{2}-\d{2}/.test(sample) || /\d{4}-Q\d/.test(sample)) {
        return 'date';
      }
    }
  }

  return 'string';
}

/**
 * Analyze column metadata
 */
function analyzeColumn(data: any[], columnName: string): ColumnMetadata {
  const values = data.map((row) => row[columnName]);
  const validValues = values.filter((v) => v != null);

  const type = detectColumnType(validValues);
  const uniqueValues = new Set(validValues);
  const uniqueCount = uniqueValues.size;
  const nullCount = values.length - validValues.length;

  const metadata: ColumnMetadata = {
    name: columnName,
    type,
    sampleValues: validValues.slice(0, 5),
    uniqueCount,
    nullCount,
  };

  // Calculate min/max for numbers
  if (type === 'number' || type === 'percentage' || type === 'ratio') {
    const numericValues = validValues.filter((v) => typeof v === 'number') as number[];
    if (numericValues.length > 0) {
      metadata.min = Math.min(...numericValues);
      metadata.max = Math.max(...numericValues);
    }
  }

  // Check if it's a time series (sorted dates)
  if (type === 'date') {
    const dates = validValues.map((v) => new Date(v).getTime()).filter((t) => !isNaN(t));
    if (dates.length > 1) {
      const sorted = [...dates].sort();
      const isSorted = dates.every((d, i) => d === sorted[i]);
      metadata.isTimeSeries = isSorted;
    }
  }

  // Check if it's a category (low cardinality string)
  if (type === 'string') {
    const cardinality = uniqueCount / validValues.length;
    metadata.isCategory = cardinality < 0.5 && uniqueCount < 20;
  }

  return metadata;
}

/**
 * Detect best chart type for given data
 *
 * Detection logic:
 * 1. Single numeric column → Bar chart
 * 2. Date + numeric columns → Line chart (time series)
 * 3. Category + 1 numeric → Bar chart
 * 4. Category + 2+ numerics → Comparison chart
 * 5. Percentages/ratios (sum ~100%) → Pie chart
 * 6. Complex data (many columns) → Table
 * 7. Large datasets (>100 rows) → Table
 *
 * @param data - Array of row objects
 * @returns Chart detection result
 */
export function detectChartType(data: any[]): ChartDetectionResult {
  // Validate input
  if (!Array.isArray(data) || data.length === 0) {
    return {
      chartType: 'table',
      confidence: 1.0,
      reasoning: 'No data provided',
      columns: [],
    };
  }

  // Analyze columns
  const columnNames = Object.keys(data[0]);
  const columns = columnNames.map((name) => analyzeColumn(data, name));

  const numericColumns = columns.filter(
    (c) => c.type === 'number' || c.type === 'percentage' || c.type === 'ratio'
  );
  const dateColumns = columns.filter((c) => c.type === 'date');
  const categoryColumns = columns.filter((c) => c.isCategory);
  const percentageColumns = columns.filter((c) => c.type === 'percentage' || c.type === 'ratio');

  // Rule 1: Too many columns → Table
  if (columns.length > 6) {
    return {
      chartType: 'table',
      confidence: 0.9,
      reasoning: `Dataset has ${columns.length} columns - table is best for complex data`,
      columns,
    };
  }

  // Rule 2: Too many rows → Table (unless time series)
  if (data.length > 100 && dateColumns.length === 0) {
    return {
      chartType: 'table',
      confidence: 0.85,
      reasoning: `Dataset has ${data.length} rows - table provides better overview`,
      columns,
    };
  }

  // Rule 3: Percentages that sum to ~100% → Pie chart
  if (percentageColumns.length === 1 && numericColumns.length === 1) {
    const percentageCol = percentageColumns[0];
    const values = data.map((row) => row[percentageCol.name]).filter((v) => typeof v === 'number');
    const sum = values.reduce((a, b) => a + b, 0);

    if (Math.abs(sum - 100) < 5 || Math.abs(sum - 1) < 0.05) {
      return {
        chartType: 'pie',
        confidence: 0.95,
        reasoning: 'Single percentage column with values summing to 100%',
        columns,
        suggestedConfig: {
          valueColumn: percentageCol.name,
          labelColumn: categoryColumns[0]?.name || columnNames.find((n) => n !== percentageCol.name),
        },
      };
    }
  }

  // Rule 4: Time series data → Line chart
  if (dateColumns.length >= 1 && numericColumns.length >= 1) {
    const timeColumn = dateColumns.find((c) => c.isTimeSeries) || dateColumns[0];
    return {
      chartType: 'line',
      confidence: 0.95,
      reasoning: 'Time series data detected (date + numeric columns)',
      columns,
      suggestedConfig: {
        xColumn: timeColumn.name,
        yColumns: numericColumns.map((c) => c.name),
      },
    };
  }

  // Rule 5: Category + multiple numerics → Comparison chart
  if (categoryColumns.length >= 1 && numericColumns.length > 1) {
    return {
      chartType: 'comparison',
      confidence: 0.85,
      reasoning: 'Categorical data with multiple metrics - comparison view is best',
      columns,
      suggestedConfig: {
        categoryColumn: categoryColumns[0].name,
        valueColumns: numericColumns.map((c) => c.name),
      },
    };
  }

  // Rule 6: Category + single numeric → Bar chart
  if (categoryColumns.length >= 1 && numericColumns.length === 1) {
    return {
      chartType: 'bar',
      confidence: 0.9,
      reasoning: 'Categorical data with single metric',
      columns,
      suggestedConfig: {
        xColumn: categoryColumns[0].name,
        yColumn: numericColumns[0].name,
      },
    };
  }

  // Rule 7: Single numeric column → Bar chart
  if (numericColumns.length === 1 && columns.length <= 3) {
    return {
      chartType: 'bar',
      confidence: 0.8,
      reasoning: 'Single numeric column with labels',
      columns,
      suggestedConfig: {
        xColumn: columnNames.find((n) => columns.find((c) => c.name === n)?.type === 'string'),
        yColumn: numericColumns[0].name,
      },
    };
  }

  // Rule 8: Only numeric columns → Line chart
  if (numericColumns.length >= 2 && numericColumns.length === columns.length) {
    return {
      chartType: 'line',
      confidence: 0.7,
      reasoning: 'Multiple numeric columns - assuming trend visualization',
      columns,
      suggestedConfig: {
        yColumns: numericColumns.map((c) => c.name),
      },
    };
  }

  // Default: Table for everything else
  return {
    chartType: 'table',
    confidence: 0.6,
    reasoning: 'Data structure does not match common chart patterns',
    columns,
  };
}

/**
 * Validate if data is suitable for a specific chart type
 *
 * @param data - Array of row objects
 * @param chartType - Target chart type
 * @returns Validation result
 */
export function validateChartType(
  data: any[],
  chartType: ChartType
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || data.length === 0) {
    errors.push('No data provided');
    return { valid: false, errors };
  }

  const columns = Object.keys(data[0]).map((name) => analyzeColumn(data, name));
  const numericColumns = columns.filter(
    (c) => c.type === 'number' || c.type === 'percentage' || c.type === 'ratio'
  );

  switch (chartType) {
    case 'bar':
    case 'line':
      if (numericColumns.length === 0) {
        errors.push('Bar/Line charts require at least one numeric column');
      }
      break;

    case 'pie':
    case 'doughnut':
      if (numericColumns.length === 0) {
        errors.push('Pie charts require at least one numeric column');
      }
      if (data.length > 20) {
        errors.push('Pie charts work best with fewer than 20 data points');
      }
      break;

    case 'comparison':
      if (numericColumns.length < 2) {
        errors.push('Comparison charts require at least 2 numeric columns');
      }
      break;

    case 'table':
      // Tables can display any data
      break;
  }

  return { valid: errors.length === 0, errors };
}
