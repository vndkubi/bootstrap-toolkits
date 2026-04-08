---
name: repo-memory-promoter
description: Scan .github/ config to find information worth promoting to a persistent memory layer. Identifies copilot-instructions.md bloat, broad instruction globs, underdocumented subsystems, and workflow gaps. Outputs a prioritised promotion report with concrete actions. Chat output only — does not write files or generate approval-ready candidate deltas.
---

# Repo Memory Promoter

## When to Use

Use this skill when:
- `copilot-instructions.md` is growing and agents are repeating context prompts
- New team members keep asking the same architecture questions
- Bootstrapped config is older than a few sprints and may have drifted
- You suspect context budget is being wasted on duplicated or over-broad instructions

**Do NOT use when:**
- You have just run bootstrap (config is fresh — nothing to promote yet)
- You want to document a specific subsystem (use `common-doc-generator` instead)
- You want to simulate context loading (use `context-assembly-simulator` instead)
- You already have stable review or investigation findings and need approval-ready memory candidates (use `review-memory-promotion` instead)

## Prerequisites

- `.github/` directory exists in workspace (post-bootstrap)
- Optional: `SOURCE-OF-TRUTH.md` from `source-of-truth-map` — will be used if present

---

## Workflow

### Step 1 — Load domain map (if available)

Check for `.github/SOURCE-OF-TRUTH.md`. If present, read it to get the domain → file mapping. This saves re-scanning.

If absent, proceed without it — heuristic scanning is still valid.

---

### Step 2 — Audit `copilot-instructions.md`

Read `.github/copilot-instructions.md`.

Measure its byte size. Note its major sections (H2 headers).

→ **H-1**: If file is > 3 KB, flag each top-level section as a potential extraction candidate. Extract sections that are clearly file-type-scoped (e.g. "Java conventions", "SQL rules") vs always-applicable (e.g. "Communication style").

---

### Step 3 — Audit instruction files

Scan `.github/instructions/*.instructions.md`.

For each file, extract the `applyTo` frontmatter value.

→ **H-2**: If `applyTo` is `**/*`, `**`, or missing → flag as over-broad. Suggest a narrower glob based on the file's content (e.g. if content is all about Java → `**/*.java`).

---

### Step 4 — Audit `docs/` coverage vs source directories

List all entries in `docs/` (filenames, not content).

Scan top-level source directories (e.g. `src/`, `app/`, `lib/`, packages in repo root). For each directory with ≥ 5 source files, check if a corresponding entry exists in `docs/`.

→ **H-3**: Flag any source subsystem with ≥ 5 files that has no matching doc entry.

Scan existing `docs/` files. Check if each contains the 7 standard section headers: `## Purpose`, `## Source of Truth`, `## Request / Data Flow`, `## Key Constraints`, `## Verification`, `## Common Failure Modes`, `## Related Files`.

→ **H-4**: Flag docs that are missing ≥ 3 of the 7 headers.

---

### Step 5 — Audit agent bodies for repeated references

Scan `.github/agents/*.agent.md`.

For each agent body, extract subsystem names, skill names, and workflow concepts referenced.

If a concept is referenced in ≥ 3 different agent files but does not have a doc in `docs/`, flag it.

→ **H-5**: Flag cross-agent repeated references with no corresponding common doc.

---

### Step 6 — Compile and prioritise

Collect all flagged candidates. Assign priority:

1. **High** — H-1 if copilot-instructions.md > 4 KB; H-5 if ≥ 4 agents reference the same concept
2. **Medium** — H-1 if 3-4 KB; H-2; H-3 if subsystem > 10 files
3. **Low** — H-3 if 5-10 files; H-4; H-5 if 3 agents

---

### Step 7 — Output promotion report

If no candidates found, output:

```
## Repo Memory Promotion Report
✅ No promotions needed. Config looks well-structured for current codebase size.
```

Otherwise, output the report in this format:

---

```markdown
## Repo Memory Promotion Report

### Summary
- **N candidates** found across M heuristics
- **Top priority**: [candidate title]
- Run `common-doc-generator` for any "Target layer: common doc" candidates

### Candidates

#### [1] <Candidate title>
**Heuristic**: H-N — <one-line reason>
**Priority**: High / Medium / Low
**Target layer**: `copilot-instructions.md` | `.instructions.md` | SKILL.md | common doc
**Suggested action**: <Concrete next step — include file name, applyTo value, or doc slug>

---

#### [2] ...
```

---

## Layer Mapping Reference

| Candidate type | Target layer |
|---|---|
| Universal rule (any file, any task) | `copilot-instructions.md` |
| File-type-scoped rule | `.instructions.md` + `applyTo` glob |
| Repeatable multi-step workflow | `SKILL.md` |
| Subsystem explanation / context | Common doc in `docs/` |

---

## Limitations

- Cannot detect patterns from prompt history (no access to conversation logs)
- H-3 / H-4 / H-5 may produce false positives for very small repos
- File size thresholds (3 KB, 5 files) are heuristics — adjust judgment based on actual content complexity
- This skill diagnoses promotion opportunities, but it does not create approval-ready candidate deltas from completed review findings
