---
name: generate-api-contract
description: "Generate a protocol-appropriate API contract from a reviewed spec + acceptance criteria, based on the chosen taxonomy. Emits OpenAPI 3.1 (api-rest), GraphQL SDL (api-graphql), Protobuf 3 (api-grpc), or AsyncAPI 2.6 (event-driven). For library/cli/ui-only, skips with rationale. For mixed, emits multiple artifacts. Use from autorun Phase 2 or from plan-implementation Step 5."
---

# Generate API Contract

Produces the contract artifact(s) that Phase 3 (TEST-FIRST) and downstream implementers need.

## When to Use

- `prompts/autorun.prompt.md` Phase 2 after taxonomy classification.
- `plan-implementation` Step 5 when taxonomy is API-bearing.
- Never for bug fixes that do not change an external surface.

## Inputs

- `spec.md` with testable acceptance criteria.
- `taxonomy` — one of: `api-rest | api-graphql | api-grpc | event-driven | library | cli | ui-only | mixed`.
- `featureWorkspace` — path to `specs/<id>-<slug>/`.

## Output Matrix

| Taxonomy | Output file(s) | Validator |
|---|---|---|
| `api-rest` | `contracts/openapi.yaml` (OpenAPI 3.1) | `openapi-spec-validator` or `redocly lint` |
| `api-graphql` | `contracts/schema.graphql` (SDL) | `graphql` lib `buildSchema` |
| `api-grpc` | `contracts/<service>.proto` (Proto 3) | `protoc --lint_out` or `buf lint` |
| `event-driven` | `contracts/asyncapi.yaml` (AsyncAPI 2.6) | `asyncapi validate` |
| `library` / `cli` / `ui-only` | **none**; write rationale to trace | n/a |
| `mixed` | 2+ of the above | each as above |

## Workflow

1. Read `spec.md`. Extract endpoints/messages from user stories + FRs.
2. Look up taxonomy. For `library|cli|ui-only`, append a rationale paragraph to `plan.md` §Supporting Artifacts and emit a trace event `{action: "contract-skipped", outputs: {reason}}`. Return early.
3. For API-bearing taxonomies, draft the contract:
   - **Path/operation** per AC that has an external surface.
   - **Request/response schema** per AC's input/output shape.
   - **Error responses** — every AC with a negative path gets a 4xx (REST) / error union (GraphQL) / error status code (gRPC) / error channel (AsyncAPI).
   - **Auth scheme** — mirror whatever `spec.md` §Security says; leave `TODO` if spec silent and raise a `contract-invalid` gate.
4. Validate syntactically using the tool in the Output Matrix. Invalid → gate `contract-invalid` (category `config`, blocking).
5. Trace-event `{action: "contract-generated", outputs: {path, taxonomy, operationsCount}}`.

## Convention Rules

- **REST**: OpenAPI 3.1, `components/schemas` only — no inline objects deeper than one level. One tag per resource. Use `application/json` unless spec says otherwise.
- **GraphQL**: separate `Query`, `Mutation`, `Subscription` roots. Name-prefix types by domain.
- **gRPC**: one service per `.proto` file. `package` = reverse-domain + module. Field numbers start at 1; reserve field tags 100+ for future.
- **AsyncAPI**: one channel per event; message payload schemas in `components/messages`. Use CloudEvents envelope when spec mentions it.

## Traceability

Every operation/message must cite the AC id in its `description` field, e.g.
`description: "Per AC-US-B1-02: returns 200 with widget body"`.

Target-repo CI is expected to grep for these ids to verify AC ↔ contract ↔ test coverage (implementation is stack-specific, generated per project by `/bootstrap-copilot`).

## Failure Modes

| Condition | Gate id | Category |
|---|---|---|
| Syntactic validation failed | `contract-invalid` | config |
| Spec silent on auth | `contract-invalid` | config |
| Taxonomy = `mixed` but only 1 surface found in spec | `taxonomy-ambiguous` | taxonomy |
| Validator tool missing | trace error; fall back to JSON-schema-only check | — |

## Verification

- Fixture suite under `skills/generate-api-contract/tests/`: one input spec per taxonomy, expected-output snapshot.
- Contract test: emitted file validates with the configured validator.
