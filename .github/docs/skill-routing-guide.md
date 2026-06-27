# Skill Routing Guide

Some skills sit close together in capability space. This guide is the tie-breaker
when more than one skill could plausibly trigger. Each cluster lists the skills,
the single question that separates them, and the normal hand-off order.

This file is reference material — load it only when disambiguating overlapping
skills or when a routing decision is unclear.

---

## Cluster 1 — Implementation & TDD

All of these "write code to satisfy a requirement", but at different scopes and
entry conditions.

| Skill | Use it when | Scope |
|-------|-------------|-------|
| `orchestrate-development` | A well-bounded feature or bug fix needs investigate → implement → test → document in one thread, with no spec workspace yet | Default entry for clear, single-thread work |
| `implement-feature` | A reviewed spec workspace already exists (`specs/<feature>/spec.md`, `plan.md`, `tasks.md`) and you want execution to follow approved tasks | Executes an approved plan |
| `autorun` | A scoped PBI should run end-to-end through the full 7-phase pipeline on a dedicated `autorun/<PBI>` branch with durable evidence | Heavy, branch-isolated, evidence-producing |
| `goal-tdd-engineer-loop` | The work needs repeated implementation/evaluation cycles driven by an active goal, with trace/eval artifacts and a ranked handoff | Iterative, goal-driven |
| `tdd-implement-loop` | You already have a RED test suite and need a bounded red→green→refactor engine to make it green | Inner loop — called by the others |

**Decision order:**
1. Vague / high-risk / multi-module? → go to the spec pipeline first
   (`specify-feature` → `plan-implementation` → `generate-tasks`), then `implement-feature`.
2. Clear and bounded, no spec workspace? → `orchestrate-development`.
3. Want full branch-isolated evidence for a PBI? → `autorun`.
4. Goal-driven, needs repeated eval cycles? → `goal-tdd-engineer-loop`.
5. Already holding a red suite? → `tdd-implement-loop`.

`tdd-implement-loop` is **not** a top-level entry point — `autorun` (Phase 5) and
`implement-feature` (after the test-first checkpoint) both delegate to it. Invoke
it directly only when a human hands you a red suite and says "make it green".

---

## Cluster 2 — Learning, Memory & Promotion

All of these "turn signals into durable knowledge", but they differ by **input
source** and **stage in the loop**.

| Skill | Input it consumes | Output |
|-------|-------------------|--------|
| `review-effectiveness` | A bootstrapped config after 1–2 sprints of real use | Diagnostic: which agents/skills/instructions are (not) working, repeated-issue rates |
| `correction-ledger` | Accepted review fixes, explicit user redirections, recurring findings | Scored, deduplicated promotion candidates |
| `review-memory-promotion` | Review/investigation findings + qualified ledger candidates | Approval-ready repo-memory and checklist entries |
| `repo-memory-promoter` | The existing `.github/` config itself (drift, bloat, repeated prompts) | Candidates to extract into a persistent memory layer |

**Decision order (the loop):**
1. "Is our Copilot setup actually working?" → `review-effectiveness` (diagnose first).
2. "Aggregate the corrections / run the learning loop." → `correction-ledger`.
3. "Promote these findings into memory / build a pitfall pack." → `review-memory-promotion`.
4. Separate trigger: "Our `copilot-instructions.md` is bloated / agents keep
   repeating context." → `repo-memory-promoter` (config hygiene, not review-driven).

The prompts `/promote-learning` and `/promote-review-memory` are entry points into
steps 2–3 of this loop; they are not separate capabilities.

---

## Cluster 3 — Skill Pack Direction

| Skill | Direction |
|-------|-----------|
| `skill-pack-import` | Inbound only — import and audit packs from a Git URL or local path |
| `skill-pack-export` | Outbound only — publish local skills into a shareable pack manifest |
| `upgrade-skill-pack` | Compare a current manifest to a newer one and report added/removed/changed skills |

"Export", "publish", or "share skills outward" → `skill-pack-export`.
"Import", "install", or "audit installed packs" → `skill-pack-import`.

---

## Maintaining this guide

When you add a skill that overlaps an existing one, add it to the relevant cluster
here and make sure its `description` keywords do not claim another skill's primary
trigger. The `skill-discoverability-audit` and `instruction-conflict-detector`
skills can surface keyword collisions automatically.
