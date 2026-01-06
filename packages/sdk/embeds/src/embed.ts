/**
 * TEEI Impact Publication Embed SDK - Worker 19
 *
 * Lightweight JavaScript SDK for embedding public impact pages
 * via secure, responsive iframes with CSP-safe origin checks.
 *
 * Features:
 * - Auto-resizing iframe via postMessage
 * - CSP-safe (no inline scripts, origin verification)
 * - Analytics beacon integration
 * - Lazy loading support
 * - Error handling and fallbacks
 *
 * Usage:
 * ```html
 * <script src="https://cdn.teei.io/embed.js" data-slug="impact-2024-q1" data-tenant="acme-corp"></script>
 * ```
 *
 * Or programmatic:
 * ```js
 * TEEIEmbed.create({
 *   slug: 'impact-2024-q1',
 *   tenant: 'acme-corp',
 *   token: 'pub_...' // optional for private publications
 * });
 * ```
 *
 * @module embed
 */

export interface EmbedConfig {
  slug: string;
  tenant?: string;
  token?: string;
  width?: string;
  height?: string;
  border?: boolean;
  lazy?: boolean;
  analytics?: boolean;
  targetElement?: HTMLElement | string;
}

export interface EmbedInstance {
  iframe: HTMLIFrameElement;
  container: HTMLElement;
  destroy: () => void;
  reload: () => void;
  updateHeight: (height: number) => void;
}

interface MessagePayload {
  type: string;
  height?: number;
  slug?: string;
  [key: string]: any;
}

/**
 * TEEI Embed SDK
 */
export class TEEIEmbed {
  private static instances: Map<string, EmbedInstance> = new Map();
  private static messageListener: ((event: MessageEvent) => void) | null = null;
  private static allowedOrigins = [
    'https://trust.teei.io',
    'https://trust.teei.com',
    'http://localhost:3000', // dev
    'http://localhost:4321', // astro dev
  ];

  /**
   * Create an embed instance
   */
  static create(config: EmbedConfig): EmbedInstance | null {
    try {
      // Validate config
      if (!config.slug) {
        console.error('[TEEIEmbed] Slug is required');
        return null;
      }

      // Resolve target element
      let container: HTMLElement | null = null;
      if (config.targetElement) {
        if (typeof config.targetElement === 'string') {
          container = document.querySelector(config.targetElement);
        } else {
          container = config.targetElement;
        }
      } else {
        // Auto-detect script tag and insert after
        const scripts = document.querySelectorAll('script[data-slug]');
        const scriptTag = Array.from(scripts).find(s => s.getAttribute('data-slug') === config.slug);
        if (scriptTag && scriptTag.parentElement) {
          container = document.createElement('div');
          container.className = 'teei-embed-container';
          scriptTag.parentElement.insertBefore(container, scriptTag.nextSibling);
        }
      }

      if (!container) {
        console.error('[TEEIEmbed] Could not resolve target container');
        return null;
      }

      // Build iframe URL
      const baseUrl = this.getBaseUrl();
      const url = new URL(`${baseUrl}/impact/${config.slug}`);
      if (config.token) {
        url.searchParams.set('token', config.token);
      }
      url.searchParams.set('embed', '1');

      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.src = url.toString();
      iframe.style.width = config.width || '100%';
      iframe.style.height = config.height || '600px';
      iframe.style.border = config.border ? '1px solid #e5e7eb' : 'none';
      iframe.style.borderRadius = '8px';
      iframe.style.display = 'block';
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('scrolling', 'auto');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('title', `TEEI Impact Publication: ${config.slug}`);

      // Lazy loading if supported
      if (config.lazy !== false && 'loading' in iframe) {
        iframe.setAttribute('loading', 'lazy');
      }

      // Append iframe
      container.appendChild(iframe);

      // Setup message listener
      this.setupMessageListener();

      // Create instance
      const instance: EmbedInstance = {
        iframe,
        container,
        destroy: () => this.destroy(config.slug),
        reload: () => {
          iframe.src = iframe.src; // Force reload
        },
        updateHeight: (height: number) => {
          iframe.style.height = `${height}px`;
        },
      };

      this.instances.set(config.slug, instance);

      // Track analytics (beacon)
      if (config.analytics !== false) {
        this.trackView(config.slug, baseUrl);
      }

      console.log(`[TEEIEmbed] Created embed for ${config.slug}`);
      return instance;
    } catch (error) {
      console.error('[TEEIEmbed] Failed to create embed:', error);
      return null;
    }
  }

  /**
   * Destroy an embed instance
   */
  static destroy(slug: string): void {
    const instance = this.instances.get(slug);
    if (instance) {
      instance.iframe.remove();
      this.instances.delete(slug);
      console.log(`[TEEIEmbed] Destroyed embed for ${slug}`);
    }
  }

  /**
   * Destroy all embeds
   */
  static destroyAll(): void {
    this.instances.forEach((_, slug) => this.destroy(slug));
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
  }

  /**
   * Setup postMessage listener for iframe communication
   */
  private static setupMessageListener(): void {
    if (this.messageListener) return; // Already setup

    this.messageListener = (event: MessageEvent) => {
      // Verify origin
      if (!this.allowedOrigins.includes(event.origin)) {
        console.warn(`[TEEIEmbed] Ignoring message from untrusted origin: ${event.origin}`);
        return;
      }

      try {
        const message: MessagePayload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        switch (message.type) {
          case 'teei:resize':
            if (message.height && message.slug) {
              const instance = this.instances.get(message.slug);
              if (instance) {
                instance.updateHeight(message.height);
              }
            }
            break;

          case 'teei:ready':
            console.log(`[TEEIEmbed] Iframe ready: ${message.slug}`);
            break;

          case 'teei:error':
            console.error(`[TEEIEmbed] Iframe error:`, message);
            break;

          default:
            console.log(`[TEEIEmbed] Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error('[TEEIEmbed] Failed to process message:', error);
      }
    };

    window.addEventListener('message', this.messageListener);
  }

  /**
   * Track view via beacon API
   */
  private static trackView(slug: string, baseUrl: string): void {
    try {
      const url = `${baseUrl}/public/publications/${slug}/view`;
      const payload = JSON.stringify({
        is_embed: true,
        embed_domain: window.location.hostname,
      });

      // Use Beacon API for reliable tracking
      if ('sendBeacon' in navigator) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      } else {
        // Fallback to fetch (non-blocking)
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(err => {
          console.warn('[TEEIEmbed] Analytics tracking failed:', err);
        });
      }
    } catch (error) {
      console.warn('[TEEIEmbed] Analytics tracking error:', error);
    }
  }

  /**
   * Get base URL based on environment
   */
  private static getBaseUrl(): string {
    // In production, use trust.teei.io
    // In dev, detect from script src or default to localhost
    const scriptTag = document.querySelector('script[src*="embed.js"]');
    if (scriptTag) {
      const src = scriptTag.getAttribute('src');
      if (src) {
        const url = new URL(src, window.location.href);
        return `${url.protocol}//${url.host}`;
      }
    }

    // Default based on environment
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:4321';
    }

    return 'https://trust.teei.io';
  }

  /**
   * Auto-initialize from script tags with data attributes
   */
  static autoInit(): void {
    const scripts = document.querySelectorAll('script[data-slug]');
    scripts.forEach((script) => {
      const slug = script.getAttribute('data-slug');
      const tenant = script.getAttribute('data-tenant');
      const token = script.getAttribute('data-token');
      const width = script.getAttribute('data-width');
      const height = script.getAttribute('data-height');
      const border = script.getAttribute('data-border') === 'true';

      if (slug) {
        this.create({
          slug,
          tenant: tenant || undefined,
          token: token || undefined,
          width: width || undefined,
          height: height || undefined,
          border,
        });
      }
    });
  }
}

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TEEIEmbed.autoInit());
  } else {
    TEEIEmbed.autoInit();
  }

  // Expose to global scope
  (window as any).TEEIEmbed = TEEIEmbed;
}

// Export for module usage
export default TEEIEmbed;
