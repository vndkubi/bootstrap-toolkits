# Team Operating Model

## Purpose

Describe how a team should evolve this bundle and a bootstrapped repository over time so Copilot improves through durable repo memory instead of repeated prompting.

## Source of Truth

- `.github/copilot-instructions.md`
- `.github/docs/prompt-and-context.md`
- `.github/docs/github-resource-conventions.md`
- `.github/skills/generate-copilot-config/SKILL.md`

## Request / Data Flow

1. Repeated conventions move into repo-level instructions.
2. Repeated workflows move into skills and prompts.
3. Repeated clarification gaps move into shared docs or templates.
4. Generated target-project output is reviewed and refined as project-specific repo memory.

## Maturity Model

| Level | Description | What changes |
|---|---|---|
| L1 - Ad-hoc prompts | Team re-explains context in chat | Results vary by prompting skill |
| L2 - Repo instructions | `copilot-instructions.md` plus scoped `.instructions.md` exist | Consistency improves |
| L3 - Common docs | Overview, glossary, architecture map, runbook, failure modes exist | Investigation gets faster and safer |
| L4 - Skills and agents | Repeated workflows are encoded | Copilot becomes reusable across tasks |
| L5 - Verification-first | Reproducible checks and CI-backed validation exist | Try-verify-refine loops become reliable |

## Four-Tier Documentation Strategy

Use four documentation layers:

1. **Global rules**: `.github/copilot-instructions.md`
2. **Scoped instructions**: `.instructions.md` files for language, stack, or domain-specific rules
3. **Repo memory docs**: `docs/` for overview, glossary, architecture, runbooks, modules, workflows, ADRs
4. **Task truth**: temporary plans, investigations, reviews, and feature-specific artifacts

Rules:

- each durable rule has one canonical home
- other places should link or summarize, not duplicate
- prompts stay thin and point to source-of-truth files

## Progressive Disclosure Strategy

Use the same documentation shape across repo sizes, but expand it only as needed.

### Global Truth

Always keep a short repo-wide layer:

- `.github/copilot-instructions.md`
- `docs/00-repo-overview.md`
- `docs/03-verification-runbook.md`

### Module / Domain Truth

Add these when the repo has enough domain or boundary complexity:

- `docs/01-business-glossary.md`
- `docs/02-architecture-map.md`
- `docs/04-engineering-rules.md`
- `docs/05-common-failure-modes.md`
- `docs/modules/*.md`

### Task Truth

Add these when work depends on business-flow or historical-decision context:

- `docs/workflows/*.md`
- `docs/decisions/*.md`
- task-specific plans, investigations, and reviews

### Scale Rules

- Small repos: merge aggressively and avoid doc sprawl.
- Medium repos: keep the 6 common docs.
- Large repos: split by module and workflow.
- Enterprise repos: add owners, cadence, dependency direction, integration boundaries, and per-domain verification notes.

## When to Create a Common Doc

Create or refine a common doc when:

- the same subsystem keeps being misunderstood
- multiple engineers keep re-explaining the same flow
- prompts repeat the same conventions
- code review keeps catching the same category of issue
- onboarding is slow because source-of-truth locations are unclear

Priority order:

1. repo overview
2. verification runbook
3. glossary
4. architecture map
5. engineering rules
6. common failure modes

## Common Doc Skeleton

Use a consistent structure when possible:

```md
# <Title>

## Purpose

## When To Use

## Source of Truth

## Key Facts

## Constraints

## Verification

## Related Files

## Unknowns / Assumptions
```

Do not remove `Unknowns / Assumptions` from durable docs unless the file is intentionally tiny.

## Agent-Friendly Repo Checklist

An agent-friendly repo should have:

1. A concise `copilot-instructions.md`
2. A clear repo overview
3. A verification runbook
4. A source-of-truth map for architecture and boundaries
5. A glossary for business-heavy repos
6. Common failure-mode guidance for repeated regressions
7. Skills and prompts for repeated workflows
8. Consistent naming and directory structure

## Key Constraints

- Do not keep solving the same misunderstanding with longer prompts.
- Prefer progressive disclosure over giant docs.
- Use docs for durable truth, `.instructions.md` for scoped coding rules, and chat for current-task details.
- Keep important claims tied to sources of truth.
- If something is uncertain, write that uncertainty down.

## Verification

- If the team repeats the same prompt guidance many times, promote it into `.github/` or `docs/`.
- If contributors keep getting lost in the same subsystem, add or refine the relevant common doc.
- If bundle claims change, sync the skill, prompts, agents, and docs together.

## Common Failure Modes

- Letting README, prompts, skills, and docs drift apart
- Treating every task as one-off prompting instead of building repo memory
- Creating too many docs for a small repo
- Keeping a large repo on a single giant overview file
- Storing durable rules only in chat history
- Writing docs without source-of-truth or unknowns sections

## Related Files

- `.github/docs/user-playbook.md`
- `.github/docs/runtime-overview.md`
- `.github/README.md`
