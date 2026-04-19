---
name: skill-pack-import
description: "Import, export, and manage portable skill packs from Git URLs or local paths. Handles conflict resolution to prevent overwriting local customizations. Supports offline-first workflows where the bundle remains fully self-contained. Use when importing shared skills, exporting domain skills for reuse, or auditing installed skill packs. Keywords: skill pack, import skill, export skill, portable skills, shared skills, org skills, reuse."
---

# Skill Pack Import / Export

Import and export portable skill packs between repositories using Git URLs or local paths. The bundle remains fully offline and self-contained — skill packs are an optional ecosystem layer, not a required dependency.

## When to Use

- Importing shared domain skills from an org-level skill pack
- Exporting local skills into a reusable pack for other repos
- Auditing which skill packs are installed and their versions
- Checking for conflicts between imported and local skills

## Prerequisites

- The target repo has a `.github/skills/` directory (standard after bootstrap)
- For Git-based imports: `git` CLI available in the environment
- For local imports: the source path is accessible from the current machine

## Manifest Schema

Skill packs are described by a manifest file that follows the `skill-pack-manifest.schema.json` contract.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | integer | Schema version (currently `1`) |
| `packId` | string | Stable kebab-case identifier (e.g., `my-org-java-skills`) |
| `title` | string | Human-readable pack name |
| `minimumToolkitVersion` | string | Minimum compatible toolkit version |
| `source` | object | `{ "type": "git" | "local", "value": "<url-or-path>" }` |
| `skills` | array | One or more skill descriptors |

### Skill Descriptor Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Skill directory name (must match the folder under `.github/skills/`) |
| `path` | string | Relative path within the pack source |
| `description` | string | Short description for discoverability |
| `tags` | string[]? | Optional classification tags |
| `dependencies` | string[]? | Other skills this skill requires |

### Example Manifest

```json
{
  "version": 1,
  "packId": "acme-java-domain-skills",
  "title": "ACME Java Domain Skills",
  "minimumToolkitVersion": "1.0",
  "source": {
    "type": "git",
    "value": "https://github.com/acme-org/copilot-skill-packs.git"
  },
  "skills": [
    {
      "name": "acme-order-domain",
      "path": "skills/acme-order-domain",
      "description": "Order domain rules, entity patterns, and validation conventions for ACME projects.",
      "tags": ["domain", "java", "order"],
      "dependencies": []
    },
    {
      "name": "acme-payment-integration",
      "path": "skills/acme-payment-integration",
      "description": "Payment gateway integration patterns and retry policies for ACME payment services.",
      "tags": ["domain", "java", "payment", "integration"],
      "dependencies": ["acme-order-domain"]
    }
  ],
  "dependencies": []
}
```

## Workflow

### Step 1: Validate Manifest

Read the skill-pack manifest and validate against the schema.

Checks:
- All required fields present and correctly typed
- `packId` is kebab-case (`^[a-z0-9-]+$`)
- `minimumToolkitVersion` is compatible with the current toolkit version (read from `.github/VERSION`)
- Every skill has a unique `name`
- Dependency references resolve within the pack or to existing local skills

If validation fails, report errors and stop.

### Step 2: Check for Conflicts

Before importing, compare each skill in the pack against existing local skills.

| Condition | Classification | Action |
|-----------|---------------|--------|
| Skill name does not exist locally | **Clean import** | Proceed |
| Skill exists locally with identical content | **No-op** | Skip — already up to date |
| Skill exists locally with different content | **Conflict** | Report conflict, do NOT overwrite |
| Skill exists locally but was locally modified after a prior import | **Local override** | Report as protected, do NOT overwrite |

**Critical rule**: Imported skills must NEVER overwrite local customizations silently. When a conflict is detected:

1. Report the conflict with a diff summary (which sections differ)
2. Present three options to the user:
   - **Keep local** — skip this skill entirely
   - **Accept import** — replace local with imported version (user must confirm)
   - **Merge manually** — show both versions and let the user decide per-section
3. Wait for explicit user choice before proceeding

### Step 3: Import Skills

For each skill that passes conflict resolution:

1. Copy the skill directory into `.github/skills/<name>/`
2. Validate that `SKILL.md` exists and has valid frontmatter
3. Record the import in `.github/.skill-pack-registry.json`

### Step 4: Update Registry

Maintain `.github/.skill-pack-registry.json` to track installed packs:

```json
{
  "version": 1,
  "installedPacks": [
    {
      "packId": "acme-java-domain-skills",
      "title": "ACME Java Domain Skills",
      "installedAt": "2026-04-19T10:00:00Z",
      "source": {
        "type": "git",
        "value": "https://github.com/acme-org/copilot-skill-packs.git"
      },
      "installedSkills": [
        {
          "name": "acme-order-domain",
          "importedAt": "2026-04-19T10:00:00Z",
          "locallyModified": false
        }
      ],
      "skippedSkills": [
        {
          "name": "acme-payment-integration",
          "reason": "conflict-kept-local"
        }
      ]
    }
  ]
}
```

### Step 5: Validate Installation

After import, verify:

- Every imported skill has a valid `SKILL.md` with frontmatter
- Skill dependencies are satisfied (either from the same pack or existing local skills)
- No duplicate skill names exist under `.github/skills/`
- The registry file is valid JSON

### Step 6: Report

Produce a summary:

```
Skill Pack Import Report
========================
Pack: ACME Java Domain Skills (acme-java-domain-skills)
Source: git — https://github.com/acme-org/copilot-skill-packs.git

Imported:  acme-order-domain
Skipped:   acme-payment-integration (conflict — kept local)
Errors:    none

Registry updated: .github/.skill-pack-registry.json
```

## Export Workflow

To export local skills as a reusable pack:

### Step 1: Select Skills

Identify which skills to include. Exclude:
- Bootstrap-only skills (e.g., `resume-bootstrap`, `validate-bootstrap-output`)
- Skills with repo-specific hardcoded paths that would not transfer

### Step 2: Generate Manifest

Create a `skill-pack-manifest.json` with:
- Auto-generated `packId` from the repo name or user input
- Current toolkit version as `minimumToolkitVersion`
- Each selected skill as a descriptor with name, path, and description from SKILL.md frontmatter

### Step 3: Package

Output options:
- **Git repository**: push to a specified Git URL
- **Local directory**: copy to a local path for manual distribution

## Offline-First Design

The skill-pack system follows the bundle's core portability principle:

1. **No network required for normal operation** — imported skills become local files, identical to hand-written skills. The bundle works fully offline after import.

2. **No registry dependency** — there is no central registry, marketplace, or API. Packs are just Git repos or local directories with a manifest.

3. **No auto-update** — imported skills do not phone home or auto-update. Updates are explicit: the user runs the import workflow again with a newer pack version.

4. **No lock-in** — imported skills are plain `.github/skills/<name>/SKILL.md` files. If the skill-pack system is removed, the imported skills continue to work normally.

5. **Graceful degradation** — if the registry file is missing or corrupted, skills still function. The registry is metadata for management, not a runtime dependency.

## Conflict Resolution Details

### Detection Algorithm

For each skill in the import pack:

1. Check if `.github/skills/<name>/` exists locally
2. If it exists, compare the `SKILL.md` content:
   - Hash comparison first (fast path)
   - If hashes differ, produce a structural diff:
     - Frontmatter changes (name, description, tools)
     - Body section changes (workflow steps, rules, examples)
3. Check the registry for prior import records:
   - If the skill was previously imported from the same pack and has been locally modified since, classify as **Local override** (protected)
   - If the skill was previously imported and NOT modified, classify as **Updatable**

### Merge Strategy

When the user chooses "Merge manually":

1. Show a section-by-section comparison:
   - Frontmatter (local vs imported)
   - Each major heading section
2. For each section, the user picks: keep local, accept import, or write custom
3. Assemble the merged result and validate frontmatter

### Protected Local Modifications

The system tracks whether a previously imported skill has been locally modified:

- After import, record a content hash in the registry
- On next import attempt, compare current content hash with the recorded hash
- If they differ → the user modified the skill locally → classify as **Local override**
- Local overrides are always protected: the import workflow reports them but never overwrites them without explicit confirmation

## Verification Contract

### Expected Outcome

- Skill packs can be imported from Git URLs or local paths
- Local customizations are never overwritten silently
- The bundle remains fully functional offline after import
- The registry tracks installed packs for auditing

### How to Verify

1. Import a test pack — confirm skills appear under `.github/skills/`
2. Modify an imported skill locally — re-import the same pack — confirm the local version is preserved
3. Delete `.github/.skill-pack-registry.json` — confirm all skills still function normally
4. Disconnect from network — confirm all imported skills work offline

### When to Stop or Escalate

- Stop if the manifest fails schema validation
- Stop if conflict resolution requires user input (do not auto-resolve)
- Escalate if a skill dependency cannot be resolved from local skills or the current pack

## Related Files

- `specs/003-cross-repo-improvement-ideas/contracts/skill-pack-manifest.schema.json` — JSON Schema for pack manifests
- `specs/003-cross-repo-improvement-ideas/data-model.md` — SkillPackManifest model definition
- `.github/.skill-pack-registry.json` — local registry of installed packs (created on first import)
- `.github/skills/generate-copilot-config/SKILL.md` — bootstrap pipeline that may generate initial skills
