---
name: evaluate-skill
description: "Evaluate a skill against repo-local checks and fixtures under tests/skills/<name>/eval.json. Produces pass/fail results and a numeric score so new or changed skills are validated before retention. Keywords: evaluate skill, skill checks, skill regression, skill score."
---

# Evaluate Skill

Run deterministic checks against a skill's checked-in evaluation fixture.

## When to Use

- Validating a new skill before keeping it in the runtime surface
- Checking whether a changed skill still satisfies its expected layout and metadata
- Building a lightweight CI gate for skill regressions

## Inputs

- Skill id
- Optional repo root override

## Outputs

- JSON result with pass/fail counts, score, and individual check results

## Workflow

1. Read `tests/skills/<name>/eval.json`.
2. Execute its file, text, and JSON assertions.
3. Return a score and fail fast on missing fixtures.

## References

- Script: `.github/skills/evaluate-skill/scripts/evaluate-skill.js`

## Verification Contract

- Expected Outcome: all declared checks pass for the target skill.
- How to Verify: run `node .github/skills/evaluate-skill/scripts/evaluate-skill.js author-skill`.
- When to Stop or Escalate: stop when the skill has no fixture or the fixture asks for unsupported assertions.