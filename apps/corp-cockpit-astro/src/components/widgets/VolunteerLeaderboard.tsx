/**
 * Volunteer Leaderboard Widget
 *
 * TODO: Implement volunteer ranking and statistics
 */


export interface VolunteerLeaderboardProps {
  companyId?: string;
  className?: string;
  limit?: number;
}

export default function VolunteerLeaderboard({
  companyId,
  className = '',
  limit = 10,
}: VolunteerLeaderboardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Volunteer Leaderboard</h2>
      <div className="text-gray-500 dark:text-gray-400 text-center py-8">
        <p>Top {limit} volunteers coming soon...</p>
        {companyId && <p className="text-sm mt-2">Company: {companyId}</p>}
      </div>
    </div>
  );
}
