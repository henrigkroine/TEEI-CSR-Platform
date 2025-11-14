# Chart Renderer - Quick Reference

Server-side chart rendering for PDF exports using Playwright + ChartJS.

## Features

- ✅ All ChartJS chart types (line, bar, pie, doughnut, radar, area)
- ✅ Two-tier caching (Redis + filesystem)
- ✅ Browser pooling for efficiency
- ✅ PNG output (SVG planned)
- ✅ Batch rendering
- ✅ Performance monitoring
- ✅ Automatic retries
- ✅ High-DPI support

## Quick Start

```typescript
import { renderChart } from './chartRenderer.js';

const result = await renderChart({
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [{
      label: 'Revenue',
      data: [10, 20, 15],
      borderColor: '#3b82f6',
    }],
  },
}, {
  width: 800,
  height: 500,
});

// result.buffer contains PNG image
```

## API

### Main Functions

- `renderChart(config, options)` - Render single chart
- `renderChartToBase64(config, options)` - Render to data URL
- `renderChartsBatch(configs, options)` - Batch render
- `getRenderStats()` - Get performance statistics
- `clearChartCache()` - Clear all caches
- `warmCache(configs)` - Pre-render and cache
- `cleanup()` - Close browser pool

## Testing

```bash
# Unit tests
pnpm test:chart

# Benchmarks
pnpm benchmark:chart
```

## Files

- `chartRenderer.ts` - Main implementation (700+ lines)
- `chartRenderer.test.ts` - Comprehensive test suite (500+ lines)
- `chartRenderer.benchmark.ts` - Performance benchmarks (400+ lines)

## Performance

- **Cold render**: ~300ms per chart
- **Cache hit**: <5ms per chart
- **Cache speedup**: 60-70x faster
- **Batch improvement**: 50-65% faster than sequential

## Caching

- **Primary**: Redis (shared, distributed)
- **Fallback**: Filesystem (local, no deps)
- **TTL**: 1 hour (configurable)
- **Key**: SHA-256 hash of config + options

## Documentation

Full documentation: `/docs/Reporting_Exports.md` (Server-Side Chart Rendering section)

## Support

For issues: Check test files for examples, run benchmarks, consult main docs.
