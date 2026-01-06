/**
 * Campaign List Component
 *
 * SWARM 6: Agent 6.1 - campaign-list-ui
 * Displays campaigns with filtering, sorting, search, and upsell badges
 */

import { useState, useEffect, useMemo } from 'react';
import '../admin/admin.css';
import './campaigns.css';

export interface CampaignListProps {
  companyId: string;
  lang?: 'en' | 'uk' | 'no';
  canManage?: boolean;
}

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'planned' | 'recruiting' | 'active' | 'paused' | 'completed' | 'closed';
  programTemplateId: string;
  beneficiaryGroupId: string;
  pricingModel: 'seats' | 'credits' | 'bundle' | 'iaas' | 'custom';
  startDate: string;
  endDate: string;

  // Metrics
  capacityUtilization?: number;
  cumulativeSROI?: number;
  averageVIS?: number;
  isNearCapacity?: boolean;
  isOverCapacity?: boolean;
  isHighValue?: boolean;

  // Additional fields for display
  programTemplateName?: string;
  beneficiaryGroupName?: string;

  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse {
  success: boolean;
  campaigns: Campaign[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  error?: string;
  message?: string;
}

type SortField = 'name' | 'status' | 'sroi' | 'capacity' | 'startDate';
type SortDirection = 'asc' | 'desc';

const translations = {
  en: {
    loading: 'Loading campaigns...',
    error: 'Error loading campaigns',
    empty: 'No campaigns found',
    emptyFiltered: 'No campaigns match your filters',
    search: 'Search campaigns...',
    filterStatus: 'Filter by Status',
    filterPricing: 'Filter by Pricing Model',
    filterTemplate: 'Filter by Template',
    filterGroup: 'Filter by Beneficiary Group',
    sortBy: 'Sort by',
    allStatuses: 'All Statuses',
    allPricing: 'All Pricing Models',
    allTemplates: 'All Templates',
    allGroups: 'All Groups',

    // Table headers
    name: 'Name',
    template: 'Template',
    group: 'Beneficiary Group',
    status: 'Status',
    pricing: 'Pricing Model',
    capacity: 'Capacity',
    sroi: 'SROI',
    actions: 'Actions',

    // Status labels
    draft: 'Draft',
    planned: 'Planned',
    recruiting: 'Recruiting',
    active: 'Active',
    paused: 'Paused',
    completed: 'Completed',
    closed: 'Closed',

    // Pricing models
    seats: 'Seats',
    credits: 'Credits',
    bundle: 'Bundle',
    iaas: 'IaaS',
    custom: 'Custom',

    // Actions
    viewDetails: 'View Details',
    pause: 'Pause',
    resume: 'Resume',
    editSettings: 'Edit Settings',

    // Upsell badges
    highCapacity: 'High Capacity',
    highSROI: 'High SROI',

    // Sort options
    sortName: 'Name',
    sortStatus: 'Status',
    sortSROI: 'SROI (High to Low)',
    sortCapacity: 'Capacity %',
    sortStartDate: 'Start Date',
  },
  uk: {
    loading: 'Завантаження кампаній...',
    error: 'Помилка завантаження кампаній',
    empty: 'Кампанії не знайдені',
    emptyFiltered: 'Жодна кампанія не відповідає вашим фільтрам',
    search: 'Пошук кампаній...',
    filterStatus: 'Фільтр за статусом',
    filterPricing: 'Фільтр за моделлю ціноутворення',
    filterTemplate: 'Фільтр за шаблоном',
    filterGroup: 'Фільтр за групою бенефіціарів',
    sortBy: 'Сортувати за',
    allStatuses: 'Всі статуси',
    allPricing: 'Всі моделі ціноутворення',
    allTemplates: 'Всі шаблони',
    allGroups: 'Всі групи',

    name: 'Назва',
    template: 'Шаблон',
    group: 'Група бенефіціарів',
    status: 'Статус',
    pricing: 'Модель ціноутворення',
    capacity: 'Ємність',
    sroi: 'SROI',
    actions: 'Дії',

    draft: 'Чернетка',
    planned: 'Заплановано',
    recruiting: 'Набір',
    active: 'Активна',
    paused: 'Призупинена',
    completed: 'Завершена',
    closed: 'Закрита',

    seats: 'Місця',
    credits: 'Кредити',
    bundle: 'Пакет',
    iaas: 'IaaS',
    custom: 'Індивідуальна',

    viewDetails: 'Переглянути деталі',
    pause: 'Призупинити',
    resume: 'Відновити',
    editSettings: 'Редагувати налаштування',

    highCapacity: 'Висока ємність',
    highSROI: 'Високий SROI',

    sortName: 'Назва',
    sortStatus: 'Статус',
    sortSROI: 'SROI (від високого до низького)',
    sortCapacity: 'Ємність %',
    sortStartDate: 'Дата початку',
  },
  no: {
    loading: 'Laster kampanjer...',
    error: 'Feil ved lasting av kampanjer',
    empty: 'Ingen kampanjer funnet',
    emptyFiltered: 'Ingen kampanjer samsvarer med filtrene dine',
    search: 'Søk kampanjer...',
    filterStatus: 'Filtrer etter status',
    filterPricing: 'Filtrer etter prismodell',
    filterTemplate: 'Filtrer etter mal',
    filterGroup: 'Filtrer etter mottakergruppe',
    sortBy: 'Sorter etter',
    allStatuses: 'Alle statuser',
    allPricing: 'Alle prismodeller',
    allTemplates: 'Alle maler',
    allGroups: 'Alle grupper',

    name: 'Navn',
    template: 'Mal',
    group: 'Mottakergruppe',
    status: 'Status',
    pricing: 'Prismodell',
    capacity: 'Kapasitet',
    sroi: 'SROI',
    actions: 'Handlinger',

    draft: 'Utkast',
    planned: 'Planlagt',
    recruiting: 'Rekruttering',
    active: 'Aktiv',
    paused: 'Pauset',
    completed: 'Fullført',
    closed: 'Lukket',

    seats: 'Plasser',
    credits: 'Kreditter',
    bundle: 'Pakke',
    iaas: 'IaaS',
    custom: 'Tilpasset',

    viewDetails: 'Vis detaljer',
    pause: 'Pause',
    resume: 'Gjenoppta',
    editSettings: 'Rediger innstillinger',

    highCapacity: 'Høy kapasitet',
    highSROI: 'Høy SROI',

    sortName: 'Navn',
    sortStatus: 'Status',
    sortSROI: 'SROI (høy til lav)',
    sortCapacity: 'Kapasitet %',
    sortStartDate: 'Startdato',
  },
};

export default function CampaignList({
  companyId,
  lang = 'en',
  canManage = false,
}: CampaignListProps) {
  const t = translations[lang] || translations.en;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pricingFilter, setPricingFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Fetch campaigns
  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          companyId,
          limit: '500', // Performance requirement: handle 500 campaigns
        });

        const response = await fetch(`/api/campaigns?${params}`);
        const data: ApiResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch campaigns');
        }

        setCampaigns(data.campaigns || []);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [companyId]);

  // Get unique filter options
  const { templates, groups } = useMemo(() => {
    const templateSet = new Set<string>();
    const groupSet = new Set<string>();

    campaigns.forEach((campaign) => {
      if (campaign.programTemplateId) templateSet.add(campaign.programTemplateId);
      if (campaign.beneficiaryGroupId) groupSet.add(campaign.beneficiaryGroupId);
    });

    return {
      templates: Array.from(templateSet),
      groups: Array.from(groupSet),
    };
  }, [campaigns]);

  // Filter and sort campaigns
  const filteredAndSortedCampaigns = useMemo(() => {
    let filtered = campaigns;

    // Search filter (case-insensitive partial match)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Pricing model filter
    if (pricingFilter !== 'all') {
      filtered = filtered.filter((c) => c.pricingModel === pricingFilter);
    }

    // Template filter
    if (templateFilter !== 'all') {
      filtered = filtered.filter((c) => c.programTemplateId === templateFilter);
    }

    // Group filter
    if (groupFilter !== 'all') {
      filtered = filtered.filter((c) => c.beneficiaryGroupId === groupFilter);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'sroi':
          comparison = (b.cumulativeSROI || 0) - (a.cumulativeSROI || 0);
          break;
        case 'capacity':
          comparison = (b.capacityUtilization || 0) - (a.capacityUtilization || 0);
          break;
        case 'startDate':
          comparison = new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [campaigns, searchQuery, statusFilter, pricingFilter, templateFilter, groupFilter, sortField, sortDirection]);

  // Handle pause/resume action
  const handleTogglePause = async (campaignId: string, currentStatus: string) => {
    try {
      const targetStatus = currentStatus === 'paused' ? 'active' : 'paused';

      const response = await fetch(`/api/campaigns/${campaignId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh campaigns list
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === campaignId ? { ...c, status: targetStatus as any } : c
          )
        );
      } else {
        alert(data.error || 'Failed to update campaign status');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update campaign status');
    }
  };

  if (loading) {
    return <div className="loading">{t.loading}</div>;
  }

  if (error) {
    return <div className="error-message">{t.error}: {error}</div>;
  }

  if (campaigns.length === 0) {
    return (
      <div className="empty-state">
        <p>{t.empty}</p>
      </div>
    );
  }

  return (
    <div className="campaign-list">
      {/* Filters and Search */}
      <div className="campaign-controls">
        <input
          type="text"
          className="campaign-search"
          placeholder={t.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label={t.search}
        />

        <div className="campaign-filters">
          <select
            className="campaign-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label={t.filterStatus}
          >
            <option value="all">{t.allStatuses}</option>
            <option value="draft">{t.draft}</option>
            <option value="planned">{t.planned}</option>
            <option value="recruiting">{t.recruiting}</option>
            <option value="active">{t.active}</option>
            <option value="paused">{t.paused}</option>
            <option value="completed">{t.completed}</option>
            <option value="closed">{t.closed}</option>
          </select>

          <select
            className="campaign-filter"
            value={pricingFilter}
            onChange={(e) => setPricingFilter(e.target.value)}
            aria-label={t.filterPricing}
          >
            <option value="all">{t.allPricing}</option>
            <option value="seats">{t.seats}</option>
            <option value="credits">{t.credits}</option>
            <option value="bundle">{t.bundle}</option>
            <option value="iaas">{t.iaas}</option>
            <option value="custom">{t.custom}</option>
          </select>

          {templates.length > 1 && (
            <select
              className="campaign-filter"
              value={templateFilter}
              onChange={(e) => setTemplateFilter(e.target.value)}
              aria-label={t.filterTemplate}
            >
              <option value="all">{t.allTemplates}</option>
              {templates.map((tmpl) => (
                <option key={tmpl} value={tmpl}>
                  {tmpl.substring(0, 8)}...
                </option>
              ))}
            </select>
          )}

          {groups.length > 1 && (
            <select
              className="campaign-filter"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              aria-label={t.filterGroup}
            >
              <option value="all">{t.allGroups}</option>
              {groups.map((grp) => (
                <option key={grp} value={grp}>
                  {grp.substring(0, 8)}...
                </option>
              ))}
            </select>
          )}

          <select
            className="campaign-filter"
            value={`${sortField}-${sortDirection}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split('-');
              setSortField(field as SortField);
              setSortDirection(dir as SortDirection);
            }}
            aria-label={t.sortBy}
          >
            <option value="name-asc">{t.sortName} (A-Z)</option>
            <option value="name-desc">{t.sortName} (Z-A)</option>
            <option value="status-asc">{t.sortStatus}</option>
            <option value="sroi-desc">{t.sortSROI}</option>
            <option value="capacity-desc">{t.sortCapacity}</option>
            <option value="startDate-desc">{t.sortStartDate}</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="campaign-results-count">
        {filteredAndSortedCampaigns.length} of {campaigns.length} campaigns
      </div>

      {/* Table or Card View */}
      <div className="campaign-table-wrapper">
        {filteredAndSortedCampaigns.length === 0 ? (
          <div className="empty-state">
            <p>{t.emptyFiltered}</p>
          </div>
        ) : (
          <table className="campaign-table">
            <thead>
              <tr>
                <th>{t.name}</th>
                <th className="hide-mobile">{t.template}</th>
                <th className="hide-mobile">{t.group}</th>
                <th>{t.status}</th>
                <th className="hide-mobile">{t.pricing}</th>
                <th>{t.capacity}</th>
                <th>{t.sroi}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedCampaigns.map((campaign) => {
                const capacityPct = Math.round((campaign.capacityUtilization || 0) * 100);
                const sroi = campaign.cumulativeSROI || 0;
                const isHighCapacity = capacityPct > 90;
                const isHighSROI = sroi > 5.0;

                return (
                  <tr key={campaign.id}>
                    <td>
                      <div className="campaign-name-cell">
                        <strong>{campaign.name}</strong>
                        {(isHighCapacity || isHighSROI) && (
                          <div className="campaign-badges">
                            {isHighCapacity && (
                              <span className="badge badge-fire" title={t.highCapacity}>
                                🔥 {capacityPct}%
                              </span>
                            )}
                            {isHighSROI && (
                              <span className="badge badge-star" title={t.highSROI}>
                                ⭐ {sroi.toFixed(1)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="hide-mobile">
                      <span className="text-truncate" title={campaign.programTemplateId}>
                        {campaign.programTemplateName || campaign.programTemplateId.substring(0, 12) + '...'}
                      </span>
                    </td>
                    <td className="hide-mobile">
                      <span className="text-truncate" title={campaign.beneficiaryGroupId}>
                        {campaign.beneficiaryGroupName || campaign.beneficiaryGroupId.substring(0, 12) + '...'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${campaign.status}`}>
                        {t[campaign.status as keyof typeof t] || campaign.status}
                      </span>
                    </td>
                    <td className="hide-mobile">
                      <span className="pricing-badge">
                        {t[campaign.pricingModel as keyof typeof t] || campaign.pricingModel}
                      </span>
                    </td>
                    <td>
                      <div className="capacity-cell">
                        <div className="capacity-bar">
                          <div
                            className={`capacity-fill ${isHighCapacity ? 'capacity-high' : ''}`}
                            style={{ width: `${Math.min(capacityPct, 100)}%` }}
                          />
                        </div>
                        <span className="capacity-text">{capacityPct}%</span>
                      </div>
                    </td>
                    <td>
                      <strong className={isHighSROI ? 'sroi-high' : ''}>
                        {sroi.toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <div className="campaign-actions">
                        <a
                          href={`/${lang}/cockpit/${companyId}/campaigns/${campaign.id}`}
                          className="btn-action btn-action-primary"
                          title={t.viewDetails}
                        >
                          👁️
                        </a>
                        {canManage && (campaign.status === 'active' || campaign.status === 'paused') && (
                          <button
                            className="btn-action btn-action-secondary"
                            onClick={() => handleTogglePause(campaign.id, campaign.status)}
                            title={campaign.status === 'paused' ? t.resume : t.pause}
                          >
                            {campaign.status === 'paused' ? '▶️' : '⏸️'}
                          </button>
                        )}
                        {canManage && (
                          <a
                            href={`/${lang}/cockpit/${companyId}/campaigns/${campaign.id}/edit`}
                            className="btn-action btn-action-secondary"
                            title={t.editSettings}
                          >
                            ⚙️
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Card View (hidden on desktop) */}
      <div className="campaign-cards hide-desktop">
        {filteredAndSortedCampaigns.map((campaign) => {
          const capacityPct = Math.round((campaign.capacityUtilization || 0) * 100);
          const sroi = campaign.cumulativeSROI || 0;
          const isHighCapacity = capacityPct > 90;
          const isHighSROI = sroi > 5.0;

          return (
            <div key={campaign.id} className="campaign-card">
              <div className="campaign-card-header">
                <h3>{campaign.name}</h3>
                <span className={`status-badge status-${campaign.status}`}>
                  {t[campaign.status as keyof typeof t] || campaign.status}
                </span>
              </div>

              {(isHighCapacity || isHighSROI) && (
                <div className="campaign-badges">
                  {isHighCapacity && (
                    <span className="badge badge-fire">🔥 {capacityPct}%</span>
                  )}
                  {isHighSROI && (
                    <span className="badge badge-star">⭐ {sroi.toFixed(1)}</span>
                  )}
                </div>
              )}

              <div className="campaign-card-body">
                <div className="campaign-card-row">
                  <span className="label">{t.pricing}:</span>
                  <span>{t[campaign.pricingModel as keyof typeof t]}</span>
                </div>
                <div className="campaign-card-row">
                  <span className="label">{t.capacity}:</span>
                  <div className="capacity-cell">
                    <div className="capacity-bar">
                      <div
                        className={`capacity-fill ${isHighCapacity ? 'capacity-high' : ''}`}
                        style={{ width: `${Math.min(capacityPct, 100)}%` }}
                      />
                    </div>
                    <span className="capacity-text">{capacityPct}%</span>
                  </div>
                </div>
                <div className="campaign-card-row">
                  <span className="label">{t.sroi}:</span>
                  <strong className={isHighSROI ? 'sroi-high' : ''}>
                    {sroi.toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="campaign-card-actions">
                <a
                  href={`/${lang}/cockpit/${companyId}/campaigns/${campaign.id}`}
                  className="btn btn-secondary btn-sm"
                >
                  {t.viewDetails}
                </a>
                {canManage && (
                  <a
                    href={`/${lang}/cockpit/${companyId}/campaigns/${campaign.id}/edit`}
                    className="btn btn-secondary btn-sm"
                  >
                    {t.editSettings}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
