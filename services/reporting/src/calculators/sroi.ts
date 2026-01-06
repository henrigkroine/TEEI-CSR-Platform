import type { SROIResponse } from '../db/types.js';
import { SROI_WEIGHTS } from '../config/sroiWeights.js';
import { pool } from '../db/connection.js';

interface SROIInputs {
  totalVolunteerHours: number;
  programCosts: number; // Optional additional costs
  integrationImprovement: number; // Sum of score improvements
  languageImprovement: number;
  jobReadinessImprovement: number;
  averageConfidence: number; // 0-1
}

/**
 * Calculate Social Return on Investment (SROI)
 *
 * Formula: SROI = (Total Social Value Created) / (Total Investment)
 *
 * Total Investment = (Volunteer Hours × Hourly Value) + Program Costs
 * Total Social Value = Weighted sum of outcome improvements × monetary values
 *
 * @param inputs - SROI calculation inputs
 * @returns SROI ratio and detailed breakdown
 */
export function calculateSROI(inputs: SROIInputs): Omit<SROIResponse, 'company_id' | 'period'> {
  // Calculate total investment
  const volunteerHoursValue = inputs.totalVolunteerHours * SROI_WEIGHTS.volunteerHourValue;
  const totalInvestment = volunteerHoursValue + inputs.programCosts;

  // Calculate social value created for each dimension
  const integrationValue =
    inputs.integrationImprovement * SROI_WEIGHTS.dimensionValues.integration;
  const languageValue = inputs.languageImprovement * SROI_WEIGHTS.dimensionValues.language;
  const jobReadinessValue =
    inputs.jobReadinessImprovement * SROI_WEIGHTS.dimensionValues.job_readiness;

  // Sum total social value
  let totalSocialValue = integrationValue + languageValue + jobReadinessValue;

  // Apply confidence discount if average confidence is below threshold
  if (inputs.averageConfidence < SROI_WEIGHTS.confidenceThreshold) {
    totalSocialValue *= SROI_WEIGHTS.confidenceDiscount;
  }

  // Calculate SROI ratio
  const sroiRatio = totalInvestment > 0 ? totalSocialValue / totalInvestment : 0;

  return {
    sroi_ratio: parseFloat(sroiRatio.toFixed(2)),
    breakdown: {
      total_investment: parseFloat(totalInvestment.toFixed(2)),
      total_social_value: parseFloat(totalSocialValue.toFixed(2)),
      components: {
        volunteer_hours_value: parseFloat(volunteerHoursValue.toFixed(2)),
        integration_value: parseFloat(integrationValue.toFixed(2)),
        language_value: parseFloat(languageValue.toFixed(2)),
        job_readiness_value: parseFloat(jobReadinessValue.toFixed(2)),
      },
    },
  };
}

/**
 * Fetch SROI data from database for a campaign
 *
 * Aggregates metrics across all program instances linked to the campaign.
 * Calculates SROI based on volunteer hours and outcome improvements at campaign level.
 *
 * @param campaignId - Campaign UUID
 * @param period - Quarter string (YYYY-QN) or null for entire campaign duration
 * @returns SROI response with ratio and breakdown
 */
export async function getSROIForCampaign(
  campaignId: string,
  period: string | null = null
): Promise<SROIResponse> {
  const client = await pool.connect();
  try {
    // Query campaign details
    const campaignQuery = `
      SELECT
        id,
        name,
        company_id,
        quarter,
        start_date,
        end_date
      FROM campaigns
      WHERE id = $1
    `;
    const campaignResult = await client.query(campaignQuery, [campaignId]);

    if (campaignResult.rows.length === 0) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const campaign = campaignResult.rows[0];

    // Query program instances for this campaign
    // Filter by period if provided, otherwise use entire campaign duration
    const instancesQuery = period
      ? `
        SELECT
          total_hours_logged,
          outcome_scores,
          enrolled_volunteers,
          enrolled_beneficiaries
        FROM program_instances
        WHERE campaign_id = $1
          AND status IN ('active', 'completed')
          AND start_date <= $3::date
          AND end_date >= $2::date
      `
      : `
        SELECT
          total_hours_logged,
          outcome_scores,
          enrolled_volunteers,
          enrolled_beneficiaries
        FROM program_instances
        WHERE campaign_id = $1
          AND status IN ('active', 'completed')
      `;

    const instancesParams = period
      ? [
          campaignId,
          `${period.split('-Q')[0]}-01-01`, // Start of quarter year
          `${period.split('-Q')[0]}-12-31`, // End of quarter year
        ]
      : [campaignId];

    const instancesResult = await client.query(instancesQuery, instancesParams);

    if (instancesResult.rows.length === 0) {
      // No active instances yet - return zero SROI
      return {
        company_id: campaign.company_id,
        period: period || campaign.quarter || 'all-time',
        sroi_ratio: 0,
        breakdown: {
          total_investment: 0,
          total_social_value: 0,
          components: {
            volunteer_hours_value: 0,
            integration_value: 0,
            language_value: 0,
            job_readiness_value: 0,
          },
        },
      };
    }

    // Aggregate metrics across all program instances
    let totalHours = 0;
    const dimensionScores: Record<string, number[]> = {
      integration: [],
      language: [],
      language_proficiency: [],
      job_readiness: [],
      career_readiness: [],
      workplace_readiness: [],
    };

    for (const instance of instancesResult.rows) {
      // Sum volunteer hours
      totalHours += parseFloat(instance.total_hours_logged || 0);

      // Collect outcome scores (JSONB format: {"integration": 0.72, "language": 0.68, ...})
      const outcomeScores = instance.outcome_scores || {};
      for (const [dimension, score] of Object.entries(outcomeScores)) {
        if (typeof score === 'number') {
          if (!dimensionScores[dimension]) {
            dimensionScores[dimension] = [];
          }
          dimensionScores[dimension].push(score);
        }
      }
    }

    // Calculate average scores per dimension
    const avgScores: Record<string, number> = {};
    for (const [dimension, scores] of Object.entries(dimensionScores)) {
      if (scores.length > 0) {
        avgScores[dimension] = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      }
    }

    // Map campaign outcome dimensions to SROI dimensions
    // Campaigns may use different dimension names (e.g., "career_readiness" vs "job_readiness")
    const baseline = 0.3; // Conservative baseline assumption
    const integrationImprovement = Math.max(
      0,
      (avgScores.integration || 0) - baseline
    );
    const languageImprovement = Math.max(
      0,
      (avgScores.language || avgScores.language_proficiency || 0) - baseline
    );
    const jobReadinessImprovement = Math.max(
      0,
      (avgScores.job_readiness || avgScores.career_readiness || avgScores.workplace_readiness || 0) -
        baseline
    );

    // Confidence: use 0.85 default (campaign metrics are aggregated, so reasonably confident)
    const averageConfidence = 0.85;

    // Calculate SROI using the core formula
    const sroi = calculateSROI({
      totalVolunteerHours: totalHours,
      programCosts: 0, // TODO: Add campaign-level cost tracking
      integrationImprovement,
      languageImprovement,
      jobReadinessImprovement,
      averageConfidence,
    });

    return {
      company_id: campaign.company_id,
      period: period || campaign.quarter || 'all-time',
      ...sroi,
    };
  } finally {
    client.release();
  }
}

/**
 * Fetch SROI data from database for a company and period
 *
 * @param companyId - Company UUID
 * @param period - Quarter string (YYYY-QN) or null for all-time
 * @returns SROI response with ratio and breakdown
 */
export async function getSROIForCompany(
  companyId: string,
  period: string | null = null
): Promise<SROIResponse> {
  const client = await pool.connect();
  try {
    // Fetch volunteer hours
    const hoursQuery = period
      ? `
        SELECT COALESCE(SUM(vh.hours), 0) as total_hours
        FROM volunteer_hours vh
        JOIN volunteers v ON v.id = vh.volunteer_id
        WHERE v.company_id = $1
          AND EXTRACT(YEAR FROM vh.session_date) = $2::integer
          AND EXTRACT(QUARTER FROM vh.session_date) = $3::integer
      `
      : `
        SELECT COALESCE(SUM(vh.hours), 0) as total_hours
        FROM volunteer_hours vh
        JOIN volunteers v ON v.id = vh.volunteer_id
        WHERE v.company_id = $1
      `;

    const hoursParams = period
      ? [companyId, period.split('-Q')[0], parseInt(period.split('-Q')[1], 10)]
      : [companyId];

    const hoursResult = await client.query(hoursQuery, hoursParams);
    const totalVolunteerHours = parseFloat(hoursResult.rows[0].total_hours);

    // Fetch outcome improvements (delta from baseline or previous period)
    // For simplicity, we'll aggregate current scores and assume baseline of 0.3
    const outcomeQuery = period
      ? `
        SELECT
          dimension,
          AVG(score) as avg_score,
          AVG(COALESCE(confidence, 0.85)) as avg_confidence
        FROM outcome_scores
        WHERE company_id = $1 AND quarter = $2
        GROUP BY dimension
      `
      : `
        SELECT
          dimension,
          AVG(score) as avg_score,
          AVG(COALESCE(confidence, 0.85)) as avg_confidence
        FROM outcome_scores
        WHERE company_id = $1
        GROUP BY dimension
      `;

    const outcomeParams = period ? [companyId, period] : [companyId];
    const outcomeResult = await client.query(outcomeQuery, outcomeParams);

    // Calculate improvements (assuming baseline of 0.3 for conservative estimate)
    const baseline = 0.3;
    let integrationImprovement = 0;
    let languageImprovement = 0;
    let jobReadinessImprovement = 0;
    let totalConfidence = 0;
    let dimensionCount = 0;

    for (const row of outcomeResult.rows) {
      const improvement = Math.max(0, parseFloat(row.avg_score) - baseline);
      totalConfidence += parseFloat(row.avg_confidence);
      dimensionCount++;

      switch (row.dimension) {
        case 'integration':
          integrationImprovement = improvement;
          break;
        case 'language':
          languageImprovement = improvement;
          break;
        case 'job_readiness':
          jobReadinessImprovement = improvement;
          break;
      }
    }

    const averageConfidence = dimensionCount > 0 ? totalConfidence / dimensionCount : 0.85;

    // Calculate SROI
    const sroi = calculateSROI({
      totalVolunteerHours,
      programCosts: 0, // TODO: Add program costs tracking
      integrationImprovement,
      languageImprovement,
      jobReadinessImprovement,
      averageConfidence,
    });

    return {
      company_id: companyId,
      period: period || 'all-time',
      ...sroi,
    };
  } finally {
    client.release();
  }
}
