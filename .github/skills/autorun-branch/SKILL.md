---
name: autorun-branch
description: "Manage the autorun/<PBI> branch lifecycle: create from HEAD, commit-per-phase with a standard prefix, support --abort (clean reset), and --revert (post-merge cleanup). Used only by the autorun orchestrator."
---

# Autorun Branch

Centralizes every git operation the autorun loop performs so the orchestrator prompt stays small and the behavior is testable.

## When to Use

- Phase 0 of `prompts/autorun.prompt.md`: create branch.
- After each phase: commit.
- When user invokes `/autorun <ref> --abort` or `--revert`.

## Preconditions

- Working tree is clean (`git status --porcelain` empty). If not, emit gate `dirty-working-tree` (category business) and halt.
- `git` is on PATH.
- Current HEAD is on a known branch (not detached).

## Operations

### `create(pbi)`

1. `base = git rev-parse --abbrev-ref HEAD` (record in trace).
2. `git checkout -b autorun/<slug(pbi)>`.
3. Store `base` in `.artifacts/<pbi>/branch-base.txt`.

### `commitPhase(phase, summary)`

1. `git add -A`.
2. `git commit -m "[autorun P<phase>] <summary>"` — skip if nothing staged.
3. Record commit sha in trace event.

### `abort(pbi)`

1. Stash any uncommitted work to `.artifacts/<pbi>/abort-stash.patch` via `git diff > ...`.
2. `git reset --hard <base>` (base read from the stored file).
3. **Leave branch in place** for inspection. User can `git branch -D autorun/<slug>` manually if desired.
4. Emit trace event `{action: "abort", phase: <N>, reason: <reason>}`.

### `revert(pbi)`

1. Verify branch exists; verify it is merged (or user passed `--force-revert`).
2. `git branch -D autorun/<slug>`.
3. Remove `.artifacts/<pbi>/`.
4. Update spec front-matter: `status: reverted`.

## Outputs

- All operations return `{ok: boolean, sha?: string, error?: string}`.
- Every operation emits exactly one trace event.

## Failure Modes

| Condition | Action |
|---|---|
| Dirty working tree on `create` | `dirty-working-tree` gate |
| Branch already exists | Reuse it (resume); trace a `resume-existing-branch` action |
| `revert` called on unmerged branch without `--force-revert` | `revert-unmerged` gate |
| `git` unavailable | Fail with exit 1; trace `{error: {code: "git-missing"}}` |

## Verification

- Integration test: create → commit 3 phases → abort → verify tree clean + base restored.
- Integration test: create → commit → manual merge → revert → verify branch + artifacts removed.
