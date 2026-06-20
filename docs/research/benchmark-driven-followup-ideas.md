# Benchmark-Driven Follow-Up Ideas

Date: 2026-06-20

Evidence collected during this implementation:

- Local benchmark command: `node tests/harness-bench/bench.js local-run --config tests/harness-bench/local-repos.example.json --model "gpt 5.3 codex spark" --out <ignored-local-run.json>`
- Scorecard/report command: `node tests/harness-bench/bench.js score --run <ignored-local-run.json> --model "gpt 5.3 codex spark" --out <ignored-scorecard.json>` followed by `report`.
- Local benchmark result: 9 total read-only probes, 9 passed, pass rate 100%, model `gpt 5.3 codex spark`, no model mismatch, median tokens 0.
- Repo-intel packet probe: 8 candidate files, 12 related tests, estimated context 3581 tokens for the task "extend benchmark evidence quality for bootstrap MCP and repo intelligence".

The current local benchmark is useful as a smoke gate, but it does not yet prove token savings, context quality, or write-path quality. The ideas below target those missing proof points.

## Idea: Trace Quality Benchmark Pack

### 1. Problem

The local benchmark currently proves that configured repos are reachable and readable, but it does not measure whether agent outputs are better, cheaper, or faster.

### 2. Why This Is Needed

The benchmark harness now records `variant.model`, imports traces, and blocks model mismatches. It needs a curated trace corpus to turn those mechanics into decision evidence.

### 3. What Happens Without It

The team can keep passing 9/9 local probes while still having no evidence that a workflow reduces token cost, repair loops, or poor output quality.

### 4. Proposed Solution

Create a small curated trace pack with sanitized JSONL examples for bootstrap generation, MCP read/audit usage, repo-intel packet generation, and failed repair loops.

### 5. How It Works

- Flow: collect trace, redact, import with `import-trace`, score, compare against baseline.
- Components: trace fixtures, scorecard gates, report markdown, redaction checklist.
- Inputs: sanitized JSONL trace and expected quality outcome.
- Outputs: run JSON, scorecard JSON, benchmark report.
- Integration points: `tests/harness-bench/bench.js`, `scorecard.schema.json`, CI-safe tests.
- Failure modes: trace contains private paths, model mismatch, missing token usage, weak quality label.

### 6. When To Use

Use it before changing prompts, MCP routing descriptions, repo-intel ranking, or benchmark gates.

### 7. When Not To Use

Do not use it for private raw repo traces or for one-off local experiments that cannot be sanitized.

### 8. Difference From Current Approach

Current local-run evidence is read-only and zero-token. The trace pack would measure real agent-loop behavior while preserving the exact model label in metadata.

### 9. Source Of Truth / Proof Plan

- Metric: pass rate, accepted useful changes, median tokens, median repair loops, model mismatch count.
- Baseline: current local benchmark report, 9/9 probes, 0 median tokens.
- Experiment setup: import 10 to 20 sanitized traces with `--model "gpt 5.3 codex spark"`.
- Expected improvement: benchmark reports become able to reject token or quality regressions.
- Failure condition: more than 5% trace records lack token data or contain unredacted local/private paths.

### 10. Cost vs Benefit

- Engineering cost: low to medium, mostly fixture curation and redaction checks.
- Runtime cost: low, JSONL parsing only.
- Token cost: none in CI unless traces are generated live.
- Maintenance cost: medium, traces need periodic refresh.
- Operational risk: private data leakage if redaction is weak.
- Expected gain: real compare gates instead of smoke-only local probes.

### 11. AI Token Impact

This does not directly reduce tokens. It creates the counting method needed to prove future token reductions: trace token totals, median token deltas, and repair-loop deltas.

### 12. Recommendation

Build now. The benchmark plumbing already exists, and the current report shows the main evidence gap clearly.

## Idea: Repo-Intel Precision Evaluator

### 1. Problem

The router can build compact packets, but current tests mainly prove shape and clipping. They do not prove that the best files are ranked first for real tasks.

### 2. Why This Is Needed

The packet probe returned 8 candidate files and 12 related tests within 3581 estimated tokens, which is compact enough to inspect. The next question is ranking quality.

### 3. What Happens Without It

Agents may receive small packets that are still low-signal, causing wasted edits or extra search loops even though token count looks good.

### 4. Proposed Solution

Add a golden query suite for `repo-intel search` and `repo-intel packet` with expected top files, related tests, omitted counts, and max token budgets.

### 5. How It Works

- Flow: run golden tasks, compare top-k files and related tests with expected anchors.
- Components: query fixtures, precision metrics, packet budget assertions.
- Inputs: task text, expected files, expected tests, max token budget.
- Outputs: precision@1, precision@3, test recall, token estimate, omitted count.
- Integration points: `tests/test-repo-intel.js`, `specs/012-repo-intelligence-context-router/contracts/`.
- Failure modes: task text too broad, generated files over-ranked, related tests missed.

### 6. When To Use

Use it before changing ranking, low-signal penalties, related-test discovery, or packet construction.

### 7. When Not To Use

Do not use it as a replacement for full code review or semantic graph validation. It is an MVP precision gate.

### 8. Difference From Current Approach

Current tests assert valid output shape. This evaluator would assert that the output is useful for known tasks.

### 9. Source Of Truth / Proof Plan

- Metric: precision@1, precision@3, related-test recall, estimated token count.
- Baseline: current packet probe, 8 candidates, 12 related tests, 3581 estimated tokens.
- Experiment setup: 15 golden tasks across benchmark, MCP, docs, and skills surfaces.
- Expected improvement: at least 80% precision@3 while staying under 30000 estimated tokens.
- Failure condition: generated/vendor/build files rank above source files for normal source tasks.

### 10. Cost vs Benefit

- Engineering cost: medium, mostly fixture design.
- Runtime cost: low, deterministic file scans.
- Token cost: none.
- Maintenance cost: medium, expected anchors must evolve with file moves.
- Operational risk: overfitting to fixture wording.
- Expected gain: measurable context quality instead of only context size.

### 11. AI Token Impact

Expected input token reduction is a hypothesis. Validate by comparing packet estimated tokens against manual broad-search context for the same tasks using `ceil(char_count / 4)`.

### 12. Recommendation

Prototype first. The current router is intentionally thin, so precision metrics should guide the next ranking changes.

## Idea: MCP Write Diff Gate

### 1. Problem

Confirmed MCP writes now have preview, `--allow-write`, `confirm_write`, path boundaries, and audit logging. They do not yet emit a structured diff quality gate before write confirmation.

### 2. Why This Is Needed

Write-capable tools are higher risk than read/audit tools. A diff gate would make confirmed writes reviewable before they touch files.

### 3. What Happens Without It

Operators can preview generated content, but they must manually infer file impact, redaction risk, and whether the generated content matches expected bootstrap contracts.

### 4. Proposed Solution

Add a preview response field containing a unified diff, path risk classification, redaction count, and suggested validation command before confirmed writes.

### 5. How It Works

- Flow: generate output, diff against current file or empty file, return preview metadata, write only after confirmation.
- Components: diff builder, redaction summary, validation hint selector, audit extension.
- Inputs: tool input, target path, generated content, existing file content.
- Outputs: diff, risk flags, validation commands, audit metadata.
- Integration points: `generate_spec`, `generate_tasks`, `.bootstrap-mcp/audit.log`, `validate_bootstrap_output`.
- Failure modes: large diff clipped too aggressively, binary files, stale preview confirmed after file changes.

### 6. When To Use

Use it for every write-capable MCP generation tool.

### 7. When Not To Use

Do not use it for read-only tools or for cases where the host already provides an equivalent trusted diff review surface.

### 8. Difference From Current Approach

Current write safety is permission and path based. This adds content-impact evidence before confirmation.

### 9. Source Of Truth / Proof Plan

- Metric: preview diff present, audit log written, validation hint present, path rejection coverage.
- Baseline: current MCP tests cover write refusal, confirm requirement, audit log, and path rejection.
- Experiment setup: add temp-repo tests for new-file diff, overwrite diff, clipped diff, and stale preview rejection.
- Expected improvement: every confirmed write has a reviewable diff and validation hint.
- Failure condition: any confirmed write lacks diff metadata or audit coverage.

### 10. Cost vs Benefit

- Engineering cost: medium.
- Runtime cost: low for markdown-sized outputs.
- Token cost: low if diffs are clipped and bounded.
- Maintenance cost: low to medium.
- Operational risk: false confidence if diff is clipped without clear omitted count.
- Expected gain: safer write-capable MCP adoption.

### 11. AI Token Impact

This may add output tokens during previews. Keep the diff clipped and record omitted counts; validate that preview size stays below a fixed character budget.

### 12. Recommendation

Prototype first. The current write guard is sufficient for v1, but diff evidence is the next safety layer before expanding write tools.
