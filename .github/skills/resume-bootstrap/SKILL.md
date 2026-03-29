---
name: resume-bootstrap
description: 'Resume an interrupted Copilot bootstrap pipeline from the last completed phase. Reads .github/.bootstrap-state.json to determine which phases completed and which need to run. Use when the bootstrap pipeline was interrupted mid-run (context exhaustion, session timeout, error). Keywords: resume bootstrap, continue pipeline, restart from phase.'
---

# Resume Bootstrap Pipeline

Use this skill when the 15-phase bootstrap pipeline was interrupted before completing Phase 15.

## When to Use

- Session timed out mid-pipeline
- Context window exhausted during generation phases
- An error stopped the pipeline after some phases completed
- User closed the session and wants to continue

## Step 1: Read Pipeline State

Read `.github/.bootstrap-state.json` in the target project. If the file does not exist:
> "No bootstrap state found. Run `/bootstrap-copilot` to start a new pipeline."

Parse the state to determine:
- `toolkitVersion` — which toolkit version started this run
- `classification` — Small / Standard / Enterprise (already determined)
- `contextRisk` — already estimated, no need to re-estimate
- `phases` — which are `completed`, `in_progress`, `skipped`, or `pending`
- `generatedFiles` — what already exists (don't regenerate)
- `errors` — what went wrong last time

## Step 2: Present Status Report

Output a clear summary before resuming:

```
## Bootstrap Resume Status

Toolkit version: [version]
Classification: [Small | Standard | Enterprise]
Context risk: [low | medium | high]

### Phase Status
✅ Phase 1  — SCAN completed
✅ Phase 2  — CLASSIFY completed (Enterprise, 12 modules)
✅ Phase 3  — DOMAIN completed (8 domains, checkpoint written)
✅ Phase 4  — copilot-instructions.md generated
✅ Phase 5  — Domain instructions generated (8 files)
✅ Phase 6  — Language instructions generated (4 files)
✅ Phase 6b — Templates generated
⚠️ Phase 7  — INTERRUPTED (in_progress — only 3/9 agents written)
⏳ Phase 8  — Pending
⏳ Phase 9  — Pending
⏳ Phase 10 — Pending
⏳ Phase 11 — Pending
⏳ Phase 12 — Pending
⏳ Phase 13 — Pending
⏳ Phase 14 — Pending
⏳ Phase 15 — Pending

**Resume point**: Phase 7 (agent generation)
**Already generated**: [list files from generatedFiles]

Shall I resume from Phase 7? (yes/no)
```

Wait for user confirmation before proceeding.

## Step 3: Load Context from Scan Report and Checkpoint

Before resuming, load persistent context artifacts:
1. Read `.github/.scan-report.md` — this has the full Phase 1 scan results (identity, tech stack, modules, conventions, build commands). This is the primary context source for all subsequent phases.
2. Read `.github/.phase3-checkpoint.md` — this has the domain glossary, business rules, key workflows.
3. Read `.github/.session-checkpoint.md` — if present, this has in-progress decisions and plan state saved before context compaction. Restore any relevant constraints or decisions from it.
4. Read `.github/.runtime-fidelity.json` — if present from a prior Phase 12 run, this classifies generated artifacts by runtime role and maps relationships. Use it to avoid regenerating already-classified files.
5. If scan report is missing but Phase 1 completed, warn: "Scan report not found — Phase 1 context may be incomplete. Consider re-running Phase 1."
6. If checkpoint is missing but Phase 3 completed, warn: "Phase 3 checkpoint not found — domain context may be incomplete. Consider re-running Phase 3 or proceeding with reduced domain awareness."

## Step 4: Resume from Interrupted Phase

### Handling interrupted Phase 7 (Agent Generation)

1. Read `generatedFiles` from state — note which agents already exist
2. Determine which agents are MISSING (compare expected list for the classification vs what was generated)
3. Generate ONLY missing agents — do NOT overwrite existing ones
4. Continue Phase 7 to completion, then proceed to Phase 8

### Handling interrupted Phase 8 (Skill Generation)

1. Check which skill directories exist in `.github/skills/`
2. Compare against expected skills for the classification
3. Generate ONLY missing skills
4. Continue to Phase 9

### General Resume Rules

- **Never re-run completed phases** — trust the state file
- **Always re-run interrupted phases from scratch** (the `in_progress` phase may be partially written — regenerate all files from that phase)
- For re-run phases: delete partial output first, then regenerate cleanly
- **Update `.bootstrap-state.json`** after each phase completes (same as original pipeline)
- Phases marked `skipped` should remain skipped unless the skip condition has changed

## Step 5: Continue Normally to Phase 15

After the interrupted phase is re-completed, continue with all pending phases in order. Follow the `generate-copilot-config` skill for each phase's instructions.

At Phase 15: complete as normal (manifest + snapshot + cleanup + final report).

## Error Handling

| Situation | Action |
|-----------|--------|
| State file corrupted / invalid JSON | Ask user to run fresh bootstrap |
| Checkpoint file missing but Phase 3 completed | Warn + ask: "Re-run Phase 3 to restore context, or proceed without domain context?" |
| Generated file exists but appears corrupted | Delete and regenerate that file only |
| Toolkit version in state differs from current | Warn: "Bootstrap started with v[old], current toolkit is v[new]. Some generation patterns may differ. Proceed anyway? (yes/no)" |
