# Export Tests - Quick Start Guide

Quick reference for running export tests.

## Prerequisites

```bash
cd services/reporting

# Install dependencies (if not already installed)
pnpm install

# Install Playwright for chart rendering tests
npx playwright install chromium
```

## Running Tests

### Quick Commands

```bash
# Run all export tests
pnpm test:exports

# Run with coverage
pnpm test:exports:coverage

# Run in watch mode (for development)
pnpm test:exports:watch

# Run performance benchmarks
pnpm benchmark:exports
```

### Using the Test Runner Script

```bash
# Make script executable (first time only)
chmod +x tests/run-export-tests.sh

# Run all tests
./tests/run-export-tests.sh all

# Run specific test suites
./tests/run-export-tests.sh pdf       # PDF export tests only
./tests/run-export-tests.sh charts    # Chart rendering tests only
./tests/run-export-tests.sh tenant    # Multi-tenant tests only
./tests/run-export-tests.sh audit     # Audit logging tests only
./tests/run-export-tests.sh perf      # Performance tests only

# Run benchmarks
./tests/run-export-tests.sh benchmark

# Run with coverage
./tests/run-export-tests.sh coverage

# CI mode
./tests/run-export-tests.sh ci
```

## What Gets Tested

### ✅ PDF Exports (15 tests)
- Basic PDF generation with/without charts
- Watermark application (text, logo, diagonal)
- Tenant-specific branding
- Batch exports
- PDF metadata preview

### ✅ Chart Rendering (4 tests)
- All chart types (line, bar, pie, doughnut, radar, area)
- Caching behavior
- High-DPI rendering
- Frontend appearance matching

### ✅ Multi-Tenant Isolation (2 tests)
- No data leaks between tenants
- Correct tenant branding per PDF

### ✅ CSV/JSON Exports (4 tests)
- CSV format export
- JSON format export
- Empty data handling
- Special character escaping

### ✅ Audit Logging (8 tests)
- Export attempt logging
- Success/failure tracking
- PII masking
- Tenant filtering
- Statistics generation
- CSV export of logs

### ✅ Error Handling (5 tests)
- Invalid configurations
- Missing resources
- Timeouts
- Corrupt data

### ✅ Performance (4 tests)
- PDF render time benchmarks
- Chart caching efficiency
- Batch export optimization
- File size estimation

## Expected Results

```
 ✓ PDF Export (15 tests)
 ✓ Chart Rendering in PDFs (4 tests)
 ✓ Multi-Tenant Isolation (2 tests)
 ✓ CSV/JSON Exports (4 tests)
 ✓ Export Audit Logging (8 tests)
 ✓ Error Handling (5 tests)
 ✓ Performance Benchmarks (4 tests)

 Test Files  1 passed (1)
      Tests  42 passed (42)
   Duration  ~2-3 minutes
```

## Performance Benchmarks

When you run `pnpm benchmark:exports`, expect output like:

```
🚀 Export Performance Benchmarks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Benchmark: Single PDF Export
   ✅ Duration: 8234ms (threshold: 30000ms)
   📊 Pages: 12
   📦 Size: 1247.35 KB

📚 Benchmark: Batch PDF Export (3 reports)
   ✅ Duration: 22145ms (threshold: 60000ms)
   📦 Total Size: 3521.42 KB

📈 Benchmark: Chart Rendering (Cold Cache)
   ✅ Duration: 2145ms (threshold: 5000ms)
   📊 Size: 142.67 KB
   🎯 Cache Hit: false

📈 Benchmark: Chart Rendering (Cached)
   ✅ Duration: 42ms (threshold: 500ms)
   🎯 Cache Hit: true

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Benchmark Results Summary

┌─────────────────────────────────────┬──────────┬─────────────┬────────┐
│ Benchmark                           │ Duration │ Threshold   │ Status │
├─────────────────────────────────────┼──────────┼─────────────┼────────┤
│ Single PDF Export                   │   8234ms │     30000ms │  ✅   │
│ Batch PDF Export                    │  22145ms │     60000ms │  ✅   │
│ Chart Rendering (Cold)              │   2145ms │      5000ms │  ✅   │
│ Chart Rendering (Cached)            │     42ms │       500ms │  ✅   │
└─────────────────────────────────────┴──────────┴─────────────┴────────┘

✅ Passed: 6/6 (100.0%)
```

## Troubleshooting

### Tests Timeout

Increase timeout in test file or use longer timeout:

```typescript
it('should render PDF', async () => {
  // ...
}, 60000); // 60 seconds
```

### Chart Rendering Fails

```bash
# Reinstall Playwright
npx playwright install chromium

# Or install all browsers
npx playwright install
```

### Redis Connection Errors

Tests handle Redis gracefully. If Redis is unavailable, caching falls back to filesystem.

```bash
# Start Redis (if needed)
docker run -d -p 6379:6379 redis:alpine

# Or use Docker Compose
docker-compose up -d redis
```

### Memory Issues

```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" pnpm test:exports
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Install Playwright
  run: npx playwright install chromium

- name: Run Export Tests
  run: pnpm test:exports:coverage
  env:
    NODE_ENV: test
    EXPORT_AUDIT_RETENTION_DAYS: 90
```

### GitLab CI

```yaml
test:exports:
  script:
    - pnpm install
    - npx playwright install chromium
    - pnpm test:exports:coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
```

## Next Steps

1. **Review test coverage**: `pnpm test:exports:coverage`
2. **Run benchmarks**: `pnpm benchmark:exports`
3. **Read full docs**: `tests/EXPORT_TESTS_README.md`
4. **Explore fixtures**: `tests/fixtures/exportTestData.ts`
5. **Add custom tests**: Extend `tests/exports.test.ts`

## Support

- **Documentation**: `tests/EXPORT_TESTS_README.md`
- **Source**: `tests/exports.test.ts`
- **Fixtures**: `tests/fixtures/exportTestData.ts`
- **Benchmarks**: `tests/exportPerformance.benchmark.ts`
