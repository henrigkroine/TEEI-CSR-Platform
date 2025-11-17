/**
 * TEEI Public Impact Pages Embed SDK
 *
 * Vanilla JavaScript SDK for embedding public impact pages in any website.
 * Zero dependencies, CSP-safe, responsive iframe with auto-height.
 *
 * Usage:
 * <script src="https://cdn.teei.io/embeds/embed.js"
 *   data-slug="my-impact-page"
 *   data-tenant="company-uuid"
 *   data-token="optional-access-token"
 *   data-theme="auto"
 *   data-show-header="true"
 *   data-show-footer="false">
 * </script>
 *
 * Ref: Worker 19 § Embed SDK
 */

(function () {
  'use strict';

  // Configuration
  const CONFIG = {
    baseUrl: 'https://api.teei.io', // Override via data-base-url
    allowedOrigins: ['https://api.teei.io', 'http://localhost:3000'], // CSP-safe origins
    messagePrefix: 'teei-embed:', // postMessage namespace
  };

  // Get current script element
  const currentScript = document.currentScript || document.querySelector('script[data-slug]');

  if (!currentScript) {
    console.error('[TEEI Embed] Could not find script element. Ensure data-slug attribute is set.');
    return;
  }

  // Parse configuration from script attributes
  const slug = currentScript.getAttribute('data-slug');
  const tenantId = currentScript.getAttribute('data-tenant');
  const token = currentScript.getAttribute('data-token');
  const theme = currentScript.getAttribute('data-theme') || 'auto';
  const showHeader = currentScript.getAttribute('data-show-header') !== 'false';
  const showFooter = currentScript.getAttribute('data-show-footer') === 'true';
  const baseUrl = currentScript.getAttribute('data-base-url') || CONFIG.baseUrl;
  const containerId = currentScript.getAttribute('data-container-id') || 'teei-embed-container';

  // Validate required attributes
  if (!slug) {
    console.error('[TEEI Embed] Missing required attribute: data-slug');
    return;
  }

  // Build iframe URL
  const iframeUrl = new URL(`${baseUrl}/embed/${slug}`);
  if (tenantId) iframeUrl.searchParams.set('tenantId', tenantId);
  if (token) iframeUrl.searchParams.set('token', token);
  iframeUrl.searchParams.set('theme', theme);
  iframeUrl.searchParams.set('showHeader', showHeader.toString());
  iframeUrl.searchParams.set('showFooter', showFooter.toString());
  iframeUrl.searchParams.set('embedded', 'true');

  // Create container element
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.className = 'teei-embed-container';

    // Insert container after the script element
    if (currentScript.parentNode) {
      currentScript.parentNode.insertBefore(container, currentScript.nextSibling);
    } else {
      document.body.appendChild(container);
    }
  }

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = iframeUrl.toString();
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('scrolling', 'no');
  iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
  iframe.style.width = '100%';
  iframe.style.border = 'none';
  iframe.style.display = 'block';
  iframe.style.overflow = 'hidden';
  iframe.style.minHeight = '400px'; // Initial height

  // Add loading indicator
  const loader = document.createElement('div');
  loader.className = 'teei-embed-loader';
  loader.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #64748b;
    ">
      <div style="text-align: center;">
        <div style="
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: teei-spin 0.8s linear infinite;
          margin: 0 auto 16px;
        "></div>
        <p style="margin: 0; font-size: 14px;">Loading impact page...</p>
      </div>
    </div>
    <style>
      @keyframes teei-spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;

  container.appendChild(loader);

  // Error handler
  function showError(message) {
    container.innerHTML = `
      <div style="
        border: 1px solid #fecaca;
        background-color: #fef2f2;
        border-radius: 8px;
        padding: 16px;
        margin: 16px 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      ">
        <p style="
          margin: 0;
          color: #dc2626;
          font-size: 14px;
          font-weight: 500;
        ">
          ⚠️ Failed to load impact page
        </p>
        <p style="
          margin: 8px 0 0;
          color: #991b1b;
          font-size: 13px;
        ">
          ${message}
        </p>
      </div>
    `;
  }

  // Handle postMessage for height updates
  function handleMessage(event) {
    // Verify origin (CSP-safe)
    const allowedOrigin = CONFIG.allowedOrigins.some((origin) => event.origin === origin);
    if (!allowedOrigin && !event.origin.includes('localhost') && !event.origin.includes('teei.io')) {
      console.warn('[TEEI Embed] Ignored message from untrusted origin:', event.origin);
      return;
    }

    // Verify message format
    if (typeof event.data !== 'string' || !event.data.startsWith(CONFIG.messagePrefix)) {
      return;
    }

    try {
      const data = JSON.parse(event.data.replace(CONFIG.messagePrefix, ''));

      // Handle height update
      if (data.type === 'resize' && data.height) {
        iframe.style.height = `${data.height}px`;
        iframe.style.minHeight = '0';
      }

      // Handle error
      if (data.type === 'error' && data.message) {
        showError(data.message);
      }

      // Handle loaded event
      if (data.type === 'loaded') {
        // Remove loader
        if (loader && loader.parentNode) {
          loader.parentNode.removeChild(loader);
        }

        // Append iframe
        if (!iframe.parentNode) {
          container.appendChild(iframe);
        }
      }
    } catch (error) {
      console.error('[TEEI Embed] Failed to parse message:', error);
    }
  }

  // Listen for postMessage events
  window.addEventListener('message', handleMessage);

  // Handle iframe load
  iframe.addEventListener('load', function () {
    // Send initial ready message
    iframe.contentWindow.postMessage(
      CONFIG.messagePrefix + JSON.stringify({ type: 'ready' }),
      iframeUrl.origin
    );
  });

  // Handle iframe error
  iframe.addEventListener('error', function () {
    showError('Network error. Please check your connection and try again.');
  });

  // Set timeout for loading
  const loadTimeout = setTimeout(function () {
    if (loader && loader.parentNode) {
      showError('Request timed out. Please try again later.');
    }
  }, 15000); // 15s timeout

  // Clear timeout on load
  iframe.addEventListener('load', function () {
    clearTimeout(loadTimeout);
  });

  // Cleanup on unload
  window.addEventListener('beforeunload', function () {
    window.removeEventListener('message', handleMessage);
  });

  // Expose API for programmatic control
  window.TEEIEmbed = window.TEEIEmbed || {};
  window.TEEIEmbed[slug] = {
    reload: function () {
      iframe.src = iframe.src; // Reload iframe
    },
    destroy: function () {
      window.removeEventListener('message', handleMessage);
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    },
    getContainer: function () {
      return container;
    },
    getIframe: function () {
      return iframe;
    },
  };

  console.log('[TEEI Embed] Initialized for slug:', slug);
})();
