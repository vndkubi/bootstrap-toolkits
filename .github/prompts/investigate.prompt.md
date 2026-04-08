---
agent: Dev Orchestrator
description: "Investigate a PBI, bug, performance issue, or codebase behavior. Produces an evidence-backed analysis with as-is flow, impact map, and risk notes."
---

# Investigate

Route this request to `@investigator`.

## Instructions

1. Parse the user's request to extract the investigation target: PBI, bug report, performance issue, or general "how does this work" question.
2. Load generated repo truth pack artifacts if they exist (`docs/00-repo-overview.md`, `docs/02-architecture-map.md`, module docs). If they do not exist yet, use the target repo's own README, build files, source tree, tests, and relevant bundle docs under `.github/docs/` before tracing code.
3. Produce an evidence-backed investigation report with:
   - as-is flow with file/line anchors
   - business rules and invariants discovered
   - likely change points
   - impact map (affected modules, shared components, downstream consumers)
   - risks and unknowns marked explicitly
4. If the investigation reveals a non-trivial, cross-module, shared-surface, or low-confidence change, recommend the spec pipeline (`/specify-feature`) or return to `@dev-orchestrator` for routing.
5. Recommend direct implementation (`/implement-feature`) only when the work is clearly narrow, single-module, low-risk, and already has explicit acceptance criteria plus user confirmation.

## Evidence Standard

Every claim must be backed by a code anchor, doc anchor, user confirmation, or explicitly marked `[ASSUMPTION]` / `[NEEDS CLARIFICATION]`.
