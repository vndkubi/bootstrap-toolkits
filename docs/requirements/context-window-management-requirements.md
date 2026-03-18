# Context Window Management for Large Project Bootstrap

## User Story

**As a** developer using copilot-bootstrap agents (`@dev-orchestrator`, `@investigator`, etc.) on a large enterprise project
**I want** the agents and pipeline to automatically manage context window consumption during long sessions
**So that** agent quality doesn't degrade mid-session when investigating/implementing features across 10+ modules, and I don't need to manually manage context — I just pick an agent and chat

### Business Context

There are **two distinct context pressure points**:

1. **Bootstrap generation** — when `@conductor` runs the 14-phase pipeline on a large project, it needs to scan hundreds of source files (Phase 1), analyze business domains (Phase 3), then generate configs (Phase 4-11). The pipeline itself can exhaust the context window before finishing.

2. **Daily agent usage** — when a developer uses `@dev-orchestrator` → delegates to `@investigator`, the investigator reads dozens of files (entity classes, services, DAOs, configs) to produce an as-is/to-be report. On a 15-module project, this can fill the context window before the investigation is complete.

**User behavior**: Users only know how to pick an agent and write a prompt. They don't know about `/compact`, `/context`, or session management. The **agents themselves** must be context-aware.

**Note**: The toolkit's template files being over-budget (e.g., `investigator.agent.md` at 22 KB) is **acceptable** because these are templates — the generated output is validated in Phase 12 and trimmed to comply with budgets. The focus here is **runtime context management during agent sessions**.

---

## Codebase Analysis

### How Context Gets Consumed During Agent Sessions

#### Scenario 1: `@dev-orchestrator` → Full Feature Delivery

```
Step 1: @investigator reads ~15-20 source files (entity, DAO, service, resource, config)
        → ~40-60 KB of source code loaded into context
Step 2: Investigation report generated → ~5-8 KB of output
Step 3: ⏸️ User confirms
Step 4: @implementor reads existing patterns (3-5 files) + writes new code
        → ~20-30 KB more source code + generated code
Step 5: @test-specialist reads SUT + writes tests
        → ~15-25 KB more
Step 6: @code-reviewer reads all changes
        → ~10-20 KB more

Total source code read: ~90-135 KB across the session
```

**Problem**: By Step 4-5, earlier context from Step 1 is either truncated or compacted, losing important investigation findings that should inform the implementation.

#### Scenario 2: `@conductor` Bootstrap Pipeline on Enterprise Project

```
Phase 1 (SCAN): Read 10+ pom.xml + 50+ source files for pattern detection
        → ~100-200 KB of source code
Phase 3 (DOMAIN): Re-read entity classes, services for business rule extraction
        → ~50-80 KB additional reads
Phase 4-11 (GENERATE): Produce agents, skills, instructions
        → ~80-120 KB of generated content

Total: ~230-400 KB flowing through a single session
```

**Problem**: The model starts losing Phase 1 scan results by the time it reaches Phase 7-8 (agent/skill generation), producing generic agents instead of project-specific ones.

#### Scenario 3: `@investigator` on Multi-Module Enterprise Project

```
Step 1: Trace REST resource → Service → DAO → DB (4-6 files per module)
Step 2: Check cross-module dependencies (2-3 additional modules)
Step 3: Read existing tests for pattern understanding
Step 4: Generate as-is/to-be report with sequence diagrams

For a feature touching 3 modules: ~25-40 files read → ~80-120 KB
```

**Problem**: Investigation output quality degrades because early file reads are no longer in context when generating the final report.

### Existing Toolkit Mechanisms (Already In Place)

| Mechanism | Where | What It Does |
|-----------|-------|-------------|
| `applyTo` patterns | `.instructions.md` | Only load instructions for matching file types |
| Context budget targets | `context-budget-check` skill | Validates file sizes post-generation |
| Phase 12 validation | `generate-copilot-config` | Ensures generated output ≤ budgets |
| Skill on-demand loading | Agent → Skill reference | Skills load only when agent references them |
| Sub-agent delegation | `dev-orchestrator` | Each sub-agent gets its own context scope |

### What's Missing

| Gap | Impact | Where to Fix |
|-----|--------|-------------|
| No "summarize and checkpoint" between pipeline phases | Phase 1 results lost by Phase 7 | Pipeline orchestration (conductor/skill) |
| No file-read batching strategy for investigators | Reads 30+ files individually, filling context with verbose code | Investigation skill |
| No context-aware file reading (read only what's needed) | Full files loaded when only a method signature is needed | Agent/skill instructions |
| No session-splitting guidance for complex workflows | User starts one session, context degrades over 2+ hours | Generated context guide |
| Agents don't produce intermediate summaries | No compaction-friendly checkpoints in long workflows | All workflow agents |
| No "context pressure" detection in agents | Agents don't know when they're running low | Agent behavior rules |

---

## Acceptance Criteria

| # | Criterion | Type | Priority |
|---|-----------|------|----------|
| AC-1 | Agents produce intermediate summaries after each major step (investigation findings, implementation plan) that survive context compaction | Functional | Must Have |
| AC-2 | Bootstrap pipeline includes explicit "checkpoint & summarize" between Phase 1-3 (analysis) and Phase 4-11 (generation) | Functional | Must Have |
| AC-3 | Investigation skill uses targeted file reading (read specific methods/sections, not whole files) when investigating 10+ file features | Functional | Must Have |
| AC-4 | Pipeline Phase 2 (CLASSIFY) outputs a context budget plan estimating how many files need to be read and whether session splitting is needed | Functional | Should Have |
| AC-5 | Generated output includes a `.copilot-context-guide.md` for Enterprise projects with session strategy | Functional | Should Have |
| AC-6 | `orchestrate-development` skill includes explicit context checkpoints with user-visible summaries between investigate → implement → test phases | Functional | Must Have |
| AC-7 | Agents use a "read-then-summarize" pattern: read a batch of files → produce a structured summary → drop raw file content from prompts | Functional | Should Have |
| AC-8 | Context budget check skill enhanced to simulate agent session scenarios (not just static file sizes) | Functional | Should Have |
| AC-9 | CLI users get session management tips in generated guide (`/compact`, `/context`, `/plan`, `/fleet`) | Functional | Nice to Have |
| AC-10 | Bootstrap pipeline works reliably on projects with 15+ modules without context degradation | Non-Functional | Must Have |

### Out of Scope
- Trimming bootstrap toolkit template files (acceptable because they're templates, validated at Phase 12)
- Copilot CLI's internal compaction algorithm — managed by GitHub
- VS Code Chat's context window size — platform-dependent
- Changing model context limits
- Building a custom context management system (use platform features)

---

## PBI Breakdown

### PBI-1: Checkpoint & Summarize Pattern for Pipeline — 5 SP

**Type**: Feature
**Priority**: P0 (Critical) — pipeline fails on large projects because Phase 1 results are lost

**Description**:
Add explicit "checkpoint & summarize" steps to the bootstrap pipeline so that analysis results are condensed into structured summaries before proceeding to generation phases. This ensures Phase 1-3 findings survive throughout the session.

**Acceptance Criteria**:
- [ ] AC-2: Pipeline has checkpoint between analysis (Phase 1-3) and generation (Phase 4-11)
- [ ] AC-10: Pipeline works on 15+ module projects without quality degradation

**Technical Notes**:

Add to `generate-copilot-config` skill and `conductor.agent.md`:

```markdown
### Checkpoint: Analysis Summary (MANDATORY after Phase 3)

Before proceeding to Phase 4, produce a condensed summary document:

#### Project Analysis Summary (use as reference for ALL subsequent phases)
- **Tech stack**: [one-line summary, e.g., "Java 17, Jakarta EE 10, Maven multi-module, Oracle 19c"]
- **Classification**: [Small/Standard/Enterprise]
- **Modules** (bulleted list, max 1 line each): module-name → purpose
- **Domains** (bulleted list): domain-name → key entities → key business rules
- **Patterns detected**: [naming, layering, DI, test framework]
- **Build/test commands**: [exact commands]
- **Conventions**: [max 5 bullet points]

This summary MUST be ≤ 3 KB and referenced in every subsequent phase prompt.
Do NOT re-read source files already scanned in Phase 1 — use this summary instead.
```

**For VS Code Chat (no auto-compaction)**:
- After Phase 3, the agent should **write the summary to a temp file** (`plan.md` or session artifact)
- In Phase 4+, reference the summary file instead of relying on conversation history

**For CLI**:
- The summary naturally survives compaction because it's structured and recent
- Recommend `/compact` after Phase 3 if `/context` shows > 60% usage

**Definition of Done**:
- [ ] `generate-copilot-config` skill updated with checkpoint step
- [ ] `conductor.agent.md` references checkpoint pattern
- [ ] Tested: run pipeline on a project with 10+ modules; Phase 8 agents contain project-specific content

---

### PBI-2: Context-Efficient Investigation Pattern — 5 SP

**Type**: Feature
**Priority**: P0 (Critical) — investigators on large projects read 30+ files and lose early findings

**Description**:
Redesign the investigation workflow (used by `@investigator` and `orchestrate-development` skill) to be context-efficient on large projects. Use targeted reading, batch-and-summarize, and intermediate output files.

**Acceptance Criteria**:
- [ ] AC-1: Investigation produces intermediate summaries after each analysis phase
- [ ] AC-3: File reading is targeted (specific methods/sections) for features touching 10+ files
- [ ] AC-6: Orchestration skill has context checkpoints between investigate → implement → test
- [ ] AC-7: Investigation uses "read-then-summarize" pattern

**Technical Notes**:

#### Strategy 1: Targeted File Reading

Instead of reading entire files, use search-first-then-read-targeted:

```markdown
### Context-Efficient Reading Rules

When investigating a feature that touches multiple files:

1. **Search first** — Use grep/semantic search to identify relevant files and line ranges
2. **Read targeted** — Read only the relevant methods/classes (use line ranges), not entire 500-line files
3. **Summarize batch** — After reading a batch of 5 files, produce a structured summary:
   - Entity: [name] → fields: [...], relationships: [...], validations: [...]
   - Service: [name] → methods: [...], business rules: [...], dependencies: [...]
4. **Drop raw code** — Once summarized, do NOT re-read the same files

Exception: Test files and build configs can be read fully (typically small).
```

#### Strategy 2: Phased Investigation with Intermediate Output

```markdown
### Investigation Phases (each produces a saved summary)

**Phase A: Scope & Entry Point** (~5 files max)
Read: REST resource/controller, main service
Output: Entry point summary (endpoints, parameters, delegation chain)

**Phase B: Data Layer** (~5-8 files max)  
Read: Entities, DAOs/repositories, migration scripts
Output: Data model summary (entities, relationships, constraints)

**Phase C: Business Logic** (~5-8 files max)
Read: Services, validators, event handlers
Output: Business rules summary (rules, validation chains, side effects)

**Phase D: Cross-Cutting** (~3-5 files max)
Read: Config, security, cross-module dependencies
Output: Integration summary (dependencies, configs, security constraints)

**Phase E: Synthesis** (no new file reads)
Combine Phase A-D summaries → produce final as-is/to-be report
```

#### Strategy 3: Write Investigation to File

For complex investigations (10+ files), write the investigation report to a markdown file (`docs/investigations/[feature].md`) as you go. This serves as:
- External memory that survives context compaction
- Input for the implementation phase (implementor reads the file instead of replying on conversation history)
- Documentation for the team

**Definition of Done**:
- [ ] `investigate-pbi` skill updated with phased investigation pattern
- [ ] `orchestrate-development` skill updated with checkpoints
- [ ] `investigator.agent.md` references context-efficient reading rules
- [ ] Tested: investigate a feature touching 3 modules on a 10+ module project

---

### PBI-3: Intermediate Summaries in Orchestration Workflow — 3 SP

**Type**: Feature
**Priority**: P1 (High)

**Description**:
Add explicit context checkpoints to the `orchestrate-development` skill so that handoffs between sub-agents (investigate → implement → test → review) preserve critical context through structured summaries.

**Acceptance Criteria**:
- [ ] AC-1: Each major phase produces a summary that informs the next phase
- [ ] AC-6: User sees progress summaries between phases

**Technical Notes**:

Update `orchestrate-development` skill:

```markdown
### Context Checkpoint Pattern

After each major step, produce a **handoff summary** that the next step uses as input:

**After Investigation (Step 2)**:
Write to conversation + optionally to file:
- Files to create: [list with purpose]
- Files to modify: [list with what changes]
- Business rules to enforce: [list]
- Patterns to follow: [list with examples from codebase]
- Test scenarios: [list — happy path, error cases, edge cases]

**After Implementation (Step 4)**:
- Files created/modified: [list]
- Key design decisions: [list with WHY]
- TODO items for tests: [specific branches to cover]

**After Testing (Step 5)**:
- Test coverage summary: [which scenarios covered]  
- Remaining gaps: [if any]

These summaries are the "contract" between phases. If context is compacted,
the summary alone is sufficient for the next phase to continue.
```

**Key principle**: Each summary must be **self-contained** — the next agent should be able to work from ONLY the summary without access to conversation history.

**Definition of Done**:
- [ ] `orchestrate-development` skill updated
- [ ] Handoff format tested with a multi-module feature implementation
- [ ] Summaries are concise (≤ 1 KB each)

---

### PBI-4: Context Budget Planning in Phase 2 (CLASSIFY) — 3 SP

**Type**: Feature
**Priority**: P1 (High)

**Description**:
Enhance Phase 2 to estimate the context pressure of the bootstrap pipeline and plan session splitting for large projects.

**Acceptance Criteria**:
- [ ] AC-4: Phase 2 outputs an estimate of files to scan and whether splitting is needed
- [ ] AC-10: Large projects get explicit session strategy

**Technical Notes**:

Add to Phase 2 output:

```markdown
### Context Pressure Estimate

| Factor | Value | Impact |
|--------|-------|--------|
| Total source files | 250 | High — Phase 1 scan will read ~50 files |
| Modules | 15 | High — cross-module scanning needed |
| Domains | 8 | Medium — Phase 3 needs entity+service per domain |
| Estimated Phase 1-3 context | ~120 KB reads | ⚠️ Will need checkpoint |
| Estimated Phase 4-11 output | ~80 KB generated | Manageable with summary |

### Session Strategy
- **Single session**: OK for ≤ 5 modules, ≤ 100 files
- **Checkpoint + continue**: Required for 5-15 modules — summarize after Phase 3
- **Multi-session**: Consider for 15+ modules:
  - Session 1: Phase 1-3 (scan + analyze) → save analysis summary to file
  - Session 2: Phase 4-11 (generate) using saved analysis
  - Session 3: Phase 12-14 (validate + cleanup)
```

For CLI users, add:
```markdown
### CLI Session Tips
- Run `/context` after Phase 1 to check usage
- If > 50% used after Phase 3, run `/compact` before Phase 4
- Use `/fleet` for Phase 7-8 if generating 10+ agents
```

**Definition of Done**:
- [ ] Phase 2 in `generate-copilot-config` outputs context pressure estimate
- [ ] Session strategy is classification-aware
- [ ] Documented clearly for both VS Code Chat and CLI users

---

### PBI-5: Generated Context Guide for Enterprise Projects — 2 SP

**Type**: Feature
**Priority**: P2 (Medium)

**Description**:
Generate a `.copilot-context-guide.md` during Phase 14 for Enterprise-classified projects, teaching developers how to use agents effectively on their specific project without context issues.

**Acceptance Criteria**:
- [ ] AC-5: Guide generated for Enterprise projects
- [ ] AC-9: CLI-specific tips included

**Technical Notes**:

Content should be **project-specific**, not generic:

```markdown
# Context Guide for [Project Name]

## Your Project Profile
- **Modules**: 15 | **Domains**: 8 | **Classification**: Enterprise
- **Heaviest auto-load scenario**: Editing *.java loads 5 instruction files (~22 KB)

## Recommended Session Patterns

### Feature Implementation
1. Start with `@dev-orchestrator Implement [PBI description]`
2. The orchestrator will investigate first → you'll see a summary → confirm
3. Keep session focused on ONE feature
4. Start a NEW chat for the next feature

### Investigation Only
1. Use `@investigator Investigate [topic]`  
2. Output will be saved to `docs/investigations/[topic].md`
3. For cross-module investigations, specify scope: "Focus on order and payment modules"

### Codebase Learning
1. Use `@codebase-analyzer` with `/learn-codebase` prompt
2. Ask about ONE domain at a time: "Explain the Order domain"
3. Start new session for each domain

## Anti-Patterns (Avoid These)
- ❌ Don't chain 5+ features in one session — context degrades after ~3 complex tasks
- ❌ Don't ask investigator to "analyze everything" — scope to 1-2 modules
- ❌ Don't paste entire files into chat — let agents read files themselves
- ❌ Don't override agent routing — let dev-orchestrator pick the right sub-agent

## For CLI Users
- `/context` — check context usage before starting a heavy task
- `/compact` — compress conversation history (use between investigation and implementation)
- `/plan` — create implementation plan before coding (saves context vs. ad-hoc)
- `/fleet` — parallelize independent tasks across modules
- `/delegate` — offload tangential work (docs, formatting) to cloud agent

## Co-Loading Map
[auto-generated: which instructions load when editing each file type]
```

**Definition of Done**:
- [ ] Guide generated during Phase 14
- [ ] Customized with actual project stats (module count, domain count, co-loading map)
- [ ] Includes both VS Code Chat and CLI patterns

---

## Impact Assessment

### Affected Areas

| Area | Impact | Changes Needed |
|------|--------|---------------|
| `generate-copilot-config` skill | 🔴 High | Add checkpoint pattern (Phase 3→4 boundary), context pressure estimate (Phase 2), guide generation (Phase 14) |
| `investigate-pbi` skill | 🔴 High | Phased investigation with intermediate summaries, targeted reading |
| `orchestrate-development` skill | 🔴 High | Add handoff summaries between investigate → implement → test |
| `conductor.agent.md` | 🟡 Medium | Reference checkpoint pattern, support multi-session bootstrap |
| `investigator.agent.md` | 🟡 Medium | Add context-efficient reading rules |
| `dev-orchestrator.agent.md` | 🟡 Medium | Add summary-based handoff between sub-agents |
| `context-budget-check` skill | 🟡 Medium | Add session simulation (not just static file sizes) |
| Phase 14 output | 🟢 Low | Generate `.copilot-context-guide.md` for Enterprise projects |

### Dependencies

| PBI | Depends On | Blocked By |
|-----|-----------|-----------|
| PBI-1 (Pipeline checkpoint) | None | — |
| PBI-2 (Investigation efficiency) | None | — |
| PBI-3 (Orchestration summaries) | PBI-2 | Investigation pattern must be defined first |
| PBI-4 (Budget planning) | PBI-1 | Checkpoint pattern must exist for session strategy |
| PBI-5 (Context guide) | PBI-4 | Needs project stats from context pressure estimate |

### Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Intermediate summaries lose critical details | Medium | High | Define required fields per summary type; include "key context" section |
| Targeted file reading misses important code | Medium | Medium | Always read full entity/model files; targeted reading only for services and tests |
| Multi-session bootstrap loses continuity | Low | High | Summary written to file, self-contained, referenced explicitly in next session |
| Users ignore session guidance | High | Low | Agents enforce patterns automatically; guide is supplementary |
| CLI-specific features change in future versions | Low | Low | Reference official docs; keep guidance generic |

### Estimation Summary

| PBI | Points | Complexity | Sprint Fit | Priority |
|-----|--------|-----------|-----------|----------|
| PBI-1: Pipeline checkpoint & summarize | 5 | Medium | Sprint N | P0 |
| PBI-2: Context-efficient investigation | 5 | High | Sprint N | P0 |
| PBI-3: Orchestration handoff summaries | 3 | Medium | Sprint N+1 | P1 |
| PBI-4: Context budget planning | 3 | Medium | Sprint N+1 | P1 |
| PBI-5: Generated context guide | 2 | Low | Sprint N+1 | P2 |
| **Total** | **18** | | | |

---

## Key Insights from GitHub Copilot CLI Best Practices

### What the CLI Does Automatically
- **Infinite sessions** with automatic context compaction — summarizes conversation history while preserving essential info
- **Session checkpoints** stored at `~/.copilot/session-state/{session-id}/checkpoints/`
- Context managed transparently; manual `/compact` is "rarely necessary"

### What We Should Leverage for Agent Design

| CLI Feature | How Agents Should Use It | VS Code Chat Equivalent |
|-------------|--------------------------|------------------------|
| `/compact` | Agents suggest `/compact` after heavy analysis phases | Not available — agents must produce self-contained summaries |
| `/context` | Agents check context before starting heavy reads | Not available — agents must be proactively efficient |
| `/plan` | Pipeline recommends `/plan` before complex generation | Agent produces plan → user confirms → proceed |
| `/fleet` | Enterprise bootstrap parallelizes independent generation tasks | Sub-agent delegation (already exists) |
| `/delegate` | Non-critical phases delegated to cloud agent | Not applicable in VS Code Chat |
| Session focus | Recommend `/clear` between unrelated tasks | Recommend starting new chat sessions |

### The Core Design Principle

> **Agents must be context-efficient by design, not rely on users managing context.**
>
> Users only know: pick agent → write prompt → get result. The agents must:
> 1. Read files efficiently (search → targeted read → summarize)
> 2. Produce intermediate summaries that survive compaction
> 3. Write important findings to files (external memory)
> 4. Hand off between sub-agents with self-contained summaries

---

## ✅ Completion Report

### Artifacts Generated

| # | Artifact | File | Description |
|---|----------|------|-------------|
| 1 | Requirements & Analysis | `docs/requirements/context-window-management-requirements.md` | Full story, 5 PBIs, 18 SP total |

### Recommendations
1. **PBI-1 + PBI-2 are independent and can be done in parallel** — one person works on pipeline checkpoints, another on investigation efficiency
2. **The "read-then-summarize" pattern is the highest-impact change** — it benefits ALL agents, not just the pipeline
3. **Write investigation findings to files** — this is the best "external memory" mechanism that works on both VS Code Chat and CLI
4. **Don't rely on users knowing CLI commands** — agents should be efficient by default; CLI tips are bonus
5. **Run `@spec-reviewer` on this spec** to validate before implementation
