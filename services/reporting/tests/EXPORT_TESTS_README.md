# Export System Test Suite

Comprehensive test suite for PDF/CSV/JSON exports with watermarking and multi-tenant isolation.

## Overview

This test suite provides complete coverage of the export system including:

- **PDF Exports**: Chart rendering, watermarking, tenant branding
- **CSV/JSON Exports**: Data formatting, special character handling
- **Multi-Tenant Isolation**: Data segregation, tenant-specific customization
- **Audit Logging**: Export tracking, PII masking, compliance reporting
- **Error Handling**: Graceful failures, timeout handling, invalid data
- **Performance**: Benchmarks, caching validation, optimization tests

## Test Files

### Main Test Suite

**`tests/exports.test.ts`** (1000+ lines)
- 50+ test cases across 8 test suites
- Covers all export scenarios
- Includes integration and unit tests
- Performance benchmarks

### Test Fixtures

**`tests/fixtures/exportTestData.ts`**
- Reusable test data
- Sample tenants, charts, watermarks
- Helper functions for test data generation
- Performance thresholds

## Test Coverage

### 1. PDF Export Tests (15 tests)

#### Basic PDF Generation
- ✅ Generate valid PDF with charts
- ✅ Generate PDF without charts
- ✅ Batch export multiple reports
- ✅ Preview PDF metadata

#### Watermark Integration
- ✅ Apply text watermark
- ✅ Apply logo watermark
- ✅ Apply diagonal watermark
- ✅ Handle missing logo gracefully
- ✅ Return original on watermark failure

#### Tenant-Specific Branding
- ✅ Acme Corporation branding
- ✅ Globex Industries branding
- ✅ Default branding (Initech - no logo)

### 2. Chart Rendering Tests (4 tests)

- ✅ Render all chart types (line, bar, pie, doughnut, radar, area)
- ✅ Cache chart renders
- ✅ High-DPI rendering (300 DPI)
- ✅ Match frontend appearance

### 3. Multi-Tenant Isolation Tests (2 tests)

- ✅ Prevent data leaks between tenants
- ✅ Apply correct tenant logos (no mixing)

### 4. CSV/JSON Export Tests (4 tests)

- ✅ Export to CSV format
- ✅ Export to JSON format
- ✅ Handle empty data sets
- ✅ Escape special characters in CSV

### 5. Audit Logging Tests (8 tests)

- ✅ Log export attempts
- ✅ Log export success with metadata
- ✅ Log export failures with errors
- ✅ Mask PII in logs (IP, names)
- ✅ Filter logs by tenant
- ✅ Query with filters (type, user, date)
- ✅ Generate export statistics
- ✅ Cleanup old logs (retention policy)

### 6. Error Handling Tests (5 tests)

- ✅ Invalid chart configuration
- ✅ Missing tenant configuration
- ✅ Chart rendering timeout
- ✅ Corrupt PDF handling
- ✅ Log failures correctly

### 7. Performance Tests (4 tests)

- ✅ PDF render time < 30s
- ✅ Chart caching (10x speedup)
- ✅ Batch export efficiency
- ✅ File size estimation accuracy

## Running Tests

### Run All Export Tests

```bash
cd services/reporting
pnpm test tests/exports.test.ts
```

### Run Specific Test Suite

```bash
# PDF Export tests only
pnpm test tests/exports.test.ts -t "PDF Export"

# Audit logging tests only
pnpm test tests/exports.test.ts -t "Export Audit Logging"

# Performance tests only
pnpm test tests/exports.test.ts -t "Performance Benchmarks"
```

### Run with Coverage

```bash
pnpm test tests/exports.test.ts --coverage
```

### Watch Mode (for development)

```bash
pnpm test tests/exports.test.ts --watch
```

## Test Scenarios

### Scenario 1: PDF Export with Charts and Watermark

```typescript
const report = createTestReport('acme', {
  includeCharts: true,
  chartCount: 3,
});

const request: PDFExportRequest = {
  reportConfig: report,
  tenantId: testTenants.acme.id,
  options: {
    includeCharts: true,
    watermark: 'CONFIDENTIAL',
    theme: {
      logo: testTenants.acme.logo,
      primaryColor: testTenants.acme.primaryColor,
    },
  },
};

const result = await exportReportToPDF(request);
// ✅ result.success === true
// ✅ PDF contains charts
// ✅ Watermark applied
// ✅ Tenant branding visible
```

### Scenario 2: Multi-Tenant Isolation

```typescript
// Export for Acme
const acmeResult = await exportReportToPDF({
  reportConfig: createTestReport('acme'),
  tenantId: testTenants.acme.id,
});

// Export for Globex (same report ID)
const globexResult = await exportReportToPDF({
  reportConfig: createTestReport('globex'),
  tenantId: testTenants.globex.id,
});

// ✅ acmeResult.buffer !== globexResult.buffer
// ✅ Acme logo in Acme PDF only
// ✅ Globex logo in Globex PDF only
```

### Scenario 3: Audit Trail

```typescript
const exportId = logExportAttempt({
  tenantId: 'tenant-001',
  userId: 'user-001',
  userName: 'Jane Doe',
  exportType: 'pdf',
  reportId: 'report-001',
  ipAddress: '192.168.1.100',
});

// ... export processing ...

logExportSuccess(exportId, {
  fileSize: 1048576,
  renderTime: 2340,
  metadata: { pageCount: 12 },
});

const logs = getExportLogs('tenant-001', {
  status: 'success',
  startDate: new Date('2024-01-01'),
});

// ✅ Export logged
// ✅ PII masked (192.168.***.*** / J*** D***)
// ✅ Queryable by tenant
```

### Scenario 4: CSV Export with Compliance

```typescript
const csv = exportAuditLogsCSV('tenant-001', {
  from: new Date('2024-01-01'),
  to: new Date('2024-12-31'),
});

// ✅ CSV format with headers
// ✅ Special characters escaped
// ✅ PII masked
// ✅ Ready for compliance reporting
```

## Performance Benchmarks

### Expected Performance

| Operation | Target | Notes |
|-----------|--------|-------|
| Single PDF Export | < 30s | With 3 charts |
| Batch PDF Export (3 reports) | < 60s | Concurrent rendering |
| Chart Render (cold) | < 5s | First render |
| Chart Render (cached) | < 100ms | 10x+ speedup |
| CSV Export | < 2s | Any data size |
| JSON Export | < 1s | Any data size |
| Audit Log Query | < 100ms | 1000s of entries |

### Performance Test Output

```
✓ should render PDF within reasonable time (8234ms)
  PDF Export Performance: 8234ms, 12 pages, 1247.35 KB

✓ should cache charts for improved performance (12450ms)
  Chart Rendering Performance: Cold=2145ms, Cached=42ms

✓ should handle batch exports efficiently (14320ms)
  Batch Chart Rendering: 14320ms for 3 charts
```

## Test Data

### Tenants

- **Acme Corporation**: Full branding (logo, colors, watermark)
- **Globex Industries**: Full branding (different colors)
- **Initech LLC**: No logo (tests default behavior)

### Charts

- Line chart: Monthly volunteer hours
- Bar chart: Quarterly impact scores
- Pie chart: Outcome distribution
- Doughnut chart: Project status
- Radar chart: Skills assessment
- Area chart: Volunteer hours trend

### Watermarks

- **Standard**: Footer, 30% opacity, timestamp
- **With Logo**: Footer, logo + text, approver name
- **Diagonal**: Center, 15% opacity, large text
- **Header**: Top, red text, "DRAFT" watermark

## Troubleshooting

### Tests Timeout

If tests timeout, increase Vitest timeout:

```typescript
it('should render PDF', async () => {
  // ...
}, 60000); // 60 second timeout
```

### Chart Rendering Fails

Ensure Playwright is installed:

```bash
cd services/reporting
npx playwright install chromium
```

### Redis Connection Errors

Chart caching requires Redis. Tests handle graceful fallback:

```typescript
// Cache miss → render
// Cache unavailable → render and skip cache
```

### Memory Issues

For large batch tests, increase Node memory:

```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm test
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run Export Tests
  run: |
    cd services/reporting
    pnpm test tests/exports.test.ts --coverage
  env:
    NODE_ENV: test
    EXPORT_AUDIT_RETENTION_DAYS: 90
```

### Coverage Requirements

- **Overall**: > 80% code coverage
- **Critical paths**: 100% (export functions, audit logging)
- **Error handlers**: 100% (watermark failures, timeouts)

## Future Enhancements

### Planned Test Coverage

- [ ] PPTX export tests
- [ ] Email delivery tests
- [ ] Scheduled export tests
- [ ] Large dataset stress tests (1000+ charts)
- [ ] Concurrent export tests (100+ simultaneous)
- [ ] Export queue/retry logic tests
- [ ] Internationalization tests (i18n watermarks)

### Performance Optimizations to Test

- [ ] Parallel chart rendering
- [ ] Progressive PDF generation
- [ ] Streaming exports for large files
- [ ] Advanced caching strategies
- [ ] CDN integration for logos

## Contributing

When adding new export features:

1. **Write tests first** (TDD approach)
2. **Add fixtures** to `exportTestData.ts`
3. **Document scenarios** in this README
4. **Update benchmarks** if performance changes
5. **Test multi-tenant** isolation

## Related Documentation

- [Export API Documentation](../src/controllers/export.ts)
- [PDF Watermarking Guide](../src/utils/PDF_WATERMARK_README.md)
- [Chart Renderer Docs](../src/utils/chartRenderer.ts)
- [Audit Logging Spec](../src/lib/exportAudit.ts)

## Support

For questions or issues:

- **Slack**: #worker4-exports
- **Email**: dev-team@teei.com
- **Docs**: https://docs.teei.com/exports
