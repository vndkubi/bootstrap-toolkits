---
name: review-effectiveness
description: "Review how well the generated Copilot configuration and spec-kit workflow are working in practice. Evaluates usage, drift, artifact quality, memory-promotion adoption, and whether teams are actually following the Spec -> Plan -> Tasks workflow."
---

# Review Effectiveness

Closes the feedback loop by reviewing whether the generated Copilot configuration and spec-driven workflow are helping the team in real work.

## When to Use

- After 1-2 sprints of using a generated Copilot configuration
- When users say agents or skills are not matching reality
- When spec artifacts exist but are not being used consistently
- During a periodic health check of the repo's Copilot setup

## Review Areas

### 1. Usage Signals

Collect evidence such as:

- which agents and skills are actually used
- whether `/specify-feature` or equivalent spec-first flows are used for non-trivial work
- whether feature workspaces under `specs/` are being created consistently
- which instructions or prompts are ignored
- whether `review-memory-promotion` reports are being created and accepted

### 2. Spec-Kit Adoption

Check whether the team is following the intended lifecycle:

- `spec.md`
- `plan.md`
- `research.md`
- `data-model.md`
- `contracts/`
- `quickstart.md`
- `tasks.md`

Red flags:

- non-trivial features bypass the spec pipeline
- `spec.md` exists but no downstream artifacts are maintained
- implementation diverges from spec artifacts without updates
- teams treat spec files as dead docs instead of active inputs

### 3. Drift

If `.github/.bootstrap-snapshot.json` exists, run `drift-detector` first and include its composite score and per-dimension breakdown in the effectiveness report. This provides quantitative drift data rather than relying on manual inspection alone.

Additionally, look for drift between:

- repo reality and generated instructions
- active workflows and available skills
- actual stack and stack-specific specialists retained
- spec artifacts and implementation behavior

### 4. Constitutional Compliance

Check:

- implementors still respect Phase -1 gates
- investigation and spec flows still enforce `[NEEDS CLARIFICATION]`
- spec-driven workflow is available and discoverable
- validation and cleanup rules are still being respected

### 5. Knowledge Sync Quality

Check:

- whether recurring review findings are being turned into approval-ready memory candidates
- accepted versus rejected promotion ratio
- stale-knowledge incidents where the same issue repeats despite promoted memory
- whether promoted knowledge is reducing repeated prompting or review churn

### 6. Learning Loop Metrics

When the correction-ledger workflow is active, additionally check:

- **Adoption**: whether `/promote-learning` or the `correction-ledger` skill is being used
- **Signal volume**: total correction signals found in ledger reports and review artifacts
- **Noise rate**: percentage of signals filtered as noise versus promoted to candidate status
- **Approval rate**: percentage of correction-ledger candidates approved versus rejected by humans
- **Repeat-issue rate**: whether the same correction pattern reappears after a candidate was promoted (indicates ineffective promotion)
- **Time to promotion**: average lag between first signal occurrence and human approval
- **Ledger freshness**: date of most recent correction-ledger report under `docs/reviews/correction-ledger-*.md`

#### Promotion Effectiveness

When ledger reports or review-memory-promotion reports include approved candidates, report:

- **Total promoted patterns**: count of tracked promotions
- **Effective**: patterns with zero post-promotion occurrences after 5+ sessions
- **Ineffective**: patterns still recurring after 5+ sessions (these need refinement)
- **Monitoring**: recently promoted patterns still collecting data
- **Success rate**: `effective / (effective + ineffective)` as a percentage
- **Top ineffective patterns**: up to 5 patterns with highest post-promotion recurrence, with suggestion to refine the promoted instruction

#### Semantic Grouping Quality

When correction-ledger reports include semantic merges:

- **Pre-merge pattern count**: raw aggregates before semantic merge
- **Post-merge pattern count**: aggregates after merge (lower is better grouping)
- **Merge ratio**: percentage reduction from semantic merge
- **False merge risk**: flag if merge ratio > 40% (may indicate grouping is too aggressive)

#### Agent-Specific Insights

When correction-ledger reports contain agent-specific entries:

- **Agents with profiles**: list of agents that have correction data
- **Top agent-specific patterns**: most frequent per-agent corrections
- **Global vs agent-specific distribution**: percentage split

Red flags:

- No correction-ledger reports exist despite repeated review corrections
- Noise rate exceeds 80% — thresholds may be too loose or signal quality is poor
- Approval rate below 20% — candidates are not actionable enough
- Same pattern reappears 3+ times after promotion — the promoted rule is not effective
- No ledger reports in the last 30 days despite active development
- Promotion success rate below 50% — promoted instructions are not reducing corrections

## Workflow

### Step 1: Gather Evidence

Use at least two sources:

- git history or file-change patterns
- user feedback
- existing feature workspaces in `specs/`
- retained agents/skills/instructions
- `docs/reviews/review-memory-promotion-*.md` or equivalent candidate reports when they exist

### Step 2: Evaluate Adoption And Gaps

Produce a practical assessment:

- what the team uses successfully
- what is unused or confusing
- what is missing
- where the spec-kit workflow breaks down
- whether memory promotion is adding signal or mostly creating noise

### Step 3: Recommend Targeted Adjustments

Prefer incremental fixes:

- refine or remove drifted instructions
- improve routing and prompts
- strengthen spec artifact requirements
- add or simplify missing workflow support
- tighten promotion thresholds or approval rules when memory candidates are noisy

### Step 4: Save Report

Save as `docs/reviews/copilot-effectiveness-<YYYY-MM-DD>.md`.

## Output Format

```md
# Copilot Effectiveness Review

## Usage Summary

## Spec-Kit Adoption

## Drift Findings

## Knowledge Sync Signals

## Learning Loop Metrics

| Metric | Value | Status |
|---|---|---|
| Correction signals collected | <N> | — |
| Noise filtered | <N> (<pct>%) | <ok/warn> |
| Candidates proposed | <N> | — |
| Candidates approved | <N> (<pct>%) | <ok/warn> |
| Repeat issues after promotion | <N> | <ok/warn> |
| Last ledger report | <date> | <ok/stale> |

### Promotion Effectiveness

| Metric | Value | Status |
|---|---|---|
| Total promoted | <N> | — |
| Effective | <N> | — |
| Ineffective | <N> | <ok/warn> |
| Monitoring | <N> | — |
| Success rate | <pct>% | <ok/warn> |

### Top Ineffective Patterns

| Pattern | Post-Promotion Count | Sessions Since | Action |
|---------|---------------------|----------------|--------|
| <key>   | <N>                 | <N>            | Refine/Escalate |

### Semantic Grouping Quality

| Metric | Value | Status |
|---|---|---|
| Pre-merge patterns | <N> | — |
| Post-merge patterns | <N> | — |
| Merge ratio | <pct>% | <ok/aggressive> |

### Agent-Specific Insights

| Agent | Patterns | Top Issue |
|-------|----------|-----------|
| <name> | <N>     | <summary> |

## Recommended Adjustments
1. ...
```

## Validation

- [ ] Review used at least two evidence sources
- [ ] Spec-kit adoption was evaluated explicitly
- [ ] Drift between repo reality and Copilot config was checked
- [ ] Recommended actions are incremental and prioritized
- [ ] Knowledge-sync or memory-promotion quality was evaluated when those workflows were retained
- [ ] Learning loop metrics were evaluated when correction-ledger and Layer 2 hooks are active
- [ ] Promotion effectiveness was reported when approved promotion history exists
- [ ] Semantic grouping quality was assessed when ledger reports include merges
- [ ] Agent-specific insights were reported when agent data is available in ledger reports
