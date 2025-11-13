import { describe, it, expect } from 'vitest';
import { validateCompanyId, sanitizeCompanyId, isUUID, isNumericId } from './validateCompanyId';

describe('validateCompanyId', () => {
  describe('Valid UUIDs', () => {
    it('should accept standard UUID format', () => {
      expect(validateCompanyId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(validateCompanyId('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should accept UUIDs with uppercase letters', () => {
      expect(validateCompanyId('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });

    it('should accept UUIDs with mixed case', () => {
      expect(validateCompanyId('550e8400-E29b-41D4-a716-446655440000')).toBe(true);
    });
  });

  describe('Valid Numeric IDs', () => {
    it('should accept simple numeric IDs', () => {
      expect(validateCompanyId('123')).toBe(true);
      expect(validateCompanyId('456789')).toBe(true);
      expect(validateCompanyId('1')).toBe(true);
    });

    it('should accept long numeric IDs up to 20 digits', () => {
      expect(validateCompanyId('12345678901234567890')).toBe(true);
    });
  });

  describe('Valid Alphanumeric Slugs', () => {
    it('should accept lowercase slugs', () => {
      expect(validateCompanyId('acme-corp')).toBe(true);
      expect(validateCompanyId('company_123')).toBe(true);
      expect(validateCompanyId('my-company-name')).toBe(true);
    });

    it('should accept uppercase slugs', () => {
      expect(validateCompanyId('ACME-CORP')).toBe(true);
    });

    it('should accept mixed case slugs', () => {
      expect(validateCompanyId('AcmeCorp')).toBe(true);
      expect(validateCompanyId('Company-123')).toBe(true);
    });

    it('should accept slugs with underscores', () => {
      expect(validateCompanyId('company_name_123')).toBe(true);
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject empty strings', () => {
      expect(validateCompanyId('')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(validateCompanyId(null as any)).toBe(false);
      expect(validateCompanyId(undefined as any)).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(validateCompanyId(123 as any)).toBe(false);
      expect(validateCompanyId({} as any)).toBe(false);
      expect(validateCompanyId([] as any)).toBe(false);
    });

    it('should reject whitespace-only strings', () => {
      expect(validateCompanyId('   ')).toBe(false);
      expect(validateCompanyId('\t\n')).toBe(false);
    });

    it('should reject strings exceeding 100 characters', () => {
      const longString = 'a'.repeat(101);
      expect(validateCompanyId(longString)).toBe(false);
    });
  });

  describe('Security - Path Traversal', () => {
    it('should reject path traversal attempts with ../', () => {
      expect(validateCompanyId('../etc/passwd')).toBe(false);
      expect(validateCompanyId('../../root')).toBe(false);
      expect(validateCompanyId('company/../admin')).toBe(false);
    });

    it('should reject path traversal attempts with ..\\', () => {
      expect(validateCompanyId('..\\windows')).toBe(false);
      expect(validateCompanyId('company\\..\\admin')).toBe(false);
    });
  });

  describe('Security - SQL Injection', () => {
    it('should reject SQL injection with semicolons', () => {
      expect(validateCompanyId('1; DROP TABLE companies;')).toBe(false);
      expect(validateCompanyId('123; DELETE FROM users;')).toBe(false);
    });

    it('should reject SQL injection with comments', () => {
      expect(validateCompanyId('1-- comment')).toBe(false);
      expect(validateCompanyId('1/* comment */')).toBe(false);
    });

    it('should reject SQL injection with keywords', () => {
      expect(validateCompanyId('UNION SELECT * FROM users')).toBe(false);
      expect(validateCompanyId('INSERT INTO companies')).toBe(false);
      expect(validateCompanyId('UPDATE companies SET')).toBe(false);
      expect(validateCompanyId('DELETE FROM companies')).toBe(false);
      expect(validateCompanyId('DROP TABLE companies')).toBe(false);
      expect(validateCompanyId('CREATE TABLE companies')).toBe(false);
      expect(validateCompanyId('ALTER TABLE companies')).toBe(false);
      expect(validateCompanyId('EXEC sp_executesql')).toBe(false);
      expect(validateCompanyId('EXECUTE sp_executesql')).toBe(false);
    });

    it('should reject case variations of SQL keywords', () => {
      expect(validateCompanyId('union select')).toBe(false);
      expect(validateCompanyId('Union Select')).toBe(false);
      expect(validateCompanyId('UNION SELECT')).toBe(false);
    });
  });

  describe('Security - Special Characters', () => {
    it('should reject IDs with spaces', () => {
      expect(validateCompanyId('company name')).toBe(false);
    });

    it('should reject IDs with special characters', () => {
      expect(validateCompanyId('company@name')).toBe(false);
      expect(validateCompanyId('company#name')).toBe(false);
      expect(validateCompanyId('company$name')).toBe(false);
      expect(validateCompanyId('company%name')).toBe(false);
      expect(validateCompanyId('company&name')).toBe(false);
      expect(validateCompanyId('company*name')).toBe(false);
      expect(validateCompanyId('company(name')).toBe(false);
      expect(validateCompanyId('company)name')).toBe(false);
    });

    it('should reject IDs with slashes', () => {
      expect(validateCompanyId('company/name')).toBe(false);
      expect(validateCompanyId('company\\name')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle strings with leading/trailing whitespace', () => {
      // validateCompanyId trims internally before validation
      expect(validateCompanyId('  123  ')).toBe(true);
      expect(validateCompanyId('\tacme-corp\n')).toBe(true);
    });

    it('should reject malformed UUIDs', () => {
      expect(validateCompanyId('550e8400-e29b-41d4-a716')).toBe(false); // Too short
      expect(validateCompanyId('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false); // Too long
      expect(validateCompanyId('550e8400-e29b-41d4-a716-44665544000g')).toBe(false); // Invalid char 'g'
    });

    it('should reject numeric IDs longer than 20 digits', () => {
      expect(validateCompanyId('123456789012345678901')).toBe(false);
    });
  });
});

describe('sanitizeCompanyId', () => {
  it('should return trimmed ID for valid inputs', () => {
    expect(sanitizeCompanyId('  123  ')).toBe('123');
    expect(sanitizeCompanyId('\tacme-corp\n')).toBe('acme-corp');
  });

  it('should return null for invalid inputs', () => {
    expect(sanitizeCompanyId('')).toBe(null);
    expect(sanitizeCompanyId('../etc/passwd')).toBe(null);
    expect(sanitizeCompanyId('1; DROP TABLE')).toBe(null);
  });
});

describe('isUUID', () => {
  it('should return true for valid UUIDs', () => {
    expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should return false for non-UUIDs', () => {
    expect(isUUID('123')).toBe(false);
    expect(isUUID('acme-corp')).toBe(false);
    expect(isUUID('not-a-uuid')).toBe(false);
  });
});

describe('isNumericId', () => {
  it('should return true for numeric IDs', () => {
    expect(isNumericId('123')).toBe(true);
    expect(isNumericId('456789')).toBe(true);
  });

  it('should return false for non-numeric IDs', () => {
    expect(isNumericId('abc')).toBe(false);
    expect(isNumericId('123abc')).toBe(false);
    expect(isNumericId('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
  });

  it('should reject numeric IDs longer than 20 digits', () => {
    expect(isNumericId('123456789012345678901')).toBe(false);
  });
});
