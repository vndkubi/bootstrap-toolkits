---
name: promote-review-memory
description: "Learn from a completed PR review or PR discussion by creating or updating functional and technical checklist candidates from accepted human reviewer reasoning."
agent: Code Reviewer
---

# Promote Review Memory

Use the `review-memory-promotion` skill to harvest durable review knowledge from a completed PR review, resolved discussion, or accepted fix notes.

## Inputs

**PR / Branch / Review reference**: ${input:reference}
<!-- Examples: "PR #1842", "feature/billing-rewrite vs main", "review report 2026-04-09" -->

**Source artifacts**: ${input:artifacts}
<!-- Examples: "final review report + resolved PR discussion", "review report + accepted fix notes", "PR discussion export only" -->

**Scope** (leave blank if cross-cutting): ${input:scope}
<!-- Examples: "payments", "API compatibility", "cross-module review" -->

**Approval owner**: ${input:approvalOwner}
<!-- Examples: "platform leads", "payments team", "architecture guild" -->

## Instructions

1. Read the completed review report, PR discussion summary, resolved threads, and accepted-fix notes when available.
2. Exclude comments from GitHub Copilot, bots, or system accounts unless a human reviewer explicitly accepts, repeats, or fixes the same concern.
3. Focus on why the human reviewer commented: violated invariant, missing verification, contract drift, migration risk, scale risk, or architecture guardrail.
4. Load existing checklist packs under `docs/reviews/checklists/` when present and decide whether each candidate should create, append, merge, or defer.
5. Produce approval-ready functional checklist candidates, technical checklist candidates, and any other durable memory promotions.
6. Reject one-off style nits, transient branch details, and unresolved debates.

## Rules

- Do not treat raw PR discussion as self-validating truth.
- Prefer accepted human reviewer reasoning over copied wording.
- Keep checklist candidates separate from other memory promotions.
- Never auto-edit durable docs from this workflow; produce candidate deltas only.
- Mark every uncertain claim as `[ASSUMPTION]` or `[NEEDS CLARIFICATION]`.