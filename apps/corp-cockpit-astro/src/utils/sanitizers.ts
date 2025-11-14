/**
 * Sanitization Utilities - Worker 3 Phase D
 *
 * Provides sanitization helpers for user input, URLs, and HTML content.
 * Uses allowlist approach: permit known-safe, reject unknown.
 *
 * Security Principles:
 * - Validate input before use
 * - Sanitize output before rendering
 * - Use allowlists over denylists
 * - Fail securely (reject unknown input)
 */

/**
 * Allowed URL protocols (allowlist)
 */
const ALLOWED_URL_PROTOCOLS = [
  'http:',
  'https:',
  'mailto:',
  'tel:',
  'sms:',
  'data:', // For images only (validated separately)
] as const;

/**
 * Dangerous URL protocols (denylist - for additional safety)
 */
const DANGEROUS_URL_PROTOCOLS = [
  'javascript:',
  'vbscript:',
  'file:',
  'data:', // Dangerous unless validated for images
  'blob:', // Needs validation
] as const;

/**
 * Allowed HTML tags (allowlist)
 * Safe tags that can be used in sanitized HTML
 */
const ALLOWED_HTML_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  'b',
  'i',
  'span',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'blockquote',
  'code',
  'pre',
] as const;

/**
 * Allowed HTML attributes (allowlist)
 * Safe attributes that can be used on HTML elements
 */
const ALLOWED_HTML_ATTRIBUTES = [
  'class',
  'id',
  'href',
  'src',
  'alt',
  'title',
  'width',
  'height',
  'style', // Needs additional validation
  'target',
  'rel',
  'colspan',
  'rowspan',
] as const;

/**
 * Dangerous HTML attributes (denylist)
 * Attributes that should never be allowed
 */
const DANGEROUS_HTML_ATTRIBUTES = [
  'onclick',
  'onload',
  'onerror',
  'onmouseover',
  'onmouseout',
  'onfocus',
  'onblur',
  'onchange',
  'onsubmit',
  'onkeyup',
  'onkeydown',
  'onkeypress',
] as const;

/**
 * Sanitize HTML string by removing dangerous tags and attributes
 *
 * @param input - HTML string to sanitize
 * @param options - Sanitization options
 * @returns Sanitized HTML string
 *
 * @example
 * ```typescript
 * const unsafe = '<script>alert("XSS")</script><p onclick="evil()">Click me</p>';
 * const safe = sanitizeHTML(unsafe);
 * // Returns: '<p>Click me</p>'
 * ```
 */
export function sanitizeHTML(
  input: string,
  options: {
    allowedTags?: readonly string[];
    allowedAttributes?: readonly string[];
    stripUnknown?: boolean;
  } = {}
): string {
  const {
    allowedTags = ALLOWED_HTML_TAGS,
    allowedAttributes = ALLOWED_HTML_ATTRIBUTES,
    stripUnknown = true,
  } = options;

  // Empty input
  if (!input || input.trim() === '') {
    return '';
  }

  // Create temporary DOM element for parsing
  const temp = document.createElement('div');
  temp.innerHTML = input;

  // Recursively sanitize nodes
  function sanitizeNode(node: Node): Node | null {
    // Text nodes are safe
    if (node.nodeType === Node.TEXT_NODE) {
      return node;
    }

    // Only process element nodes
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();

    // Check if tag is allowed
    if (!allowedTags.includes(tagName as any)) {
      if (stripUnknown) {
        // Strip tag but keep children
        const fragment = document.createDocumentFragment();
        Array.from(element.childNodes).forEach((child) => {
          const sanitized = sanitizeNode(child);
          if (sanitized) {
            fragment.appendChild(sanitized);
          }
        });
        return fragment;
      } else {
        // Remove entire element
        return null;
      }
    }

    // Create clean element
    const clean = document.createElement(tagName);

    // Copy allowed attributes
    Array.from(element.attributes).forEach((attr) => {
      const attrName = attr.name.toLowerCase();

      // Block dangerous attributes
      if (DANGEROUS_HTML_ATTRIBUTES.some((danger) => danger === attrName)) {
        console.warn(`[Sanitizer] Blocked dangerous attribute: ${attrName}`);
        return;
      }

      // Only allow allowed attributes
      if (allowedAttributes.includes(attrName as any)) {
        // Special validation for href and src
        if (attrName === 'href' || attrName === 'src') {
          const sanitizedURL = sanitizeURL(attr.value);
          if (sanitizedURL) {
            clean.setAttribute(attrName, sanitizedURL);
          }
        }
        // Special validation for style
        else if (attrName === 'style') {
          // Strip style attribute (CSS injection risk)
          // If needed, implement CSS sanitization
          console.warn('[Sanitizer] Stripped style attribute (not implemented)');
        } else {
          clean.setAttribute(attrName, attr.value);
        }
      }
    });

    // Recursively sanitize children
    Array.from(element.childNodes).forEach((child) => {
      const sanitized = sanitizeNode(child);
      if (sanitized) {
        clean.appendChild(sanitized);
      }
    });

    return clean;
  }

  // Sanitize all child nodes
  const fragment = document.createDocumentFragment();
  Array.from(temp.childNodes).forEach((child) => {
    const sanitized = sanitizeNode(child);
    if (sanitized) {
      fragment.appendChild(sanitized);
    }
  });

  // Convert back to string
  const result = document.createElement('div');
  result.appendChild(fragment);
  return result.innerHTML;
}

/**
 * Sanitize URL by validating protocol and structure
 *
 * @param url - URL string to sanitize
 * @param options - Validation options
 * @returns Sanitized URL or null if invalid
 *
 * @example
 * ```typescript
 * sanitizeURL('javascript:alert(1)'); // Returns: null
 * sanitizeURL('https://teei.io/page'); // Returns: 'https://teei.io/page'
 * ```
 */
export function sanitizeURL(
  url: string,
  options: {
    allowDataURIs?: boolean;
    allowRelative?: boolean;
    allowedHosts?: string[];
  } = {}
): string | null {
  const { allowDataURIs = false, allowRelative = true, allowedHosts } = options;

  // Empty URL
  if (!url || url.trim() === '') {
    return null;
  }

  const trimmed = url.trim();

  // Check for dangerous protocols
  const lowerURL = trimmed.toLowerCase();
  for (const dangerous of DANGEROUS_URL_PROTOCOLS) {
    if (lowerURL.startsWith(dangerous)) {
      // Special case: data: URIs for images
      if (dangerous === 'data:' && allowDataURIs) {
        // Validate it's an image data URI
        if (lowerURL.startsWith('data:image/')) {
          return trimmed;
        }
      }
      console.warn(`[Sanitizer] Blocked dangerous URL protocol: ${dangerous}`);
      return null;
    }
  }

  // Handle relative URLs
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    if (allowRelative) {
      return trimmed;
    } else {
      console.warn('[Sanitizer] Blocked relative URL (not allowed in this context)');
      return null;
    }
  }

  // Handle anchor links
  if (trimmed.startsWith('#')) {
    return trimmed;
  }

  // Validate absolute URL
  try {
    const parsed = new URL(trimmed);

    // Check protocol is allowed
    if (!ALLOWED_URL_PROTOCOLS.includes(parsed.protocol as any)) {
      console.warn(`[Sanitizer] Blocked URL with disallowed protocol: ${parsed.protocol}`);
      return null;
    }

    // Check host if allowlist provided
    if (allowedHosts && allowedHosts.length > 0) {
      if (!allowedHosts.includes(parsed.hostname)) {
        console.warn(`[Sanitizer] Blocked URL from non-allowed host: ${parsed.hostname}`);
        return null;
      }
    }

    return parsed.toString();
  } catch (error) {
    // Invalid URL format
    console.warn('[Sanitizer] Invalid URL format:', url);
    return null;
  }
}

/**
 * Sanitize attribute value based on attribute name
 *
 * @param attrName - Attribute name
 * @param attrValue - Attribute value
 * @returns Sanitized attribute value or null if invalid
 *
 * @example
 * ```typescript
 * sanitizeAttribute('href', 'javascript:alert(1)'); // Returns: null
 * sanitizeAttribute('class', 'btn btn-primary'); // Returns: 'btn btn-primary'
 * ```
 */
export function sanitizeAttribute(attrName: string, attrValue: string): string | null {
  const name = attrName.toLowerCase();

  // Block dangerous attributes
  if (DANGEROUS_HTML_ATTRIBUTES.some((danger) => danger === name)) {
    console.warn(`[Sanitizer] Blocked dangerous attribute: ${name}`);
    return null;
  }

  // Validate URL attributes
  if (name === 'href' || name === 'src' || name === 'action') {
    return sanitizeURL(attrValue);
  }

  // Validate target attribute
  if (name === 'target') {
    const allowed = ['_self', '_blank', '_parent', '_top'];
    if (!allowed.includes(attrValue)) {
      console.warn(`[Sanitizer] Invalid target value: ${attrValue}`);
      return '_self';
    }
    return attrValue;
  }

  // Validate rel attribute
  if (name === 'rel') {
    // If target is _blank, ensure noopener noreferrer
    if (attrValue.includes('noopener') || attrValue.includes('noreferrer')) {
      return attrValue;
    }
    return 'noopener noreferrer';
  }

  // Default: return as-is (for safe attributes like class, id, etc.)
  return attrValue;
}

/**
 * Sanitize user input for display
 *
 * Escapes HTML entities to prevent XSS in text content
 *
 * @param input - User input string
 * @returns Escaped string safe for HTML display
 *
 * @example
 * ```typescript
 * sanitizeUserInput('<script>alert(1)</script>');
 * // Returns: '&lt;script&gt;alert(1)&lt;/script&gt;'
 * ```
 */
export function sanitizeUserInput(input: string): string {
  if (!input) {
    return '';
  }

  const temp = document.createElement('div');
  temp.textContent = input;
  return temp.innerHTML;
}

/**
 * Sanitize filename for safe file operations
 *
 * @param filename - Filename to sanitize
 * @returns Safe filename
 *
 * @example
 * ```typescript
 * sanitizeFilename('../../../etc/passwd'); // Returns: 'etc_passwd'
 * sanitizeFilename('my report.pdf'); // Returns: 'my_report.pdf'
 * ```
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || filename.trim() === '') {
    return 'untitled';
  }

  // Remove path traversal attempts
  let safe = filename.replace(/\.\./g, '');

  // Remove directory separators
  safe = safe.replace(/[\/\\]/g, '_');

  // Remove dangerous characters
  safe = safe.replace(/[<>:"|?*\x00-\x1F]/g, '');

  // Replace spaces with underscores
  safe = safe.replace(/\s+/g, '_');

  // Limit length
  if (safe.length > 255) {
    const ext = safe.slice(safe.lastIndexOf('.'));
    const name = safe.slice(0, 255 - ext.length);
    safe = name + ext;
  }

  return safe || 'untitled';
}

/**
 * Sanitize SQL identifier (table/column name)
 *
 * WARNING: This is NOT a replacement for parameterized queries!
 * Use parameterized queries for SQL values.
 *
 * @param identifier - SQL identifier to sanitize
 * @returns Safe SQL identifier
 */
export function sanitizeSQLIdentifier(identifier: string): string {
  if (!identifier || identifier.trim() === '') {
    throw new Error('SQL identifier cannot be empty');
  }

  // Only allow alphanumeric and underscore
  const safe = identifier.replace(/[^a-zA-Z0-9_]/g, '');

  if (safe !== identifier) {
    console.warn('[Sanitizer] SQL identifier contained invalid characters');
  }

  // Ensure it doesn't start with a number
  if (/^\d/.test(safe)) {
    throw new Error('SQL identifier cannot start with a number');
  }

  // Check for SQL keywords (basic check)
  const sqlKeywords = [
    'SELECT',
    'INSERT',
    'UPDATE',
    'DELETE',
    'DROP',
    'CREATE',
    'ALTER',
    'UNION',
    'WHERE',
  ];
  if (sqlKeywords.includes(safe.toUpperCase())) {
    throw new Error('SQL identifier cannot be a SQL keyword');
  }

  return safe;
}

/**
 * Validate email address format
 *
 * @param email - Email address to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.trim() === '') {
    return false;
  }

  // Basic email regex (RFC 5322 simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return emailRegex.test(email);
}

/**
 * Validate phone number format
 *
 * @param phone - Phone number to validate
 * @returns True if valid phone format
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || phone.trim() === '') {
    return false;
  }

  // Remove common phone formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // Check if it's all digits (possibly with leading +)
  const phoneRegex = /^\+?[0-9]{8,15}$/;

  return phoneRegex.test(cleaned);
}

/**
 * Sanitize JSON string for safe parsing
 *
 * @param json - JSON string to sanitize
 * @returns Parsed and validated JSON object
 * @throws Error if JSON is invalid
 */
export function sanitizeJSON(json: string): any {
  if (!json || json.trim() === '') {
    throw new Error('JSON string is empty');
  }

  try {
    const parsed = JSON.parse(json);

    // Additional validation: ensure no __proto__ or constructor
    if (parsed && typeof parsed === 'object') {
      if ('__proto__' in parsed || 'constructor' in parsed) {
        console.warn('[Sanitizer] Blocked JSON with prototype pollution attempt');
        throw new Error('Invalid JSON structure');
      }
    }

    return parsed;
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Sanitize CSS class name
 *
 * @param className - CSS class name to sanitize
 * @returns Safe CSS class name
 */
export function sanitizeClassName(className: string): string {
  if (!className || className.trim() === '') {
    return '';
  }

  // Remove dangerous characters
  const safe = className.replace(/[^a-zA-Z0-9_\-\s]/g, '');

  // Trim whitespace
  return safe.trim();
}

/**
 * Create a safe download link for file export
 *
 * @param content - File content (string or Blob)
 * @param filename - Filename for download
 * @param mimeType - MIME type of file
 * @returns Safe download URL (must be revoked after use)
 */
export function createSafeDownloadURL(
  content: string | Blob,
  filename: string,
  mimeType: string
): { url: string; safeFilename: string } {
  const safeFilename = sanitizeFilename(filename);

  let blob: Blob;
  if (typeof content === 'string') {
    blob = new Blob([content], { type: mimeType });
  } else {
    blob = content;
  }

  const url = URL.createObjectURL(blob);

  return { url, safeFilename };
}

export default {
  sanitizeHTML,
  sanitizeURL,
  sanitizeAttribute,
  sanitizeUserInput,
  sanitizeFilename,
  sanitizeSQLIdentifier,
  sanitizeClassName,
  sanitizeJSON,
  isValidEmail,
  isValidPhone,
  createSafeDownloadURL,
};
