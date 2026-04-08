# Prompt And Context Guide

## Purpose

Capture the practical context-optimization rules that make Copilot more accurate and less noisy when using this bundle.

This file is about **context quality**, not tool exposure, hook sequencing, or execution-loop control.

## Source of Truth

- `.github/copilot-instructions.md`
- `.github/prompts/bootstrap-copilot.prompt.md`
- `.github/skills/generate-copilot-config/SKILL.md`
- `.github/docs/runtime-overview.md`

## Three-Layer Context Model

Context flows through three layers before reaching the model:

1. **Repo-level context** — durable, shared across tasks:
   - `copilot-instructions.md`, scoped `.instructions.md`
   - agents, prompts, skills
   - architecture and source-of-truth docs

2. **Conversation-level context** — accumulated within a thread:
   - history turns and summaries/compaction
   - tool transcripts and interim decisions

3. **Task-level context** — specific to the current request:
   - outcome, repro, stack trace
   - file anchors, constraints
   - verification steps

Rule: put durable rules at the repo layer, not in every prompt. Put task-only details in the current prompt. Trust compaction for conversation-level continuity.

## Signal / Noise / Cost Framework

Every piece of context has three dimensions:

- **Signal**: how much it helps the agent decide correctly
- **Noise**: how much it distracts or dilutes the prompt
- **Cost**: token budget, time to read, reasoning overhead

| Context | Signal | Cost | Action |
|---|---|---|---|
| Stack trace (20 lines) | High | Low | Paste directly |
| Architecture doc (800 lines) | Medium | High | Mention path or excerpt the relevant section |
| 12 files "possibly related" | Low | High | Do not dump; give 1-2 anchors |
| Test command | High | Low | Paste directly |
| Convention repeated every task | High | Medium | Move into instruction file |
| Stale brainstorming notes | Low | Medium | Drop |

Quick rule:

- Signal high, cost low → include immediately
- Signal high, cost high → excerpt or give path
- Signal low, cost high → usually omit

## Context Decision Matrix

Before including a piece of context, ask:

1. Does it help the agent decide more correctly?
2. Is it a source of truth?
3. Does it clarify a constraint?
4. Does it help verification?
5. If omitted, can the agent find it easily on its own?

If questions 1-4 are all "no" → usually omit.
If question 5 is "yes, the agent can find it easily" → mention lightly, do not attach in full.

## Where to Place Context

| Condition | Place it in |
|---|---|
| Only relevant to the current task | Current prompt |
| Multiple people keep re-explaining it | Common doc in `docs/` |
| A durable rule or convention | `.instructions.md` or `copilot-instructions.md` |
| A multi-step reusable workflow | Skill file |
| Agent keeps misunderstanding a subsystem | Targeted common doc |

## Runtime Doc Boundaries

Keep the runtime docs separated by concern:

- `runtime-overview.md` owns the high-level execution mental model.
- `tool-runtime.md` owns tool exposure, hooks, and round-trip behavior.
- `prompt-and-context.md` owns context selection, prompt signal/noise decisions, and placement rules.

If a rule is mainly about which tools can run or why a loop continues, document it in the runtime docs rather than here.

## Key Constraints

- Good context is the right context, not the most context.
- Put durable rules into instructions, skills, or common docs instead of repeating them in prompts.
- Put task-only details in the current prompt.
- Use paths for large files and paste only short source-of-truth snippets, errors, acceptance criteria, or verify commands.
- Every substantial prompt should make outcome, anchor, constraints, and verification clear.

## Context Optimization Checklist

Before sending a large prompt:

1. Is the outcome stated clearly?
2. Is the scope (files, modules) stated clearly?
3. Are there explicit negative constraints (what not to do)?
4. Is there a verification step?
5. Am I dumping too many files instead of anchoring?
6. Should any repeated guidance be moved to an instruction file?
7. If the task is large, should I split investigate and implement?

## Verification

- Check that prompts include an outcome, a starting anchor, negative constraints when needed, and a verification target.
- Check that repeated conventions have been promoted into repo memory instead of being hand-pasted each time.
- Check that large workflows use skills or docs rather than oversized prompt text.

## Common Failure Modes

- Dumping many files without a primary anchor.
- Giving vague goals like "fix this" without a success condition.
- Mixing investigation, implementation, refactor, and review intent in one first prompt.
- Starting new threads too often for the same feature and losing useful summarized history.
- Attaching long files when a file path would have been enough.
- Including stale or contradictory context that confuses the agent.
- Not providing negative constraints, causing the agent to touch unrelated code.

## Related Files

- `.github/docs/user-playbook.md`
- `.github/docs/github-resource-conventions.md`
- `.github/copilot-instructions.md`
