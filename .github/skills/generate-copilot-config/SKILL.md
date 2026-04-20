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
11. **Generate hooks and optional workflows** — memory hooks are mandatory for Standard and Enterprise repos; do not skip
12. **Compile runtime fidelity**
13. **Validate**
14. **Review or generate devcontainer**
15. **Write manifest, snapshot, cleanup, and summarize**

---

## Incremental State Management

Write or update `.github/.bootstrap-state.json` after **every phase** completes, not just at the end. This makes the pipeline resumable from any point.

Initial state file (create at the start of Phase 1):

```json
{
  "toolkitVersion": "<from .github/VERSION>",
  "startedAt": "<ISO 8601>",
  "classification": null,
  "contextRisk": null,
  "capabilityTier": null,
  "tierSelectionMode": null,
  "tierReason": null,
  "phases": {
    "1-scan": "pending",
    "2-classify": "pending",
    "3-domain": "pending",
    "4-core-instructions": "pending",
    "5-domain-instructions": "pending",
    "6-language-instructions": "pending",
    "7-templates": "pending",
    "8-agents": "pending",
    "9-skills": "pending",
    "10-prompts": "pending",
    "11-hooks": "pending",
    "12-runtime-compilation": "pending",
    "13-validate": "pending",
    "14-devcontainer": "pending",
    "15-manifest-snapshot": "pending"
  },
  "generatedFiles": [],
  "errors": []
}
```

Phase status values: `pending`, `in_progress`, `completed`, `skipped`, `failed`.

After each phase:
- Set that phase to `completed` (or `failed` / `skipped`).
- Update `classification`, `contextRisk`, `capabilityTier`, `tierSelectionMode`, and `tierReason` when Phase 2 completes.
- Append to `generatedFiles` as each file is created.
- Append to `errors` if a phase encounters issues.

---

## Phase 1: Scan

Build an evidence-backed picture of the target repo using a structured scan protocol. This protocol minimizes tool-call rounds while maximizing information density. Results are persisted as a file so they survive context compaction.

### Scan Protocol

#### Round 1 — Project Fingerprint (2 parallel tool calls)

Run two tool calls simultaneously:

**Call A — Directory tree** (terminal):

```bash
find . -maxdepth 3 -type f \
  -not -path './.git/*' -not -path '*/node_modules/*' \
  -not -path '*/vendor/*' -not -path '*/target/*' \
  -not -path '*/build/*' -not -path '*/dist/*' \
  -not -path '*/obj/*' -not -path '*/.gradle/*' \
  | head -500 | sort
```

**Call B — Bulk data extraction** (single compound terminal command):

```bash
{
echo "##FILE_COUNT"
find . -type f \
  -not -path './.git/*' -not -path '*/node_modules/*' \
  -not -path '*/vendor/*' -not -path '*/target/*' \
  -not -path '*/build/*' -not -path '*/dist/*' \
  -not -path '*/obj/*' -not -path '*/.gradle/*' \
  -not -path '*/__pycache__/*' | wc -l

echo "##EXTENSIONS"
find . -type f \
  -not -path './.git/*' -not -path '*/node_modules/*' \
  -not -path '*/vendor/*' -not -path '*/target/*' \
  | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -25

echo "##BUILD_FILES"
find . -maxdepth 3 \( \
  -name "package.json" -o -name "pom.xml" \
  -o -name "build.gradle" -o -name "build.gradle.kts" \
  -o -name "settings.gradle" -o -name "settings.gradle.kts" \
  -o -name "*.csproj" -o -name "*.sln" \
  -o -name "go.mod" -o -name "Cargo.toml" \
  -o -name "pyproject.toml" -o -name "requirements.txt" \
  -o -name "composer.json" -o -name "Gemfile" \
  -o -name "Makefile" -o -name "Package.swift" \
  \) -not -path '*/node_modules/*' \
  -exec sh -c 'echo "--- {} ---" && head -80 "{}"' \;

echo "##CI_CD"
find . -maxdepth 4 \( \
  -path "*/.github/workflows/*.yml" -o -path "*/.github/workflows/*.yaml" \
  -o -name ".gitlab-ci.yml" -o -name "Jenkinsfile" \
  -o -name "azure-pipelines.yml" \
  \) -exec sh -c 'echo "--- {} ---" && head -50 "{}"' \;

echo "##DOCKER"
find . -maxdepth 2 \( -name "Dockerfile*" -o -name "docker-compose*" \) \
  -exec sh -c 'echo "--- {} ---" && head -50 "{}"' \;

echo "##CONFIG"
find . -maxdepth 3 \( \
  -name "application*.yml" -o -name "application*.yaml" \
  -o -name "application*.properties" -o -name "appsettings*.json" \
  -o -name ".env.example" -o -name "tsconfig*.json" \
  -o -name "vite.config*" -o -name "next.config*" \
  -o -name "nuxt.config*" -o -name "angular.json" \
  \) -not -path '*/node_modules/*' \
  -exec sh -c 'echo "--- {} ---" && head -50 "{}"' \;

echo "##README"
head -120 README.md 2>/dev/null

echo "##GITIGNORE"
cat .gitignore 2>/dev/null
} 2>/dev/null
```

After Round 1, extract from the results:

- **Directory layout**: modules, source roots, test roots
- **File count and language distribution**: from extension counts
- **Framework, dependency, and version data**: from build file contents
- **Build, test, and lint commands**: from build file scripts and CI/CD configs
- **Infrastructure**: Docker, devcontainer, database
- **Project identity**: README content + build file metadata

For small projects (fewer than 500 files, single module), Round 1 is often sufficient. Skip Round 2 when you have enough evidence to write the scan report.

#### Round 2 — Smart Sampling (2-4 parallel file reads, conditional)

When Round 1 leaves gaps in convention or domain understanding, read targeted files:

- 1 representative source file per major module (pick from known paths in the directory tree)
- 1 representative test file
- 1 application config file if not already captured

Use `#codebase` semantic search to find representative files when paths are not obvious from the tree. Example queries: "main service entry point", "business entity model", "test setup".

Skip this round for small projects where Round 1 already provides enough evidence.

#### Round 3 — Persist Scan Report (1 file write)

Write `.github/.scan-report.md` using the format below. This file is the persistent artifact that all subsequent phases read. It survives context compaction and enables pipeline resumption.

After writing the scan report, update `.github/.bootstrap-state.json`: set phase `1-scan` to `completed`.

### Scan Report Format

```md
---
scanned_at: "<ISO 8601>"
toolkit_version: "<from .github/VERSION>"
file_count: <total non-ignored files>
---

# Scan Report

## Identity
- **Name**: <from build file or README>
- **Purpose**: <1-2 sentences>
- **Evidence**: <files that prove identity>

## Tech Stack
| Layer | Technology | Version | Evidence |
|-------|-----------|---------|----------|
| Language | <detected> | <version> | <file> |
| Framework | <detected> | <version> | <file> |
| Build Tool | <detected> | <version> | <file> |
| Database | <detected> | <version or unknown> | <file> |
| Test Framework | <detected> | <version> | <file> |

## Build Commands
| Command | Purpose | Source |
|---------|---------|-------|
| <cmd> | build | <file> |
| <cmd> | test | <file> |
| <cmd> | lint | <file> |

## Modules
| Module | Path | Type | Key Entities |
|--------|------|------|-------------|
| <name> | <path> | domain / infra / shared | <top entities> |

## Conventions
- **Naming**: <class, method, file patterns detected>
- **File structure**: <feature-based / layer-based / hybrid>
- **Testing pattern**: <co-located / mirror / separate>
- **Import style**: <grouped / alphabetical / path aliases>

## External Integrations
| Service | Library | Purpose |
|---------|---------|---------|
| <service> | <lib> | <purpose> |

## Infrastructure
- **CI/CD**: <tool and config path>
- **Container**: <Docker / none>
- **Database migration**: <tool or none detected>
- **Config management**: <profiles / env files / none>

## Unknowns
- [ ] <anything uncertain or unverifiable>
```

### Stack Detection Reference

Use this matrix to identify stacks from build files found in Round 1:

| Build File | Stack | Key Data to Extract |
|-----------|-------|---------------------|
| `package.json` | Node / JS / TS | `dependencies`, `devDependencies`, `scripts`, `engines` |
| `tsconfig.json` | TypeScript | `compilerOptions.target`, `paths`, `strict` |
| `pom.xml` | Java / Maven | `java.version`, `<dependencies>`, `<modules>`, `<plugins>` |
| `build.gradle(.kts)` | Java / Gradle | `sourceCompatibility`, `plugins`, `dependencies` |
| `*.csproj` | .NET | `TargetFramework`, `PackageReference` |
| `*.sln` | .NET multi-project | Project list and references |
| `go.mod` | Go | `module`, `go` version, `require` |
| `Cargo.toml` | Rust | `edition`, `dependencies` |
| `pyproject.toml` | Python | `project.dependencies`, `tool.*` configs |
| `requirements.txt` | Python | Package list with versions |
| `composer.json` | PHP | `require`, framework detection |
| `Gemfile` | Ruby | `gem` list, Rails detection |
| `Package.swift` | Swift / iOS | Dependencies, platforms |
| `build.gradle.kts` + Android plugin | Android / Kotlin | `minSdk`, `targetSdk`, Compose version |

### Quality Rules

- Establish repo identity from root-level project evidence before using copied bundle text as context.
- Do not let copied bootstrap text override stronger evidence from the target repo.
- If evidence is weak for any section, say so in the Unknowns section. Do not fill gaps with generic stack assumptions.
- Every tech stack claim must point to a specific file as evidence.
- The `.github/.scan-report.md` file should be retained in the manifest as a runtime reference asset.

#### Round 4 — Extract Existing Coding Standards (1 file read, conditional)

When the target repo has an existing `.github/copilot-instructions.md`:

1. Read the file in full.
2. Identify coding standard sections using a two-pass heuristic:
   - **Pass 1 (section-level)**: Find H2/H3 headings matching keywords: `convention`, `style`, `coding`, `format`, `naming`, `indent`, `quote`, `import`, `type`, `syntax`, `guideline`, `standard`, `pattern`, `rule`, `prefer`, `lint`. Preserve the entire section (heading through next same-level heading).
   - **Pass 2 (inline rules)**: In remaining sections, detect bullet patterns: `use X`, `prefer X`, `always X`, `never X`, `avoid X`, configuration references (`.editorconfig`, `tsconfig`, `eslintrc`, `prettier`), code-style keywords (`tabs`, `spaces`, `semicolons`, `single quotes`, `arrow functions`, `camelCase`, `PascalCase`). When 3+ patterns appear in an uncaptured section, preserve it.
3. Append the extracted sections to the scan report under a `## Preserved Coding Standards` heading.

Skip this round when no existing `copilot-instructions.md` is present.

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

### Capability tier

After repo-size classification, determine the retained product footprint through a separate capability tier.

| Tier | Intent | Default retained surface |
|---|---|---|
| Lean | smallest useful day-to-day setup | core workflows, essential stack guidance, minimal maintenance overhead |
| Collaborative | planning and review friendly setup | Lean plus spec pipeline, review memory, onboarding, and bounded diagnostics |
| Governed | audit and enterprise-confidence setup | Collaborative plus advanced debug, validation, and maintenance helpers |

Tier is not the same thing as repo-size classification.

- Classification answers: what kind of repo is this?
- Capability tier answers: how much retained workflow and governance surface should bootstrap keep?

Tier selection rules:

- Respect an explicit user choice when one exists and record it as `tierSelectionMode: explicit`.
- Otherwise infer the tier from repo evidence and record `tierSelectionMode: inferred`.
- Default inference:
  - Lean: small, low-risk repos where extra governance surface would clearly be noise
  - Collaborative: the default for most Standard repos and mixed docs-plus-code repos
  - Governed: enterprise or high-risk repos that justify ongoing audit and debug helpers

Record a one-line `tierReason` that explains why the selected tier fits the target repo.

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

- begin with a 4-rule operating core:
  - state assumptions explicitly or ask
  - prefer the smallest change that solves the request
  - touch only the directly relevant surface unless evidence requires broader change
  - define verification before claiming completion
- project purpose
- source-of-truth map
- key modules/domains
- actual build/test/lint commands
- repo-specific patterns to follow
- anti-patterns to avoid
- indexing or large-repo warnings
- explicit unknowns if business context is incomplete

Keep it concise enough to be cheap context.

Target: keep the operating core itself to roughly 10-15 lines and the full `copilot-instructions.md` within the normal context-budget target for an always-loaded file.

Do not dump the full architecture or glossary into this file. Instead, point to:

- `docs/00-repo-overview.md`
- `docs/01-business-glossary.md`
- `docs/02-architecture-map.md`
- `docs/03-verification-runbook.md`
- module/workflow docs when they exist

### Coding Standards Preservation

When the scan report contains a `## Preserved Coding Standards` section:

1. Insert the preserved content under a `## Coding Standards` heading in the generated `copilot-instructions.md`.
2. Place it after the source-of-truth map and before verification commands.
3. If the preserved content duplicates information already in a generated `.instructions.md` file (e.g., TypeScript conventions already covered by `typescript.instructions.md`), note the overlap but preserve the original wording — the repo maintainer's conventions take precedence over generated defaults.

When no preserved standards exist and no existing `copilot-instructions.md` was found:
- Do not invent coding standards.
- If linter configs or `.editorconfig` exist, reference them as the coding standard source instead of creating standalone rules.

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

### Constitution generation

Generate `.github/constitution.md` for every target repo that receives agents.

1. Use the toolkit's own `.github/constitution.md` as the structural template.
2. Adapt the content to the target repo:
   - Replace toolkit-specific examples with target-stack examples.
   - Keep all 9 articles and the Phase -1 Gates — they are stack-agnostic principles.
   - Adjust the validation ownership table (Article III) if the target stack uses different layer names (e.g., Controller/Service/Repository → Route/Handler/Store).
3. Verify that every `constitution.md` reference in generated agent files resolves to the generated file path.

When the target repo already has a `.github/constitution.md`, preserve the existing file and verify references resolve to it.

### Mandatory rules

- Every agent must reference the constitution.
- Every agent must reference the actual target stack, not toolkit defaults.
- Every business-aware claim must be backed by repo truth pack evidence or labeled as uncertain.
- `dev-orchestrator` is the **default orchestration entry point**, not a promise that users never need explicit scope.
- Every workflow-owning agent must instruct the model to surface success criteria, verification method, and stop conditions before claiming completion.

### Stack-specific agent body generation

Agent body text must reference only frameworks and libraries detected by Phase 1.

1. Read the scan report's `## Tech Stack` and `## Conventions` sections.
2. For each generated agent, replace generic framework references with detected-stack equivalents:
   - Use the detected framework names, versions, and patterns.
   - Remove mentions of frameworks NOT in the scan report.
   - Reference detected file structure, naming, and testing patterns.
3. When the scan report lacks detail for a particular agent's domain (e.g., no frontend framework detected for `frontend-implementor`), use a minimal generic body that mentions the detected language only — not a laundry list of possible frameworks.

Example: if Phase 1 detects TypeScript + prompt-tsx + Vitest but NOT React, Vue, or Angular, then `frontend-implementor.agent.md` must reference prompt-tsx patterns (`PromptElement`, `vscpp`, priority system, `<br />` for newlines) and Vitest testing — NOT React components, hooks, JSX patterns, or any other frontend framework.

### Minimum core set

- `dev-orchestrator`
- stack-specific implementor(s)
- `test-specialist`
- `code-reviewer`
- `investigator`
- `business-analyst`

### Implicit dependencies

Some agents delegate to sub-agents that must also be generated:

- `code-reviewer` requires `functional-reviewer` and `technical-reviewer`
- `code-reviewer` requires `mobile-reviewer` when mobile code is detected

If a parent agent is in the core set, its required sub-agents are also in the core set.

### Conditional agents

Generate additional agents only when evidence supports them:

- `spec-reviewer`
- `sequence-diagrammer`
- `dependency-analyzer`
- `database-specialist`
- mobile specialists (beyond `mobile-reviewer`)
- workflow specialists

For mixed-stack repos, keep specialist positioning stack-neutral unless evidence justifies a stack-specific bias.

### Handoff workflows

Generate `handoffs` in agent frontmatter to create guided workflow transitions. Each handoff appears as a button in the UI, passing context to the next agent.

Handoff format in frontmatter:

```yaml
handoffs:
  - agent: "Target Agent Name"
    label: "Button Label"
    prompt: "Context passed to the target agent describing what to do next."
```

#### Recommended handoff chains

Generate these handoff chains for the core agent set:

| Agent | Handoff To | Label | When |
|---|---|---|---|
| `investigator` | stack implementor | "Proceed to Implementation" | After investigation report is complete |
| `investigator` | `spec-reviewer` | "Review Spec First" | When spec needs validation before implementation |
| `spec-reviewer` | stack implementor | "Approve & Implement" | After spec review passes |
| `spec-reviewer` | `investigator` | "Investigate Further" | When review surfaces unknowns |
| stack implementor | `test-specialist` | "Generate Tests" | After implementation is complete |
| stack implementor | `code-reviewer` | "Review Changes" | When skipping test generation |
| `test-specialist` | `code-reviewer` | "Review Code" | After tests are written |
| `test-specialist` | stack implementor | "Fix Implementation" | When tests reveal implementation issues |
| `code-reviewer` | `pr-manager` | "Create PR" | After review approves |
| `code-reviewer` | stack implementor | "Request Changes" | After review requests changes |

Rules:

- Handoff prompts must reference the conversation context ("the implementation above", "the review findings above").
- Every handoff chain must form a DAG — no circular handoffs between the same two agents (A→B and B→A is fine; A→B→A→B infinite loop risk is acceptable because the user must click each handoff).
- Stack-specific implementors (e.g., `dotnet-implementor`, `python-implementor`) should have the same handoff targets as the generic `implementor`.
- The `pr-manager` is a terminal agent — no handoffs needed.
- Only generate handoffs for agents that exist in the generated set.

### AGENTS.md generation (Standard and Enterprise repos)

For Standard and Enterprise repos, generate `.github/AGENTS.md` as a discovery index for all generated agents. VS Code surfaces this file to help users and the model discover available agents.

#### When to generate

| Classification | Generate AGENTS.md? |
|---|---|
| Small | No — few agents, discovery is trivial |
| Standard | Yes — when 6+ agents are generated |
| Enterprise | Always |

#### Format

```markdown
# Agents

## Core Workflow

| Agent | Purpose |
|---|---|
| @dev-orchestrator | Routes tasks to the right specialist based on intent |
| @implementor | Implements features across all layers |
| @test-specialist | Generates comprehensive tests for changed logic |
| @code-reviewer | Multi-stage code review: functional then technical |

## Investigation & Analysis

| Agent | Purpose |
|---|---|
| @investigator | Technical investigation with as-is/to-be analysis |
| @codebase-analyzer | Deep codebase scanning and architecture detection |

## Requirements & Planning

| Agent | Purpose |
|---|---|
| @business-analyst | Turns requests into structured, testable requirements |
| @sprint-planner | Sprint planning with estimation and dependency mapping |
```

#### Rules

- Group agents by role category: Core Workflow, Investigation & Analysis, Requirements & Planning, Specialist, Review.
- One-line purpose per agent — derive from the agent's `description` frontmatter.
- Only include agents that exist in the generated set (not bootstrap-only agents).
- Keep the file under 2 KB — this is a discovery index, not documentation.
- If the repo has nested module structure with domain-specific agents, generate per-module `AGENTS.md` files in the relevant module directories.

#### Nested AGENTS.md for Enterprise repos

Enterprise repos with 3+ domain-specific agents may benefit from nested `AGENTS.md` files:

```
.github/AGENTS.md              ← top-level index (all agents)
modules/payments/AGENTS.md     ← domain agents for payments module
modules/inventory/AGENTS.md    ← domain agents for inventory module
```

Rules for nested files:
- Only generate when domain-specific agents exist (e.g., `payments-implementor`, `inventory-specialist`)
- Each nested file lists only agents relevant to that module
- Top-level `.github/AGENTS.md` always lists ALL agents regardless of nesting
- Nested files must not duplicate the full agent catalog — only domain-scoped subset

---

## Phase 9: Generate Skills

Generate skills that match the target repo's actual workflows.

### Mandatory rules

- skill name must match its directory name
- use actual repo commands, paths, and patterns
- add evidence and assumption rules to analysis-heavy skills
- use conditional verification language, not universal promises
- every reusable skill must define a verification contract for its workflow: expected outcome, how to verify it, and when to stop or escalate

### Skill Retention Tiers

Skills are classified into four tiers that determine retention during generation and cleanup. This prevents over-pruning of stack-agnostic process skills that are useful regardless of detected technology.

| Tier | Retention Rule | Description |
|------|---------------|-------------|
| **Core** | Always retained | Essential workflow skills required by core agents |
| **Universal** | Always retained (all classifications) | Stack-agnostic process, planning, learning, and diagramming skills |
| **Conditional** | Retained only when evidence signal matches | Stack-specific or infrastructure-specific skills |
| **Bootstrap-only** | Always removed post-bootstrap | Skills that exist only to support the bootstrap pipeline |

#### Core skills (always generate)

- `orchestrate-development`
- `implement-feature`
- `generate-unit-tests`
- `review-code-changes`

#### Universal skills (always generate — not tied to any stack)

These skills support **process, planning, learning, visualization, and analysis** workflows that every project benefits from. They must be retained for all classifications (Small, Standard, Enterprise) because they have no stack detection signal — their value is stack-agnostic.

**Process & Planning:**
- `learn-codebase` — onboarding and domain understanding
- `generate-adr` — architecture decision records
- `sprint-planning` — sprint planning and backlog grooming
- `estimate-effort` — story point estimation
- `specify-feature` — PRD-style spec from feature request
- `plan-implementation` — implementation plan from spec
- `generate-tasks` — task list from plan
- `review-spec` — spec review for gaps and risks
- `update-spec` — incremental spec updates on change requests
- `technical-debt-analysis` — codebase tech debt analysis
- `refine-user-input` — restructure vague prompts into actionable requests
- `analyze-requirements` — turn intent into structured requirements
- `investigate-pbi` — evidence-backed PBI/bug investigation

**Visualization:**
- `generate-sequence-diagram` — Mermaid sequence diagrams from code flows
- `generate-state-diagram` — Mermaid state diagrams from entity lifecycle

**Cross-cutting:**
- `impact-analysis` — cross-module blast-radius analysis
- `conventional-commit` — conventional commit message generation
- `generate-pr-description` — PR description from diff
- `core-principles` — engineering principles for all agents

#### Conditional skills (generate only when evidence matches)

| Skill | Retention Signal |
|-------|------------------|
| `implement-mobile-feature` | Android/iOS source detected |
| `generate-mobile-tests` | Android/iOS test framework detected |
| `generate-wiremock` | WireMock stubs or MockServer detected |
| `optimize-devcontainer` | `.devcontainer/` directory exists |
| `generate-hooks` | Build/lint/format tooling detected |
| `generate-agentic-workflow` | CI/CD evidence + team wants automation |
| `generate-domain-instructions` | Enterprise classification or 5+ domains |
| `dependency-extractor` | Multi-module repo detected |
| `domain-registry` | Enterprise classification or 5+ domains |
| `skill-pack-import` | Org-level skill reuse demand confirmed or multi-repo team detected |

#### Meta/toolkit skills (retain selectively for re-bootstrapping)

| Skill | Default |
|-------|---------|
| `generate-copilot-config` | Retained for re-bootstrapping |
| `analyze-codebase` | Retained for re-analysis |
| `drift-detector` | Retained for config freshness checks |
| `repo-memory-promoter` | Retained for repo-memory audits and promotion planning |
| `review-memory-promotion` | Retained for approval-ready memory candidate generation |
| `review-effectiveness` | Retained for periodic workflow health checks |
| `context-assembly-simulator` | Retained for debug/optimization |
| `context-budget-check` | Retained for validation |
| `instruction-conflict-detector` | Retained for validation |
| `tool-permission-auditor` | Retained for validation |
| `skill-discoverability-audit` | Retained for validation |
| `context-inspector` | Retained for `Collaborative` and `Governed` tiers as a bounded user-facing diagnostic workflow |
| `correction-ledger` | Retained for learning-loop signal aggregation and approval-gated promotion |

Treat the tables above as retention guidance, not a closed whitelist. If bootstrap generates a new post-bootstrap skill later, classify it into one of the non-bootstrap tiers and keep it. Do not let a newly added runtime skill fall out of the manifest just because an older template did not list it yet.

### Tier-governed maintenance surface

- `Lean`: keep the smallest useful maintenance layer. Skip advanced audit and debug helpers unless non-tier repo evidence makes them clearly necessary.
- `Collaborative`: keep review-memory, learning-loop (`correction-ledger`, `promote-learning`), onboarding, and bounded diagnostic helpers such as `context-inspector`.
- `Governed`: keep the full advanced validation and debug helper set, including context assembly, permission auditing, discoverability auditing, and effectiveness review.

#### Bootstrap-only skills (always remove post-bootstrap)

- `resume-bootstrap`
- `validate-bootstrap-output`
- `upgrade-config`
- `source-of-truth-map`
- `common-doc-generator`

For large repos, make skills prefer domain-scoped execution by default.

### Reference-based skill filtering

After generating all skills, agents, prompts, and instructions, compute the final skill keepSet:

1. **Tier-based inclusion**: Include all Core and Universal skills unconditionally. Include Meta/toolkit skills per capability tier rules.
2. **Reference scan**: Search all generated `.agent.md`, `.prompt.md`, `.instructions.md`, and retained `SKILL.md` files for skill folder names. A skill folder name appearing in body text, frontmatter `skills:` field, or routing table counts as a reference.
3. **Conditional signal match**: For Conditional tier skills, check whether their retention signal was detected (e.g., `.devcontainer/` exists → retain `optimize-devcontainer`).
4. **Prune**: Skills that are not retained by tier, not referenced by any generated file, and not matched by conditional signal are excluded from the keepSet. Do not copy them to the target repo.

Log the pruning decision for each excluded skill in the bootstrap summary (reason: "not referenced by any generated artifact and not retained by tier").

---

## Phase 10: Generate Prompts

Generate prompts as compact entry points, not miniature policy documents.

### Always include

- `/implement-feature`
- `/investigate`
- `/review-code`
- `/plan-review-scope`
- `/promote-review-memory`
- `/specify-feature`
- `/plan-implementation`

### Post-bootstrap retention rule

- `/bootstrap-copilot` should be **retained** in the generated repo so users can re-bootstrap after major codebase changes. Mark it in the manifest as a retained runtime asset, not a toolkit-only file.
- Bootstrap-only prompts (e.g., `/generate-agents`, `/generate-instructions`, `/generate-skills`) should be **removed** during cleanup unless the repo is the toolkit source itself.
- Retain `/inspect-context` when `context-inspector` is retained by capability tier or equivalent runtime-debug evidence.

### Workflow-coupled prompt retention

Retain user-facing prompts that activate retained runtime workflows or are referenced by retained docs and agents.

- Keep `/plan-review-scope` whenever `code-reviewer` is retained.
- Keep `/promote-review-memory` whenever `review-memory-promotion` is retained.
- Keep `/promote-learning` whenever `correction-ledger` is retained. This prompt chains `correction-ledger` → `review-memory-promotion` as a single human-facing learning loop entry point.
- Keep `/import-skill-pack` whenever `skill-pack-import` is retained.
- Do not treat the short prompt list above as a closed whitelist. If a prompt is generated for post-bootstrap use and `.github/.runtime-fidelity.json` marks it as `discoverable`, include it in the manifest keep set unless it is explicitly classified as `bootstrap_only`.

### Prompt design rules

Prompts should point users toward:

- repo truth pack artifacts
- scoped workflows
- explicit confirmation before risky implementation
- an explicit verify target or a clearly labeled verification gap for non-trivial work

---

## Phase 11: Hooks and Optional Workflows

### Mandatory execution rules

Phase 11 MUST NOT be skipped for Standard or Enterprise repos. If no quality tooling is detected, memory and preservation hooks are still required.

| Classification | Memory Hooks (4 JSON + 4 scripts) | Quality Hooks | Preservation Hook |
|---------------|-----------------------------------|---------------|-------------------|
| Small | Skip | Conditional (tooling detected) | Skip |
| Standard | **MUST generate** | Conditional (tooling detected) | **MUST generate** |
| Enterprise | **MUST generate** | Conditional (tooling detected) | **MUST generate** |

If classification is Standard or Enterprise, read `.bootstrap-state.json` to confirm. Then generate the mandatory hooks before evaluating quality hook conditions.

Record `"11-hooks": "completed"` after generation. Never record `"skipped"` for Standard or Enterprise repos unless an unrecoverable error occurs (record `"failed"` with error details instead).

Use the `generate-hooks` skill as the reference for hook file format, event selection, detection matrix, and memory hook rules. Phase 11 defines what is mandatory; the skill defines how to produce it.

### Quality hooks (conditional on detected tooling)

- `postToolUse` format checks (Prettier, Spotless, Black, ktlint)
- `postToolUse` lint checks (ESLint, Checkstyle, PMD, detekt)
- `postToolUse` compile checks (Maven, Gradle, tsc, dotnet build)
- `preToolUse` security gates for dangerous commands

### Context preservation hooks (conditional on repo size)

For Standard and Enterprise repos, generate a `preCompact` hook that checkpoints critical session state before context compaction:

- Write to `.github/.session-checkpoint.md`
- Add the checkpoint path to `.gitignore`
- Keep the hook fast (< 10 seconds)

This prevents loss of in-progress decisions, constraints, and plan state during long-running feature work.

### Memory and observation hooks (conditional on repo size)

For Standard and Enterprise repos, generate a memory hook set that captures, injects, summarizes, and checkpoints session observations:

| Hook file | Event | Script | Purpose |
|-----------|-------|--------|---------|
| `memory-capture.json` | `postToolUse` | `memory-capture.js` | Append one JSONL observation to `.memory/observations.jsonl` |
| `memory-inject.json` | `sessionStart` | `memory-inject.js` | Emit bounded summary-first context from prior session data |
| `memory-summary.json` | `stop` | `memory-summary.js` | Write session summary Markdown to `.memory/summaries/` |
| `memory-checkpoint.json` | `preCompact` | `memory-checkpoint.js` | Checkpoint critical state before context compaction |

Rules for memory hooks:
- Scripts must use Node.js stdlib only (no external dependencies)
- All scripts must fail open — a script error must never block the user's workflow
- Add `.memory/` to `.gitignore` (local-only, not committed)
- Keep each script execution under 5 seconds

### Context-packet manifest (conditional on repo size)

For Standard and Enterprise repos, generate `.github/.context-packets.json` — a manifest that declares which files should be co-loaded for common tasks:

- Each packet has a `name`, `description`, `trigger` keywords, and a `files` array
- Packets enable smart context assembly: instead of loading everything, load only the packet relevant to the current task
- Include packets for high-value bundles: core config, review workflow, spec pipeline, domain instructions, etc.
- Keep the manifest under 4 KB

### Agentic workflows

Generate agentic workflows only when CI/CD evidence exists and the repo would benefit from them.

### Rules

Avoid creating hooks that will fail constantly in normal local development.
Use official hook events only — PascalCase names: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PreCompact`, `SubagentStart`, `SubagentStop`, `Stop`.

### Smoke-test after generation

After generating all hooks, run the Step 5 smoke test defined in the `generate-hooks` skill:

1. **Structural validation** — parse every `.github/hooks/*.json`, confirm PascalCase events, `type: "command"`, and valid properties
2. **Script availability** — confirm referenced scripts exist on disk; run `node -c` for Node.js scripts
3. **Dry-run** — execute each Node.js script with `echo '{}' | node <script>` using a temp MEMORY_DIR; must exit 0
4. **Fix-on-fail** — if any check fails, fix the generated file and re-run the failing check before moving on

Record `"11-hooks": "completed"` only after the smoke test passes. If the smoke test reveals failures that cannot be fixed, record `"11-hooks": "failed"` with error details.

### File registration

After generating hook and script files, immediately append their paths to the `generatedFiles` array in `.bootstrap-state.json`. This is critical: Phase 15 uses `generatedFiles` to build the keepSet. Files not in `generatedFiles` will be treated as copied bundle residue and deleted.

Generated paths to register (when applicable):
- `.github/hooks/memory-capture.json`
- `.github/hooks/memory-inject.json`
- `.github/hooks/memory-summary.json`
- `.github/hooks/memory-checkpoint.json`
- `.github/scripts/memory-capture.js`
- `.github/scripts/memory-inject.js`
- `.github/scripts/memory-summary.js`
- `.github/scripts/memory-checkpoint.js`
- `.github/hooks/auto-format.json` (when formatter detected)
- `.github/hooks/lint-check.json` (when linter detected)
- `.github/hooks/compile-check.json` (when compiler detected)
- `.github/hooks/context-checkpoint.json` (Standard/Enterprise)

---

## Phase 12: Runtime Compilation

After all artifacts are generated (Phases 4–11), compile a runtime fidelity manifest that classifies every generated artifact by its runtime role and maps relationships between them.

Before finalizing runtime fidelity, generate two user-facing post-bootstrap artifacts from the retained runtime surface:

- `.github/.bootstrap-summary.md` — a concise human-readable explanation of classification, retained artifacts, removed artifacts, and why the final generated surface looks the way it does
- `docs/06-copilot-onboarding.md` — a concise repo-specific onboarding guide that tells maintainers where to start and when to escalate into spec-driven or review workflows

These artifacts should be created from the same retained-surface reasoning that later feeds the manifest keep set. Do not generate them as generic toolkit prose.

This phase produces two files:

- `.github/.runtime-fidelity.json` — classifies every generated artifact by runtime role, estimated token cost, and inter-file relationships
- `.github/.skill-index.json` — skill discoverability metadata for routing and context-assembly consumers

### Runtime Fidelity Manifest

For every file generated in Phases 4–11, record:

```json
{
  "version": "1.0",
  "generatedAt": "<ISO 8601>",
  "tokenCostHeuristic": "ceil(char_count / 4)",
  "artifacts": {
    ".github/copilot-instructions.md": {
      "runtimeRole": "auto_injected",
      "estimatedTokenCost": 820,
      "phase": 4,
      "consumers": ["all agents"],
      "relations": [
        { "target": ".github/instructions/java.instructions.md", "reason": "references" }
      ]
    }
  }
}
```

#### Runtime Role Classification

| Role | Definition | Cleanup rule |
|------|-----------|--------------|
| `auto_injected` | Loaded on every request (copilot-instructions.md) | Must survive cleanup |
| `discoverable` | Loaded on demand by model matching (skills, instructions, agents) | Must survive cleanup |
| `reference_only` | Read by skills/agents but never auto-loaded (docs, truth packs) | Keep if referenced |
| `human_only` | For human readers only (README, AGENTS.md) | Keep always |
| `bootstrap_only` | Used only during bootstrap pipeline | Must be removed at cleanup |

#### Classification Rules

1. `copilot-instructions.md` → `auto_injected`
2. `.instructions.md` files → `auto_injected` (loaded when `applyTo` matches)
3. `.agent.md` files → `discoverable`
4. `SKILL.md` files → `discoverable`
5. `.prompt.md` files → `discoverable`
6. `docs/` files → `reference_only`, except explicit onboarding docs retained for human readers
7. `.scan-report.md`, `.phase3-checkpoint.md` → `bootstrap_only`
8. `.bootstrap-state.json` → `bootstrap_only`
9. `hooks/*.json` → `auto_injected` (event-triggered)
10. `AGENTS.md` → `human_only`
11. `.github/.bootstrap-summary.md` → `human_only`
12. `docs/06-copilot-onboarding.md` → `human_only`

Capability tier does not change runtime-role semantics. It changes which artifacts survive into the final kept surface.

#### Token Cost Estimation

Use the v1 heuristic: `estimatedTokenCost = ceil(char_count / 4)`.

Read each generated file, count characters, and apply the formula. No tokenizer library is needed.

#### Consumer Detection

For each artifact, determine which agents or workflows consume it:

- `auto_injected` files → `["all agents"]`
- `.instructions.md` → agents whose typical file paths match the `applyTo` pattern
- Skills → agents that reference the skill by name in their body or routing tables
- Docs → skills or agents that reference the doc path

#### Relation Building

Scan file contents for cross-references to other generated files:

| Relation reason | When to emit |
|-----------------|-------------|
| `loads` | File is auto-loaded with another (e.g., copilot-instructions loads with all agents) |
| `references` | File body mentions another generated file by path or name |
| `routes_to` | Agent routing table directs to a skill |
| `validates` | Validation phase checks this file |
| `depends_on` | File requires another to function (e.g., skill depends on instruction context) |

### Skill Index

Build `.github/.skill-index.json` with discoverability metadata for each skill:

```json
{
  "version": "1.0",
  "generatedAt": "<ISO 8601>",
  "skills": {
    "generate-unit-tests": {
      "descriptionLength": 245,
      "hasKeywordsSuffix": true,
      "hasWhenToUse": true,
      "triggerKeywords": ["test", "unit test", "coverage", "JUnit"],
      "routedBy": ["conductor", "dev-orchestrator"],
      "referencedByAgents": ["test-specialist"],
      "invocationMode": "model_routed",
      "estimatedTokenCost": 3200
    }
  }
}
```

#### Invocation Mode Classification

| Mode | Definition |
|------|-----------|
| `model_routed` | Discovered and invoked via description matching |
| `agent_delegated` | Invoked by an agent as part of its workflow |
| `explicit_only` | Requires explicit user mention (name or keyword) |
| `pipeline_only` | Used only during bootstrap, not at runtime |

### Phase 12 Rules

- Run this phase AFTER all generation phases (4–11) but BEFORE validation (Phase 13)
- Phase 13 (Validate) should READ `.runtime-fidelity.json` to verify cleanup decisions
- If a retained artifact has no `runtimeRole` entry, Phase 13 should flag it as a validation error
- If a `bootstrap_only` artifact survives cleanup, Phase 13 should flag it as a cleanup error
- Update `.bootstrap-state.json` with phase `12-runtime-compilation` status after completion

---

## Phase 13: Validate

Validation is mandatory.

### Structural validation

- frontmatter is valid
- required files exist
- no placeholder content
- names and paths are consistent
- no broken internal file references: scan all generated `.md` files for relative links (e.g., `](../constitution.md)`, `](../../constitution.md)`) and verify the target file exists in the generated output or the target repo
- no orphan skills: every skill folder in `.github/skills/` is either referenced by a generated file or retained by tier classification

### Functional validation

- instructions match real files
- generated `copilot-instructions.md` begins with the 4-rule operating core and remains a compact operating card
- generated agents reference real stacks and repo truth
- generated workflow-owning agents surface success criteria, verification method, and stop conditions
- skills reference actual commands
- generated reusable skills define an expected outcome, verification approach, and stop/escalation rule when the workflow is non-trivial
- generated prompts include a clear verify target or an explicit verification gap when the workflow is non-trivial
- no agent references a specialist that was not generated
- handoff targets reference agents that exist in the generated set
- handoff prompts provide meaningful context for the target agent
- `AGENTS.md` (when generated) lists only agents that exist and groups them correctly
- nested `AGENTS.md` files (when generated) reference only domain-relevant agents
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
- optionally run `context-assembly-simulator` to verify per-agent context budget for key scenarios
- for repos with 3 or more generated instruction files, run `instruction-conflict-detector` to verify no overlapping instructions contradict each other — Error-level conflicts must be resolved before the manifest is finalized
- for repos with fewer than 3 instruction files, the conflict check is optional
- optionally run `tool-permission-auditor` to verify agent tool access matches declared roles
- optionally run `repo-memory-promoter` to identify instruction bloat or underdocumented subsystems surfaced during generation

### Truthfulness validation

Reject generated output that:

- promises 100% branch coverage everywhere by default
- claims full autonomy without scope caveats
- claims business awareness without evidence
- implies verification happened when it did not

---

## Phase 14: Devcontainer

If the target repo already has a devcontainer, review it.

If it does not:

- ask whether the user wants one
- generate only if there is clear value

Do not force devcontainer output on every repo.

---

## Phase 15: Manifest, Snapshot, Cleanup, and Summary

Write a manifest describing what was generated and why.

Recommended artifacts:

- `.github/.bootstrap-manifest.json`
- `.github/.bootstrap-state.json`
- `.github/.bootstrap-snapshot.json`
- `.github/.bootstrap-summary.md`
- `docs/06-copilot-onboarding.md` when retained runtime assets justify user-facing onboarding guidance

The manifest is the authoritative keep list for the final generated `.github/` tree.

At minimum, record:

- project classification and context risk
- capability tier, selection mode, and tier reason
- toolkit version
- generated files to keep
- skipped file groups and why they were skipped
- optional files intentionally retained for runtime use
- major assumptions and unresolved gaps

### Manifest construction rule

Build the manifest keep set from `.github/.runtime-fidelity.json` plus the classification outcome and capability tier, not from a hard-coded prompt or skill name allowlist alone.

- Keep `auto_injected`, `discoverable`, and `human_only` artifacts by default.
- Keep `reference_only` artifacts when a retained artifact references them.
- Remove artifacts only when they are explicitly classified as `bootstrap_only` or were intentionally skipped by the generation/classification strategy.

### Bootstrap Snapshot

Generate `.github/.bootstrap-snapshot.json` as a baseline for drift detection. This captures the repo state at the moment bootstrap completes so that future drift analysis can compare against it.

```json
{
  "version": "1.0",
  "generatedAt": "<ISO 8601>",
  "toolkitVersion": "<from .github/VERSION>",
  "classification": "Standard",
  "capabilityTier": "Collaborative",
  "tierSelectionMode": "inferred",
  "tierReason": "Mixed docs and code workflows benefit from planning, review, and bounded diagnostics without the full governed surface.",
  "dimensions": {
    "moduleTopology": {
      "modules": ["core", "api", "web"],
      "moduleCount": 3,
      "buildTool": "maven"
    },
    "frameworkFingerprint": {
      "frameworks": ["spring-boot:3.2", "junit:5.10"],
      "dependencyCount": 42
    },
    "instructionCoverage": {
      "totalInstructions": 8,
      "coveredGlobs": ["**/*.java", "**/*.ts", "**/pom.xml"],
      "estimatedCoveragePercent": 85
    },
    "referenceIntegrity": {
      "totalReferences": 120,
      "brokenReferences": 0
    },
    "sourceOfTruth": {
      "canonicalFiles": 15,
      "domains": ["order", "payment", "auth"]
    }
  },
  "fileHashes": {
    ".github/copilot-instructions.md": "<sha256-first-8>",
    ".github/agents/dev-orchestrator.agent.md": "<sha256-first-8>"
  }
}
```

The snapshot should:

1. Capture the 5 drift dimensions (module topology, framework fingerprint, instruction coverage, reference integrity, source of truth)
2. Record SHA-256 hashes (first 8 chars) of all generated files for file-level drift detection
3. Be listed in the manifest keep set as a retained runtime artifact
4. Be added to `.gitignore` if the team prefers not to commit it (ask during Phase 15)

The final summary should include:

- classification and context risk
- capability tier and whether it was explicit or inferred
- truth-pack status
- generated files
- skipped files and why
- major assumptions
- recommended next step

Generate `.github/.bootstrap-summary.md` from the final generated state with, at minimum:

- classification, context risk, and capability tier
- retained artifacts grouped by runtime role
- removed artifacts grouped by removal reason
- highest-cost context contributors when relevant
- retained user-facing starting points after cleanup

Generate `docs/06-copilot-onboarding.md` from the final retained runtime surface with, at minimum:

- what bootstrap retained for day-to-day use in this repo
- where maintainers should start
- when to use direct execution versus spec-driven workflows
- how to escalate to planning or review flows that were retained
- when `review-memory-promotion` and review prompts are retained, how to use `/promote-review-memory` as an optional follow-up after durable accepted review findings
- when `context-inspector` is retained, how to use `/inspect-context` for bounded runtime diagnostics

If a repo is so small that a separate onboarding file would clearly be noise, it is acceptable to merge the onboarding guidance into `docs/00-repo-overview.md` instead. If you do that, do not generate an empty or placeholder `docs/06-copilot-onboarding.md`.

Cleanup is mandatory, not optional.

After generation and validation:

1. Compare the copied bootstrap bundle with `.github/.bootstrap-manifest.json`.
2. Delete files and folders that are not listed in the manifest keep list.
3. Keep only files that are:
   - generated specifically for the target repo
   - required runtime assets for the generated repo
   - manifest/state/checkpoint artifacts explicitly declared in the manifest
4. **keepSet-wins rule**: When a file or directory appears in both `deleteSet` and the keepSet (derived from `generatedFiles`), the keepSet takes precedence. This prevents Phase 15 from deleting files generated by earlier phases (e.g., Phase 11 hooks) that happen to share a directory path with copied bundle assets.

### Gitignore management

Append entries to the target repo's `.gitignore` for generated runtime artifacts that should not be committed:

1. When memory hooks are generated (Phase 11): add `.memory/` if not already present.
2. When the team prefers not to commit bootstrap metadata: add `.github/.bootstrap-manifest.json`, `.github/.bootstrap-state.json`, `.github/.bootstrap-snapshot.json` if not already present.
3. When session checkpoint hooks are generated: add `.github/.session-checkpoint.md` if not already present.

Rules:
- Read the existing `.gitignore` before appending to avoid duplicates.
- Group new entries under a `# Copilot Bootstrap` comment block.
- Do not modify any existing entries in `.gitignore`.
- If `.gitignore` does not exist, create it with only the necessary entries.

### Bootstrap-only assets

The following agents, prompts, and docs exist only to support the bootstrap pipeline and must be removed during cleanup (unless the repo is the toolkit source itself):

**Bootstrap-only agents:**
- `conductor` — bootstrap orchestrator, replaced by `dev-orchestrator` post-bootstrap
- `agent-generator` — meta-agent for generating Copilot configs
- `codebase-analyzer` — deep scan agent used only during bootstrap Phase 1

**Bootstrap-only prompts:**
- `generate-agents`
- `generate-instructions`
- `generate-skills`
- `analyze-project` (unless the generated repo explicitly retains it)

User-facing review prompts such as `plan-review-scope`, `promote-review-memory`, and `promote-learning` are runtime assets, not bootstrap-only prompts.

**Bootstrap-only docs:**
- `.github/docs/` files that describe the toolkit rather than the target repo

### Skill cleanup rules

During cleanup, respect the skill retention tiers defined in Phase 9:

- **Core skills**: never remove
- **Universal skills**: never remove — these are stack-agnostic process skills useful to every project
- **Conditional skills**: remove when the target stack or evidence signal was not detected
- **Meta/toolkit skills**: retain ongoing maintenance skills like `generate-copilot-config`, `analyze-codebase`, `drift-detector`, `repo-memory-promoter`, `review-memory-promotion`, `review-effectiveness`, `correction-ledger`, and `context-inspector` according to capability tier; keep validation/debug helpers based on classification and tier
- **Bootstrap-only skills**: always remove (unless the repo is the toolkit source)

New runtime skills created during bootstrap must still be classified by tier and retained according to that tier. Do not delete a generated skill merely because its name is absent from an older example list.

The most common cleanup mistake is treating Universal skills as Conditional. Skills like `learn-codebase`, `generate-adr`, `sprint-planning`, `specify-feature`, `generate-sequence-diagram`, `refine-user-input`, etc. have no codebase detection signal because they are process skills — they must survive cleanup regardless of detected stack.

The second most common cleanup mistake is treating repo-size classification as if it already decided the retained governance surface. Use capability tier for that decision instead of overloading `Small`, `Standard`, or `Enterprise` with product-footprint meaning.

### General cleanup targets

Cleanup should also remove stale or irrelevant toolkit assets, especially:

- unused stack instruction templates
- unused specialist agents (but not Universal skills — see skill cleanup rules above)
- prompts that are not supported in the generated repo (but keep runtime prompts that target retained agents or skills)
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
- maintainers can understand the retained surface from the generated summary and onboarding guidance without reverse-engineering the whole bundle
