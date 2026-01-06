# Claude/Agent Setup Troubleshooting Guide

**Purpose**: Diagnose and resolve common issues when setting up multi-agent systems in Claude Code.

**Audience**: Tech leads, agents, and developers troubleshooting agent orchestration.

---

## Table of Contents

1. [Agents Not Being Invoked When Expected](#agents-not-being-invoked-when-expected)
2. [CLAUDE.md Not Importing AGENTS.md](#claudemd-not-importing-agentsmd)
3. [Agent Trigger Conditions Too Vague or Too Specific](#agent-trigger-conditions-too-vague-or-too-specific)
4. [Circular Dependencies Between Agents](#circular-dependencies-between-agents)
5. [Tool Permission Issues](#tool-permission-issues)
6. [Performance Issues with Many Agents](#performance-issues-with-many-agents)
7. [Debugging Agent Selection and Delegation](#debugging-agent-selection-and-delegation)

---

## Agents Not Being Invoked When Expected

### Problem

You've defined an agent in `AGENTS.md` with clear "When to Invoke" triggers, but Claude doesn't invoke it when you expect.

**Symptoms**:
- Agent name not mentioned in Claude's response
- Task completed by general Claude instead of specialized agent
- Agent definition exists but seems ignored
- "I'll help with that" instead of "I'll invoke the X specialist"

### Root Causes & Solutions

#### **Cause 1: Agent Not Referenced in CLAUDE.md**

**Diagnosis**:
```bash
# Check if CLAUDE.md references AGENTS.md
grep -i "agents" /path/to/CLAUDE.md
# If no match or only @AGENTS.md reference without @-import, continue below
```

**Issue**: Claude only knows about agents listed in `CLAUDE.md`. If `CLAUDE.md` doesn't import or reference `AGENTS.md`, the agents won't be discoverable.

**Solution**:

Ensure `CLAUDE.md` explicitly references `AGENTS.md` at the top:

```markdown
# /path/to/CLAUDE.md

@AGENTS.md

# Your project-specific instructions...
```

The `@AGENTS.md` directive tells Claude: "Load all agent definitions from AGENTS.md into this conversation context."

**Verify**:
```bash
# CLAUDE.md should start with:
head -5 /path/to/CLAUDE.md
# Output should include: @AGENTS.md
```

---

#### **Cause 2: Trigger Conditions Too Narrow or Vague**

**Issue**: Your "When to Invoke" section is either:
- **Too specific**: "When adding SEO to the home page" (only one scenario, Claude won't generalize)
- **Too vague**: "When working on SEO" (Claude unsure if current task matches)

**Examples of Bad Triggers**:
```markdown
# ❌ Too specific (won't trigger for related tasks)
MUST BE USED when:
- Adding meta tags to apps/corp-cockpit-astro/src/pages/index.astro

# ❌ Too vague (Claude unsure if it applies)
MUST BE USED when:
- Working on the website
- Making optimization improvements
```

**Solution**: Write triggers that cover realistic scenarios while being specific:

```markdown
# ✅ Good trigger specificity
MUST BE USED when:
- Adding or modifying any public-facing Astro pages (src/pages/)
- Implementing multi-locale routing (en, es, fr, uk, no)
- Optimizing Core Web Vitals (LCP, FID, CLS)
- Creating new content collections requiring SEO metadata
- Configuring robots.txt, sitemaps, or canonical URLs
- Adding structured data (JSON-LD) to content
```

**Checklist**:
- [ ] Triggers cover 3+ realistic scenarios
- [ ] Each trigger is specific enough to distinguish from other agents
- [ ] Triggers mention concrete file paths, domain concepts, or deliverables
- [ ] Triggers avoid generic phrases like "when working on..."

---

#### **Cause 3: Agent Name Doesn't Match User's Language**

**Issue**: You named your agent `seo-meta-tags-specialist`, but the user says "Set up SEO for the homepage."

Claude must match your agent name/role to user intent. If there's a gap, it won't invoke the agent.

**Solution**: Use intuitive, self-explanatory agent names:

```markdown
# ❌ Unclear naming
Agent: `optimization-expert`
User task: "Add meta tags to pages"
Claude: Won't connect these

# ✅ Clear naming
Agent: `seo-specialist`
User task: "Add meta tags to pages"
Claude: Recognizes "SEO" ≈ "meta tags" and invokes seo-specialist
```

**Name Guidelines**:
- Use familiar job titles: `seo-specialist`, `performance-engineer`, `a11y-engineer`
- Avoid acronyms alone: ❌ `CSR-expert`, ✅ `csr-reporting-specialist`
- Include the domain: ❌ `ui-dev`, ✅ `react-component-specialist`

---

#### **Cause 4: Missing "Use PROACTIVELY" or Overlapping Agent Scope**

**Issue**: Two agents could handle the same task, and Claude invokes neither, or picks the wrong one.

**Example**:
```markdown
Agent A - seo-specialist
MUST BE USED when:
- Adding meta tags
- Implementing hreflang

Agent B - content-specialist
MUST BE USED when:
- Writing page content
- Optimizing copy for readability
```

User task: "Write page content and add meta tags."

Result: Claude invokes content-specialist but skips seo-specialist because the boundaries are unclear.

**Solution**: Define clear ownership and delegation:

```markdown
# In AGENTS.md lead agent:
## Agent Coordination

**seo-specialist** (meta tags, hreflang, structured data):
- Handles all SEO metadata
- Invoked AFTER content-specialist completes copy

**content-specialist** (page copy, headlines):
- Handles content creation
- MUST delegate to seo-specialist before merge

## When seo-specialist is NOT invoked:
- Content-only changes (no metadata touch)
- Bulk edits to existing pages (already SEO-compliant)

## When BOTH are invoked (in sequence):
1. User: "Write a new blog post about cloud optimization"
2. content-specialist: Writes post content
3. seo-specialist: Adds meta tags, structured data, hreflang
```

---

#### **Cause 5: Agent Context Size Exceeded**

**Issue**: You have 50+ agents in `AGENTS.md`, and Claude's context window is full loading them all. Claude skips invoking agents to preserve tokens.

**Symptom**: Adding more agents makes existing agents less likely to invoke.

**Solution**:
1. **Split AGENTS.md by role**: Instead of one 1000-line AGENTS.md, create:
   ```
   AGENTS-FRONTEND.md
   AGENTS-BACKEND.md
   AGENTS-QA.md
   ```
   Then in CLAUDE.md, import only what's needed:
   ```markdown
   @AGENTS-FRONTEND.md
   @AGENTS-BACKEND.md
   ```

2. **Use enablement-templates for reference**:
   ```markdown
   # seo-specialist
   See detailed definition: /enablement-templates/agents/seo-specialist.md

   MUST BE USED when:
   - [Key triggers specific to your project]
   ```

3. **Defer verbose documentation**:
   ```markdown
   # ❌ Don't inline entire agent spec
   Agent: seo-specialist
   [100 lines of capabilities, examples, etc.]

   # ✅ Reference external docs
   Agent: seo-specialist
   See: /enablement-templates/agents/seo-specialist.md
   For [project]: Modified to handle /src/pages/ multi-locale routes
   ```

---

### Debugging Checklist

Use this checklist to diagnose why an agent isn't invoked:

```markdown
# Debugging Agent Non-Invocation

Agent name: ________________
Expected trigger: ________________
Actual outcome: ________________

## Step 1: Verify Registration
- [ ] CLAUDE.md contains `@AGENTS.md`?
- [ ] AGENTS.md defines the agent?
- [ ] Agent name spelled consistently (case-sensitive)?

## Step 2: Verify Triggers
- [ ] "MUST BE USED when:" section exists?
- [ ] Triggers cover 3+ realistic scenarios?
- [ ] Triggers are specific (not "when working on X")?
- [ ] Triggers match user's language/intent?

## Step 3: Verify Scope
- [ ] Agent scope doesn't overlap with 2+ other agents?
- [ ] Delegation rules clear if overlaps exist?
- [ ] Agent name intuitive for the task?

## Step 4: Verify Context
- [ ] Total AGENTS.md + CLAUDE.md <30KB?
- [ ] If >30KB, split into role-specific files?
- [ ] Reference external docs instead of inlining?

## Step 5: Test
- [ ] Ask Claude: "List all agents you can invoke"
- [ ] Verify your agent appears in the list
- [ ] Try a task matching your "MUST BE USED when:" trigger
- [ ] If still not invoked, simplify trigger language
```

---

## CLAUDE.md Not Importing AGENTS.md

### Problem

You've created `AGENTS.md` in your repo, but Claude doesn't seem to load it. Commands like `@AGENTS.md` don't work, or agents aren't recognized.

**Symptoms**:
- "I don't recognize that agent" errors
- `@AGENTS.md` appears in CLAUDE.md but agents still not available
- Claude says "AGENTS.md doesn't exist"
- Agent definitions ignored

### Root Causes & Solutions

#### **Cause 1: AGENTS.md Not in Expected Location**

**Expected Locations** (in order of precedence):
1. Same directory as CLAUDE.md: `/path/to/project/AGENTS.md`
2. Project root: `/path/to/project/AGENTS.md`
3. Hidden Claude directory: `/path/to/project/.claude/AGENTS.md`

**Diagnosis**:
```bash
# Check where your CLAUDE.md is:
find /path/to/project -name "CLAUDE.md" -type f

# Check if AGENTS.md exists next to it:
ls -la $(dirname $(find /path/to/project -name "CLAUDE.md" -type f))

# Both files should be in the same directory
```

**Solution**: Place `AGENTS.md` in the same directory as `CLAUDE.md`:

```bash
# If CLAUDE.md is at project root:
cp AGENTS.md .  # AGENTS.md now at /path/to/AGENTS.md

# If CLAUDE.md is in a subdirectory:
cp AGENTS.md /path/to/CLAUDE.md/  # Same dir as CLAUDE.md
```

---

#### **Cause 2: Incorrect @-Import Syntax**

**Issue**: The `@AGENTS.md` syntax is wrong or incomplete.

**Examples of Incorrect Syntax**:
```markdown
# ❌ Wrong
CLAUDE.md:
import AGENTS.md
@agents.md (lowercase, no .md)
agents  (missing extension)
/AGENTS.md (wrong path)

# ✅ Correct
CLAUDE.md:
@AGENTS.md
```

**Rule**:
- Use `@FILENAME.md` (case-sensitive, include .md extension)
- File must exist relative to CLAUDE.md's location
- Must be on its own line or at the start of CLAUDE.md

**Solution**:

```markdown
# /path/to/CLAUDE.md

@AGENTS.md

# Rest of your CLAUDE.md content below...
```

**Verify**:
```bash
# Check CLAUDE.md first lines:
head -10 CLAUDE.md
# Should show:
# @AGENTS.md
# (possibly with a blank line after)
```

---

#### **Cause 3: AGENTS.md Is Malformed or Missing Content**

**Issue**: AGENTS.md exists but has syntax errors, or contains no agent definitions.

**Examples of Malformed AGENTS.md**:
```markdown
# ❌ Empty file
(no content)

# ❌ Missing agent structure
# AGENTS.md
Some random notes

# ❌ Incorrect heading level
## agents (should be # or ## for top-level agents)
Agent: my-agent

# ❌ Incomplete agent definition (no "When to Invoke")
## my-agent
**Role**: ...
(missing MUST BE USED when: section)
```

**Solution**: Ensure AGENTS.md follows this structure:

```markdown
# /path/to/AGENTS.md

# [Agent Name]

## Role
[2-3 sentence description of expertise]

## When to Invoke
MUST BE USED when:
- [Trigger 1]
- [Trigger 2]
- [Trigger 3]

## Capabilities
- [Capability 1]
- [Capability 2]

## Context Required
- @AGENTS.md
- [Project-specific context if needed]

## Deliverables
Creates/modifies:
- [File paths with descriptions]

## Examples
[Code example or usage scenario]

## Quality Gates
[Validation criteria and blocking conditions]
```

**Verify**:
```bash
# Check AGENTS.md has content:
wc -l AGENTS.md  # Should be >50 lines if well-defined
grep -c "MUST BE USED when:" AGENTS.md  # Should be >0
```

---

#### **Cause 4: Circular or Nested @-Imports**

**Issue**: `AGENTS.md` tries to import another file, or two files try to import each other.

**Example of Problem**:
```markdown
# CLAUDE.md
@AGENTS.md

# AGENTS.md
@SHARED.md

# SHARED.md
@AGENTS.md  (❌ Circular!)
```

**Solution**: Avoid nested imports. Use a flat structure:

```markdown
# Flat structure (preferred)
CLAUDE.md
  @AGENTS.md
  @PROJECT_CONTEXT.md

AGENTS.md (no imports)
PROJECT_CONTEXT.md (no imports)

# ❌ Avoid nesting
CLAUDE.md
  @AGENTS.md
    AGENTS.md
      @SHARED.md
        SHARED.md
          @AGENTS.md (circular!)
```

**If you need shared content**:
- Use comments instead of imports:
  ```markdown
  # AGENTS.md
  # See also: /enablement-templates/agents/seo-specialist.md for reference
  ```
- Keep all agent definitions in a single AGENTS.md file
- Reference external docs (enablement-templates) instead of importing

---

#### **Cause 5: File Encoding or Line Ending Issues**

**Issue**: AGENTS.md is encoded in a non-UTF-8 format or uses Windows line endings.

**Diagnosis**:
```bash
# Check file encoding:
file AGENTS.md
# Expected: "UTF-8 Unicode text"

# Check line endings:
file -b AGENTS.md | grep -i crlf
# If output shows CRLF, convert to LF
```

**Solution**:
```bash
# Convert to UTF-8:
iconv -f ISO-8859-1 -t UTF-8 AGENTS.md > AGENTS.md.tmp
mv AGENTS.md.tmp AGENTS.md

# Convert CRLF to LF:
dos2unix AGENTS.md
# OR
sed -i 's/\r$//' AGENTS.md
```

---

### Debugging Checklist

```markdown
# CLAUDE.md Import Troubleshooting

## Step 1: File Existence
- [ ] AGENTS.md exists in same directory as CLAUDE.md?
- [ ] `ls -la AGENTS.md` returns file size >0?
- [ ] File is readable: `cat AGENTS.md` works?

## Step 2: Import Syntax
- [ ] CLAUDE.md starts with `@AGENTS.md` (exactly)?
- [ ] No typos or case mismatches?
- [ ] File extension .md included?

## Step 3: File Content
- [ ] AGENTS.md has >50 lines?
- [ ] Contains "MUST BE USED when:" sections?
- [ ] Agent names are clear and specific?

## Step 4: Encoding & Format
- [ ] File encoding is UTF-8: `file AGENTS.md`?
- [ ] Line endings are LF (not CRLF): `file -b AGENTS.md`?

## Step 5: Circular Imports
- [ ] AGENTS.md doesn't import other files?
- [ ] No @-directives in AGENTS.md?

## Step 6: Verify with Claude
Ask Claude:
- "What agents can you see in AGENTS.md?"
- "Can you invoke [agent-name]?"
- Should list your agents
```

---

## Agent Trigger Conditions Too Vague or Too Specific

### Problem

Your agent's "When to Invoke" triggers are either:
- **Too vague**: Claude unsure if task matches ("when working on X")
- **Too specific**: Claude won't generalize to similar tasks ("only for page Y")

**Result**: Agent invoked unpredictably or not at all.

### Root Causes & Solutions

#### **Cause 1: Using Subjective Language**

**Too Vague**:
```markdown
# ❌ Unclear
MUST BE USED when:
- Working on frontend features
- Making improvements to the UI
- Optimizing the website
```

Claude can't distinguish these from other tasks. "Frontend features" could mean API routes, unit tests, styling, or components.

**Too Specific**:
```markdown
# ❌ Overly narrow
MUST BE USED when:
- Adding meta tags to /pages/index.astro on the homepage
- Modifying the header component in Header.astro
```

Limits agent to 1-2 scenarios. Similar tasks (other pages, similar components) won't trigger it.

**Solution**: Use objective, measurable triggers:

```markdown
# ✅ Good specificity
MUST BE USED when:
- Adding or modifying any .astro file in /src/pages/
- Creating new React components in /src/components/
- Implementing multi-locale routing (en, es, fr, uk, no)
- Modifying CSS or Tailwind classes in UI files
- Working with SSR or static site generation
```

**Checklist for Good Triggers**:
- [ ] Each trigger mentions a **concrete file path** or **file type** (`.astro`, `/src/pages/`, `.tsx`)
- [ ] Triggers specify **what you're doing** (adding, modifying, creating) not just "working on"
- [ ] Triggers mention **output or deliverable** (components, pages, routes, styles)
- [ ] At least 1 trigger applies to >50% of realistic tasks in agent's domain
- [ ] Triggers avoid adverbs: "improving", "optimizing", "best practices"

---

#### **Cause 2: Mixing Technical Implementation with Business Intent**

**Issue**: Mixing "how to do it" (implementation) with "when to do it" (triggers).

**Examples of Confusion**:
```markdown
# ❌ Mixing implementation with trigger
MUST BE USED when:
- Using React hooks for state management
- Using TypeScript for type safety
- Building with Vite

# ✅ Separate triggers from implementation details
MUST BE USED when:
- Creating or modifying React components in /src/components/
- Adding state management to features
- Implementing type-safe API integrations

Implementation details (React hooks, TypeScript, Vite) are HOW the agent works, not WHEN to invoke it.
```

**Solution**: Focus triggers on **what the user is trying to accomplish**, not the tools:

```markdown
MUST BE USED when:
- [User goal: "Adding X to the system"]
- [User goal: "Building feature Y"]
- [User goal: "Fixing bug Z"]

NOT when:
- [Tool choice: "Using framework F"]
- [Implementation approach: "With pattern P"]
```

---

#### **Cause 3: Agent Scope Creep (Too Many Triggers)**

**Issue**: Agent claims to handle "everything SEO-related", but that's too broad:

```markdown
# ❌ Too broad
MUST BE USED when:
- Adding meta tags
- Optimizing Core Web Vitals
- Setting up SSL certificates
- Configuring CDN
- Improving server response time
- Implementing caching strategies
- Tuning database queries
```

This is 3 agents' worth of work (SEO + performance + DevOps). Claude gets confused about which agent to invoke.

**Solution**: Narrow scope to a clear domain. Split if needed:

```markdown
# ✅ seo-specialist scope (tight)
MUST BE USED when:
- Adding or modifying meta tags (title, description, OG)
- Implementing hreflang for multi-locale sites
- Creating or modifying XML sitemaps
- Adding structured data (JSON-LD schema)
- Setting up robots.txt
- Implementing canonical URLs

# ✅ performance-specialist scope (different agent, doesn't overlap)
MUST BE USED when:
- Optimizing Core Web Vitals (LCP, FID, CLS)
- Reducing bundle size or code-splitting
- Implementing caching strategies
- Optimizing images, fonts, or assets
```

**Rule of Thumb**: If an agent has >8 triggers, it's probably too broad. Consider splitting:
- seo-specialist: SEO metadata only
- performance-engineer: Performance optimization
- accessibility-engineer: A11y compliance
- content-specialist: Copywriting and content

---

#### **Cause 4: Overlapping Triggers with Other Agents**

**Issue**: Two agents claim the same task, and Claude picks one (or neither).

**Example**:
```markdown
# Agent A: react-specialist
MUST BE USED when:
- Creating or modifying React components

# Agent B: component-performance-specialist
MUST BE USED when:
- Optimizing React component rendering
- Memoizing expensive calculations

User task: "Optimize the ProductList component rendering"
Result: Both agents claim it, Claude picks one randomly or invokes neither.
```

**Solution**: Define clear ownership and sequence in lead agent:

```markdown
# In Tech Lead's AGENTS.md:

## Agent Coordination & Delegation

**react-specialist**: Implements components (structure, logic, rendering)
- Handles: Creating components, adding state, event handlers
- MUST delegate to performance-specialist if optimization needed

**component-performance-specialist**: Optimizes existing components
- Handles: Memoization, reducing re-renders, profiling
- Invoked AFTER react-specialist completes implementation

## Trigger Clarification:
- **Use react-specialist for**: "Build a new ProductList component"
- **Use component-performance-specialist for**: "The ProductList is re-rendering too often"
- **Use BOTH (in sequence) for**: "Build a high-performance ProductList that handles 10K+ items"

## When triggers overlap:
1. User specifies optimization explicitly → component-performance-specialist
2. User specifies creation → react-specialist
3. User specifies both → react-specialist first, then hand-off to component-performance-specialist
```

**Solution Pattern**:
1. **Each agent owns a clear slice**: Creation vs. Optimization, Frontend vs. Backend, API vs. UI
2. **Lead agent defines handoff**: "After react-specialist completes, invoke performance-specialist"
3. **Triggers mention the context**: "If performance is a concern, use specialist B"

---

#### **Cause 5: Triggers Don't Cover Realistic Scenarios**

**Issue**: Your triggers cover edge cases but miss common tasks.

**Example**:
```markdown
# ❌ Misses 80% of real work
MUST BE USED when:
- Refactoring a React component to use hooks
- Converting a class component to functional

# Real work the agent does:
- Adding new components (90% of work)
- Modifying existing components (9% of work)
- Refactoring (1% of work)
```

Claude only knows about the 1% case and rarely invokes the agent.

**Solution**: Lead with the most common cases:

```markdown
# ✅ Covers realistic workload distribution
MUST BE USED when:
- Creating new React components in /src/components/ (most common)
- Modifying existing components to add features
- Fixing component-related bugs
- Refactoring components for hooks or optimization (less common)
```

**Process**:
1. Log 10 recent tasks in this agent's domain
2. Categorize by frequency (very common, common, rare)
3. List triggers in **frequency order** (most common first)
4. Aim for top 3 triggers covering 80% of tasks

---

### Trigger Quality Rubric

Use this checklist to evaluate your triggers:

```markdown
# Trigger Quality Evaluation

Agent: ________________

For each trigger:
- [ ] Mentions a concrete file path or file type?
- [ ] Is objective and measurable (not "improving" or "optimizing")?
- [ ] Specifies what you're doing (add/modify/create/fix) not how?
- [ ] Doesn't overlap with 2+ other agents' triggers?
- [ ] Covers a realistic, common scenario (not edge cases)?
- [ ] Distinguishes from other agents in the team?

Total triggers: ___
- [ ] 3-8 triggers (good range)
- [ ] If <3: Too narrow, expand scope slightly
- [ ] If >8: Too broad, split into 2 agents

Top 3 triggers cover ~80% of real work?
- [ ] Yes: Good
- [ ] No: Reorder or refocus

Triggers use objective language?
- [ ] Yes: "Add meta tags to /src/pages/" ✅
- [ ] No: "Improve SEO on pages" ❌
```

---

## Circular Dependencies Between Agents

### Problem

Two or more agents depend on each other, creating a deadlock. Neither can complete work without the other.

**Symptoms**:
- Agent A waits for Agent B; Agent B waits for Agent A
- Merge blocked on circular task assignment
- Agents unable to make progress
- "I'm blocked waiting for Agent X" in multiple agents

**Examples**:

```markdown
# ❌ Circular Dependency Example 1
Agent A (Backend Lead):
"Wait for Agent B (Frontend) to define API schema in OpenAPI"

Agent B (Frontend Lead):
"Wait for Agent A (Backend) to implement the API endpoints"
Result: Neither starts.

# ❌ Circular Dependency Example 2
Agent A (Data Quality):
"Add Great Expectations suite for table X"
Depends on: dbt model in Agent B

Agent B (Semantic Layer):
"Add dbt model for X"
Depends on: Data Quality acceptance criteria from Agent A
Result: Blocked mutual wait.
```

### Root Causes & Solutions

#### **Cause 1: Backwards Dependencies (Follower Depends on Work)**

**Issue**: A dependent agent waits for prerequisite work that depends on their output.

**Example**:
```
Frontend Lead: "I'll build the UI once Backend specifies the API contract"
Backend Lead: "I'll write the API once Frontend specifies what fields they need"
```

**Solution**: Break the cycle by identifying the **upstream** work (should be done first):

```markdown
# ✅ Correct Dependency Flow

**Upstream (done first)**: Backend API Contract
- Backend Lead creates OpenAPI schema based on requirements
- Does NOT require Frontend's input yet

**Downstream (depends on upstream)**: Frontend UI
- Frontend Lead implements UI using Backend's OpenAPI schema
- Inputs to Backend later if contract needs adjustment
```

**Decision Rule**:
1. Ask: "Which work is prerequisite?" (usually requirements, schema, contracts)
2. Start with the upstream work
3. Downstream work depends on upstream, not vice versa

**In AGENTS.md**:
```markdown
# Tech Lead Orchestration

## Phase 1: Backend Contract (Upstream)
1. backend-lead: Write OpenAPI schema for reporting API
   - Input: Reporting requirements (from requirements doc)
   - Output: /specs/reporting-api.openapi.yaml
   - Does NOT wait for frontend-lead

## Phase 2: Frontend Implementation (Downstream)
1. frontend-lead: Build reporting UI
   - Input: /specs/reporting-api.openapi.yaml (from Phase 1)
   - Output: /src/pages/reports.tsx
   - Can provide feedback to backend-lead for iterations
```

---

#### **Cause 2: Missing Intermediate Artifact (No Shared Contract)**

**Issue**: Agents don't have a shared deliverable to coordinate around.

**Example**:
```
Agent A (GE Quality):
"I need the dbt model definition before writing tests"

Agent B (dbt Semantic Layer):
"I need the quality requirements before designing the model"

Result: No shared artifact; both blocked.
```

**Solution**: Create an **intermediate contract/spec** that both agents can work from:

```markdown
# ✅ Shared Artifact Pattern

## Phase 0: Requirements Specification (Tech Lead)
Creates: `/specs/dataset-requirements.yaml`
Defines:
- Dataset name, columns, types, constraints
- Data quality SLAs (freshness, null %, uniqueness)
- Example rows

## Phase 1: dbt Modeling (Agent B - Semantic Layer)
Input: `/specs/dataset-requirements.yaml`
Output: `/analytics/dbt/models/marts/my_dataset.sql`
Does NOT wait for Agent A's tests

## Phase 2: Data Quality Tests (Agent A - Quality)
Input: `/specs/dataset-requirements.yaml` AND `/analytics/dbt/models/marts/my_dataset.sql`
Output: `/specs/great-expectations/my_dataset_suite.json`
Tests the dbt model against requirements
```

**Shared Artifacts Pattern**:
```
Tech Lead (Orchestrator)
  ↓
  Creates: /specs/dataset-requirements.yaml (contract)
  ↓
  Agent B (dbt)              Agent A (Quality Tests)
  Reads: /specs/...          Reads: /specs/...
  Writes: /models/           Writes: /suites/
  (Independent work)         (Independent work)
```

**Key**: Both agents read the same spec. They work in parallel, not in a circle.

---

#### **Cause 3: Unclear Handoff Points or Approval Gates**

**Issue**: Agent A completes work but Agent B doesn't know it's ready. Agent A waits for feedback from Agent B, but Agent B doesn't know Agent A expects input.

**Example**:
```
Agent A (Frontend): "I've built the search UI, waiting for Agent B to wire it up"
Agent B (Backend): "I'm waiting for Agent A to finalize the search input shape"
```

**Solution**: Define explicit **handoff gates and sign-offs**:

```markdown
# ✅ Clear Handoff Pattern

## Handoff Point 1: Frontend → Backend
**Deliverable**: /src/components/SearchInput.tsx
**Acceptance Criteria**:
- [ ] Component renders (mock data)
- [ ] onChange callback fires with user input
- [ ] Documentation specifies shape of input (e.g., { query: string, filters: [] })

**Approval**: Frontend Lead marks PR as "ready for backend integration"
**Next**: Backend Lead implements `/api/search` using input shape

## Handoff Point 2: Backend → Frontend
**Deliverable**: /api/search endpoint
**Acceptance Criteria**:
- [ ] Returns { results: [], count: number }
- [ ] Documented in OpenAPI schema
- [ ] Example response provided

**Approval**: Backend Lead marks PR as "ready for UI integration"
**Next**: Frontend Lead wires SearchInput.onChange to /api/search

## Status in AGENTS.md
Frontend: "Blocked: Waiting for Backend"
Backend: "In Progress"
Frontend: "Unblocked" (after backend PR merges)
```

**Handoff Checklist**:
```markdown
# For each handoff between agents:

1. **Clear Deliverable**
   - [ ] Output file path specified
   - [ ] Content/shape documented
   - [ ] Example provided if applicable

2. **Acceptance Criteria**
   - [ ] Checklist of 3-5 specific criteria
   - [ ] Criteria must be verifiable (not "looks good")

3. **Approval Authority**
   - [ ] Who signs off? (upstream agent, tech lead)
   - [ ] How? (PR comment, checklist completion, explicit statement)

4. **Timeline**
   - [ ] When does downstream agent expect deliverable?
   - [ ] What does downstream agent work on while waiting?

5. **Feedback Loop**
   - [ ] Can downstream agent request changes?
   - [ ] How are conflicts resolved?
```

---

#### **Cause 4: Ambiguous Ownership (Who Owns What?)**

**Issue**: Multiple agents think they own the same deliverable, creating a merge conflict and mutual blocking.

**Example**:
```
Agent A (Database): "I'll create the users table schema"
Agent B (Data Quality): "I'll create the users table and its validation rules"

Result: Both implement the users table differently, conflict at merge time.
```

**Solution**: Define ownership clearly in AGENTS.md:

```markdown
# ✅ Clear Ownership

## Database Schema (Owned by: database-schema-agent)
Creates/owns: PostgreSQL schemas, migrations, indexes
- /migrations/001_create_users_table.sql
- /migrations/002_add_audit_columns.sql
Does NOT own: validation rules, test suites

## Data Quality Tests (Owned by: dq-quality-agent)
Creates/owns: Great Expectations suites, test definitions
- /specs/great-expectations/users_suite.yaml
Depends on: /migrations/ (from database-schema-agent)
Does NOT own: database structure (that's database-schema-agent's job)

## No Overlap Rule
- database-schema-agent creates table
- dq-quality-agent writes tests for the table
- Both complete independently; dq-quality-agent runs tests against the finished table
```

**Ownership Decision Tree**:
```
Who owns X?

If X is infrastructure/schema:
  → Database/DevOps agent owns it

If X is logic/business rules:
  → Business logic agent owns it

If X is validation/quality:
  → QA/Data Quality agent owns it

If X affects multiple teams:
  → Tech Lead clarifies ownership before work starts
```

---

#### **Cause 5: Missing Synchronization Point**

**Issue**: Agents work in parallel but don't coordinate at critical points, causing rework.

**Example**:
```
Agent A (Frontend): Implements SearchUI, assumes API returns { results: { items: [] } }
Agent B (Backend): Implements search API, returns { data: { results: [] } }
Result: Incompatible shapes, UI breaks, both agents rework code.
```

**Solution**: Add a **synchronization gate** before parallel work:

```markdown
# ✅ Sync Gate Pattern

## Gate 1: API Contract Definition (Tech Lead + Both Agents)
**Goal**: Agree on API shape before coding

Steps:
1. Tech Lead writes OpenAPI spec (skeleton)
2. Frontend Lead reviews, requests any shape changes
3. Backend Lead reviews, confirms implementability
4. **All three sign off** ✅

Result: /specs/search-api.openapi.yaml (frozen, both agents follow it)

## Gate 2: Component Integration (After parallel work)
Frontend and Backend PRs are independent, but both reference the same spec.
When merged, they work together without rework.
```

**Gate Checklist**:
```markdown
# For each sync gate:

- [ ] Who participates? (agents + tech lead)
- [ ] What's being synced? (API spec, schema, interface)
- [ ] When does it happen? (before parallel work)
- [ ] How is sign-off documented? (PR comment, AGENTS.md update)
- [ ] Can it be changed later? (yes, with re-sync)
```

---

### Circular Dependency Detection & Remediation

**Checklist to find circular dependencies**:

```markdown
# Circular Dependency Detection

## For each agent, ask:
1. What does this agent OUTPUT? (files, code, decisions)
2. What does this agent INPUT require? (files, decisions from others)

## Inputs & Outputs:
Agent A:
  Outputs: _______________
  Inputs: _______________

Agent B:
  Outputs: _______________
  Inputs: _______________

## Circularity Check:
- Does Agent A's input depend on Agent B's output?
- Does Agent B's input depend on Agent A's output?
- If YES for both: Circular dependency detected ⚠️

## Resolution:
1. Identify upstream (prerequisite) work
2. Identify downstream (dependent) work
3. Add shared artifact (spec, requirements) if missing
4. Define clear handoff gates
5. Update AGENTS.md with sequence and gating
```

---

## Tool Permission Issues

### Problem

Agents can't access the tools they need, or Claude restricts tool use unexpectedly.

**Symptoms**:
- "I don't have permission to access that tool"
- Tool invocation silently fails
- Agent can't read/write files it needs
- Bash commands time out or hang
- Agents keep asking "Do you want me to proceed?" (expecting tool access)

### Root Causes & Solutions

#### **Cause 1: Agent Spec Doesn't Declare Required Tools**

**Issue**: You didn't specify which tools an agent needs, so Claude assumes minimal tool access.

**Example**:
```markdown
# ❌ No tools declared
## seo-specialist

## Capabilities
- Add meta tags
- Create sitemaps

## When to Invoke
...

(No "Allowed Tools" section)

Result: Claude unsure if seo-specialist can use Bash or Edit tools.
```

**Solution**: Explicitly declare tools in agent spec:

```markdown
# ✅ Tools declared
## seo-specialist

## Allowed Tools
This agent uses:
- **Edit**: Modify Astro components, meta tag files
- **Read**: Inspect page files, site structure
- **Bash**: Generate XML sitemaps with sed/awk
- **Glob**: Find all .astro files in /src/pages/

This agent does NOT use:
- Database access
- External APIs
- Git operations (handled by tech lead)
```

**Tool Categories**:
```markdown
# Minimal Tools (for analysis agents)
- Read: Inspect files
- Glob: Search for files
- Grep: Search content

# Standard Tools (for development agents)
- Read, Edit, Write: File operations
- Bash: Build, test, linting commands
- Glob, Grep: Search

# Restricted Tools (only tech lead)
- Dangerous Bash: git push, rm -rf, force operations
- External APIs: Secrets, production systems
- Database: Direct schema changes without migrations
```

**Rule**: List tools explicitly. If you don't list it, Claude assumes you don't need it.

---

#### **Cause 2: Tool Access Requires Context or Secrets**

**Issue**: Tools work, but agent needs credentials, API keys, or environment setup.

**Example**:
```markdown
# ❌ Vague tool request
MUST BE USED when:
- Deploying to production

Allowed Tools:
- Bash
(But deployment requires AWS credentials, not declared)

Result: Agent invoked but Bash fails silently because no credentials.
```

**Solution**: Specify what setup is needed:

```markdown
# ✅ Tool requirements explicit
MUST BE USED when:
- Deploying to production

Allowed Tools:
- Bash (requires: AWS_PROFILE=teei-prod, Vault token in environment)

Prerequisites:
- [ ] AWS credentials configured: `aws sts get-caller-identity`
- [ ] Vault token available: `echo $VAULT_ADDR`
- [ ] Deployment script executable: `chmod +x /scripts/deploy.sh`

Note: Tech Lead responsible for credential injection via CI/CD.
```

**Common Setup Requirements**:
```markdown
# Database tools
- Requires: PostgreSQL client, connection string
- Check: `psql --version`

# Build/test tools
- Requires: Node.js, pnpm, dependencies installed
- Check: `pnpm -v`, `npm test` works

# Git operations
- Requires: Git credentials configured
- Check: `git config --list | grep user`

# Bash complex commands
- Requires: Required binaries installed
- Check: `which jq`, `which yq` (etc.)

# External API tools
- Requires: API keys, credentials
- Check: `env | grep API_KEY`
```

**Declare Prerequisites in AGENTS.md**:
```markdown
## Context Required
- @AGENTS.md
- **Environment**:
  - Node.js ≥20.x
  - pnpm installed
  - PostgreSQL client (psql)
- **Credentials** (injected by CI):
  - DATABASE_URL
  - VAULT_TOKEN (for secrets)
- **Tools**:
  - Bash (system commands)
  - Node.js scripts in /scripts/
```

---

#### **Cause 3: Tool Timeouts or Resource Exhaustion**

**Issue**: Tools fail due to timeouts, memory limits, or resource contention.

**Symptoms**:
- "Command timed out after 120 seconds"
- "Process killed due to memory limit"
- Bash commands hang indefinitely
- Glob/Grep operations slow on large codebase

**Solution 1: Optimize Bash Commands**

```markdown
# ❌ Slow (might timeout)
find /home/user/TEEI-CSR-Platform -type f -name "*.ts" | wc -l
(scans entire codebase)

# ✅ Fast (uses limits, targets scope)
find /home/user/TEEI-CSR-Platform/services/reporting -type f -name "*.ts" | wc -l
(scans specific service)

# ✅ Better (use specific tool)
glob "services/reporting/**/*.ts"
(Glob tool is optimized for this)
```

**Solution 2: Break Large Tasks into Smaller Ones**

```markdown
# ❌ One large task (might timeout)
Task: Refactor all 500 components in /src/components/

# ✅ Smaller, sequenced tasks
Task 1: Refactor components in /src/components/hooks/ (20 files)
Task 2: Refactor components in /src/components/widgets/ (50 files)
Task 3: Refactor components in /src/components/layouts/ (30 files)
(Each completes in <120 seconds)
```

**Solution 3: Specify Tool Timeout**

If you know a task takes longer, declare it:

```markdown
## Allowed Tools
- **Bash** (timeout: 300000ms): Long-running tests, builds
- **Bash** (timeout: 60000ms): Quick commands, git ops
- **Glob**: Pattern matching (default timeout: 120000ms)
```

**Declare in Agent Spec**:
```markdown
## Known Limitations
- E2E tests take ~3 minutes: runs with `timeout: 180000ms`
- Build process might take ~2 minutes: runs with `timeout: 120000ms`
- Glob on /services/ might be slow: uses specific patterns

## Recommendations
- Don't scan entire codebase with Glob; use specific paths
- Don't chain commands in Bash if >5 seconds each
- Break large operations into agent-batched work
```

---

#### **Cause 4: File Permissions or Write Access Issues**

**Issue**: Agent can read files but can't write, or vice versa.

**Example**:
```bash
# ❌ Agent can read but not write
ls -la file.ts  (success, readable)
echo "change" > file.ts  (permission denied)

# ❌ Agent runs as different user
whoami  (returns "app-runner")
cat /root/.ssh/id_rsa  (permission denied, file owned by root)
```

**Solution 1: Check File Permissions**

```bash
# List file with permissions:
ls -la /home/user/TEEI-CSR-Platform/file.ts

# Ensure readable and writable:
chmod 644 /home/user/TEEI-CSR-Platform/file.ts
chmod 755 /home/user/TEEI-CSR-Platform/  (directory must be executable)
```

**Solution 2: Declare Read-Only if Needed**

```markdown
## Allowed Tools
- **Read** (read-only): Inspect database schemas, configs
- **Edit** (read-write): Modify source files only in /src/

This agent does NOT:
- Write to /migrations/ (database team owns this)
- Modify /package.json directly (package manager handles this)
```

**Solution 3: Scope to Writable Directories**

```markdown
## Deliverables
Creates/modifies in:
- /src/components/ (agent writes here, full control)
- /src/pages/ (agent writes here, full control)

Does NOT write to:
- /node_modules/ (managed by package manager)
- /dist/ (managed by build system)
- /migrations/ (managed by database team)
```

---

#### **Cause 5: Tool Restrictions from Claude Code Settings**

**Issue**: Claude Code's configuration restricts certain tools globally.

**Example** (from .claude/config.json):
```json
{
  "restrictions": {
    "dangerousOperations": [
      "rm -rf",
      "git push --force",
      "DROP TABLE"
    ],
    "toolsAllowed": ["Read", "Edit", "Bash"],
    "toolsDenied": ["KillShell"]
  }
}
```

Claude won't let agents use KillShell even if they declare it.

**Solution 1: Review Claude Code Configuration**

```bash
# Check if .claude/config.json exists:
cat /home/user/TEEI-CSR-Platform/.claude/config.json

# If it exists, review restrictions section
# If it doesn't exist, no global restrictions
```

**Solution 2: Request Configuration Changes**

If restrictions are too tight, discuss with tech lead:
```markdown
# Request from agent:
"I need Bash access to run integration tests, but it's currently restricted.
Can we allow specific commands: `pnpm test:e2e`?"

# Tech lead review:
Review if restriction is necessary.
Update .claude/config.json if safe.
```

**Solution 3: Work Around Restrictions**

If a tool is restricted, find an alternative:
```markdown
# ❌ Restricted
Tool: Bash with `rm` (file deletion)

# ✅ Alternative
Use Edit tool to empty file content instead of deleting
Or request tech lead to move file to archive/ directory
```

---

### Tool Permission Debugging Checklist

```markdown
# Tool Permission Troubleshooting

Agent: ________________
Tool requested: ________________
Error: ________________

## Step 1: Check Agent Spec
- [ ] Agent declares tool in "Allowed Tools"?
- [ ] Tool declaration is explicit?

## Step 2: Check Prerequisites
- [ ] Required binaries installed? (java, python, node, etc.)
- [ ] Required environment variables set? (DATABASE_URL, etc.)
- [ ] Credentials available? (AWS, Vault, API keys)

## Step 3: Check File Permissions
- [ ] File readable: `ls -la <file>`?
- [ ] File writable: Can agent write to it?
- [ ] Directory traversable: Parent directory executable?

## Step 4: Check Resource Limits
- [ ] Command likely to finish <120 seconds?
- [ ] Memory usage <1GB?
- [ ] Timeout parameter specified if longer?

## Step 5: Check Claude Code Config
- [ ] `.claude/config.json` exists?
- [ ] If yes, does it restrict this tool?
- [ ] If restricted, is restriction necessary?

## Step 6: Test Independently
- [ ] Run tool directly (not through agent)
- [ ] Does it work? If yes, issue is agent context
- [ ] If no, issue is tool/environment setup

## Resolution
1. Update agent spec with correct tool declarations
2. Ensure prerequisites met (install, configure, inject credentials)
3. Fix file permissions (chmod, ownership)
4. Optimize command if slow (use scopes, break into tasks)
5. Update Claude Code config if needed
```

---

## Performance Issues with Many Agents

### Problem

Your system has 20+ agents. New agents are slow to invoke, response times degrade, or agents seem to miss their triggers.

**Symptoms**:
- Agent invocation is delayed (>10 seconds before Claude responds)
- Claude invokes wrong agent (picks one arbitrarily from 20+ options)
- Agents' "When to Invoke" triggers stop working reliably
- Token usage explodes (context window getting full)
- Build/response times slow down as more agents added

### Root Causes & Solutions

#### **Cause 1: Context Window Overflow (Too Much Agent Metadata)**

**Issue**: AGENTS.md has grown to 50+ KB. Entire file loaded into context for every interaction, leaving less room for actual work.

**Diagnosis**:
```bash
# Check AGENTS.md size:
wc -l AGENTS.md  # If >2000 lines, likely overflow
du -h AGENTS.md  # If >50KB, definitely overflow

# Check context usage:
# Each line ~ 4 tokens
# AGENTS.md size in tokens: (lines * 4) / 1024 = KB tokens
# Example: 2000 lines * 4 tokens = 8000 tokens = 50KB metadata alone
```

**Symptoms of overflow**:
- Token count showing large "context" usage
- Slow response times (model processing lots of metadata)
- Wrong agents invoked (model skimming agent specs, not reading carefully)

**Solution 1: Split AGENTS.md by Role**

Instead of one 2000-line AGENTS.md:
```markdown
# Structure
AGENTS-FRONTEND.md (500 lines, 6 agents)
AGENTS-BACKEND.md (500 lines, 7 agents)
AGENTS-DEVOPS.md (300 lines, 5 agents)

CLAUDE.md imports only needed roles:
@AGENTS-FRONTEND.md
@AGENTS-BACKEND.md
(not AGENTS-DEVOPS.md unless doing DevOps work)
```

**Benefits**:
- Frontend work loads only frontend agents (no DevOps metadata)
- Smaller context, faster responses
- Easier to find agents (less scrolling)

**Rule of Thumb**:
- <1000 lines (20-25 agents): Single AGENTS.md is fine
- 1000-2000 lines (25-40 agents): Split by role (frontend/backend/devops/qa)
- >2000 lines (40+ agents): Consider splitting further or consolidating

---

#### **Cause 2: Redundant or Overlapping Agent Definitions**

**Issue**: Multiple agents claim similar responsibilities, forcing Claude to choose between them.

**Example**:
```markdown
# ❌ Redundant agents
Agent A: react-component-specialist
Agent B: component-developer
Agent C: ui-builder

All three handle React component development. Claude confused about which to invoke.
```

**Solution**: Consolidate or clearly differentiate:

```markdown
# ✅ Option 1: Consolidate into one agent
react-component-specialist
  - Create new components
  - Modify existing components
  - Component optimization

# ✅ Option 2: Clear role differentiation
react-component-dev: Build and implement components
component-performance-specialist: Optimize component rendering, memoization
component-tester: Unit and integration tests for components
```

**Consolidation Checklist**:
```bash
# List all agents by domain:
grep "^# " AGENTS.md | sort

# For each domain, ask:
# - Do agents A and B overlap >50%?
# - Are there 3+ agents doing very similar work?
# - Can they be merged without losing specificity?
```

**Merge Criteria**:
- Merge if agents share 50%+ of "When to Invoke" triggers
- Merge if one agent is a subset of another's responsibilities
- Keep separate if they have clear, non-overlapping expertise (e.g., "Component Dev" vs. "Performance Tuning")

---

#### **Cause 3: Verbose or Overly-Detailed Agent Specs**

**Issue**: Each agent has 200+ lines of documentation, examples, and edge cases. Total becomes unwieldy.

**Example**:
```markdown
# ❌ Overly verbose
## seo-specialist

### Role
[5 paragraphs describing SEO expertise]

### When to Invoke
[10 detailed triggers]

### Capabilities
[20 detailed capabilities]

### Examples
[10 code examples, each 20 lines]

### Edge Cases
[15 edge cases with explanations]

Total: 250+ lines per agent, 50 agents = 12,500 lines

# ✅ Concise version
## seo-specialist

**Role**: Implements SEO metadata (meta tags, hreflang, structured data)

**MUST BE USED when**:
- Adding/modifying Astro pages in /src/pages/
- Implementing multi-locale routing
- Setting up robots.txt or sitemaps
- Adding structured data (JSON-LD)

**Capabilities**:
- Meta tag injection, hreflang generation, sitemap creation, JSON-LD schemas

**Examples**:
[1-2 key examples]

Total: 30 lines per agent, 50 agents = 1,500 lines
```

**Solution**: Use enablement-templates for detailed docs:

```markdown
# AGENTS.md (concise)
## seo-specialist

**Role**: Implements SEO metadata

**MUST BE USED when**:
- [Key triggers]

See full specification: /enablement-templates/agents/seo-specialist.md

# enablement-templates/agents/seo-specialist.md (verbose)
[Full documentation, examples, edge cases]

CLAUDE.md imports AGENTS.md (not enablement-templates).
enablement-templates stays out of context unless explicitly referenced.
```

**Conciseness Checklist**:
```markdown
Per agent in AGENTS.md:
- [ ] Role: 1 sentence max
- [ ] Triggers: 3-8 bullets max
- [ ] Capabilities: List format, 1 line each
- [ ] Examples: 1-2 max, ≤20 lines each
- [ ] Verbose docs: Link to enablement-templates
- [ ] Total per agent: <50 lines

Total AGENTS.md: <1000 lines
```

---

#### **Cause 4: Inefficient Trigger Matching**

**Issue**: Claude must read all agent triggers to find a match. With 50+ agents, this is expensive.

**Example**:
```markdown
# ❌ Inefficient (Claude reads all 50 agents)
Agent 1: "MUST BE USED when: Adding..., modifying..., fixing..., optimizing..."
Agent 2: "MUST BE USED when: Creating..., updating..., enhancing..., improving..."
...
Agent 50: "MUST BE USED when: ..."

User: "Fix the login flow"
Claude: Reads through all 50 agents, finds 5 possible matches, picks one.
```

**Solution**: Use a decision tree in lead agent specs:

```markdown
# ✅ Decision tree (efficient)

## Agent Selection Guide

**Ask**: What are you working on?

**If: Authentication / Login**
  └─ Ask: Are you building new features or fixing bugs?
     ├─ New features: auth-feature-specialist
     └─ Bugs: auth-qa-specialist

**If: Reporting / Analytics**
  └─ Ask: Are you implementing API, UI, or tests?
     ├─ API: reporting-api-engineer
     ├─ UI: reporting-ui-specialist
     └─ Tests: reporting-qa-engineer

**If: Data Quality**
  └─ Ask: Are you writing validation rules or debugging data issues?
     ├─ Rules: dq-rule-author
     └─ Debugging: dq-anomaly-hunter
```

**Benefits**:
- Claude narrows down to 2-3 agents, not 50
- Faster agent selection
- Less context needed (decision tree is small)

**Structure**:
```markdown
# Decision Tree Template

## Agent Selection Guide

[1 clarifying question about domain]
├─ Option A: [Agent A description]
├─ Option B: [Agent B description]
└─ Option C: [Agent C description]

[Optional 2nd question for sub-domain]
├─ Sub-option A1: [Agent A1]
└─ Sub-option A2: [Agent A2]
```

---

#### **Cause 5: Agents with Too-Broad Scope**

**Issue**: Each agent handles 5+ different responsibilities, taking up 100+ lines in AGENTS.md. Consolidation isn't possible; scope is just too large.

**Symptom**: Agent spec has 8+ "MUST BE USED when:" triggers covering diverse scenarios.

**Solution**: Create specialist sub-agents:

```markdown
# ❌ One oversized agent
Agent: reporting-lead
  Responsible for:
  - Reporting API (10 endpoints)
  - Reporting UI (5 pages)
  - Reporting export (PDF, PPTX, CSV)
  - Performance optimization
  - Data validation
  - Testing and QA
  Total: 200 lines

# ✅ Specialized sub-agents
reporting-lead (orchestrator)
  ├─ reporting-api-engineer: API implementation
  ├─ reporting-ui-specialist: UI/UX
  ├─ reporting-export-engineer: PDF/PPTX/CSV
  ├─ reporting-performance-engineer: Optimization
  ├─ reporting-qa-engineer: Testing
  Total: 80 lines (lead) + 40 lines each (5 specialists) = 280 lines, but clearer roles
```

**Split Decision**:
- If agent spec >100 lines: Consider splitting
- If agent has >6 "MUST BE USED when:" triggers: Likely too broad
- If you're asking "which agent should handle X?" often: Roles aren't clear enough

---

#### **Cause 6: Missing Performance Optimizations**

**Issue**: Agents exist, but Claude isn't using them efficiently.

**Solutions**:

**Solution 1: Cache Agent Metadata**

In CLAUDE.md, list agent names upfront:

```markdown
# Quick Agent Reference

Available agents (for quick lookup):
- seo-specialist: SEO metadata
- performance-specialist: Web performance
- a11y-specialist: Accessibility
... (full list)

For detailed specs, see AGENTS.md:
@AGENTS.md
```

This primes Claude to know the full agent list without reading AGENTS.md in detail.

**Solution 2: Use Agent Grouping Headers**

In AGENTS.md, group agents by role:

```markdown
# Frontend Agents (6 total)

## seo-specialist
...

## a11y-specialist
...

[Other frontend agents]

# Backend Agents (7 total)

## reporting-api-engineer
...

[Other backend agents]
```

Grouping makes it easier for Claude to navigate.

**Solution 3: Prioritize "Hot" Agents**

List frequently-used agents first:

```markdown
# AGENTS.md

# Hot Agents (most commonly invoked)
## react-component-specialist
## reporting-api-engineer
## test-automation-engineer

# Supporting Agents (specialized use)
## seo-specialist
## performance-specialist
```

Claude reads top-to-bottom and will find common agents first.

---

### Performance Optimization Checklist

```markdown
# Multi-Agent Performance Checklist

## Code Size Optimization
- [ ] AGENTS.md <1000 lines?
- [ ] Agent specs <50 lines each?
- [ ] Examples <20 lines each?
- [ ] No redundant agent definitions (A & B doing same work)?

## Context Efficiency
- [ ] CLAUDE.md + AGENTS.md total <50KB?
- [ ] Verbose docs in enablement-templates, not AGENTS.md?
- [ ] CLAUDE.md imports only needed AGENTS-*.md files?

## Trigger Clarity
- [ ] Each agent has 3-8 triggers (not 1, not 15)?
- [ ] Triggers are specific, not vague?
- [ ] No two agents have overlapping triggers?
- [ ] Lead agent has decision tree for agent selection?

## Agent Consolidation
- [ ] <50 total agents in system?
- [ ] If >40 agents, split by role (frontend/backend/devops)?
- [ ] No agent spec >100 lines (split if so)?

## Performance Tests
- [ ] Time agent selection: <5 seconds for Claude to pick agent?
- [ ] Monitor token usage: AGENTS.md shouldn't exceed 10% of context?
- [ ] Measure response time: Should not slow down significantly vs. single agent?

## Metrics to Track
- [ ] Average agent invocation time: Target <2 seconds
- [ ] Context tokens used by AGENTS.md: Target <10% of total
- [ ] Response time with N agents: Should scale sublinearly
```

---

## Debugging Agent Selection and Delegation

### Problem

Claude isn't delegating correctly: agents overlap, hand-offs fail, or wrong agents invoked for tasks.

**Symptoms**:
- Wrong agent invoked ("I expected Agent A, got Agent B")
- No agent invoked (task completed by general Claude, no specialist)
- Agent invokes wrong sub-agent (delegation failed)
- Agents don't hand-off work properly (one completes, other doesn't start)

### Root Causes & Solutions

#### **Cause 1: No Explicit Delegation Rules**

**Issue**: Agents don't know who they should delegate to, so they either do all the work or ask the user.

**Example**:
```markdown
# ❌ No delegation rules
Agent A (frontend-lead):
  Capabilities:
  - Build React components
  - Set up routing
  - Add styling
  - Optimize performance

(Agent A tries to do everything, never delegates)
```

**Solution**: Specify delegation rules upfront:

```markdown
# ✅ Explicit delegation
Agent A (frontend-lead):

  Owned capabilities:
  - Build React components
  - Set up routing
  - Add styling

  Delegates to:
  - performance-specialist: Core Web Vitals optimization (LCP, FID, CLS)
    Trigger: "If page load time >3 seconds"
  - a11y-specialist: WCAG compliance checking
    Trigger: "Before merge, run accessibility audit"
  - seo-specialist: Meta tags, structured data
    Trigger: "New public pages must have SEO metadata"

  Handoff points:
  1. After component implementation → performance-specialist (if needed)
  2. Before merge → a11y-specialist (always)
  3. Before merge → seo-specialist (if public page)
```

**Delegation Checklist**:
```markdown
# For each agent, specify:

- [ ] What this agent owns (core responsibilities)
- [ ] What this agent delegates (specialties only)
- [ ] To whom (specific agent names)
- [ ] When (trigger conditions)
- [ ] What's the handoff? (PR comment, explicit request, automated)
```

---

#### **Cause 2: Vague Delegation Criteria**

**Issue**: Agent knows it should delegate but criteria are unclear.

**Example**:
```markdown
# ❌ Vague criteria
Agent A (react-specialist):
  Delegates to performance-specialist when:
  - "Performance is important"
  - "Code should be optimized"
  - "If needed"

(Too subjective; agent unsure if threshold met)
```

**Solution**: Use measurable, specific criteria:

```markdown
# ✅ Specific criteria
Agent A (react-specialist):
  Delegates to performance-specialist when ANY of:
  - Component expected to render >100 items
  - Expected interactions >10 per second
  - Bundle size impact >50KB
  - Lighthouse score <70 (if testable)

  Does NOT delegate when:
  - Component renders <50 items
  - Simple, single-purpose component
  - Performance already within SLA

Example:
  Task: "Create a ProductList component with 10,000 items"
  → Threshold met (>100 items)
  → Invoke performance-specialist after implementation
```

**Criteria Types**:
```markdown
# Measurable criteria (good for automation)
- If file size >X KB → delegate
- If execution time >Y ms → delegate
- If item count >Z → delegate
- If test coverage <P% → delegate

# Subjective criteria (less reliable, better to be specific)
- If "user experience critical" → Be specific: Which users? How critical?
- If "performance matters" → Define: Lighthouse score threshold?

# Rule-based criteria (clearest)
- IF component handles arrays THEN invoke performance-specialist
- IF page is public-facing THEN invoke seo-specialist
- IF accessibility concerns exist THEN invoke a11y-specialist
```

---

#### **Cause 3: No Handoff Mechanism**

**Issue**: Agent knows it should delegate but doesn't know HOW.

**Example**:
```markdown
Agent A (test-automation-engineer):
  Should delegate to QA-lead for merge review

  BUT: How? Email? PR comment? Just stop and wait?

Result: Agent stops mid-task; user confused about next steps.
```

**Solution**: Define explicit handoff mechanisms:

```markdown
# ✅ Clear handoff
Agent A (test-automation-engineer):
  Handoff to QA-lead:

  Mechanism 1 (Synchronous): PR comment
    - Agent writes: "@qa-lead please review test suite for [component]"
    - QA-lead responds with approval
    - Agent continues to merge

  Mechanism 2 (Asynchronous): Checklist in PR description
    - Agent adds "[ ] QA sign-off required"
    - PR waits for QA-lead to check box
    - CI gate blocks merge until checked

  Mechanism 3 (Automatic): Escalation to tech lead
    - Agent marks work as "ready for QA"
    - Tech lead assigns QA-lead automatically
```

**Handoff Patterns**:
```markdown
# Pattern 1: PR Comment Mention
Agent A writes:
  "@agent-b please optimize the rendering for this component"

Agent B (invoked via mention):
  Sees task, implements optimization, @-mentions Agent A back

# Pattern 2: Explicit Blocklist
AGENTS.md:
  test-automation-engineer:
    "Blocked until qa-lead approves"

# Pattern 3: Sequential in Orchestration
Tech lead in AGENTS.md:
  Phase 1: test-automation-engineer (writes tests)
  Phase 2: qa-lead (reviews and approves)
  (Sequential, automatic delegation)

# Pattern 4: Token in PR
Agent A:
  Adds comment: "QA_REVIEW_REQUIRED=true"
  Claude/system recognizes token, triggers qa-lead
```

---

#### **Cause 4: Overlapping Agent Responsibilities**

**Issue**: Multiple agents could handle the same subtask, creating ambiguity.

**Example**:
```markdown
Agent A (testing-specialist):
  MUST BE USED when:
  - Writing unit tests
  - Writing integration tests
  - Setting up test fixtures

Agent B (test-automation-engineer):
  MUST BE USED when:
  - Automating test runs
  - Setting up CI pipeline for tests
  - Running tests in CI/CD

User task: "Set up test fixtures and integrate them into CI"
Confusion: Does Agent A or Agent B own "test fixtures"?
```

**Solution**: Define clear ownership boundaries:

```markdown
# ✅ Clear ownership

Agent A (testing-specialist):
  Owns: Test authoring (unit, integration, fixtures)
  Does: Write tests, define test data, structure test suites
  Invoked for: "Write tests for login flow"

Agent B (test-automation-engineer):
  Owns: Test infrastructure and automation
  Does: CI/CD setup, test runners, result reporting
  Invoked for: "Set up CI/CD to run tests automatically"
  Invoked for: "Add tests to CI pipeline"

Collaboration:
  User: "Write tests and integrate into CI"
  → testing-specialist writes tests (Agent A)
  → Hands off to test-automation-engineer (Agent B)
  → Agent B integrates tests into CI

Ownership Matrix:
                    | Test Auth | CI/CD Setup |
  testing-specialist |    ✓      |      X      |
  test-automation... |    X      |      ✓      |
```

**Boundary Definition**:
```markdown
# For each agent pair, define:

Agent A owns:
- [X responsibility]
- [Y responsibility]

Agent B owns:
- [Z responsibility]

Overlap handling:
- If both could do it: Who does it first?
- Can Agent A do Agent B's part? When?
- How do they hand off?

Example:
  Frontend + Performance agents both care about bundle size.
  Frontend: Initial optimization (code splitting, lazy loading)
  Performance: Deep optimization (profiling, Advanced caching)
  Handoff: Frontend completes, Performance takes over if needed
```

---

#### **Cause 5: No Feedback Loop or Status Tracking**

**Issue**: Agents don't know if delegated work succeeded or failed.

**Example**:
```markdown
Agent A (design-specialist):
  Implements design
  Delegates to frontend-specialist: "Implement this design"

  Then what? Did frontend succeed? Need changes?
  Agent A doesn't know, can't iterate.
```

**Solution**: Add feedback mechanism:

```markdown
# ✅ Feedback loop

Agent A (design-specialist):
  1. Implements design
  2. Delegates to frontend-specialist with acceptance criteria:
     "Implement this design. Acceptance criteria:
      - [ ] Visual matches mockup
      - [ ] Responsive on mobile/desktop
      - [ ] Meets accessibility standards"

  3. Waits for frontend-specialist feedback

  4. Feedback received:
     - If all criteria met: Done
     - If criteria not met: Iterate with frontend-specialist

  5. Approval: Design-lead signs off

Feedback channels:
  - PR review comments (async)
  - @-mentions (async with notification)
  - Meeting/sync (sync, real-time)
  - Checklist in PR (visual, blocking)
```

**Feedback Checklist**:
```markdown
# For each delegation:

- [ ] Clear acceptance criteria defined?
- [ ] Feedback channel specified (PR comment, @-mention, meeting)?
- [ ] Who approves when done?
- [ ] What if criteria not met? (rework, escalate, compromise)
- [ ] Timeline: How long before feedback expected?
```

---

#### **Cause 6: Agent Stops Mid-Task (Doesn't Complete)**

**Issue**: Agent starts work, delegates to another agent, but doesn't follow up. Task hangs.

**Example**:
```markdown
Agent A (frontend-specialist):
  Implements component
  Delegates to performance-specialist: "Optimize this"

  Agent A's response ends. Doesn't wait for performance-specialist.

Result:
  - Component implemented but not optimized
  - Performance-specialist never invoked (Agent A didn't follow up)
  - Task incomplete
```

**Solution**: Specify whether delegation is blocking or non-blocking:

```markdown
# ✅ Blocking delegation (Agent A waits)
Agent A (frontend-specialist):
  Implements component
  BLOCKS on: performance-specialist optimization

  Flow:
  1. Frontend implements
  2. Calls performance-specialist (blocking)
  3. Waits for optimization to complete
  4. Verifies: "Performance acceptable, merging"

# ✅ Non-blocking delegation (Agent A completes, delegates for follow-up)
Agent A (frontend-specialist):
  Implements component
  DELEGATES (non-blocking) to: a11y-specialist for accessibility audit

  Agent A's response:
    "Component implemented. For accessibility audit, see @a11y-specialist"

  Next steps:
    a11y-specialist runs audit independently
    Reports findings in PR comment
```

**Specification**:
```markdown
# In AGENTS.md, specify:

For each delegation:
  - [ ] Blocking or non-blocking?
  - [ ] If blocking: Agent waits for result before completing
  - [ ] If non-blocking: Agent marks as "ready for follow-up", delegates
  - [ ] Who is responsible for next step?
  - [ ] Timeline: When should delegated work be done?

Example - Blocking:
  "After implementation, MUST optimize with performance-specialist
   before marking complete."

Example - Non-blocking:
  "After implementation, suggest a11y-specialist review.
   Not blocking on approval, can merge if no critical issues."
```

---

### Agent Selection & Delegation Debugging Checklist

```markdown
# Agent Selection and Delegation Troubleshooting

## Issue: Wrong Agent Invoked

Scenario: User task, expected agent, actual agent invoked
- [ ] Check agent naming: Is name intuitive for task?
- [ ] Check triggers: Do expected agent's triggers cover this task?
- [ ] Check overlap: Do 2+ agents claim this task?
- [ ] Solution: Narrow triggers, clarify naming, or add decision tree

## Issue: Agent Doesn't Delegate

Scenario: Agent should hand off to another but doesn't
- [ ] Check AGENTS.md: Is delegation rule defined?
- [ ] Check specificity: Is delegation criteria measurable?
- [ ] Check mechanism: Is handoff method specified (PR comment, mention)?
- [ ] Solution: Add explicit delegation rule with specific criteria and mechanism

## Issue: Delegation Fails

Scenario: Agent delegates, but delegated agent doesn't start
- [ ] Check mentions: Did primary agent @-mention secondary agent?
- [ ] Check triggering: Does secondary agent have explicit "When to Invoke"?
- [ ] Check context: Is secondary agent in AGENTS.md or CLAUDE.md?
- [ ] Solution: Use @-mentions, ensure agent is discoverable

## Issue: Circular Delegation

Scenario: Agent A delegates to B, B delegates back to A
- [ ] Check ownership: Who owns each piece of work?
- [ ] Check sequence: Should there be a strict order?
- [ ] Solution: Define upstream/downstream work; create intermediate artifacts

## Issue: Unclear Handoff

Scenario: Agent completes, but next agent doesn't know to start
- [ ] Check acceptance criteria: Is it clear when handoff should happen?
- [ ] Check notification: Did first agent explicitly request second agent?
- [ ] Check blocking: Is handoff blocking (must wait) or non-blocking (suggest)?
- [ ] Solution: Add explicit handoff point, notification, and acceptance criteria

## Issue: Agent Scope Too Large

Scenario: Agent owns too many responsibilities, slow/confused responses
- [ ] Check triggers: Does agent have >8 triggers?
- [ ] Check responsibilities: Can work be split 2-3 ways?
- [ ] Check specialization: Are sub-agents needed?
- [ ] Solution: Split into specialized sub-agents with clear ownership
```

---

## Summary Table

**Quick Reference: Common Issues & Solutions**

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| Agent not invoked | Agent not referenced in CLAUDE.md | Add `@AGENTS.md` to CLAUDE.md |
| Agent not invoked | Triggers too narrow or vague | Rewrite triggers: concrete file paths, 3-8 triggers, measurable |
| Agent not invoked | Agent name doesn't match user intent | Rename agent: use intuitive job titles (seo-specialist, not optimization-expert) |
| Agent not invoked | Agent overlaps with 2+ other agents | Define clear ownership and delegation rules |
| AGENTS.md not loaded | File not in same directory as CLAUDE.md | Move AGENTS.md next to CLAUDE.md |
| AGENTS.md not loaded | Incorrect import syntax (e.g., @agents) | Use `@AGENTS.md` (case-sensitive, .md extension) |
| AGENTS.md not loaded | File malformed or empty | Verify file has >50 lines and "MUST BE USED when:" sections |
| Tool access denied | Tool not declared in agent spec | Add "Allowed Tools" section listing required tools |
| Tool access denied | Credentials missing | Ensure API keys, environment variables set; Tech lead injects via CI |
| Tool timeout | Command too slow or large scope | Break into smaller tasks, optimize Bash commands, use timeouts |
| Performance slow (20+ agents) | AGENTS.md too large (>1000 lines) | Split by role (AGENTS-FRONTEND.md, etc.) or consolidate agents |
| Performance slow | Overlapping agent specs | Merge redundant agents or clarify boundaries |
| Performance slow | Triggers inefficient | Add decision tree in lead agent for faster matching |
| Agent doesn't delegate | No delegation rules defined | Add explicit "Delegates to" section with triggers |
| Delegation fails | Delegation criteria vague | Rewrite: use measurable criteria (file size, item count, thresholds) |
| Delegation fails | Handoff mechanism unclear | Specify how: PR comment, @-mention, checklist, escalation |
| Circular dependency | Agent A waits for B, B waits for A | Identify upstream work, create shared artifact (spec), sequence work |
| Circular dependency | Missing shared contract | Create intermediate artifact (OpenAPI spec, requirements doc) |

---

## Best Practices Summary

1. **Explicit Triggers**: Every agent's "When to Invoke" should be specific (file paths, concrete scenarios), not vague ("when working on X")

2. **Tight Scope**: Each agent owns 1 clear domain (no more than 8 "When to Invoke" triggers)

3. **Clear Ownership**: Use ownership matrix to prevent overlap; define who owns what

4. **Explicit Delegation**: If Agent A delegates to Agent B, specify trigger, handoff mechanism, and blocking/non-blocking

5. **Shared Artifacts**: Between dependent agents, use intermediate contracts (OpenAPI spec, requirements doc) to avoid circular waits

6. **Tool Declarations**: Agents must explicitly declare tools they use (Read, Edit, Bash, etc.)

7. **Performance**: Keep AGENTS.md <1000 lines; split by role if >40 agents

8. **Feedback Loops**: Define how delegated work is reviewed, approved, and iterated on

9. **Context Efficiency**: Reference enablement-templates for verbose docs; keep AGENTS.md concise

10. **Testing**: When adding agents, verify they're invoked as expected; test delegation paths

---

## Related Documentation

- **CLAUDE_ENABLEMENT_BEST_PRACTICES.md** - Complete guide to agent setup and orchestration
- **AGENTS.md** - Your project's multi-agent structure (reference implementation)
- **/enablement-templates/agents/** - Reusable agent templates (seo-specialist, etc.)
- **MULTI_AGENT_PLAN.md** - Phase-by-phase orchestration and delivery milestones
