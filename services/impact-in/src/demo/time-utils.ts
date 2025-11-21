/**
 * Time utilities for generating realistic temporal distributions
 */

import { hashToSeed } from '@teei/data-masker';
import type { TimeDistribution } from './types.js';

/**
 * Generate random dates with realistic distribution patterns
 */
export function generateTimestamps(
  count: number,
  distribution: TimeDistribution,
  seed: number
): Date[] {
  const timestamps: Date[] = [];
  const start = distribution.startDate.getTime();
  const end = distribution.endDate.getTime();
  const range = end - start;

  // Simple seeded random number generator
  let randomSeed = seed;
  const seededRandom = () => {
    randomSeed = (randomSeed * 9301 + 49297) % 233280;
    return randomSeed / 233280;
  };

  for (let i = 0; i < count; i++) {
    let timestamp = start + seededRandom() * range;

    // Apply biases
    const date = new Date(timestamp);

    // Peak/low month adjustments
    if (distribution.peakMonths && distribution.peakMonths.includes(date.getMonth() + 1)) {
      // Keep more events in peak months
      if (seededRandom() > 0.3) {
        timestamps.push(date);
      }
    } else if (distribution.lowMonths && distribution.lowMonths.includes(date.getMonth() + 1)) {
      // Reduce events in low months
      if (seededRandom() > 0.7) {
        timestamps.push(date);
      }
    } else {
      // Regular distribution
      if (seededRandom() > 0.5) {
        timestamps.push(date);
      }
    }

    // Adjust for weekday bias
    if (distribution.weekdayBias) {
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (isWeekend && seededRandom() > (1 - distribution.weekdayBias)) {
        continue; // Skip weekend events based on bias
      }
    }

    // Adjust for work hours bias
    if (distribution.workHoursBias) {
      const hour = date.getHours();
      const isWorkHours = hour >= 9 && hour <= 17;
      if (!isWorkHours && seededRandom() > (1 - distribution.workHoursBias)) {
        continue; // Skip non-work-hours events based on bias
      }
    }
  }

  // If we don't have enough timestamps due to filtering, generate more
  while (timestamps.length < count) {
    const timestamp = start + seededRandom() * range;
    timestamps.push(new Date(timestamp));
  }

  // Sort chronologically
  return timestamps.sort((a, b) => a.getTime() - b.getTime()).slice(0, count);
}

/**
 * Create time distribution for volunteer events (typically weekends, evenings)
 */
export function volunteerTimeDistribution(startDate: Date, endDate: Date): TimeDistribution {
  return {
    startDate,
    endDate,
    peakMonths: [5, 6, 7, 8, 11, 12], // Summer and holiday season
    weekdayBias: 0.3, // More weekend events
    workHoursBias: 0.2, // More evening/weekend hours
  };
}

/**
 * Create time distribution for donation events (year-end peak)
 */
export function donationTimeDistribution(startDate: Date, endDate: Date): TimeDistribution {
  return {
    startDate,
    endDate,
    peakMonths: [11, 12], // Year-end giving
    weekdayBias: 0.5, // Mixed weekday/weekend
    workHoursBias: 0.6, // Some during work hours
  };
}

/**
 * Create time distribution for learning sessions (workday focus)
 */
export function sessionTimeDistribution(startDate: Date, endDate: Date): TimeDistribution {
  return {
    startDate,
    endDate,
    lowMonths: [7, 8, 12], // Summer vacation, holiday break
    weekdayBias: 0.9, // Strongly weekday-focused
    workHoursBias: 0.8, // Mostly during work hours
  };
}

/**
 * Create time distribution for enrollments (quarterly peaks)
 */
export function enrollmentTimeDistribution(startDate: Date, endDate: Date): TimeDistribution {
  return {
    startDate,
    endDate,
    peakMonths: [1, 4, 7, 10], // Quarterly starts
    weekdayBias: 0.95, // Almost exclusively weekdays
    workHoursBias: 0.9, // Almost exclusively work hours
  };
}

/**
 * Create time distribution for placements (steady throughout year)
 */
export function placementTimeDistribution(startDate: Date, endDate: Date): TimeDistribution {
  return {
    startDate,
    endDate,
    weekdayBias: 0.95, // Weekday-focused
    workHoursBias: 0.95, // Work hours focused
  };
}
