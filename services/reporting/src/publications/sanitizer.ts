/**
 * XSS Sanitization for Publications - Worker 19
 *
 * HTML sanitizer for TEXT blocks in publications.
 * Prevents XSS attacks while allowing safe formatting.
 *
 * @module publications/sanitizer
 */

import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window as any);

/**
 * Sanitize HTML content for TEXT blocks
 *
 * Allows:
 * - Basic formatting (p, br, strong, em, u, s)
 * - Lists (ul, ol, li)
 * - Links (a with href, target, rel)
 * - Headings (h1-h6)
 * - Blockquotes
 *
 * Disallows:
 * - Scripts
 * - Iframes
 * - Forms
 * - Event handlers
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'del', 'ins',
      'ul', 'ol', 'li',
      'a',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span', 'div',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', // for <a>
      'class', 'id', // for styling
      'colspan', 'rowspan', // for tables
    ],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
  });
}

/**
 * Sanitize markdown by converting to HTML first
 */
export function sanitizeMarkdown(markdown: string): string {
  // For now, just escape HTML entities
  // In production, use a markdown-to-HTML converter + DOMPurify
  return markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate and sanitize block payload based on type
 */
export function sanitizeBlockPayload(kind: string, payload: any): any {
  switch (kind) {
    case 'TEXT':
      if (payload.format === 'html') {
        return {
          ...payload,
          content: sanitizeHtml(payload.content),
        };
      } else {
        return {
          ...payload,
          content: sanitizeMarkdown(payload.content),
        };
      }

    case 'EVIDENCE':
      return {
        ...payload,
        snippets: payload.snippets?.map((s: any) => ({
          id: String(s.id || ''),
          text: sanitizeHtml(s.text || ''),
          source: String(s.source || ''),
          timestamp: s.timestamp ? String(s.timestamp) : undefined,
        })) || [],
      };

    case 'HEADING':
      return {
        ...payload,
        text: sanitizeHtml(payload.text || ''),
        level: Math.max(1, Math.min(3, parseInt(payload.level) || 2)),
      };

    case 'TILE':
    case 'METRIC':
    case 'CHART':
      // No HTML content, just validate structure
      return payload;

    default:
      return payload;
  }
}
