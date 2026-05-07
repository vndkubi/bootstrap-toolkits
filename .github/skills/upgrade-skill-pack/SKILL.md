---
name: upgrade-skill-pack
description: "Compare a current skill-pack manifest to a newer one and report added, removed, and changed skills before import. Use when preparing an upgrade PR or reviewing lineage drift between pack versions. Keywords: upgrade skill pack, diff skill pack, pack lineage, pack upgrade."
---

# Upgrade Skill Pack

Diff two pack manifests before applying an upgrade.

## When to Use

- Reviewing a newer skill-pack release before import
- Preparing an upgrade pull request with explicit skill-level changes
- Auditing lineage drift between pack versions

## Inputs

- Old pack manifest path
- New pack manifest path

## Outputs

- JSON diff with added, removed, changed, and unchanged skills

## Workflow

1. Load the old and new pack manifests.
2. Compare skills by name, version, and manifest hash.
3. Return a deterministic diff for PR authoring or upgrade review.

## References

- Script: `.github/skills/upgrade-skill-pack/scripts/diff-pack.js`

## Verification Contract

- Expected Outcome: changed skills are listed explicitly before upgrade work starts.
- How to Verify: run `node .github/skills/upgrade-skill-pack/scripts/diff-pack.js <old-pack.json> <new-pack.json>`.
- When to Stop or Escalate: stop when either manifest is missing required fields or has duplicate skill names.