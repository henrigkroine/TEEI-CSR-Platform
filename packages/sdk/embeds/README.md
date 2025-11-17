# TEEI Impact Embed SDK

Easily embed TEEI impact pages on your corporate website with a simple script tag.

## Installation

### Option 1: Script Tag (Recommended)

Add the following script tag to your HTML:

```html
<script
  src="https://cdn.teei.io/embed.js"
  data-slug="your-publication-slug"
  data-tenant="your-tenant-id"
></script>
```

For token-protected publications:

```html
<script
  src="https://cdn.teei.io/embed.js"
  data-slug="your-publication-slug"
  data-tenant="your-tenant-id"
  data-token="your-access-token"
></script>
```

### Option 2: Programmatic API

```html
<div id="teei-embed"></div>

<script src="https://cdn.teei.io/embed.js"></script>
<script>
  TEEIEmbed.render({
    containerId: 'teei-embed',
    slug: 'your-publication-slug',
    tenantId: 'your-tenant-id',
    token: 'optional-access-token',
    width: '100%',
    height: 'auto',
    onLoad: function(iframe) {
      console.log('Embed loaded!', iframe);
    },
    onError: function(error) {
      console.error('Embed failed:', error);
    }
  });
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `containerId` | string | `'teei-embed'` | ID of the container element |
| `slug` | string | **required** | Publication slug |
| `tenantId` | string | optional | Tenant ID for multi-tenant setups |
| `token` | string | optional | Access token for TOKEN-protected publications |
| `width` | string | `'100%'` | Width of the iframe |
| `height` | string | `'auto'` | Height of the iframe (auto-adjusts via postMessage) |
| `loading` | boolean | `true` | Show loading spinner |
| `onLoad` | function | `null` | Callback when embed loads successfully |
| `onError` | function | `null` | Callback when embed fails to load |

## Examples

### Basic Public Publication

```html
<script
  src="https://cdn.teei.io/embed.js"
  data-slug="2024-impact-report"
></script>
```

### Token-Protected Publication

```html
<script
  src="https://cdn.teei.io/embed.js"
  data-slug="partner-metrics-q4"
  data-token="abc123xyz789"
></script>
```

### Custom Styling Container

```html
<div style="max-width: 1200px; margin: 0 auto; padding: 20px;">
  <div id="my-impact-embed"></div>
</div>

<script src="https://cdn.teei.io/embed.js"></script>
<script>
  TEEIEmbed.render({
    containerId: 'my-impact-embed',
    slug: '2024-impact-report',
    width: '100%',
    height: '800px'
  });
</script>
```

### Responsive Embed

The embed automatically adjusts its height based on content using `postMessage` communication.

```html
<div class="responsive-container">
  <script
    src="https://cdn.teei.io/embed.js"
    data-slug="2024-impact-report"
  ></script>
</div>

<style>
  .responsive-container {
    max-width: 100%;
    margin: 0 auto;
  }
</style>
```

## Security

- **CSP-Safe**: The embed uses strict Content Security Policy checks
- **Origin Validation**: Only accepts messages from trusted TEEI domains
- **Token Validation**: Token-protected publications require valid access tokens
- **Sandboxed iframes**: Uses `sandbox` attribute for additional security

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- iOS Safari (latest 2 versions)

## Performance

- **Lazy Loading**: iframes use `loading="lazy"` attribute
- **First Render**: Target < 600ms from script load to first paint
- **Auto Height**: Dynamic height adjustment prevents layout shifts

## Troubleshooting

### Embed not showing

1. Check browser console for errors
2. Verify `data-slug` attribute is correct
3. Ensure publication is in `LIVE` status
4. For TOKEN visibility, provide valid `data-token`

### Height not adjusting

The embed uses `postMessage` to communicate height changes. Ensure:

1. Your site's CSP allows `frame-src` from `trust.teei.io`
2. JavaScript is enabled
3. No browser extensions blocking postMessage

### Token errors

If you see "Invalid or missing access token":

1. Verify the token is correct
2. Check if token has expired
3. Rotate token in Cockpit if needed

## Support

For issues or questions:
- GitHub: https://github.com/teei/impact-embed/issues
- Email: support@teei.io
- Docs: https://docs.teei.io/embeds
