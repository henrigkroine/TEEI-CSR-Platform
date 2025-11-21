# Embed Integration Guide

## Overview

The TEEI Embed SDK allows you to seamlessly integrate public impact pages into your corporate website with minimal code. This guide covers installation, configuration, security, and advanced customization.

---

## Quick Start

### 1. Basic Embed

Add this single line to your HTML:

```html
<script
  src="https://cdn.teei.io/embed.js"
  data-slug="your-publication-slug"
></script>
```

That's it! The embed will automatically:
- Create a container
- Load your publication in an iframe
- Adjust height dynamically
- Show a loading spinner

---

## Installation Methods

### Method 1: Script Tag (Recommended)

**Advantages**: Zero JavaScript knowledge required

```html
<script
  src="https://cdn.teei.io/embed.js"
  data-slug="2024-annual-impact"
  data-tenant="acme-corp"
></script>
```

The SDK auto-initializes when the DOM loads.

### Method 2: Programmatic API

**Advantages**: Full control over rendering and lifecycle

```html
<div id="my-embed-container"></div>

<script src="https://cdn.teei.io/embed.js"></script>
<script>
  const embed = TEEIEmbed.render({
    containerId: 'my-embed-container',
    slug: '2024-annual-impact',
    tenantId: 'acme-corp',
    width: '100%',
    height: 'auto',
    onLoad: function(iframe) {
      console.log('Embed loaded successfully!');
    },
    onError: function(error) {
      console.error('Embed failed to load:', error);
    }
  });

  // Later: destroy the embed
  // embed.destroy();
</script>
```

### Method 3: React Component (Wrapper)

```jsx
import { useEffect, useRef } from 'react';

function TEEIEmbedReact({ slug, tenantId }) {
  const containerRef = useRef(null);
  const embedRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.TEEIEmbed && containerRef.current) {
      embedRef.current = window.TEEIEmbed.render({
        containerId: containerRef.current.id,
        slug,
        tenantId,
      });
    }

    return () => {
      if (embedRef.current) {
        embedRef.current.destroy();
      }
    };
  }, [slug, tenantId]);

  return <div ref={containerRef} id={`teei-embed-${slug}`} />;
}

// Usage
<TEEIEmbedReact slug="2024-annual-impact" tenantId="acme-corp" />
```

---

## Configuration Options

### Script Tag Attributes

| Attribute | Required | Description | Example |
|-----------|----------|-------------|---------|
| `data-slug` | ✅ | Publication slug | `data-slug="2024-q4-impact"` |
| `data-tenant` | ⚠️ | Tenant ID (for multi-tenant setups) | `data-tenant="acme-corp"` |
| `data-token` | - | Access token for TOKEN-protected publications | `data-token="abc123"` |

### Programmatic Options

```javascript
TEEIEmbed.render({
  // Required
  slug: 'your-publication-slug',

  // Optional
  containerId: 'teei-embed',          // Default: 'teei-embed'
  tenantId: 'your-tenant-id',         // Default: undefined
  token: 'access-token',              // For TOKEN-protected publications
  width: '100%',                      // Default: '100%'
  height: 'auto',                     // Default: 'auto' (auto-adjusts)
  loading: true,                      // Show loading spinner (default: true)

  // Callbacks
  onLoad: function(iframe) {
    // Called when iframe loads successfully
    console.log('Loaded:', iframe);
  },
  onError: function(error) {
    // Called on load failure
    console.error('Error:', error);
  }
});
```

---

## Responsive Design

### Auto Height Adjustment

The embed automatically resizes its height based on content using `postMessage`:

1. Publication page renders
2. Page calculates its height
3. Sends height via `postMessage`
4. Embed SDK adjusts iframe height

**No action required**—works out of the box.

### Fixed Height

For a fixed-height embed:

```javascript
TEEIEmbed.render({
  containerId: 'teei-embed',
  slug: '2024-annual-impact',
  height: '800px'  // Fixed height
});
```

### Custom Container Styling

```html
<div id="teei-embed" style="max-width: 1200px; margin: 0 auto; padding: 20px;"></div>
<script src="https://cdn.teei.io/embed.js"></script>
<script>
  TEEIEmbed.render({ containerId: 'teei-embed', slug: '2024-annual-impact' });
</script>
```

---

## Security

### Content Security Policy (CSP)

If your site uses CSP, add these directives:

```
Content-Security-Policy:
  frame-src https://trust.teei.io;
  script-src https://cdn.teei.io;
```

**Example** (Apache `.htaccess`):
```apache
Header set Content-Security-Policy "frame-src https://trust.teei.io; script-src 'self' https://cdn.teei.io;"
```

**Example** (Nginx):
```nginx
add_header Content-Security-Policy "frame-src https://trust.teei.io; script-src 'self' https://cdn.teei.io;";
```

### Origin Validation

The SDK only accepts `postMessage` events from trusted origins:
- `https://trust.teei.io` (production)
- `http://localhost:4322` (development)

Untrusted origins are ignored with a console warning.

### Token Security

For TOKEN-protected publications:
- **Do not** commit tokens to version control
- Use environment variables or server-side rendering
- Rotate tokens regularly in the Cockpit

**Bad**:
```html
<script data-slug="partner-report" data-token="hardcoded-token"></script>
```

**Good**:
```html
<script
  data-slug="partner-report"
  data-token="<%= ENV['TEEI_EMBED_TOKEN'] %>"
></script>
```

---

## Performance

### Lazy Loading

Iframes use `loading="lazy"` by default, deferring load until the embed is near the viewport.

### Caching

The embed SDK is served with cache headers:
- **CDN**: Cached globally
- **Browser**: 1 hour cache
- **Version**: Updated automatically

To force a fresh version:
```html
<script src="https://cdn.teei.io/embed.js?v=1.0.1"></script>
```

### Performance Targets

- **Embed First Render**: < 600ms from script load
- **iframe TTFB**: < 300ms (from cache)
- **Full Page Load**: < 2s

### Monitoring

Use the `onLoad` callback to track load times:

```javascript
const startTime = Date.now();

TEEIEmbed.render({
  slug: '2024-annual-impact',
  onLoad: function() {
    const loadTime = Date.now() - startTime;
    console.log(`Embed loaded in ${loadTime}ms`);

    // Send to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'timing_complete', {
        name: 'teei_embed_load',
        value: loadTime,
        event_category: 'Embed'
      });
    }
  }
});
```

---

## Advanced Usage

### Multiple Embeds on One Page

```html
<div id="embed-1"></div>
<div id="embed-2"></div>

<script src="https://cdn.teei.io/embed.js"></script>
<script>
  TEEIEmbed.render({ containerId: 'embed-1', slug: '2024-q1-impact' });
  TEEIEmbed.render({ containerId: 'embed-2', slug: '2024-q2-impact' });
</script>
```

### Dynamic Slug (User Selection)

```html
<select id="report-selector">
  <option value="2024-q1-impact">Q1 2024</option>
  <option value="2024-q2-impact">Q2 2024</option>
  <option value="2024-q3-impact">Q3 2024</option>
</select>

<div id="dynamic-embed"></div>

<script src="https://cdn.teei.io/embed.js"></script>
<script>
  let currentEmbed = null;

  document.getElementById('report-selector').addEventListener('change', function(e) {
    // Destroy previous embed
    if (currentEmbed) {
      currentEmbed.destroy();
    }

    // Render new embed
    currentEmbed = TEEIEmbed.render({
      containerId: 'dynamic-embed',
      slug: e.target.value
    });
  });

  // Initial load
  currentEmbed = TEEIEmbed.render({
    containerId: 'dynamic-embed',
    slug: '2024-q1-impact'
  });
</script>
```

### Custom Loading Spinner

Disable the default spinner and use your own:

```html
<div id="teei-embed">
  <div class="my-custom-spinner">Loading...</div>
</div>

<script src="https://cdn.teei.io/embed.js"></script>
<script>
  TEEIEmbed.render({
    containerId: 'teei-embed',
    slug: '2024-annual-impact',
    loading: false,  // Disable default spinner
    onLoad: function() {
      // Remove custom spinner
      document.querySelector('.my-custom-spinner').remove();
    }
  });
</script>
```

---

## Troubleshooting

### Embed Not Showing

**Symptoms**: Blank space where embed should be

**Checks**:
1. Open browser DevTools → Console
2. Look for errors like:
   - `Container with id "teei-embed" not found` → Wrong container ID
   - `"slug" is required` → Missing `data-slug`
   - CSP errors → Update CSP headers

3. Verify publication is LIVE:
   ```bash
   curl https://api.teei.io/public/publications/your-slug
   ```

### Height Not Adjusting

**Symptoms**: Iframe has fixed 600px height

**Causes**:
- CSP blocking `postMessage`
- Browser extension blocking communication

**Fix**:
1. Check browser console for `postMessage` warnings
2. Ensure `trust.teei.io` is in CSP `frame-src`
3. Test in incognito mode (disables extensions)

### Token Errors

**Symptoms**: "Invalid or missing access token"

**Checks**:
1. Verify token matches Cockpit
2. Check token hasn't expired (30 days default)
3. Ensure token is for the correct publication

**Rotate Token**:
1. Open publication in Cockpit
2. Click **Rotate Token**
3. Update embed code with new token

### Performance Issues

**Symptoms**: Slow load times

**Optimizations**:
1. **Use CDN**: Ensure `cdn.teei.io` is loading (not self-hosted)
2. **Enable Caching**: Set `Cache-Control` headers on your site
3. **Lazy Load**: Place embed below the fold for deferred loading

---

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome  | Latest 2 | ✅ Full |
| Firefox | Latest 2 | ✅ Full |
| Safari  | Latest 2 | ✅ Full |
| Edge    | Latest 2 | ✅ Full |
| iOS Safari | Latest 2 | ✅ Full |
| IE 11   | - | ❌ Not supported |

---

## API Reference

### `TEEIEmbed.render(options)`

**Parameters**:
- `options` (object): Configuration options

**Returns**: `TEEIEmbed` instance

**Methods**:
- `destroy()`: Remove embed and clean up event listeners

**Example**:
```javascript
const embed = TEEIEmbed.render({ slug: 'my-slug' });

// Later
embed.destroy();
```

---

## Examples

### WordPress Integration

```php
<?php
// Add to your theme's functions.php
function teei_embed_shortcode($atts) {
  $atts = shortcode_atts(array(
    'slug' => '',
    'tenant' => '',
    'token' => ''
  ), $atts);

  $token_attr = $atts['token'] ? 'data-token="' . esc_attr($atts['token']) . '"' : '';

  return '<script src="https://cdn.teei.io/embed.js" data-slug="' . esc_attr($atts['slug']) . '" data-tenant="' . esc_attr($atts['tenant']) . '" ' . $token_attr . '></script>';
}
add_shortcode('teei_embed', 'teei_embed_shortcode');

// Usage in WordPress editor:
// [teei_embed slug="2024-annual-impact" tenant="acme-corp"]
?>
```

### Next.js Integration

```jsx
// components/TEEIEmbed.js
import { useEffect, useRef } from 'react';
import Script from 'next/script';

export default function TEEIEmbed({ slug, tenantId }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (window.TEEIEmbed && containerRef.current) {
      window.TEEIEmbed.render({
        containerId: containerRef.current.id,
        slug,
        tenantId
      });
    }
  }, [slug, tenantId]);

  return (
    <>
      <Script
        src="https://cdn.teei.io/embed.js"
        strategy="lazyOnload"
      />
      <div ref={containerRef} id={`teei-embed-${slug}`} />
    </>
  );
}

// Usage in page:
// import TEEIEmbed from '../components/TEEIEmbed';
// <TEEIEmbed slug="2024-annual-impact" tenantId="acme-corp" />
```

---

## Support

- **Email**: support@teei.io
- **Slack**: #embed-sdk
- **Docs**: https://docs.teei.io/embeds
- **GitHub Issues**: https://github.com/teei/embed-sdk/issues

---

## Changelog

### v1.0.0 (2024-11-17)
- Initial release
- Auto height adjustment via postMessage
- CSP-safe origin validation
- Token-protected publication support
- Loading spinner with custom option
- React/Next.js compatibility
