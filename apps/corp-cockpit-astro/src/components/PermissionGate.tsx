import { hasPermission, type Permission, type Role, ROLE_LABELS } from '../types/roles';

/**
 * Permission Gate Component
 *
 * Conditionally renders children based on user permissions
 * Optionally shows a fallback UI when permission is denied
 */

interface PermissionGateProps {
  /** User's role */
  role: Role;

  /** Required permission to view children */
  permission: Permission;

  /** Content to render if permission granted */
  children: React.ReactNode;

  /** Optional fallback content if permission denied */
  fallback?: React.ReactNode;

  /** Show permission denied message (default: false) */
  showDeniedMessage?: boolean;
}

export function PermissionGate({
  role,
  permission,
  children,
  fallback = null,
  showDeniedMessage = false,
}: PermissionGateProps) {
  const hasAccess = hasPermission(role, permission);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (showDeniedMessage) {
    return (
      <div className="permission-denied">
        <div className="permission-denied-icon">🔒</div>
        <h3>Permission Required</h3>
        <p>
          Your role (<strong>{ROLE_LABELS[role]}</strong>) does not have permission to access this feature.
        </p>
        <p className="permission-name">Required permission: <code>{permission}</code></p>
      </div>
    );
  }

  return <>{fallback}</>;
}

/**
 * Higher-order component for permission-based rendering
 *
 * @example
 * const AdminOnlyButton = withPermission(Button, 'ADMIN_CONSOLE');
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission
) {
  return function PermissionWrappedComponent({ role, ...props }: P & { role: Role }) {
    return (
      <PermissionGate role={role} permission={permission}>
        <Component {...(props as P)} />
      </PermissionGate>
    );
  };
}

/**
 * Hook for permission checking in components
 *
 * @example
 * const { canExport, canManageUsers } = usePermissions(user.role);
 */
export function usePermissions(role: Role) {
  return {
    canViewDashboard: hasPermission(role, 'VIEW_DASHBOARD'),
    canEditDashboard: hasPermission(role, 'EDIT_DASHBOARD_LAYOUT'),
    canViewWidgets: hasPermission(role, 'VIEW_WIDGETS'),
    canConfigureWidgets: hasPermission(role, 'CONFIGURE_WIDGETS'),
    canExport: hasPermission(role, 'EXPORT_DATA'),
    canExportRaw: hasPermission(role, 'EXPORT_RAW_DATA'),
    canViewReports: hasPermission(role, 'VIEW_REPORTS'),
    canGenerateReports: hasPermission(role, 'GENERATE_REPORTS'),
    canEditReports: hasPermission(role, 'EDIT_REPORTS'),
    canScheduleReports: hasPermission(role, 'SCHEDULE_REPORTS'),
    canViewEvidence: hasPermission(role, 'VIEW_EVIDENCE'),
    canViewEvidenceDetails: hasPermission(role, 'VIEW_EVIDENCE_DETAILS'),
    canCreateShareLinks: hasPermission(role, 'CREATE_SHARE_LINKS'),
    canRevokeShareLinks: hasPermission(role, 'REVOKE_SHARE_LINKS'),
    canCreateViews: hasPermission(role, 'CREATE_VIEWS'),
    canShareViews: hasPermission(role, 'SHARE_VIEWS'),
    canDeleteOthersViews: hasPermission(role, 'DELETE_OTHERS_VIEWS'),
    canAccessAdminConsole: hasPermission(role, 'ADMIN_CONSOLE'),
    canManageAPIKeys: hasPermission(role, 'MANAGE_API_KEYS'),
    canManageIntegrations: hasPermission(role, 'MANAGE_INTEGRATIONS'),
    canManageTheme: hasPermission(role, 'MANAGE_THEME'),
    canOverrideWeights: hasPermission(role, 'OVERRIDE_WEIGHTS'),
    canManageUsers: hasPermission(role, 'MANAGE_USERS'),
    canAssignRoles: hasPermission(role, 'ASSIGN_ROLES'),
    canAccessAllTenants: hasPermission(role, 'ACCESS_ALL_TENANTS'),
    canManageAllCompanies: hasPermission(role, 'MANAGE_ALL_COMPANIES'),
    canViewImpactInMonitor: hasPermission(role, 'VIEW_IMPACTIN_MONITOR'),
    canReplayImpactInDelivery: hasPermission(role, 'REPLAY_IMPACTIN_DELIVERY'),
  };
}
