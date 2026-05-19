---
name: tdd-implement-loop
description: "Drives Phase 5 (IMPLEMENT) of the /autorun loop. Runs a bounded red→green→refactor loop against the red suite authored in Phase 3. Enforces maxIterations + noProgressThreshold stop conditions; scopes regression via impact-analysis skill (fallback: full suite). Halts with tdd-no-progress or cost-cap gates. Never edits tests."
---

# TDD Implement Loop

Bounded TDD driver. Reads the red suite from Phase 3 and implements the minimum production code to turn it green, then runs a scoped regression.

## When to Use

- `prompts/autorun.prompt.md` Phase 5.
- `prompts/implement-feature.prompt.md` after the test-first checkpoint has produced RED evidence.
- Standalone when a human hands you a red suite and says "make it green".

## Inputs

- `test-coverage.md` — AC→test map from Phase 3.
- `failedTests[]` — initial list (all primary tests from Phase 3).
- `config.tddLoop.maxIterations` (default `6`).
- `config.tddLoop.noProgressThreshold` (default `2` consecutive iterations with no newly green test).
- `config.cost.maxUsd` — global cap; reset-free.

## Invariants

1. **Never edit tests.** Only production files. If a test appears wrong, raise a `tdd-test-bug-suspected` gate and stop — humans decide.
2. **One failing test at a time.** Pick the first red primary test in `test-coverage.md` order. Implement just enough to pass it.
3. **Never mock the primary SUT.** Article X applies. New mocks must be recorded in `mocks-used.md`.
4. **Never skip tests.** `@Disabled`, `.skip`, `@Ignore`, `xit`, `pytest.mark.skip` introduced during the loop → gate `tdd-test-skipped` (blocking).

## Loop

```
iteration = 0
consecutiveNoProgress = 0
while failedTests is not empty and iteration < maxIterations:
    iteration += 1
    target = failedTests[0]
    prevFailCount = len(failedTests)

    1. Locate the SUT: greplocate the endpoint/handler/controller/service referenced by the test's URL or method.
    2. If absent, create the minimum file(s) needed; else edit.
    3. Write the minimum production code to pass `target`.
    4. Run ONLY `target`.
    5. If still red: re-analyze; attempt one more patch. Second failure → mark iteration as no-progress.
    6. If green: run the scoped regression suite (see Scoping below).
       - Any previously green test now red → revert this iteration's edits; log `tdd-regression`; retry with a different approach.
       - All prior greens still green → remove `target` from failedTests.
    7. If len(failedTests) == prevFailCount: consecutiveNoProgress += 1 else consecutiveNoProgress = 0.
    8. If consecutiveNoProgress >= noProgressThreshold: gate `tdd-no-progress` (blocking), halt.
    9. Budget check. If cost spent >= maxUsd * 0.9: gate `cost-cap-warning`. If >= maxUsd: gate `cost-cap-exceeded` (blocking, exit 40).
```

## Regression Scoping

Call the `impact-analysis` skill with the changed files. It returns a list of likely-affected test files.

- If `impact-analysis` returns a set ≤ 200 tests: run that set.
- If it returns more, OR the skill errors, OR the repo has no module-dependency-map: run the full suite (fallback).
- Record chosen scope in trace.

## Output

- Production files edited (diff recorded in trace).
- `specs/<id>-<slug>/tdd-log.md`:

  | Iter | Target AC | Files changed | Duration | Scope size | Regression result |
  |---|---|---|---|---|---|
  | 1 | AC-US-B1-02 | `WidgetController.java`, `WidgetService.java` | 42s | 18 | ✅ |

- Trace events per iteration: `{phase: 5, action: "tdd-iteration", outputs: {iter, target, result, greenCount, redCount, costUsd}}`.

## Gates Emitted

| Condition | Gate id | Category | Blocking |
|---|---|---|---|
| maxIterations hit | `tdd-max-iterations` | config | true |
| noProgressThreshold hit | `tdd-no-progress` | config | true |
| Test edited during loop | `tdd-test-edited` | security | true |
| Test skipped during loop | `tdd-test-skipped` | security | true |
| Regression broke prior green | `tdd-regression` | config | false (retry first) |
| Mock introduced without entry | `article-x-violation` | business | true |
| Cost > maxUsd | `cost-cap-exceeded` | config | true (exit 40) |

## Verification

- Golden Java repo: 3 red tests → 3 green in ≤ 5 iterations, zero regressions, mocks-used.md empty.
- Negative: inject a bad implementation deliberately → `tdd-regression` fires and the loop retries.
- Negative: set `maxIterations=1` for a 3-AC spec → `tdd-max-iterations` fires cleanly.
