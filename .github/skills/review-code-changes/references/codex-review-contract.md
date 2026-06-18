# Codex-Style Review Contract

This contract adapts the review discipline from OpenAI Codex's public
`codex-rs/core/review_prompt.md` for this bootstrap bundle. Use it to
calibrate findings after functional, technical, and mobile review stages.

Source: https://github.com/openai/codex/blob/main/codex-rs/core/review_prompt.md

## Qualifying Finding

Report a finding only when all of these are true:

- It meaningfully affects correctness, security, performance, reliability, or maintainability.
- It is discrete, actionable, and introduced by the reviewed change.
- The author would likely fix it once they understood the issue.
- It does not depend on unstated intent or speculative downstream breakage.
- The affected callers, inputs, environments, or scenarios are identifiable.
- It is not just an intentional product or design choice.

Prefer no finding over low-confidence noise.

## Do Not Report

- Style nits unless they obscure behavior or violate a documented standard.
- Broad refactor advice without a concrete defect.
- Pre-existing issues not made worse by the change.
- "Could be better" comments with no failing scenario.
- Duplicates of the same root cause.
- Missing tests unless the uncovered behavior is changed, risky, or required by the review scope.

## Priority Mapping

Use Codex priority labels in every blocker, warning, and suggestion title.

| Priority | Existing severity | Meaning |
|---|---|---|
| P0 | blocker | Universal release blocker or operational outage risk. Rare. |
| P1 | blocker | Urgent defect that should be fixed before merge or next cycle. |
| P2 | warning | Normal bug or risk the author should fix. |
| P3 | suggestion | Low-risk improvement or maintainability issue. |

If the issue is not worth at least P3, omit it.

## Comment Rules

- Keep the affected line range as short as possible, ideally 1-5 lines.
- Point to a line that overlaps the diff whenever possible.
- Explain the concrete scenario that triggers the issue.
- Keep the body to one concise paragraph.
- Use matter-of-fact tone. No praise filler, no blame.
- Include snippets only when needed; keep code examples to 3 lines or less.
- Use `suggestion` blocks only for exact replacement code.

## Overall Correctness

Classify the patch as incorrect when any P0, P1, or unresolved P2 finding means
existing behavior, tests, operations, or required business behavior would break.

Classify it as correct when there are no qualifying findings or only non-blocking
P3 suggestions that do not threaten the patch's intended behavior.

Use `needs-clarification` when business context is too weak to honestly decide
for a risky change.

## Structured Finding Fields

When producing `review-report.json`, preserve the bundle's existing fields and
add these Codex-style fields when available:

- `priority`: 0, 1, 2, or 3
- `confidenceScore`: number from 0 to 1
- `codeLocation.absoluteFilePath`: absolute file path
- `codeLocation.lineRange.start`: first relevant line
- `codeLocation.lineRange.end`: last relevant line

The markdown title should start with `[P0]`, `[P1]`, `[P2]`, or `[P3]`.
