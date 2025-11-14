# PDF Export API Documentation

## Overview

The PDF Export API provides comprehensive report export functionality with server-side chart rendering, watermarking, and tenant-specific branding.

## Features

- **Chart Rendering**: Server-side chart rendering using Playwright and QuickChart.io
- **Watermarking**: PDF watermarking with customizable text, position, and opacity using pdf-lib
- **Tenant Branding**: Automatic application of tenant logos, colors, and custom styling
- **Headers/Footers**: Page numbers, tenant information, and metadata
- **Batch Export**: Export multiple reports into a single merged PDF
- **Citations**: Include evidence citations with confidence scores
- **Table of Contents**: Auto-generated TOC with page numbers

## Architecture

```
Report Data
    ↓
Render Charts (server-side via Playwright)
    ↓
Generate PDF (HTML → PDF via Playwright)
    ↓
Add Watermarks (pdf-lib overlay)
    ↓
Add Headers/Footers (tenant info, page numbers)
    ↓
Return PDF Buffer
```

## API Endpoints

### 1. Export Report to PDF

**Endpoint**: `POST /v1/export/pdf`

**Description**: Export a single report or multiple reports to PDF with optional watermarking and charts.

**Request Body**:

```json
{
  "reportId": "uuid",  // Required if reportIds not provided
  "reportIds": ["uuid1", "uuid2"],  // Optional: batch export
  "options": {
    "includeCharts": true,  // Default: true
    "includeCitations": true,  // Default: true
    "includeTableOfContents": true,  // Default: true
    "watermark": "Custom watermark text"  // Optional
  }
}
```

**Response**:

- **Content-Type**: `application/pdf`
- **Headers**:
  - `Content-Disposition`: `attachment; filename="company_quarterly_2024-11-14.pdf"`
  - `X-PDF-Pages`: Number of pages in PDF
  - `X-Render-Time`: Render time in milliseconds

**Example**:

```bash
curl -X POST https://api.teei.io/v1/export/pdf \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "reportId": "123e4567-e89b-12d3-a456-426614174000",
    "options": {
      "includeCharts": true,
      "includeCitations": true,
      "watermark": "CONFIDENTIAL"
    }
  }' \
  --output report.pdf
```

**Status Codes**:

- `200 OK`: PDF generated successfully
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Report or tenant not found
- `500 Internal Server Error`: PDF generation failed

---

### 2. Preview PDF Metadata

**Endpoint**: `GET /v1/export/pdf/:reportId/preview`

**Description**: Preview PDF metadata (estimated size, page count, chart count) without generating the full PDF.

**Parameters**:

- `reportId` (path): Report ID to preview

**Response**:

```json
{
  "reportId": "123e4567-e89b-12d3-a456-426614174000",
  "estimatedPages": 12,
  "estimatedSize": 1048576,
  "estimatedSizeFormatted": "1.00 MB",
  "chartCount": 5,
  "sectionCount": 8
}
```

**Example**:

```bash
curl https://api.teei.io/v1/export/pdf/123e4567-e89b-12d3-a456-426614174000/preview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Status Codes**:

- `200 OK`: Preview generated successfully
- `404 Not Found`: Report not found
- `500 Internal Server Error`: Preview failed

---

### 3. Export CSRD Data

**Endpoint**: `GET /v1/export/csrd`

**Description**: Export CSRD compliance data to CSV or JSON format.

**Query Parameters**:

- `format` (optional): Export format (`csv` or `json`, default: `json`)
- `period` (optional): Period filter (e.g., `2024-Q1`)

**Response**:

- **CSV Format**: `text/csv` with headers
- **JSON Format**: `application/json` with structured data

**Example**:

```bash
# Export as CSV
curl https://api.teei.io/v1/export/csrd?format=csv&period=2024-Q1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output csrd_export.csv

# Export as JSON
curl https://api.teei.io/v1/export/csrd?format=json&period=2024-Q1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output csrd_export.json
```

---

## PDF Export Options

### Include Charts

```json
{
  "includeCharts": true
}
```

When enabled, all charts in report sections are rendered server-side and embedded in the PDF.

### Include Citations

```json
{
  "includeCitations": true
}
```

When enabled, evidence citations are included in the PDF with confidence scores and source information.

### Include Table of Contents

```json
{
  "includeTableOfContents": true
}
```

When enabled, a table of contents is generated with section titles and page numbers.

### Custom Watermark

```json
{
  "watermark": "CONFIDENTIAL - DO NOT DISTRIBUTE"
}
```

Override the default tenant watermark with custom text.

---

## Tenant Branding

The PDF export automatically applies tenant-specific branding:

### Logo

- Loaded from `companies.logo_url`
- Applied to cover page and header
- Supports PNG, JPEG, and base64-encoded images

### Colors

- **Primary Color**: Used for headings, borders, and highlights
- **Secondary Color**: Used for gradients and accents
- Loaded from `companies.primary_color` and `companies.secondary_color`

### Watermark Configuration

Stored in `company_settings.watermark_config`:

```json
{
  "enabled": true,
  "text": "Company Name - Confidential",
  "position": "footer",  // "header", "footer", "diagonal", "corner"
  "opacity": 0.3,
  "font_size": 10,
  "color": "#666666",
  "include_timestamp": true,
  "include_approver_name": false,
  "include_company_logo": false
}
```

---

## Batch Export

Export multiple reports into a single merged PDF:

```json
{
  "reportIds": [
    "123e4567-e89b-12d3-a456-426614174000",
    "234e5678-e89b-12d3-a456-426614174001",
    "345e6789-e89b-12d3-a456-426614174002"
  ],
  "options": {
    "includeCharts": true,
    "watermark": "BATCH EXPORT"
  }
}
```

**Features**:

- Reports are merged in the order provided
- Watermark is applied to the entire merged PDF
- Page numbers are sequential across all reports

---

## Chart Rendering

Charts are rendered server-side using Playwright:

### Supported Chart Types

- **Bar Charts**: `type: 'bar'`
- **Line Charts**: `type: 'line'`
- **Pie Charts**: `type: 'pie'`
- **Doughnut Charts**: `type: 'doughnut'`
- **Area Charts**: `type: 'area'`

### Chart Data Format

```json
{
  "type": "bar",
  "title": "Volunteer Hours by Month",
  "data": {
    "labels": ["January", "February", "March"],
    "datasets": [
      {
        "label": "Hours",
        "data": [120, 150, 180],
        "backgroundColor": "#6366f1",
        "borderColor": "#4f46e5",
        "borderWidth": 1
      }
    ]
  }
}
```

### Rendering Pipeline

1. **Generate HTML**: Chart data is converted to Chart.js configuration
2. **QuickChart.io**: Chart is rendered via QuickChart.io API (fallback to node-canvas)
3. **Screenshot**: Playwright captures the rendered chart as PNG
4. **Base64 Encoding**: PNG is encoded to base64 data URL
5. **Embed in PDF**: Base64 image is embedded in HTML template

---

## Watermarking

Watermarks are applied using pdf-lib after PDF generation:

### Watermark Positions

- **Header**: Top center of page
- **Footer**: Bottom center of page
- **Diagonal**: Center of page at 45° angle
- **Corner**: Bottom right corner

### Watermark Text

Default format:
```
COMPANY NAME - CONFIDENTIAL
Approved by: John Doe
Date: 2024-11-14
```

### Custom Watermark

You can override the default watermark:

```json
{
  "watermark": "DRAFT - NOT FOR DISTRIBUTION"
}
```

---

## Error Handling

### Common Errors

#### Report Not Found

```json
{
  "success": false,
  "error": "Report not found: 123e4567-e89b-12d3-a456-426614174000"
}
```

**Status**: `404 Not Found`

#### Tenant Not Found

```json
{
  "success": false,
  "error": "Tenant not found: invalid-tenant-id"
}
```

**Status**: `404 Not Found`

#### Missing Parameters

```json
{
  "error": "reportId or reportIds is required"
}
```

**Status**: `400 Bad Request`

#### PDF Generation Failed

```json
{
  "success": false,
  "error": "PDF rendering failed: Timeout waiting for chart to render"
}
```

**Status**: `500 Internal Server Error`

---

## Performance

### PDF Generation Time

- **Simple Report** (no charts): ~2-5 seconds
- **Report with Charts** (5 charts): ~10-15 seconds
- **Batch Export** (3 reports): ~30-45 seconds

### Optimizations

- **Chart Caching**: Rendered charts are cached for 1 hour
- **PDF Caching**: Generated PDFs are cached for 1 hour
- **Parallel Processing**: Charts are rendered in parallel
- **Headless Browser Reuse**: Playwright browser instances are pooled

### Caching Configuration

```env
PDF_CACHE_ENABLED=true
PDF_CACHE_TTL=3600  # 1 hour
PDF_CACHE_MAX_SIZE_MB=100
```

---

## Security

### Authentication

All endpoints require authentication via Bearer token:

```bash
Authorization: Bearer YOUR_TOKEN
```

### Tenant Isolation

Reports can only be exported by users belonging to the tenant that owns the report.

### Watermark Enforcement

Watermarks cannot be disabled for approved reports (enforced by approval workflow).

### Rate Limiting

- **Standard**: 10 requests per minute
- **Batch Export**: 2 requests per minute

---

## Dependencies

### Required NPM Packages

```json
{
  "playwright": "^1.40.0",
  "pdf-lib": "^1.17.1",
  "sharp": "^0.33.0"  // Optional: for image watermarking
}
```

### System Dependencies

- **Playwright Browsers**: Chromium headless browser
- **Fonts**: Arial, Helvetica, Times New Roman

### Installation

```bash
# Install NPM packages
npm install playwright pdf-lib sharp

# Install Playwright browsers
npx playwright install chromium
```

---

## Development

### Local Testing

```bash
# Start reporting service
cd services/reporting
npm run dev

# Test PDF export endpoint
curl -X POST http://localhost:3007/v1/export/pdf \
  -H "Content-Type: application/json" \
  -d '{
    "reportId": "test-report-123",
    "options": { "includeCharts": true }
  }' \
  --output test-report.pdf
```

### Environment Variables

```env
# PDF Export Configuration
PDF_CACHE_ENABLED=true
PDF_CACHE_TTL=3600
PDF_CACHE_MAX_SIZE_MB=100

# Playwright Configuration
PLAYWRIGHT_BROWSERS_PATH=/path/to/browsers
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/teei
```

---

## Examples

### Basic Export

```typescript
const response = await fetch('https://api.teei.io/v1/export/pdf', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    reportId: '123e4567-e89b-12d3-a456-426614174000',
    options: {
      includeCharts: true,
      includeCitations: true,
    },
  }),
});

const blob = await response.blob();
const url = URL.createObjectURL(blob);
window.open(url);
```

### Batch Export

```typescript
const response = await fetch('https://api.teei.io/v1/export/pdf', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    reportIds: [
      '123e4567-e89b-12d3-a456-426614174000',
      '234e5678-e89b-12d3-a456-426614174001',
    ],
    options: {
      watermark: 'Q1-Q2 2024 COMBINED REPORT',
    },
  }),
});

const blob = await response.blob();
saveAs(blob, 'combined-report.pdf');
```

### Preview Before Export

```typescript
// 1. Preview metadata
const preview = await fetch(
  `https://api.teei.io/v1/export/pdf/${reportId}/preview`,
  {
    headers: { 'Authorization': `Bearer ${token}` },
  }
).then(r => r.json());

console.log(`Estimated size: ${preview.estimatedSizeFormatted}`);
console.log(`Estimated pages: ${preview.estimatedPages}`);

// 2. Export if acceptable
if (preview.estimatedPages < 50) {
  const response = await fetch('https://api.teei.io/v1/export/pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ reportId }),
  });

  const blob = await response.blob();
  saveAs(blob, 'report.pdf');
}
```

---

## Troubleshooting

### Charts Not Rendering

**Issue**: Charts appear as placeholders

**Solution**:
1. Verify QuickChart.io is accessible
2. Check chart data format matches Chart.js schema
3. Enable debug logging: `DEBUG=chart-renderer npm run dev`

### Watermark Not Applied

**Issue**: PDF has no watermark

**Solution**:
1. Check `company_settings.watermark_enabled = true`
2. Verify watermark configuration is valid
3. Check pdf-lib is installed: `npm list pdf-lib`

### PDF Generation Timeout

**Issue**: Request times out after 60 seconds

**Solution**:
1. Reduce number of charts
2. Disable chart rendering: `includeCharts: false`
3. Increase timeout in client

### Missing Tenant Logo

**Issue**: Logo not appearing in PDF

**Solution**:
1. Verify `companies.logo_url` is set
2. Check logo URL is accessible
3. Ensure logo is PNG or JPEG format

---

## Support

For issues or questions:

- **GitHub Issues**: https://github.com/teei/platform/issues
- **Email**: support@teei.io
- **Slack**: #pdf-export channel
