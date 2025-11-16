/**
 * IP Validation and Allowlist Utilities
 *
 * Phase H - Cockpit GA
 * Supports IP allowlisting with CIDR notation
 */

import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('reporting:ip-validation');

export interface IPAllowlistConfig {
  enabled: boolean;
  addresses: string[];  // Array of IP addresses or CIDR ranges
  denyByDefault?: boolean;
}

/**
 * Check if an IP address is in the allowlist
 * Supports both individual IPs and CIDR notation
 *
 * @param ipAddress - IP address to check (v4 or v6)
 * @param allowlist - Array of allowed IPs/CIDR ranges
 * @returns true if IP is allowed, false otherwise
 */
export function isIPInAllowlist(
  ipAddress: string,
  allowlist: string[] | null | undefined
): boolean {
  // If allowlist is null/empty, all IPs are allowed
  if (!allowlist || allowlist.length === 0) {
    return true;
  }

  // Normalize IP (remove IPv6 prefix if present)
  const normalizedIP = normalizeIP(ipAddress);

  for (const allowed of allowlist) {
    if (allowed.includes('/')) {
      // CIDR range
      if (isIPInCIDR(normalizedIP, allowed)) {
        return true;
      }
    } else {
      // Exact match
      if (normalizedIP === normalizeIP(allowed)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Normalize IP address (remove IPv6 prefix, handle localhost)
 */
export function normalizeIP(ip: string): string {
  // Remove IPv6 prefix for IPv4-mapped addresses (::ffff:192.0.2.1 -> 192.0.2.1)
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }

  // Handle localhost variations
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    return '127.0.0.1';
  }

  return ip;
}

/**
 * Check if an IP is within a CIDR range
 * Simplified implementation - for production, use a library like ipaddr.js
 *
 * @param ip - IP address to check
 * @param cidr - CIDR range (e.g., "192.168.1.0/24")
 * @returns true if IP is in range
 */
export function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split('/');
    const mask = parseInt(bits, 10);

    if (isNaN(mask) || mask < 0 || mask > 32) {
      logger.warn('Invalid CIDR mask', { cidr });
      return false;
    }

    const ipParts = ip.split('.').map(Number);
    const rangeParts = range.split('.').map(Number);

    if (ipParts.length !== 4 || rangeParts.length !== 4) {
      // IPv6 not fully supported in this simple implementation
      return false;
    }

    if (ipParts.some(isNaN) || rangeParts.some(isNaN)) {
      return false;
    }

    // Convert to 32-bit integers
    const ipInt = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    const rangeInt = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];

    // Create mask
    const maskInt = mask === 0 ? 0 : (-1 << (32 - mask));

    return (ipInt & maskInt) === (rangeInt & maskInt);
  } catch (error) {
    logger.error('Error checking CIDR range', { error, ip, cidr });
    return false;
  }
}

/**
 * Validate IP allowlist configuration
 * Checks that all IPs/CIDR ranges are valid
 *
 * @param allowlist - Array of IPs/CIDR ranges to validate
 * @returns validation result with errors if any
 */
export function validateIPAllowlist(allowlist: string[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const entry of allowlist) {
    if (entry.includes('/')) {
      // Validate CIDR
      const [range, bits] = entry.split('/');
      const mask = parseInt(bits, 10);

      if (isNaN(mask) || mask < 0 || mask > 32) {
        errors.push(`Invalid CIDR mask in: ${entry}`);
        continue;
      }

      const parts = range.split('.');
      if (parts.length !== 4 || parts.some((p) => {
        const num = parseInt(p, 10);
        return isNaN(num) || num < 0 || num > 255;
      })) {
        errors.push(`Invalid IP address in CIDR: ${entry}`);
      }
    } else {
      // Validate IP
      const parts = entry.split('.');
      if (parts.length !== 4 || parts.some((p) => {
        const num = parseInt(p, 10);
        return isNaN(num) || num < 0 || num > 255;
      })) {
        errors.push(`Invalid IP address: ${entry}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get IP address from request, handling proxies
 * Checks X-Forwarded-For, X-Real-IP headers
 *
 * @param request - Fastify request object
 * @returns IP address
 */
export function getClientIP(request: any): string {
  // Check X-Forwarded-For (proxy/load balancer)
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    // Take first IP in chain
    const ips = forwardedFor.split(',').map((ip: string) => ip.trim());
    return normalizeIP(ips[0]);
  }

  // Check X-Real-IP
  const realIP = request.headers['x-real-ip'];
  if (realIP) {
    return normalizeIP(realIP);
  }

  // Fallback to Fastify's request.ip
  return normalizeIP(request.ip || '127.0.0.1');
}

/**
 * Check if request IP is allowed based on share link configuration
 *
 * @param request - Fastify request object
 * @param shareLinkConfig - Share link configuration with IP allowlist
 * @returns validation result
 */
export function validateRequestIP(
  request: any,
  shareLinkConfig: {
    ip_allowlist_enabled: boolean;
    allowed_ips: string[] | null;
  }
): {
  allowed: boolean;
  ip: string;
  reason?: string;
} {
  const clientIP = getClientIP(request);

  if (!shareLinkConfig.ip_allowlist_enabled) {
    return { allowed: true, ip: clientIP };
  }

  const allowed = isIPInAllowlist(clientIP, shareLinkConfig.allowed_ips);

  return {
    allowed,
    ip: clientIP,
    reason: allowed ? undefined : 'IP address not in allowlist',
  };
}
