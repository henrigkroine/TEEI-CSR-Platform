# Multi-Agent Orchestration Structure

## [PROJECT_NAME]: Documentation Site

**Tech Stack**: [Astro / Docusaurus / MkDocs / Nextra], Markdown, TypeScript, [Tailwind / CSS]
**Purpose**: [CUSTOMIZE: Describe the documentation scope - API docs, guides, handbook, changelog]
**Hosting**: [CUSTOMIZE: GitHub Pages / Vercel / Netlify]

---

## Build & Test Commands

```bash
# Install dependencies
pnpm install

# Development server with live reload
pnpm dev

# Type checking (for frontmatter validation, code examples)
pnpm typecheck

# Linting and formatting
pnpm lint
pnpm format

# Build for production
pnpm build

# Preview production build locally
pnpm preview

# Link validation (check for broken links)
pnpm test:links

# Search index generation
pnpm build:search

# OpenAPI / API reference generation
pnpm generate:api-docs
```

---

## Architecture Overview

### Repository Structure

```
[project]/
├── docs/                             # [CUSTOMIZE: Documentation source]
│   ├── index.md                     # Homepage / overview
│   ├── getting-started/
│   │   ├── installation.md          # Setup instructions
│   │   ├── quickstart.md            # First steps
│   │   └── configuration.md         # Configuration guide
│   ├── guides/
│   │   ├── [topic-1]/               # Feature/topic guides
│   │   │   ├── index.md
│   │   │   ├── basic.md
│   │   │   └── advanced.md
│   │   └── [topic-2]/
│   ├── api/                          # [CUSTOMIZE: API documentation]
│   │   ├── overview.md
│   │   ├── endpoints/
│   │   │   └── [resource].md        # Endpoint documentation
│   │   └── [service].md             # Service documentation
│   ├── reference/                    # Reference material
│   │   ├── glossary.md              # Terms and concepts
│   │   ├── faq.md                   # Frequently asked questions
│   │   ├── troubleshooting.md       # Troubleshooting guide
│   │   └── checklists/              # Implementation checklists
│   ├── resources/
│   │   ├── videos.md                # Video links and transcripts
│   │   ├── templates.md             # Templates and examples
│   │   └── downloads.md             # Downloadable resources
│   └── _meta.json                   # [CUSTOMIZE: Navigation structure]
│
├── src/
│   ├── components/                   # React/Vue components for docs
│   │   ├── CodeBlock.tsx            # Syntax highlighted code
│   │   ├── ApiEndpoint.tsx          # API endpoint examples
│   │   ├── Alert.tsx                # Info/warning boxes
│   │   └── Examples.tsx             # Interactive examples
│   ├── layouts/                      # Page layouts
│   ├── styles/                       # Global styles
│   └── utils/                        # Build utilities
├── tests/
│   ├── links.test.ts                # Link validation tests
│   ├── markdown.test.ts             # Markdown syntax validation
│   └── codeblock.test.ts            # Code block example validation
├── public/                           # Static assets
│   ├── images/
│   ├── downloads/
│   └── files/
├── .docusaurus/                      # [CUSTOMIZE: Framework cache]
├── [docusaurus.config.js / astro.config.mjs / mkdocs.yml] # Site config
├── package.json
└── README.md
```

### Key Features

- **Markdown Content**: Easy-to-edit documentation in Markdown format
- **Navigation**: Auto-generated or manual table of contents
- **API Docs**: [CUSTOMIZE: OpenAPI integration, API endpoint documentation]
- **Code Examples**: Syntax highlighting, runnable examples
- **Search**: Full-text search across documentation
- **Versioning**: [CUSTOMIZE: Multiple documentation versions]
- **i18n**: [CUSTOMIZE: Multi-language support (optional)]

---

## Agent Team Structure

### Team 1: Content & Documentation (2 agents)
**Lead**: content-lead
- **Agent 1.1**: technical-writer (Guides, tutorials, explanations)
- **Agent 1.2**: api-doc-writer (API reference, code examples)

### Team 2: Site & QA (2 agents)
**Lead**: site-lead
- **Agent 2.1**: site-developer (Navigation, styling, components)
- **Agent 2.2**: qa-specialist (Link validation, content review, consistency)

---

## Safety Constraints

### NEVER (Blocking)
- ❌ NEVER commit secrets, API keys, or credentials in documentation
- ❌ NEVER publish outdated or incorrect information
- ❌ NEVER break navigation or site structure without testing
- ❌ NEVER use `any` types in code examples (teach best practices)
- ❌ NEVER skip link validation before deployment
- ❌ NEVER commit large binary files (images should be optimized)
- ❌ NEVER leave "TODO" or "FIXME" comments in published docs
- ❌ NEVER include copyrighted content without permission

### ALWAYS (Required)
- ✅ ALWAYS run `pnpm build` before deployment
- ✅ ALWAYS validate all links with `pnpm test:links`
- ✅ ALWAYS test code examples (should be runnable or correct)
- ✅ ALWAYS use consistent formatting (Prettier, Markdown style)
- ✅ ALWAYS keep examples up-to-date with latest API/versions
- ✅ ALWAYS include version information (product version, release date)
- ✅ ALWAYS write clear, beginner-friendly explanations
- ✅ ALWAYS include diagrams or visuals for complex concepts
- ✅ ALWAYS test responsive design for mobile viewing
- ✅ ALWAYS optimize images for web (use WebP, responsive sizes)
- ✅ ALWAYS add alt text to all images
- ✅ ALWAYS update changelog when publishing documentation

---

## Quality Gates

- ✅ **Build**: `pnpm build` succeeds without errors
- ✅ **Links**: All internal and external links valid (`pnpm test:links`)
- ✅ **Markdown**: Valid Markdown syntax, consistent formatting
- ✅ **Code Examples**: Examples are correct and runnable (or clearly marked as pseudo-code)
- ✅ **Images**: All optimized, responsive, with alt text
- ✅ **Navigation**: Site navigation complete and logical
- ✅ **Search**: Search index generated and functional
- ✅ **Spelling**: No typos or grammar errors (automated checks)
- ✅ **Accessibility**: WCAG 2.1 AA minimum (semantic HTML, ARIA labels)
- ✅ **Performance**: Site loads quickly (Lighthouse ≥90)
- ✅ **Consistency**: Tone, terminology, formatting consistent throughout
- ✅ **Code Review**: Content reviewed for accuracy and clarity

---

## Agent Definitions

### Agent 1.1: Technical Writer

**When to Invoke**: MUST BE USED when:
- Writing guides and tutorials in `docs/guides/`
- Creating getting-started documentation
- Writing explanatory content
- Creating diagrams or flowcharts
- Updating changelog or release notes

**Capabilities**:
- Technical writing and explanation
- Markdown authoring
- Instructional design (tutorials, guides)
- Diagrams and visuals (Mermaid, drawings)
- Target audience adaptation (beginner → advanced)

**Deliverables**:
- Markdown files in `docs/guides/` and `docs/getting-started/`
- Diagrams and flowcharts
- Examples and walkthroughs
- Content review checklist in `/reports/`

**Blocked By**:
- ❌ Blocks merge if content lacks clarity
- ❌ Blocks merge if code examples incorrect
- ❌ Blocks merge if content outdated

---

### Agent 1.2: API Documentation Writer

**When to Invoke**: MUST BE USED when:
- Writing API endpoint documentation
- Creating API reference material
- Documenting request/response examples
- [CUSTOMIZE: Generating OpenAPI docs]
- Writing SDK or integration guides

**Capabilities**:
- API documentation (OpenAPI/Swagger format)
- Code example generation
- Request/response documentation
- Error code reference
- Integration guides

**Deliverables**:
- API documentation in `docs/api/`
- Code examples and snippets
- Integration guides
- OpenAPI specs (if applicable)

**Blocked By**:
- ❌ Blocks merge if examples don't match API
- ❌ Blocks merge if error codes not documented

---

### Agent 2.1: Site Developer

**When to Invoke**: MUST BE USED when:
- Modifying site configuration
- Adding new sections or pages
- Customizing site styling
- Adding interactive components
- Fixing navigation issues
- Optimizing site performance

**Capabilities**:
- [CUSTOMIZE: Docusaurus / Astro / MkDocs] configuration
- Markdown component extension
- CSS styling and customization
- Navigation configuration
- Search setup and optimization

**Deliverables**:
- Site configuration files
- Custom components in `src/components/`
- Styling in `src/styles/`
- Navigation metadata

**Blocked By**:
- ❌ Blocks merge if site doesn't build
- ❌ Blocks merge if navigation broken

---

### Agent 2.2: QA Specialist

**When to Invoke**: MUST BE USED when:
- Validating content accuracy
- Testing links
- Checking consistency
- Reviewing for spelling/grammar
- Testing responsive design
- Validating accessibility

**Capabilities**:
- Content review and accuracy checking
- Link validation (automated)
- Consistency checking (terminology, formatting)
- Spell check and grammar
- Accessibility testing
- Performance auditing

**Deliverables**:
- Link validation reports
- Content review checklist
- Accessibility audit report
- Performance metrics

**Blocked By**:
- ❌ Blocks merge if broken links found
- ❌ Blocks merge if accessibility violations found

---

## Orchestration Workflow

### Phase 1: Foundation (Week 1)
1. **site-lead**: Set up documentation site structure, configuration, navigation
2. **content-lead**: Define documentation scope, structure, and outline
3. **qa-specialist**: Configure link validation and consistency checks

### Phase 2: Content Creation (Week 2-3)
1. **technical-writer**: Write guides, tutorials, getting-started docs
2. **api-doc-writer**: Write API reference and integration guides
3. **site-developer**: Build custom components if needed

### Phase 3: Review & QA (Week 4)
1. **qa-specialist**: Run link validation, consistency checks, accessibility audit
2. **technical-writer + api-doc-writer**: Address feedback, update content
3. All Leads: Final review, approve for publication

---

## Success Criteria

✅ Site builds successfully (`pnpm build`)
✅ Development server starts (`pnpm dev`)
✅ All links valid, no broken links
✅ All code examples correct and runnable (or clearly marked as pseudo-code)
✅ All images optimized and include alt text
✅ Navigation complete and logical
✅ Search functional and indexed
✅ Content consistent (terminology, tone, formatting)
✅ No spelling or grammar errors
✅ WCAG 2.1 AA accessibility compliance
✅ Mobile responsive (tested on multiple devices)
✅ Performance good (Lighthouse ≥90)
✅ Changelog updated with new documentation
✅ No secrets or credentials in documentation
✅ No outdated information or deprecated APIs
✅ PR includes preview link

---

## Communication Protocol

- **Daily**: 5-min standup on content priorities
- **Code Review**: Content reviewed for accuracy and clarity
- **Documentation**: Version information tracked in changelog
- **Publishing**: Deployed to production with announcement

---

## Customization Checklist

- [ ] Replace [PROJECT_NAME] with actual project name
- [ ] Replace [CUSTOMIZE: ...] sections with project details
- [ ] Choose and configure documentation platform (Astro/Docusaurus/MkDocs)
- [ ] Define documentation scope and structure
- [ ] Decide on versioning strategy (if multiple versions needed)
- [ ] Choose search implementation (if custom search needed)
- [ ] Define API documentation format (OpenAPI / custom)
- [ ] Plan i18n support (if multi-language needed)
- [ ] Set up analytics (if tracking needed)
- [ ] Create style guide for documentation (tone, terminology)
- [ ] Add project-specific sections (FAQ, troubleshooting, etc.)
- [ ] Set up publishing pipeline (build → staging → production)
