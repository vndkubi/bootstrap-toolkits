# Runtime Overview

## Purpose

Explain the high-level GitHub Copilot Chat execution model that matters when maintaining or bootstrapping this bundle.

## Source of Truth

- `.github/skills/generate-copilot-config/SKILL.md`
- `.github/prompts/bootstrap-copilot.prompt.md`
- `.github/agents/conductor.agent.md`
- `.github/copilot-instructions.md`

## Request / Data Flow

1. User runs `/bootstrap-copilot` or invokes a relevant agent.
2. The prompt routes to `@conductor`.
3. `@conductor` defers to `generate-copilot-config` as the canonical bootstrap workflow.
4. Copilot Chat assembles model input from repo instructions, current-turn context, history, tool results, and available tool schemas.
5. The model may call tools across multiple rounds; tool results are injected into later prompt rounds.
6. The bootstrap workflow generates or refines project-specific `.github/` output for the target repository.

## What Goes Into the Model Request

The model does not see raw IDE state. Only what the prompt builder selects, renders, and retains after compaction reaches the model:

| Category | Examples | How it enters |
|---|---|---|
| User request | Prompt text, references, attachments, mode instructions | Rendered as user message |
| Project instructions | `copilot-instructions.md`, matched `.instructions.md`, settings | Rendered as system/user instruction blocks |
| Conversation history | Previous turns and summaries | Rendered as history or summarized history |
| Tool transcripts | Previous tool calls, arguments, and results | Rendered into later prompt rounds |
| Workspace context | OS, workspace structure, active document | Rendered as global agent context |
| Hook context | `SessionStart`, `UserPromptSubmit` injections | Appended by hook system |
| Tool schemas | Available tools for the current round | Sent alongside messages |

## Who Decides What

The runtime uses a hybrid model:

- **Code decides**: which tools are exposed, which intent handles the request, whether to compact/summarize, permission and auth gates.
- **Prompt biases**: search before edit, prefer large file reads, use subagents for terminal-heavy work.
- **Model decides**: which tool to call in each round, how many rounds, when the task is done.

## Compaction and Summarization

Long-running threads do not break the system. The runtime manages context budget:

1. Token budget is measured before each prompt render.
2. If near the limit, background or foreground summarization compresses conversation history.
3. Summary metadata is persisted and used for re-rendering.
4. Global context may be cached across turns if the cache key is still valid.

Mental model: keep one thread per feature or subsystem. Trust compaction to handle length. Switch threads when the domain changes significantly.

## Context Transformation Pipeline

Raw local data is not sent verbatim. Between local state and the final model request:

1. **Request normalization** — sanitize references, resolve location, rebuild conversation from history.
2. **Prompt context assembly** — gather query, history, tool results, chat variables, available tools, mode instructions, hook context.
3. **Intent-specific prompt rendering** — the prompt builder selects which blocks to include (base instructions, custom instructions, history, user message, tool transcript).
4. **Budget enforcement** — truncation, summarization, or re-rendering if context exceeds limits.
5. **Message post-processing** — final messages and tool schemas are formatted for the model endpoint.

Each step can drop, summarize, transform, or add context.

## Key Constraints

- Do not assume the whole workspace or every `.github/` file goes directly into the model.
- `copilot-instructions.md`, scoped instructions, agents, prompts, and skills are prompt resources; GitHub infra files are not automatically injected.
- The bootstrap pipeline source of truth lives in the skill, not in prompts or agents.
- Long-running threads are compacted and summarized, so keep threads aligned by subsystem or workflow.
- Tool results from round N appear in the prompt for round N+1, not in the same round.

## Verification

- Confirm prompt entry points defer to the canonical skill instead of redefining the pipeline.
- Confirm bundle guidance distinguishes repo-level instructions, task context, and generated outputs.
- Confirm tool-related guidance matches official hook and prompt behavior described elsewhere in `.github/`.

## Common Failure Modes

- Treating every `.github/` file as if it is auto-injected into prompt context.
- Duplicating pipeline logic in prompt, agent, and skill files.
- Mixing toolkit-template assets with generated target-project output.
- Assuming raw history or raw tool output is always sent verbatim to the model.
- Assuming tool results are visible in the same round they are produced (they go into the next round).
- Not realizing compaction happens automatically; restarting threads unnecessarily.

## Related Files

- `.github/docs/prompt-and-context.md`
- `.github/docs/tool-runtime.md`
- `.github/docs/github-resource-conventions.md`
- `.github/docs/user-playbook.md`
