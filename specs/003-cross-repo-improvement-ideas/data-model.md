# Cross-Repo Skill Pack Data Model

## SkillPackManifest

`SkillPackManifest` describes a portable group of skills that can be imported into or exported from a bootstrap-enabled repository. The manifest is metadata for validation, conflict handling, dependency checks, and lineage; imported skills remain plain `.github/skills/<name>/SKILL.md` folders at runtime.

| Field | Type | Description |
|---|---|---|
| `version` | integer | Manifest version |
| `packId` | string | Stable identifier |
| `title` | string | Human-readable pack name |
| `minimumToolkitVersion` | string | Lowest toolkit version expected to understand this pack |
| `source` | object | Git URL or local path |
| `skills` | object[] | Included skill descriptors |
| `dependencies` | string[] | Optional pack-level dependencies |

## Source

| Field | Type | Description |
|---|---|---|
| `type` | enum | `git` or `local` |
| `value` | string | Repository URL, local path, or other source locator |

## Skill Descriptor

| Field | Type | Description |
|---|---|---|
| `name` | string | Skill directory name |
| `path` | string | Relative path to the packaged skill directory |
| `description` | string | Short routing and review summary |
| `tags` | string[] | Optional classification tags |
| `dependencies` | string[] | Other skills required by this skill |

## Registry Relationship

The importer may keep `.skill-pack-registry.json` to track installed packs, hashes, lineage, and local modifications. That registry is a management artifact only; it is not required for model-time skill discovery.
