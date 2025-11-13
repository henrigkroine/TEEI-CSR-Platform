import { sequence } from 'astro:middleware';
import { onRequest as authMiddleware } from './middleware/auth';
import { tenantRouting } from './middleware/tenantRouting';

// Execute middleware in sequence:
// 1. Authentication (set user in locals)
// 2. Tenant routing validation (validate companyId, set tenantContext)
export const onRequest = sequence(authMiddleware, tenantRouting);
