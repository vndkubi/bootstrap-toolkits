---
description: "Code review finding standards for actionable, introduced defects with P0-P3 priority labels and short line ranges."
applyTo: "**/*"
---

# Code Review Finding Standards

Apply these rules when the current task is reviewing code, a branch, a PR, or
changed files.

## Finding Bar

- Report only discrete defects introduced or worsened by the reviewed change.
- Require a concrete failing scenario, affected caller, input, environment, or business rule.
- Prefer no finding over speculative, style-only, broad refactor, duplicate, or pre-existing comments.
- Missing tests are findings only when changed risky behavior lacks required or meaningful coverage.

## Priority Labels

- `[P0]`: universal release blocker or operational outage risk.
- `[P1]`: urgent issue that should be fixed before merge or next cycle.
- `[P2]`: normal actionable bug or risk.
- `[P3]`: low-risk improvement worth fixing eventually.

If the issue is not worth `[P3]`, omit it.

## Comment Shape

- Keep the location as small as possible and tied to the diff.
- Explain why the issue is a bug in one concise paragraph.
- Name the scenario or condition needed for the bug to occur.
- Use matter-of-fact tone, no praise filler, no blame.
- Use `suggestion` blocks only for exact replacement code.
