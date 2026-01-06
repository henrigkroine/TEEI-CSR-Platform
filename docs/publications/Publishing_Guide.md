# Publications Publishing Guide

## Overview

The **Publications** feature allows you to create public-facing impact pages that showcase your organization's CSR metrics, stories, and evidence. These pages can be shared publicly or protected with access tokens, and embedded on your corporate website.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating a Publication](#creating-a-publication)
3. [Adding Content Blocks](#adding-content-blocks)
4. [Publishing & Visibility](#publishing--visibility)
5. [SEO & Social Sharing](#seo--social-sharing)
6. [Embedding on Your Website](#embedding-on-your-website)
7. [Analytics & Tracking](#analytics--tracking)
8. [Best Practices](#best-practices)

---

## Getting Started

### Prerequisites

- Access to the TEEI Cockpit
- Admin or Publisher role
- Your organization's CSR data loaded into the platform

### Accessing Publications

1. Log in to the TEEI Cockpit
2. Navigate to **Admin** → **Publications**
3. Click **New Publication** to create your first impact page

---

## Creating a Publication

### Basic Information

Every publication requires:

- **Title**: The main heading displayed on your impact page (e.g., "2024 Q4 Impact Report")
- **Slug**: The URL path for your publication (e.g., `2024-q4-impact`)
  - Must be unique within your organization
  - Auto-sanitized to lowercase with hyphens
  - Accessible at: `https://trust.teei.io/impact/{slug}`

- **Description** (optional): A subtitle or summary displayed below the title

### Example

```
Title: 2024 Annual Impact Report
Slug: 2024-annual-impact
Description: A comprehensive overview of our social impact initiatives in 2024
```

**Public URL**: `https://trust.teei.io/impact/2024-annual-impact`

---

## Adding Content Blocks

Publications are composed of **blocks**—modular content sections that you can arrange in any order.

### Block Types

#### 1. **TILE Blocks** (Metrics/KPIs)

Display key metrics in a card format.

**Fields**:
- `title`: Metric name (e.g., "Total Volunteers")
- `value`: Number or text value (e.g., 1,234)
- `subtitle`: Additional context (e.g., "Across 15 programs")
- `trend`: Optional trend indicator
  - `direction`: `up`, `down`, or `neutral`
  - `value`: Percentage change
  - `label`: Description (e.g., "vs. last quarter")

**Example**:
```json
{
  "kind": "TILE",
  "tileType": "metric",
  "title": "Volunteer Hours",
  "value": "12,450",
  "subtitle": "In 2024",
  "trend": {
    "direction": "up",
    "value": 23,
    "label": "vs. 2023"
  }
}
```

#### 2. **TEXT Blocks** (Rich Content)

Add formatted text, paragraphs, and narratives.

**Fields**:
- `content`: HTML content (automatically sanitized)
- `format`: `html` or `markdown`

**Supported HTML Tags**:
- Headings: `<h1>` to `<h6>`
- Paragraphs: `<p>`, `<br>`
- Formatting: `<strong>`, `<em>`, `<u>`
- Lists: `<ul>`, `<ol>`, `<li>`
- Links: `<a href="...">` (with `rel="noopener"`)
- Quotes: `<blockquote>`

**Example**:
```json
{
  "kind": "TEXT",
  "content": "<h2>Our Impact Story</h2><p>In 2024, we expanded our volunteer programs to <strong>15 new cities</strong>, engaging over 1,200 employees in meaningful community work.</p>",
  "format": "html"
}
```

#### 3. **CHART Blocks** (Data Visualizations)

Render interactive charts using Chart.js.

**Fields**:
- `chartType`: `bar`, `line`, `pie`, `doughnut`, or `area`
- `title`: Chart title
- `data`: Chart.js data object
  - `labels`: Array of x-axis labels
  - `datasets`: Array of dataset objects

**Example**:
```json
{
  "kind": "CHART",
  "chartType": "bar",
  "title": "Volunteer Hours by Quarter",
  "data": {
    "labels": ["Q1", "Q2", "Q3", "Q4"],
    "datasets": [
      {
        "label": "2024",
        "data": [2400, 3200, 3800, 4200],
        "backgroundColor": "#0ea5e9"
      }
    ]
  }
}
```

#### 4. **EVIDENCE Blocks** (Testimonials/Quotes)

Showcase evidence snippets or testimonials.

**Fields**:
- `snippet`: The quote or evidence text
- `source`: Attribution (e.g., "Jane Doe, Program Manager")
- `date`: Date of the evidence
- `category`: Optional category tag (e.g., "Employee Feedback")

**Example**:
```json
{
  "kind": "EVIDENCE",
  "snippet": "This program transformed how we engage with our local community.",
  "source": "Jane Doe, Regional Manager",
  "date": "2024-11-15",
  "category": "Employee Feedback"
}
```

### Adding Blocks

1. In the Publication Editor, scroll to **Content Blocks**
2. Click **Add Block**
3. Select block type
4. Fill in the block fields
5. Set the **order** (lower numbers appear first)
6. Click **Save**

### Arranging Blocks

Blocks are displayed in ascending `order` value:
- `order: 0` → First block
- `order: 1` → Second block
- etc.

To reorder, edit each block's `order` field.

---

## Publishing & Visibility

### Draft vs. Live

- **DRAFT**: Only visible to you in the Cockpit
- **LIVE**: Publicly accessible at `https://trust.teei.io/impact/{slug}`

### Publishing a Publication

1. Ensure all required blocks are added
2. Click **Publish** in the editor
3. Confirm SEO fields (optional)
4. Publication status changes to **LIVE**

### Visibility Options

#### PUBLIC
- Anyone can view the publication
- No authentication required
- Indexed by search engines

#### TOKEN
- Requires an access token to view
- Generate tokens in the editor (**Rotate Token** button)
- Tokens expire after 30 days (configurable)
- Use for partner-only or private reports

**Token-Protected URL**:
```
https://trust.teei.io/impact/{slug}?token={access_token}
```

---

## SEO & Social Sharing

### Meta Tags

Customize how your publication appears in search results and social media:

- **Meta Title**: Displayed in search results and browser tabs
- **Meta Description**: Snippet shown below the title in search results
- **Open Graph Image**: Image displayed when shared on social media

### Best Practices

- **Meta Title**: 50-60 characters
- **Meta Description**: 150-160 characters
- **OG Image**: 1200×630px, hosted on a public URL

**Example**:
```
Meta Title: 2024 Annual Impact Report | Acme Corp
Meta Description: Discover how Acme Corp made a difference in 2024 through volunteer programs, community partnerships, and sustainable initiatives.
OG Image: https://cdn.acme.com/images/impact-2024-og.jpg
```

---

## Embedding on Your Website

### Embed SDK

Use the TEEI Embed SDK to display publications on your corporate site.

#### Option 1: Script Tag

```html
<script
  src="https://cdn.teei.io/embed.js"
  data-slug="2024-annual-impact"
  data-tenant="your-tenant-id"
></script>
```

#### Option 2: Programmatic API

```html
<div id="teei-embed"></div>

<script src="https://cdn.teei.io/embed.js"></script>
<script>
  TEEIEmbed.render({
    containerId: 'teei-embed',
    slug: '2024-annual-impact',
    tenantId: 'your-tenant-id',
    width: '100%',
    height: 'auto'
  });
</script>
```

### Token-Protected Embeds

```html
<script
  src="https://cdn.teei.io/embed.js"
  data-slug="partner-metrics-q4"
  data-token="abc123xyz789"
></script>
```

### Customization

The embed uses a responsive iframe that:
- Automatically adjusts height via `postMessage`
- Respects your site's width constraints
- Lazy-loads for performance

See [Embed Integration Guide](./Embed_Integration.md) for advanced options.

---

## Analytics & Tracking

### Viewing Stats

1. Open your publication in the Cockpit
2. Navigate to **Statistics** (or click the stats icon)

### Metrics Tracked

- **Total Views**: All page loads
- **Unique Visitors**: Anonymized via SHA-256 hash of IP + User-Agent
- **Top Referrers**: Domains driving traffic to your publication
- **Views by Country**: Geographic distribution (ISO codes)
- **Views Over Time**: Daily view counts (last 30 days)

### Privacy

- No PII is stored
- Visitor tracking is anonymized
- GDPR-compliant

---

## Best Practices

### Content

1. **Tell a Story**: Use TEXT blocks to provide context and narrative
2. **Highlight Key Metrics**: Use TILE blocks for high-level KPIs
3. **Visualize Trends**: Use CHART blocks to show progress over time
4. **Add Social Proof**: Use EVIDENCE blocks for testimonials

### Performance

- Keep publications under **20 blocks** for optimal load times
- Use optimized images for OG tags (< 500KB)
- Test embed on your corporate site before publishing

### SEO

- Use descriptive, keyword-rich meta titles
- Write compelling meta descriptions
- Update publications regularly to keep content fresh

### Accessibility

- Use semantic headings in TEXT blocks (`<h2>`, `<h3>`)
- Provide descriptive chart titles
- Test keyboard navigation on public pages

---

## Troubleshooting

### Publication Not Showing

1. Ensure status is **LIVE** (not DRAFT)
2. Check slug matches the URL
3. For TOKEN publications, verify token is valid

### Embed Not Loading

1. Verify `data-slug` matches your publication slug
2. Check browser console for CSP errors
3. Ensure `trust.teei.io` is allowed in your site's CSP

### Analytics Not Tracking

- Views are tracked asynchronously—allow 1-2 minutes for data to appear
- Check network tab for `/api/v1/publications/{id}/stats` request

---

## Next Steps

- [Embed Integration Guide](./Embed_Integration.md)
- [API Reference](../openapi/publications.yaml)
- [Performance Optimization](./Performance.md)

---

**Need Help?**
- Email: support@teei.io
- Slack: #publications-support
- Docs: https://docs.teei.io/publications
