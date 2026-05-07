---
name: correction-ledger
description: "Aggregate trusted correction signals from accepted review fixes, explicit user redirections, and repeated reviewer findings into approval-ready promotion candidates. Use when running the learning loop, analyzing correction patterns, or feeding stable signals into review-memory-promotion. Keywords: correction ledger, learning loop, correction patterns, promotion candidates, recurring fixes."
---

# Correction Ledger

Aggregate recurring correction signals into approval-ready promotion candidates for `review-memory-promotion`.

## When to Use

- After review reports or explicit correction artifacts have accumulated repeated correction signals
- After completed code reviews have produced accepted fixes or repeated findings
- When users ask to "check for correction patterns", "run the learning loop", or "find recurring fixes"
- When `review-effectiveness` reports repeated-issue rates above zero

**Do NOT use when:**
- No review or correction source data exists yet — the ledger needs signals to aggregate
- A single one-off correction is the only signal — wait for recurrence or human confirmation
- You want to auto-edit durable rules — this skill produces candidates only

## Prerequisites

- Review reports under `docs/reviews/` contain accepted fixes or repeated findings, OR
- Another explicit correction-ledger source artifact exists
- The `review-memory-promotion` skill is available for downstream candidate delivery

## Source of Truth

- `specs/003-cross-repo-improvement-ideas/data-model.md` for CorrectionSignal, CorrectionAggregate, and PromotionCandidate models
- `.github/skills/review-memory-promotion/SKILL.md` for downstream candidate delivery

## Workflow

### Step 1: Collect Correction Signals

Read all available correction sources:

1. Review reports under `docs/reviews/` — extract accepted fixes and repeated findings
2. Investigation reports under `specs/` — extract structural gotchas surfaced during analysis
3. Explicit correction-ledger source artifacts supplied by the user

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

Group signals using a two-tier strategy: exact match first, then semantic merge.

#### 3a: Exact-Match Grouping

1. Normalize summaries to a `patternKey` (lowercase, strip file-specific details)
2. Count total occurrences (`occurrenceCount`)
3. Count trusted occurrences (`trustedCount`)
4. Extract keywords and file scope for each aggregate

#### 3b: Semantic Merge

After exact-match grouping, attempt to merge aggregates that represent the same underlying lesson with different wording:

1. For each aggregate, extract `semanticKeywords` — significant words from the summary after removing stop words
2. For each aggregate, extract `semanticFileScope` — normalized directories from evidence refs
3. Compare every pair of aggregates using:
   - **Keyword Jaccard**: `|intersection| / |union|` of semanticKeywords
   - **File Scope Overlap**: at least one shared entry in semanticFileScope
4. Merge when **both** conditions are met:
   - Keyword Jaccard ≥ 0.50 (50% keyword overlap)
   - At least one shared file scope entry
5. When merging:
   - Combine occurrences and trusted counts
   - Keep all `contributingVariants` (the different wording versions)
   - Use the highest-frequency variant as the primary `patternKey`
   - Union semanticKeywords and semanticFileScope

**Important**: If only keyword overlap (no shared file scope) or only file scope (no keyword overlap), aggregates remain separate. This prevents false merges.

#### 3c: Agent-Specific Grouping

When observations include an `agentName` field, additionally group by agent:

1. Produce **global aggregates** (across all agents) — same as above
2. Produce **per-agent aggregates** — group signals by `agentName`, then apply the same exact-match + semantic merge logic
3. Per-agent aggregates use `agentProfile: "<agentName>"` while global aggregates use `agentProfile: null`

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

### Step 5b: Include Effectiveness Tracking

After generating the ledger report, include a promotion-effectiveness section when prior approved promotions can be inferred from review-memory-promotion reports:

1. Read prior `docs/reviews/` promotion reports when available
2. For each pattern with status `promoted` or `approved`:
   - If not yet in the tracker, add it with `promotedAt`, `postPromotionOccurrences: 0`, `effectivenessStatus: "monitoring"`
   - If already in the tracker, update `postPromotionOccurrences` by counting how many times this pattern's correction signals appear **after** the `promotedAt` date
3. Compute effectiveness status for each tracked promotion:
   - `"effective"`: `postPromotionOccurrences == 0` after 5+ sessions since promotion
   - `"monitoring"`: fewer than 5 sessions since promotion
   - `"ineffective"`: `postPromotionOccurrences > 0` after 5+ sessions
   - `"reverted"`: manually marked by a human reviewer
4. Include the computed status in the current ledger report

Include a summary in the ledger report:

```md
## Post-Promotion Effectiveness

| Pattern | Promoted | Post-Promotion Occurrences | Status |
|---------|----------|---------------------------|--------|
| <key>   | <date>   | <count>                   | <status> |

- Effective: <N>
- Monitoring: <N>
- Ineffective: <N> (consider refining or escalating)
```

### Step 5c: Include Recurring Pattern Appendix

Include recurring patterns in the ledger report so they can be reviewed, compared over time, and promoted through `review-memory-promotion`:

1. Collect all aggregates (both global and per-agent) with `occurrenceCount >= 2`
2. Include entries with this shape:

```json
{
  "version": 1,
  "generatedAt": "<ISO-8601>",
  "patterns": [
    {
      "patternKey": "<key>",
      "summary": "<human-readable lesson>",
      "occurrenceCount": <N>,
      "relevantFiles": ["<dir-or-file-paths>"],
      "agentName": "<agent-name-or-null>",
      "promoted": <true|false>
    }
  ]
}
```

### Step 6: Route To Review-Memory-Promotion

Pass the candidate list to `review-memory-promotion` as a source artifact. The downstream skill handles the approval gate — corrections never self-promote.

## Output Format

```md
# Correction Ledger Report

> Generated: <date>
> Sources: review reports, explicit correction artifacts
> Signals collected: <N>
> Trusted signals: <N>
> Patterns found: <N> (after semantic merge: <N>)
> Candidates for promotion: <N>
> Noise filtered: <N>

## Promotion Candidates

### Candidate 1: <title>
- **Category**: <style|pattern|business|verification|safety>
- **Occurrences**: <N> (<M> trusted)
- **Wording variants**: <list of contributing variants if merged>
- **Evidence**: <links>
- **Proposed target**: <file>
- **Proposed change**: <delta>
- **Approval owner**: <owner>

## Agent-Specific Profiles

### Agent: <agentName>
| Pattern | Occurrences | Status |
|---------|-------------|--------|
| <key>   | <N>         | <status> |

## Post-Promotion Effectiveness

| Pattern | Promoted | Post-Promotion Occurrences | Status |
|---------|----------|---------------------------|--------|
| <key>   | <date>   | <count>                   | <status> |

- Effective: <N>
- Monitoring: <N>
- Ineffective: <N>

## Noise (Filtered)

### <pattern> — <reason for rejection>

## Next Step

Route candidates to `review-memory-promotion` or `/promote-review-memory` for approval.
```

## Verification Contract

- **Expected outcome**: A ledger report containing only candidates that meet the promotion threshold, with semantic grouping, effectiveness tracking, and recurring-pattern appendix
- **How to verify**:
  - Retries without human confirmation are excluded from candidates (may appear in noise section)
  - Every candidate has at least one trusted signal OR at least 3 total occurrences
  - Every candidate names a target file and proposed delta
  - Semantic merge only occurs when BOTH keyword Jaccard ≥ 0.50 AND shared file scope
  - Merged candidates list all contributing wording variants
  - Recurring pattern appendix lists patterns with ≥2 occurrences when present
  - Per-agent profiles are generated when agentName data is available
  - The report routes to `review-memory-promotion`, not to direct source edits
- **Stop condition**: Report generated and saved; do not proceed to edit durable files
- **Escalation**: If fewer than 0 candidates qualify, report that the signal pool is too small and suggest waiting for more session data

## Validation

- [ ] Only trusted signals or recurring patterns (3+) become candidates
- [ ] Retry-only signals are filtered to noise unless recurrence threshold is met
- [ ] Semantic merge requires both keyword AND file-scope overlap
- [ ] Merged aggregates list all contributing variants
- [ ] Per-agent profiles are generated alongside global aggregates
- [ ] Every candidate has evidence anchors
- [ ] Every candidate names a target layer and suggested file
- [ ] Recurring pattern appendix lists ≥2 occurrence patterns when present
- [ ] No durable source files were modified by this skill
- [ ] The report was saved under `docs/reviews/`
- [ ] Candidates were routed to `review-memory-promotion` for approval

## Common Failure Modes

- Treating a single retry as a promotion-worthy signal
- Promoting raw transcript content instead of a reusable lesson
- Bypassing the approval gate and editing durable files directly
- Running the ledger before any observations exist
- Counting bot or system signals as trusted without human acceptance
- Semantic merge with only keyword overlap but no file-scope overlap (false merge)
- Semantic merge with only file-scope overlap but no keyword overlap (false merge)
- Omitting recurring patterns from the ledger report

## Related Files

- `.github/skills/review-memory-promotion/SKILL.md`
- `.github/skills/review-effectiveness/SKILL.md`
- `.github/prompts/promote-learning.prompt.md`
- `docs/reviews/`
