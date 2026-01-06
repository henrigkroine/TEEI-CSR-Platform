/**
 * Widget Data Adapter
 *
 * Transforms demo metrics into formats expected by dashboard widgets.
 */

import type { NormalizedMetrics, DemoMetrics } from './demoDataService';

/**
 * Transform demo metrics to AtAGlance widget format
 */
export function adaptForAtAGlance(metrics: NormalizedMetrics, programme?: 'language_connect' | 'mentorship') {
  const source = programme ? metrics[programme] : metrics.aggregate;

  return {
    period: new Date().toISOString().slice(0, 7), // YYYY-MM
    inputs: {
      total_volunteers: source.volunteers || 0,
      total_hours: source.total_hours || 0,
      total_sessions: source.sessions,
      active_participants: source.participants,
    },
    outcomes: {
      integration_avg: source.integration_avg || 0,
      language_avg: source.language_avg || 0,
      job_readiness_avg: source.job_readiness_avg || 0,
    },
  };
}

/**
 * Transform demo metrics to SROI widget format
 */
export function adaptForSROI(metrics: NormalizedMetrics, programme?: 'language_connect' | 'mentorship') {
  const source = programme ? metrics[programme] : metrics.aggregate;
  const sroiRatio = source.sroi_ratio || 4.2; // Default if not in CSV

  // Calculate derived values
  const totalInvestment = (source.total_hours || 0) * 25; // $25/hour estimate
  const totalSocialValue = totalInvestment * sroiRatio;

  return {
    sroi_ratio: sroiRatio,
    breakdown: {
      total_investment: totalInvestment,
      total_social_value: totalSocialValue,
      components: {
        volunteer_hours_value: totalInvestment * 0.4,
        integration_value: totalSocialValue * 0.25,
        language_value: totalSocialValue * 0.25,
        job_readiness_value: totalSocialValue * 0.1,
      },
    },
  };
}

/**
 * Transform demo metrics to VIS widget format
 */
export function adaptForVIS(metrics: NormalizedMetrics, programme?: 'language_connect' | 'mentorship') {
  const source = programme ? metrics[programme] : metrics.aggregate;
  const visScore = source.vis_score || 75; // Default if not in CSV

  // Generate mock top volunteers from aggregate data
  const topVolunteers = Array.from({ length: Math.min(10, source.volunteers || 0) }, (_, i) => ({
    volunteer_id: `demo-vol-${i + 1}`,
    name: `Volunteer ${i + 1}`,
    vis_score: visScore + (Math.random() * 20 - 10), // Vary around average
    hours: Math.floor((source.total_hours || 0) / (source.volunteers || 1)) + (i * 2),
    consistency: 0.7 + Math.random() * 0.3,
    outcome_impact: 0.6 + Math.random() * 0.4,
  })).sort((a, b) => b.vis_score - a.vis_score);

  return {
    aggregate_vis: visScore,
    top_volunteers: topVolunteers,
  };
}

/**
 * Get programme-specific metrics summary
 */
export function getProgrammeSummary(metrics: NormalizedMetrics, programme: 'language_connect' | 'mentorship') {
  const source = metrics[programme];
  return {
    programme,
    participants: source.participants,
    sessions: source.sessions,
    active_mentors: source.active_mentors,
    matches: source.matches,
    completion: source.completion,
    satisfaction: source.satisfaction,
  };
}
