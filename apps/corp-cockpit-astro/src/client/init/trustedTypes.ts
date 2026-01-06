/**
 * Trusted Types Policy - Worker 3 Phase D
 *
 * Implements Trusted Types for DOM XSS protection.
 * This policy enforces type safety for DOM manipulation,
 * preventing direct string assignment to dangerous sinks.
 *
 * Supported Browsers:
 * - Chrome 83+
 * - Edge 83+
 * - Not supported in Firefox (as of 2025)
 *
 * Spec: https://w3c.github.io/trusted-types/dist/spec/
 */

// Type definitions for Trusted Types (for TypeScript support)
interface TrustedHTML {
  readonly toString: () => string;
}

interface TrustedScript {
  readonly toString: () => string;
}

interface TrustedScriptURL {
  readonly toString: () => string;
}

interface TrustedTypePolicy {
  createHTML(input: string, ...args: any[]): TrustedHTML;
  createScript(input: string, ...args: any[]): TrustedScript;
  createScriptURL(input: string, ...args: any[]): TrustedScriptURL;
}

interface TrustedTypePolicyFactory {
  createPolicy(
    name: string,
    policy: Partial<{
      createHTML: (input: string, ...args: any[]) => string;
      createScript: (input: string, ...args: any[]) => string;
      createScriptURL: (input: string, ...args: any[]) => string;
    }>
  ): TrustedTypePolicy;
  isHTML(value: any): value is TrustedHTML;
  isScript(value: any): value is TrustedScript;
  isScriptURL(value: any): value is TrustedScriptURL;
  readonly emptyHTML: TrustedHTML;
  readonly emptyScript: TrustedScript;
}

declare global {
  interface Window {
    trustedTypes?: TrustedTypePolicyFactory;
  }
}

/**
 * Allowed script sources (whitelist)
 * Only scripts from these origins are permitted
 */
const ALLOWED_SCRIPT_ORIGINS = [
  window.location.origin,
  // Add other trusted origins here if needed
  // 'https://cdn.teei.io',
];

/**
 * Allowed URL protocols
 */
const ALLOWED_PROTOCOLS = ['https:', 'wss:', 'data:', 'blob:'];

/**
 * Dangerous patterns in HTML that should be blocked
 */
const DANGEROUS_HTML_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi, // Event handlers
  /javascript:/gi, // javascript: protocol
];

/**
 * Sanitize HTML string by removing dangerous patterns
 *
 * Note: This is a basic sanitizer. For production use with
 * untrusted user input, use DOMPurify library instead.
 *
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string
 */
function sanitizeHTML(html: string): string {
  let sanitized = html;

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove inline event handlers
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');

  // Remove data: URIs in dangerous contexts (except images)
  sanitized = sanitized.replace(
    /<(?!img\b)[^>]+\s+src\s*=\s*["']data:[^"']*["']/gi,
    ''
  );

  return sanitized;
}

/**
 * Validate script source URL
 *
 * @param url - Script URL to validate
 * @returns True if URL is from allowed origin
 */
function isAllowedScriptURL(url: string): boolean {
  try {
    const parsedURL = new URL(url, window.location.origin);

    // Check if origin is allowed
    if (!ALLOWED_SCRIPT_ORIGINS.includes(parsedURL.origin)) {
      console.error('[Trusted Types] Blocked script from untrusted origin:', parsedURL.origin);
      return false;
    }

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(parsedURL.protocol)) {
      console.error('[Trusted Types] Blocked script with disallowed protocol:', parsedURL.protocol);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Trusted Types] Invalid script URL:', url, error);
    return false;
  }
}

/**
 * Validate and sanitize script content
 *
 * @param script - Script content to validate
 * @returns Sanitized script or empty string if dangerous
 */
function sanitizeScript(script: string): string {
  // Block eval and Function constructors
  if (/\beval\s*\(/.test(script) || /\bFunction\s*\(/.test(script)) {
    console.error('[Trusted Types] Blocked script with eval or Function constructor');
    return '';
  }

  // Block dangerous patterns
  if (/document\.write/.test(script)) {
    console.error('[Trusted Types] Blocked script with document.write');
    return '';
  }

  return script;
}

/**
 * Create and register the default Trusted Types policy
 *
 * This policy is used throughout the application for DOM manipulation.
 */
export function initializeTrustedTypes(): TrustedTypePolicy | null {
  // Check if Trusted Types is supported
  if (!window.trustedTypes) {
    console.warn(
      '[Trusted Types] Not supported in this browser. Falling back to regular strings.'
    );
    return null;
  }

  try {
    // Create default policy
    const policy = window.trustedTypes.createPolicy('default', {
      /**
       * Create Trusted HTML
       *
       * Used for: innerHTML, outerHTML, insertAdjacentHTML, etc.
       */
      createHTML: (input: string): string => {
        // For empty strings, return as-is
        if (!input || input.trim() === '') {
          return '';
        }

        // Check for dangerous patterns
        for (const pattern of DANGEROUS_HTML_PATTERNS) {
          if (pattern.test(input)) {
            console.error('[Trusted Types] Blocked dangerous HTML pattern:', input.substring(0, 100));
            return '';
          }
        }

        // Sanitize HTML
        const sanitized = sanitizeHTML(input);

        // Log sanitization if content changed
        if (sanitized !== input) {
          console.warn('[Trusted Types] Sanitized HTML input');
        }

        return sanitized;
      },

      /**
       * Create Trusted Script
       *
       * Used for: script.text, script.textContent, etc.
       */
      createScript: (input: string): string => {
        // For empty strings, return as-is
        if (!input || input.trim() === '') {
          return '';
        }

        // Sanitize script content
        const sanitized = sanitizeScript(input);

        // Log if script was blocked
        if (sanitized === '' && input !== '') {
          console.error('[Trusted Types] Blocked dangerous script content');
        }

        return sanitized;
      },

      /**
       * Create Trusted Script URL
       *
       * Used for: script.src, worker URLs, etc.
       */
      createScriptURL: (input: string): string => {
        // For empty strings, return as-is
        if (!input || input.trim() === '') {
          return '';
        }

        // Validate script URL
        if (!isAllowedScriptURL(input)) {
          console.error('[Trusted Types] Blocked script URL from untrusted source:', input);
          return '';
        }

        return input;
      },
    });

    console.log('[Trusted Types] Default policy initialized successfully');
    return policy;
  } catch (error) {
    console.error('[Trusted Types] Failed to create policy:', error);
    return null;
  }
}

/**
 * Create a helper for safe DOM manipulation
 *
 * Usage:
 * ```typescript
 * import { safeSetHTML } from './trustedTypes';
 *
 * const element = document.getElementById('content');
 * safeSetHTML(element, '<p>Safe HTML content</p>');
 * ```
 */
export function safeSetHTML(element: HTMLElement | null, html: string): void {
  if (!element) {
    console.warn('[Trusted Types] Element is null, cannot set HTML');
    return;
  }

  if (window.trustedTypes) {
    try {
      // Get or create default policy
      let policy = initializeTrustedTypes();
      if (!policy) {
        // Fallback if policy creation failed
        element.innerHTML = html;
        return;
      }

      const trustedHTML = policy.createHTML(html);
      element.innerHTML = trustedHTML as any;
    } catch (error) {
      console.error('[Trusted Types] Failed to set trusted HTML:', error);
    }
  } else {
    // Fallback for browsers without Trusted Types support
    element.innerHTML = sanitizeHTML(html);
  }
}

/**
 * Create a helper for safe script loading
 *
 * Usage:
 * ```typescript
 * import { safeLoadScript } from './trustedTypes';
 *
 * safeLoadScript('/client/charts.js');
 * ```
 */
export function safeLoadScript(src: string, attributes: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.trustedTypes) {
      try {
        let policy = initializeTrustedTypes();
        if (!policy) {
          reject(new Error('Failed to create Trusted Types policy'));
          return;
        }

        const trustedURL = policy.createScriptURL(src);
        if (!trustedURL.toString()) {
          reject(new Error(`Script URL blocked by Trusted Types: ${src}`));
          return;
        }

        const script = document.createElement('script');
        script.src = trustedURL as any;

        // Add custom attributes
        for (const [key, value] of Object.entries(attributes)) {
          script.setAttribute(key, value);
        }

        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

        document.head.appendChild(script);
      } catch (error) {
        reject(error);
      }
    } else {
      // Fallback for browsers without Trusted Types
      if (!isAllowedScriptURL(src)) {
        reject(new Error(`Script URL not allowed: ${src}`));
        return;
      }

      const script = document.createElement('script');
      script.src = src;

      for (const [key, value] of Object.entries(attributes)) {
        script.setAttribute(key, value);
      }

      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

      document.head.appendChild(script);
    }
  });
}

/**
 * Check if value is Trusted HTML
 */
export function isTrustedHTML(value: any): boolean {
  return window.trustedTypes?.isHTML(value) ?? false;
}

/**
 * Check if value is Trusted Script
 */
export function isTrustedScript(value: any): boolean {
  return window.trustedTypes?.isScript(value) ?? false;
}

/**
 * Check if value is Trusted Script URL
 */
export function isTrustedScriptURL(value: any): boolean {
  return window.trustedTypes?.isScriptURL(value) ?? false;
}

/**
 * Get empty trusted HTML (safe empty value)
 */
export function getEmptyHTML(): TrustedHTML | string {
  return window.trustedTypes?.emptyHTML ?? '';
}

// Initialize on module load
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeTrustedTypes();
    });
  } else {
    initializeTrustedTypes();
  }
}

export default {
  initializeTrustedTypes,
  safeSetHTML,
  safeLoadScript,
  isTrustedHTML,
  isTrustedScript,
  isTrustedScriptURL,
  getEmptyHTML,
};
