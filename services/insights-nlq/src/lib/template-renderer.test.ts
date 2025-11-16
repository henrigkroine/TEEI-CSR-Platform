/**
 * Template Renderer Test Suite
 *
 * Tests for Mustache-style template rendering with:
 * - Date math and range calculation
 * - Parameter sanitization
 * - SQL injection prevention
 * - Type-safe value conversion
 */

import { describe, it, expect } from 'vitest';
import {
  renderTemplate,
  calculateDateRange,
  validateRenderedSql,
} from './template-renderer.js';

describe('Template Renderer', () => {
  describe('renderTemplate()', () => {
    it('should render simple template with placeholders', () => {
      const template = 'SELECT * FROM users WHERE company_id = {{companyId}} LIMIT {{limit}}';
      const context = {
        companyId: '12345678-1234-1234-1234-123456789012',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        limit: 100,
      };

      const result = renderTemplate(template, context);

      expect(result.sql).toContain("company_id = '12345678-1234-1234-1234-123456789012'");
      expect(result.sql).toContain('LIMIT 100');
      expect(result.sanitized).toBe(true);
    });

    it('should sanitize UUID parameters', () => {
      const template = 'WHERE company_id = {{companyId}}';
      const context = {
        companyId: '12345678-1234-1234-1234-123456789012',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        limit: 100,
      };

      const result = renderTemplate(template, context);

      expect(result.sql).toContain("'12345678-1234-1234-1234-123456789012'");
    });

    it('should sanitize date parameters', () => {
      const template = 'WHERE created_at >= {{startDate}} AND created_at <= {{endDate}}';
      const context = {
        companyId: '12345678-1234-1234-1234-123456789012',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        limit: 100,
      };

      const result = renderTemplate(template, context);

      expect(result.sql).toContain("'2025-01-01'");
      expect(result.sql).toContain("'2025-01-31'");
    });

    it('should handle numeric parameters without quotes', () => {
      const template = 'LIMIT {{limit}}';
      const context = {
        companyId: '12345678-1234-1234-1234-123456789012',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        limit: 50,
      };

      const result = renderTemplate(template, context);

      expect(result.sql).toBe('LIMIT 50');
      expect(result.sql).not.toContain("'50'");
    });

    it('should escape single quotes in string values', () => {
      const template = "WHERE name = {{name}}";
      const context = {
        companyId: '12345678-1234-1234-1234-123456789012',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        limit: 100,
        name: "O'Brien",
      };

      const result = renderTemplate(template, context);

      expect(result.sql).toContain("'O''Brien'"); // SQL escaping
    });

    it('should throw error for missing required parameters', () => {
      const template = 'WHERE company_id = {{companyId}} AND name = {{name}}';
      const context = {
        companyId: '12345678-1234-1234-1234-123456789012',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        limit: 100,
        // name is missing
      };

      expect(() => renderTemplate(template, context)).toThrow('Missing required parameter: name');
    });

    it('should throw error for invalid UUID format', () => {
      const template = 'WHERE company_id = {{companyId}}';
      const context = {
        companyId: 'not-a-valid-uuid',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        limit: 100,
      };

      expect(() => renderTemplate(template, context)).toThrow('Invalid UUID');
    });

    it('should throw error for invalid date format', () => {
      const template = 'WHERE created_at >= {{startDate}}';
      const context = {
        companyId: '12345678-1234-1234-1234-123456789012',
        startDate: 'not-a-date',
        endDate: '2025-01-31',
        limit: 100,
      };

      expect(() => renderTemplate(template, context)).toThrow('Invalid date');
    });

    it('should throw error for invalid number', () => {
      const template = 'LIMIT {{limit}}';
      const context = {
        companyId: '12345678-1234-1234-1234-123456789012',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        limit: Infinity,
      };

      expect(() => renderTemplate(template, context)).toThrow('Invalid number');
    });

    it('should strip SQL comments from template', () => {
      const template = `
        SELECT *
        FROM users
        -- This is a comment
        WHERE company_id = {{companyId}}
      `;
      const context = {
        companyId: '12345678-1234-1234-1234-123456789012',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        limit: 100,
      };

      const result = renderTemplate(template, context);

      expect(result.sql).not.toContain('--');
      expect(result.sql).not.toContain('This is a comment');
    });

    it('should normalize whitespace', () => {
      const template = `
        SELECT     *
        FROM       users
        WHERE      company_id = {{companyId}}
      `;
      const context = {
        companyId: '12345678-1234-1234-1234-123456789012',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        limit: 100,
      };

      const result = renderTemplate(template, context);

      expect(result.sql).not.toContain('     ');
      expect(result.sql).toContain('SELECT * FROM users WHERE');
    });

    it('should validate cohort type enum', () => {
      const template = 'WHERE cohort_type = {{cohortType}}';
      const context = {
        companyId: '12345678-1234-1234-1234-123456789012',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        limit: 100,
        cohortType: 'industry',
      };

      const result = renderTemplate(template, context);

      expect(result.sql).toContain("'industry'");
    });

    it('should reject invalid cohort type', () => {
      const template = 'WHERE cohort_type = {{cohortType}}';
      const context = {
        companyId: '12345678-1234-1234-1234-123456789012',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        limit: 100,
        cohortType: 'invalid_cohort',
      };

      expect(() => renderTemplate(template, context)).toThrow('Invalid cohort type');
    });
  });

  describe('calculateDateRange()', () => {
    it('should calculate last_7d range', () => {
      const range = calculateDateRange('last_7d');

      const start = new Date(range.startDate);
      const end = new Date(range.endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysDiff).toBe(7);
      expect(range.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should calculate last_30d range', () => {
      const range = calculateDateRange('last_30d');

      const start = new Date(range.startDate);
      const end = new Date(range.endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysDiff).toBe(30);
    });

    it('should calculate last_90d range', () => {
      const range = calculateDateRange('last_90d');

      const start = new Date(range.startDate);
      const end = new Date(range.endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysDiff).toBe(90);
    });

    it('should calculate ytd range', () => {
      const range = calculateDateRange('ytd');

      const start = new Date(range.startDate);
      const now = new Date();

      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1);
      expect(start.getFullYear()).toBe(now.getFullYear());
    });

    it('should calculate last_quarter range', () => {
      const range = calculateDateRange('last_quarter');

      const start = new Date(range.startDate);
      const quarterMonth = start.getMonth();

      expect([0, 3, 6, 9]).toContain(quarterMonth); // Quarter starts
      expect(start.getDate()).toBe(1);
    });

    it('should calculate last_year range', () => {
      const range = calculateDateRange('last_year');

      const start = new Date(range.startDate);
      const now = new Date();

      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1);
      expect(start.getFullYear()).toBe(now.getFullYear() - 1);
    });

    it('should handle custom date range', () => {
      const range = calculateDateRange('custom', '2025-01-01', '2025-03-31');

      expect(range.startDate).toBe('2025-01-01');
      expect(range.endDate).toBe('2025-03-31');
    });

    it('should throw error for custom range without dates', () => {
      expect(() => calculateDateRange('custom')).toThrow(
        'Custom date range requires startDate and endDate'
      );
    });
  });

  describe('validateRenderedSql()', () => {
    it('should validate SQL with expected tables', () => {
      const sql = 'SELECT * FROM metrics_company_period WHERE company_id = \'123\'';
      const expectedTables = ['metrics_company_period'];

      expect(() => validateRenderedSql(sql, expectedTables)).not.toThrow();
    });

    it('should throw if expected table is missing', () => {
      const sql = 'SELECT * FROM users WHERE company_id = \'123\'';
      const expectedTables = ['metrics_company_period'];

      expect(() => validateRenderedSql(sql, expectedTables)).toThrow('Expected table');
    });

    it('should throw if placeholders remain', () => {
      const sql = 'SELECT * FROM users WHERE company_id = {{companyId}}';
      const expectedTables = ['users'];

      expect(() => validateRenderedSql(sql, expectedTables)).toThrow(
        'Template rendering incomplete'
      );
    });

    it('should detect DROP injection', () => {
      const sql = 'SELECT * FROM users; DROP TABLE users;';
      const expectedTables = ['users'];

      expect(() => validateRenderedSql(sql, expectedTables)).toThrow('SQL injection');
    });

    it('should detect DELETE injection', () => {
      const sql = 'SELECT * FROM users; DELETE FROM users;';
      const expectedTables = ['users'];

      expect(() => validateRenderedSql(sql, expectedTables)).toThrow('SQL injection');
    });

    it('should detect UPDATE injection', () => {
      const sql = 'SELECT * FROM users; UPDATE users SET admin = true;';
      const expectedTables = ['users'];

      expect(() => validateRenderedSql(sql, expectedTables)).toThrow('SQL injection');
    });

    it('should detect UNION injection', () => {
      const sql = 'SELECT * FROM users UNION SELECT * FROM passwords';
      const expectedTables = ['users'];

      expect(() => validateRenderedSql(sql, expectedTables)).toThrow('SQL injection');
    });

    it('should validate JOIN clauses', () => {
      const sql = 'SELECT * FROM users JOIN outcome_scores ON users.id = outcome_scores.user_id';
      const expectedTables = ['users', 'outcome_scores'];

      expect(() => validateRenderedSql(sql, expectedTables)).not.toThrow();
    });
  });
});
