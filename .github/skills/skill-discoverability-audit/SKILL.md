---
name: skill-discoverability-audit
description: "Audit all SKILL.md files for runtime discoverability quality. Checks description keyword coverage, argument documentation, user-invocable vs model-invocable alignment, routing table reachability, and progressive loading compatibility. Produces a scored report with actionable fixes. Use after bootstrap or when skills seem undiscoverable. Keywords: skill audit, discoverability, description quality, skill routing, keyword coverage, model invocation."
---

# Skill Discoverability Audit

Audit all skills in `.github/skills/` to verify they are discoverable at runtime — both by the VS Code model's skill-matching algorithm and by users reading routing tables.

> **Must-pass gate**: For retained skills (those surviving cleanup), all must score B or higher. Skills scoring C or D in the post-bootstrap audit must be rewritten before the pipeline is considered complete. This is enforced in `validate-bootstrap-output` Tier 3.

## When to Use

- After bootstrap generates new skills
- When users report "I didn't know that skill existed"
- When a skill is never invoked despite matching scenarios
- After adding or renaming skills
- As part of `validate-bootstrap-output` Tier 2 quality checks
- Keywords: skill audit, discoverability, description quality, undiscoverable skill

---

## Background: How VS Code Discovers Skills

VS Code matches user requests to skills primarily via:

1. **Description field** (frontmatter `description:`) — semantic match against user prompt
2. **Skill name** (directory name) — exact keyword match
3. **Agent routing tables** — explicit signal → skill mapping in agent bodies
4. **Conversation context** — nearby mentions of skill names or keywords

The description is the single most important discoverability signal. A vague or generic description means the skill is invisible to the model even when the user's request is a perfect match.

---

## Step 1: Collect All Skills

Scan `.github/skills/*/SKILL.md`.

For each skill, extract:
- Directory name (= skill name)
- Frontmatter `name` field
- Frontmatter `description` field
- First heading and opening paragraph (purpose summary)
- "When to Use" section content (if present)
- "Keywords:" line from description (if present)

---

## Step 2: Check Description Quality

Score each skill description against these criteria:

| # | Criterion | Weight | Pass condition |
|---|-----------|--------|----------------|
| D-1 | Length | 2 | 80–1024 characters (VS Code max is 1024) |
| D-2 | Action verb lead | 1 | Starts with an action verb (Scan, Generate, Analyze, Audit, Create, Validate, Extract, Review) |
| D-3 | Output mention | 2 | Describes what the skill produces (report, file, diagram, matrix, config) |
| D-4 | Trigger keywords | 3 | Contains 3+ trigger keywords that match natural user requests |
| D-5 | Use-when sentence | 2 | Contains "Use when" or "Use after" with a concrete scenario |
| D-6 | Keywords suffix | 1 | Ends with `Keywords: ...` for explicit semantic anchoring |
| D-7 | No generic filler | 1 | Does not contain "this skill", "the project", "your codebase" without specifics |

**Additional quality signals** (informational, not scored):

| Signal | Check |
|--------|-------|
| Anti-keywords | Description does not contain words that attract false-positive matches (e.g., a testing skill should not mention "deploy") |
| Invocation mode hint | Description implies how the skill is invoked: by user prompt ("Use when..."), by agent delegation, or by pipeline only |

**Scoring**: Sum weights of passing criteria. Max = 12.

| Score | Rating | Action |
|-------|--------|--------|
| 10–12 | A (Excellent) | No action needed |
| 7–9 | B (Good) | Minor improvements suggested |
| 4–6 | C (Needs work) | Rewrite description recommended |
| 0–3 | D (Poor) | Rewrite mandatory — skill is effectively invisible |

---

## Step 3: Check Name-Description Alignment

For each skill, verify:

- Directory name words appear in the description (e.g., `context-assembly-simulator` → description mentions "context", "assembly" or "simulate")
- No mismatch where the name implies one function but description describes another

Flag misalignment as **Warning**.

---

## Step 4: Check Routing Table Reachability

Scan routing tables in:
- `.github/agents/conductor.agent.md`
- `.github/agents/dev-orchestrator.agent.md`

For each skill, determine:

| Reachability | Definition |
|---|---|
| **Direct** | Skill name appears in a routing table row |
| **Indirect** | Skill's parent category (e.g., "Pack A audit skills") appears in a routing row |
| **Unreachable** | No routing table mentions the skill name or its category |

Flag **Unreachable** skills as **Warning** — they rely entirely on description matching, which is less reliable.

---

## Step 5: Check When-to-Use Section

For skills with a "When to Use" section, verify:

- At least 3 concrete scenarios listed
- Scenarios use language a user would actually type (not internal jargon)
- Keywords line exists and contains 3+ terms

For skills missing a "When to Use" section: flag as **Info** — not mandatory but improves discoverability.

---

## Step 6: Cross-Check with Agent Skills References

Scan all `.agent.md` files for skill references (in body text or `skills:` frontmatter if present).

Build a skill reference map:

| Skill | Referenced by agents |
|-------|---------------------|
| `generate-unit-tests` | test-specialist, mobile-test-specialist |
| `context-assembly-simulator` | (none — invoked directly) |

Flag skills that are:
- Referenced by an agent whose description does not mention the skill's domain → **Warning** (confusing context)
- Not referenced by any agent AND unreachable via routing → **Error** (fully invisible)

---

## Step 7: Consume or Generate .skill-index.json

If `.github/.skill-index.json` exists (generated by Phase 12 Runtime Compilation):

1. Read the index and use its pre-computed metadata (`descriptionLength`, `hasKeywordsSuffix`, `triggerKeywords`, `routedBy`, `referencedByAgents`, `invocationMode`)
2. Cross-validate: compare the index data against the live SKILL.md files to detect drift
3. Flag discrepancies as **Warning** (e.g., skill-index says `hasKeywordsSuffix: true` but the current SKILL.md removed it)

If `.skill-index.json` does not exist, output a recommendation:
> "Consider running Phase 12 (Runtime Compilation) to generate `.skill-index.json` for faster future audits."

---

## Step 8: Output Report

```markdown
## Skill Discoverability Audit Report

**Skills scanned**: [count]
**Date**: [timestamp]

### Summary

| Rating | Count | Skills |
|--------|-------|--------|
| A (Excellent) | 8 | generate-unit-tests, investigate-pbi, ... |
| B (Good) | 5 | impact-analysis, ... |
| C (Needs work) | 3 | ... |
| D (Poor) | 1 | ... |

### Detailed Findings

#### [skill-name] — Score: X/12 (Rating)

| Criterion | Status | Notes |
|-----------|--------|-------|
| D-1 Length | ✅ | 245 chars |
| D-2 Action verb | ❌ | Starts with "A tool for..." — use active verb |
| D-3 Output mention | ✅ | "Produces a structured report" |
| D-4 Trigger keywords | ⚠️ | Only 2 keywords — add more natural-language triggers |
| D-5 Use-when | ✅ | "Use when reviewing specs" |
| D-6 Keywords suffix | ❌ | Missing Keywords: line |
| D-7 No filler | ✅ | Clean |

**Routing**: Direct (conductor row 3)
**Agent references**: spec-reviewer, code-reviewer
**Suggested description rewrite**: (only if score < 7)

> "Scan all specification files for completeness gaps, security vulnerabilities, testability issues, and ambiguous acceptance criteria. Produces a severity-rated review report with actionable findings. Use when reviewing PRDs, user stories, or API contracts before development. Keywords: spec review, requirements review, security assessment, testability check."

### Routing Coverage

| Skill | Routing | Fix needed |
|-------|---------|------------|
| context-assembly-simulator | Indirect (Pack A row) | ✅ OK |
| common-doc-generator | Indirect (Pack B row) | ✅ OK |
| generate-adr | Unreachable | Add routing row or improve description |

### Recommendations

1. **Rewrite descriptions** for [N] skills scoring C or D
2. **Add routing rows** for [N] fully unreachable skills
3. **Add Keywords: suffix** to [N] descriptions missing it
```

---

## Verification

After applying fixes:

- [ ] All **retained** skills (surviving cleanup) score B or higher — this is a must-pass gate
- [ ] Zero skills are both unreachable AND unreferenced
- [ ] All descriptions are within 80–1024 character limit
- [ ] Keywords: suffix exists on all skills
- [ ] If `.skill-index.json` exists, no drift detected between index and live SKILL.md files

---

## Common Failure Modes

| Failure | Cause | Fix |
|---------|-------|-----|
| Skill never invoked | Description too vague or missing keywords | Rewrite with action verb + output + keywords |
| Wrong skill invoked | Two skills have overlapping descriptions | Differentiate trigger keywords and add explicit scope |
| Skill invoked for wrong task | Name suggests broader scope than actual function | Narrow description, add "Do NOT use for" in When to Use |
| User doesn't know skill exists | Not in routing table and weak description | Add routing row in conductor/dev-orchestrator |
