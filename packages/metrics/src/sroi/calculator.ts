import { SROIInputs, SROIResult } from '../types.js';
import { DEFAULT_SROI_CONFIG } from './config.js';

/**
 * Calculate Social Return on Investment (SROI) v1.0
 *
 * Formula: SROI Ratio = (Economic Benefit - Program Cost) / Program Cost
 *
 * Economic Benefit = Σ(participants_with_outcome × avg_wage_lift × employment_multiplier / (1 + discount_rate)^year)
 * for year = 1 to years_of_benefit
 *
 * @param inputs - SROI calculation inputs
 * @returns SROI calculation result with ratio and breakdown
 */
export function calculateSROI(inputs: SROIInputs): SROIResult {
  // Apply defaults for optional parameters
  const yearsOfBenefit = inputs.yearsOfBenefit ?? DEFAULT_SROI_CONFIG.defaultYearsOfBenefit;
  const employmentMultiplier = inputs.employmentMultiplier ?? DEFAULT_SROI_CONFIG.defaultEmploymentMultiplier;
  const discountRate = inputs.discountRate ?? DEFAULT_SROI_CONFIG.defaultDiscountRate;

  // Validate inputs
  if (inputs.programCost <= 0) {
    throw new Error('Program cost must be greater than 0');
  }
  if (inputs.participantsWithOutcome < 0) {
    throw new Error('Participants with outcome cannot be negative');
  }
  if (inputs.avgWageLift < 0) {
    throw new Error('Average wage lift cannot be negative');
  }
  if (yearsOfBenefit <= 0) {
    throw new Error('Years of benefit must be greater than 0');
  }
  if (employmentMultiplier <= 0) {
    throw new Error('Employment multiplier must be greater than 0');
  }
  if (discountRate < 0 || discountRate >= 1) {
    throw new Error('Discount rate must be between 0 and 1');
  }

  // Calculate Net Present Value of benefits over multiple years
  let npvBenefit = 0;

  for (let year = 1; year <= yearsOfBenefit; year++) {
    const yearlyBenefit =
      inputs.participantsWithOutcome *
      inputs.avgWageLift *
      employmentMultiplier;

    // Apply discount rate to get present value
    const discountFactor = Math.pow(1 + discountRate, year);
    npvBenefit += yearlyBenefit / discountFactor;
  }

  // Total economic benefit (for reporting purposes, not discounted)
  const totalBenefit =
    inputs.participantsWithOutcome *
    inputs.avgWageLift *
    employmentMultiplier *
    yearsOfBenefit;

  // Calculate SROI ratio using NPV
  // Formula: (NPV Benefit - Cost) / Cost
  const ratio = (npvBenefit - inputs.programCost) / inputs.programCost;

  return {
    ratio: parseFloat(ratio.toFixed(2)),
    totalBenefit: parseFloat(totalBenefit.toFixed(2)),
    totalCost: inputs.programCost,
    npvBenefit: parseFloat(npvBenefit.toFixed(2)),
    config: {
      yearsOfBenefit,
      employmentMultiplier,
      discountRate,
    },
  };
}

/**
 * Calculate simplified SROI ratio
 * Returns just the ratio without full breakdown
 *
 * @param programCost - Total program cost
 * @param economicBenefit - Total economic benefit generated
 * @returns SROI ratio
 */
export function calculateSimpleSROI(programCost: number, economicBenefit: number): number {
  if (programCost <= 0) {
    throw new Error('Program cost must be greater than 0');
  }

  const ratio = (economicBenefit - programCost) / programCost;
  return parseFloat(ratio.toFixed(2));
}
