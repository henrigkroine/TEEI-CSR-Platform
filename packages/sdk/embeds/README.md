# TEEI Impact Publication Embed SDK

Secure, responsive iframe embeds for TEEI public impact pages.

## Installation

### CDN (Recommended)

```html
<script src="https://cdn.teei.io/embed.js"
        data-slug="impact-2024-q1"
        data-tenant="acme-corp">
</script>
```

### NPM

```bash
npm install @teei/embed-sdk
```

```js
import { TEEIEmbed } from '@teei/embed-sdk';

TEEIEmbed.create({
  slug: 'impact-2024-q1',
  tenant: 'acme-corp',
});
```

## Usage

### Basic Embed

```html
<script src="https://cdn.teei.io/embed.js" data-slug="my-impact-page"></script>
```

### With Token (Private Publications)

```html
<script src="https://cdn.teei.io/embed.js"
        data-slug="private-report"
        data-token="pub_abc123...">
</script>
```

### Programmatic

```js
const embed = TEEIEmbed.create({
  slug: 'impact-2024-q1',
  tenant: 'acme-corp',
  token: 'pub_...', // optional
  width: '100%',
  height: '800px',
  border: true,
  lazy: true,
  analytics: true,
  targetElement: '#embed-container'
});

// Later...
embed.destroy();
embed.reload();
embed.updateHeight(1000);
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `slug` | string | **required** | Publication slug |
| `tenant` | string | optional | Tenant identifier |
| `token` | string | optional | Access token for private publications |
| `width` | string | `'100%'` | Iframe width |
| `height` | string | `'600px'` | Iframe initial height |
| `border` | boolean | `false` | Show border around iframe |
| `lazy` | boolean | `true` | Enable lazy loading |
| `analytics` | boolean | `true` | Track views |
| `targetElement` | HTMLElement\|string | auto | Target container |

## Features

- **Auto-resizing**: Iframe height adjusts to content via postMessage
- **CSP-safe**: No inline scripts, origin verification
- **Analytics**: Beacon API tracking (anonymized)
- **Lazy loading**: Defer loading until visible
- **Responsive**: Mobile-friendly, 100% width by default
- **Error handling**: Graceful fallbacks

## Security

- Origin verification for postMessage
- Token-based access for private publications
- XSS sanitization on server side
- CSP-compliant (no eval, no inline scripts)

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- iOS Safari 12+
- Android Chrome 90+

## License

MIT
