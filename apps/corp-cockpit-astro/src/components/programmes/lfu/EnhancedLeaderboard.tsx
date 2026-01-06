import React, { useState } from 'react';
import type { LeaderboardEntry } from './types';

interface EnhancedLeaderboardProps {
  data: LeaderboardEntry[];
  initialDisplayCount?: number;
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getRankClass = (rank: number): string => {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return 'default';
};

export const EnhancedLeaderboard: React.FC<EnhancedLeaderboardProps> = ({
  data,
  initialDisplayCount = 5,
}) => {
  const [showAll, setShowAll] = useState(false);
  const maxHours = data[0]?.hours || 1;
  const displayData = showAll ? data : data.slice(0, initialDisplayCount);

  return (
    <div className="lfu-chart-card lfu-full-width-card lfu-animate-in">
      <div className="lfu-chart-card-header">
        <div>
          <div className="lfu-chart-card-title">Top Mentors</div>
          <div className="lfu-chart-card-subtitle">Ranked by volunteer hours</div>
        </div>
        {data.length > initialDisplayCount && (
          <button
            onClick={() => setShowAll(!showAll)}
            style={{
              background: 'none',
              border: '1px solid var(--lfu-slate-border)',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              color: 'var(--lfu-teal-primary)',
              cursor: 'pointer',
            }}
          >
            {showAll ? 'Show Less' : `Show All (${data.length})`}
          </button>
        )}
      </div>

      <div className="lfu-leaderboard">
        {displayData.map((mentor) => {
          const progressPercent = (mentor.hours / maxHours) * 100;

          return (
            <div key={mentor.rank} className="lfu-leaderboard-item">
              <div className={`lfu-leaderboard-rank ${getRankClass(mentor.rank)}`}>
                {mentor.rank}
              </div>

              <div className="lfu-leaderboard-avatar">
                {getInitials(mentor.name)}
              </div>

              <div className="lfu-leaderboard-info">
                <div className="lfu-leaderboard-name">{mentor.name}</div>
                {mentor.role && (
                  <div className="lfu-leaderboard-role">{mentor.role}</div>
                )}
              </div>

              <div className="lfu-leaderboard-progress">
                <div className="lfu-leaderboard-progress-bar">
                  <div
                    className="lfu-leaderboard-progress-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="lfu-leaderboard-stats">
                <div className="lfu-leaderboard-stat">
                  <div className="lfu-leaderboard-stat-value">
                    {mentor.hours.toLocaleString()}
                  </div>
                  <div className="lfu-leaderboard-stat-label">hours</div>
                </div>
                <div className="lfu-leaderboard-stat">
                  <div className="lfu-leaderboard-stat-value">
                    {mentor.sessions.toLocaleString()}
                  </div>
                  <div className="lfu-leaderboard-stat-label">sessions</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EnhancedLeaderboard;
