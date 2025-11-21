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
/**
 * Generate URL-safe unique link ID
 */
export function generateLinkId() {
    return crypto.randomBytes(32).toString('base64url');
}
/**
 * Generate HMAC signature for share link
 * Signature covers: linkId + expiresAt + filterConfig JSON
 */
export function signShareLink(payload) {
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
export function validateSignature(payload, signature) {
    const expectedSignature = signShareLink(payload);
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
}
/**
 * Check if link has expired
 */
export function isLinkExpired(expiresAt) {
    return new Date() > expiresAt;
}
/**
 * Create signed share link
 */
export function createShareLink(companyId, filterConfig, createdBy, options = {}) {
    const ttlDays = Math.min(options.ttlDays || DEFAULT_TTL_DAYS, MAX_TTL_DAYS);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);
    const linkId = options.linkId || generateLinkId();
    const payload = {
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
export function validateShareLink(payload, signature, revokedAt) {
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
export function parseTTLDays(ttl) {
    if (!ttl)
        return DEFAULT_TTL_DAYS;
    const days = typeof ttl === 'string' ? parseInt(ttl, 10) : ttl;
    if (isNaN(days) || days < 1)
        return DEFAULT_TTL_DAYS;
    if (days > MAX_TTL_DAYS)
        return MAX_TTL_DAYS;
    return days;
}
/**
 * Format share link URL with base URL
 */
export function formatShareLinkURL(linkId, baseURL, boardroomMode = false) {
    const url = new URL(`/cockpit/shared/${linkId}`, baseURL);
    if (boardroomMode) {
        url.searchParams.set('mode', 'boardroom');
    }
    return url.toString();
}
/**
 * Sanitize filter config (remove any sensitive data)
 */
export function sanitizeFilterConfig(config) {
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
};
//# sourceMappingURL=signedLinks.js.map