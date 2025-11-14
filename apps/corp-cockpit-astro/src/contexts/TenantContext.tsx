import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

/**
 * Tenant/Company data structure
 */
export interface Tenant {
  id: string;
  name: string;
  industry?: string;
  country?: string;
  branding?: {
    primaryColor?: string;
    logoUrl?: string;
  };
}

/**
 * TenantContext shape
 */
interface TenantContextType {
  tenant: Tenant | null;
  setTenant: (tenant: Tenant | null) => void;
  clearTenant: () => void;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

/**
 * TenantProvider props
 */
interface TenantProviderProps {
  children: ReactNode;
  initialTenant?: Tenant | null;
  companyId?: string;
}

/**
 * TenantProvider component
 *
 * Manages tenant/company context state across the cockpit application.
 * Stores tenant data in both localStorage (persistence) and sessionStorage (tab-specific).
 *
 * @param children - Child components
 * @param initialTenant - Optional initial tenant data
 * @param companyId - Optional company ID to fetch tenant data for
 */
export function TenantProvider({ children, initialTenant = null, companyId }: TenantProviderProps) {
  const [tenant, setTenantState] = useState<Tenant | null>(initialTenant);
  const [isLoading, setIsLoading] = useState(!!companyId && !initialTenant);

  useEffect(() => {
    // If companyId is provided but no initial tenant, fetch tenant data
    if (companyId && !initialTenant) {
      fetchTenantData(companyId);
    }
  }, [companyId, initialTenant]);

  const fetchTenantData = async (id: string) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/companies/${id}`);
      // const data = await response.json();

      // Mock data for now - check localStorage first
      const storedTenant = localStorage.getItem('tenant');
      if (storedTenant) {
        const parsed = JSON.parse(storedTenant);
        if (parsed.id === id) {
          setTenantState(parsed);
          setIsLoading(false);
          return;
        }
      }

      // Fallback to mock data
      const mockTenant: Tenant = {
        id,
        name: 'Pilot Corp Inc.',
        industry: 'Technology',
        country: 'Norway',
      };

      setTenantState(mockTenant);
      localStorage.setItem('tenant', JSON.stringify(mockTenant));
      sessionStorage.setItem('tenant', JSON.stringify(mockTenant));
    } catch (error) {
      console.error('Failed to fetch tenant data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setTenant = (newTenant: Tenant | null) => {
    setTenantState(newTenant);

    if (newTenant) {
      // Store in both localStorage (persistent) and sessionStorage (session-only)
      localStorage.setItem('tenant', JSON.stringify(newTenant));
      sessionStorage.setItem('tenant', JSON.stringify(newTenant));

      // Also store just the ID as a cookie for server-side access
      document.cookie = `tenantId=${newTenant.id}; path=/; max-age=31536000; SameSite=Lax`;
    }
  };

  const clearTenant = () => {
    setTenantState(null);
    localStorage.removeItem('tenant');
    sessionStorage.removeItem('tenant');

    // Clear the tenantId cookie
    document.cookie = 'tenantId=; path=/; max-age=0';
  };

  return (
    <TenantContext.Provider value={{ tenant, setTenant, clearTenant, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * useTenant hook
 *
 * Custom hook to access tenant context.
 * Must be used within a TenantProvider.
 *
 * @throws {Error} If used outside of TenantProvider
 * @returns {TenantContextType} Tenant context value
 */
export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);

  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }

  return context;
}
