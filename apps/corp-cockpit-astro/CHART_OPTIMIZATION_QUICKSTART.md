# Chart Optimization Quick Start Guide

This guide helps you quickly implement the chart optimizations in your dashboard components.

## Quick Start

### 1. Install Dependencies (Already Done)

```bash
pnpm add chart.js@^4.4.0 react-chartjs-2@^5.2.0
```

### 2. Use Optimized Chart Component

Replace existing Chart components with ChartOptimized:

```tsx
// Before
import Chart from '../components/Chart';

function MyDashboard() {
  return <Chart type="line" data={myData} />;
}

// After
import ChartOptimized from '../components/ChartOptimized';
import { adaptiveDownsample } from '../utils/chartOptimizations';

function MyDashboard() {
  // Downsample large datasets
  const optimizedData = useMemo(() => {
    if (myData.length > 1000) {
      return adaptiveDownsample(myData, { maxPoints: 500 });
    }
    return myData;
  }, [myData]);

  return (
    <ChartOptimized
      type="line"
      data={optimizedData}
      lazy={true}           // Load on scroll
      preset="production"   // Disable animations
    />
  );
}
```

## Common Patterns

### Pattern 1: Dashboard with Multiple Charts

```tsx
import ChartOptimized from '../components/ChartOptimized';

function Dashboard() {
  return (
    <div className="dashboard">
      {/* Above fold - load immediately */}
      <ChartOptimized type="line" data={data1} lazy={false} />

      {/* Below fold - load on scroll */}
      <ChartOptimized type="bar" data={data2} lazy={true} />
      <ChartOptimized type="doughnut" data={data3} lazy={true} />
    </div>
  );
}
```

### Pattern 2: Large Time-Series Data

```tsx
import { lttb } from '../utils/chartOptimizations';

function TimeSeriesChart({ data }) {
  const downsampled = useMemo(() => {
    // Downsample 10,000 points to 500
    return lttb(data, 500);
  }, [data]);

  const chartData = {
    labels: downsampled.map(p => p.x),
    datasets: [{
      label: 'Metrics',
      data: downsampled.map(p => p.y),
    }]
  };

  return <ChartOptimized type="line" data={chartData} />;
}
```

### Pattern 3: With Performance Tracking

```tsx
import { trackChartRender } from '../utils/chartPerformanceTracking';

function TrackedChart({ data }) {
  const handleRenderComplete = (renderTime) => {
    trackChartRender({
      chartId: 'my-chart',
      chartType: 'bar',
      renderTime,
      dataPoints: data.length,
      downsampled: false,
    });
  };

  return (
    <ChartOptimized
      type="bar"
      data={data}
      onRenderComplete={handleRenderComplete}
    />
  );
}
```

## Performance Budgets

Your charts should meet these targets:

- **Render time**: < 500ms
- **LCP contribution**: < 1.0s
- **Memory usage**: < 50MB per chart
- **Bundle size**: Chart.js + utilities < 300KB

## Optimization Checklist

- [ ] Replace `Chart` with `ChartOptimized`
- [ ] Enable lazy loading for below-fold charts
- [ ] Downsample datasets > 1000 points
- [ ] Use `preset="production"` in production
- [ ] Add performance tracking (optional)
- [ ] Test with Lighthouse CI

## Troubleshooting

### Chart Not Rendering

```tsx
// Check: Is data in correct format?
const chartData = {
  labels: ['A', 'B', 'C'],
  datasets: [{
    label: 'Dataset',
    data: [10, 20, 30], // Must be array of numbers
  }]
};
```

### Performance Still Slow

```tsx
// 1. Check data size
console.log('Data points:', data.length);

// 2. Use LTTB for large datasets
const optimized = lttb(data, 500);

// 3. Disable animations
<ChartOptimized preset="production" />

// 4. Check render time
onRenderComplete={(time) => console.log('Render:', time, 'ms')}
```

### Chart Updates Too Frequently

```tsx
// Memoize chart data
const chartData = useMemo(() => ({
  labels: data.map(d => d.label),
  datasets: [{
    data: data.map(d => d.value)
  }]
}), [data]); // Only recalculate when data changes
```

## Examples

See these files for complete examples:

- `src/components/widgets/SROIPanelEnhanced.tsx` - Complete dashboard widget
- `src/utils/chartOptimizations.test.ts` - Usage examples and tests

## Support

- **Documentation**: `/reports/PHASE-C-E-02-chart-optimization.md`
- **Performance Tracking**: Use `window.chartPerformance` in dev mode
- **Lighthouse**: Run `lighthouse http://localhost:4321 --config-path=lighthouse.config.js`
