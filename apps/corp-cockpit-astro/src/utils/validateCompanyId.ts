/**
 * Company ID Validation Utilities
 *
 * Validates company IDs to prevent injection attacks and ensure data integrity.
 */

/**
 * Validates a company ID
 *
 * Accepts:
 * - UUID format (e.g., "550e8400-e29b-41d4-a716-446655440000")
 * - Numeric ID (e.g., "123", "456")
 * - Alphanumeric slug (e.g., "acme-corp", "company_123")
 *
 * Rejects:
 * - Empty strings
 * - SQL injection patterns
 * - Path traversal attempts (../, ..\)
 * - Special characters that could be exploited
 */
export function validateCompanyId(companyId: string): boolean {
  if (!companyId || typeof companyId !== 'string') {
    return false;
  }

  // Trim whitespace
  const trimmed = companyId.trim();

  if (trimmed.length === 0 || trimmed.length > 100) {
    return false;
  }

  // Check for path traversal attempts
  if (trimmed.includes('../') || trimmed.includes('..\\')) {
    return false;
  }

  // Check for SQL injection patterns
  const sqlInjectionPattern = /(;|--|\/\*|\*\/|union|select|insert|update|delete|drop|create|alter|exec|execute)/i;
  if (sqlInjectionPattern.test(trimmed)) {
    return false;
  }

  // UUID format: 8-4-4-4-12 hex digits
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(trimmed)) {
    return true;
  }

  // Numeric ID: 1-20 digits
  const numericPattern = /^[0-9]{1,20}$/;
  if (numericPattern.test(trimmed)) {
    return true;
  }

  // Alphanumeric slug: letters, numbers, hyphens, underscores
  const slugPattern = /^[a-z0-9_-]{1,100}$/i;
  if (slugPattern.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Sanitizes a company ID for safe use in database queries
 *
 * Returns null if the ID is invalid
 */
export function sanitizeCompanyId(companyId: string): string | null {
  if (!validateCompanyId(companyId)) {
    return null;
  }

  return companyId.trim();
}

/**
 * Checks if a company ID is a UUID
 */
export function isUUID(companyId: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(companyId);
}

/**
 * Checks if a company ID is numeric
 */
export function isNumericId(companyId: string): boolean {
  const numericPattern = /^[0-9]{1,20}$/;
  return numericPattern.test(companyId);
}
