# @teei/data-masker

Deterministic pseudonymization library for demo data generation in the TEEI CSR Platform.

## Features

- **Deterministic Masking**: Same input always produces the same masked output
- **Locale-Aware**: Support for multiple locales (EN, ES, FR, UK, NO)
- **Referential Consistency**: Maintains relationships across services
- **PII Detection**: Validates that no real PII leaks through
- **Configurable Salt**: Per-tenant salt for additional security

## Installation

```bash
pnpm add @teei/data-masker
```

## Usage

### Basic Masking

```typescript
import { maskName, maskEmail, createMaskingContext } from '@teei/data-masker';

// Create a masking context
const context = createMaskingContext('demo-acme', 'user-123', 'en');

// Mask different types of PII
const maskedName = maskName('John Doe', context);
const maskedEmail = maskEmail('john@example.com', context);

console.log(maskedName); // e.g., "Jane Smith"
console.log(maskedEmail); // e.g., "jane.smith@example.org"
```

### Deterministic Behavior

```typescript
import { maskName, createMaskingContext } from '@teei/data-masker';

const context = createMaskingContext('demo-acme', 'user-123');

const masked1 = maskName('John Doe', context);
const masked2 = maskName('John Doe', context);

console.log(masked1 === masked2); // true - always the same output
```

### Available Masking Functions

```typescript
import {
  maskName,
  maskEmail,
  maskPhone,
  maskAddress,
  maskIBAN,
  maskFreeText,
  maskCompanyName,
  maskJobTitle,
  generateDeterministicUserId,
} from '@teei/data-masker';

const context = createMaskingContext('demo-tenant', 'subject-key');

// Personal data
maskName('John Doe', context);
maskName('Jane Smith', context, { gender: 'female' });
maskEmail('john@example.com', context);
maskEmail('john@acme.com', context, { preserveDomain: true });

// Contact information
maskPhone('+1-555-0100', context);
maskPhone('+44-555-0100', context, { preserveCountryCode: true });
maskAddress('123 Main St, Anytown', context);
maskAddress('456 Oak Ave', context, {
  includePostalCode: true,
  includeCountry: true,
});

// Financial data
maskIBAN('GB82WEST12345698765432', context);
maskIBAN('DE89370400440532013000', context, { preserveCountryCode: true });

// Text and organizational data
maskFreeText('Sensitive information', context);
maskFreeText('Long text...', context, {
  preserveLength: true,
  maxLength: 100,
});
maskCompanyName('Acme Corp', context);
maskJobTitle('Software Engineer', context);

// Generate IDs
generateDeterministicUserId(context); // "demo-user-abc123..."
```

### PII Detection and Validation

```typescript
import { detectPII, assertNoPII, redactPII } from '@teei/data-masker';

// Detect PII in text
const detection = detectPII('Email: john@example.com, Phone: 555-1234');
console.log(detection.hasPII); // true
console.log(detection.detected); // [{ type: 'email', position: 7, ... }]

// Assert no PII (throws if found)
try {
  assertNoPII(maskedData, 'user profile');
} catch (error) {
  console.error('PII leak detected!', error);
}

// Simple redaction
const redacted = redactPII('Contact john@example.com');
console.log(redacted); // "Contact [REDACTED]"
```

### Demo Tenant Validation

```typescript
import { isDemoTenantId, assertDemoTenant } from '@teei/data-masker';

// Check if tenant ID is for demo
console.log(isDemoTenantId('demo-acme')); // true
console.log(isDemoTenantId('production-tenant')); // false

// Assert demo tenant (throws if not)
try {
  assertDemoTenant('demo-acme'); // OK
  assertDemoTenant('production'); // Throws error
} catch (error) {
  console.error('Not a demo tenant!', error);
}
```

### Custom Salt Configuration

```typescript
import { createMaskingContext, generateSalt } from '@teei/data-masker';

// Generate a custom salt for a tenant
const customSalt = generateSalt();

// Use custom salt
const context = createMaskingContext('demo-acme', 'user-123', 'en', customSalt);
```

## Locale Support

Supported locales:
- `en` - English (US)
- `es` - Spanish
- `fr` - French
- `uk` - English (UK)
- `no` - Norwegian (Bokmål)

```typescript
import { createMaskingContext, maskName } from '@teei/data-masker';

const contexts = {
  english: createMaskingContext('demo-acme', 'user-1', 'en'),
  spanish: createMaskingContext('demo-acme', 'user-1', 'es'),
  french: createMaskingContext('demo-acme', 'user-1', 'fr'),
};

// Same user, different locales
console.log(maskName('John Doe', contexts.english));
console.log(maskName('John Doe', contexts.spanish));
console.log(maskName('John Doe', contexts.french));
```

## How It Works

### Deterministic Hashing

The library uses SHA-256 hashing to create deterministic seeds from:
- Tenant ID
- Subject key (e.g., user ID, company ID)
- Salt (configurable per tenant)

These seeds are used with [faker.js](https://fakerjs.dev/) to generate consistent fake data.

### Referential Consistency

Because the same inputs produce the same outputs:
- A user's name is always the same across services
- Related data (email, phone) for a user remain consistent
- Cross-service joins work correctly with masked data

### Security Considerations

- Masking is **one-way** - original data cannot be recovered
- Each tenant uses a unique salt for additional security
- Demo tenants are clearly marked (`demo-` or `test-` prefix)
- PII detection catches accidental data leaks

## Testing

```bash
# Run unit tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

## API Reference

See the [TypeScript types](./src/types.ts) for complete API documentation.

## License

PROPRIETARY - TEEI Platform
