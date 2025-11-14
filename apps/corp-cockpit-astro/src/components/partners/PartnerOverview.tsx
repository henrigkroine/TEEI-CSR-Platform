import { type ReactNode } from 'react';

export interface PartnerOverviewProps {
  partner: {
    id: string;
    name: string;
    logo?: string;
    contactEmail?: string;
    contactPhone?: string;
    description?: string;
    tier?: 'enterprise' | 'professional' | 'starter';
  };
  metrics: {
    totalTenants: number;
    totalParticipants: number;
    avgSROI: number;
    avgVIS: number;
  };
  className?: string;
}

export default function PartnerOverview({ partner, metrics, className = '' }: PartnerOverviewProps) {
  const tierColors = {
    enterprise: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    professional: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    starter: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };

  const tierColor = partner.tier ? tierColors[partner.tier] : tierColors.professional;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      {/* Header with logo and name */}
      <div className="flex items-start gap-6 mb-6">
        {partner.logo ? (
          <div className="flex-shrink-0">
            <img
              src={partner.logo}
              alt={`${partner.name} logo`}
              className="w-24 h-24 rounded-lg object-contain bg-gray-100 dark:bg-gray-700 p-2"
            />
          </div>
        ) : (
          <div className="flex-shrink-0 w-24 h-24 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-primary-600 dark:text-primary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {partner.name}
            </h1>
            {partner.tier && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${tierColor}`}
                aria-label={`Partner tier: ${partner.tier}`}
              >
                {partner.tier.charAt(0).toUpperCase() + partner.tier.slice(1)}
              </span>
            )}
          </div>

          {partner.description && (
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              {partner.description}
            </p>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            {partner.contactEmail && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <a
                  href={`mailto:${partner.contactEmail}`}
                  className="hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {partner.contactEmail}
                </a>
              </div>
            )}
            {partner.contactPhone && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <a
                  href={`tel:${partner.contactPhone}`}
                  className="hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {partner.contactPhone}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Tenants</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.totalTenants}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Participants</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.totalParticipants.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg SROI</p>
          <p className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
            {metrics.avgSROI.toFixed(1)}x
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg VIS</p>
          <p className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
            {metrics.avgVIS}
          </p>
        </div>
      </div>
    </div>
  );
}
