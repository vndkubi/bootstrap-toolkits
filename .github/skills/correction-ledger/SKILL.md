---
name: correction-ledger
description: "Aggregate trusted correction signals from accepted review fixes, explicit user redirections, and repeated reviewer findings into approval-ready promotion candidates. Use when running the learning loop, analyzing correction patterns, or feeding stable signals into review-memory-promotion. Keywords: correction ledger, learning loop, correction patterns, promotion candidates, recurring fixes."
---

# Correction Ledger

Aggregate recurring correction signals into approval-ready promotion candidates for `review-memory-promotion`.

## When to Use

- After several sessions have accumulated observations in `.memory/observations.jsonl`
- After completed code reviews have produced accepted fixes or repeated findings
- When users ask to "check for correction patterns", "run the learning loop", or "find recurring fixes"
- When `review-effectiveness` reports repeated-issue rates above zero

**Do NOT use when:**
- No Layer 2 memory data exists yet — the ledger needs observations to aggregate
- A single one-off correction is the only signal — wait for recurrence or human confirmation
- You want to auto-edit durable rules — this skill produces candidates only

## Prerequisites

- `.memory/observations.jsonl` exists with at least some correction or accepted_fix records, OR
- Review reports under `docs/reviews/` contain accepted fixes or repeated findings
- The `review-memory-promotion` skill is available for downstream candidate delivery

## Source of Truth

- `specs/003-cross-repo-improvement-ideas/data-model.md` for CorrectionSignal, CorrectionAggregate, and PromotionCandidate models
- `specs/003-cross-repo-improvement-ideas/contracts/memory-observation.schema.json` for observation record shape
- `.github/skills/review-memory-promotion/SKILL.md` for downstream candidate delivery

## Workflow

### Step 1: Collect Correction Signals

Read all available correction sources:

1. `.memory/observations.jsonl` — filter for `type` in `correction`, `accepted_fix`, `review_finding`
2. Review reports under `docs/reviews/` — extract accepted fixes and repeated findings
3. Investigation reports under `specs/` — extract structural gotchas surfaced during analysis

For each qualifying record, build a CorrectionSignal:

| Field | How to populate |
|---|---|
| `signalId` | Generate from source + timestamp hash |
| `category` | Classify as `style`, `pattern`, `business`, `verification`, or `safety` |
| `source` | Map to `user_redirect`, `accepted_fix`, `review_finding`, or `retry` |
| `trusted` | `true` if source is `user_redirect`, `accepted_fix`, or `review_finding`; `false` if `retry` only |
| `summary` | Extract the reusable lesson, not the raw transcript |
| `evidenceRefs` | Link to the source file, review report, or observation line |
| `countTowardsPromotion` | `true` unless source is `retry` with no human confirmation |

### Step 2: Filter Untrusted Signals

Apply the trust filter:

- **Trusted signals**: accepted review fixes, explicit user redirections, repeated reviewer findings
- **Weak signals**: raw retries with no human confirmation

Rules:
- Retries alone (`source: retry`, `trusted: false`) are recorded for frequency counting but are **not** promotion-eligible by themselves
- A retry becomes trusted only when:
  - A human later confirms the same correction, OR
  - The same pattern recurs across 3+ sessions from any source mix
- Never count a single retry as evidence for promotion

### Step 3: Aggregate Into Patterns

Group signals by normalized lesson content:

1. Normalize summaries to a `patternKey` (lowercase, strip file-specific details)
2. Count total occurrences (`occurrenceCount`)
3. Count trusted occurrences (`trustedCount`)
4. Assign status based on thresholds

#### Promotion Thresholds

| Condition | Status |
|---|---|
| `trustedCount >= 1` AND `occurrenceCount >= 1` | `candidate` |
| `trustedCount == 0` AND `occurrenceCount >= 3` | `candidate` (recurrence-based) |
| `trustedCount == 0` AND `occurrenceCount < 3` | `noise` |
| Human approves | `approved` |
| Human rejects | `rejected` |
| Applied to durable source | `promoted` |

A pattern qualifies as a `candidate` when it has **at least one trusted signal** OR **at least three total occurrences** (recurrence threshold).

### Step 4: Build Promotion Candidates

For each aggregate with status `candidate`, produce a PromotionCandidate:

| Field | How to populate |
|---|---|
| `candidateId` | Generate unique identifier |
| `title` | Short, actionable title from the pattern |
| `targetLayer` | Map category to the smallest owning surface |
| `targetFile` | Suggest specific `.instructions.md`, checklist, or copilot-instructions target |
| `proposedDelta` | Write the concrete rule, checklist item, or instruction change |
| `approvalOwner` | Suggest based on target layer ownership |
| `approvalRequired` | Always `true` |
| `promotionStatus` | `pending` |

#### Target Layer Mapping

| Category | Default Target |
|---|---|
| `style` | `.github/instructions/<stack>.instructions.md` |
| `pattern` | `.github/instructions/<scope>.instructions.md` |
| `business` | `.github/copilot-instructions.md` or domain instruction |
| `verification` | Skill or agent verification contract |
| `safety` | `.github/instructions/security.instructions.md` |

### Step 5: Generate Ledger Report

Save the report as: `docs/reviews/correction-ledger-<YYYY-MM-DD>.md`

### Step 6: Route To Review-Memory-Promotion

Pass the candidate list to `review-memory-promotion` as a source artifact. The downstream skill handles the approval gate — corrections never self-promote.

## Output Format

```md
# Correction Ledger Report

> Generated: <date>
> Sources: observations.jsonl, review reports
> Signals collected: <N>
> Trusted signals: <N>
> Patterns found: <N>
> Candidates for promotion: <N>
> Noise filtered: <N>

## Promotion Candidates

### Candidate 1: <title>
- **Category**: <style|pattern|business|verification|safety>
- **Occurrences**: <N> (<M> trusted)
- **Evidence**: <links>
- **Proposed target**: <file>
- **Proposed change**: <delta>
- **Approval owner**: <owner>

## Noise (Filtered)

### <pattern> — <reason for rejection>

## Next Step

Route candidates to `review-memory-promotion` or `/promote-review-memory` for approval.
```

## Verification Contract

- **Expected outcome**: A ledger report containing only candidates that meet the promotion threshold
- **How to verify**:
  - Retries without human confirmation are excluded from candidates (may appear in noise section)
  - Every candidate has at least one trusted signal OR at least 3 total occurrences
  - Every candidate names a target file and proposed delta
  - The report routes to `review-memory-promotion`, not to direct source edits
- **Stop condition**: Report generated and saved; do not proceed to edit durable files
- **Escalation**: If fewer than 0 candidates qualify, report that the signal pool is too small and suggest waiting for more session data

## Validation

- [ ] Only trusted signals or recurring patterns (3+) become candidates
- [ ] Retry-only signals are filtered to noise unless recurrence threshold is met
- [ ] Every candidate has evidence anchors
- [ ] Every candidate names a target layer and suggested file
- [ ] No durable source files were modified by this skill
- [ ] The report was saved under `docs/reviews/`
- [ ] Candidates were routed to `review-memory-promotion` for approval

## Common Failure Modes

- Treating a single retry as a promotion-worthy signal
- Promoting raw transcript content instead of a reusable lesson
- Bypassing the approval gate and editing durable files directly
- Running the ledger before any observations exist
- Counting bot or system signals as trusted without human acceptance

## Related Files

- `.github/skills/review-memory-promotion/SKILL.md`
- `.github/skills/review-effectiveness/SKILL.md`
- `.github/prompts/promote-learning.prompt.md`
- `.memory/observations.jsonl`
- `docs/reviews/`
