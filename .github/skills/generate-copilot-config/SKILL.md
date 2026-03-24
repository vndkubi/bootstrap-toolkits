---
name: generate-copilot-config
description: "Generate a project-specific GitHub Copilot configuration through a scan, classification, domain analysis, repo-truth-pack generation, artifact generation, and validation pipeline."
---

# Generate Complete Copilot Configuration

This skill is the **single source of truth** for the bootstrap pipeline. Prompts and orchestrator agents should reference this file instead of redefining the process.

## Portable Bundle Rule

The copied `.github/` folder must work as a self-contained bootstrap bundle.

- Anything required to run `/bootstrap-copilot` after copying must live inside `.github/`.
- Runtime help and operator guidance belong in `.github/docs/`.
- The target repo's own `README.md`, source code, tests, build files, and docs remain valid scan inputs.

## Repo Identity Guardrail

Determine what the current repository actually is from target-repo evidence, not from the copied bootstrap bundle alone.

- Do not classify the repo as the `copilot-bootstrap` source repository just because `.github/` contains toolkit assets.
- Treat copied bundle files as bootstrap inputs that must be rewritten, narrowed, or deleted later.
- Use root-level `README.md`, package/build files, source folders, tests, CI, and existing docs as the primary identity evidence.
- Only apply a toolkit-source-repo exception when evidence outside the copied bundle clearly proves the repo truly is that source repo.

## Progressive Disclosure Model

Generated repository memory should follow three layers:

1. **Global truth**: short, durable repo-wide context
2. **Module / domain truth**: scoped ownership, rules, and boundaries
3. **Task truth**: workflow docs, ADRs, temporary plans, and investigation artifacts

The point is not to generate the largest doc set possible. The point is to generate the smallest doc set that gives Copilot Chat reliable anchors for the current repo size.

## Pipeline Overview

1. **Scan**: deep codebase analysis
2. **Classify**: repo size, complexity, and context risk
3. **Domain**: repo truth pack generation
4. **Generate core instructions**
5. **Generate domain instructions**
6. **Generate language/framework instructions**
7. **Generate templates**
8. **Generate agents**
9. **Generate skills**
10. **Generate prompts**
11. **Generate hooks and optional workflows**
12. **Validate**
13. **Review or generate devcontainer**
14. **Write manifest, cleanup, and summarize**

---

## Phase 1: Scan

Build an evidence-backed picture of the target repo.

### Minimum scan requirements

- Establish repo identity from root-level project evidence before using copied bundle text as context.
- Read all relevant build files, not just the root.
- Detect exact runtime/tooling versions where possible.
- Sample enough real source files per domain or module.
- Read representative service/use-case files.
- Read representative test files.
- Identify external integrations, queues, schedulers, and background jobs.
- Check CI/CD, container, and devcontainer files.

### Required output

Produce a structured scan summary with:

- repo identity and why
- languages and framework versions
- build/test/lint commands discovered
- module inventory
- domain or bounded-context map
- coding and test conventions
- infrastructure dependencies

If evidence is weak, say so. Do not fill gaps with generic stack assumptions.
Do not let copied bootstrap text override stronger evidence from the target repo.

---

## Phase 2: Classify

### Project class

| Class | Typical shape | Generation strategy |
|---|---|---|
| Small | tiny codebase, 1 module | keep docs merged and minimal |
| Standard | moderate size, limited modules | generate core doc set plus orchestration assets |
| Enterprise | many modules, domains, or shared components | generate full doc layers plus scoped guidance |
| Framework / Library | reusable package or platform | emphasize API stability, compatibility, contributor guidance |

Classification must happen before generation.
Classification must use target-repo evidence, not copied toolkit inventory.

### Context risk

Estimate context risk immediately after classification:

- **Low**: few modules, low domain spread
- **Medium**: multiple modules or broad domain spread
- **High**: many modules, many domains, or likely context overflow

For high context risk, stop after discovery and ask whether to continue in a new session using the saved checkpoint.

### Local indexing guardrail

GitHub Copilot local workspace indexing has a practical limit around **2,500 files**.

- `<= 2,000 files`: normal workflow
- `2,001-2,500 files`: warn that indexing is near the limit
- `> 2,500 files`: warn that `#codebase` may degrade and recommend remote indexing plus narrower `#file` usage

### Large-repo default strategy

For repos above the indexing limit or with very high context risk, default to:

1. **Discovery first**: stack map, module map, glossary, workflows, verification commands
2. **Minimal repo memory next**: generate only the truth-pack artifacts first
3. **Scoped execution after that**: work per domain or module instead of whole-repo-first generation

Do not market large-repo bootstrap as full automation. Position it as progressive discovery plus verified repo memory.

### Progressive disclosure by repo size

Generate docs based on actual repo scale:

#### Small

Generate only:

- `.github/copilot-instructions.md`
- `docs/00-repo-overview.md`
- `docs/03-verification-runbook.md`

For small repos, it is acceptable to fold glossary and architecture notes into `00-repo-overview.md`.
Do not keep unused module, workflow, integration, ADR, or stack-specific template files in the final generated bundle.

#### Standard / Medium

Generate the core common docs:

- `docs/00-repo-overview.md`
- `docs/01-business-glossary.md`
- `docs/02-architecture-map.md`
- `docs/03-verification-runbook.md`
- `docs/04-engineering-rules.md`
- `docs/05-common-failure-modes.md`

Delete copied bootstrap assets for repo sizes or stacks that were not selected.

#### Large / Enterprise

Generate the core common docs plus scoped layers:

- `docs/modules/README.md`
- `docs/workflows/README.md`
- `docs/integrations/README.md`
- `docs/decisions/README.md`
- `docs/modules/<module>.md` for the highest-value modules first
- `docs/workflows/<workflow>.md` for the highest-value workflows first
- `docs/integrations/<integration>.md` for the highest-risk external systems first
- `docs/decisions/ADR-xxxx-<title>.md` when architecture decisions are discoverable

For enterprise repos, add ownership, review cadence, dependency direction, integration boundaries, and per-domain verification notes where evidence exists.
Keep the generated output incremental. Do not preserve generic toolkit files for modules, stacks, or prompts that the target repo does not use.

---

## Phase 3: Domain and Repo Truth Pack

This phase determines whether later agents can make safe business-aware decisions.

Without this phase, agents can still infer technical patterns, but they cannot safely claim business truth.

### Evidence rule

Every generated business rule, workflow, invariant, ownership note, or domain claim must have one of:

- a code anchor
- a document anchor
- direct user confirmation
- `[ASSUMPTION]`
- `[NEEDS CLARIFICATION]`

Do not present inferred domain behavior as confirmed fact.

### Repo truth pack outputs

Generate these artifacts:

1. `.github/.phase3-checkpoint.md`
2. `docs/00-repo-overview.md`
3. `docs/03-verification-runbook.md`

For Standard and Enterprise repos, also generate:

4. `docs/01-business-glossary.md`
5. `docs/02-architecture-map.md`
6. `docs/04-engineering-rules.md`
7. `docs/05-common-failure-modes.md`

For multi-module repos, also generate:

8. `.github/module-dependency-map.json`
9. `.github/MODULE-ARCHITECTURE.md`

For Large and Enterprise repos, also generate:

10. `docs/modules/README.md`
11. `docs/workflows/README.md`
12. `docs/integrations/README.md` when external systems matter
13. `docs/decisions/README.md`

Then expand to the highest-priority module and workflow docs first, not the entire universe at once.

### `.github/.phase3-checkpoint.md`

Keep this compact. It should include:

- classification
- stack and versions
- module list
- domain list
- context risk
- top glossary terms
- key business rules
- key workflows
- verification commands

This file is the recovery point for later sessions.

### `docs/00-repo-overview.md`

This is the primary human-and-agent entry point.

Include:

- repo purpose
- top-level stack summary
- top-level module map
- source-of-truth map
- what to read first before changing code
- current context pressure or repo-scale warnings
- unknowns / assumptions

For small repos, it may absorb glossary and architecture notes.

### `docs/01-business-glossary.md`

Include:

- domain terms and definitions
- key workflows and states
- business invariants
- ownership boundaries
- open questions and assumptions
- evidence anchors for each significant claim

### `docs/02-architecture-map.md`

Include:

- module and layer map
- ownership boundaries
- dependency direction
- shared libraries and cross-cutting components
- entry points
- integration or external-system touchpoints where known
- unknowns / assumptions

Use `.github/module-dependency-map.json` and `.github/MODULE-ARCHITECTURE.md` as supporting machine/human references when the repo is multi-module.

### `docs/03-verification-runbook.md`

Include:

- actual build commands
- actual test commands
- actual lint/format/static-analysis commands
- environment prerequisites
- non-runnable or flaky surfaces
- suggested changed-scope verification paths

This runbook prevents downstream agents from promising verification the repo cannot actually support.

### `docs/04-engineering-rules.md`

Include durable rules that many tasks need:

- layering rules
- API compatibility rules
- migration rules
- logging and security conventions
- testing conventions
- naming or packaging conventions
- assumption/unknown handling rules

Keep this file focused on stable repo rules, not one-off task details.

### `docs/05-common-failure-modes.md`

Include:

- recurring bug classes
- fragile areas
- common regression patterns
- how to recognize them
- how to verify fixes

This file should make investigation and review better, not become a postmortem archive.

### `docs/modules/<module>.md`

Generate module docs for the highest-value modules first. Use this shape:

- purpose
- owns
- does not own
- entry points
- main flow
- business rules
- invariants
- dependencies
- verification
- common risks
- unknowns / assumptions

### `docs/workflows/<workflow>.md`

Generate workflow docs for the highest-value business flows first. Use this shape:

- business goal
- trigger
- preconditions
- steps
- state transitions
- rules
- failure cases
- systems touched
- verification
- unknowns / assumptions

### `docs/integrations/<integration>.md`

Generate integration docs when the repo depends on external systems that meaningfully affect implementation or verification.

Include:

- business purpose
- upstream/downstream relationship
- contracts or payload shape references
- authentication or environment requirements
- failure modes and retry behavior
- verification or smoke-check approach
- unknowns / assumptions

### `docs/decisions/ADR-xxxx-<title>.md`

Generate ADRs when the repo has discoverable architectural decisions that later agents might accidentally "undo".

Prefer adding ADRs for:

- unusual boundaries
- legacy constraints
- explicit trade-offs
- integration or migration choices
- verification limitations

### Module dependency artifacts

For multi-module repos:

- build `.github/module-dependency-map.json`
- build `.github/MODULE-ARCHITECTURE.md`

Capture:

- module names and paths
- dependency edges
- high-risk shared modules
- critical paths
- obvious dependency-rule violations

Also make sure `docs/02-architecture-map.md` summarizes the same boundaries in a lighter-weight narrative form.

### Common doc skeleton

Generated common docs should use a consistent skeleton whenever practical:

```md
# <Title>

## Purpose

## When To Use

## Source of Truth

## Key Facts

## Constraints

## Verification

## Related Files

## Unknowns / Assumptions
```

Do not omit the `Unknowns / Assumptions` section unless the file is intentionally tiny.

---

## Phase 4: Generate Core Instructions

Create `.github/copilot-instructions.md` as a compact operating card:

- project purpose
- source-of-truth map
- key modules/domains
- actual build/test/lint commands
- repo-specific patterns to follow
- anti-patterns to avoid
- indexing or large-repo warnings
- explicit unknowns if business context is incomplete

Keep it concise enough to be cheap context.

Do not dump the full architecture or glossary into this file. Instead, point to:

- `docs/00-repo-overview.md`
- `docs/01-business-glossary.md`
- `docs/02-architecture-map.md`
- `docs/03-verification-runbook.md`
- module/workflow docs when they exist

---

## Phase 5: Generate Domain Instructions

Generate per-domain or per-module instructions when the repo is large enough to benefit from scoped guidance.

Use narrow `applyTo` patterns.

Each domain instruction should include:

- ownership and responsibilities
- key entities or concepts
- local patterns and pitfalls
- relevant glossary terms
- evidence-backed rules only

Skip domain files for genuinely tiny repos.

These `.instructions.md` files complement `docs/`, they do not replace it:

- `.github/copilot-instructions.md` = global truth card
- `docs/*.md` = repo memory and source-of-truth references
- `.instructions.md` = stack or file-pattern rules
- prompts / chat = task-specific truth

---

## Phase 6: Generate Language and Framework Instructions

Generate instructions only for stacks actually present in the target repo.

Examples:

- Java / Spring / Jakarta
- .NET
- Python
- PHP
- TypeScript / React
- mobile
- database / migration
- testing

Every generated instruction must reference real repo conventions, not generic boilerplate.

---

## Phase 7: Generate Templates

Always generate reusable templates tailored to the target repo:

- PRD template
- API contract template
- DB schema template

Templates should include assumption markers and examples based on the target domain when possible.

---

## Phase 8: Generate Agents

Generate only the agents the target repo can support safely.

### Mandatory rules

- Every agent must reference the constitution.
- Every agent must reference the actual target stack, not toolkit defaults.
- Every business-aware claim must be backed by repo truth pack evidence or labeled as uncertain.
- `dev-orchestrator` is the **default orchestration entry point**, not a promise that users never need explicit scope.

### Minimum core set

- `dev-orchestrator`
- stack-specific implementor(s)
- `test-specialist`
- `code-reviewer`

### Conditional agents

Generate additional agents only when evidence supports them:

- `investigator`
- `business-analyst`
- `spec-reviewer`
- `sequence-diagrammer`
- `dependency-analyzer`
- `database-specialist`
- mobile specialists
- workflow specialists

For mixed-stack repos, keep specialist positioning stack-neutral unless evidence justifies a stack-specific bias.

---

## Phase 9: Generate Skills

Generate skills that match the target repo's actual workflows.

### Mandatory rules

- skill name must match its directory name
- use actual repo commands, paths, and patterns
- add evidence and assumption rules to analysis-heavy skills
- use conditional verification language, not universal promises

### Recommended core skills

- `implement-feature`
- `generate-unit-tests`
- `review-code-changes`
- `orchestrate-development`

### Conditional skills

- spec pipeline skills
- sprint planning
- sequence/state diagram generation
- impact analysis
- wiremock or integration helpers
- devcontainer or infra helpers

For large repos, make skills prefer domain-scoped execution by default.

---

## Phase 10: Generate Prompts

Generate prompts as compact entry points, not miniature policy documents.

Always include:

- `/bootstrap-copilot`
- `/implement-feature`
- `/specify-feature` when spec-first work is supported

Prompts should point users toward:

- repo truth pack artifacts
- scoped workflows
- explicit confirmation before risky implementation

---

## Phase 11: Hooks and Optional Workflows

Generate hooks only when the target repo has a practical command surface for them.

Examples:

- post-edit format checks
- lint checks
- compile checks
- security gates for dangerous commands

Generate agentic workflows only when CI/CD evidence exists and the repo would benefit from them.

Avoid creating hooks that will fail constantly in normal local development.

---

## Phase 12: Validate

Validation is mandatory.

### Structural validation

- frontmatter is valid
- required files exist
- no placeholder content
- names and paths are consistent

### Functional validation

- instructions match real files
- generated agents reference real stacks and repo truth
- skills reference actual commands
- no agent references a specialist that was not generated
- repo truth pack exists for Standard/Enterprise repos
- generated docs match the repo-size strategy instead of over-generating or under-generating
- `docs/00-repo-overview.md` and `docs/03-verification-runbook.md` always exist
- `docs/01-business-glossary.md` and `docs/02-architecture-map.md` exist for Standard/Enterprise repos
- module/workflow/decision docs appear only when the repo size and evidence justify them
- important docs include an `Unknowns` or `Assumptions` section when appropriate

### Context validation

- `copilot-instructions.md` stays compact
- domain instructions remain scoped
- prompts stay lightweight
- large repos favor scoped memory over dumping everything into one file

### Truthfulness validation

Reject generated output that:

- promises 100% branch coverage everywhere by default
- claims full autonomy without scope caveats
- claims business awareness without evidence
- implies verification happened when it did not

---

## Phase 13: Devcontainer

If the target repo already has a devcontainer, review it.

If it does not:

- ask whether the user wants one
- generate only if there is clear value

Do not force devcontainer output on every repo.

---

## Phase 14: Manifest, Cleanup, and Summary

Write a manifest describing what was generated and why.

Recommended artifacts:

- `.github/.bootstrap-manifest.json`
- `.github/.bootstrap-state.json`

The manifest is the authoritative keep list for the final generated `.github/` tree.

At minimum, record:

- project classification and context risk
- toolkit version
- generated files to keep
- skipped file groups and why they were skipped
- optional files intentionally retained for runtime use
- major assumptions and unresolved gaps

The final summary should include:

- classification and context risk
- truth-pack status
- generated files
- skipped files and why
- major assumptions
- recommended next step

Cleanup is mandatory, not optional.

After generation and validation:

1. Compare the copied bootstrap bundle with `.github/.bootstrap-manifest.json`.
2. Delete files and folders that are not listed in the manifest keep list.
3. Keep only files that are:
   - generated specifically for the target repo
   - required runtime assets for the generated repo
   - manifest/state/checkpoint artifacts explicitly declared in the manifest

Cleanup should remove stale or irrelevant toolkit assets, especially:

- unused stack instruction templates
- unused specialist agents and skills
- prompts that are not supported in the generated repo
- bootstrap-only operator docs that describe the toolkit rather than the target repo
- placeholder docs for module/workflow/integration/ADR layers that were not justified by scan results

Do not delete files blindly. Delete only when the manifest or repo-size strategy says they are out of scope.
Do not keep the full copied toolkit inventory unless the repo was proven, from non-bundle evidence, to be the toolkit source repository itself.

Success means the final `.github/` folder looks like a tailored project configuration, not a copied toolkit source tree.

## Final Standard

Bootstrap is successful only when:

- the generated `.github/` bundle is usable on its own
- repo truth exists for later agents
- docs scale progressively with repo size
- claims are evidence-backed
- large repos are treated with progressive discovery, not overconfident automation
