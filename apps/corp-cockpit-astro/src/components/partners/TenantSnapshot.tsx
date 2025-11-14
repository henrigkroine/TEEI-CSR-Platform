export interface TenantSnapshotProps {
  tenant: {
    id: string;
    name: string;
    logo?: string;
    industry?: string;
    status: 'active' | 'trial' | 'churned';
  };
  metrics: {
    sroi: number;
    vis: number;
    participationRate: number;
    lastReportDate?: string;
  };
  programMix: {
    buddyMatching: number;
    language: number;
    upskilling: number;
  };
  lang: string;
  className?: string;
}

export default function TenantSnapshot({
  tenant,
  metrics,
  programMix,
  lang,
  className = ''
}: TenantSnapshotProps) {
  const statusConfig = {
    active: {
      label: 'Active',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      )
    },
    trial: {
      label: 'Trial',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
          />
        </svg>
      )
    },
    churned: {
      label: 'Churned',
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      )
    }
  };

  const status = statusConfig[tenant.status];

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {tenant.logo ? (
            <img
              src={tenant.logo}
              alt={`${tenant.name} logo`}
              className="w-12 h-12 rounded object-contain bg-gray-100 dark:bg-gray-700 p-1"
            />
          ) : (
            <div className="w-12 h-12 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-lg font-bold text-gray-500 dark:text-gray-400">
                {tenant.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{tenant.name}</h3>
            {tenant.industry && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{tenant.industry}</p>
            )}
          </div>
        </div>
        <span
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
          aria-label={`Status: ${status.label}`}
        >
          {status.icon}
          {status.label}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">SROI</p>
          <p className="text-lg font-bold text-secondary-600 dark:text-secondary-400">
            {metrics.sroi.toFixed(1)}x
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">VIS</p>
          <p className="text-lg font-bold text-secondary-600 dark:text-secondary-400">
            {metrics.vis}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Participation</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {metrics.participationRate}%
          </p>
        </div>
      </div>

      {/* Program Mix */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Program Mix
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300">Buddy Matching</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {programMix.buddyMatching}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-primary-600 dark:bg-primary-400 h-1.5 rounded-full"
              style={{ width: `${programMix.buddyMatching}%` }}
              role="progressbar"
              aria-valuenow={programMix.buddyMatching}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Buddy Matching: ${programMix.buddyMatching}%`}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300">Language Connect</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {programMix.language}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full"
              style={{ width: `${programMix.language}%` }}
              role="progressbar"
              aria-valuenow={programMix.language}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Language Connect: ${programMix.language}%`}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300">Upskilling</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {programMix.upskilling}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-purple-600 dark:bg-purple-400 h-1.5 rounded-full"
              style={{ width: `${programMix.upskilling}%` }}
              role="progressbar"
              aria-valuenow={programMix.upskilling}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Upskilling: ${programMix.upskilling}%`}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        {metrics.lastReportDate ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Last report: {new Date(metrics.lastReportDate).toLocaleDateString(lang)}
          </p>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">No reports yet</p>
        )}
        <a
          href={`/${lang}/cockpit/${tenant.id}`}
          className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          View Cockpit
          <svg
            className="w-4 h-4 ml-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}
