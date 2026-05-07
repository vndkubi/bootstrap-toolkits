---
name: author-skill
description: "Turn a correction pattern or plain-language capability brief into a draft skill package with SKILL.md, skill.json, standard layout, and an evaluation scaffold. Use when promoting repeated work into a reusable skill or when a non-technical teammate needs a guided business-skill draft. Keywords: author skill, create skill, draft skill, business skill, promote pattern."
---

# Author Skill

Create a draft skill package from evidence-backed patterns or plain-language briefs.

## When to Use

- Promoting a repeated correction-ledger pattern into a reusable skill
- Drafting a new business skill from plain-language input
- Generating a standard skill folder with manifest and evaluation scaffold

## Inputs

- A plain-language brief or structured JSON with `displayName`, `description`, and `goal`
- Optional evidence refs: correction-ledger entries, trace ids, docs, or review findings
- Optional dependency hints: `requires.skills`, `requires.mcp`, `mcp_tools_used`

## Workflow

1. Normalize the request into the fields required for a valid skill draft.
2. If critical fields are missing, return `needs_input` with explicit questions instead of freeform prose.
3. Generate a candidate `SKILL.md`, `skill.json`, standard layout placeholders, and `tests/skills/<id>/eval.json`.
4. Run `evaluate-skill` on the draft before proposing retention.

## Outputs

- Draft file map for the proposed skill package
- Missing-information questions when the input is incomplete
- Manifest aligned to `.github/schemas/skill-manifest.schema.json`

## References

- Template: `.github/templates/skills/business-skill.template.md`
- Script: `.github/skills/author-skill/scripts/draft-skill.js`

## Verification Contract

- Expected Outcome: output is `ready` with draft files or `needs_input` with explicit missing fields.
- How to Verify: run `node .github/skills/author-skill/scripts/draft-skill.js tests/skills/author-skill/input.json`.
- When to Stop or Escalate: stop when the brief has no stable goal, no evidence anchor, or contradicts repo conventions.