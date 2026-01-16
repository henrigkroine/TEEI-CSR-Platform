/**
 * VIS (Volunteer Impact Score) Calculator - Migrated from services/reporting
 * 
 * Calculates Volunteer Impact Score for volunteers
 * Formula: VIS = (Hours × 0.3) + (Consistency × 0.3) + (Outcome Impact × 0.4)
 */

// VIS Weights and Constants (from services/reporting/src/config/visWeights.ts)
export const VIS_WEIGHTS = {
  // Component weights (must sum to 1.0)
  hours: 0.3,
  consistency: 0.3,
  outcomeImpact: 0.4,

  // Scoring thresholds
  hours: {
    max: 100, // Hours cap for normalization (100+ hours = 100 score)
    excellent: 50,
    good: 20,
    fair: 5,
  },

  consistency: {
    excellent: 8, // 2+ per week
    good: 4, // 1 per week
    fair: 2, // 2 per month
  },

  outcomeImpact: {
    minImprovement: 0.1, // 10% minimum improvement to count
  },

  // Score bands (0-100 scale)
  bands: {
    exceptional: 76,
    highImpact: 51,
    contributing: 26,
    emerging: 0,
  },
} as const;

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

export interface VISResponse {
  company_id: string;
  aggregate_vis: number;
  top_volunteers: VolunteerVIS[];
}

/**
 * Normalize hours to 0-100 scale
 */
function normalizeHours(hours: number): number {
  return Math.min(100, (hours / VIS_WEIGHTS.hours.max) * 100);
}

/**
 * Score consistency based on sessions per month
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
 */
function scoreOutcomeImpact(averageImprovement: number): number {
  if (averageImprovement < VIS_WEIGHTS.outcomeImpact.minImprovement) {
    return 0;
  }

  const adjustedImprovement =
    (averageImprovement - VIS_WEIGHTS.outcomeImpact.minImprovement) /
    (1.0 - VIS_WEIGHTS.outcomeImpact.minImprovement);

  return Math.min(100, adjustedImprovement * 100);
}

/**
 * Calculate Volunteer Impact Score (VIS)
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
 * Fetch VIS data from D1 database for a company
 */
export async function getVISForCompany(
  db: D1Database,
  companyId: string,
  period: string | null = null,
  topN: number = 10
): Promise<VISResponse> {
  // Build date filter for SQLite
  let dateFilter = '';
  if (period) {
    const [year, quarter] = period.split('-Q');
    const q = parseInt(quarter, 10);
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = q * 3;
    dateFilter = `AND strftime('%Y', vs.session_date) = '${year}'
                  AND CAST(strftime('%m', vs.session_date) AS INTEGER) BETWEEN ${startMonth} AND ${endMonth}`;
  }

  // Fetch volunteer metrics
  const query = `
    WITH volunteer_metrics AS (
      SELECT
        v.id as volunteer_id,
        COALESCE(v.name, 'Anonymous') as volunteer_name,
        COALESCE(SUM(vs.duration_minutes) / 60.0, 0) as total_hours,
        COUNT(DISTINCT vs.id) as total_sessions,
        CASE
          WHEN (julianday(MAX(vs.session_date)) - julianday(MIN(vs.session_date))) / 30.0 > 0
          THEN COUNT(DISTINCT vs.id) / ((julianday(MAX(vs.session_date)) - julianday(MIN(vs.session_date))) / 30.0)
          ELSE COUNT(DISTINCT vs.id)
        END as sessions_per_month,
        COALESCE(AVG(os.score), 0) as avg_improvement
      FROM volunteers v
      LEFT JOIN volunteer_sessions vs ON vs.volunteer_id = v.id ${dateFilter}
      LEFT JOIN outcome_scores os ON os.company_id = v.company_id ${period ? `AND os.period = '${period}'` : ''}
      WHERE v.company_id = ? AND v.total_hours > 0
      GROUP BY v.id, v.name
      HAVING SUM(vs.duration_minutes) > 0
    )
    SELECT
      volunteer_id,
      volunteer_name,
      total_hours,
      total_sessions,
      sessions_per_month,
      avg_improvement
    FROM volunteer_metrics
    ORDER BY total_hours DESC, total_sessions DESC
    LIMIT ?
  `;

  const result = await db.prepare(query).bind(companyId, topN * 2).all<{
    volunteer_id: string;
    volunteer_name: string;
    total_hours: number;
    total_sessions: number;
    sessions_per_month: number;
    avg_improvement: number;
  }>();

  // Calculate VIS for each volunteer
  const volunteers: VolunteerVIS[] = [];
  let totalVIS = 0;

  for (const row of result.results || []) {
    const vis = calculateVIS({
      totalHours: row.total_hours || 0,
      sessionsPerMonth: row.sessions_per_month || 0,
      averageParticipantImprovement: row.avg_improvement || 0,
    });

    volunteers.push({
      volunteer_id: row.volunteer_id,
      name: row.volunteer_name,
      vis_score: vis.vis_score,
      hours: row.total_hours || 0,
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
}
