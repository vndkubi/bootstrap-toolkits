# Data Model — Episodic Memory

> Entities, invariants, and state transitions for the episode store.

## Entities

### Episode (canonical)

See `contracts/episode.schema.json` for the enforced structure. Semantic notes:

| Field | Type | Invariant |
|---|---|---|
| `schemaVersion` | const `"1.0"` | Bump required for breaking changes; additive fields may land under `1.x`. |
| `episode_id` | string | Format `YYYYMMDD-<pbi-id>-<slug>`. Unique across `.github/.episodes/`. Immutable. |
| `created_at` | ISO-8601 UTC | Write-once. |
| `pbi_ref` | `{type, id}` | `type ∈ {"github","jira","folder","freetext"}`. Resolver origin. |
| `raw_intent` | string | **Never injected into prompts.** Stored only for audit + export. |
| `summary` | string ≤ 1000 chars | Sanitized orchestrator-voice description. This is what replay surfaces. |
| `detected` | `{modules[], contracts[], stacks[]}` | Populated by `generate-evidence-summary`. Powers retrieval filters beyond vector similarity. |
| `embedding` | `{model, vector_ref}` | `vector_ref` is a relative path into `.github/.episode-index/`. |
| `phases` | array | 7 entries max (one per autorun phase). Duration and token-cost per phase. |
| `outcome` | enum `success \| failed \| aborted` | Terminal state. |
| `outcome_score` | number [0, 1] | Derived via `score.js` — see invariants below. |
| `score_components` | `{tests, review, contract, rounds}` | All [0, 1]. Sum-to-score formula frozen in `score.js`. |
| `artifacts` | `{spec, pr?, evidence}` | Paths relative to repo root. |
| `regression_events` | array | Append-only. Each entry decrements `outcome_score` (see transition R3). |
| `replay_count` | integer ≥ 0 | Incremented by `retrieve.js` when this episode is injected into another run. |
| `tags` | string[] | User-applied. Values starting `!` (e.g. `!bad`) override computed score (US-3 AC-4). |

### Index manifest

Single file at `.github/.episode-index/manifest.json`:

```jsonc
{
  "schemaVersion": "1.0",
  "embedding_model": "local-minilm-l6-v2@sha256-<hash>",
  "dim": 384,
  "entries": [
    { "episode_id": "20260424-...", "vector_offset": 0, "bytes": 1536, "outcome_score": 0.87 }
  ],
  "vector_blob": "vectors.f32.bin"
}
```

Vectors are a single contiguous float32 blob; the manifest records `(offset, bytes)` per episode. Rebuild via `trace-replay rebuild-index` on model drift.

## Invariants

| ID | Rule | Enforced by |
|---|---|---|
| I-1 | `outcome_score = 0.4·tests + 0.3·review + 0.2·contract + 0.1·rounds` (all clamped to [0,1]) | `score.js` unit tests |
| I-2 | `outcome_score` ≤ 1 and ≥ 0 after regression decay | `score.js` `recalc()` |
| I-3 | `raw_intent` is never referenced in `format-context.js` | `tests/test-prompt-injection.js` greps the formatter output |
| I-4 | `embedding.model` in episode must equal `embedding_model` in manifest for that vector to participate in retrieval | `retrieve.js` mismatch check |
| I-5 | Episode writes are **atomic**: JSON + index entry land in one transaction, or neither does | `capture.js` write-then-rename pattern |
| I-6 | No two episodes share `episode_id` | `capture.js` existence check before write |
| I-7 | Schema changes beyond additive fields bump `schemaVersion` major | `tests/test-episode-schema.js` against fixtures |

## State Transitions

```
(autorun Phase 7 success)           (autorun Phase 5/6 fail)       (--abort)
         │                                  │                          │
         ▼                                  ▼                          ▼
    outcome: success                  outcome: failed           outcome: aborted
    score  := compute()               score  := compute()       score  := 0.0
                  │
                  ▼
        (post-merge regression detected)  ←── R3
                  │
                  ▼
    regression_events.append(e)
    outcome_score -= 0.15  (floor 0.0)
                  │
                  ▼
        (store size > cap)  ←── R5 (see research.md)
                  │
                  ▼
    evictionRank(e) lowest  →  file deleted + manifest entry removed
```

**Transition rules:**

- **R1 Capture** — Phase 7 success triggers `capture.js` → write `.github/.episodes/<id>.json` + append manifest entry.
- **R2 Partial capture** — Phase 5/6 failure or `--abort` still writes an episode with `outcome ∈ {failed, aborted}` so negative examples survive (US-1 AC-2).
- **R3 Regression decay** — `drift-detector` or manual `/autorun episode tag <id> --regression <reason>` appends to `regression_events` and decrements score by 0.15 (cap at 0.0). `outcome` field never changes post-write.
- **R4 Replay accounting** — `retrieve.js` increments `replay_count` and updates `manifest.json` (not the episode file) to avoid write amplification on the episode JSON.
- **R5 Eviction** — GC deletes the episode JSON + manifest entry atomically; the vector blob is rewritten on the next rebuild (tombstoned until then).

## Relationships

```
Trace JSONL  ──(Phase 7)──▶  Episode  ──▶  Manifest entry  ──▶  Vector blob
   (spec 008)                (this spec)     (this spec)           (this spec)

Episode  ──(replay, Phase 1)──▶  EPISODIC_MEMORY block in next run's prompt
                                       │
                                       ▼
                                 trace event `episode_replay`
                                 (audit back-pointer into spec-008 trace)
```

No other module owns or writes episodes. Correction-ledger (D-6) remains an orthogonal store in `.github/.ledger/`; no foreign-key relationship.
