import { describe, it, expect } from 'vitest';
import {
  buildRLSContext,
  applyRLSToQuery,
  validateTableAccess,
  extractTables
} from '../security/rls.js';

describe('Row-Level Security', () => {
  const mockTenant = {
    companyId: 'test-company-id',
    userId: 'test-user-id',
    role: 'analyst',
    permissions: []
  };

  const mockRequest = {} as any;

  describe('RLS Context Building', () => {
    it('should build RLS context for analyst role', () => {
      const context = buildRLSContext(mockTenant, mockRequest);

      expect(context.companyId).toBe('test-company-id');
      expect(context.role).toBe('analyst');
      expect(context.allowedTables).toContain('outcome_scores');
      expect(context.deniedTables).toContain('users');
      expect(context.rateLimits.queriesPerHour).toBe(200);
    });

    it('should give system_admin full access', () => {
      const adminTenant = { ...mockTenant, role: 'system_admin' };
      const context = buildRLSContext(adminTenant, mockRequest);

      expect(context.allowedTables).toEqual(['*']);
      expect(context.rateLimits.queriesPerHour).toBe(1000);
    });
  });

  describe('Table Access Validation', () => {
    it('should allow access to permitted tables', () => {
      const context = buildRLSContext(mockTenant, mockRequest);
      const result = validateTableAccess(['outcome_scores'], context);

      expect(result.allowed).toBe(true);
    });

    it('should deny access to forbidden tables', () => {
      const context = buildRLSContext(mockTenant, mockRequest);
      const result = validateTableAccess(['users', 'pii'], context);

      expect(result.allowed).toBe(false);
      expect(result.deniedTables).toContain('users');
    });
  });

  describe('SQL Modification', () => {
    it('should inject company_id filter', () => {
      const context = buildRLSContext(mockTenant, mockRequest);
      const sql = 'SELECT * FROM outcome_scores';
      const { sql: secured } = applyRLSToQuery(sql, context);

      expect(secured).toContain('company_id = $1');
    });

    it('should not modify queries for system_admin', () => {
      const adminTenant = { ...mockTenant, role: 'system_admin' };
      const context = buildRLSContext(adminTenant, mockRequest);
      const sql = 'SELECT * FROM outcome_scores';
      const { sql: secured } = applyRLSToQuery(sql, context);

      // System admin bypasses RLS
      expect(secured).not.toContain('company_id = $1');
    });
  });

  describe('Table Extraction', () => {
    it('should extract tables from SQL', () => {
      const sql = 'SELECT * FROM outcome_scores JOIN journey_transitions ON ...';
      const tables = extractTables(sql);

      expect(tables).toContain('outcome_scores');
      expect(tables).toContain('journey_transitions');
    });
  });
});
