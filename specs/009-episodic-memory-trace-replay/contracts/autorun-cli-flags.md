# Autorun CLI Flags — Delta for Episodic Memory

> Extends the contract in `specs/008-prove-by-api-flow/contracts/autorun-cli.md`. This file is a **diff**, not a replacement.

## New flags

| Flag | Type | Default | Effect |
|---|---|---|---|
| `--no-replay` | boolean | `false` | Skip Phase-1 `trace-replay` retrieval. Run proceeds cold-start. Recorded in trace MetaRecord for A/B partition (US-2 AC-5, FR-11). |
| `--replay-k <int>` | integer, 1–10 | `3` | Top-k positive episodes to inject. |
| `--replay-threshold <float>` | number, 0.0–1.0 | `0.75` | Cosine similarity floor; lower values admit more (noisier) retrieval. |

## Config-file equivalent

`autorun.config.json` (extends the spec-008 schema):

```jsonc
{
  "episodicMemory": {
    "enabled": false,           // master flag; must be true for any replay to happen
    "embeddingBackend": "local", // "local" | "remote"; "local" = bundled ONNX (D-1)
    "replayK": 3,
    "replayThreshold": 0.75,
    "negativeCap": 2,           // D-5
    "storeCapMB": 50,
    "byteBudget": 8192,         // per-run EPISODIC_MEMORY context cap
    "forceColdStartRatio": 0.10 // Random 10% cold-start for A/B control (plan.md Risk row 5)
  }
}
```

CLI flags override config-file values for that invocation only.

## New trace event

```jsonc
{
  "type": "episode_replay",
  "ts": "2026-04-24T10:15:00Z",
  "enabled": true,
  "episode_ids":       ["20260420-PROJ-340-...", "20260422-PROJ-342-..."],
  "similarity_scores": [0.82, 0.78],
  "mode":              "warm"   // "warm" | "cold" | "forced-cold" | "no-candidates"
}
```

Emitted exactly once per run in Phase 1 (US-2 AC-4). `mode`:

- `warm` — ≥ 1 episode returned, context injected.
- `cold` — user passed `--no-replay`.
- `forced-cold` — random selection per `forceColdStartRatio`.
- `no-candidates` — retrieval ran but zero episodes above threshold (US-2 AC-6).

## Unchanged

All spec-008 flags, exit codes, and gate schema remain untouched. No new exit codes for v1 (retrieval failures are non-blocking and fall back to cold-start).

## New gate

| gateId | category | blocking | When |
|---|---|---|---|
| `insufficient-control-data` | config | false (warning) | `review-effectiveness --episodes` when `--no-replay` sample count < 20 (FR-11, D-7). Non-blocking: report renders with a warning header instead of metric claims. |

Gate conforms to `.github/schemas/gate.schema.json`. No schema change required.
