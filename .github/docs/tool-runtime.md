# Tool Runtime

## Purpose

Explain how tool availability, tool invocation, tool-result round-trips, and official `.github/hooks` automation affect Copilot behavior in this bundle.

## Source of Truth

- `.github/skills/generate-copilot-config/SKILL.md`
- `.github/skills/generate-hooks/SKILL.md`
- `.github/prompts/bootstrap-copilot.prompt.md`
- `.github/docs/runtime-overview.md`

## Request / Data Flow

1. A prompt or agent exposes a set of tools that are valid for the current task.
2. The model chooses whether to call a tool from the exposed set.
3. Tool execution happens locally.
4. Optional `.github/hooks` automation can run before or after tool execution.
5. Tool results are fed back into later prompt rounds, not magically remembered.

## Tool Lifecycle

### Exposure Filtering

Before the model sees any tools, code filters the full tool registry:

1. Intent-specific filtering
2. Model-capability filtering
3. Workspace-state filtering
4. User tool picker selection
5. Model-specific overrides and experiment flags

The model can only choose from tools that pass these filters. It cannot invent new tools.

### Invocation Round-Trip

1. The model emits `tool_calls`.
2. Optional `.github/hooks` `preToolUse` automation can deny or gate the action.
3. The tool executes locally.
4. Optional `.github/hooks` `postToolUse` automation can react after execution.
5. The tool result is stored in tool-call history.
6. The next prompt round includes the relevant result so the model can continue reasoning.

Critical rule: tool results appear in round N+1, not in the same round that produced them.

Mini mental model:

```text
Round N:     model emits tool call
Round N+1:   runtime executes the tool while building the next prompt
Later round: model sees the tool result and continues reasoning
```

## Official `.github/hooks` Events

These are the supported GitHub Copilot hook events for `.github/hooks/*.json`:

| Event | When it fires | Typical use |
|---|---|---|
| `sessionStart` | Session begins | initialize state, session logging |
| `userPromptSubmitted` | User submits a prompt | audit, logging, prompt gating |
| `preToolUse` | Before a tool executes | security gates, confirmation, input checks |
| `postToolUse` | After a tool executes | formatter, lint, compile, usage logging |
| `preCompact` | Before context compaction | export decisions, constraints, plan state |
| `agentStop` | Main agent turn completes | must-pass turn-end policy gates |
| `subagentStart` | A subagent is spawned | track nested agent lifecycle |
| `subagentStop` | A subagent completes | aggregate results, audit trail, blocking review gates |
| `sessionEnd` | Session ends | generate reports, send notifications, cleanup |

Use `postToolUse` with tool filtering for expensive quality checks so they run after relevant edit/write tools only.

Use `agentStop` for cheap must-pass policy gates. This bundle includes a TDD evidence gate that only evaluates changed production code and blocks completion when the test-first evidence is missing.

Use `preCompact` to preserve critical session state before the system summarizes conversation context. This is essential for long-running feature work where losing in-progress decisions would cause rework.

## Why A Tool Flow Does Not Run

If a tool-heavy prompt does not result in tool activity, check these gates in order:

1. the current intent actually exposed tools
2. the selected model and mode support tool-calling for that path
3. the workspace state and tool picker did not filter the tool out
4. a hook or permission gate did not block the action

Do not debug this as a prompt-quality issue first. Often the real cause is that the tool was never exposed.

## Maintainer Debug Recipe

When runtime behavior looks wrong, inspect it in this order:

1. **Prompt profiler** — inspect prompt shape, included context, and whether the right instructions or tool schemas were present.
2. **Agent debug log** — inspect orchestration, routing, and continuation behavior across turns.
3. **Chat Debug View** — inspect the concrete prompt, tool calls, and tool results captured for a real session.
4. **OTEL content capture** — enable only when you need deeper tracing of request and response content.

Use the lightest tool that answers the question. Start with prompt and tool transcript visibility before turning on deeper tracing.

## Key Constraints

- Code decides which tools are exposed; the model decides whether to call them.
- Prompt wording can bias tool usage, but cannot invent unsupported tools.
- `.github/hooks` automation must use official GitHub Copilot hook events only.
- Heavy quality checks should be filtered so they run after relevant edit/write tools rather than after every tool call.
- Tool results are not visible to the model in the same round they are produced.

## Verification

- Check that prompts and skills refer to real tools and real hook events.
- Check that hook guidance is consistent across skills and agents.
- Check that tool-heavy workflows explain how results come back into later reasoning rounds.
- Check that the docs explain the tool-calling gate, not just the round-trip after a tool is already selected.
- Check that `postToolUse` hooks are filtered and do not run unconditionally.
- Check that docs do not confuse runtime concepts with official `.github/hooks` events.

## Common Failure Modes

- Assuming tool results are visible to the model in the same round they are produced.
- Debugging a missing tool flow as a prompt-writing issue when the tool was never exposed.
- Assuming the model can call tools that were never exposed.
- Using fictional hook events or claiming official events are unsupported.
- Running expensive checks after irrelevant tool calls.
- Making `preCompact` hooks too slow (> 10s) — they block compaction and degrade responsiveness.

## Related Files

- `.github/docs/runtime-overview.md`
- `.github/docs/prompt-and-context.md`
- `.github/docs/github-resource-conventions.md`
- `.github/skills/generate-hooks/SKILL.md`
