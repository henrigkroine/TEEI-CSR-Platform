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
