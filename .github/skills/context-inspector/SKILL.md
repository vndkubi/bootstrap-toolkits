---
name: context-inspector
description: "Answer bounded runtime-behavior questions using manifest, runtime fidelity, context assembly, and tool-permission evidence. Use when users ask why a skill or prompt did not trigger, why a tool is missing, what .github context is likely loaded, or why an artifact or capability tier was retained."
---

# Context Inspector

Provide a bounded, evidence-backed runtime explanation without pretending to be a general platform debugger.

## When to Use

- A user asks why a skill or prompt did not trigger
- A user asks why an expected tool is unavailable
- A user wants to know what `.github/` context is likely loaded for an agent and file path
- A user asks why an artifact was retained or removed, or how the applied capability tier changed the retained surface

## Do Not Use When

- The user wants a full raw dump of internal runtime state
- The request is really a codebase investigation or product-behavior question unrelated to Copilot runtime behavior
- The answer would require undocumented platform internals rather than retained repo evidence

## Approved v1 Question Set

1. Missing skill or prompt trigger
2. Missing tool exposure
3. `.github/` context-loading explanation for agent plus file path
4. Retained-or-removed artifact or capability-tier explanation

Reject unsupported questions explicitly instead of improvising.

## Evidence Sources

- `.github/.runtime-fidelity.json`
- `.github/.bootstrap-manifest.json`
- `.github/.skill-index.json`
- `context-assembly-simulator`
- `tool-permission-auditor`
- relevant agent, prompt, skill, and runtime doc files under `.github/`

## Workflow

### Step 1: Classify The Question

Map the request into exactly one supported question type.

If it does not fit the approved set, stop and return a bounded deferral with the closest supported next step.

### Step 2: Load The Minimum Evidence

- For trigger-miss questions: read runtime fidelity, skill index, relevant prompt or skill file, and routing guidance
- For missing-tool questions: read the relevant agent file and use `tool-permission-auditor` when available
- For context-loading questions: use `context-assembly-simulator` with the requested agent and file path
- For retained-surface or tier questions: read manifest, runtime fidelity, summary, and onboarding guidance when present

Do not load unrelated diagnostics once the likely cause is already clear.

### Step 3: Build A Bounded Answer

Explain only:

- the likely cause
- the evidence checked
- the confidence level implied by that evidence
- the next step when the answer is incomplete

Do not claim certainty when the evidence only supports a likely explanation.

### Step 4: Recommend The Right Follow-Up

- point to `context-assembly-simulator` for deeper context-load details
- point to `tool-permission-auditor` for deeper permission analysis
- point to `validate-bootstrap-output` or `upgrade-config` when the problem is stale or inconsistent generated config
- point to `@dev-orchestrator` when the request has turned into a broader investigation or implementation task

## Output Format

```md
## Context Inspector Report

**Question type**: ...
**Answer**: ...
**Evidence checked**:
- ...

**Boundaries / unsupported scope**:
- ...

**Recommended next step**:
- ...
```

## Validation

- [ ] The question was mapped to one approved v1 category or explicitly deferred
- [ ] The answer used retained repo evidence or supported audit skills
- [ ] Unsupported scope was called out explicitly when relevant
- [ ] The response did not dump raw internal platform state
- [ ] The next step points to the smallest deeper workflow that fits

## Related Files

- `.github/skills/context-assembly-simulator/SKILL.md`
- `.github/skills/tool-permission-auditor/SKILL.md`
- `.github/skills/validate-bootstrap-output/SKILL.md`
- `.github/docs/runtime-overview.md`
- `.github/docs/tool-runtime.md`