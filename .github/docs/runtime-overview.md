# Runtime Overview

## Purpose

Explain the high-level GitHub Copilot Chat execution model that matters when maintaining or bootstrapping this bundle, while keeping generated repo-memory artifacts useful for Codex and other coding agents.

## Source of Truth

- `.github/skills/generate-copilot-config/SKILL.md`
- `.github/prompts/bootstrap-copilot.prompt.md`
- `.github/agents/conductor.agent.md`
- `.github/copilot-instructions.md`
- `docs/ai/00-repo-index.md` when generated

## Request / Data Flow

1. User runs `/bootstrap-copilot` inside the target repository after copying the portable `.github/` bundle.
2. The prompt routes bootstrap work to `@conductor`.
3. `@conductor` defers bootstrap execution to `generate-copilot-config` as the canonical workflow.
4. Copilot Chat assembles model input from repo instructions, current-turn context, history, tool results, and available tool schemas.
5. The model may call tools across multiple rounds; tool results are injected into later prompt rounds.
6. The bootstrap workflow writes progress into `.github/.bootstrap-state.json`, generates deterministic repo index, repo-truth, and runtime outputs sized to the target repo, emits `.github/.bootstrap-summary.md` with classification, retained or removed assets, and next action, and prunes copied toolkit residue to the manifest keep set.
7. If the current repository or surrounding workflow has separate delivery artifacts, they may audit, review, or prioritize follow-up work around that bootstrap flow, but they are optional context and not alternate runtime entrypoints.

When reviewing generated output, distinguish between the full generated repo surface and a `.github`-only capture. Treat a `.github` snapshot as a partial artifact: it may legitimately omit retained `docs/` artifacts, but if so the capture should say that explicitly instead of implying those docs were never generated.

Tool-neutral artifacts such as `docs/ai/00-repo-index.md`, `docs/00-repo-overview.md`, and root `AGENTS.md` should remain useful outside GitHub Copilot. Copilot-specific files route Copilot behavior; shared repo-memory files should orient Copilot CLI, VS Code Copilot, Codex, and other coding agents without requiring them to load the full `.github/` bundle.

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

## Tool-Calling Gate

Do not assume every chat turn is tool-calling by default.

- Agent and AskAgent-style paths can expose tools when the runtime, model capability, and current mode allow it.
- A plain panel chat path may stay effectively non-tool-calling if the current intent does not override tool exposure.
- Mental model: no exposed tools means no tool calls, even if prompt wording asks for them.

So when a workflow depends on tools, check the active mode and exposed-tool path before assuming the model can search, read, or execute anything.

## Why The Loop Keeps Going

The loop can continue for more than one reason:

1. the model emitted tool calls for the next round
2. a stop or subagent-stop hook blocked stopping and turned its reason into a continuation query
3. autopilot or task-oriented execution decided the task is not complete yet

Mental model: the loop stops only when the runtime decides it is allowed to stop and the task is considered complete enough.

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

## Runtime Doc Boundaries

Use the runtime docs as three distinct layers:

- `runtime-overview.md` explains the high-level execution model, gates, continuation behavior, and what reaches the model.
- `tool-runtime.md` explains tool exposure, hooks, invocation timing, and tool-result round-trips.
- `prompt-and-context.md` explains how to choose, trim, and place context so prompts stay high-signal.

Keep these roles separate. Do not restate the same operational rule in prompts, skills, agents, and all runtime docs unless the duplication is intentional and lightweight.

## Key Constraints

- Do not assume the whole workspace or every `.github/` file goes directly into the model.
- `copilot-instructions.md`, scoped instructions, agents, prompts, and skills are prompt resources; GitHub infra files are not automatically injected.
- The bootstrap pipeline source of truth lives in the skill, not in prompts or agents.
- Operator-facing guidance should mirror the same `/bootstrap-copilot` -> `@conductor` -> `generate-copilot-config` chain instead of implying a second primary journey.
- Long-running threads are compacted and summarized, so keep threads aligned by subsystem or workflow.
- Tool results from round N appear in the prompt for round N+1, not in the same round.

## Verification

- Confirm prompt entry points defer to the canonical skill instead of redefining the pipeline.
- Confirm bundle guidance distinguishes repo-level instructions, task context, and generated outputs.
- Confirm tool-related guidance matches official hook and prompt behavior described elsewhere in `.github/`.
- Confirm the docs still distinguish the tool-calling gate, the execution loop, and context-optimization guidance instead of blending them together.

## Common Failure Modes

- Treating every `.github/` file as if it is auto-injected into prompt context.
- Duplicating pipeline logic in prompt, agent, and skill files.
- Mixing toolkit-template assets with generated target-project output.
- Assuming every chat surface is equally tool-capable.
- Assuming raw history or raw tool output is always sent verbatim to the model.
- Assuming tool results are visible in the same round they are produced (they go into the next round).
- Forgetting that stop hooks and autopilot can legitimately continue the loop after a non-tool turn.
- Not realizing compaction happens automatically; restarting threads unnecessarily.

## Related Files

- `.github/docs/prompt-and-context.md`
- `.github/docs/tool-runtime.md`
- `.github/docs/github-resource-conventions.md`
- `.github/docs/user-playbook.md`
