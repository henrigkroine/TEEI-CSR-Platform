/**
 * TEEI Impact Embed SDK
 *
 * Usage:
 * <script src="https://cdn.teei.io/embed.js" data-slug="your-slug" data-tenant="tenant-id"></script>
 *
 * Or programmatically:
 * <div id="teei-embed"></div>
 * <script>
 *   TEEIEmbed.render({
 *     containerId: 'teei-embed',
 *     slug: 'your-slug',
 *     tenantId: 'tenant-id',
 *     token: 'optional-token'
 *   });
 * </script>
 */

(function (window, document) {
  'use strict';

  const TRUST_CENTER_URL = 'https://trust.teei.io'; // Production URL
  const ALLOWED_ORIGINS = [TRUST_CENTER_URL, 'http://localhost:4322']; // CSP-safe origins

  /**
   * TEEI Embed class
   */
  class TEEIEmbed {
    constructor(options) {
      this.options = {
        containerId: options.containerId || 'teei-embed',
        slug: options.slug,
        tenantId: options.tenantId,
        token: options.token,
        height: options.height || 'auto',
        width: options.width || '100%',
        loading: options.loading !== false, // Show loading spinner by default
        onLoad: options.onLoad || null,
        onError: options.onError || null,
      };

      this.iframe = null;
      this.container = null;
      this.messageListener = null;

      this.validate();
      this.render();
    }

    /**
     * Validate required options
     */
    validate() {
      if (!this.options.slug) {
        throw new Error('TEEI Embed: "slug" is required');
      }
    }

    /**
     * Render the embed
     */
    render() {
      this.container = document.getElementById(this.options.containerId);

      if (!this.container) {
        throw new Error(`TEEI Embed: Container with id "${this.options.containerId}" not found`);
      }

      // Build iframe URL
      const url = this.buildIframeUrl();

      // Create loading spinner
      if (this.options.loading) {
        this.showLoading();
      }

      // Create iframe
      this.iframe = document.createElement('iframe');
      this.iframe.src = url;
      this.iframe.style.width = this.options.width;
      this.iframe.style.height = this.options.height === 'auto' ? '600px' : this.options.height;
      this.iframe.style.border = 'none';
      this.iframe.style.display = 'block';
      this.iframe.setAttribute('title', 'TEEI Impact Page');
      this.iframe.setAttribute('loading', 'lazy');
      this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');

      // Listen for iframe messages (for height adjustment)
      this.setupMessageListener();

      // Handle iframe load
      this.iframe.onload = () => {
        this.hideLoading();
        if (this.options.onLoad) {
          this.options.onLoad(this.iframe);
        }
      };

      // Handle iframe error
      this.iframe.onerror = () => {
        this.hideLoading();
        this.showError('Failed to load impact page');
        if (this.options.onError) {
          this.options.onError(new Error('Failed to load iframe'));
        }
      };

      // Append iframe to container
      this.container.appendChild(this.iframe);
    }

    /**
     * Build iframe URL
     */
    buildIframeUrl() {
      const url = new URL(`/impact/${this.options.slug}`, TRUST_CENTER_URL);

      if (this.options.token) {
        url.searchParams.set('token', this.options.token);
      }

      // Add embed flag for analytics
      url.searchParams.set('embed', '1');

      return url.toString();
    }

    /**
     * Setup message listener for iframe communication
     */
    setupMessageListener() {
      this.messageListener = (event) => {
        // Verify origin for security
        if (!ALLOWED_ORIGINS.includes(event.origin)) {
          console.warn('TEEI Embed: Ignoring message from untrusted origin:', event.origin);
          return;
        }

        // Handle height adjustment
        if (event.data && event.data.type === 'teei-embed-height') {
          const height = event.data.height;
          if (this.iframe && typeof height === 'number' && height > 0) {
            this.iframe.style.height = `${height}px`;
          }
        }
      };

      window.addEventListener('message', this.messageListener);
    }

    /**
     * Show loading spinner
     */
    showLoading() {
      const loader = document.createElement('div');
      loader.id = 'teei-embed-loader';
      loader.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          background: #f9fafb;
          border-radius: 8px;
        ">
          <div style="
            width: 40px;
            height: 40px;
            border: 4px solid #e5e7eb;
            border-top-color: #0ea5e9;
            border-radius: 50%;
            animation: teei-spin 1s linear infinite;
          "></div>
        </div>
        <style>
          @keyframes teei-spin {
            to { transform: rotate(360deg); }
          }
        </style>
      `;
      this.container.appendChild(loader);
    }

    /**
     * Hide loading spinner
     */
    hideLoading() {
      const loader = document.getElementById('teei-embed-loader');
      if (loader) {
        loader.remove();
      }
    }

    /**
     * Show error message
     */
    showError(message) {
      const error = document.createElement('div');
      error.innerHTML = `
        <div style="
          padding: 20px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #991b1b;
          text-align: center;
        ">
          <p style="margin: 0; font-weight: 600;">Failed to load impact page</p>
          <p style="margin: 8px 0 0; font-size: 14px;">${message}</p>
        </div>
      `;
      this.container.appendChild(error);
    }

    /**
     * Destroy the embed
     */
    destroy() {
      if (this.messageListener) {
        window.removeEventListener('message', this.messageListener);
      }

      if (this.iframe) {
        this.iframe.remove();
      }

      if (this.container) {
        this.container.innerHTML = '';
      }
    }

    /**
     * Static method to render an embed
     */
    static render(options) {
      return new TEEIEmbed(options);
    }
  }

  /**
   * Auto-initialize embeds from script tags
   */
  function autoInitialize() {
    const scripts = document.querySelectorAll('script[data-slug]');

    scripts.forEach((script, index) => {
      const slug = script.getAttribute('data-slug');
      const tenantId = script.getAttribute('data-tenant');
      const token = script.getAttribute('data-token');

      if (!slug) {
        console.error('TEEI Embed: data-slug attribute is required');
        return;
      }

      // Create container
      const containerId = `teei-embed-${index}`;
      const container = document.createElement('div');
      container.id = containerId;
      script.parentNode.insertBefore(container, script.nextSibling);

      // Render embed
      try {
        TEEIEmbed.render({
          containerId,
          slug,
          tenantId,
          token,
        });
      } catch (error) {
        console.error('TEEI Embed: Failed to initialize embed:', error);
      }
    });
  }

  // Export to global scope
  window.TEEIEmbed = TEEIEmbed;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitialize);
  } else {
    autoInitialize();
  }

})(window, document);
