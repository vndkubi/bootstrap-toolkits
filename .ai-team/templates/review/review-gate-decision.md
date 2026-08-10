# Review Gate Decision: {{ID}} — {{TITLE}}

Gatekeeper: {{OWNER}}
Created: {{DATE}}
Decision: `APPROVE / CHANGES / BLOCK`

## Independent Lanes

| Lane | Applicability | Status | Evidence artifact | Blocking finding |
| --- | --- | --- | --- | --- |
| Business correctness | `required` | `PASS / CHANGES / BLOCK / UNKNOWN` |  |  |
| Technical correctness | `required` |  |  |  |
| Operability | `required / not_applicable` |  |  |  |
| Security/compliance | `required / not_applicable` |  |  |  |
| Regression/test evidence | `required` |  |  |  |

## Decision Precedence

1. `BLOCK` if business correctness is unknown, a critical security/compliance failure exists, or an applicable hard gate lacks evidence.
2. `CHANGES` if an actionable non-critical defect or required evidence gap remains.
3. `APPROVE` only when every applicable lane passes with cited evidence.
4. Never average hard-gate failures into a passing score.

## Findings and Required Actions

- Blocking findings:
- Required changes:
- Residual risks accepted by:
- Checks not run:

## Independence Record

- Implementer/session:
- Lane reviewers/sessions:
- Gatekeeper/session:
