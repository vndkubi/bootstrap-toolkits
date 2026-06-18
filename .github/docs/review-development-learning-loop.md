# Review Development Learning Loop

## Goal

Make code review improve future development behavior, not only the current pull request.

Closed loop:

```text
development -> evidence -> code review -> accepted finding -> development learning candidate -> approved upgrade -> next development run
```

## Core Contract

Development must produce evidence. Review verifies that evidence. Repeated or accepted review findings become candidate upgrades to development instructions, skills, prompts, or test strategy.

Do not auto-apply durable rule changes from review output alone. Review produces candidates; humans approve durable development upgrades.

## When A Review Finding Becomes A Development Learning Signal

Create a `developmentLearning` entry in `review-report.json` when a finding shows a reusable development gap, for example:

- missing acceptance-criteria-to-test mapping
- missing RED evidence before production edits
- Java API behavior tested with controller + mocked service instead of API component coverage
- persistence behavior tested with repository mocks instead of an isolated test database
- domain decision table only covered through one happy-path API test
- repeated duplicate validation across layers
- review repeatedly asks for the same verification command or artifact
- implementation summaries omit files changed, reasons, assumptions, or verification gaps

Do not create a learning signal for:

- one-off branch details
- transient CI failure
- style comments already enforced by tooling
- speculative review preferences
- unresolved reviewer debate

## Target Surfaces

Map each accepted learning signal to the smallest surface that would prevent recurrence.

| Gap | Preferred target |
|---|---|
| Missing implementation evidence | `.github/skills/orchestrate-development/SKILL.md` or `.github/skills/implement-feature/SKILL.md` |
| TDD invariant violation | `.github/skills/tdd-implement-loop/SKILL.md` |
| Java test strategy gap | `.github/skills/generate-unit-tests/SKILL.md`, `.github/instructions/testing.instructions.md`, or `.github/docs/java-test-architecture.md` |
| Code review checklist gap | `docs/reviews/checklists/*.md` |
| Agent routing gap | `.github/agents/dev-orchestrator.agent.md` or the relevant specialist agent |
| Repeated context/routing mistake | `.github/docs/prompt-and-context.md` or repo-intelligence docs |

## Review Report Field

Full review JSON may include:

```json
{
  "developmentLearning": [
    {
      "id": "DL-001",
      "sourceFindingId": "R-002",
      "category": "test-strategy",
      "targetSurface": ".github/skills/generate-unit-tests/SKILL.md",
      "proposedChange": "Require Java API behavior tests to use API component coverage with real service/domain/repository and boundary mocks only.",
      "evidence": ["review-report.json#/findings/1", "tests/OrderResourceTest.java"],
      "approvalRequired": true,
      "status": "candidate"
    }
  ]
}
```

## Promotion Flow

1. Reviewer emits `developmentLearning[]` candidates in `review-report.json`.
2. `correction-ledger` aggregates accepted fixes and repeated findings.
3. `review-memory-promotion` turns stable candidates into reviewable development-upgrade deltas.
4. Human owner approves or rejects the candidate.
5. Approved candidates update the target development surface.
6. Later reviews measure whether the same issue recurs.

## Verification

- Every candidate has evidence and a target surface.
- Every candidate is tied to an accepted finding, accepted human fix, or recurrence threshold.
- Business-rule and security candidates require explicit approval.
- Promotion reports separate development-skill upgrades from review-checklist upgrades.
- No durable source-of-truth file is changed silently by the review stage.

