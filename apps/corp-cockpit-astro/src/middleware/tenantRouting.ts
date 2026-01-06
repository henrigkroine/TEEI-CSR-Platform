import type { MiddlewareHandler } from 'astro';
import { validateCompanyId } from '../utils/validateCompanyId';

/**
 * Tenant Routing Middleware
 *
 * Enforces multi-tenant routing pattern: /[lang]/cockpit/:companyId/*
 * - Validates companyId parameter
 * - Ensures user has access to the requested company
 * - Redirects to 404 for invalid companies
 * - Redirects to 401 for unauthorized access
 */
export const tenantRouting: MiddlewareHandler = async ({ locals, url, redirect }, next) => {
  const pathParts = url.pathname.split('/').filter(Boolean);

  // Check if this is a cockpit route: /[lang]/cockpit/:companyId/*
  if (pathParts.length >= 3 && pathParts[1] === 'cockpit') {
    const lang = pathParts[0];
    const companyId = pathParts[2];
    const user = locals.user;

    // Validate language parameter
    const validLangs = ['en', 'uk', 'no'];
    if (!validLangs.includes(lang)) {
      return redirect(`/en/cockpit/404?reason=invalid_language`);
    }

    // Validate companyId format (UUID or numeric ID)
    if (!validateCompanyId(companyId)) {
      return redirect(`/${lang}/cockpit/404?reason=invalid_company_id`);
    }

    // Check if user is authenticated
    if (!user) {
      return redirect(`/login?redirect=${encodeURIComponent(url.pathname)}`);
    }

    // Check if user has access to this company
    // Users can only access their own company unless they're super admin
    if (user.company_id !== companyId && user.role !== 'SUPER_ADMIN') {
      return redirect(`/${lang}/cockpit/401?reason=unauthorized_company_access`);
    }

    // Store tenant context in locals for downstream use
    locals.tenantContext = {
      companyId,
      lang,
      validatedAt: new Date().toISOString(),
    };
  }

  return next();
};
