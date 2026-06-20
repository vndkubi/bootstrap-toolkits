# Harness Bench

Offline scorecard runner for proving whether this bootstrap harness improves agent work.

This folder is the first executable slice of `specs/010-harness-benchmarking/`. It does not run Copilot by itself. It scores run data produced by `/autorun`, a Copilot CLI wrapper, or a manually imported experiment.

## Important Rule

Files under `sample-runs/` are synthetic calibration fixtures. They prove the scorer and diff gates work. They are not evidence that the repo improves real Copilot output.

Real claims require A/B runs with:

- same model
- same task catalog
- same fixture repos
- same token and time budget
- same cold-cache or warm-cache condition
- machine-checkable acceptance checks

## Commands

Score one run:

```bash
node tests/harness-bench/bench.js score --run tests/harness-bench/sample-runs/agent-only.synthetic.json
```

Write a scorecard:

```bash
node tests/harness-bench/bench.js score \
  --run tests/harness-bench/sample-runs/agent-only.synthetic.json \
  --out .github/.benchmarks/sample-agent-only/scorecard.json
```

Compare two variants:

```bash
node tests/harness-bench/bench.js compare \
  --baseline tests/harness-bench/sample-runs/agent-only.synthetic.json \
  --candidate tests/harness-bench/sample-runs/bootstrap-router.synthetic.json
```

Run local read-only probes against real repositories:

```bash
node tests/harness-bench/bench.js local-run \
  --config tests/harness-bench/local-repos.json \
  --model "gpt 5.3 codex spark" \
  --out .github/.benchmarks/local/run.json
```

Import an `/autorun` JSONL trace:

```bash
node tests/harness-bench/bench.js import-trace \
  --trace .github/.traces/autorun-real-run.jsonl \
  --model "gpt 5.3 codex spark" \
  --out .github/.benchmarks/local/imported-run.json
```

The CLI default model label is `gpt 5.3 codex spark`. Use `--model` only when deliberately recording a different fixed model. Imported traces that declare another model are marked with `modelMismatch: true`, and compare fails unless `--allow-model-mismatch` is passed.

`local-repos.example.json` uses environment variables for portability. Repo ids `copilot-bootstrap`, `tokenopt`, and `code-graph` also fall back to paths derived from the current checkout layout when those folders exist; emitted task metadata stores only a path hash.

Probe a bootstrapped target repo for output consistency:

```bash
node tests/harness-bench/probe-bootstrap-output.js --repo /absolute/path/to/repo
```

The probe is read-only. It checks for core bootstrap outputs, valid JSON files, and referenced `docs/ai/*.md` files. It is a configuration consistency check, not an agent quality benchmark.

## Run Input Shape

```json
{
  "schemaVersion": 1,
  "runId": "real-run-id",
  "source": {
    "kind": "autorun-trace",
    "path": ".github/.traces/autorun-real-run.jsonl"
  },
  "variant": {
    "id": "bootstrap-router",
    "label": "Bootstrap plus repo intelligence router",
    "model": "fixed-model",
    "gitSha": "<git sha>"
  },
  "tasks": [
    {
      "pbiId": "PBI-001",
      "stack": "typescript",
      "difficulty": "medium",
      "passed": true,
      "accepted": true,
      "tokens": 42000,
      "toolCalls": 9,
      "repairLoops": 1,
      "wallTimeMs": 480000,
      "outcomeScore": 0.84
    }
  ]
}
```

## Claim Standard

A claim such as "bootstrap-router is more effective" is allowed only when the generated compare output shows:

- no regression gate failure
- higher pass rate or accepted useful changes, or lower token/credit/repair-loop cost
- enough real tasks to be meaningful for the target stack

Default gates:

- pass-rate drop must not exceed 5 percentage points
- median token rise must not exceed 15%
- credits per accepted useful change rise must not exceed 15%
