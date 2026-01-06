# Identity Resolution Strategy
## Kintell CSV Ingestion - User Deduplication & Matching

**Date**: 2025-11-22
**Agent**: identity-unifier
**Status**: ✅ Complete

---

## Problem Statement

When importing Kintell CSV exports, we encounter users (volunteers and participants) who may:
1. **Not exist** in the TEEI CSR Platform database yet
2. **Already exist** with the same email (from previous imports or other programs)
3. **Exist with different emails** (same person, multiple email addresses)
4. **Have conflicting data** (same email, different names across imports)

**Goal**: Design a robust, deterministic strategy for creating/matching users during CSV import.

---

## Identity Resolution Principles

### **P1: Email is Primary Key**
- Email address is the **single source of truth** for identity matching
- Emails are **normalized** (lowercase, trimmed) before comparison
- If email matches → same user (unless proven otherwise by human review)

### **P2: External IDs are Secondary Keys**
- Kintell IDs (`participant_kintell_id`, `mentor_kintell_id`) tracked in `user_external_ids`
- Used for cross-referencing but **not** for matching (email takes precedence)
- Enables "show me this user's Kintell profile" lookups

### **P3: Upsert Philosophy**
- **Find existing** user by email first
- **Create new** user only if no email match
- **Update minimal** fields (don't overwrite existing data unless newer)

### **P4: Idempotency Guarantee**
- Re-importing same CSV produces same results (no duplicate users)
- Hash-based deduplication prevents duplicate inserts

### **P5: Conflict Detection (Not Resolution)**
- Detect conflicts (same email, different names) but **don't auto-resolve**
- Log conflicts for human review
- Proceed with import using "last write wins" for now (can enhance later)

---

## Identity Matching Algorithm

### **Step 1: Normalize Email**

```typescript
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
```

**Examples**:
- `Anna.K@Example.COM` → `anna.k@example.com`
- ` bob@test.org ` → `bob@test.org`

---

### **Step 2: Find Existing User by Email**

```typescript
async function findUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = normalizeEmail(email);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  return user || null;
}
```

**Behavior**:
- Returns existing user if email matches
- Returns `null` if no match (need to create new user)

---

### **Step 3: Create New User (if not found)**

```typescript
interface CreateUserInput {
  email: string;
  role: 'volunteer' | 'participant';
  firstName?: string;
  lastName?: string;
  externalSystem?: string;   // 'kintell', 'buddy', etc.
  externalId?: string;        // Kintell user ID
}

async function createUser(input: CreateUserInput): Promise<User> {
  const normalizedEmail = normalizeEmail(input.email);

  // Insert user
  const [user] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      role: input.role,
      firstName: input.firstName || null,
      lastName: input.lastName || null,
      journeyFlags: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  // Create external ID mapping (if provided)
  if (input.externalSystem && input.externalId) {
    await db.insert(userExternalIds).values({
      profileId: user.id,
      provider: input.externalSystem,
      externalId: input.externalId,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    });
  }

  logger.info({
    userId: user.id,
    email: normalizedEmail,
    role: input.role,
    externalSystem: input.externalSystem,
  }, 'User created during CSV import');

  return user;
}
```

**Behavior**:
- Creates user in `users` table
- Creates external ID mapping in `user_external_ids` (if Kintell ID provided)
- Returns newly created user

---

### **Step 4: Upsert External ID Mapping**

```typescript
async function upsertExternalId(
  userId: string,
  provider: string,
  externalId: string
): Promise<void> {
  // Check if mapping already exists
  const [existing] = await db
    .select()
    .from(userExternalIds)
    .where(
      and(
        eq(userExternalIds.profileId, userId),
        eq(userExternalIds.provider, provider)
      )
    )
    .limit(1);

  if (existing) {
    // Update external ID if different
    if (existing.externalId !== externalId) {
      logger.warn({
        userId,
        provider,
        oldExternalId: existing.externalId,
        newExternalId: externalId,
      }, 'External ID mismatch - updating to newer value');

      await db
        .update(userExternalIds)
        .set({
          externalId,
          updatedAt: new Date(),
        })
        .where(eq(userExternalIds.id, existing.id));
    }
  } else {
    // Create new mapping
    await db.insert(userExternalIds).values({
      profileId: userId,
      provider,
      externalId,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    });
  }
}
```

**Behavior**:
- If external ID mapping exists: update if different (conflict detection)
- If no mapping: create new entry
- Logs warnings when external ID changes (potential data quality issue)

---

### **Step 5: Complete Upsert Function**

```typescript
export async function upsertUser(input: CreateUserInput): Promise<User> {
  const normalizedEmail = normalizeEmail(input.email);

  // Try to find existing user
  let user = await findUserByEmail(normalizedEmail);

  if (user) {
    logger.debug({
      userId: user.id,
      email: normalizedEmail,
      role: input.role,
    }, 'User found by email, reusing existing user');

    // Update external ID mapping (if provided)
    if (input.externalSystem && input.externalId) {
      await upsertExternalId(user.id, input.externalSystem, input.externalId);
    }

    // TODO: Check for name conflicts (same email, different name)
    if (input.firstName && input.lastName) {
      if (user.firstName !== input.firstName || user.lastName !== input.lastName) {
        logger.warn({
          userId: user.id,
          email: normalizedEmail,
          existingName: `${user.firstName} ${user.lastName}`,
          csvName: `${input.firstName} ${input.lastName}`,
        }, 'Name mismatch for existing user - keeping existing name');
      }
    }

    return user;
  } else {
    // Create new user
    user = await createUser(input);
    return user;
  }
}
```

**Behavior**:
- **If user exists** by email:
  - Reuse existing user
  - Upsert external ID mapping
  - Log warning if name mismatch
  - Return existing user
- **If user doesn't exist**:
  - Create new user
  - Create external ID mapping
  - Return new user

---

## Deduplication Strategy

### **Session-Level Deduplication**

**Goal**: Prevent duplicate sessions when re-importing same CSV.

**Key**: `externalSessionId` (Kintell's session ID)

```typescript
async function isSessionDuplicate(externalSessionId: string): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(kintellSessions)
    .where(eq(kintellSessions.externalSessionId, externalSessionId))
    .limit(1);

  return !!existing;
}
```

**Behavior**:
- Check if session with same `externalSessionId` exists
- If yes: skip session (log as "duplicate skipped")
- If no: proceed with insert

---

### **User-Level Deduplication**

**Goal**: Ensure no duplicate users with same email.

**Key**: `email` (normalized)

**Enforcement**:
- ✅ Database: `users.email` has UNIQUE constraint
- ✅ Application: `upsertUser()` function finds before creating
- ✅ Transaction safety: Use upserts to handle race conditions

**Edge Case: Concurrent Imports**

If two CSV imports run concurrently and both try to create same user:
- **PostgreSQL UNIQUE constraint** catches duplicate
- **Application retries** with SELECT (find existing user)
- Result: Only one user created, other import reuses it

```typescript
async function upsertUserSafe(input: CreateUserInput): Promise<User> {
  try {
    return await upsertUser(input);
  } catch (error: any) {
    // Check for unique constraint violation
    if (error.code === '23505' && error.constraint === 'users_email_unique') {
      logger.warn({
        email: input.email,
      }, 'Unique constraint violation on email, retrying with SELECT');

      // Retry: find existing user
      const user = await findUserByEmail(input.email);
      if (user) {
        return user;
      }
    }
    throw error; // Re-throw other errors
  }
}
```

---

## Conflict Detection

### **Conflict Type 1: Email Match, Name Mismatch**

**Scenario**:
- CSV Row 1: `anna@example.com`, `Anna`, `Kowalski`
- CSV Row 2: `anna@example.com`, `Anna`, `Smith`

**Resolution**:
- ✅ **Same user** (email matches)
- ⚠️ **Log warning**: "Name mismatch detected"
- ✅ **Keep existing name** (first write wins)
- ✅ **Proceed with import**

**Future Enhancement**: Flag for human review (conflict resolution UI)

---

### **Conflict Type 2: Different Email, Same Kintell ID**

**Scenario**:
- Previous import: `anna@old.com`, Kintell ID `K-12345`
- Current import: `anna@new.com`, Kintell ID `K-12345`

**Resolution**:
- ⚠️ **Two different users** (emails don't match)
- ⚠️ **Log warning**: "Same Kintell ID, different emails"
- ✅ **Create second user** (email is primary key, not Kintell ID)
- ✅ **Link both to same Kintell ID** (via `user_external_ids`)

**Interpretation**: User changed email address in Kintell. May need manual merge later.

---

### **Conflict Type 3: Duplicate External IDs**

**Scenario**:
- User A: `anna@example.com`, Kintell ID `K-12345`
- User B: `bob@example.com`, Kintell ID `K-12345` (data error in Kintell)

**Resolution**:
- ⚠️ **Two different users** (emails don't match)
- ⚠️ **Log error**: "Duplicate Kintell ID across different users"
- ✅ **Allow both mappings** (no unique constraint on external ID alone)
- ✅ **Flag for review** (likely data quality issue in Kintell)

---

## Identity Linking Audit

**Table**: `identity_linking_audit` (already exists in schema)

**Purpose**: Track all user creation and external ID mapping operations for compliance.

```typescript
async function auditIdentityLinking(
  profileId: string,
  provider: string,
  externalId: string,
  operation: 'created' | 'updated',
  performedBy: string
): Promise<void> {
  await db.insert(identityLinkingAudit).values({
    profileId,
    provider,
    externalId,
    operation,
    performedBy, // 'kintell-connector' service name
    performedAt: new Date(),
    metadata: {},
  });
}
```

**Use Cases**:
- GDPR compliance: "Show me all identity linking operations for user X"
- Data quality audits: "When was Kintell ID linked to this user?"

---

## Role Assignment Strategy

### **Volunteer vs Participant**

**CSV Context**:
- Mentors CSV: `mentor_email` → volunteer, `participant_email` → participant
- Language CSV: `volunteer_email` → volunteer, `participant_email` → participant

**Role Assignment Logic**:

```typescript
function determineRole(emailField: 'volunteer' | 'participant'): 'volunteer' | 'participant' {
  return emailField === 'volunteer' ? 'volunteer' : 'participant';
}
```

**Edge Case: User Appears as Both Volunteer and Participant**

**Scenario**:
- Session 1: `anna@example.com` as volunteer (tutor)
- Session 2: `anna@example.com` as participant (learner in different program)

**Current Resolution**:
- ✅ **First role wins** (role assigned when user created)
- ⚠️ **Log warning**: "User has multiple roles across sessions"
- ✅ **Proceed with import** (role doesn't block session creation)

**Future Enhancement**: Support multi-role users (junction table `user_roles`)

---

## Transaction Safety

### **Atomic User + External ID Creation**

```typescript
async function upsertUserTransactional(input: CreateUserInput): Promise<User> {
  return await db.transaction(async (tx) => {
    // Find or create user
    let user = await tx
      .select()
      .from(users)
      .where(eq(users.email, normalizeEmail(input.email)))
      .limit(1);

    if (!user.length) {
      [user] = await tx.insert(users).values({ /* ... */ }).returning();
    } else {
      user = user[0];
    }

    // Upsert external ID
    if (input.externalSystem && input.externalId) {
      await tx
        .insert(userExternalIds)
        .values({ profileId: user.id, provider: input.externalSystem, externalId: input.externalId })
        .onConflictDoUpdate({
          target: [userExternalIds.profileId, userExternalIds.provider],
          set: { externalId: input.externalId, updatedAt: new Date() },
        });
    }

    return user;
  });
}
```

**Benefits**:
- ✅ User + external ID created atomically (rollback if either fails)
- ✅ Handles race conditions (concurrent imports)
- ✅ Uses `onConflictDoUpdate` for true upsert behavior

---

## Performance Considerations

### **Batch Lookups**

For large CSVs (1000+ rows), batch user lookups to reduce DB queries:

```typescript
async function batchFindUsers(emails: string[]): Promise<Map<string, User>> {
  const normalizedEmails = emails.map(normalizeEmail);

  const users = await db
    .select()
    .from(users)
    .where(inArray(users.email, normalizedEmails));

  return new Map(users.map(u => [u.email, u]));
}

// Usage in batch processing:
const emails = csvRows.map(r => r.participant_email);
const existingUsers = await batchFindUsers(emails);

for (const row of csvRows) {
  const user = existingUsers.get(normalizeEmail(row.participant_email))
    || await createUser({ email: row.participant_email, role: 'participant' });
  // ... process session
}
```

**Benefit**: Reduces N queries to 1 query + N lookups (map is O(1))

---

## Security & Privacy

### **PII Handling in Logs**

**Risk**: Emails and names in logs could expose PII.

**Mitigation**:
```typescript
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}

// Usage:
logger.info({
  email: maskEmail(input.email), // a***@example.com
  role: input.role,
}, 'User created');
```

**Apply masking to**:
- All INFO/DEBUG logs
- Error logs (already contain email context)
- Audit logs (keep unmasked for compliance, restrict access)

---

## Testing Strategy

### **Unit Tests**

1. **Test `normalizeEmail()`**:
   - ✅ Lowercase conversion
   - ✅ Trim whitespace
   - ✅ Preserve domain

2. **Test `findUserByEmail()`**:
   - ✅ Finds existing user
   - ✅ Returns null if not found
   - ✅ Case-insensitive matching

3. **Test `upsertUser()`**:
   - ✅ Creates new user if not exists
   - ✅ Reuses existing user if email matches
   - ✅ Creates external ID mapping
   - ✅ Logs conflicts (name mismatch)

4. **Test `isSessionDuplicate()`**:
   - ✅ Returns true for existing session
   - ✅ Returns false for new session

### **Integration Tests**

1. **Test User Creation Flow**:
   - Import CSV with 10 new users
   - Verify 10 users created in DB
   - Verify 10 external ID mappings created

2. **Test User Reuse Flow**:
   - Import CSV with existing user
   - Verify no duplicate user created
   - Verify external ID mapping updated

3. **Test Re-Import Idempotency**:
   - Import same CSV twice
   - Verify no duplicate users or sessions
   - Verify counts match (all skipped on second import)

4. **Test Conflict Detection**:
   - Import CSV with name mismatch
   - Verify warning logged
   - Verify import proceeds (not blocked)

---

## Implementation Checklist

- [ ] Implement `normalizeEmail()` utility
- [ ] Implement `findUserByEmail()` function
- [ ] Implement `createUser()` function
- [ ] Implement `upsertExternalId()` function
- [ ] Implement `upsertUser()` function (main entry point)
- [ ] Implement `isSessionDuplicate()` function
- [ ] Implement `auditIdentityLinking()` function
- [ ] Add conflict detection logging (name mismatch)
- [ ] Add email masking in logs
- [ ] Write unit tests (≥80% coverage)
- [ ] Write integration tests (full import flow)
- [ ] Document edge cases in code comments

---

## Future Enhancements

1. **Multi-Role Support**: Allow users to be both volunteer and participant
2. **Conflict Resolution UI**: Admin panel for resolving name mismatches
3. **Fuzzy Matching**: Detect near-duplicate users (e.g., `anna@gmail.com` vs `anna.k@gmail.com`)
4. **Batch Upserts**: Use PostgreSQL `INSERT ... ON CONFLICT` for better performance
5. **Identity Merge Tool**: Manually merge duplicate users (consolidate sessions, external IDs)

---

## Conclusion

✅ **Email is primary key** for identity matching
✅ **Upsert philosophy** (find before create)
✅ **Idempotency guarantee** (re-imports produce same results)
✅ **Conflict detection** (log, don't block)
✅ **Transaction safety** (atomic user + external ID creation)
✅ **Performance optimized** (batch lookups)
✅ **Privacy-aware** (email masking in logs)
✅ **Testable** (unit + integration tests defined)

**Next Agent**: program-instance-modeler (design program instance resolution logic)
