---
name: trace-replay
description: Capture every completed /autorun run as a structured Episode and replay similar past episodes (both successful and cautionary) as few-shot precedent into Phase 1 of future runs. Scoped to this repo; storage under .github/.episode-index/. Feature-flagged via episodicMemory.enabled.
---

# `trace-replay` skill

**Status:** Stage S1 implemented (schema + scorer only). Stages S2–S8 pending — see [specs/009-episodic-memory-trace-replay/tasks.md](../../../specs/009-episodic-memory-trace-replay/tasks.md).

## When to use

- Inside `/autorun` Phase 1 (retrieve) and Phase 7 (capture), when `config.episodicMemory.enabled === true`.
- Stand-alone invocation: compute an outcome score from a trace file, or dry-run the GC planner.

## Inputs / outputs

See [specs/009-episodic-memory-trace-replay/contracts/trace-replay-api.md](../../../specs/009-episodic-memory-trace-replay/contracts/trace-replay-api.md) for the exact function contracts.

## Invariants

Refer to [specs/009-episodic-memory-trace-replay/data-model.md](../../../specs/009-episodic-memory-trace-replay/data-model.md) §Invariants (I-1 … I-7). Critical:

- **I-1** Outcome score formula is frozen: `0.4·tests + 0.3·review + 0.2·contract + 0.1·rounds`.
- **I-3** `raw_intent` is **never** injected into any downstream prompt.
- **I-5** Episode writes are atomic (tmp + rename + manifest append).

## Files

| File | Status |
|---|---|
| `score.js` | ✅ implemented (S1) |
| `capture.js` | ⏳ skeleton (S2) |
| `embed.js` | ⏳ skeleton (S2) |
| `retrieve.js` | ⏳ skeleton (S3) |
| `format-context.js` | ⏳ skeleton (S3) |
| `gc.js` | ⏳ skeleton (S6) |

## Feature flag

Disabled by default until the 20-run baseline (Stage S8 / T-45). No Phase-1 or Phase-7 call sites are wired to these modules yet.
