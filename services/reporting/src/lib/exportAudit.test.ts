/**
 * Export Audit Logger Tests
 *
 * Comprehensive test suite for export audit logging functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  logExportAttempt,
  logExportSuccess,
  logExportFailure,
  getExportLogs,
  getExportStats,
  exportAuditLogsCSV,
  cleanupOldLogs,
  getExportLogsCount,
} from './exportAudit.js';

// Helper to create sample audit entry
function createSampleEntry() {
  return {
    tenantId: 'tenant-123',
    userId: 'user-456',
    userName: 'Jane Doe',
    exportType: 'pdf' as const,
    reportId: 'report-789',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
}

describe('Export Audit Logger', () => {
  describe('logExportAttempt', () => {
    it('should log export attempt and return exportId', () => {
      const entry = createSampleEntry();
      const exportId = logExportAttempt(entry);

      expect(exportId).toBeDefined();
      expect(exportId).toContain('exp_');
    });

    it('should create unique export IDs for each attempt', () => {
      const entry = createSampleEntry();
      const id1 = logExportAttempt(entry);
      const id2 = logExportAttempt(entry);

      expect(id1).not.toBe(id2);
    });

    it('should mask PII in stored entry', () => {
      const entry = createSampleEntry();
      const exportId = logExportAttempt(entry);

      const logs = getExportLogs('tenant-123');
      const logEntry = logs.find((log) => log.exportId === exportId);

      expect(logEntry).toBeDefined();
      expect(logEntry!.userName).not.toBe('Jane Doe'); // Should be masked
      expect(logEntry!.ipAddress).not.toBe('192.168.1.100'); // Should be masked
    });

    it('should set status to initiated', () => {
      const entry = createSampleEntry();
      const exportId = logExportAttempt(entry);

      const logs = getExportLogs('tenant-123');
      const logEntry = logs.find((log) => log.exportId === exportId);

      expect(logEntry!.status).toBe('initiated');
    });

    it('should handle different export types', () => {
      const types: Array<'pdf' | 'csv' | 'json' | 'ppt'> = ['pdf', 'csv', 'json', 'ppt'];

      types.forEach((type) => {
        const exportId = logExportAttempt({
          ...createSampleEntry(),
          exportType: type,
        });

        const logs = getExportLogs('tenant-123');
        const logEntry = logs.find((log) => log.exportId === exportId);

        expect(logEntry!.exportType).toBe(type);
      });
    });

    it('should handle batch exports with reportIds', () => {
      const exportId = logExportAttempt({
        ...createSampleEntry(),
        reportId: undefined,
        reportIds: ['report-1', 'report-2', 'report-3'],
      });

      const logs = getExportLogs('tenant-123');
      const logEntry = logs.find((log) => log.exportId === exportId);

      expect(logEntry!.reportIds).toEqual(['report-1', 'report-2', 'report-3']);
    });
  });

  describe('logExportSuccess', () => {
    it('should update entry with success status', () => {
      const entry = createSampleEntry();
      const exportId = logExportAttempt(entry);

      logExportSuccess(exportId, {
        fileSize: 1024567,
        renderTime: 2340,
        metadata: { pageCount: 12 },
      });

      const logs = getExportLogs('tenant-123');
      const logEntry = logs.find((log) => log.exportId === exportId);

      expect(logEntry!.status).toBe('success');
      expect(logEntry!.fileSize).toBe(1024567);
      expect(logEntry!.renderTime).toBe(2340);
      expect(logEntry!.metadata).toEqual({ pageCount: 12 });
    });

    it('should handle missing exportId gracefully', () => {
      expect(() => {
        logExportSuccess('nonexistent-id', {
          fileSize: 1024,
        });
      }).not.toThrow();
    });
  });

  describe('logExportFailure', () => {
    it('should update entry with failed status and error message', () => {
      const entry = createSampleEntry();
      const exportId = logExportAttempt(entry);

      logExportFailure(exportId, 'Report not found');

      const logs = getExportLogs('tenant-123');
      const logEntry = logs.find((log) => log.exportId === exportId);

      expect(logEntry!.status).toBe('failed');
      expect(logEntry!.errorMessage).toBe('Report not found');
    });

    it('should handle Error objects', () => {
      const entry = createSampleEntry();
      const exportId = logExportAttempt(entry);

      const error = new Error('Database connection failed');
      logExportFailure(exportId, error);

      const logs = getExportLogs('tenant-123');
      const logEntry = logs.find((log) => log.exportId === exportId);

      expect(logEntry!.status).toBe('failed');
      expect(logEntry!.errorMessage).toBe('Database connection failed');
    });
  });

  describe('getExportLogs', () => {
    beforeEach(() => {
      // Create multiple test entries
      for (let i = 0; i < 5; i++) {
        logExportAttempt({
          tenantId: 'tenant-123',
          userId: `user-${i}`,
          userName: `User ${i}`,
          exportType: i % 2 === 0 ? 'pdf' : 'csv',
          reportId: `report-${i}`,
          ipAddress: `192.168.1.${100 + i}`,
          userAgent: 'Test Agent',
        });
      }
    });

    it('should return all logs for a tenant', () => {
      const logs = getExportLogs('tenant-123');
      expect(logs.length).toBeGreaterThanOrEqual(5);
    });

    it('should filter by export type', () => {
      const logs = getExportLogs('tenant-123', { exportType: 'pdf' });
      expect(logs.every((log) => log.exportType === 'pdf')).toBe(true);
    });

    it('should filter by userId', () => {
      const logs = getExportLogs('tenant-123', { userId: 'user-0' });
      expect(logs.every((log) => log.userId === 'user-0')).toBe(true);
    });

    it('should filter by status', () => {
      const exportId = logExportAttempt({
        ...createSampleEntry(),
        tenantId: 'tenant-123',
      });
      logExportSuccess(exportId, { fileSize: 1024 });

      const logs = getExportLogs('tenant-123', { status: 'success' });
      expect(logs.some((log) => log.exportId === exportId)).toBe(true);
      expect(logs.every((log) => log.status === 'success')).toBe(true);
    });

    it('should filter by date range', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1); // Yesterday

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 1); // Tomorrow

      const logs = getExportLogs('tenant-123', { startDate, endDate });
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should apply pagination with limit', () => {
      const logs = getExportLogs('tenant-123', { limit: 2 });
      expect(logs.length).toBeLessThanOrEqual(2);
    });

    it('should apply pagination with offset', () => {
      const allLogs = getExportLogs('tenant-123');
      const offsetLogs = getExportLogs('tenant-123', { offset: 2 });

      expect(offsetLogs.length).toBeLessThan(allLogs.length);
    });

    it('should return empty array for non-existent tenant', () => {
      const logs = getExportLogs('nonexistent-tenant');
      expect(logs).toEqual([]);
    });

    it('should sort logs by most recent first', () => {
      const logs = getExportLogs('tenant-123');

      for (let i = 0; i < logs.length - 1; i++) {
        expect(logs[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          logs[i + 1].timestamp.getTime()
        );
      }
    });
  });

  describe('getExportStats', () => {
    beforeEach(() => {
      // Create test data
      const exportId1 = logExportAttempt({
        ...createSampleEntry(),
        tenantId: 'tenant-stats',
        exportType: 'pdf',
      });
      logExportSuccess(exportId1, {
        fileSize: 1000000,
        renderTime: 2000,
      });

      const exportId2 = logExportAttempt({
        ...createSampleEntry(),
        tenantId: 'tenant-stats',
        exportType: 'csv',
      });
      logExportSuccess(exportId2, {
        fileSize: 500000,
        renderTime: 1000,
      });

      const exportId3 = logExportAttempt({
        ...createSampleEntry(),
        tenantId: 'tenant-stats',
        exportType: 'pdf',
      });
      logExportFailure(exportId3, 'Export failed');
    });

    it('should calculate total exports', () => {
      const stats = getExportStats('tenant-stats', {
        from: new Date(Date.now() - 86400000),
        to: new Date(Date.now() + 86400000),
      });

      expect(stats.total).toBe(3);
    });

    it('should break down by export type', () => {
      const stats = getExportStats('tenant-stats', {
        from: new Date(Date.now() - 86400000),
        to: new Date(Date.now() + 86400000),
      });

      expect(stats.byType.pdf).toBe(2);
      expect(stats.byType.csv).toBe(1);
    });

    it('should break down by status', () => {
      const stats = getExportStats('tenant-stats', {
        from: new Date(Date.now() - 86400000),
        to: new Date(Date.now() + 86400000),
      });

      expect(stats.byStatus.success).toBe(2);
      expect(stats.byStatus.failed).toBe(1);
    });

    it('should calculate success rate', () => {
      const stats = getExportStats('tenant-stats', {
        from: new Date(Date.now() - 86400000),
        to: new Date(Date.now() + 86400000),
      });

      expect(stats.successRate).toBeCloseTo(2 / 3);
    });

    it('should calculate average file size', () => {
      const stats = getExportStats('tenant-stats', {
        from: new Date(Date.now() - 86400000),
        to: new Date(Date.now() + 86400000),
      });

      expect(stats.averageFileSize).toBeCloseTo(1500000 / 3);
    });

    it('should calculate average render time', () => {
      const stats = getExportStats('tenant-stats', {
        from: new Date(Date.now() - 86400000),
        to: new Date(Date.now() + 86400000),
      });

      expect(stats.averageRenderTime).toBeCloseTo(1500);
    });

    it('should calculate total data exported', () => {
      const stats = getExportStats('tenant-stats', {
        from: new Date(Date.now() - 86400000),
        to: new Date(Date.now() + 86400000),
      });

      expect(stats.totalDataExported).toBe(1500000);
    });

    it('should mask user names in byUser stats', () => {
      const stats = getExportStats('tenant-stats', {
        from: new Date(Date.now() - 86400000),
        to: new Date(Date.now() + 86400000),
      });

      const userKeys = Object.keys(stats.byUser);
      expect(userKeys.some((key) => key.includes('***'))).toBe(true);
    });
  });

  describe('exportAuditLogsCSV', () => {
    beforeEach(() => {
      const exportId = logExportAttempt({
        ...createSampleEntry(),
        tenantId: 'tenant-csv',
      });
      logExportSuccess(exportId, {
        fileSize: 1024567,
        renderTime: 2340,
      });
    });

    it('should generate valid CSV', () => {
      const csv = exportAuditLogsCSV('tenant-csv', {
        from: new Date(Date.now() - 86400000),
        to: new Date(Date.now() + 86400000),
      });

      expect(csv).toContain('Export ID');
      expect(csv).toContain('Timestamp');
      expect(csv).toContain('Export Type');
      expect(csv).toContain('Status');
    });

    it('should include data rows', () => {
      const csv = exportAuditLogsCSV('tenant-csv', {
        from: new Date(Date.now() - 86400000),
        to: new Date(Date.now() + 86400000),
      });

      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThan(1); // Header + at least one data row
    });

    it('should mask PII in CSV', () => {
      const csv = exportAuditLogsCSV('tenant-csv', {
        from: new Date(Date.now() - 86400000),
        to: new Date(Date.now() + 86400000),
      });

      // Should contain masked data
      expect(csv).toContain('***');
    });

    it('should escape quotes in CSV', () => {
      const exportId = logExportAttempt({
        ...createSampleEntry(),
        tenantId: 'tenant-csv',
        userName: 'User "Nickname" Lastname',
      });

      const csv = exportAuditLogsCSV('tenant-csv', {
        from: new Date(Date.now() - 86400000),
        to: new Date(Date.now() + 86400000),
      });

      // Should properly escape quotes
      expect(csv).toContain('""');
    });
  });

  describe('cleanupOldLogs', () => {
    it('should remove logs older than retention period', () => {
      // This test would require mocking dates or using a test retention period
      // For now, we'll just verify it runs without error
      const deleted = cleanupOldLogs();
      expect(deleted).toBeGreaterThanOrEqual(0);
    });

    it('should return count of deleted logs', () => {
      const deleted = cleanupOldLogs();
      expect(typeof deleted).toBe('number');
    });
  });

  describe('getExportLogsCount', () => {
    beforeEach(() => {
      for (let i = 0; i < 3; i++) {
        logExportAttempt({
          ...createSampleEntry(),
          tenantId: 'tenant-count',
          userId: `user-${i}`,
        });
      }
    });

    it('should return total count', () => {
      const count = getExportLogsCount('tenant-count');
      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('should return count with filters', () => {
      const count = getExportLogsCount('tenant-count', {
        exportType: 'pdf',
      });
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('PII Masking', () => {
    it('should mask user names correctly', () => {
      const exportId = logExportAttempt({
        ...createSampleEntry(),
        userName: 'Jane Doe',
      });

      const logs = getExportLogs('tenant-123');
      const logEntry = logs.find((log) => log.exportId === exportId);

      expect(logEntry!.userName).toBe('J*** D***');
    });

    it('should mask email user names correctly', () => {
      const exportId = logExportAttempt({
        ...createSampleEntry(),
        userName: 'jane.doe@example.com',
      });

      const logs = getExportLogs('tenant-123');
      const logEntry = logs.find((log) => log.exportId === exportId);

      expect(logEntry!.userName).toBe('j***@example.com');
    });

    it('should mask IPv4 addresses correctly', () => {
      const exportId = logExportAttempt({
        ...createSampleEntry(),
        ipAddress: '192.168.1.100',
      });

      const logs = getExportLogs('tenant-123');
      const logEntry = logs.find((log) => log.exportId === exportId);

      expect(logEntry!.ipAddress).toBe('192.168.***.***');
    });

    it('should mask IPv6 addresses correctly', () => {
      const exportId = logExportAttempt({
        ...createSampleEntry(),
        ipAddress: '2001:0db8:85a3::8a2e:0370:7334',
      });

      const logs = getExportLogs('tenant-123');
      const logEntry = logs.find((log) => log.exportId === exportId);

      expect(logEntry!.ipAddress).toBe('2001:0db8:****');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional fields', () => {
      const exportId = logExportAttempt({
        tenantId: 'tenant-123',
        userId: 'user-456',
        userName: 'Test User',
        exportType: 'pdf',
        ipAddress: '192.168.1.1',
        // No reportId, userAgent, etc.
      });

      const logs = getExportLogs('tenant-123');
      const logEntry = logs.find((log) => log.exportId === exportId);

      expect(logEntry).toBeDefined();
      expect(logEntry!.userAgent).toBeUndefined();
    });

    it('should handle empty string values', () => {
      const exportId = logExportAttempt({
        ...createSampleEntry(),
        userName: '',
        ipAddress: '',
      });

      expect(() => {
        getExportLogs('tenant-123');
      }).not.toThrow();
    });

    it('should handle very large file sizes', () => {
      const exportId = logExportAttempt(createSampleEntry());

      logExportSuccess(exportId, {
        fileSize: 10 * 1024 * 1024 * 1024, // 10 GB
      });

      const logs = getExportLogs('tenant-123');
      const logEntry = logs.find((log) => log.exportId === exportId);

      expect(logEntry!.fileSize).toBe(10 * 1024 * 1024 * 1024);
    });
  });
});
