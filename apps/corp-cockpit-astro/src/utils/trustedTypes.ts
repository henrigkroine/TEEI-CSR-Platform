/**
 * Trusted Types Policy for DOM XSS Prevention
 *
 * This module provides a Trusted Types policy to prevent DOM-based XSS attacks.
 * All DOM manipulation that involves HTML strings must go through these sanitization functions.
 *
 * Usage:
 *   import { sanitizeHTML, sanitizeScript, sanitizeScriptURL } from './utils/trustedTypes';
 *
 *   // Instead of: element.innerHTML = userInput;
 *   element.innerHTML = sanitizeHTML(userInput);
 *
 *   // Instead of: script.src = url;
 *   script.src = sanitizeScriptURL(url);
 */

// Check if Trusted Types API is supported
export const isTrustedTypesSupported = (): boolean => {
  return typeof window !== 'undefined' && 'trustedTypes' in window;
};

// Simple HTML sanitizer that escapes dangerous characters
function escapeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Allowed HTML tags for rich text content
const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 's', 'a', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'blockquote', 'code', 'pre',
]);

// Allowed attributes (minimal set)
const ALLOWED_ATTRS = new Set([
  'href', 'title', 'class', 'id', 'data-*',
]);

// Basic HTML sanitizer
function sanitizeHTMLString(html: string): string {
  // For server-side rendering, just escape
  if (typeof window === 'undefined') {
    return escapeHTML(html);
  }

  // Create a temporary DOM to parse and sanitize
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove script tags and event handlers
  const scripts = doc.querySelectorAll('script');
  scripts.forEach(script => script.remove());

  // Remove on* event attributes
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(element => {
    // Remove disallowed tags
    if (!ALLOWED_TAGS.has(element.tagName.toLowerCase())) {
      element.remove();
      return;
    }

    // Remove event handler attributes
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('on') || attr.name === 'src' && element.tagName === 'IMG') {
        element.removeAttribute(attr.name);
      }

      // Sanitize href to prevent javascript: protocol
      if (attr.name === 'href') {
        const href = attr.value.toLowerCase().trim();
        if (href.startsWith('javascript:') || href.startsWith('data:')) {
          element.removeAttribute('href');
        }
      }
    });
  });

  return doc.body.innerHTML;
}

// Trusted Types policy
let trustedTypesPolicy: TrustedTypePolicy | null = null;

// Initialize Trusted Types policy (call this on app startup)
export function initTrustedTypesPolicy(): void {
  if (!isTrustedTypesSupported()) {
    console.warn('Trusted Types not supported in this browser');
    return;
  }

  try {
    trustedTypesPolicy = window.trustedTypes!.createPolicy('default', {
      createHTML: (input: string) => {
        // Sanitize HTML input
        return sanitizeHTMLString(input);
      },
      createScript: (input: string) => {
        // Allow only if it's a known safe script pattern
        // In production, this should be very restrictive
        console.warn('createScript called with:', input);
        // Only allow empty strings or specific known patterns
        if (input === '' || input.trim() === '') {
          return input;
        }
        throw new TypeError('Script execution blocked by Trusted Types');
      },
      createScriptURL: (input: string) => {
        // Only allow same-origin scripts or scripts from allowed CDNs
        const url = new URL(input, window.location.href);

        const allowedOrigins = [
          window.location.origin,
          'https://cdn.jsdelivr.net',
          'https://unpkg.com',
        ];

        if (allowedOrigins.some(origin => url.origin === origin)) {
          return input;
        }

        throw new TypeError(`Script URL blocked by Trusted Types: ${input}`);
      },
    });
  } catch (error) {
    console.error('Failed to create Trusted Types policy:', error);
  }
}

// Helper functions to sanitize content

/**
 * Sanitize HTML content for safe insertion into the DOM
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML (TrustedHTML if supported, string otherwise)
 */
export function sanitizeHTML(html: string): TrustedHTML | string {
  if (trustedTypesPolicy) {
    return trustedTypesPolicy.createHTML(html);
  }
  // Fallback for browsers without Trusted Types
  return sanitizeHTMLString(html);
}

/**
 * Sanitize script content (generally, avoid using this - use external scripts instead)
 * @param script - Script content
 * @returns Sanitized script (TrustedScript if supported, string otherwise)
 */
export function sanitizeScript(script: string): TrustedScript | string {
  if (trustedTypesPolicy) {
    return trustedTypesPolicy.createScript(script);
  }
  // Fallback: reject all scripts
  if (script.trim() !== '') {
    throw new TypeError('Script execution blocked');
  }
  return script;
}

/**
 * Sanitize script URL for safe loading
 * @param url - Script URL to sanitize
 * @returns Sanitized URL (TrustedScriptURL if supported, string otherwise)
 */
export function sanitizeScriptURL(url: string): TrustedScriptURL | string {
  if (trustedTypesPolicy) {
    return trustedTypesPolicy.createScriptURL(url);
  }
  // Fallback: check URL manually
  try {
    const parsedURL = new URL(url, window.location.href);
    const allowedOrigins = [
      window.location.origin,
      'https://cdn.jsdelivr.net',
      'https://unpkg.com',
    ];

    if (allowedOrigins.some(origin => parsedURL.origin === origin)) {
      return url;
    }
    throw new TypeError(`Script URL blocked: ${url}`);
  } catch (error) {
    throw new TypeError(`Invalid script URL: ${url}`);
  }
}

/**
 * Safely set innerHTML with Trusted Types
 * @param element - DOM element
 * @param html - HTML content to set
 */
export function safeSetInnerHTML(element: Element, html: string): void {
  element.innerHTML = sanitizeHTML(html) as string;
}

/**
 * Safely set script src with Trusted Types
 * @param script - Script element
 * @param url - Script URL
 */
export function safeSetScriptSrc(script: HTMLScriptElement, url: string): void {
  script.src = sanitizeScriptURL(url) as string;
}

/**
 * Create a safe anchor element with sanitized href
 * @param href - URL for the anchor
 * @param text - Text content
 * @returns Anchor element
 */
export function createSafeAnchor(href: string, text: string): HTMLAnchorElement {
  const anchor = document.createElement('a');

  // Sanitize href to prevent javascript: protocol
  const sanitizedHref = href.toLowerCase().trim();
  if (sanitizedHref.startsWith('javascript:') || sanitizedHref.startsWith('data:')) {
    throw new TypeError('Dangerous href blocked');
  }

  anchor.href = href;
  anchor.textContent = text;
  return anchor;
}

// Export type for TypeScript
export type { TrustedHTML, TrustedScript, TrustedScriptURL, TrustedTypePolicy };

// Global types extension
declare global {
  interface Window {
    trustedTypes?: {
      createPolicy: (
        name: string,
        policy: {
          createHTML?: (input: string) => string;
          createScript?: (input: string) => string;
          createScriptURL?: (input: string) => string;
        }
      ) => TrustedTypePolicy;
    };
  }

  interface TrustedTypePolicy {
    createHTML(input: string): TrustedHTML;
    createScript(input: string): TrustedScript;
    createScriptURL(input: string): TrustedScriptURL;
  }

  interface TrustedHTML {
    toString(): string;
  }

  interface TrustedScript {
    toString(): string;
  }

  interface TrustedScriptURL {
    toString(): string;
  }
}
