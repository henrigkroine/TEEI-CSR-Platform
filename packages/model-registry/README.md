# @teei/model-registry

Tenant-specific model configuration registry with versioned overrides, guardrails, and rollback support.

## Purpose

Enables per-tenant calibration of Q2Q, SROI, and VIS models while enforcing global fairness, privacy, and cost guardrails.

## Features

- ✅ **File-based YAML storage** for tenant overrides
- ✅ **Zod schema validation** with strict type safety
- ✅ **Guardrail enforcement** (fairness, privacy, cost limits)
- ✅ **Version control** with rollback configuration
- ✅ **Merged configs** (tenant overrides + global defaults)
- ✅ **In-memory caching** for performance

## Installation

```bash
pnpm add @teei/model-registry
```

## Usage

### Initialize Registry

```typescript
import { ModelRegistry, getRegistry } from '@teei/model-registry';

// Option 1: Create instance directly
const registry = new ModelRegistry({
  overridesDir: './packages/model-registry/tenant-overrides',
  strictValidation: true,
});

// Option 2: Use singleton
const registry = getRegistry({
  overridesDir: './packages/model-registry/tenant-overrides',
});
```

### Load Tenant Configuration

```typescript
// Get merged config (overrides + defaults)
const config = registry.getConfig('example-tenant');

console.log(config.q2q.model);  // 'gpt-4o'
console.log(config.q2q.weights.job_readiness);  // 0.35
console.log(config.sroi.attributionFactor);  // 0.9
```

### Save Tenant Override

```typescript
import type { TenantOverride } from '@teei/model-registry';

const override: TenantOverride = {
  tenantId: 'acme-corp',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  createdBy: 'admin@acme.com',
  description: 'Custom calibration for Acme Corp',

  q2q: {
    model: 'gpt-4o',
    weights: {
      confidence: 0.2,
      belonging: 0.2,
      language_proficiency: 0.2,
      job_readiness: 0.2,
      wellbeing: 0.2,
    },
    thresholds: {
      confidence: 0.75,
      belonging: 0.75,
      language_proficiency: 0.75,
      job_readiness: 0.75,
      wellbeing: 0.75,
    },
  },

  guardrails: {
    minFairnessThreshold: 0.92,  // Stricter than global 0.9
  },
};

registry.save(override);
```

### List All Tenants

```typescript
const tenants = registry.listTenants();
console.log(tenants);  // ['example-tenant', 'acme-corp']
```

### Delete Override

```typescript
registry.delete('acme-corp');
```

## Schema Reference

### Q2Q Configuration

```typescript
{
  model: 'gpt-4o-mini' | 'gpt-4o' | 'claude-3-5-sonnet-20241022' | 'gemini-1.5-flash',
  temperature: 0.0 - 2.0,  // Default: 0.3
  maxTokens: 100 - 4000,   // Default: 2000
  weights: {
    confidence: 0.0 - 1.0,
    belonging: 0.0 - 1.0,
    language_proficiency: 0.0 - 1.0,
    job_readiness: 0.0 - 1.0,
    wellbeing: 0.0 - 1.0,
    // Must sum to 1.0
  },
  thresholds: {
    confidence: 0.0 - 1.0,  // Default: 0.7
    belonging: 0.0 - 1.0,
    language_proficiency: 0.0 - 1.0,
    job_readiness: 0.0 - 1.0,
    wellbeing: 0.0 - 1.0,
  },
}
```

### SROI Configuration

```typescript
{
  deadweightFactor: 0.0 - 1.0,    // Default: 0.1
  attributionFactor: 0.0 - 1.0,   // Default: 0.85
  dropOffRate: 0.0 - 1.0,         // Default: 0.25
  discountRate: 0.0 - 0.2,        // Default: 0.035
  financialProxies: {
    [outcome: string]: number,    // Custom USD values
  },
}
```

### VIS Configuration

```typescript
{
  weights: {
    frequency: 0.0 - 1.0,          // Default: 0.25
    duration: 0.0 - 1.0,           // Default: 0.2
    skills_applied: 0.0 - 1.0,     // Default: 0.3
    beneficiary_reach: 0.0 - 1.0,  // Default: 0.25
    // Must sum to 1.0
  },
}
```

### Guardrails

```typescript
{
  minFairnessThreshold: 0.8 - 1.0,  // Cannot be lower than global (0.9)
  minPrivacyRedaction: boolean,     // Cannot disable if global is true
  maxCostPerRequest: number,        // Cannot exceed global limit (0.5 USD)
}
```

## Guardrail Enforcement

Tenant overrides **cannot weaken** global guardrails:

- ❌ **Cannot lower** `minFairnessThreshold` below 0.9
- ❌ **Cannot disable** `minPrivacyRedaction`
- ❌ **Cannot exceed** `maxCostPerRequest` limit

Attempts to violate guardrails throw `GuardrailViolationError`.

## Rollback Support

Each override can specify rollback configuration:

```yaml
rollback:
  previousVersion: 0.9.0
  autoRollbackTriggers:
    - accuracy_drop
    - latency_spike
    - cost_overrun
    - fairness_violation
  canaryPercentage: 10
```

## File Structure

```
packages/model-registry/
├── tenant-overrides/
│   ├── example-tenant.yaml
│   ├── acme-corp.yaml
│   └── ...
├── src/
│   ├── types.ts       # Zod schemas and types
│   ├── registry.ts    # Registry implementation
│   └── index.ts       # Public API
├── schema.yaml        # Human-readable schema reference
├── package.json
├── tsconfig.json
└── README.md
```

## Integration

### Q2Q Service

```typescript
import { getRegistry } from '@teei/model-registry';

const registry = getRegistry({
  overridesDir: './packages/model-registry/tenant-overrides',
});

// In inference handler
const config = registry.getConfig(tenantId);

const response = await aiProvider.complete({
  model: config.q2q.model,
  temperature: config.q2q.temperature,
  maxTokens: config.q2q.maxTokens,
  // ...
});

// Apply tenant-specific thresholds
const filtered = outcomes.filter(o => o.confidence >= config.q2q.thresholds[o.dimension]);
```

### SROI Service

```typescript
const config = registry.getConfig(tenantId);

const sroi = calculateSROI({
  outcomes,
  deadweightFactor: config.sroi.deadweightFactor,
  attributionFactor: config.sroi.attributionFactor,
  dropOffRate: config.sroi.dropOffRate,
  discountRate: config.sroi.discountRate,
  financialProxies: config.sroi.financialProxies,
});
```

## Testing

```bash
pnpm test
```

## API Reference

See TypeScript types in `src/types.ts` and implementation in `src/registry.ts`.

## License

PROPRIETARY
