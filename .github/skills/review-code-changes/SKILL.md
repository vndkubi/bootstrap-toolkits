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
Stage 0: CONTEXT GATHERING → Load changed files + related files (import graph, callers)
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

## Stage 0: Context Gathering

**Before any review starts, build the full context:**

1. **Get changed files**: `git diff [base]...[head] --name-only`
2. **Categorize files**:

   | Type | Pattern | Reviewer |
   |------|---------|----------|
   | Business logic | `*Service*, *Validator*, *Calculator*, *StateMachine*` | Functional |
   | API/Controller | `*Resource*, *Controller*, *DTO*, *Mapper*` | Both |
   | Data access | `*Repository*, *DAO*, *Query*` | Technical |
   | Database | `*.sql, *migration*` | Technical |
   | Configuration | `*.properties, *.yml, *.yaml` | Technical |
   | Tests | `*Test*, *Spec*` | Functional (coverage check) |

3. **Load related files** outside the PR:
   - For each changed file, trace imports → load imported files
   - Search for usages of changed methods → load caller files
   - This provides context for detecting breakage in code NOT in the PR
4. **Locate requirement document**:
   - Check PR description for PBI/issue link
   - Search `docs/requirements/` for related spec
   - Check commit messages for issue references

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
3. Related files from import graph

**Functional Reviewer will:**
- Build AC ↔ Test ↔ Code traceability matrix
- Verify business logic correctness
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

## Combined Report Format

```markdown
# Code Review Report

## Summary
- **PR/Branch**: [reference]
- **Author**: [name]
- **PBI/Issue**: [reference]
- **Files Changed**: [count]
- **Risk Level**: 🔴 High / 🟡 Medium / 🟢 Low

## Verdict: ✅ APPROVE / ⚠️ APPROVE WITH COMMENTS / ❌ REQUEST CHANGES

### Decision Rationale
[1-2 sentences explaining the verdict]

## Functional Review Results
[Full output from @functional-reviewer]

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
