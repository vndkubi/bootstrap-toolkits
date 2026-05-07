# `trace-replay` JS Module Contracts

> Internal function contracts for the `.github/skills/trace-replay/` implementation. Not a public API.

## `capture.js`

```ts
export async function captureEpisode(input: {
  traceFile: string;            // .github/.traces/autorun-<pbi>.jsonl
  evidenceBundle: string;       // .artifacts/<pbi>/
  spec: string;                 // specs/<id>-<slug>/spec.md
  outcome: "success" | "failed" | "aborted";
}): Promise<{ episodeId: string; path: string } | { skipped: true; reason: string }>;
```

**Contract:**
- Atomic: writes `<id>.json.tmp` → rename → appends manifest entry in one fsync boundary (I-5).
- Calls `redact-sensitive-data` on `summary` and `raw_intent` **before** write. Any violation returns `{skipped:true, reason:"pii-detected"}` and does **not** fail the parent `/autorun` run.
- Idempotent on `episode_id` collision: second call returns `{skipped:true, reason:"exists"}`.

## `score.js`

```ts
export function computeOutcomeScore(c: {
  tests:    number;  // [0,1]
  review:   number;  // [0,1]
  contract: number;  // [0,1]
  rounds:   number;  // [0,1]
}): number;         // [0,1]
```

**Frozen formula (I-1):** `0.4·tests + 0.3·review + 0.2·contract + 0.1·rounds`, clamped to `[0,1]`.

```ts
export function recalcAfterRegression(
  current: number,
  priorEvents: number
): number;          // floor 0.0
```

**Contract:** `current - 0.15`, clamped to `[0,1]` (I-2). Pure; no I/O.

## `retrieve.js`

```ts
export async function retrieveEpisodes(input: {
  intent:    string;
  detected:  { modules: string[]; contracts: string[]; stacks: string[] };
  k:         number;    // default 3
  threshold: number;    // default 0.75 (D-4)
  negativeCap: number;  // default 2   (D-5)
}): Promise<{
  positives: EpisodeRef[];
  negatives: EpisodeRef[];
  meta: { candidatesScanned: number; modelDrift: boolean };
}>;
```

**Contract:**
- Returns empty arrays (not null) when zero episodes match (US-2 AC-6).
- Skips episodes whose `embedding.model` ≠ manifest model; sets `meta.modelDrift = true` (I-4, R-4).
- Filters `outcome_score < threshold` out of `positives`; those episodes are eligible for `negatives` if `outcome ∈ {failed, aborted}` OR a `!bad` tag is present.
- Tagged `!bad` episodes force `negatives` classification regardless of score (US-3 AC-4).
- Increments `replay_count` in manifest for every returned episode (R4).

## `format-context.js`

```ts
export function formatEpisodicMemoryBlock(input: {
  positives: EpisodeRef[];
  negatives: EpisodeRef[];
  byteBudget: number;  // default 8192
}): string;            // ready-to-inject block
```

**Contract:**
- Emits XML-like fences: `<episode id="..." kind="positive|negative" score="...">`.
- **Never** references `raw_intent` (I-3).
- Truncates deterministically when over `byteBudget`: prefer keeping positives > negatives; within each, prefer higher score.
- Returns empty string when both arrays are empty (US-2 AC-6).
- Output is pure text; no side effects.

## `gc.js`

```ts
export async function collectGarbage(input: {
  storeCapMB: number;  // default 50
  dryRun?: boolean;
}): Promise<{ evicted: string[]; remainingBytes: number }>;
```

**Contract:**
- Computes `evictionRank = outcome_score - ageDecay - replayBonus` (see research.md R-5).
- Evicts in ascending rank until total store size ≤ cap.
- Atomic per-episode: JSON file delete + manifest entry removal.
- Vector blob is not rewritten immediately; compaction runs lazily on next `rebuild-index`.

## Shared types

```ts
interface EpisodeRef {
  episode_id: string;
  summary: string;
  outcome: "success" | "failed" | "aborted";
  outcome_score: number;
  similarity: number;  // [-1, 1] cosine
  detected: { modules: string[]; contracts: string[]; stacks: string[] };
}
```

## Error handling

All functions throw on **schema** or **I/O** errors (let the orchestrator decide whether to halt the run). They return result objects — never throw — for **business** outcomes (PII detected, no candidates, drift). This mirrors the existing skill pattern in `.github/skills/`.
