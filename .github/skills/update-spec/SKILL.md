---
name: update-spec
description: "Incrementally update an existing feature workspace when change requests arrive. Patches spec.md first, then updates affected downstream artifacts such as plan.md, research.md, data-model.md, contracts/, quickstart.md, and tasks.md."
---

# Update Spec

Update an existing spec-driven feature workspace incrementally instead of rewriting it from scratch.

## When to Use

- A change request affects an existing feature
- `review-spec` found gaps that require artifact updates
- Requirements, constraints, or acceptance criteria changed after planning
- Implementation revealed drift that must be reflected back into the spec-kit

## Inputs

- feature workspace under `specs/<feature-id>-<slug>/`
- change request or review feedback

## Core Rule

Update the workspace as a coordinated set of artifacts.

- `spec.md` is the source-of-truth starting point
- downstream artifacts must be patched when the change affects them
- do not update only one file if the change logically impacts several artifacts

## Workflow

### Step 1: Parse The Change

Capture:

- what changed
- why it changed
- which requirements or acceptance criteria are affected
- whether the change is additive, modifying, or removing behavior

### Step 2: Read The Existing Workspace

Read what exists:

- `spec.md`
- `plan.md`
- `research.md`
- `data-model.md`
- `contracts/`
- `quickstart.md`
- `tasks.md`

### Step 3: Build Artifact Impact Map

For each requested change, map the affected artifacts:

| Change | Affects |
|---|---|
| Requirement wording | `spec.md`, maybe `plan.md`, maybe `tasks.md` |
| Technical choice | `plan.md`, `research.md`, maybe `contracts/`, maybe `tasks.md` |
| Model or state change | `spec.md`, `plan.md`, `data-model.md`, maybe `contracts/`, `tasks.md` |
| Validation scenario change | `spec.md`, `quickstart.md`, `tasks.md` |

### Step 4: Patch In Order

Apply changes in this order:

1. `spec.md`
2. `plan.md`
3. `research.md` if technical rationale changed
4. `data-model.md` if entities, relationships, or states changed
5. `contracts/` if API or schema contracts changed
6. `quickstart.md` if validation scenarios changed
7. `tasks.md` if execution order or work items changed

#### Contract re-emission rule

If the spec change touches an external surface (endpoint added/removed/renamed, request/response schema, event topic, CLI command, error code) **and** the taxonomy is API-bearing, re-invoke the `generate-api-contract` skill to regenerate the affected file(s) under `contracts/`. A spec change that narrows or widens acceptance criteria is treated as a contract change. Update `tasks.md` if test tasks need re-running.

When the change is cosmetic (wording clarifications, typo fixes, non-normative notes), leave `contracts/` unchanged and note the decision in the update report.

### Step 5: Preserve History

When the workspace tracks versions or changelog notes:

- bump the version in `spec.md` if appropriate
- append a changelog entry when the document already uses one
- keep unchanged sections intact

### Step 6: Re-Review

After patching:

- verify the workspace is still coherent
- rerun `review-spec` when the change is material
- regenerate tasks only if task-level impact exists

## Output Format

Save changes in place and produce a concise update report:

```md
# Spec Update Report

## Change Summary

## Artifact Impact
| Artifact | Action | Notes |
|---|---|---|
| spec.md | modified | ... |

## Recommended Next Step
```

## Validation

- [ ] `spec.md` was updated first
- [ ] Downstream affected artifacts were patched, not ignored
- [ ] Unaffected artifacts were left unchanged
- [ ] A follow-up review or task refresh is recommended when needed
