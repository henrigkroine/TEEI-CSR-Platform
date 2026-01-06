import type { ReactNode } from 'react';
import { TenantProvider, type Tenant } from '@/contexts/TenantContext';

/**
 * TenantProviderWrapper props
 */
interface TenantProviderWrapperProps {
  children: ReactNode;
  companyId?: string;
  initialTenant?: Tenant | null;
}

/**
 * Client-side wrapper for TenantProvider
 *
 * This wrapper allows Astro pages to easily integrate the TenantProvider
 * with React components. Use client:load directive when using this component.
 *
 * @example
 * ```astro
 * <TenantProviderWrapper companyId={companyId} client:load>
 *   <YourReactComponents />
 * </TenantProviderWrapper>
 * ```
 */
export default function TenantProviderWrapper({
  children,
  companyId,
  initialTenant,
}: TenantProviderWrapperProps) {
  return (
    <TenantProvider companyId={companyId} initialTenant={initialTenant}>
      {children}
    </TenantProvider>
  );
}
