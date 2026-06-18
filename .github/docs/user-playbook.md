# User Playbook

## Purpose

Give maintainers and users a practical way to prompt Copilot effectively when working with this bootstrap bundle or with a target repository that has already been bootstrapped.

## Source of Truth

- `.github/prompts/bootstrap-copilot.prompt.md`
- `.github/skills/generate-copilot-config/SKILL.md`
- `.github/copilot-instructions.md`
- `.github/docs/apply-copilot-bootstrap.md`

## Prompt Shape

Every substantial prompt should have four parts:

```text
Goal:
Fix/implement <outcome>.

Anchor:
Start with <file/module>.

Constraints:
Do not change <x>.
Keep <y> behavior.

Verify:
Run/check <command or behavior>.
```

If the task is still unclear:

```text
Investigate root cause first.
If clear, implement the smallest safe fix.
State assumptions if you need to choose between options.
Verify with ...
```

## Task-Specific Prompt Templates

### Apply this bundle correctly

1. Copy only `.github/` into the target repository.
2. Run `/bootstrap-copilot` in GitHub Copilot Chat.
3. Use `@conductor Analyze this codebase and generate a complete GitHub Copilot configuration` only when slash prompts are unavailable.
4. Treat copied files as temporary bootstrap assets until generated output is validated.
5. Start daily work from retained prompts and agents such as `@dev-orchestrator`, `@investigator`, `/review-code`, and `/plan-review-scope`.

After bootstrap, verify `.github/copilot-instructions.md`, retained agents/skills/instructions, `.github/.bootstrap-summary.md`, review lane routing, and repo-truth docs for large repositories.

### Bootstrap this repository

```text
Bootstrap Copilot for this repository.
Goal: Generate the project-specific .github configuration from the copied bundle.
Anchor: Start from /bootstrap-copilot and use the target repo's README, build files, source code, tests, and docs.
Constraints: Treat copied toolkit files as bootstrap inputs, not repo identity proof. Keep the bootstrap chain /bootstrap-copilot -> @conductor -> generate-copilot-config.
Verify: Report classification, repo truth outputs, generated keep set, and cleanup summary.
```

Prefer the generated `.github/.bootstrap-summary.md` as the concise operator-facing outcome summary when it exists. It should let a maintainer understand classification, retained or removed assets, and next action without reconstructing state from multiple files.

If the current repository or workflow has separate audit or delivery artifacts, you can use them to track review and follow-up decisions around bootstrap work. Do not assume they exist, and do not treat them as the primary runtime bootstrap path.

### Bug fix

```text
Fix bug in <area>.
Observed: <symptom>
Expected: <correct behavior>
Repro: <steps or command>
Constraints: <what not to change>
Done when: <test or observable behavior>
```

### Feature

```text
Implement feature: <name>
User outcome: <what the user should be able to do>
Constraints: <non-goals, API stability, dependency limits>
Acceptance criteria:
1. ...
2. ...
3. ...
```

### Investigation

```text
Investigate how <thing> works in this codebase.
Focus on: <scope>
Explain with file references.
Call out risks, assumptions, and extension points.
```

### Refactor

```text
Refactor <thing> for <goal>.
Keep behavior and public API unchanged.
Prefer the smallest patch that improves structure.
Run/verify: <command>
```

### Review

```text
Review changes in <scope>.
Prioritize: bugs, regressions, missing tests, security.
Ignore style nits unless severe.
```

## When to Attach vs Mention Path

**Attach or paste** when the content is:

- a short error output, stack trace, or test failure
- acceptance criteria or a small source-of-truth snippet
- a verification command

**Mention path only** when:

- the file is long and the agent has read/search tools
- the goal is to give the agent a starting anchor for research
- the doc is architecture-level and only partially relevant

Heuristic: if the reader needs every line right now, paste it. If they only need a starting point, give the path.

## Thread Strategy

- Keep one thread per feature, subsystem, or investigation line.
- Follow up in the same thread while the topic is the same.
- Open a new thread when switching to a clearly different domain.
- Trust the system compaction to manage long threads; do not restart just because a thread is long.

## Plan Mode and Decision Logs

Use plan mode or a markdown decision log when:

- the task is large or multi-step
- scope is still unclear or has many tradeoffs
- multiple agents or people coordinate on the same feature
- decisions need to be explained later

Skip plan mode when the task is a small bug fix, a clear patch, or a well-specified request.

## Pre-Prompt Checklist

Before sending a prompt, check:

1. Is the outcome clear?
2. Is there a file or module anchor?
3. Are constraints and non-goals visible?
4. Is there a verify step or done condition?
5. Am I dumping too many files instead of letting the agent research?
6. Is there a rule I keep repeating that should be in an instruction file?
7. Is the current thread still on the same topic?

## Anti-Patterns

| Anti-pattern | Problem |
|---|---|
| Dump 10+ files without an anchor | Drowns signal in noise |
| Prompt too short and vague ("fix auth") | Agent must guess scope and done condition |
| Encode team conventions in every prompt | Inconsistent, not durable |
| New thread for every message on the same feature | Loses useful summarized history |
| No verification step | Agent cannot self-check, may fix symptom not cause |
| Mix investigate + implement + review in one prompt | Agent cannot prioritize; split into steps |

## Good vs Bad Prompt Examples

### Bad

```text
Fix chat please. I think many files are related:
agentPrompt.tsx, toolCallingLoop.ts, chatParticipantRequestHandler.ts...
```

Problems: no outcome, no anchor, no verify, file dump.

### Good

```text
Investigate why tool results in agent mode are repeated across turns.
Start with src/extension/intents/node/toolCallingLoop.ts and agentPrompt.tsx.
Keep existing user-facing behavior unchanged unless duplication is clearly a bug.
Verify by explaining root cause and describing the affected prompt/tool round flow.
```

## Key Constraints

- Keep threads grouped by feature, subsystem, or investigation line.
- Use prompts to express the current task, not to store long-term team conventions.
- Prefer investigate-first wording when the root cause or design is still unclear.
- Use explicit verification commands or observable behavior whenever possible.

## Verification

- Before sending a large prompt, run through the pre-prompt checklist above.
- Before closing a `.github/` change, check that the skill, prompt, agent, and guidance layers still agree.

## Common Failure Modes

- Asking for a big change without saying what "done" means.
- Creating one giant thread for unrelated tasks.
- Repeating the same conventions manually instead of moving them into repo memory.
- Reviewing or refactoring without saying whether behavior must remain unchanged.
- Overfitting on plan mode for trivial tasks, or skipping it for complex ones.
- Attaching long files when the agent already has read/search tools.

## Related Files

- `.github/docs/prompt-and-context.md`
- `.github/docs/github-resource-conventions.md`
- `.github/README.md`
