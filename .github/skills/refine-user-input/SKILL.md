---
name: refine-user-input
description: "Analyze raw freeform user input and restructure it into an actionable prompt following the Goal/Anchor/Constraints/Verify shape. Default intake normalizer for non-trivial requests: use proactively before routing heavy workflows or when prompts are vague, cross-cutting, or missing scope, constraints, or verification details. Skip explicit refinement for trivial, already-clear asks."
---

# Refine User Input

Preprocesses raw user input into structured, actionable prompts before routing to execution skills. In this bundle, treat it as the default intake step for non-trivial work rather than a rescue step only for obviously vague prompts.

## When to Use

- As the default pre-routing normalization step for non-trivial user requests
- User gives a vague or short request (e.g., "fix auth", "add logging", "update the API")
- Request spans multiple modules, multiple skills, or a heavy workflow such as `implement-feature` or `specify-feature`
- Request is missing scope, acceptance criteria, or constraints
- When the user explicitly asks to refine, clarify, or structure their request
- When `@dev-orchestrator` detects ambiguous intent that could route to multiple skills
- Skip explicit refinement when the request is trivial, already scoped, and immediately verifiable
- Keywords: refine, clarify, structure, vague, preprocess, improve prompt

---

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| Raw input | Yes | The user's freeform text exactly as provided |
| Target skill | No | Downstream skill this input is destined for. Defaults to auto-detect from intent classification |

---

## Step 1: Classify Intent

Determine what the user is trying to do:

| Intent | Signals | Maps to |
|--------|---------|---------|
| Investigate | "how does", "why", "trace", "analyze", "root cause" | `investigate-pbi` |
| Implement | "add", "build", "create", "implement", "fix" | `implement-feature` |
| Specify | "spec", "define", "requirements", "PRD" | `specify-feature` |
| Review | "review", "check", "audit" | `review-code-changes` |
| Learn | "explain", "understand", "how does X work" | `learn-codebase` |
| Refactor | "refactor", "clean up", "simplify", "extract" | `implement-feature` |

If intent is ambiguous, note it as a clarification point for Step 5.

---

## Step 2: Extract Explicit Requirements

Parse the raw input and pull out anything already stated:

- **Scope**: modules, files, features, or areas mentioned
- **Constraints**: limits, non-goals, things not to change
- **Acceptance criteria**: done conditions, expected behavior
- **Module references**: specific file paths, class names, endpoints
- **Verification steps**: test commands, observable behaviors

Track what was found and what is missing. Do not invent information — only extract what the user explicitly provided.

---

## Step 3: Scan Repo Context

Read available repo truth pack to enrich the prompt with project-specific context:

1. Read `docs/00-repo-overview.md` for project scope, stack, and domain summary.
2. Read `docs/02-architecture-map.md` for module boundaries and integration points.
3. Read `docs/04-engineering-rules.md` for team conventions and constraints.
4. If any doc is missing, note it and proceed — these are target-repo generated docs that may not exist yet.
5. Extract domain terminology, module ownership rules, and architectural constraints relevant to the user's request.

Reference: [Constitution Article I](../../constitution.md) — understand before changing.

---

## Step 4: Enrich and Structure

Restructure the input into the **Goal / Anchor / Constraints / Verify** shape from `user-playbook.md`:

- **Goal**: What the user wants to achieve. Combine explicit statements with inferred intent from Step 1. Use the user's own words where possible.
- **Anchor**: Where in the codebase to start. Use module names or file paths detected in Steps 2-3. If unknown, mark `[NEEDS CLARIFICATION: which module or file is the starting point?]`.
- **Constraints**: What not to change, non-goals, dependency limits. Pull from explicit input and repo conventions.
- **Verify**: Done condition or test command. Extract from acceptance criteria or infer from the goal. If no verification is possible, mark `[NEEDS CLARIFICATION: how should completion be verified?]`.

Map the structured prompt to the appropriate task-specific template:
- Bug fix → Observed / Expected / Repro / Constraints / Done when
- Feature → User outcome / Constraints / Acceptance criteria
- Investigation → Focus / Scope / Explain with file references
- Refactor → Goal / Keep behavior unchanged / Verify

---

## Step 5: Label Ambiguities

For each gap that could not be filled from the raw input or repo context, insert:

`[NEEDS CLARIFICATION: <what is missing and why it matters>]`

Follow [Constitution Article V](../../constitution.md) — clarify before acting:
- Batch questions into a single list
- Skip questions the repo already answers
- Prioritize business rules, scope boundaries, and measurable outcomes
- Group markers by category: Scope, Business Rules, Technical Constraints, Verification

---

## Step 6: Present Refined Prompt

Output the refined prompt in a fenced code block. Then provide:

1. A count of `[NEEDS CLARIFICATION]` items
2. A summary of what was inferred from repo context (so the user can verify)
3. Three options for proceeding:
   - **(a) Approve and execute** — route to the detected skill with the refined prompt
   - **(b) Resolve clarifications** — answer the open questions, then re-refine
   - **(c) Edit directly** — modify the refined prompt manually, then execute

---

## Output Format

```markdown
## Refined Prompt

**Intent**: [classified intent] → [target skill]

**Goal**: [what to achieve]

**Anchor**: [where to start in codebase]

**Constraints**:
- [constraint 1]
- [constraint 2]

**Verify**: [done condition or test command]

**Open questions** (N):
- [NEEDS CLARIFICATION: ...]
- [NEEDS CLARIFICATION: ...]

**Context used**: [list of repo docs consulted and key facts extracted]
```

---

## Integration Points

| Consumer | How it uses the refined prompt |
|----------|-------------------------------|
| `implement-feature` | Receives structured requirement, module, and acceptance criteria |
| `specify-feature` | Receives structured feature description, target users, and constraints |
| `investigate-pbi` | Receives scoped investigation target with focus area and evidence standard |
| `learn-codebase` | Receives focus area and appropriate depth level |
| `review-code-changes` | Receives branch/PR scope and review focus areas |

---

## Common Failure Modes

| Failure | Cause | Fix |
|---------|-------|-----|
| Refined prompt is just a rephrasing | Step 3 skipped or repo docs missing | Ensure repo truth pack is read; if absent, note what would have been enriched |
| Too many clarification markers | User input is genuinely vague | This is correct behavior — surface the ambiguity rather than guessing |
| Wrong intent classification | Ambiguous signals (e.g., "fix" could be bug or feature) | Present the classification to the user and offer to reclassify |
| Over-engineering simple requests | "Fix typo in README" gets full Goal/Anchor/Constraints/Verify treatment | If the request is already clear and scoped, skip refinement and say so |

---

## Validation

- [ ] Refined prompt follows Goal/Anchor/Constraints/Verify shape
- [ ] Every gap is labeled `[NEEDS CLARIFICATION]` with rationale
- [ ] Repo context was consulted (not just raw input rephrased)
- [ ] User was presented the refined prompt and asked to confirm
- [ ] No assumptions stated as facts
- [ ] Intent classification is explicit and traceable
- [ ] Simple, already-clear requests are not over-refined
- [ ] Constitution Article V compliance (batch questions, skip obvious ones)
