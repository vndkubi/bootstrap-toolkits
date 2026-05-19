# Functional Core Review Checklist

Use this pack during Functional Review when no narrower domain-specific checklist exists yet.

## Apply When

- business logic changed
- acceptance criteria or workflow steps are involved
- state transitions, money, auth, pricing, or cross-domain writes are touched

## Core Questions

- Does every acceptance criterion map to code and at least one real test?
- Does the changed path preserve the intended business flow order?
- Are boundary, invalid-input, and empty-data paths covered?
- Are state transitions explicitly validated and tested?
- Do cross-domain side effects still occur in the correct order?
- If docs are weak, is the inferred business anchor strong enough for this risk level?

## Blocker Patterns

- AC implemented with no test
- test added without a clear business scenario
- money or entitlement logic changes with low business-context confidence
- write path changes that skip required downstream side effects
- mock-heavy SUT path without a ratified Article X exception
