---
name: impact-analysis
description: Map the likely blast radius of a proposed change across code paths, APIs, schemas, data flows, consumers, tests, operations, and repositories. Use after PBI discovery and before implementation, especially for public contracts, cross-module behavior, migrations, or shared libraries. Do not use as a substitute for code review after implementation.
---

# Impact Analysis

Build a bounded, evidence-backed change map before code is edited.

Apply `.ai-team/protocols/model-neutral-execution.md`. Under `compatibility-strict`, execute only this skill, keep the search bounded, and use the exact output contract.

## Workflow

1. Start from the acceptance IDs and locate the narrowest runtime entry points.
2. Trace upstream callers, downstream consumers, persistence, external contracts, configuration, observability, and deployment paths.
3. Search sibling modules and repositories only when a concrete dependency boundary points there.
4. Classify every impact as `CONFIRMED`, `INFERRED`, or `UNKNOWN`; include file, symbol, command, or document evidence.
5. Identify compatibility risks for APIs, schemas, events, permissions, concurrency, retries, and rollback.
6. Map each acceptance ID and material risk to a verification layer: unit, integration, contract, end-to-end, migration, or operational check.
7. Recommend the smallest safe change boundary and list exclusions.

## Output Contract

Use `.ai-team/templates/delivery/impact-analysis.md` and return:

- Scope and entry points
- Confirmed impact map
- Possible impact requiring verification
- Public contract and data compatibility matrix
- Test and observability impact
- Rollout and rollback considerations
- Unknowns, confidence, and next evidence actions

Do not claim complete coverage when a repository, consumer, generated artifact, or runtime path could not be inspected.
