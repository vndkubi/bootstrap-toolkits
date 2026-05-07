# bootstrap-mcp v1 Prompt Contracts

> Each entry registers an MCP prompt — i.e. a named, argument-typed template the host can `prompts/get` and send to its LLM.

## Registration shape

Each prompt is registered with:

```json
{
  "name": "<slug>",
  "description": "...",
  "arguments": [ { "name": "...", "required": true, "description": "..." } ]
}
```

On `prompts/get`, the server returns an array of MCP `PromptMessage` objects (role + content) by loading and rendering `.github/prompts/<name>.prompt.md` from the configured repo.

## Prompt catalog

### `bootstrap-copilot`
- **Description:** Generate a project-specific Copilot configuration for the target repo.
- **Arguments:**
  - `phase` (optional, enum: `scan` | `classify` | `generate` | `validate` | `cleanup`) — lets the host drive one phase at a time.
- **Source:** `.github/prompts/bootstrap-copilot.prompt.md`

### `specify-feature`
- **Description:** Turn a freeform feature idea into a structured PRD/spec.
- **Arguments:**
  - `description` (required) — the feature idea.
  - `slug` (optional) — folder slug; server generates one if absent.

### `plan-implementation`
- **Description:** Produce `plan.md` + supporting artifacts from a reviewed spec.
- **Arguments:**
  - `spec_path` (required) — workspace-relative path to `spec.md`.

### `generate-tasks`
- **Description:** Break an approved plan into an ordered, dependency-aware task list.
- **Arguments:**
  - `plan_path` (required).

### `implement-feature`
- **Description:** Execute the approved plan/tasks against the codebase.
- **Arguments:**
  - `workspace` (required) — `specs/<id>-<slug>/`.

### `review-code-changes`
- **Description:** Run the multi-stage review pipeline on a diff.
- **Arguments:**
  - `base` (required), `head` (required).

## Rendering rules

1. Template variables in the source markdown are substituted before return.
2. Any reference to `@agent` routing is rewritten to MCP tool-use instructions pointing to the server's own tools (US-6 AC-3).
3. Output is redacted in-flight via `bootstrap_mcp.redact`.
4. Unknown required arguments → MCP error with `code=E_MISSING_ARGUMENT`.

## Acceptance traceability

| US-6 AC | Covered by |
|---|---|
| AC-1 (prompts listed with arg schema) | §Prompt catalog + MCP `prompts/list` |
| AC-2 (rendered message list) | §Rendering rules |
| AC-3 (tool-use pointers) | §Rendering rules rule 2 |
