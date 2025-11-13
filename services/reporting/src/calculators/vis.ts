import type { VISResponse } from '../db/types.js';
import { VIS_WEIGHTS } from '../config/visWeights.js';
import { pool } from '../db/connection.js';

interface VISInputs {
  totalHours: number;
  sessionsPerMonth: number;
  averageParticipantImprovement: number; // 0-1 scale
}

export interface VolunteerVIS {
  volunteer_id: string;
  name: string;
  vis_score: number;
  hours: number;
  consistency: number;
  outcome_impact: number;
}

/**
 * Normalize hours to 0-100 scale
 * Linear scaling up to max threshold
 */
function normalizeHours(hours: number): number {
  return Math.min(100, (hours / VIS_WEIGHTS.hours.max) * 100);
}

/**
 * Score consistency based on sessions per month
 * Returns 0-100 score
 */
function scoreConsistency(sessionsPerMonth: number): number {
  if (sessionsPerMonth >= VIS_WEIGHTS.consistency.excellent) {
    return 100;
  } else if (sessionsPerMonth >= VIS_WEIGHTS.consistency.good) {
    return 75;
  } else if (sessionsPerMonth >= VIS_WEIGHTS.consistency.fair) {
    return 50;
  } else if (sessionsPerMonth > 0) {
    return 25;
  }
  return 0;
}

/**
 * Score outcome impact based on participant improvement
 * Returns 0-100 score
 */
function scoreOutcomeImpact(averageImprovement: number): number {
  // Only count improvements above minimum threshold
  if (averageImprovement < VIS_WEIGHTS.outcomeImpact.minImprovement) {
    return 0;
  }

  // Linear scaling from min threshold to 1.0
  const adjustedImprovement =
    (averageImprovement - VIS_WEIGHTS.outcomeImpact.minImprovement) /
    (1.0 - VIS_WEIGHTS.outcomeImpact.minImprovement);

  return Math.min(100, adjustedImprovement * 100);
}

/**
 * Calculate Volunteer Impact Score (VIS)
 *
 * Formula: VIS = (Hours × 0.3) + (Consistency × 0.3) + (Outcome Impact × 0.4)
 * All components normalized to 0-100 scale
 *
 * @param inputs - VIS calculation inputs
 * @returns VIS score (0-100) and component breakdown
 */
export function calculateVIS(inputs: VISInputs): {
  vis_score: number;
  hours_score: number;
  consistency_score: number;
  outcome_impact_score: number;
} {
  const hoursScore = normalizeHours(inputs.totalHours);
  const consistencyScore = scoreConsistency(inputs.sessionsPerMonth);
  const outcomeImpactScore = scoreOutcomeImpact(inputs.averageParticipantImprovement);

  const visScore =
    hoursScore * VIS_WEIGHTS.hours +
    consistencyScore * VIS_WEIGHTS.consistency +
    outcomeImpactScore * VIS_WEIGHTS.outcomeImpact;

  return {
    vis_score: parseFloat(visScore.toFixed(2)),
    hours_score: parseFloat(hoursScore.toFixed(2)),
    consistency_score: parseFloat(consistencyScore.toFixed(2)),
    outcome_impact_score: parseFloat(outcomeImpactScore.toFixed(2)),
  };
}

/**
 * Get VIS band label for a given score
 */
export function getVISBand(score: number): string {
  if (score >= VIS_WEIGHTS.bands.exceptional) return 'Exceptional';
  if (score >= VIS_WEIGHTS.bands.highImpact) return 'High Impact';
  if (score >= VIS_WEIGHTS.bands.contributing) return 'Contributing';
  return 'Emerging';
}

/**
 * Fetch VIS data from database for a company
 * Returns aggregate VIS and top volunteers
 *
 * @param companyId - Company UUID
 * @param period - Quarter string (YYYY-QN) or null for all-time
 * @param topN - Number of top volunteers to return
 * @returns VIS response with aggregate and top volunteers
 */
export async function getVISForCompany(
  companyId: string,
  period: string | null = null,
  topN: number = 10
): Promise<VISResponse> {
  const client = await pool.connect();
  try {
    // Build date filter
    const dateFilter = period
      ? `AND EXTRACT(YEAR FROM vh.session_date) = ${period.split('-Q')[0]}
         AND EXTRACT(QUARTER FROM vh.session_date) = ${period.split('-Q')[1]}`
      : '';

    // Fetch volunteer metrics
    const query = `
      WITH volunteer_metrics AS (
        SELECT
          v.id as volunteer_id,
          COALESCE(v.first_name || ' ' || v.last_name, 'Anonymous') as volunteer_name,
          COALESCE(SUM(vh.hours), 0) as total_hours,
          COUNT(DISTINCT s.id) as total_sessions,
          EXTRACT(EPOCH FROM (MAX(vh.session_date) - MIN(vh.session_date))) / (30 * 86400) as months_active,
          AVG(os.score) as avg_participant_improvement
        FROM volunteers v
        LEFT JOIN volunteer_hours vh ON vh.volunteer_id = v.id ${dateFilter}
        LEFT JOIN sessions s ON s.volunteer_id = v.id ${dateFilter}
        LEFT JOIN outcome_scores os ON os.company_id = v.company_id ${
          period ? `AND os.quarter = '${period}'` : ''
        }
        WHERE v.company_id = $1 AND v.is_active = true
        GROUP BY v.id, v.first_name, v.last_name
        HAVING SUM(vh.hours) > 0
      )
      SELECT
        volunteer_id,
        volunteer_name,
        total_hours,
        total_sessions,
        CASE
          WHEN months_active > 0 THEN total_sessions / months_active
          ELSE total_sessions
        END as sessions_per_month,
        COALESCE(avg_participant_improvement, 0) as avg_improvement
      FROM volunteer_metrics
      ORDER BY total_hours DESC, total_sessions DESC;
    `;

    const result = await client.query(query, [companyId]);

    // Calculate VIS for each volunteer
    const volunteers: VolunteerVIS[] = [];
    let totalVIS = 0;

    for (const row of result.rows) {
      const vis = calculateVIS({
        totalHours: parseFloat(row.total_hours),
        sessionsPerMonth: parseFloat(row.sessions_per_month),
        averageParticipantImprovement: parseFloat(row.avg_improvement),
      });

      volunteers.push({
        volunteer_id: row.volunteer_id,
        name: row.volunteer_name,
        vis_score: vis.vis_score,
        hours: parseFloat(row.total_hours),
        consistency: vis.consistency_score,
        outcome_impact: vis.outcome_impact_score,
      });

      totalVIS += vis.vis_score;
    }

    // Sort by VIS score and take top N
    volunteers.sort((a, b) => b.vis_score - a.vis_score);
    const topVolunteers = volunteers.slice(0, topN);

    // Calculate aggregate VIS (average of all volunteers)
    const aggregateVIS = volunteers.length > 0 ? totalVIS / volunteers.length : 0;

    return {
      company_id: companyId,
      aggregate_vis: parseFloat(aggregateVIS.toFixed(2)),
      top_volunteers: topVolunteers,
    };
  } finally {
    client.release();
  }
}
