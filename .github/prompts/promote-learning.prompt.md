---
agent: agent
description: "Run the learning loop: aggregate correction patterns from session observations and review artifacts, then route qualified candidates to review-memory-promotion for human approval. Use when you want to check for recurring fixes, analyze correction patterns, or promote stable lessons into durable repo memory."
tools:
  - read_file
  - list_dir
  - grep_search
  - semantic_search
  - file_search
  - create_file
  - replace_string_in_file
  - run_in_terminal
---

# Promote Learning

Run the approval-gated learning loop to surface recurring correction patterns and promote stable lessons.

## What This Does

1. Reads correction signals from `.memory/observations.jsonl` and review reports under `docs/reviews/`
2. Runs the `correction-ledger` skill to aggregate trusted signals into promotion candidates
3. Uses semantic grouping (keyword Jaccard + file scope overlap) to merge equivalent corrections
4. Writes `.memory/correction-patterns.json` — a pattern cache consumed by `memory-inject.js` for proactive session-start warnings
5. Writes `.memory/promotion-tracker.json` — tracks post-promotion effectiveness (are promoted instructions actually reducing corrections?)
6. Routes qualified candidates to `review-memory-promotion` for human approval
7. Never auto-edits durable source files

## Prerequisites

- Layer 2 memory hooks have been active for at least a few sessions (`.memory/observations.jsonl` exists)
- OR review reports exist under `docs/reviews/` with accepted fixes or repeated findings

## Instructions

1. Check that `.memory/observations.jsonl` exists and contains correction-type records, OR that review reports exist under `docs/reviews/`
2. If no correction data exists, report that the signal pool is too small and stop
3. Use the `correction-ledger` skill to:
   - Collect correction signals from all available sources
   - Filter untrusted signals (retries without human confirmation)
   - Aggregate into patterns using the promotion thresholds
   - Apply semantic grouping: merge corrections with ≥50% keyword Jaccard AND shared file scope
   - Group per-agent corrections alongside global aggregates when `agentName` is present
   - Build promotion candidates for qualifying patterns
   - Generate the ledger report under `docs/reviews/correction-ledger-<date>.md`
4. Write `.memory/correction-patterns.json` with all patterns having ≥2 occurrences (this enables proactive warnings at session start)
5. Read and update `.memory/promotion-tracker.json` for previously promoted patterns — track post-promotion occurrence counts and compute effectiveness status
6. If candidates exist, use `review-memory-promotion` to create an approval-ready report
7. Present the candidates to the user for approval — do NOT apply changes automatically

## Verification

- Only trusted signals or recurring patterns (3+ occurrences) become candidates
- Retry-only signals are filtered unless recurrence threshold is met
- Semantically similar corrections are merged (keyword Jaccard ≥ 0.50 + shared file scope)
- `.memory/correction-patterns.json` is written with all patterns having ≥2 occurrences
- `.memory/promotion-tracker.json` is updated with effectiveness data for promoted patterns
- Every candidate names a target file and proposed change
- No durable source files were modified without human approval
- The report is saved and auditable

## When To Stop

- Stop after generating the ledger report and presenting candidates
- Do not proceed to edit durable files unless the user explicitly approves specific candidates
