---
name: retrospective
description: Analyze completed task traces, eval results, benchmark results, review findings, and human corrections to propose evidence-backed improvements to skills, roles, instructions, tooling, or model routing. Use after delivery or after a repeated failure pattern. Do not directly promote or self-approve process changes.
---

# Retrospective

Turn delivery evidence into a falsifiable improvement proposal.

Apply `.ai-team/protocols/model-neutral-execution.md`. Use `compatibility-strict` for every policy or promotion decision and stop before self-approval.

## Workflow

1. Gather completed traces, eval outputs, benchmark results, incidents, human corrections, and curated review-learning notes. Exclude impressions that have no source artifact.
2. Cluster repeated failure modes and separate outcome, process, style, and efficiency problems.
3. Identify the smallest plausible root cause: instruction gap, skill gap, tool gap, environment gap, model-routing gap, or requirement gap.
4. Add or specify a failing eval that reproduces the weakness before proposing a prompt or policy change.
5. Propose one minimal change and its expected measurable effect, cost, risk, rollback, and affected artifacts.
6. Compare the challenger with the current baseline on representative cases. Model-routing changes must include quality, latency, token, cost, and human-correction evidence.
7. Request human approval. Never edit and promote the governing instruction in the same decision.

## Evidence Rules

- Treat one occurrence as a hypothesis unless its impact is critical.
- Prefer two or more independent traces before generalizing a process rule.
- Add rules to `AGENTS.md` only when they apply to nearly every task; otherwise update a focused skill.
- Consider deletion or simplification when an instruction no longer improves protected evals.
- A reviewer observation is not a team rule until its scope, counterexamples, protecting eval, and human owner decision are recorded.

## Output Contract

Use `.ai-team/templates/improvement-proposal.md`. Set the proposal state to `PROPOSED`, link the new or failing eval, and name the human promotion gate.
