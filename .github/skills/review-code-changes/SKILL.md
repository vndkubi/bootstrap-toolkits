---
name: review-code-changes
description: 'Multi-stage code review pipeline: Self-Review → Functional Review (@functional-reviewer) → Technical Review (@technical-reviewer). Functional Review runs first — if business logic is wrong, reject immediately. Each finding must include actionable code snippets. Produces a combined review report with verdict. Use when reviewing PRs or branch changes via @code-reviewer.'
---

# Review Code Changes — Multi-Stage Pipeline

Structured multi-stage code review pipeline with short-circuit logic for maximum efficiency.

## When to Use

- Reviewing a pull request
- Pre-merge quality gate
- Code review as part of feature delivery pipeline
- Keywords: "review PR", "review code", "check changes", "code review"

## Pipeline Overview

```
Stage 0: CONTEXT GATHERING → Load changed files + related files + business context + scenario pack
    ↓
Stage 1: SELF-REVIEW GATE → Author checklist (quick sanity check)
    ↓
Stage 2: FUNCTIONAL REVIEW → @functional-reviewer validates business logic
    ↓ If 🔴 BLOCKER found → REJECT immediately, skip Stage 3
    ↓
Stage 3: TECHNICAL REVIEW → @technical-reviewer validates architecture & quality
    ↓
COMBINED REPORT → Merge findings from both stages with verdict
```

## Stage 0: Context Gathering (Deep Context Retrieval)

**CRITICAL: Reading only the git diff is like "blind men and an elephant."** The reviewer MUST load FULL file contents and their dependencies — not just diff chunks.

### 0a. Get Changed Files

```bash
git diff [base]...[head] --name-only
```

### 0b. Categorize Changed Files

| Type | Pattern | Reviewer | Priority |
|------|---------|----------|----------|
| Business logic | `*Service*, *Validator*, *Calculator*, *StateMachine*` | Functional | 🔴 Load first |
| API/Controller | `*Resource*, *Controller*, *DTO*, *Mapper*` | Both | 🔴 Load first |
| Data access | `*Repository*, *DAO*, *Query*` | Technical | 🟡 Load second |
| Database | `*.sql, *migration*` | Technical | 🟡 Load second |
| Configuration | `*.properties, *.yml, *.yaml` | Technical | 🟢 Load if relevant |
| Tests | `*Test*, *Spec*` | Functional (coverage check) | 🔴 Load first |

### 0c. Load FULL Content of Changed Files

**Do NOT rely on diff chunks alone.** For every changed file:
1. Read the **entire file** — the diff only shows what changed, not the surrounding logic that gives it meaning
2. This ensures reviewers see: preceding validation, conditional branches, try-catch blocks, related methods in the same class

### 0d. Context Retrieval — Find Related Files Outside the PR

**This is the most important step.** For each changed class/method, use tool calls to build the dependency graph:

#### Step 1: Trace Outbound Dependencies (what this file depends on)
```
For each changed file:
  → Read import/require/using statements
  → Load the FULL content of each imported file (especially interfaces, base classes, DTOs)
  → If an imported class is also a service/repository, load it — the changed code may call it incorrectly
```

#### Step 2: Trace Inbound Dependencies (what depends on this file) — CALLERS
```
For each changed class/method:
  → grep/search the codebase for references to the class name or method name
  → Load the FULL content of each caller file
  → These callers are NOT in the PR but may BREAK due to the change
```

**Tool usage pattern:**
```
# Find all callers of a changed method
grep -rn "orderService.calculateTotal" --include="*.java" src/
grep -rn "OrderService" --include="*.java" src/main/  # find all usages of the class

# Find all implementations/subclasses
grep -rn "extends OrderService\|implements OrderProcessor" --include="*.java" src/

# Find all consumers of a changed DTO
grep -rn "OrderResponseDto" --include="*.java" src/
grep -rn "OrderResponseDto" --include="*.ts" src/  # frontend consumers too
```

#### Step 3: Trace Cross-Service Dependencies
```
For changed API endpoints (Controller/Resource):
  → Search for Feign clients, RestTemplate, WebClient, HttpClient referencing the same URL path
  → Search for OpenAPI/Swagger spec references
  → These are OTHER SERVICES that will break if the API contract changes
```

#### Step 4: Load Domain Context
```
For changed entities/models:
  → Load the entity class and all its relationships (@ManyToOne, @OneToMany, FK references)
  → Load related domain events, listeners, observers
  → Load state machine / status transition logic if entity has status field
```

### 0e. Locate Requirement And Business Context

1. Check PR description for PBI/issue link
2. Search `docs/requirements/` for related spec
3. Search business-facing docs when they exist:
  - `docs/workflows/`
  - `docs/modules/`
  - `docs/01-business-glossary.md`
  - `docs/05-common-failure-modes.md`
  - ADRs, runbooks, API docs, or user-facing behavior docs
4. Check commit messages for issue references
5. If no requirement or business context is found, derive a provisional business context from the strongest remaining signals in this order:
  - PR description or linked issue
  - existing tests, fixtures, and scenario names
  - public API contracts, DTOs, state machines, database constraints, and user-visible strings
  - caller behavior and downstream consumers
  - commit messages as weakest evidence
6. Record a business-context confidence level: High / Medium / Low
7. If confidence is Low, continue review with best effort and explicitly mark which scenarios could not be validated against documented business intent

### 0f. Build Context Summary

Before passing to reviewers, produce a brief context map:

```markdown
### Context Map
- **Changed files**: [N] files ([list])
- **Related files loaded**: [N] files
  - Callers: [list of files that call changed methods]
  - Dependencies: [list of files imported by changed files]
  - Cross-service: [list of Feign/HTTP clients referencing changed APIs]
- **Requirement**: [link or "not found"]
- **Business docs / workflow docs**: [list or "not found"]
- **Business context confidence**: High / Medium / Low
- **Estimated blast radius**: Low (1-3 files) / Medium (4-10) / High (10+)
```

> **Budget rule**: If the PR touches 50+ files, prioritize context loading for 🔴-priority file types first. Load 🟡 and 🟢 types only if context budget allows.

### 0g. Oversized PR Slicing (Required For Huge Reviews)

If the PR is too large for one reliable pass, switch to slice mode before review delegation.

Trigger slice mode when any of these are true:

- changed files exceed 50
- estimated diff size is > 10k changed LOC
- one-pass context loading would exceed practical review budget
- the PR spans multiple domains, services, or shared platforms at once

In slice mode:

1. Split the review into risk-first slices:
  - contracts and public API changes
  - migrations, data model, or schema changes
  - shared libraries or cross-domain logic
  - per-domain business logic slices
  - tests and low-risk cleanup churn
2. Build a short review plan per slice:
  - scope
  - risk level
  - key files
  - callers / dependents to load
  - relevant checklist packs to apply when available
3. Review slices in order of blast radius, not file path order.
4. Carry forward blockers and repeated findings across slices into the final combined report.

Goal: make very large PRs reviewable without pretending one giant pass will stay reliable.

### 0h. Build Functional Scenario Pack

Before delegating to Functional Review, build a lightweight scenario pack from the requirement, business docs, and changed code flow.

For each affected feature or domain slice, capture at least:

- happy path
- invalid input / validation error path
- boundary or empty-data path
- state-transition path when statuses or workflow steps exist
- cross-domain side-effect path when another module/service must react
- regression-sensitive path that existing users already depend on

Use the scenario pack to trace:

- what code path implements the scenario
- what test covers it
- what business document or requirement anchors it
- where business meaning is missing, contradictory, or only implied by code

If no business docs exist, anchor each scenario to the best available fallback evidence and mark the scenario confidence explicitly.

For huge PRs, build one scenario pack per slice instead of forcing one giant matrix.

## Stage 1: Self-Review Gate (Quick Sanity Check)

**The implementor should verify these before PR submission. The pipeline checks automatically:**

- [ ] Code compiles without errors
- [ ] All existing tests pass
- [ ] New tests included for new logic
- [ ] No debugging code left (`console.log`, `System.out.println`, `TODO`/`FIXME` in new code)
- [ ] No unresolved merge conflicts
- [ ] No hardcoded credentials, tokens, or secrets
- [ ] Commit messages follow conventional commit format

**If any basic hygiene item fails → return immediately with clear instructions.**

## Stage 2: Functional Review

**Delegate to `@functional-reviewer` with this context:**

1. Changed files (business logic + API + tests)
2. Requirement document / acceptance criteria
3. Business context docs, workflow docs, glossary, and failure-mode docs when available
4. Functional scenario pack
5. Related files from import graph

**Functional Reviewer will:**
- Build AC ↔ Test ↔ Code traceability matrix
- Trace the business flow through the changed code paths before judging correctness
- Verify business logic correctness
- Check whether the implementation contradicts, under-specifies, or omits expected business behavior from available docs
- Run adversarial edge-case analysis
- Check cross-domain data integrity
- Verify business scenario test coverage

**Short-circuit rule:** If Functional Review returns ANY 🔴 BLOCKER:
- **STOP** — do NOT proceed to Stage 3
- **REJECT** the PR with Functional Review findings only
- Rationale: No point reviewing technical quality if the code doesn't solve the right problem

**If Functional Review returns ✅ PASS (or only 🟡/🔵 findings):**
- Proceed to Stage 3
- Carry forward 🟡/🔵 findings to combined report

## Stage 3: Technical Review

**Delegate to `@technical-reviewer` with this context:**

1. ALL changed files (including migrations, configs)
2. Related files from import graph (callers, subclasses)
3. Module/service boundary information

**Technical Reviewer will:**
- Check API backward compatibility
- Assess database migration safety
- Detect domain boundary violations (DDD)
- Verify NFR compliance (logging, tracing, error handling)
- Check layer responsibility and duplicate validation
- Review performance, security, shared component impact

**Technical Review runs in full — no short-circuit.**

## Optional Stage 4: Discussion Harvest, Checklist Learning, And Review Memory Promotion

Use this stage only when the combined review or the follow-up PR discussion surfaces **durable** or **recurring** knowledge that should outlive the current pull request.

Delegate to `review-memory-promotion` with:

1. the final combined review report
2. the Stage 0 context map
3. a PR discussion summary, resolved-thread artifact, or accepted-fix notes when available
4. the requirement or investigation artifact when present
5. existing docs likely to own the promoted knowledge
6. existing checklist packs under `docs/reviews/checklists/` when they exist

Rules:

- promote recurring or structural findings only
- treat raw PR discussion as input evidence, not as self-validating truth
- exclude comments from GitHub Copilot, bots, and system accounts unless a human reviewer explicitly accepts or repeats the same reasoning
- extract the human review rationale, not just the surface wording of the comment
- promote only trusted signals, such as accepted fixes, resolved discussions, repeated findings, or reviewer-owned concerns
- reject one-off branch details, style nits, and transient incidents
- do not auto-edit source-of-truth files directly from the review stage
- require human approval for business-rule, security, or workflow-policy candidates

Output:

- a reviewable candidate memory report under `docs/reviews/`
- functional checklist candidates, technical checklist candidates, and any other durable memory promotions kept separate
- a create-vs-update recommendation for each affected checklist pack
- a clear follow-up task for accepted candidates

## Combined Report Format

```markdown
# Code Review Report

## Summary
- **PR/Branch**: [reference]
- **Author**: [name]
- **PBI/Issue**: [reference]
- **Business Context Used**: [docs / workflows / glossary / "not found"]
- **Business Context Confidence**: High / Medium / Low
- **Files Changed**: [count]
- **Risk Level**: 🔴 High / 🟡 Medium / 🟢 Low

## Verdict: ✅ APPROVE / ⚠️ APPROVE WITH COMMENTS / ❌ REQUEST CHANGES

### Decision Rationale
[1-2 sentences explaining the verdict]

## Functional Review Results
[Full output from @functional-reviewer]

## Scenario Coverage Snapshot
[Happy path / boundary / state-transition / cross-domain scenarios covered or missing]

## Technical Review Results
[Full output from @technical-reviewer]

## Combined Findings Summary

| # | Stage | Severity | Category | File:Line | Finding | Suggested Fix |
|---|-------|----------|----------|-----------|---------|---------------|

## Statistics
- 🔴 Blockers: [N]
- 🟡 Warnings: [N]
- 🔵 Suggestions: [N]
- 🟢 Praise: [N]

## Actions Required
1. [Must fix #1 — with file and line reference]
2. [Must fix #2 — with file and line reference]
```

## Verdict Determination

| Condition | Verdict |
|-----------|---------|
| Any 🔴 BLOCKER from either stage | ❌ REQUEST CHANGES |
| Only 🟡 WARNING + 🔵 SUGGESTION | ⚠️ APPROVE WITH COMMENTS |
| Only 🔵 SUGGESTION + 🟢 PRAISE | ✅ APPROVE |
| No findings | ✅ APPROVE |

## Actionable Comment Rules

**Every finding at 🔴 or 🟡 level MUST follow this format:**

```markdown
### [SEVERITY]: [Title] — `File.java:L45`

**Problem:** [Explain WHAT is wrong and WHY it matters]

**Current code:**
[problematic code snippet]

**Suggested fix:**
[recommended correction]
```

**Non-actionable comments are forbidden:**
- ❌ "This could be improved" (how?)
- ❌ "Consider refactoring" (to what?)
- ❌ "Code looks good" (not helpful)

## Stack-Specific Review Focus

| Stack | Functional Focus | Technical Focus |
|-------|-----------------|----------------|
| Java/Jakarta EE | CDI-managed business rules, JPA entity state | Transaction boundaries, CDI scope, JPA fetch strategy, Oracle SQL |
| .NET/C# | Domain services, EF entity tracking | Middleware pipeline, DI lifetime, EF migration safety |
| Python/Django | Model signals, manager methods | Migration operations, queryset optimization, async handling |
| Python/FastAPI | Pydantic validation, dependency injection | Async patterns, SQLAlchemy session management |
| TypeScript/React | State management, API integration | Bundle size, re-render performance, type safety |
| PHP/Laravel | Eloquent events, form requests | Migration safety, queue jobs, cache invalidation |
| Android/Kotlin | ViewModel state, use case logic | Coroutine scope, memory leaks, Compose recomposition |
| iOS/Swift | ObservableObject, Combine pipelines | Memory management, MainActor, Core Data migration |

## Validation

- [ ] Requirement document was located and read (or flagged as missing)
- [ ] Functional review traceability table was produced
- [ ] Every changed file was reviewed by the appropriate stage
- [ ] All 🔴 and 🟡 findings include code snippets
- [ ] Short-circuit logic was applied correctly
- [ ] Combined report has accurate statistics
- [ ] Verdict matches finding severity rules
- [ ] If memory promotion was requested, one-off findings were filtered out and approval-required candidates were marked explicitly
