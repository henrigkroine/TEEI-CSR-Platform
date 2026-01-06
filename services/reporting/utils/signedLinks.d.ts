/**
 * Signed Share Links Utility
 *
 * Provides HMAC-based signing and validation for secure share links with TTL.
 * Implements tamper-proof share link generation for read-only dashboard views.
 */
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
export declare function generateLinkId(): string;
/**
 * Generate HMAC signature for share link
 * Signature covers: linkId + expiresAt + filterConfig JSON
 */
export declare function signShareLink(payload: ShareLinkPayload): string;
/**
 * Validate signature of share link
 */
export declare function validateSignature(payload: ShareLinkPayload, signature: string): boolean;
/**
 * Check if link has expired
 */
export declare function isLinkExpired(expiresAt: Date): boolean;
/**
 * Create signed share link
 */
export declare function createShareLink(companyId: string, filterConfig: Record<string, any>, createdBy: string, options?: {
    ttlDays?: number;
    boardroomMode?: boolean;
    linkId?: string;
}): SignedShareLink;
/**
 * Validate share link
 */
export declare function validateShareLink(payload: ShareLinkPayload, signature: string, revokedAt?: Date | null): ValidationResult;
/**
 * Parse TTL days from request (with validation)
 */
export declare function parseTTLDays(ttl?: number | string): number;
/**
 * Format share link URL with base URL
 */
export declare function formatShareLinkURL(linkId: string, baseURL: string, boardroomMode?: boolean): string;
/**
 * Sanitize filter config (remove any sensitive data)
 */
export declare function sanitizeFilterConfig(config: Record<string, any>): Record<string, any>;
/**
 * Constants export
 */
export declare const SHARE_LINK_CONSTANTS: {
    readonly DEFAULT_TTL_DAYS: 7;
    readonly MAX_TTL_DAYS: 90;
    readonly SECRET_KEY_ENV_VAR: "SHARE_LINK_SECRET";
};
//# sourceMappingURL=signedLinks.d.ts.map