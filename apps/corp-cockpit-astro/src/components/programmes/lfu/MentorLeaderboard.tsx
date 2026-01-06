import React from 'react';

interface Mentor {
  name: string;
  hours: number;
  sessions: number;
}

interface MentorLeaderboardProps {
  mentors: Mentor[];
}

export const MentorLeaderboard: React.FC<MentorLeaderboardProps> = ({ mentors }) => {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-surface-alt">
        <h3 className="text-lg font-heading font-semibold text-text-primary">Top Mentors</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Mentor Name</th>
              <th>Hours</th>
              <th>Sessions</th>
            </tr>
          </thead>
          <tbody>
            {mentors.map((mentor, index) => (
              <tr key={index}>
                <td className="font-medium text-text-primary">{mentor.name}</td>
                <td>{mentor.hours}</td>
                <td>{mentor.sessions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
