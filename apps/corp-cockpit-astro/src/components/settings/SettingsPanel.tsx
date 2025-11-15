/**
 * Settings Panel Component
 *
 * TODO: Implement user preferences and configuration
 */


export interface SettingsPanelProps {
  companyId?: string;
  className?: string;
}

export default function SettingsPanel({ companyId, className = '' }: SettingsPanelProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Settings</h2>
      <div className="text-gray-500 dark:text-gray-400 text-center py-8">
        <p>User settings and preferences coming soon...</p>
        {companyId && <p className="text-sm mt-2">Company: {companyId}</p>}
      </div>
    </div>
  );
}
