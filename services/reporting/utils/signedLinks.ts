/**
 * Signed Share Links Utility
 *
 * Provides HMAC-based signing and validation for secure share links with TTL.
 * Implements tamper-proof share link generation for read-only dashboard views.
 */

import crypto from 'crypto';

const SECRET_KEY = process.env.SHARE_LINK_SECRET || 'default-dev-secret-change-in-production';
const DEFAULT_TTL_DAYS = 7;
const MAX_TTL_DAYS = 90;

export interface ShareLinkPayload {
  linkId: string;
  companyId: string;
  filterConfig: Record<string, any>;
  expiresAt: Date;
  boardroomMode?: boolean;
  createdBy: string;
}

export interface SignedShareLink {
  linkId: string;
  signature: string;
  expiresAt: Date;
  url: string;
}

export interface ValidationResult {
  valid: boolean;
  reason?: 'expired' | 'invalid_signature' | 'tampered';
  payload?: ShareLinkPayload;
}

/**
 * Generate URL-safe unique link ID
 */
export function generateLinkId(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate HMAC signature for share link
 * Signature covers: linkId + expiresAt + filterConfig JSON
 */
export function signShareLink(payload: ShareLinkPayload): string {
  const data = [
    payload.linkId,
    payload.expiresAt.toISOString(),
    JSON.stringify(payload.filterConfig),
    payload.companyId,
  ].join('|');

  return crypto
    .createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('hex');
}

/**
 * Validate signature of share link
 */
export function validateSignature(payload: ShareLinkPayload, signature: string): boolean {
  const expectedSignature = signShareLink(payload);

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Check if link has expired
 */
export function isLinkExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Create signed share link
 */
export function createShareLink(
  companyId: string,
  filterConfig: Record<string, any>,
  createdBy: string,
  options: {
    ttlDays?: number;
    boardroomMode?: boolean;
    linkId?: string;
  } = {}
): SignedShareLink {
  const ttlDays = Math.min(options.ttlDays || DEFAULT_TTL_DAYS, MAX_TTL_DAYS);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);

  const linkId = options.linkId || generateLinkId();

  const payload: ShareLinkPayload = {
    linkId,
    companyId,
    filterConfig,
    expiresAt,
    boardroomMode: options.boardroomMode || false,
    createdBy,
  };

  const signature = signShareLink(payload);

  // Generate URL (will be prefixed with base URL in route handler)
  const url = `/cockpit/shared/${linkId}${options.boardroomMode ? '?mode=boardroom' : ''}`;

  return {
    linkId,
    signature,
    expiresAt,
    url,
  };
}

/**
 * Validate share link
 */
export function validateShareLink(
  payload: ShareLinkPayload,
  signature: string,
  revokedAt?: Date | null
): ValidationResult {
  // Check if manually revoked
  if (revokedAt) {
    return {
      valid: false,
      reason: 'expired', // Treat revocation as expiry for user-facing messages
    };
  }

  // Check expiry
  if (isLinkExpired(payload.expiresAt)) {
    return {
      valid: false,
      reason: 'expired',
    };
  }

  // Validate signature
  if (!validateSignature(payload, signature)) {
    return {
      valid: false,
      reason: 'invalid_signature',
    };
  }

  return {
    valid: true,
    payload,
  };
}

/**
 * Parse TTL days from request (with validation)
 */
export function parseTTLDays(ttl?: number | string): number {
  if (!ttl) return DEFAULT_TTL_DAYS;

  const days = typeof ttl === 'string' ? parseInt(ttl, 10) : ttl;

  if (isNaN(days) || days < 1) return DEFAULT_TTL_DAYS;
  if (days > MAX_TTL_DAYS) return MAX_TTL_DAYS;

  return days;
}

/**
 * Format share link URL with base URL
 */
export function formatShareLinkURL(linkId: string, baseURL: string, boardroomMode = false): string {
  const url = new URL(`/cockpit/shared/${linkId}`, baseURL);
  if (boardroomMode) {
    url.searchParams.set('mode', 'boardroom');
  }
  return url.toString();
}

/**
 * Sanitize filter config (remove any sensitive data)
 */
export function sanitizeFilterConfig(config: Record<string, any>): Record<string, any> {
  // Remove any fields that might contain PII or sensitive data
  const sanitized = { ...config };

  // Remove any email, phone, or other PII fields if present
  delete sanitized.userEmail;
  delete sanitized.userName;
  delete sanitized.contactInfo;

  return sanitized;
}

/**
 * Constants export
 */
export const SHARE_LINK_CONSTANTS = {
  DEFAULT_TTL_DAYS,
  MAX_TTL_DAYS,
  SECRET_KEY_ENV_VAR: 'SHARE_LINK_SECRET',
} as const;
