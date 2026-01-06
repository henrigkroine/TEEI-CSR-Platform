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
 * Campaign VIS Response
 * Contains aggregate VIS metrics for a campaign and top volunteers
 */
export interface CampaignVISResponse {
  campaign_id: string;
  campaign_name: string;
  aggregate_vis: number;
  volunteer_count: number;
  top_volunteers: VolunteerVIS[];
  distribution: {
    exceptional: number; // Count of volunteers ≥90
    high_impact: number; // Count of volunteers ≥75
    good: number; // Count of volunteers ≥60
    developing: number; // Count of volunteers ≥40
    needs_improvement: number; // Count of volunteers <40
  };
}

/**
 * Campaign VIS Band Thresholds
 * Higher thresholds than individual bands (campaigns aggregate multiple volunteers)
 */
export const CAMPAIGN_VIS_BANDS = {
  exceptional: 90, // Exceptional campaign performance
  highImpact: 75, // High impact campaign
  good: 60, // Good campaign performance
  developing: 40, // Developing campaign
  needsImprovement: 0, // Needs improvement
} as const;

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
 * Get VIS band label for a given score (individual volunteers)
 */
export function getVISBand(score: number): string {
  if (score >= VIS_WEIGHTS.bands.exceptional) return 'Exceptional';
  if (score >= VIS_WEIGHTS.bands.highImpact) return 'High Impact';
  if (score >= VIS_WEIGHTS.bands.contributing) return 'Contributing';
  return 'Emerging';
}

/**
 * Get Campaign VIS band label for a given score
 * Uses higher thresholds than individual VIS bands
 */
export function getCampaignVISBand(score: number): string {
  if (score >= CAMPAIGN_VIS_BANDS.exceptional) return 'Exceptional';
  if (score >= CAMPAIGN_VIS_BANDS.highImpact) return 'High Impact';
  if (score >= CAMPAIGN_VIS_BANDS.good) return 'Good';
  if (score >= CAMPAIGN_VIS_BANDS.developing) return 'Developing';
  return 'Needs Improvement';
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

/**
 * Get VIS data for a specific campaign
 * Returns aggregate VIS across all volunteers participating in the campaign
 *
 * @param campaignId - Campaign UUID
 * @param topN - Number of top volunteers to return (default: 10)
 * @returns Campaign VIS response with aggregate metrics and volunteer distribution
 */
export async function getVISForCampaign(
  campaignId: string,
  topN: number = 10
): Promise<CampaignVISResponse> {
  const client = await pool.connect();
  try {
    // First, get campaign info and all associated program instances
    const campaignQuery = `
      SELECT c.id, c.name
      FROM campaigns c
      WHERE c.id = $1 AND c.is_active = true;
    `;
    const campaignResult = await client.query(campaignQuery, [campaignId]);

    if (campaignResult.rows.length === 0) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const campaignName = campaignResult.rows[0].name;

    // TODO: This query assumes programInstanceId field exists in volunteer_hours and kintell_sessions tables
    // Agent 4.3 (ingestion-enhancer) is responsible for adding this field
    // For now, we'll use a placeholder query that can be updated once that field is added

    // Fetch volunteer metrics for all volunteers participating in this campaign
    const query = `
      WITH campaign_instances AS (
        -- Get all program instances for this campaign
        SELECT id
        FROM program_instances
        WHERE campaign_id = $1
      ),
      volunteer_metrics AS (
        SELECT
          v.id as volunteer_id,
          COALESCE(v.first_name || ' ' || v.last_name, 'Anonymous') as volunteer_name,
          -- Sum hours from volunteer_hours linked to campaign instances
          -- Note: Assumes program_instance_id field exists (added by Agent 4.3)
          COALESCE(SUM(vh.hours), 0) as total_hours,
          -- Count sessions from kintell_sessions linked to campaign instances
          -- Note: Assumes program_instance_id field exists (added by Agent 4.3)
          COUNT(DISTINCT ks.id) as total_sessions,
          -- Calculate months active within campaign period
          EXTRACT(EPOCH FROM (MAX(ks.completed_at) - MIN(ks.completed_at))) / (30 * 86400) as months_active,
          -- Average outcome improvement for participants in this campaign
          AVG(os.score) as avg_participant_improvement
        FROM users v
        INNER JOIN kintell_sessions ks ON ks.volunteer_id = v.id
        INNER JOIN campaign_instances ci ON ks.program_instance_id = ci.id
        LEFT JOIN volunteer_hours vh ON vh.volunteer_id = v.id AND vh.program_instance_id IN (SELECT id FROM campaign_instances)
        LEFT JOIN outcome_scores os ON os.participant_id = ks.participant_id
        WHERE ks.completed_at IS NOT NULL
        GROUP BY v.id, v.first_name, v.last_name
        HAVING SUM(COALESCE(vh.hours, ks.duration_minutes / 60.0, 0)) > 0
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

    const result = await client.query(query, [campaignId]);

    // Calculate VIS for each volunteer
    const volunteers: VolunteerVIS[] = [];
    let totalVIS = 0;

    // Initialize distribution counters
    const distribution = {
      exceptional: 0,
      high_impact: 0,
      good: 0,
      developing: 0,
      needs_improvement: 0,
    };

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

      // Update distribution based on campaign VIS bands
      if (vis.vis_score >= CAMPAIGN_VIS_BANDS.exceptional) {
        distribution.exceptional++;
      } else if (vis.vis_score >= CAMPAIGN_VIS_BANDS.highImpact) {
        distribution.high_impact++;
      } else if (vis.vis_score >= CAMPAIGN_VIS_BANDS.good) {
        distribution.good++;
      } else if (vis.vis_score >= CAMPAIGN_VIS_BANDS.developing) {
        distribution.developing++;
      } else {
        distribution.needs_improvement++;
      }
    }

    // Sort by VIS score and take top N
    volunteers.sort((a, b) => b.vis_score - a.vis_score);
    const topVolunteers = volunteers.slice(0, topN);

    // Calculate aggregate VIS (average of all volunteers in campaign)
    const aggregateVIS = volunteers.length > 0 ? totalVIS / volunteers.length : 0;

    return {
      campaign_id: campaignId,
      campaign_name: campaignName,
      aggregate_vis: parseFloat(aggregateVIS.toFixed(2)),
      volunteer_count: volunteers.length,
      top_volunteers: topVolunteers,
      distribution,
    };
  } finally {
    client.release();
  }
}

/**
 * Get VIS for a specific volunteer within a campaign context
 * Only considers activities linked to the campaign's program instances
 *
 * @param volunteerId - Volunteer UUID
 * @param campaignId - Campaign UUID
 * @returns Volunteer VIS metrics scoped to the campaign
 */
export async function getVolunteerVISInCampaign(
  volunteerId: string,
  campaignId: string
): Promise<VolunteerVIS> {
  const client = await pool.connect();
  try {
    // TODO: This query assumes programInstanceId field exists in volunteer_hours and kintell_sessions tables
    // Agent 4.3 (ingestion-enhancer) is responsible for adding this field

    const query = `
      WITH campaign_instances AS (
        -- Get all program instances for this campaign
        SELECT id
        FROM program_instances
        WHERE campaign_id = $2
      ),
      volunteer_metrics AS (
        SELECT
          v.id as volunteer_id,
          COALESCE(v.first_name || ' ' || v.last_name, 'Anonymous') as volunteer_name,
          -- Sum hours from volunteer_hours linked to campaign instances
          COALESCE(SUM(vh.hours), 0) as total_hours,
          -- Count sessions from kintell_sessions linked to campaign instances
          COUNT(DISTINCT ks.id) as total_sessions,
          -- Calculate months active within campaign
          EXTRACT(EPOCH FROM (MAX(ks.completed_at) - MIN(ks.completed_at))) / (30 * 86400) as months_active,
          -- Average outcome improvement
          AVG(os.score) as avg_participant_improvement
        FROM users v
        LEFT JOIN kintell_sessions ks ON ks.volunteer_id = v.id
        LEFT JOIN campaign_instances ci ON ks.program_instance_id = ci.id
        LEFT JOIN volunteer_hours vh ON vh.volunteer_id = v.id AND vh.program_instance_id IN (SELECT id FROM campaign_instances)
        LEFT JOIN outcome_scores os ON os.participant_id = ks.participant_id
        WHERE v.id = $1 AND ks.completed_at IS NOT NULL
        GROUP BY v.id, v.first_name, v.last_name
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
      FROM volunteer_metrics;
    `;

    const result = await client.query(query, [volunteerId, campaignId]);

    if (result.rows.length === 0) {
      throw new Error(`Volunteer not found in campaign: volunteerId=${volunteerId}, campaignId=${campaignId}`);
    }

    const row = result.rows[0];

    const vis = calculateVIS({
      totalHours: parseFloat(row.total_hours),
      sessionsPerMonth: parseFloat(row.sessions_per_month),
      averageParticipantImprovement: parseFloat(row.avg_improvement),
    });

    return {
      volunteer_id: row.volunteer_id,
      name: row.volunteer_name,
      vis_score: vis.vis_score,
      hours: parseFloat(row.total_hours),
      consistency: vis.consistency_score,
      outcome_impact: vis.outcome_impact_score,
    };
  } finally {
    client.release();
  }
}
