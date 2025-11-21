# Embed Integration Guide

Integrate TEEI Impact Pages into any website with zero dependencies.

---

## Vanilla HTML

### Basic Embed

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Our Impact Story</title>
</head>
<body>
  <h1>Our 2024 Impact</h1>

  <!-- TEEI Embed -->
  <script src="https://cdn.teei.io/embeds/embed.js"
    data-slug="q4-2024-impact"
    data-tenant="your-company-uuid"
    data-theme="auto">
  </script>
</body>
</html>
```

### Token-Gated Embed

```html
<script src="https://cdn.teei.io/embeds/embed.js"
  data-slug="board-report-2024"
  data-tenant="your-company-uuid"
  data-token="your-access-token"
  data-theme="light">
</script>
```

### Custom Container

```html
<div id="my-impact-container"></div>

<script src="https://cdn.teei.io/embeds/embed.js"
  data-slug="q4-2024-impact"
  data-tenant="your-company-uuid"
  data-container-id="my-impact-container">
</script>
```

---

## React

### Functional Component

```tsx
import React, { useEffect, useRef } from 'react';

interface TEEIEmbedProps {
  slug: string;
  tenantId: string;
  token?: string;
  theme?: 'auto' | 'light' | 'dark';
  showHeader?: boolean;
  showFooter?: boolean;
}

export function TEEIEmbed({
  slug,
  tenantId,
  token,
  theme = 'auto',
  showHeader = true,
  showFooter = false,
}: TEEIEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    // Create script element
    const script = document.createElement('script');
    script.src = 'https://cdn.teei.io/embeds/embed.js';
    script.setAttribute('data-slug', slug);
    script.setAttribute('data-tenant', tenantId);
    script.setAttribute('data-theme', theme);
    script.setAttribute('data-show-header', String(showHeader));
    script.setAttribute('data-show-footer', String(showFooter));
    script.setAttribute('data-container-id', `teei-embed-${slug}`);

    if (token) {
      script.setAttribute('data-token', token);
    }

    // Append to container
    if (containerRef.current) {
      containerRef.current.appendChild(script);
      scriptRef.current = script;
    }

    // Cleanup
    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }

      // Destroy embed instance
      if (window.TEEIEmbed && window.TEEIEmbed[slug]) {
        window.TEEIEmbed[slug].destroy();
      }
    };
  }, [slug, tenantId, token, theme, showHeader, showFooter]);

  return <div ref={containerRef} id={`teei-embed-${slug}`} />;
}

// Usage
export default function ImpactPage() {
  return (
    <div>
      <h1>Our Impact Story</h1>
      <TEEIEmbed
        slug="q4-2024-impact"
        tenantId="your-company-uuid"
        theme="auto"
      />
    </div>
  );
}
```

---

## Vue 3

### Composition API

```vue
<template>
  <div ref="containerRef" :id="`teei-embed-${slug}`"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

interface Props {
  slug: string;
  tenantId: string;
  token?: string;
  theme?: 'auto' | 'light' | 'dark';
  showHeader?: boolean;
  showFooter?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'auto',
  showHeader: true,
  showFooter: false,
});

const containerRef = ref<HTMLDivElement | null>(null);
let scriptElement: HTMLScriptElement | null = null;

const loadEmbed = () => {
  if (!containerRef.value) return;

  // Create script element
  const script = document.createElement('script');
  script.src = 'https://cdn.teei.io/embeds/embed.js';
  script.setAttribute('data-slug', props.slug);
  script.setAttribute('data-tenant', props.tenantId);
  script.setAttribute('data-theme', props.theme);
  script.setAttribute('data-show-header', String(props.showHeader));
  script.setAttribute('data-show-footer', String(props.showFooter));
  script.setAttribute('data-container-id', `teei-embed-${props.slug}`);

  if (props.token) {
    script.setAttribute('data-token', props.token);
  }

  containerRef.value.appendChild(script);
  scriptElement = script;
};

const unloadEmbed = () => {
  if (scriptElement && scriptElement.parentNode) {
    scriptElement.parentNode.removeChild(scriptElement);
  }

  // Destroy embed instance
  if (window.TEEIEmbed && window.TEEIEmbed[props.slug]) {
    window.TEEIEmbed[props.slug].destroy();
  }
};

onMounted(() => {
  loadEmbed();
});

onUnmounted(() => {
  unloadEmbed();
});

// Reload on prop changes
watch(() => [props.slug, props.tenantId, props.token], () => {
  unloadEmbed();
  loadEmbed();
});
</script>
```

### Usage

```vue
<template>
  <div>
    <h1>Our Impact Story</h1>
    <TEEIEmbed
      slug="q4-2024-impact"
      tenant-id="your-company-uuid"
      theme="auto"
    />
  </div>
</template>

<script setup>
import TEEIEmbed from '@/components/TEEIEmbed.vue';
</script>
```

---

## Next.js

### App Router (Next.js 13+)

```tsx
'use client';

import { useEffect, useRef } from 'react';

interface TEEIEmbedProps {
  slug: string;
  tenantId: string;
  token?: string;
  theme?: 'auto' | 'light' | 'dark';
}

export function TEEIEmbed({ slug, tenantId, token, theme = 'auto' }: TEEIEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://cdn.teei.io/embeds/embed.js';
    script.setAttribute('data-slug', slug);
    script.setAttribute('data-tenant', tenantId);
    script.setAttribute('data-theme', theme);
    script.setAttribute('data-container-id', `teei-embed-${slug}`);

    if (token) {
      script.setAttribute('data-token', token);
    }

    containerRef.current.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

      if (window.TEEIEmbed?.[slug]) {
        window.TEEIEmbed[slug].destroy();
      }
    };
  }, [slug, tenantId, token, theme]);

  return <div ref={containerRef} id={`teei-embed-${slug}`} />;
}
```

### Pages Router

```tsx
import dynamic from 'next/dynamic';

// Dynamically import to avoid SSR issues
const TEEIEmbed = dynamic(() => import('@/components/TEEIEmbed'), {
  ssr: false,
  loading: () => <div>Loading impact page...</div>,
});

export default function ImpactPage() {
  return (
    <div>
      <h1>Our Impact Story</h1>
      <TEEIEmbed slug="q4-2024-impact" tenantId="your-company-uuid" />
    </div>
  );
}
```

---

## WordPress

### Shortcode

Add to `functions.php`:

```php
<?php
function teei_impact_embed_shortcode($atts) {
    $atts = shortcode_atts(array(
        'slug' => '',
        'tenant' => '',
        'token' => '',
        'theme' => 'auto',
        'show_header' => 'true',
        'show_footer' => 'false',
    ), $atts);

    $slug = esc_attr($atts['slug']);
    $tenant = esc_attr($atts['tenant']);
    $token = esc_attr($atts['token']);
    $theme = esc_attr($atts['theme']);
    $show_header = esc_attr($atts['show_header']);
    $show_footer = esc_attr($atts['show_footer']);

    $token_attr = $token ? "data-token=\"$token\"" : '';

    return "
        <script src=\"https://cdn.teei.io/embeds/embed.js\"
          data-slug=\"$slug\"
          data-tenant=\"$tenant\"
          data-theme=\"$theme\"
          data-show-header=\"$show_header\"
          data-show-footer=\"$show_footer\"
          $token_attr>
        </script>
    ";
}
add_shortcode('teei_impact', 'teei_impact_embed_shortcode');
?>
```

### Usage in Posts/Pages

```
[teei_impact slug="q4-2024-impact" tenant="your-company-uuid"]
```

With token:

```
[teei_impact slug="board-report-2024" tenant="your-company-uuid" token="your-access-token"]
```

---

## Advanced Usage

### Programmatic Control

```javascript
// Access embed instance
const embed = window.TEEIEmbed['q4-2024-impact'];

// Reload embed
embed.reload();

// Destroy embed
embed.destroy();

// Get container element
const container = embed.getContainer();

// Get iframe element
const iframe = embed.getIframe();
```

### Custom Styling

```html
<style>
  .teei-embed-container {
    max-width: 1200px;
    margin: 0 auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    overflow: hidden;
  }
</style>

<script src="https://cdn.teei.io/embeds/embed.js"
  data-slug="q4-2024-impact"
  data-tenant="your-company-uuid">
</script>
```

### Error Handling

```javascript
// Listen for embed errors
window.addEventListener('message', function(event) {
  if (event.data && event.data.startsWith('teei-embed:')) {
    const data = JSON.parse(event.data.replace('teei-embed:', ''));

    if (data.type === 'error') {
      console.error('TEEI Embed Error:', data.message);
      // Show custom error UI
    }
  }
});
```

---

## CSP Configuration

If your site uses Content Security Policy, add these directives:

```
Content-Security-Policy:
  script-src 'self' https://cdn.teei.io;
  frame-src https://api.teei.io https://trust.teei.io;
  connect-src https://api.teei.io;
```

---

## Performance Optimization

### Lazy Loading

```html
<script>
  // Load embed when user scrolls to it
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const script = document.createElement('script');
        script.src = 'https://cdn.teei.io/embeds/embed.js';
        script.setAttribute('data-slug', 'q4-2024-impact');
        script.setAttribute('data-tenant', 'your-company-uuid');
        entry.target.appendChild(script);
        observer.unobserve(entry.target);
      }
    });
  });

  observer.observe(document.getElementById('teei-embed-lazy'));
</script>

<div id="teei-embed-lazy"></div>
```

### Preconnect

```html
<link rel="preconnect" href="https://cdn.teei.io">
<link rel="preconnect" href="https://api.teei.io">
```

---

## Troubleshooting

### Embed Not Appearing

1. Check browser console for errors
2. Verify `data-slug` and `data-tenant` attributes
3. Ensure publication status is `LIVE`
4. Check CSP policies

### Height Not Auto-Adjusting

1. Verify postMessage is allowed (CSP)
2. Check for iframe sandbox restrictions
3. Ensure `scrolling="no"` is set

### Token Authentication Failing

1. Verify token hasn't expired
2. Check token is correctly passed in `data-token`
3. Ensure token matches publication visibility

---

## Support

For integration help:
- **Docs**: https://docs.teei.io/publications/embed
- **Examples**: https://github.com/teei/embed-examples
- **Support**: support@teei.io
