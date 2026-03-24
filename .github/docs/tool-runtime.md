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

## Official `.github/hooks` Events

These are the supported GitHub Copilot hook events for `.github/hooks/*.json`:

| Event | When it fires | Typical use |
|---|---|---|
| `sessionStart` | Session begins | initialize state, session logging |
| `sessionEnd` | Session ends | cleanup, audit, final reporting |
| `userPromptSubmitted` | User submits a prompt | audit, logging, prompt gating |
| `preToolUse` | Before a tool executes | security gates, confirmation, input checks |
| `postToolUse` | After a tool executes | formatter, lint, compile, usage logging |
| `errorOccurred` | An error happens | logging, alerting, diagnostics |

Use `postToolUse` with tool filtering for expensive quality checks so they run after relevant edit/write tools only.

## Runtime Concepts Mentioned In The Deep Dive

The deep-dive document also discusses broader runtime control points such as `SessionStart`, `UserPromptSubmit`, `Stop`, `SubagentStart`, and `SubagentStop`.

Those are useful for understanding the extension architecture, but they are not official `.github/hooks` configuration events.

Rule of thumb:

- Lowercase event names above are the real `.github/hooks` events.
- Capitalized runtime hook concepts are architecture concepts, not portable hook-file schema.

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
- Check that `postToolUse` hooks are filtered and do not run unconditionally.
- Check that docs do not confuse runtime concepts with official `.github/hooks` events.

## Common Failure Modes

- Assuming tool results are visible to the model in the same round they are produced.
- Assuming the model can call tools that were never exposed.
- Using fictional hook events such as `agentStop`.
- Running expensive checks after irrelevant tool calls.
- Mixing internal runtime concepts like `Stop` or `SubagentStop` with official `.github/hooks` events.

## Related Files

- `.github/docs/runtime-overview.md`
- `.github/docs/github-resource-conventions.md`
- `.github/skills/generate-hooks/SKILL.md`
