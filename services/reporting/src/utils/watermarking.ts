/**
 * Watermarking Utilities
 *
 * Phase H - Cockpit GA
 * Applies watermarks to shared content for traceability and security
 */

import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('reporting:watermarking');

export type WatermarkPolicyType = 'none' | 'standard' | 'strict' | 'custom';

export interface WatermarkPolicy {
  type: WatermarkPolicyType;
  text?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'diagonal';
  opacity?: number;  // 0.0 - 1.0
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  includeTimestamp?: boolean;
  includeUserInfo?: boolean;
  includeIPAddress?: boolean;
  customData?: Record<string, any>;
}

export interface WatermarkConfig {
  enabled: boolean;
  policy: WatermarkPolicy;
}

export interface WatermarkContext {
  shareLink_id: string;
  accessedBy?: string;  // User ID or email
  accessedAt: Date;
  clientIP?: string;
  companyName?: string;
}

/**
 * Get default watermark policy based on type
 */
export function getDefaultWatermarkPolicy(type: WatermarkPolicyType): WatermarkPolicy {
  switch (type) {
    case 'none':
      return {
        type: 'none',
      };

    case 'standard':
      return {
        type: 'standard',
        text: 'CONFIDENTIAL - For Authorized Use Only',
        position: 'bottom-right',
        opacity: 0.3,
        fontSize: 12,
        color: '#666666',
        fontFamily: 'Arial, sans-serif',
        includeTimestamp: true,
        includeUserInfo: false,
        includeIPAddress: false,
      };

    case 'strict':
      return {
        type: 'strict',
        text: 'CONFIDENTIAL - Unauthorized Distribution Prohibited',
        position: 'diagonal',
        opacity: 0.15,
        fontSize: 24,
        color: '#FF0000',
        fontFamily: 'Arial, sans-serif',
        includeTimestamp: true,
        includeUserInfo: true,
        includeIPAddress: true,
      };

    case 'custom':
      return {
        type: 'custom',
        text: '',
        position: 'bottom-right',
        opacity: 0.3,
        fontSize: 12,
        color: '#666666',
        fontFamily: 'Arial, sans-serif',
        includeTimestamp: false,
        includeUserInfo: false,
        includeIPAddress: false,
      };

    default:
      logger.warn('Unknown watermark policy type, using standard', { type });
      return getDefaultWatermarkPolicy('standard');
  }
}

/**
 * Generate watermark text based on policy and context
 */
export function generateWatermarkText(
  policy: WatermarkPolicy,
  context: WatermarkContext
): string {
  if (policy.type === 'none') {
    return '';
  }

  const parts: string[] = [];

  // Base text
  if (policy.text) {
    parts.push(policy.text);
  }

  // Timestamp
  if (policy.includeTimestamp) {
    const timestamp = context.accessedAt.toISOString().split('T')[0];  // YYYY-MM-DD
    parts.push(`Accessed: ${timestamp}`);
  }

  // User info
  if (policy.includeUserInfo && context.accessedBy) {
    parts.push(`User: ${maskSensitiveInfo(context.accessedBy)}`);
  }

  // IP address
  if (policy.includeIPAddress && context.clientIP) {
    parts.push(`IP: ${maskIP(context.clientIP)}`);
  }

  // Company name
  if (context.companyName) {
    parts.push(`${context.companyName}`);
  }

  // Custom data
  if (policy.customData) {
    for (const [key, value] of Object.entries(policy.customData)) {
      if (value) {
        parts.push(`${key}: ${value}`);
      }
    }
  }

  return parts.join(' | ');
}

/**
 * Generate watermark metadata for client-side rendering
 * Returns SVG or Canvas configuration
 */
export function generateWatermarkMetadata(
  policy: WatermarkPolicy,
  context: WatermarkContext
): {
  text: string;
  style: {
    position: string;
    opacity: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    rotation?: number;
  };
} {
  const text = generateWatermarkText(policy, context);

  return {
    text,
    style: {
      position: policy.position || 'bottom-right',
      opacity: policy.opacity || 0.3,
      fontSize: policy.fontSize || 12,
      fontFamily: policy.fontFamily || 'Arial, sans-serif',
      color: policy.color || '#666666',
      rotation: policy.position === 'diagonal' ? -45 : 0,
    },
  };
}

/**
 * Validate watermark policy configuration
 */
export function validateWatermarkPolicy(policy: WatermarkPolicy): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate opacity
  if (policy.opacity !== undefined && (policy.opacity < 0 || policy.opacity > 1)) {
    errors.push('Opacity must be between 0 and 1');
  }

  // Validate fontSize
  if (policy.fontSize !== undefined && (policy.fontSize < 6 || policy.fontSize > 72)) {
    errors.push('Font size must be between 6 and 72');
  }

  // Validate position
  const validPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'diagonal'];
  if (policy.position && !validPositions.includes(policy.position)) {
    errors.push(`Invalid position. Must be one of: ${validPositions.join(', ')}`);
  }

  // Validate color (basic hex check)
  if (policy.color && !/^#[0-9A-F]{6}$/i.test(policy.color)) {
    errors.push('Color must be a valid hex color (e.g., #FF0000)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Mask sensitive information in watermark (partial redaction)
 */
function maskSensitiveInfo(info: string): string {
  if (info.includes('@')) {
    // Email: show first 3 chars + domain
    const [local, domain] = info.split('@');
    if (local.length <= 3) {
      return `${local}@${domain}`;
    }
    return `${local.substring(0, 3)}***@${domain}`;
  } else if (info.length > 8) {
    // UUID or long string: show first 8 chars
    return `${info.substring(0, 8)}***`;
  } else {
    return info;
  }
}

/**
 * Mask IP address for privacy (show first 2 octets only)
 */
function maskIP(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  return 'xxx.xxx.xxx.xxx';
}

/**
 * Apply watermark to HTML content (server-side)
 * Injects watermark CSS and HTML
 */
export function applyWatermarkToHTML(
  htmlContent: string,
  policy: WatermarkPolicy,
  context: WatermarkContext
): string {
  if (policy.type === 'none') {
    return htmlContent;
  }

  const watermarkMeta = generateWatermarkMetadata(policy, context);

  const watermarkCSS = `
    <style>
      .watermark-overlay {
        position: fixed;
        ${getPositionStyles(watermarkMeta.style.position)}
        opacity: ${watermarkMeta.style.opacity};
        font-size: ${watermarkMeta.style.fontSize}px;
        font-family: ${watermarkMeta.style.fontFamily};
        color: ${watermarkMeta.style.color};
        pointer-events: none;
        user-select: none;
        z-index: 9999;
        padding: 10px;
        ${watermarkMeta.style.rotation ? `transform: rotate(${watermarkMeta.style.rotation}deg);` : ''}
        white-space: nowrap;
      }
    </style>
  `;

  const watermarkHTML = `
    <div class="watermark-overlay" aria-hidden="true">
      ${escapeHTML(watermarkMeta.text)}
    </div>
  `;

  // Inject before </head>
  const withCSS = htmlContent.replace('</head>', `${watermarkCSS}</head>`);

  // Inject before </body>
  return withCSS.replace('</body>', `${watermarkHTML}</body>`);
}

/**
 * Get CSS position styles based on position name
 */
function getPositionStyles(position: string): string {
  switch (position) {
    case 'top-left':
      return 'top: 10px; left: 10px;';
    case 'top-right':
      return 'top: 10px; right: 10px;';
    case 'bottom-left':
      return 'bottom: 10px; left: 10px;';
    case 'bottom-right':
      return 'bottom: 10px; right: 10px;';
    case 'center':
      return 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
    case 'diagonal':
      return 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
    default:
      return 'bottom: 10px; right: 10px;';
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Log watermark application for audit trail
 */
export function logWatermarkApplication(
  shareLinkId: string,
  context: WatermarkContext,
  policyType: WatermarkPolicyType
): void {
  logger.info('Watermark applied to shared content', {
    shareLinkId,
    policyType,
    accessedBy: context.accessedBy,
    accessedAt: context.accessedAt.toISOString(),
    clientIP: context.clientIP ? maskIP(context.clientIP) : undefined,
  });
}
