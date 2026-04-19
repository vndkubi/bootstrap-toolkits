---
agent: agent
description: "Import a skill pack from a Git URL or local path into this repository's .github/skills/ directory."
tools:
  - read_file
  - create_file
  - replace_string_in_file
  - list_dir
  - file_search
  - grep_search
  - run_in_terminal
  - vscode/askQuestions
---

# Import Skill Pack

Import skills from an external skill pack into this repository.

## Instructions

Use the `skill-pack-import` skill to run the full import workflow.

1. Ask the user for the skill-pack manifest location (Git URL or local path).
2. Validate the manifest against the schema.
3. Check every skill for conflicts with existing local skills.
4. **Do NOT overwrite any local skill without explicit user confirmation.**
5. Import clean (non-conflicting) skills automatically.
6. Update `.github/.skill-pack-registry.json` with import records.
7. Report the results.

## Critical Rules

- Never auto-resolve conflicts. Always ask the user.
- Never overwrite a locally modified skill without confirmation.
- The bundle must remain fully functional offline after import.
