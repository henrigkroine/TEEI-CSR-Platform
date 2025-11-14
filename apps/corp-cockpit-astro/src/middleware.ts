import { sequence } from 'astro:middleware';
import { onRequest as authMiddleware } from './middleware/auth';
import { tenantRouting } from './middleware/tenantRouting';
import { rbacGuard } from './middleware/rbacGuard';

// Execute middleware in sequence:
// 1. Authentication (set user in locals)
// 2. Tenant routing validation (validate companyId, set tenantContext)
// 3. RBAC enforcement (check route-level permissions)
export const onRequest = sequence(authMiddleware, tenantRouting, rbacGuard);
