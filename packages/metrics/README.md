# @teei/metrics

Core metrics calculation library for TEEI CSR Platform.

## Overview

This package provides calculators for measuring the impact and effectiveness of the TEEI CSR Platform programs:

- **SROI (Social Return on Investment)**: Quantifies the economic value generated per dollar invested in the program
- **VIS (Volunteer Impact Score)**: Measures volunteer engagement effectiveness across multiple dimensions
- **Integration Score**: Assesses participant integration progress across language, social, and employment dimensions

## Installation

```bash
pnpm add @teei/metrics
```

## Usage

### SROI Calculator

```typescript
import { calculateSROI, DEFAULT_SROI_CONFIG, getSROIConfig } from '@teei/metrics';

// Basic calculation
const result = calculateSROI({
  programCost: 100000,
  participantsWithOutcome: 25,
  avgWageLift: 15000,
});

console.log(`SROI Ratio: ${result.ratio}:1`);
console.log(`Economic Benefit: $${result.totalBenefit}`);
console.log(`NPV Benefit: $${result.npvBenefit}`);

// With custom parameters
const customResult = calculateSROI({
  programCost: 100000,
  participantsWithOutcome: 25,
  avgWageLift: 15000,
  yearsOfBenefit: 5,
  employmentMultiplier: 2.0,
  discountRate: 0.05,
});

// Regional configuration
const usWestConfig = getSROIConfig('us-west');
```

#### SROI Formula

```
SROI Ratio = (NPV Economic Benefit - Program Cost) / Program Cost

NPV Benefit = Σ(participants × wage_lift × multiplier / (1 + discount_rate)^year)
              for year = 1 to years_of_benefit
```

### VIS Calculator

```typescript
import { calculateVIS, calculateVISTrend } from '@teei/metrics';

// Calculate VIS
const vis = calculateVIS({
  totalHours: 500,
  avgQualityScore: 0.8,
  outcomeLift: 0.65,
  placementRate: 0.40,
});

console.log(`VIS Score: ${vis.score}/100`);
console.log('Components:', vis.components);

// Calculate trend
const previousVIS = calculateVIS({
  totalHours: 400,
  avgQualityScore: 0.75,
  outcomeLift: 0.60,
  placementRate: 0.35,
});

const trend = calculateVISTrend(vis, previousVIS);
console.log(`VIS Trend: ${trend}%`);
```

#### VIS Formula

```
VIS = (hours_score × 0.3) + (quality_score × 0.3) +
      (outcome_score × 0.25) + (placement_score × 0.15)

Where:
- hours_score: normalized to 0-100 (1000 hours = 100 points)
- quality_score: average feedback rating × 100
- outcome_score: participant improvement rate × 100
- placement_score: job placement rate × 100
```

### Integration Score Calculator

```typescript
import {
  calculateIntegrationScore,
  cefrToComfortScore,
  calculateSocialBelonging,
  calculateJobAccess,
} from '@teei/metrics';

// Calculate integration score
const integration = calculateIntegrationScore({
  languageComfort: 0.5, // B1 CEFR level
  socialBelonging: 0.6,
  jobAccess: 0.4,
});

console.log(`Integration Score: ${integration.score}/100`);
console.log(`Level: ${integration.level}`); // low, medium, or high

// Helper functions
const languageComfort = cefrToComfortScore('B1'); // 0.50
const socialBelonging = calculateSocialBelonging(2, 10, 15); // matches, events, checkins
const jobAccess = calculateJobAccess(false, 3, 2); // hasJob, completed, inProgress
```

#### Integration Score Formula

```
Integration = (language × 0.4) + (social × 0.3) + (job_access × 0.3)

Levels:
- 0-33: Low integration (early stage)
- 34-66: Medium integration (progressing)
- 67-100: High integration (well-integrated)
```

## API Reference

### Types

```typescript
interface SROIInputs {
  programCost: number;
  participantsWithOutcome: number;
  avgWageLift: number;
  yearsOfBenefit?: number; // default: 3
  employmentMultiplier?: number; // default: 1.5
  discountRate?: number; // default: 0.03
}

interface SROIResult {
  ratio: number;
  totalBenefit: number;
  totalCost: number;
  npvBenefit: number;
  config: {
    yearsOfBenefit: number;
    employmentMultiplier: number;
    discountRate: number;
  };
}

interface VISInputs {
  totalHours: number;
  avgQualityScore: number; // 0-1
  outcomeLift: number; // 0-1
  placementRate: number; // 0-1
  hoursWeight?: number; // default: 0.3
  qualityWeight?: number; // default: 0.3
  outcomeWeight?: number; // default: 0.25
  placementWeight?: number; // default: 0.15
}

interface VISResult {
  score: number; // 0-100
  components: {
    hours: number;
    quality: number;
    outcome: number;
    placement: number;
  };
  weights: {
    hours: number;
    quality: number;
    outcome: number;
    placement: number;
  };
}

interface IntegrationScoreInputs {
  languageComfort: number; // 0-1
  socialBelonging: number; // 0-1
  jobAccess: number; // 0-1
  languageWeight?: number; // default: 0.4
  socialWeight?: number; // default: 0.3
  jobWeight?: number; // default: 0.3
}

interface IntegrationScoreResult {
  score: number; // 0-100
  components: {
    language: number;
    social: number;
    jobAccess: number;
  };
  weights: {
    language: number;
    social: number;
    jobAccess: number;
  };
  level: 'low' | 'medium' | 'high';
}
```

## Configuration

### SROI Configuration

Default assumptions can be customized per calculation or configured globally:

```typescript
export const DEFAULT_SROI_CONFIG = {
  defaultYearsOfBenefit: 3,
  defaultEmploymentMultiplier: 1.5,
  defaultDiscountRate: 0.03,
  defaultAvgWageLift: 15000,
};
```

Regional configurations are available for:
- `us-east`: $18,000 avg wage lift
- `us-west`: $22,000 avg wage lift
- `us-midwest`: $15,000 avg wage lift
- `us-south`: $14,000 avg wage lift
- `canada`: $20,000 avg wage lift

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Generate coverage report
pnpm test --coverage
```

## Development

```bash
# Build the package
pnpm build

# Watch mode for development
pnpm dev
```

## License

MIT
