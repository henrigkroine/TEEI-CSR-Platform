/**
 * Impact Timeline Widget
 *
 * TODO: Implement chronological impact visualization
 */


export interface ImpactTimelineProps {
  companyId?: string;
  className?: string;
  period?: 'month' | 'quarter' | 'year';
}

export default function ImpactTimeline({
  companyId,
  className = '',
  period = 'quarter',
}: ImpactTimelineProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Impact Timeline</h2>
      <div className="text-gray-500 dark:text-gray-400 text-center py-8">
        <p>Timeline for {period} coming soon...</p>
        {companyId && <p className="text-sm mt-2">Company: {companyId}</p>}
      </div>
    </div>
  );
}
