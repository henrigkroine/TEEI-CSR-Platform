/**
 * Presence Avatars Component
 *
 * Displays active users as colored avatars with real-time cursor positions.
 */

import React from 'react';
import type { UserPresence } from '@teei/shared-types';

interface PresenceAvatarsProps {
  users: UserPresence[];
  maxVisible?: number;
}

export const PresenceAvatars: React.FC<PresenceAvatarsProps> = ({
  users,
  maxVisible = 8
}) => {
  const visibleUsers = users.slice(0, maxVisible);
  const overflowCount = Math.max(0, users.length - maxVisible);

  return (
    <div className="presence-avatars" role="region" aria-label="Active users">
      <div className="presence-avatars__list">
        {visibleUsers.map(user => (
          <div
            key={user.userId}
            className="presence-avatar"
            style={{ backgroundColor: user.avatarColor }}
            title={`${user.userName}${user.isTyping ? ' (typing...)' : ''}`}
            aria-label={`${user.userName} is ${user.isTyping ? 'typing' : 'online'}`}
          >
            {getInitials(user.userName)}
            {user.isTyping && (
              <span className="presence-avatar__typing-indicator" aria-hidden="true">
                ...
              </span>
            )}
          </div>
        ))}

        {overflowCount > 0 && (
          <div
            className="presence-avatar presence-avatar--overflow"
            title={`${overflowCount} more user${overflowCount > 1 ? 's' : ''}`}
            aria-label={`${overflowCount} more active users`}
          >
            +{overflowCount}
          </div>
        )}
      </div>

      <style jsx>{`
        .presence-avatars {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .presence-avatars__list {
          display: flex;
          gap: -0.5rem; /* Overlap avatars */
        }

        .presence-avatar {
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          transition: transform 0.2s;
          position: relative;
        }

        .presence-avatar:hover {
          transform: scale(1.1);
          z-index: 10;
        }

        .presence-avatar--overflow {
          background-color: #6b7280;
        }

        .presence-avatar__typing-indicator {
          position: absolute;
          bottom: -4px;
          right: -4px;
          background-color: #10b981;
          color: white;
          font-size: 0.6rem;
          padding: 0.1rem 0.2rem;
          border-radius: 0.25rem;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          .presence-avatar {
            border: 3px solid black;
          }
        }

        /* Reduce motion */
        @media (prefers-reduced-motion: reduce) {
          .presence-avatar {
            transition: none;
          }

          .presence-avatar__typing-indicator {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Get user initials from name
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
