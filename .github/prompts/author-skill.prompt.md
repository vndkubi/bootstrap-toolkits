---
name: author-skill
description: "Draft a reusable skill package from a plain-language brief or a correction pattern using the repo's standard skill layout."
agent: agent
---

# Author Skill

Use the `author-skill` skill to convert the request below into a draft skill package.

## Request

**Brief**: ${input:brief}

**Evidence refs**: ${input:evidenceRefs}

**Preferred tier**: ${input:tier}

## Rules

1. Ask for missing required fields instead of inventing them.
2. Produce a standard skill layout: `SKILL.md`, `skill.json`, `scripts/`, `assets/`, `references/`, `tests/skills/<id>/eval.json`.
3. Prefer repo-local terminology and existing MCP tool names when relevant.
4. Run `evaluate-skill` on the resulting draft before presenting it.