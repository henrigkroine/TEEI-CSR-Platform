# Enablement Templates

**Purpose**: Reusable agent definitions for common specialist roles across TEEI and YPAI projects.

**Location**: `/enablement-templates/agents/`

This directory contains **reference agent definitions** that follow the Technical Specialist template from `CLAUDE_ENABLEMENT_BEST_PRACTICES.md`. These templates can be:

1. **Referenced directly** in AGENTS.md files across projects
2. **Customized** for specific project contexts
3. **Composed** together by lead agents for multi-specialist workflows

---

## Available Agent Templates

### SEO Specialist (`seo-specialist.md`)

Expert in search engine optimization across web properties. Handles meta tags, structured data (JSON-LD), sitemap generation, robots.txt configuration, Core Web Vitals optimization, and hreflang for multi-locale sites.

**Use Cases**:
- Adding SEO to new Astro pages
- Implementing multi-locale hreflang
- Generating XML sitemaps with alternates
- Optimizing Core Web Vitals (LCP, FID, CLS)
- Configuring robots.txt for crawl efficiency
- Implementing structured data schemas

**Key Deliverables**:
- Meta tags & Open Graph configuration
- JSON-LD schema components
- XML sitemaps with locale variants
- robots.txt with crawler directives
- Core Web Vitals measurement & optimization
- Audit reports with findings & recommendations

**Quality Gates**:
- ✅ Meta title (≤60 chars) and description (≤160 chars) on all pages
- ✅ JSON-LD schema on content-rich pages (Articles, Events)
- ✅ Canonical URLs configured and valid
- ✅ hreflang tags complete and bidirectional
- ✅ Core Web Vitals: Lighthouse score ≥75
- ✅ Sitemap.xml valid and referenced in robots.txt

---

## How to Use These Templates

### Option 1: Reference in AGENTS.md

In your project's `AGENTS.md`, reference the template specialist:

```markdown
## Managed Specialists

1. **seo-specialist** - SEO optimization (meta tags, structured data, Core Web Vitals)
   - Reference: `/enablement-templates/agents/seo-specialist.md`
```

### Option 2: Copy and Customize

For project-specific customization:

```bash
cp enablement-templates/agents/seo-specialist.md .claude/agents/seo-specialist-custom.md
# Edit to add project-specific context, file paths, examples
```

### Option 3: Compose in Multi-Agent Workflows

Use in lead agent delegation:

```markdown
# Frontend Lead

## Managed Specialists
1. **seo-specialist** - Meta tags, structured data, Core Web Vitals
   - Handles pages in apps/corp-cockpit-astro/src/pages/
   - Validates Lighthouse ≥75 for all public routes
2. **performance-specialist** - Web performance tuning
   - Optimizes images, fonts, code splitting
   - Works with seo-specialist on Core Web Vitals

## Decision Framework
- **SEO Strategy**: Automated meta injection, JSON-LD on all content pages
- **Performance**: Target LCP <2.5s, FID <100ms, CLS <0.1 for SEO ranking
- **Localization**: hreflang on all pages, x-default fallback mandatory
```

---

## Template Structure (Technical Specialist Pattern)

Each specialist agent definition includes:

```markdown
# [Specialist] Specialist

## Role
[Expertise description - 1-2 sentences]

## When to Invoke
MUST BE USED when:
- [Specific trigger 1]
- [Specific trigger 2]
- [Specific trigger 3]

Use PROACTIVELY for:
- [Proactive scenario]

## Capabilities
- [Capability 1]
- [Capability 2]
- [Capability 3]

## Context Required
- @AGENTS.md for standards
- [Project-specific context]
- [External docs if applicable]

## Deliverables
Creates/modifies:
- `[file paths]` - [Description]

## Examples
[Realistic examples with code blocks]

## Quality Gates & Validation
[Blocking conditions, SLOs, monitoring]

## Decision Framework
[Standards and conventions]

## Allowed Tools
[Tool access (least-privilege)]
```

---

## Integration with Claude Code

### Invoke an Agent from enablement-templates

```bash
# Terminal
claude-code "Set up SEO meta tags and JSON-LD for our Astro pages"

# Claude will recognize and invoke seo-specialist:
# - Looks in .claude/agents/ first
# - Falls back to AGENTS.md specialist list
# - Can reference enablement-templates/ in AGENTS.md documentation
```

### Multi-Agent Orchestration

Lead agents can coordinate multiple specialists:

```markdown
# Frontend Lead

MUST BE USED when:
- Building Corp Cockpit features spanning UI, SEO, performance

Delegates to:
- react-specialist: Component implementation
- seo-specialist: Meta tags, structured data, hreflang
- performance-specialist: Core Web Vitals optimization
```

---

## Best Practices

### ✅ Do's

1. **Reference from AGENTS.md**: Link to enablement-templates for discoverable documentation
   ```markdown
   # Managed Specialists
   1. **seo-specialist** - [See `/enablement-templates/agents/seo-specialist.md`]
   ```

2. **Customize for Context**: Add project-specific file paths, examples, quality gates
   ```markdown
   ## Context Required
   - apps/corp-cockpit-astro/src/pages/ (all new pages)
   - /src/layouts/BaseLayout.astro (meta injection point)
   - Multi-locale routing: en, es, fr, uk, no
   ```

3. **Clear Blocking Conditions**: Specify what prevents merge
   ```markdown
   Blocks merge if:
   - Meta title >60 characters
   - Canonical URL missing
   - hreflang incomplete (missing any locale)
   ```

### ❌ Don'ts

1. **Don't duplicate content**: Reference enablement-templates instead
   ```markdown
   # ❌ Bad (duplicate)
   AGENTS.md: [entire seo-specialist.md content repeated]

   # ✅ Good
   AGENTS.md: "See seo-specialist: /enablement-templates/agents/seo-specialist.md"
   ```

2. **Don't lose context specificity**: Customize to your project
   ```markdown
   # ❌ Vague
   "Add meta tags to pages"

   # ✅ Specific
   "Add meta title (≤60 chars), description (≤160 chars), OG image, hreflang (en/es/fr/uk/no), and canonical URL to all pages in apps/corp-cockpit-astro/src/pages/"
   ```

3. **Don't over-scope specialists**: Keep boundaries clear
   ```markdown
   # ❌ Too broad
   seo-specialist: "Handles all website optimization"

   # ✅ Scoped
   seo-specialist: "Handles SEO (meta, schema, sitemaps); delegates performance tuning to performance-specialist"
   ```

---

## Contributing New Templates

To add new agent templates:

1. **Copy the structure** from an existing template (e.g., `seo-specialist.md`)
2. **Follow the Technical Specialist pattern**:
   - Clear "When to Invoke" with MUST BE USED triggers
   - Realistic examples with code blocks
   - Quality gates and validation
   - Decision framework for standards
3. **Add to this README**: Document the template's use cases
4. **Test with Claude Code**: Verify agents are correctly invoked

Example template shell:
```markdown
# [Domain] Specialist

## Role
[Expert description]

## When to Invoke
MUST BE USED when:
- [Trigger 1]
- [Trigger 2]

## Capabilities
- [Capability 1]
- [Capability 2]

## Context Required
- @AGENTS.md
- [Project context]

## Deliverables
Creates/modifies:
- [Files]

## Examples
[Code examples]

## Quality Gates
[Blocking conditions]

## Decision Framework
[Standards]
```

---

## References

- **CLAUDE_ENABLEMENT_BEST_PRACTICES.md** - Complete guide to agent setup
- **AGENTS.md** - Multi-agent orchestration structure (reference implementation)
- **.claude/agents/** - Project-specific agent definitions
- **Claude Code Documentation**: https://docs.claude.com/
