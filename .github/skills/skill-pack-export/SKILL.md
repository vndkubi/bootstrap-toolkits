---
name: skill-pack-export
description: "Export a selected set of local skills into a shareable skill-pack manifest with lineage metadata, manifest hashes, and source provenance. Use when publishing reusable skills to another repo, team, or pack registry. Keywords: export skill pack, skill lineage, share skills, pack manifest."
---

# Skill Pack Export

Build a portable skill-pack manifest from checked-in skills and preserve lineage metadata.

## When to Use

- Publishing a set of reusable skills for another repo or team
- Recording manifest hashes before sharing a skill pack
- Preparing an upgrade baseline for future pack comparisons

## Inputs

- Pack descriptor JSON with `packId`, `title`, `skillIds`, and `source`

## Outputs

- JSON pack manifest with skill versions, hashes, and source provenance

## Workflow

1. Read each selected skill's `skill.json` and `SKILL.md`.
2. Compute a stable manifest hash per skill.
3. Emit a `pack.json` structure with lineage metadata that downstream import or upgrade flows can diff.

## References

- Script: `.github/skills/skill-pack-export/scripts/export-pack.js`
- Lineage registry: `.github/.skill-lineage.json`

## Verification Contract

- Expected Outcome: the exported pack includes every requested skill with version and hash metadata.
- How to Verify: run `node .github/skills/skill-pack-export/scripts/export-pack.js tests/skills/skill-pack-export/input.json`.
- When to Stop or Escalate: stop when a requested skill is missing a manifest or when the pack descriptor is incomplete.