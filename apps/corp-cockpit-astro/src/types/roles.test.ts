import { describe, it, expect } from 'vitest';
import {
  ROLES,
  ROLE_HIERARCHY,
  hasRoleLevel,
  hasPermission,
  requirePermission,
  getRolePermissions,
} from './roles';

describe('Role Hierarchy', () => {
  it('should have correct hierarchy levels', () => {
    expect(ROLE_HIERARCHY.SUPER_ADMIN).toBe(4);
    expect(ROLE_HIERARCHY.ADMIN).toBe(3);
    expect(ROLE_HIERARCHY.MANAGER).toBe(2);
    expect(ROLE_HIERARCHY.VIEWER).toBe(1);
  });

  it('should correctly compare role levels', () => {
    expect(hasRoleLevel(ROLES.SUPER_ADMIN, ROLES.ADMIN)).toBe(true);
    expect(hasRoleLevel(ROLES.ADMIN, ROLES.MANAGER)).toBe(true);
    expect(hasRoleLevel(ROLES.MANAGER, ROLES.VIEWER)).toBe(true);
    expect(hasRoleLevel(ROLES.VIEWER, ROLES.ADMIN)).toBe(false);
    expect(hasRoleLevel(ROLES.MANAGER, ROLES.SUPER_ADMIN)).toBe(false);
  });

  it('should allow same role level', () => {
    expect(hasRoleLevel(ROLES.ADMIN, ROLES.ADMIN)).toBe(true);
    expect(hasRoleLevel(ROLES.VIEWER, ROLES.VIEWER)).toBe(true);
  });
});

describe('Permission Checks', () => {
  describe('Dashboard Permissions', () => {
    it('should allow all roles to view dashboard', () => {
      expect(hasPermission(ROLES.VIEWER, 'VIEW_DASHBOARD')).toBe(true);
      expect(hasPermission(ROLES.MANAGER, 'VIEW_DASHBOARD')).toBe(true);
      expect(hasPermission(ROLES.ADMIN, 'VIEW_DASHBOARD')).toBe(true);
      expect(hasPermission(ROLES.SUPER_ADMIN, 'VIEW_DASHBOARD')).toBe(true);
    });

    it('should only allow MANAGER+ to edit dashboard layout', () => {
      expect(hasPermission(ROLES.VIEWER, 'EDIT_DASHBOARD_LAYOUT')).toBe(false);
      expect(hasPermission(ROLES.MANAGER, 'EDIT_DASHBOARD_LAYOUT')).toBe(true);
      expect(hasPermission(ROLES.ADMIN, 'EDIT_DASHBOARD_LAYOUT')).toBe(true);
      expect(hasPermission(ROLES.SUPER_ADMIN, 'EDIT_DASHBOARD_LAYOUT')).toBe(true);
    });
  });

  describe('Export Permissions', () => {
    it('should only allow MANAGER+ to export data', () => {
      expect(hasPermission(ROLES.VIEWER, 'EXPORT_DATA')).toBe(false);
      expect(hasPermission(ROLES.MANAGER, 'EXPORT_DATA')).toBe(true);
      expect(hasPermission(ROLES.ADMIN, 'EXPORT_DATA')).toBe(true);
      expect(hasPermission(ROLES.SUPER_ADMIN, 'EXPORT_DATA')).toBe(true);
    });

    it('should only allow ADMIN+ to export raw data', () => {
      expect(hasPermission(ROLES.VIEWER, 'EXPORT_RAW_DATA')).toBe(false);
      expect(hasPermission(ROLES.MANAGER, 'EXPORT_RAW_DATA')).toBe(false);
      expect(hasPermission(ROLES.ADMIN, 'EXPORT_RAW_DATA')).toBe(true);
      expect(hasPermission(ROLES.SUPER_ADMIN, 'EXPORT_RAW_DATA')).toBe(true);
    });
  });

  describe('Admin Console Permissions', () => {
    it('should only allow ADMIN+ to access admin console', () => {
      expect(hasPermission(ROLES.VIEWER, 'ADMIN_CONSOLE')).toBe(false);
      expect(hasPermission(ROLES.MANAGER, 'ADMIN_CONSOLE')).toBe(false);
      expect(hasPermission(ROLES.ADMIN, 'ADMIN_CONSOLE')).toBe(true);
      expect(hasPermission(ROLES.SUPER_ADMIN, 'ADMIN_CONSOLE')).toBe(true);
    });

    it('should only allow ADMIN+ to manage API keys', () => {
      expect(hasPermission(ROLES.VIEWER, 'MANAGE_API_KEYS')).toBe(false);
      expect(hasPermission(ROLES.MANAGER, 'MANAGE_API_KEYS')).toBe(false);
      expect(hasPermission(ROLES.ADMIN, 'MANAGE_API_KEYS')).toBe(true);
      expect(hasPermission(ROLES.SUPER_ADMIN, 'MANAGE_API_KEYS')).toBe(true);
    });

    it('should only allow SUPER_ADMIN to assign roles', () => {
      expect(hasPermission(ROLES.VIEWER, 'ASSIGN_ROLES')).toBe(false);
      expect(hasPermission(ROLES.MANAGER, 'ASSIGN_ROLES')).toBe(false);
      expect(hasPermission(ROLES.ADMIN, 'ASSIGN_ROLES')).toBe(false);
      expect(hasPermission(ROLES.SUPER_ADMIN, 'ASSIGN_ROLES')).toBe(true);
    });
  });

  describe('Evidence Permissions', () => {
    it('should only allow MANAGER+ to view evidence', () => {
      expect(hasPermission(ROLES.VIEWER, 'VIEW_EVIDENCE')).toBe(false);
      expect(hasPermission(ROLES.MANAGER, 'VIEW_EVIDENCE')).toBe(true);
      expect(hasPermission(ROLES.ADMIN, 'VIEW_EVIDENCE')).toBe(true);
      expect(hasPermission(ROLES.SUPER_ADMIN, 'VIEW_EVIDENCE')).toBe(true);
    });

    it('should only allow ADMIN+ to view evidence details', () => {
      expect(hasPermission(ROLES.VIEWER, 'VIEW_EVIDENCE_DETAILS')).toBe(false);
      expect(hasPermission(ROLES.MANAGER, 'VIEW_EVIDENCE_DETAILS')).toBe(false);
      expect(hasPermission(ROLES.ADMIN, 'VIEW_EVIDENCE_DETAILS')).toBe(true);
      expect(hasPermission(ROLES.SUPER_ADMIN, 'VIEW_EVIDENCE_DETAILS')).toBe(true);
    });
  });

  describe('Cross-Tenant Permissions', () => {
    it('should only allow SUPER_ADMIN to access all tenants', () => {
      expect(hasPermission(ROLES.VIEWER, 'ACCESS_ALL_TENANTS')).toBe(false);
      expect(hasPermission(ROLES.MANAGER, 'ACCESS_ALL_TENANTS')).toBe(false);
      expect(hasPermission(ROLES.ADMIN, 'ACCESS_ALL_TENANTS')).toBe(false);
      expect(hasPermission(ROLES.SUPER_ADMIN, 'ACCESS_ALL_TENANTS')).toBe(true);
    });
  });
});

describe('requirePermission', () => {
  it('should not throw for valid permission', () => {
    expect(() => {
      requirePermission(ROLES.ADMIN, 'ADMIN_CONSOLE');
    }).not.toThrow();
  });

  it('should throw for invalid permission', () => {
    expect(() => {
      requirePermission(ROLES.VIEWER, 'ADMIN_CONSOLE');
    }).toThrow('Permission denied');
  });

  it('should include role in error message', () => {
    expect(() => {
      requirePermission(ROLES.VIEWER, 'ADMIN_CONSOLE');
    }).toThrow('VIEWER');
  });
});

describe('getRolePermissions', () => {
  it('should return all permissions for SUPER_ADMIN', () => {
    const permissions = getRolePermissions(ROLES.SUPER_ADMIN);
    expect(permissions.length).toBeGreaterThan(20);
    expect(permissions).toContain('ACCESS_ALL_TENANTS');
    expect(permissions).toContain('ADMIN_CONSOLE');
    expect(permissions).toContain('VIEW_DASHBOARD');
  });

  it('should return limited permissions for VIEWER', () => {
    const permissions = getRolePermissions(ROLES.VIEWER);
    expect(permissions).toContain('VIEW_DASHBOARD');
    expect(permissions).toContain('VIEW_WIDGETS');
    expect(permissions).toContain('CREATE_VIEWS');
    expect(permissions).not.toContain('ADMIN_CONSOLE');
    expect(permissions).not.toContain('EXPORT_DATA');
    expect(permissions).not.toContain('ACCESS_ALL_TENANTS');
  });

  it('should return more permissions for ADMIN than MANAGER', () => {
    const adminPermissions = getRolePermissions(ROLES.ADMIN);
    const managerPermissions = getRolePermissions(ROLES.MANAGER);
    expect(adminPermissions.length).toBeGreaterThan(managerPermissions.length);
  });
});
