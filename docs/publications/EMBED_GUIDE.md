# Embed Integration Guide

## Quick Start

### CDN (Recommended)

```html
<script src="https://cdn.teei.io/embed.js"
        data-slug="your-publication-slug"
        data-tenant="your-tenant-id">
</script>
```

That's it! The embed will automatically initialize and render.

## Configuration Options

### Data Attributes

Configure via HTML data attributes:

```html
<script src="https://cdn.teei.io/embed.js"
        data-slug="impact-2024-q1"
        data-tenant="acme-corp"
        data-token="pub_abc123..."
        data-width="100%"
        data-height="800px"
        data-border="true"
        data-lazy="true"
        data-analytics="true">
</script>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-slug` | string | **required** | Publication slug |
| `data-tenant` | string | optional | Tenant identifier |
| `data-token` | string | optional | Access token for private publications |
| `data-width` | string | `"100%"` | Iframe width |
| `data-height` | string | `"600px"` | Initial iframe height |
| `data-border` | boolean | `false` | Show border around iframe |
| `data-lazy` | boolean | `true` | Enable lazy loading |
| `data-analytics` | boolean | `true` | Track views |

### Programmatic API

For dynamic embeds or advanced control:

```html
<script src="https://cdn.teei.io/embed.js"></script>
<div id="embed-container"></div>

<script>
  const embed = TEEIEmbed.create({
    slug: 'impact-2024-q1',
    tenant: 'acme-corp',
    token: 'pub_abc123...', // optional
    width: '100%',
    height: '800px',
    border: true,
    lazy: true,
    analytics: true,
    targetElement: '#embed-container'
  });

  // Control embed
  embed.reload();
  embed.updateHeight(1000);
  embed.destroy();
</script>
```

## Private Publications

If your publication has `visibility: "TOKEN"`, you must provide a token:

1. **Generate token** via API or Admin UI:
   ```bash
   POST /publications/{id}/tokens
   { "label": "Website embed", "expires_in_days": 90 }
   ```

2. **Include token** in embed:
   ```html
   <script data-slug="private-report" data-token="pub_abc123..."></script>
   ```

## Auto-Resizing

Embeds automatically resize to fit content using postMessage:

```js
// Iframe sends height to parent
window.parent.postMessage({
  type: 'teei:resize',
  height: 1200,
  slug: 'impact-2024-q1'
}, '*');

// Parent updates iframe height
iframe.style.height = '1200px';
```

**No configuration needed!** Works out of the box.

## CSP Configuration

If your site uses Content Security Policy, add these directives:

```http
Content-Security-Policy:
  frame-src https://trust.teei.io;
  script-src https://cdn.teei.io;
  connect-src https://api.teei.io;
```

For development:
```http
Content-Security-Policy:
  frame-src http://localhost:4322;
  script-src http://localhost:4322;
  connect-src http://localhost:3000;
```

## Lazy Loading

Embeds use native lazy loading when supported:

```html
<iframe loading="lazy" ...></iframe>
```

To disable:
```html
<script data-slug="..." data-lazy="false"></script>
```

## Analytics

Embeds automatically track:
- Views (anonymized)
- Referrer domain
- View duration
- Embed domain

Tracked via Beacon API (non-blocking):

```js
navigator.sendBeacon('/public/publications/:slug/view', JSON.stringify({
  is_embed: true,
  embed_domain: 'acme.com'
}));
```

To disable:
```html
<script data-slug="..." data-analytics="false"></script>
```

## Styling

### Container Styling

Target the auto-generated container:

```css
.teei-embed-container {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.teei-embed-container iframe {
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

### Custom Target Element

Provide your own container:

```html
<div id="my-embed" class="custom-container"></div>
<script>
  TEEIEmbed.create({
    slug: 'impact-2024-q1',
    targetElement: '#my-embed'
  });
</script>
```

## Multiple Embeds

Embed multiple publications on one page:

```html
<script src="https://cdn.teei.io/embed.js"
        data-slug="impact-2024-q1">
</script>

<script src="https://cdn.teei.io/embed.js"
        data-slug="impact-2024-q2">
</script>

<script src="https://cdn.teei.io/embed.js"
        data-slug="impact-2024-q3">
</script>
```

Each embed is independent and auto-resizes individually.

## Error Handling

Embeds gracefully handle errors:

### Publication Not Found
```html
<!-- Iframe shows error message -->
<div class="error">
  <h1>Publication not found</h1>
  <p>The publication doesn't exist or has been removed.</p>
</div>
```

### Token Required
```html
<div class="error">
  <h1>Token required</h1>
  <p>This publication requires a valid access token.</p>
</div>
```

### Invalid Token
```html
<div class="error">
  <h1>Invalid or expired token</h1>
  <p>Please contact the publication owner.</p>
</div>
```

## Browser Support

- ✅ Chrome/Edge (latest 2 versions)
- ✅ Firefox (latest 2 versions)
- ✅ Safari (latest 2 versions)
- ✅ iOS Safari 12+
- ✅ Android Chrome 90+

### Polyfills

None required! All features use standard web APIs.

## Performance

### Optimization Tips

1. **Use CDN**: Leverage edge caching
2. **Enable lazy loading**: Defer loading until visible
3. **Set initial height**: Reduce layout shift
4. **Preconnect**: Add DNS prefetch

```html
<link rel="dns-prefetch" href="https://trust.teei.io">
<link rel="preconnect" href="https://cdn.teei.io">
```

### Expected Performance

- First render: **≤600ms**
- Auto-resize: **<50ms**
- Analytics beacon: **non-blocking**

## Troubleshooting

### Embed not appearing

1. Check browser console for errors
2. Verify script loaded: `window.TEEIEmbed`
3. Check slug is correct
4. Verify publication is LIVE

```js
console.log(window.TEEIEmbed); // Should be defined
```

### Not resizing

1. Check CSP allows postMessage
2. Verify origin in allowed list
3. Check ResizeObserver support

```js
console.log('ResizeObserver' in window); // Should be true
```

### Token not working

1. Verify token in URL query param
2. Check token not expired
3. Ensure token matches publication

### Analytics not tracking

1. Check Beacon API support
2. Verify CORS headers
3. Check ad blocker settings

```js
console.log('sendBeacon' in navigator); // Should be true
```

## Security

### Origin Verification

The SDK only accepts messages from trusted origins:
- `https://trust.teei.io`
- `https://trust.teei.com`
- `http://localhost:4321` (dev)

### Token Security

- **Never expose** tokens client-side for sensitive publications
- **Rotate tokens** periodically
- **Revoke tokens** when no longer needed
- **Set expiration** (e.g., 90 days)

### XSS Protection

- All content is **sanitized server-side**
- No inline scripts in iframe
- **CSP-compliant** embedding

## Examples

### Basic Embed

```html
<!DOCTYPE html>
<html>
<head>
  <title>Our Impact</title>
</head>
<body>
  <h1>Our Social Impact</h1>
  <script src="https://cdn.teei.io/embed.js"
          data-slug="impact-2024-q1">
  </script>
</body>
</html>
```

### With Custom Styling

```html
<style>
  .impact-section {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
  .teei-embed-container {
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
  }
</style>

<div class="impact-section">
  <h1>Q1 2024 Impact Report</h1>
  <script src="https://cdn.teei.io/embed.js"
          data-slug="impact-2024-q1">
  </script>
</div>
```

### Programmatic with Callbacks

```html
<div id="embed"></div>
<button id="reload">Reload</button>

<script src="https://cdn.teei.io/embed.js"></script>
<script>
  const embed = TEEIEmbed.create({
    slug: 'impact-2024-q1',
    targetElement: '#embed',
    analytics: true
  });

  document.getElementById('reload').addEventListener('click', () => {
    embed.reload();
  });
</script>
```

### Multiple Embeds with Tabs

```html
<div class="tabs">
  <button onclick="showEmbed('q1')">Q1</button>
  <button onclick="showEmbed('q2')">Q2</button>
  <button onclick="showEmbed('q3')">Q3</button>
</div>

<div id="embed-q1"></div>
<div id="embed-q2" style="display:none;"></div>
<div id="embed-q3" style="display:none;"></div>

<script src="https://cdn.teei.io/embed.js"></script>
<script>
  const embeds = {
    q1: TEEIEmbed.create({ slug: 'impact-2024-q1', targetElement: '#embed-q1' }),
    q2: TEEIEmbed.create({ slug: 'impact-2024-q2', targetElement: '#embed-q2' }),
    q3: TEEIEmbed.create({ slug: 'impact-2024-q3', targetElement: '#embed-q3' })
  };

  function showEmbed(quarter) {
    Object.keys(embeds).forEach(q => {
      document.getElementById(`embed-${q}`).style.display = q === quarter ? 'block' : 'none';
    });
  }
</script>
```

## Best Practices

1. **Set initial height** to reduce layout shift
2. **Use lazy loading** for below-the-fold embeds
3. **Enable analytics** to track engagement
4. **Set token expiration** for security
5. **Test on mobile** for responsive behavior
6. **Add preconnect** for faster loading
7. **Monitor performance** with Web Vitals

## Support

Need help? Contact us:
- Docs: https://docs.teei.io/embed
- Email: embed@teei.io
- GitHub: https://github.com/teei-platform/embed-sdk/issues
