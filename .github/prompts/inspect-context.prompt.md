---
name: inspect-context
description: "Explain bounded Copilot runtime behavior such as missing skill triggers, missing tools, likely .github context loading, or retained-artifact and capability-tier decisions."
agent: Dev Orchestrator
---

# Inspect Context

Use the `context-inspector` skill to answer a bounded runtime-behavior question.

## Inputs

**Question**: ${input:question}
<!-- Examples: "Why didn't /promote-review-memory trigger?", "Why is run_in_terminal unavailable here?", "What context would implementor load for src/main/java/OrderService.java?", "Why was docs/06-copilot-onboarding.md retained?" -->

**Agent or mode** (optional): ${input:agent}
<!-- Examples: "dev-orchestrator", "implementor", "code-reviewer" -->

**File path** (optional): ${input:filePath}
<!-- Examples: "src/main/java/com/example/OrderService.java", "README.md" -->

**Artifact path** (optional): ${input:artifact}
<!-- Examples: ".github/.bootstrap-summary.md", "docs/06-copilot-onboarding.md" -->

## Instructions

1. Map the request into one of the approved question types from `context-inspector`.
2. Load only the smallest evidence set needed to answer it.
3. Use runtime fidelity, manifest, context assembly, tool-permission, agent, prompt, or skill evidence as appropriate.
4. Produce a bounded report with answer, evidence checked, unsupported-scope note when needed, and recommended next step.
5. If the request is broader than the approved runtime-diagnostic scope, defer it explicitly and route the user to the smallest fitting workflow.

## Rules

- Do not pretend to be a full platform debugger.
- Prefer retained repo evidence over speculation.
- Keep the answer user-facing and concrete.