# @teei/data-masker

Deterministic pseudonymization library for demo tenants in the TEEI CSR Platform.

## Features

- **Deterministic Masking**: Same input always produces same output (referential consistency)
- **Locale-Aware**: Support for EN, ES, FR, UK, NO fake data generation
- **Tenant Isolation**: Different tenants get different masked values for same input
- **Comprehensive PII Coverage**: Names, emails, phones, addresses, IBANs, free text
- **Secure**: HMAC-SHA256 based hashing with configurable salts
- **Statistics Tracking**: Monitor masking operations for reporting

## Installation

```bash
pnpm add @teei/data-masker
```

## Usage

### Basic Example

```typescript
import { DataMasker } from '@teei/data-masker';

const masker = new DataMasker({
  tenantId: 'demo-acme-corp',
  masterSalt: process.env.MASKER_SALT!,
  locale: 'en'
});

// Mask a name
const nameResult = masker.maskName('John Doe', 'user-123');
console.log(nameResult.masked); // e.g., "Sarah Johnson"

// Mask an email
const emailResult = masker.maskEmail('john@example.com', 'user-123');
console.log(emailResult.masked); // e.g., "sarah.johnson@example.org"

// Same subject key → same hash
console.log(nameResult.hash === emailResult.hash); // true
```

### Deterministic Behavior

```typescript
// Same inputs always produce same outputs
const result1 = masker.maskName('Jane Smith', 'user-456');
const result2 = masker.maskName('Jane Smith', 'user-456');

console.log(result1.masked === result2.masked); // true
console.log(result1.hash === result2.hash); // true
```

### Referential Consistency

```typescript
const subjectKey = 'user-789';

// All PII for same subject derived from same hash
const name = masker.maskName('Alice Brown', subjectKey);
const email = masker.maskEmail('alice@example.com', subjectKey);
const phone = masker.maskPhone('+1-555-1234', subjectKey);

// All operations produce same hash
console.log(name.hash === email.hash); // true
console.log(email.hash === phone.hash); // true
```

### Locale Support

```typescript
const enMasker = new DataMasker({
  tenantId: 'demo-en',
  masterSalt: 'salt',
  locale: 'en'
});

const esMasker = new DataMasker({
  tenantId: 'demo-es',
  masterSalt: 'salt',
  locale: 'es'
});

const frMasker = new DataMasker({
  tenantId: 'demo-fr',
  masterSalt: 'salt',
  locale: 'fr'
});

// Generates names appropriate for each locale
```

### Advanced Options

```typescript
// Preserve email domain
const masker = new DataMasker({
  tenantId: 'demo',
  masterSalt: 'salt',
  preserveEmailDomain: true
});

const result = masker.maskEmail('john@company.com', 'user-1');
// Result: something@company.com (domain preserved)

// Name masking with gender hint
const nameResult = masker.maskName('John Doe', 'user-2', {
  gender: 'male'
});

// Address masking with city preservation
const addrResult = masker.maskAddress('123 Main St, London, UK', 'user-3', {
  preserveCity: true
});
// Result includes "London, UK"

// Free text with PII redaction
const textResult = masker.maskFreeText(
  'Contact john@example.com or call 555-1234',
  'user-4',
  {
    redactEntities: ['email', 'phone'],
    maxLength: 200
  }
);
// Result: "[REDACTED_EMAIL]" and "[REDACTED_PHONE]"
```

### UUID Generation

```typescript
// Generate deterministic UUIDs
const uuid1 = masker.generateUuid('user-100');
const uuid2 = masker.generateUuid('user-100');

console.log(uuid1 === uuid2); // true
console.log(uuid1); // "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
```

### Statistics Tracking

```typescript
masker.resetStats();

masker.maskName('Test User', 'user-1');
masker.maskEmail('test@example.com', 'user-1');
masker.maskPhone('555-1234', 'user-2');

const stats = masker.getStats();
console.log(stats);
// {
//   totalMasked: 3,
//   byType: { name: 1, email: 1, phone: 1, ... },
//   uniqueSubjects: 2
// }
```

## API Reference

### `DataMasker`

#### Constructor

```typescript
new DataMasker(config: MaskerConfig)
```

**Config Options:**
- `tenantId` (string, required): Tenant ID for isolation
- `masterSalt` (string, required): Master salt for hashing
- `locale` (SupportedLocale, optional): Locale for fake data (default: 'en')
- `preserveEmailDomain` (boolean, optional): Keep original email domain (default: false)

#### Methods

##### `maskName(originalName, subjectKey, options?)`
Mask a person's name deterministically.

**Returns:** `MaskResult { masked: string, hash: string }`

##### `maskEmail(originalEmail, subjectKey)`
Mask an email address deterministically.

**Returns:** `MaskResult`

##### `maskPhone(originalPhone, subjectKey)`
Mask a phone number deterministically.

**Returns:** `MaskResult`

##### `maskAddress(originalAddress, subjectKey, options?)`
Mask a physical address deterministically.

**Returns:** `MaskResult`

##### `maskIBAN(originalIban, subjectKey)`
Mask an IBAN deterministically.

**Returns:** `MaskResult`

##### `maskFreeText(originalText, subjectKey, options?)`
Mask free-form text with optional PII redaction.

**Returns:** `MaskResult`

##### `generateUuid(subjectKey)`
Generate a deterministic UUID for a subject.

**Returns:** `string` (UUID v4 format)

##### `getStats()`
Get current masking statistics.

**Returns:** `MaskingStats`

##### `resetStats()`
Reset masking statistics to zero.

## Security Considerations

1. **Master Salt**: Store `masterSalt` securely (environment variables, secrets manager)
2. **Subject Keys**: Use consistent identifiers (user IDs, email hashes) for referential consistency
3. **Tenant Isolation**: Different tenants automatically get different masked values
4. **Hash Exposure**: Hashes are one-way (original values cannot be recovered)
5. **PII Logging**: Never log original PII values, only masked results

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

## License

PROPRIETARY - TEEI Platform
