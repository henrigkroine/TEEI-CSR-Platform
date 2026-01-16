/**
 * SROI Calculator - Migrated from services/reporting
 * 
 * Calculates Social Return on Investment (SROI) for companies
 * Formula: SROI = (Total Social Value Created) / (Total Investment)
 */

// SROI Weights and Constants (from services/reporting/src/config/sroiWeights.ts)
export const SROI_WEIGHTS = {
  // Volunteer hour monetary value (USD)
  volunteerHourValue: 29.95,

  // Social value per point improvement in each dimension
  dimensionValues: {
    integration: 150, // USD per point improvement
    language: 500, // USD per CEFR level advancement
    job_readiness: 300, // USD per point improvement
  },

  // Weights for dimensions (must sum to 1.0)
  dimensionWeights: {
    integration: 0.3,
    language: 0.35,
    job_readiness: 0.35,
  },

  // Discount factor for confidence scores
  confidenceThreshold: 0.7,
  confidenceDiscount: 0.8, // 20% reduction for low confidence
} as const;

interface SROIInputs {
  totalVolunteerHours: number;
  programCosts: number; // Optional additional costs
  integrationImprovement: number; // Sum of score improvements
  languageImprovement: number;
  jobReadinessImprovement: number;
  averageConfidence: number; // 0-1
}

export interface SROIResponse {
  company_id: string;
  period: string;
  sroi_ratio: number;
  breakdown: {
    total_investment: number;
    total_social_value: number;
    components: {
      volunteer_hours_value: number;
      integration_value: number;
      language_value: number;
      job_readiness_value: number;
    };
  };
}

/**
 * Calculate Social Return on Investment (SROI)
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
 * Calculate SROI for a company from D1 database
 * 
 * @param db - D1 database instance
 * @param companyId - Company UUID
 * @param period - Quarter string (YYYY-QN) or null for all-time
 */
export async function getSROIForCompany(
  db: D1Database,
  companyId: string,
  period: string | null = null
): Promise<SROIResponse> {
  // Parse period if provided
  let startDate: string | null = null;
  let endDate: string | null = null;
  
  if (period) {
    const [year, quarter] = period.split('-Q');
    const q = parseInt(quarter, 10);
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = q * 3;
    startDate = `${year}-${startMonth.toString().padStart(2, '0')}-01`;
    endDate = `${year}-${endMonth.toString().padStart(2, '0')}-31`;
  }

  // Fetch volunteer hours
  const hoursQuery = period
    ? `SELECT COALESCE(SUM(duration_minutes) / 60.0, 0) as total_hours
       FROM volunteer_sessions vs
       JOIN volunteers v ON vs.volunteer_id = v.id
       WHERE v.company_id = ? 
         AND strftime('%Y', vs.session_date) = ?
         AND CAST(strftime('%m', vs.session_date) AS INTEGER) BETWEEN ? AND ?`
    : `SELECT COALESCE(SUM(duration_minutes) / 60.0, 0) as total_hours
       FROM volunteer_sessions vs
       JOIN volunteers v ON vs.volunteer_id = v.id
       WHERE v.company_id = ?`;

  const hoursParams = period
    ? [companyId, period.split('-Q')[0], String((parseInt(period.split('-Q')[1], 10) - 1) * 3 + 1), String(parseInt(period.split('-Q')[1], 10) * 3)]
    : [companyId];

  const hoursResult = await db.prepare(hoursQuery).bind(...hoursParams).first<{ total_hours: number }>();
  const totalVolunteerHours = hoursResult?.total_hours || 0;

  // Fetch outcome improvements
  // For D1, we'll use a simplified approach - aggregate current scores and assume baseline of 0.3
  const outcomeQuery = period
    ? `SELECT
         dimension,
         AVG(score) as avg_score,
         AVG(COALESCE(confidence, 0.85)) as avg_confidence
       FROM outcome_scores
       WHERE company_id = ? AND period = ?
       GROUP BY dimension`
    : `SELECT
         dimension,
         AVG(score) as avg_score,
         AVG(COALESCE(confidence, 0.85)) as avg_confidence
       FROM outcome_scores
       WHERE company_id = ?
       GROUP BY dimension`;

  const outcomeParams = period ? [companyId, period] : [companyId];
  const outcomeResult = await db.prepare(outcomeQuery).bind(...outcomeParams).all<{
    dimension: string;
    avg_score: number;
    avg_confidence: number;
  }>();

  // Calculate improvements (assuming baseline of 0.3 for conservative estimate)
  const baseline = 0.3;
  let integrationImprovement = 0;
  let languageImprovement = 0;
  let jobReadinessImprovement = 0;
  let totalConfidence = 0;
  let dimensionCount = 0;

  for (const row of outcomeResult.results || []) {
    const improvement = Math.max(0, (row.avg_score || 0) - baseline);
    totalConfidence += row.avg_confidence || 0.85;
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
}
