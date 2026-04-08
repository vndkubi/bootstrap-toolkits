---
name: review-memory-promotion
description: "Generate approval-ready repo memory and review checklist candidates from completed code reviews, PR discussion artifacts, investigation reports, and recurring findings. Use when promoting review findings, building functional or technical checklist candidates, curating recurring gotchas, or improving local knowledge sync after bootstrap."
---

# Review Memory Promotion

Turn stable review or investigation findings into auditable candidate repo-memory deltas.

## When to Use

- After a completed code review identifies recurring warnings, repeated fixes, or durable pitfalls
- After PR discussion threads or resolved review summaries reveal stable reasoning worth reusing
- After an investigation report surfaces structural gotchas, workflow traps, or verification lessons that should outlive the current task
- When users ask to "promote review findings", "build a pitfall pack", "create a memory candidate", or "improve knowledge sync"
- When the same review comment keeps reappearing across pull requests and should become reusable repo knowledge

**Do NOT use when:**
- You need a broad audit of memory gaps or documentation coverage — use `repo-memory-promoter`
- The evidence is only a one-off branch detail, style nit, or transient incident
- You want to auto-edit source-of-truth files without human approval
- Secrets, credentials, or environment-specific values appear in the source material

## First Consumer

The default first consumer is the **local deep-review lane**. Use this skill after `review-code-changes` or a comparable structured review flow has already produced stable findings.

## Prerequisites

- A completed review report, PR discussion summary, investigation report, or other durable finding source
- Evidence anchors to real files or docs, not only chat recollection
- A likely target layer for the promoted knowledge
- An approval owner is known or can be proposed

## Core Rule

Generate **candidate deltas**, not silent source-of-truth edits.

This workflow exists to make promotion auditable and reversible.

## Workflow

### Step 1: Load Source Artifacts

Read the best available evidence set:

- final review report or investigation report
- PR discussion summary, resolved-thread export, or accepted-fix notes when available
- related requirement/spec artifact when present
- existing source-of-truth docs likely to own the promoted knowledge
- optional drift/effectiveness reports if they explain why the finding keeps recurring

### Step 2: Filter For Durable Candidates

Promote only findings that meet **all** of these rules:

1. **Durable** — likely to remain true beyond the current branch or patch
2. **Actionable** — can become a rule, checklist item, pitfall note, failure mode, or verification note
3. **Evidence-backed** — anchored to files, docs, or repeated findings
4. **Worth reusing** — likely to reduce repeated prompting, review churn, or avoidable regressions
5. **Trusted** — supported by an accepted fix, a resolved discussion, repeated recurrence, or a reviewer role that owns the concern

Reject findings that are:

- branch-specific implementation details with no reusable lesson
- formatting/style preferences already handled by tooling
- temporary outages, flaky CI noise, or personal preferences
- sensitive details that should not live in durable repo memory
- unresolved debates, superseded comments, or review remarks with no acceptance signal

### Step 3: Choose The Target Layer

Map each candidate to the smallest durable home that can own it:

| Candidate Type | Target Layer |
|---|---|
| Universal cross-cutting rule | `.github/copilot-instructions.md` |
| File-type or path-scoped rule | `.github/instructions/*.instructions.md` |
| Repeated functional review question or business-rule reminder | review checklist pack, for example `docs/reviews/checklists/functional-<scope>.md` |
| Repeated technical review risk or architecture guardrail | review checklist pack, for example `docs/reviews/checklists/technical-<scope>.md` |
| Repeated review pitfall | `docs/05-common-failure-modes.md` or `docs/modules/<module>.md` |
| Workflow or verification lesson | `docs/03-verification-runbook.md` or `docs/workflows/<workflow>.md` |
| Investigation note that is not yet durable | Defer — do not promote yet |

### Step 4: Build The Candidate Pack

Use the bundled template `memory-candidate-template.md`.

Classify every candidate into one of these groups:

- functional checklist candidate
- technical checklist candidate
- other durable memory promotion

For each candidate, include:

- title
- candidate type
- source signal
- durability rationale
- trust rationale
- reuse surface
- suggested target file and target layer
- evidence anchors
- proposed checklist entry or memory delta
- approval owner
- whether approval is mandatory before applying it

### Step 5: Save A Reviewable Report

Save the output as:

`docs/reviews/review-memory-promotion-<YYYY-MM-DD>.md`

If `docs/reviews/` does not exist, create it.

### Step 6: Approval Gate

After the report is created:

1. a human reviews the candidates
2. accepted candidates become a follow-up implementation task
3. rejected candidates are logged as noise, deferred, or intentionally task-local

Never auto-apply durable-memory changes from this skill alone.

## Output Format

```md
# Review Memory Promotion Report

## Summary

## Functional Checklist Candidates

## Technical Checklist Candidates

## Other Memory Promotions

## Rejected Or Deferred Signals

## Approval Decisions Needed

## Next Step
```

## Validation

- [ ] At least one stable source artifact was read
- [ ] Every promoted candidate has evidence anchors
- [ ] Every candidate names a target layer and suggested file
- [ ] Every checklist candidate names its reuse surface and trust rationale
- [ ] One-off or noisy findings were explicitly rejected or deferred
- [ ] Business-rule or security-heuristic candidates require explicit approval
- [ ] The workflow does not silently mutate durable source-of-truth files

## Related Files

- `.github/skills/repo-memory-promoter/SKILL.md`
- `.github/skills/review-code-changes/SKILL.md`
- `.github/skills/review-effectiveness/SKILL.md`
- `.github/docs/team-operating-model.md`
- `.github/docs/prompt-and-context.md`