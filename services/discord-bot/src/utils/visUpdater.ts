import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('discord:visUpdater');

/**
 * VIS (Volunteer Impact Score) increment values by badge level
 */
const VIS_INCREMENTS: Record<string, number> = {
  emerging: 5,
  contributing: 10,
  high_impact: 20,
  exceptional: 50,
};

/**
 * Update VIS score in the reporting service
 */
export async function updateVISScore(
  userId: string,
  discordUsername: string,
  badgeLevel: string,
  achievement: string,
  recognizedBy: string
): Promise<{
  success: boolean;
  newScore?: number;
  increment?: number;
  error?: string;
}> {
  try {
    const reportingServiceUrl = process.env.REPORTING_SERVICE_URL || 'http://localhost:3003';
    const visUpdateEndpoint = `${reportingServiceUrl}/api/vis-update`;

    const increment = VIS_INCREMENTS[badgeLevel] || 10;

    // Payload to send to reporting service
    const payload = {
      userId,
      discordUsername,
      badgeLevel,
      achievement,
      recognizedBy,
      visIncrement: increment,
      timestamp: new Date().toISOString(),
      source: 'discord_recognition',
    };

    logger.info('Updating VIS score', {
      userId,
      badgeLevel,
      increment,
    });

    // Make API call to reporting service
    const response = await fetch(visUpdateEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth token if required
        ...(process.env.REPORTING_SERVICE_API_KEY && {
          'Authorization': `Bearer ${process.env.REPORTING_SERVICE_API_KEY}`,
        }),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`VIS update failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    logger.info('VIS score updated successfully', {
      userId,
      newScore: result.newScore,
      increment,
    });

    return {
      success: true,
      newScore: result.newScore,
      increment,
    };
  } catch (error: any) {
    logger.error('Failed to update VIS score', {
      userId,
      badgeLevel,
      error: error.message,
    });

    // If reporting service is unavailable, return stub response in development
    if (process.env.NODE_ENV === 'development') {
      const increment = VIS_INCREMENTS[badgeLevel] || 10;
      return {
        success: true,
        newScore: 100 + increment, // Mock score
        increment,
      };
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get current VIS score for a user
 */
export async function getVISScore(userId: string): Promise<{
  success: boolean;
  score?: number;
  rank?: number;
  error?: string;
}> {
  try {
    const reportingServiceUrl = process.env.REPORTING_SERVICE_URL || 'http://localhost:3003';
    const visGetEndpoint = `${reportingServiceUrl}/api/vis/${userId}`;

    const response = await fetch(visGetEndpoint, {
      method: 'GET',
      headers: {
        ...(process.env.REPORTING_SERVICE_API_KEY && {
          'Authorization': `Bearer ${process.env.REPORTING_SERVICE_API_KEY}`,
        }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch VIS score: ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      score: result.score,
      rank: result.rank,
    };
  } catch (error: any) {
    logger.error('Failed to fetch VIS score', {
      userId,
      error: error.message,
    });

    // Return stub in development
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        score: 75,
        rank: 42,
      };
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get VIS leaderboard
 */
export async function getVISLeaderboard(limit = 10): Promise<{
  success: boolean;
  leaderboard?: Array<{
    userId: string;
    username: string;
    score: number;
    rank: number;
  }>;
  error?: string;
}> {
  try {
    const reportingServiceUrl = process.env.REPORTING_SERVICE_URL || 'http://localhost:3003';
    const leaderboardEndpoint = `${reportingServiceUrl}/api/vis/leaderboard?limit=${limit}`;

    const response = await fetch(leaderboardEndpoint, {
      method: 'GET',
      headers: {
        ...(process.env.REPORTING_SERVICE_API_KEY && {
          'Authorization': `Bearer ${process.env.REPORTING_SERVICE_API_KEY}`,
        }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      leaderboard: result.leaderboard,
    };
  } catch (error: any) {
    logger.error('Failed to fetch VIS leaderboard', {
      error: error.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Calculate VIS increment preview (without actually updating)
 */
export function calculateVISIncrement(badgeLevel: string): number {
  return VIS_INCREMENTS[badgeLevel] || 10;
}

/**
 * Get VIS milestones
 */
export const VIS_MILESTONES = [
  { score: 10, title: 'First Steps', emoji: '👣' },
  { score: 25, title: 'Getting Started', emoji: '🌱' },
  { score: 50, title: 'Committed Volunteer', emoji: '💪' },
  { score: 100, title: 'Impact Maker', emoji: '⭐' },
  { score: 200, title: 'Community Champion', emoji: '🏆' },
  { score: 500, title: 'Legend', emoji: '👑' },
];

/**
 * Get next milestone for a given score
 */
export function getNextMilestone(currentScore: number): {
  score: number;
  title: string;
  emoji: string;
  pointsNeeded: number;
} | null {
  for (const milestone of VIS_MILESTONES) {
    if (currentScore < milestone.score) {
      return {
        ...milestone,
        pointsNeeded: milestone.score - currentScore,
      };
    }
  }
  return null;
}
