# Harness Benchmarking — Quickstart

> First executable slice: `tests/harness-bench/bench.js`

## What Exists Now

The current MVP can score imported run results and compare variants offline. It is intentionally model-agnostic:

- input: run JSON with per-task pass/cost/loop metrics
- output: scorecard JSON matching `contracts/scorecard.schema.json`
- diff: pass/fail gate and metric deltas between two variants

Synthetic fixtures under `tests/harness-bench/sample-runs/` are calibration data only. They are not real effectiveness evidence.

## Score A Run

```bash
node tests/harness-bench/bench.js score \
  --run tests/harness-bench/sample-runs/agent-only.synthetic.json
```

## Compare Two Variants

```bash
node tests/harness-bench/bench.js compare \
  --baseline tests/harness-bench/sample-runs/agent-only.synthetic.json \
  --candidate tests/harness-bench/sample-runs/bootstrap-router.synthetic.json
```

## Probe A Bootstrapped Repo

```bash
node tests/harness-bench/probe-bootstrap-output.js --repo /absolute/path/to/repo
```

This read-only probe emits a scorecard for bootstrap output consistency. It catches missing manifests, invalid JSON, and references to missing `docs/ai/*.md` files.

## Real Proof Procedure

1. Pick 10-25 golden PBIs.
2. Run each PBI with a fixed model in baseline mode, for example `agent-only`.
3. Run the same PBIs with `bootstrap` or `bootstrap-router`.
4. Convert each run into the run JSON shape documented in `tests/harness-bench/README.md`.
5. Generate scorecards and compare.
6. Claim improvement only from real A/B scorecards, never from synthetic fixtures.

## Verification

```bash
node tests/test-harness-bench.js
```
