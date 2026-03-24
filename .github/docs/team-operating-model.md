# Team Operating Model

## Purpose

Describe how a team should evolve this bundle and a bootstrapped repository over time so Copilot gets better through repo memory instead of repeated hand-prompting.

## Source of Truth

- `.github/copilot-instructions.md`
- `.github/docs/prompt-and-context.md`
- `.github/docs/github-resource-conventions.md`
- `.github/skills/generate-copilot-config/SKILL.md`

## Request / Data Flow

1. Repeated conventions move into repo-level instructions.
2. Repeated workflows move into skills and prompts.
3. Repeated clarification gaps become common docs or templates.
4. Generated target-project output is reviewed and refined as project-specific repo memory.

## Maturity Model

Teams typically progress through these levels:

| Level | Description | What changes |
|---|---|---|
| L1 — Ad-hoc prompts | Team chats manually each time | Results vary by who prompts best |
| L2 — Repo instructions | `copilot-instructions.md` + scoped `.instructions.md` in place | Consistency improves; less repetition |
| L3 — Docs + runbooks | Architecture docs, setup guides, test runbooks, ADRs | Agent researches faster, fewer hallucinations |
| L4 — Skills + agents + prompts | Encoded workflows for review, investigate, implement, test | Agent becomes a reusable workflow executor |
| L5 — Verification-first | Tests, screenshots, CI/CD automation, reproducible checks | Agent leverages its try-verify-refine loop at full strength |

## Four-Tier Documentation Strategy

An agent-friendly repo organizes docs in four layers:

1. **Global rules** — `copilot-instructions.md`: style, architecture invariants, validation expectations.
2. **Scoped instructions** — `.instructions.md` per language/domain: rules tied to specific file patterns.
3. **Workflow docs** — `docs/`: architecture, release process, testing runbook, source-of-truth design info.
4. **Ephemeral task docs** — Plan documents, investigation notes, ADR drafts used for a single task/feature.

Rules: each rule has one canonical place. Other locations link or summarize, never duplicate.

## When to Create a Common Doc

Create a new common doc when any of these triggers appear:

- The agent keeps misunderstanding the same subsystem
- Multiple engineers re-explain the same flow
- Many prompts repeat the same conventions
- Code review catches the same category of issue repeatedly
- Onboarding is slow because source-of-truth locations are unclear

Priority order for first docs: architecture overview → module/source-of-truth map → testing & verification runbook → coding conventions → common debugging playbooks.

## Common Doc Template

When creating a doc for both people and agents, use this structure:

```md
# <Topic>

## Purpose
What this doc covers and when to use it.

## Source of Truth
- Files and modules that own this area.

## Request / Data Flow
1. Step one
2. Step two
3. Step three

## Key Constraints
- Do: ...
- Don't: ...

## Verification
- Test commands
- Manual checks

## Common Failure Modes
- ...

## Related Files
- ...
```

## Agent-Friendly Repo Checklist

A repo optimized for agent work should have:

1. A concise, non-contradictory `copilot-instructions.md`.
2. Architecture docs organized by subsystem.
3. A source-of-truth map (which file/module owns what).
4. Verification and test command docs.
5. Common debugging playbooks for frequent issues.
6. Skills and prompts for repeated workflows.
7. Consistent naming and directory structure.

## Key Constraints

- Do not keep solving the same misunderstanding with longer prompts.
- Keep threads grouped by feature, subsystem, or investigation line.
- Use common docs for architecture, source-of-truth maps, verification runbooks, and failure modes.
- Keep prompts thin, skills procedural, and agents role-based.
- Separate rules from references in docs: rules are short and actionable, references explain background.

## Verification

- If a team repeats the same prompt guidance many times, promote it into `.github/`.
- If contributors keep getting lost in the same subsystem, add or refine a common doc.
- If bundle claims change, sync the skill, prompts, agents, and docs together.

## Common Failure Modes

- Letting README, prompts, and skills drift apart.
- Treating every task as a one-off prompt instead of building repo memory.
- Opening too many unrelated threads and losing summary quality.
- Storing durable team rules only in chat history.
- Duplicating the same rule in multiple locations and letting them diverge.
- Writing docs as narrative prose when agents work better with structured sections, bullets, and tables.

## Related Files

- `.github/docs/user-playbook.md`
- `.github/docs/runtime-overview.md`
- `.github/README.md`
