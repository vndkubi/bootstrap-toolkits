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

1. Reads correction signals from committed review reports under `docs/reviews/` and other explicit correction-ledger source artifacts
2. Runs the `correction-ledger` skill to aggregate trusted signals into promotion candidates
3. Uses semantic grouping (keyword Jaccard + file scope overlap) to merge equivalent corrections
4. Writes a ledger report under `docs/reviews/correction-ledger-<date>.md`
5. Routes qualified candidates to `review-memory-promotion` for human approval
6. Never auto-edits durable source files

## Prerequisites

- Review reports exist under `docs/reviews/` with accepted fixes or repeated findings
- OR the user provides another explicit correction-ledger source artifact

## Instructions

1. Check that review reports or explicit correction-ledger source artifacts exist
2. If no correction data exists, report that the signal pool is too small and stop
3. Use the `correction-ledger` skill to:
   - Collect correction signals from all available sources
   - Filter untrusted signals (retries without human confirmation)
   - Aggregate into patterns using the promotion thresholds
   - Apply semantic grouping: merge corrections with ≥50% keyword Jaccard AND shared file scope
   - Group per-agent corrections alongside global aggregates when `agentName` is present
   - Build promotion candidates for qualifying patterns
   - Generate the ledger report under `docs/reviews/correction-ledger-<date>.md`
4. If candidates exist, use `review-memory-promotion` to create an approval-ready report
5. Present the candidates to the user for approval — do NOT apply changes automatically

## Verification

- Only trusted signals or recurring patterns (3+ occurrences) become candidates
- Retry-only signals are filtered unless recurrence threshold is met
- Semantically similar corrections are merged (keyword Jaccard ≥ 0.50 + shared file scope)
- Every candidate names a target file and proposed change
- No durable source files were modified without human approval
- The report is saved and auditable

## When To Stop

- Stop after generating the ledger report and presenting candidates
- Do not proceed to edit durable files unless the user explicitly approves specific candidates
