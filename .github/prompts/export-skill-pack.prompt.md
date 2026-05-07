---
name: export-skill-pack
description: "Create a shareable skill-pack manifest with lineage metadata from selected local skills."
agent: agent
---

# Export Skill Pack

Use the `skill-pack-export` skill to export a selected set of skills.

## Inputs

**Pack id**: ${input:packId}

**Title**: ${input:title}

**Skill ids**: ${input:skillIds}

**Source**: ${input:source}

## Rules

1. Read each selected `skill.json` and `SKILL.md`.
2. Emit manifest hashes and lineage metadata.
3. Do not overwrite local skills or packs as part of the export flow.