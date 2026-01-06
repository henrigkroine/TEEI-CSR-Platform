# Program Templates Seed Data

This directory contains SQL seed files for populating the `program_templates` table with default, production-ready program templates.

## Files

| File | Description | Templates |
|------|-------------|-----------|
| `mentorship-template.sql` | Mentorship program templates | 3 templates |
| `language-template.sql` | Language learning program templates | 4 templates |
| `buddy-template.sql` | Buddy matching program templates | 4 templates |
| `upskilling-template.sql` | Upskilling and certification program templates | 5 templates |

**Total**: 16 default templates covering 4 program types

## Usage

### Prerequisites

1. Database must have `program_templates` table created (via migration)
2. `program_type` enum must exist with values: `mentorship`, `language`, `buddy`, `upskilling`, `weei`

### Loading Templates

Run each SQL file against your database:

```bash
# Load all templates
psql -d teei_platform -f scripts/seed/templates/mentorship-template.sql
psql -d teei_platform -f scripts/seed/templates/language-template.sql
psql -d teei_platform -f scripts/seed/templates/buddy-template.sql
psql -d teei_platform -f scripts/seed/templates/upskilling-template.sql
```

Or load individually as needed.

### Verification

After loading, verify templates:

```sql
-- Count templates by type
SELECT program_type, COUNT(*) as count
FROM program_templates
WHERE is_active = true
GROUP BY program_type
ORDER BY program_type;

-- Expected output:
-- buddy       | 4
-- language    | 4
-- mentorship  | 3
-- upskilling  | 5
```

## Template Details

### Mentorship Templates

1. **Mentorship 1-on-1 (6 months)** - `tmpl-mentor-1on1-000000000001`
   - Standard career mentorship
   - Bi-weekly 60-min sessions
   - Capacity: 1-100 participants, 1 volunteer per pair

2. **Mentorship Group Sessions (3 months)** - `tmpl-mentor-group-000000000002`
   - Group mentorship (4-8 mentees per mentor)
   - Weekly 90-min sessions
   - Focus on peer support and community

3. **Technical Skills Mentorship (4 months)** - `tmpl-mentor-tech-000000000003`
   - Specialized technical skill development
   - Weekly 90-min sessions
   - Project-based learning

### Language Templates

1. **English Group Sessions (A1-A2)** - `tmpl-lang-eng-basic-000000000001`
   - Beginner English (6-10 participants)
   - Twice weekly, 90-min sessions
   - 12 weeks total

2. **Norwegian Group Sessions (B1-B2)** - `tmpl-lang-nor-inter-000000000002`
   - Intermediate Norwegian (5-8 participants)
   - Three times weekly, 90-min sessions
   - 16 weeks, certification offered

3. **Business English 1-on-1 (B2-C1)** - `tmpl-lang-eng-business-000000000003`
   - Advanced business English
   - Twice weekly, 60-min sessions
   - 12 weeks, certification offered

4. **German Intensive (A1-B1)** - `tmpl-lang-ger-intensive-000000000004`
   - Intensive German (8-12 participants)
   - Five times weekly, 120-min sessions
   - 20 weeks, covers A1-B1 levels

### Buddy Templates

1. **Buddy 1-on-1 Matching (6 months)** - `tmpl-buddy-1on1-000000000001`
   - Standard social integration buddy program
   - Bi-weekly check-ins
   - 12 required check-ins over 24 weeks

2. **Buddy Group Activities (3 months)** - `tmpl-buddy-group-000000000002`
   - Group-based activities (4-6 people per volunteer)
   - Bi-weekly meetings
   - 6 required check-ins over 12 weeks

3. **Professional Networking Buddy (4 months)** - `tmpl-buddy-professional-000000000003`
   - Career-focused buddy program
   - Skill-based matching
   - Emphasis on networking and job market

4. **Family Integration Buddy (12 months)** - `tmpl-buddy-family-000000000004`
   - Long-term family support
   - Monthly check-ins
   - Flexible meeting schedule

### Upskilling Templates

1. **Tech Skills Bootcamp (12 weeks)** - `tmpl-upskill-tech-000000000001`
   - Web dev, data analytics, or cloud
   - LinkedIn Learning + Coursera
   - Certification required

2. **Professional Certifications (16 weeks)** - `tmpl-upskill-prof-cert-000000000002`
   - PMP, Scrum, Google Analytics, etc.
   - Self-paced with study groups
   - Stipend provided

3. **Digital Literacy Fundamentals (8 weeks)** - `tmpl-upskill-digital-basics-000000000003`
   - Computer basics for beginners
   - Hands-on workshops
   - No certification required

4. **Language + Professional Skills (20 weeks)** - `tmpl-upskill-lang-prof-000000000004`
   - Integrated language + industry skills
   - Hospitality, healthcare, retail, customer service
   - Certification + job placement support

5. **Cloud Computing Certification (14 weeks)** - `tmpl-upskill-cloud-000000000005`
   - AWS/Azure/GCP certification prep
   - Advanced technical program
   - Hands-on labs included

## Template Structure

Each template includes:

- **Identity**: Unique ID, name, description
- **Classification**: Program type, version
- **Configuration**: JSONB config (typed via TypeScript interfaces)
- **Capacity**: Min/max participants, volunteers needed
- **Outcomes**: Array of outcome metrics tracked
- **Compatibility**: Suitable beneficiary group tags
- **Monetization**: Cost estimates, volunteer hour estimates
- **Metadata**: Tags, creation timestamp

## Customization

These templates are **public** (`is_public = true`) and available to all companies. They can be:

1. **Used as-is** in campaigns
2. **Overridden** with company-specific config in campaigns
3. **Cloned** to create custom private templates (future feature)
4. **Versioned** when significant changes are needed

## Maintenance

### Updating Templates

To update a template:

1. Decide if change is MAJOR, MINOR, or PATCH
2. For MAJOR changes: Create new version, deprecate old
3. For MINOR/PATCH: Update in place (if backward compatible)

### Deprecating Templates

```sql
UPDATE program_templates
SET
  deprecated_at = NOW(),
  is_active = false,
  superseded_by = 'new-template-id'
WHERE id = 'old-template-id';
```

### Adding New Templates

Follow the pattern in existing seed files:

1. Generate unique ID: `tmpl-[type]-[variant]-[sequence]`
2. Define complete config JSONB
3. Set realistic capacity and cost estimates
4. Tag appropriately for discoverability
5. Test with a pilot campaign before marking active

## Related Documentation

- [PROGRAM_TEMPLATES_GUIDE.md](/docs/PROGRAM_TEMPLATES_GUIDE.md) - Comprehensive template guide
- [SWARM_6_PLAN.md](/SWARM_6_PLAN.md) - Full SWARM 6 context
- [program-templates.ts](/packages/shared-schema/src/schema/program-templates.ts) - Schema definition

## Support

Questions? Issues?

- Schema questions: Review `/packages/shared-schema/src/schema/program-templates.ts`
- Template design: See `/docs/PROGRAM_TEMPLATES_GUIDE.md`
- Business requirements: Contact CSR program leads

---

**Created**: 2025-11-22
**Agent**: 1.3 (program-template-modeler)
**Status**: Ready for SWARM 6 Phase 1
