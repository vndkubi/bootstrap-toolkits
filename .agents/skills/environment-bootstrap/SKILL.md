---
name: environment-bootstrap
description: Establish the smallest reproducible local environment for inspecting, building, testing, or running a repository, and capture proof that it works. Use when onboarding, reproducing a task, or when setup is missing or stale. Do not use for production deployment or secret provisioning.
---

# Environment Bootstrap

Prefer repository evidence and reversible setup steps.

Apply `.ai-team/protocols/model-neutral-execution.md`. Under `compatibility-strict`, execute only this skill, state every prerequisite before action, and use the exact output contract.

## Workflow

1. Inspect manifests, lockfiles, version files, container definitions, CI workflows, and existing setup documentation before installing anything.
2. Record the detected operating system, runtime versions, package manager, required services, and environment-variable names. Never print or commit secret values.
3. Choose the smallest supported setup path and explain any deviation from repository documentation.
4. Install or start only what the task requires. Keep generated state and caches out of source control.
5. Run a cheap smoke check first, then the relevant build or test command.
6. Capture commands, exit status, expected signal, actual signal, and unresolved gaps.
7. Update setup documentation only when the task authorizes documentation changes.

## Output Contract

Return:

- Detected prerequisites and evidence
- Commands executed
- Verification results
- Environment variables by name only
- Deviations, blockers, and cleanup steps
- Reproducibility status: `VERIFIED`, `PARTIAL`, or `BLOCKED`

Do not connect to production or request live credentials when a local fixture, mock, or documented non-production path can prove the workflow.
