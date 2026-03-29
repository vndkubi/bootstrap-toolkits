---
name: drift-detector
description: "Detect configuration drift between the bootstrap snapshot and the current repository state. Scans module topology, frameworks, instruction coverage, reference integrity, and source-of-truth changes to produce a drift score with actionable recommendations. Use after significant repo changes, dependency updates, or when Copilot suggestions seem stale. Keywords: drift detection, config drift, bootstrap freshness, stale config, rebootstrap, configuration audit."
---

# Drift Detector

Detect how much the repository has drifted from its last bootstrap snapshot. Produces a scored drift report with per-dimension breakdown and a recommended action (none, patch, incremental-rebootstrap, full-rebootstrap).

## When to Use

- After adding new modules, frameworks, or significant dependencies
- When Copilot suggestions seem stale or misaligned with the current codebase
- Before deciding whether to rerun bootstrap or just patch config
- As a periodic health check (monthly or quarterly)
- After major refactoring or architecture changes
- Keywords: drift, stale config, rebootstrap decision, config freshness, bootstrap health

---

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| Snapshot path | Optional | Path to `.github/.bootstrap-snapshot.json`. Defaults to `.github/.bootstrap-snapshot.json` |
| Scan depth | Optional | `lightweight` (default) or `deep`. Lightweight checks build files + directory structure only. Deep re-runs full Phase 1 scan logic. |

---

## Step 1: Load Snapshot

Read `.github/.bootstrap-snapshot.json`. If absent:

> "No bootstrap snapshot found. Run `/bootstrap-copilot` (Phase 15) to generate a baseline snapshot, or use `upgrade-config` if migrating from an older toolkit version."

Parse the snapshot and extract the 5 dimension baselines.

---

## Step 2: Scan Current State

### Lightweight scan (default)

For each dimension, gather current values using minimal I/O:

#### 2a. Module Topology

- List top-level directories and build files (pom.xml, build.gradle.kts, package.json, *.csproj, pyproject.toml)
- Count modules and compare against snapshot `moduleCount`
- Detect added or removed modules

#### 2b. Framework Fingerprint

- Read build files for dependency declarations
- Extract framework names and major versions
- Compare against snapshot `frameworks` list
- Detect added, removed, or version-bumped frameworks

#### 2c. Instruction Coverage

- List all `.github/instructions/*.instructions.md` files
- Extract `applyTo` globs from each
- Estimate coverage: what percentage of source files are matched by at least one instruction glob
- Compare against snapshot `estimatedCoveragePercent`

#### 2d. Reference Integrity

- Scan `.github/agents/*.agent.md` for skill and agent references
- Scan `.github/skills/*/SKILL.md` for cross-references
- Count total references and broken references (target does not exist)
- Compare against snapshot `brokenReferences`

#### 2e. Source of Truth

- Read `.github/SOURCE-OF-TRUTH.md` if present
- Count canonical files and domains
- Compare against snapshot `canonicalFiles` and `domains`

### Deep scan

Re-run full Phase 1 scan logic from `generate-copilot-config` to get comprehensive current state. Use this when lightweight scan shows high drift or when preparing for rebootstrap.

---

## Step 3: Calculate Drift Score

For each dimension, calculate a per-dimension drift score (0–100):

| Dimension | Drift signal | Score formula |
|-----------|-------------|---------------|
| Module topology | Modules added/removed | `(abs(current - baseline) / max(baseline, 1)) * 100`, capped at 100 |
| Framework fingerprint | Frameworks changed | `(changed_count / max(baseline_count, 1)) * 100`, capped at 100 |
| Instruction coverage | Coverage delta | `abs(current_pct - baseline_pct)` |
| Reference integrity | Broken refs appeared | `(new_broken / max(total_refs, 1)) * 100`, capped at 100 |
| Source of truth | Domains/files changed | `(abs(current - baseline) / max(baseline, 1)) * 100`, capped at 100 |

### Composite Score

Weighted average of dimension scores:

| Dimension | Weight |
|-----------|--------|
| Module topology | 30 |
| Framework fingerprint | 25 |
| Instruction coverage | 20 |
| Reference integrity | 15 |
| Source of truth | 10 |

`compositeScore = sum(dimension_score * weight) / sum(weights)`

### Action Thresholds

| Composite score | Severity | Recommended action |
|-----------------|----------|--------------------|
| 0–19 | none | No action needed |
| 20–44 | patch | Update specific instructions or agents manually |
| 45–69 | incremental-rebootstrap | Re-run Phases 1–3, then selectively regenerate changed areas |
| 70–100 | full-rebootstrap | Full pipeline re-run recommended |

---

## Step 4: File-Level Drift (optional)

If `fileHashes` are present in the snapshot:

1. Re-hash current files using SHA-256 (first 8 chars)
2. Compare against snapshot hashes
3. Report which generated files were manually edited since bootstrap
4. Flag files that were deleted but are still in the manifest

---

## Step 5: Output Report

```markdown
## Drift Detection Report

**Snapshot**: [snapshot generatedAt timestamp]
**Current scan**: [current timestamp]
**Toolkit version at bootstrap**: [from snapshot]
**Scan depth**: lightweight | deep

### Composite Score: [X]/100 — [severity]

**Recommended action**: [none | patch | incremental-rebootstrap | full-rebootstrap]

### Per-Dimension Breakdown

| Dimension | Baseline | Current | Score | Status |
|-----------|----------|---------|-------|--------|
| Module topology | 3 modules | 5 modules | 67 | ⚠️ |
| Framework fingerprint | spring-boot:3.2, junit:5.10 | spring-boot:3.3, junit:5.10, testcontainers:1.19 | 33 | ⚠️ |
| Instruction coverage | 85% | 72% | 13 | ✅ |
| Reference integrity | 0 broken | 2 broken | 8 | ✅ |
| Source of truth | 3 domains | 3 domains | 0 | ✅ |

### Key Changes Detected

- **Added modules**: `notification-service`, `gateway`
- **Added frameworks**: `testcontainers:1.19`
- **Version bumps**: `spring-boot 3.2 → 3.3`
- **Broken references**: `agents/notification-specialist.agent.md` references missing skill `generate-notification-tests`
- **Coverage gap**: new `*.kt` files in `gateway/` not covered by any instruction

### File-Level Changes (if hashes available)

| File | Status |
|------|--------|
| .github/copilot-instructions.md | Modified (hash mismatch) |
| .github/agents/dev-orchestrator.agent.md | Unchanged |
| .github/instructions/kotlin.instructions.md | Deleted |

### Recommended Actions

1. [Based on severity, list specific steps]
2. ...
```

---

## Integration Points

| Consumer | How it uses drift report |
|----------|------------------------|
| `upgrade-config` | Reads drift score to decide upgrade vs rebootstrap path |
| `review-effectiveness` | Includes drift data in effectiveness assessment |
| `resume-bootstrap` | If drift is high and pipeline resumes, warn that scan data may be stale |
| `validate-bootstrap-output` | Can reference drift report for post-bootstrap health checks |

---

## Common Failure Modes

| Failure | Cause | Fix |
|---------|-------|-----|
| No snapshot found | Bootstrap predates snapshot feature | Run `upgrade-config` or manual bootstrap to create snapshot |
| Lightweight scan misses changes | Source changes not reflected in build files | Use deep scan mode |
| False high drift | Temporary branch with experimental modules | Run on the main branch for accurate results |
| Hash comparison fails | File encoding changed | Re-generate snapshot |
