/**
 * SDG Mapping Widget
 *
 * TODO: Implement UN Sustainable Development Goals mapping
 */


export interface SDGMappingProps {
  companyId?: string;
  className?: string;
}

export default function SDGMapping({ companyId, className = '' }: SDGMappingProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">SDG Mapping</h2>
      <div className="text-gray-500 dark:text-gray-400 text-center py-8">
        <p>UN Sustainable Development Goals mapping coming soon...</p>
        {companyId && <p className="text-sm mt-2">Company: {companyId}</p>}
      </div>
    </div>
  );
}
