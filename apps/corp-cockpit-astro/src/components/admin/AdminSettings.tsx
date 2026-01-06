/**
 * Admin Settings Component
 *
 * Provides centralized admin configuration interface
 */

import { useState } from 'react';
import { BrandingConfig } from './BrandingConfig';
import { ThemeEditor } from './ThemeEditor';
import APIKeyManager from './APIKeyManager';
import AuditLog from './AuditLog';
import WeightOverrides from './WeightOverrides';
import ImpactInToggles from './ImpactInToggles';

export interface AdminSettingsProps {
  companyId?: string;
  lang?: 'en' | 'uk' | 'no';
  isAdmin?: boolean;
  className?: string;
}

type TabId = 'branding' | 'theme' | 'api' | 'audit' | 'weights' | 'impact-in';

interface Tab {
  id: TabId;
  label: string;
  description: string;
}

const TABS: Record<string, Tab[]> = {
  en: [
    { id: 'branding', label: 'Branding', description: 'Logo and brand colors' },
    { id: 'theme', label: 'Theme', description: 'Custom themes' },
    { id: 'api', label: 'API Keys', description: 'Manage API access' },
    { id: 'weights', label: 'Weights', description: 'Metric weights' },
    { id: 'impact-in', label: 'Impact-In', description: 'Integration settings' },
    { id: 'audit', label: 'Audit Log', description: 'Activity history' },
  ],
  uk: [
    { id: 'branding', label: 'Брендинг', description: 'Логотип і кольори бренду' },
    { id: 'theme', label: 'Тема', description: 'Користувацькі теми' },
    { id: 'api', label: 'Ключі API', description: 'Керування доступом API' },
    { id: 'weights', label: 'Ваги', description: 'Ваги метрик' },
    { id: 'impact-in', label: 'Impact-In', description: 'Налаштування інтеграції' },
    { id: 'audit', label: 'Журнал аудиту', description: 'Історія активності' },
  ],
  no: [
    { id: 'branding', label: 'Merkevare', description: 'Logo og merkevarefarger' },
    { id: 'theme', label: 'Tema', description: 'Tilpassede temaer' },
    { id: 'api', label: 'API-nøkler', description: 'Administrer API-tilgang' },
    { id: 'weights', label: 'Vekter', description: 'Metriske vekter' },
    { id: 'impact-in', label: 'Impact-In', description: 'Integrasjonsinnstillinger' },
    { id: 'audit', label: 'Revisjonslogg', description: 'Aktivitetshistorikk' },
  ],
};

export default function AdminSettings({
  companyId,
  lang = 'en',
  isAdmin = false,
  className = '',
}: AdminSettingsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('branding');
  const tabs = (TABS[lang] || TABS.en)!;

  if (!isAdmin) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <p className="text-yellow-800 dark:text-yellow-200">
          {lang === 'uk' && 'Ви не маєте прав адміністратора'}
          {lang === 'no' && 'Du har ikke administratorrettigheter'}
          {lang === 'en' && 'You do not have administrator permissions'}
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 px-6" aria-label="Admin settings tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-3 font-medium text-sm border-b-2 transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'branding' && companyId && lang && <BrandingConfig companyId={companyId} lang={lang} />}
        {activeTab === 'theme' && companyId && lang && <ThemeEditor companyId={companyId} lang={lang} />}
        {activeTab === 'api' && companyId && lang && <APIKeyManager companyId={companyId} lang={lang} />}
        {activeTab === 'weights' && companyId && lang && <WeightOverrides companyId={companyId} lang={lang} />}
        {activeTab === 'impact-in' && companyId && lang && <ImpactInToggles companyId={companyId} lang={lang} />}
        {activeTab === 'audit' && companyId && lang && <AuditLog companyId={companyId} lang={lang} />}
      </div>
    </div>
  );
}
