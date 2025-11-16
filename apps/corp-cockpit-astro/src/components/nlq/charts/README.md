# NLQ Chart Components

Visualization components optimized for Natural Language Query (NLQ) answer display with automatic chart type detection.

## Features

- **Automatic Chart Type Detection**: Analyzes data structure and selects the best visualization
- **5 Chart Types**: Line, Bar, Pie, Comparison (grouped bar), and Table
- **Performance Optimized**: Handles 100-10,000 data points efficiently with virtualization and downsampling
- **Accessible**: WCAG 2.2 AA compliant with color-blind friendly palettes
- **Dark Mode Support**: Automatically adapts to system theme
- **Export Functionality**: Export charts as PNG or CSV
- **Responsive**: Works on all screen sizes

## Components

### AutoChart (Recommended)

Automatically detects the best chart type for your data.

```tsx
import { AutoChart } from '@/components/nlq/charts';

<AutoChart
  data={[
    { month: 'Jan', sales: 1000, costs: 800 },
    { month: 'Feb', sales: 1200, costs: 900 },
  ]}
  title="Monthly Performance"
  showConfidence={true}
  allowOverride={true}
/>
```

**Props:**
- `data: any[]` - Array of row objects
- `title?: string` - Chart title
- `forceChartType?: ChartType` - Override auto-detection
- `showConfidence?: boolean` - Show detection confidence score
- `allowOverride?: boolean` - Allow manual chart type selection
- `height?: number` - Chart height (default: 400px)
- `unit?: string` - Value unit (e.g., '$', '%')

### TrendChart

Line chart for time series data with optional confidence bands.

```tsx
import { TrendChart } from '@/components/nlq/charts';

<TrendChart
  data={timeSeriesData}
  xColumn="date"
  yColumns={['revenue', 'profit']}
  title="Revenue Trends"
  showConfidenceBands={true}
  confidenceLevel={0.95}
/>
```

**Features:**
- Multi-series support
- Confidence intervals
- Automatic downsampling for large datasets
- Date formatting

### ComparisonChart

Grouped or stacked bar chart for categorical comparisons.

```tsx
import { ComparisonChart } from '@/components/nlq/charts';

<ComparisonChart
  data={categoryData}
  categoryColumn="department"
  valueColumns={['budget', 'spent', 'remaining']}
  title="Budget by Department"
  stacked={false}
  horizontal={false}
/>
```

**Features:**
- Grouped or stacked mode
- Horizontal or vertical orientation
- Summary statistics
- Dynamic height for many categories

### DistributionChart

Pie or donut chart for percentage distributions.

```tsx
import { DistributionChart } from '@/components/nlq/charts';

<DistributionChart
  data={distributionData}
  labelColumn="category"
  valueColumn="percentage"
  title="Market Share"
  variant="doughnut"
  showPercentages={true}
/>
```

**Features:**
- Pie or donut variant
- Automatic percentage calculation
- Summary breakdown table
- Color-coded labels

### DataTable

Enhanced table with sorting, filtering, and virtualization.

```tsx
import { DataTable } from '@/components/nlq/charts';

<DataTable
  data={largeDataset}
  title="Transaction Log"
  height={600}
  virtualize={true}
/>
```

**Features:**
- Virtualized scrolling for >100 rows
- Column sorting (click header)
- Search/filter
- CSV export
- Automatic type detection and formatting

## Chart Detection Logic

The `detectChartType()` function uses these rules:

1. **>6 columns or >100 rows** → Table
2. **Percentages summing to ~100%** → Pie chart
3. **Date + numeric columns** → Line chart (time series)
4. **Category + multiple numerics** → Comparison chart
5. **Category + single numeric** → Bar chart
6. **Single numeric column** → Bar chart
7. **Multiple numerics** → Line chart
8. **Default** → Table

## Color Palette

Color-blind friendly palette based on Paul Tol's schemes:

- Primary: Blue, Red, Green, Yellow, Cyan, Purple
- Automatically adjusts for dark mode
- Extended palette for >6 series

## Performance

- **<100 points**: No optimization needed
- **100-1000 points**: Average downsampling
- **>1000 points**: LTTB (Largest Triangle Three Buckets) algorithm
- **Tables >100 rows**: Virtualized scrolling with react-window

## Examples

### Time Series Data

```tsx
const data = [
  { date: '2024-01-01', revenue: 10000, costs: 7000 },
  { date: '2024-02-01', revenue: 12000, costs: 7500 },
  { date: '2024-03-01', revenue: 15000, costs: 8000 },
];

// Auto-detects as line chart
<AutoChart data={data} title="Monthly Trends" />
```

### Categorical Comparison

```tsx
const data = [
  { region: 'North', q1: 100, q2: 120, q3: 140, q4: 150 },
  { region: 'South', q1: 90, q2: 110, q3: 130, q4: 140 },
  { region: 'East', q1: 85, q2: 95, q3: 105, q4: 115 },
];

// Auto-detects as comparison chart
<AutoChart data={data} title="Sales by Region" />
```

### Distribution

```tsx
const data = [
  { category: 'Product A', market_share: 35 },
  { category: 'Product B', market_share: 28 },
  { category: 'Product C', market_share: 22 },
  { category: 'Others', market_share: 15 },
];

// Auto-detects as pie chart
<AutoChart data={data} title="Market Share" />
```

## API Reference

### Chart Detection

```tsx
import { detectChartType, validateChartType } from '@/components/nlq/charts';

// Detect best chart type
const detection = detectChartType(data);
console.log(detection.chartType); // 'line' | 'bar' | 'pie' | 'table' | 'comparison'
console.log(detection.confidence); // 0-1
console.log(detection.reasoning); // Human-readable explanation

// Validate a specific chart type
const validation = validateChartType(data, 'pie');
if (!validation.valid) {
  console.log(validation.errors);
}
```

### Utilities

```tsx
import {
  formatNumber,
  formatPercentage,
  formatDate,
  getColors,
  exportChartAsPNG,
} from '@/lib/nlq-chart-utils';

// Format numbers
formatNumber(1234567, { compact: true }); // "1.2M"
formatNumber(42.5, { decimals: 2, unit: '$' }); // "$42.50"

// Format percentages
formatPercentage(0.85); // "85.0%"

// Get color palette
const colors = getColors(5, isDarkMode()); // ['#4477AA', ...]
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

- `chart.js` ^4.5.1
- `react-chartjs-2` ^5.3.1
- `react-window` ^1.8.10 (for virtualization)

## License

Internal use only - TEEI CSR Platform
