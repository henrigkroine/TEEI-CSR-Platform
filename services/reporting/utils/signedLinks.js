"use strict";
/**
 * Signed Share Links Utility
 *
 * Provides HMAC-based signing and validation for secure share links with TTL.
 * Implements tamper-proof share link generation for read-only dashboard views.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHARE_LINK_CONSTANTS = void 0;
exports.generateLinkId = generateLinkId;
exports.signShareLink = signShareLink;
exports.validateSignature = validateSignature;
exports.isLinkExpired = isLinkExpired;
exports.createShareLink = createShareLink;
exports.validateShareLink = validateShareLink;
exports.parseTTLDays = parseTTLDays;
exports.formatShareLinkURL = formatShareLinkURL;
exports.sanitizeFilterConfig = sanitizeFilterConfig;
var crypto_1 = require("crypto");
var SECRET_KEY = process.env.SHARE_LINK_SECRET || 'default-dev-secret-change-in-production';
var DEFAULT_TTL_DAYS = 7;
var MAX_TTL_DAYS = 90;
/**
 * Generate URL-safe unique link ID
 */
function generateLinkId() {
    return crypto_1.default.randomBytes(32).toString('base64url');
}
/**
 * Generate HMAC signature for share link
 * Signature covers: linkId + expiresAt + filterConfig JSON
 */
function signShareLink(payload) {
    var data = [
        payload.linkId,
        payload.expiresAt.toISOString(),
        JSON.stringify(payload.filterConfig),
        payload.companyId,
    ].join('|');
    return crypto_1.default
        .createHmac('sha256', SECRET_KEY)
        .update(data)
        .digest('hex');
}
/**
 * Validate signature of share link
 */
function validateSignature(payload, signature) {
    var expectedSignature = signShareLink(payload);
    // Use timing-safe comparison to prevent timing attacks
    return crypto_1.default.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
}
/**
 * Check if link has expired
 */
function isLinkExpired(expiresAt) {
    return new Date() > expiresAt;
}
/**
 * Create signed share link
 */
function createShareLink(companyId, filterConfig, createdBy, options) {
    if (options === void 0) { options = {}; }
    var ttlDays = Math.min(options.ttlDays || DEFAULT_TTL_DAYS, MAX_TTL_DAYS);
    var expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);
    var linkId = options.linkId || generateLinkId();
    var payload = {
        linkId: linkId,
        companyId: companyId,
        filterConfig: filterConfig,
        expiresAt: expiresAt,
        boardroomMode: options.boardroomMode || false,
        createdBy: createdBy,
    };
    var signature = signShareLink(payload);
    // Generate URL (will be prefixed with base URL in route handler)
    var url = "/cockpit/shared/".concat(linkId).concat(options.boardroomMode ? '?mode=boardroom' : '');
    return {
        linkId: linkId,
        signature: signature,
        expiresAt: expiresAt,
        url: url,
    };
}
/**
 * Validate share link
 */
function validateShareLink(payload, signature, revokedAt) {
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
        payload: payload,
    };
}
/**
 * Parse TTL days from request (with validation)
 */
function parseTTLDays(ttl) {
    if (!ttl)
        return DEFAULT_TTL_DAYS;
    var days = typeof ttl === 'string' ? parseInt(ttl, 10) : ttl;
    if (isNaN(days) || days < 1)
        return DEFAULT_TTL_DAYS;
    if (days > MAX_TTL_DAYS)
        return MAX_TTL_DAYS;
    return days;
}
/**
 * Format share link URL with base URL
 */
function formatShareLinkURL(linkId, baseURL, boardroomMode) {
    if (boardroomMode === void 0) { boardroomMode = false; }
    var url = new URL("/cockpit/shared/".concat(linkId), baseURL);
    if (boardroomMode) {
        url.searchParams.set('mode', 'boardroom');
    }
    return url.toString();
}
/**
 * Sanitize filter config (remove any sensitive data)
 */
function sanitizeFilterConfig(config) {
    // Remove any fields that might contain PII or sensitive data
    var sanitized = __assign({}, config);
    // Remove any email, phone, or other PII fields if present
    delete sanitized.userEmail;
    delete sanitized.userName;
    delete sanitized.contactInfo;
    return sanitized;
}
/**
 * Constants export
 */
exports.SHARE_LINK_CONSTANTS = {
    DEFAULT_TTL_DAYS: DEFAULT_TTL_DAYS,
    MAX_TTL_DAYS: MAX_TTL_DAYS,
    SECRET_KEY_ENV_VAR: 'SHARE_LINK_SECRET',
};
