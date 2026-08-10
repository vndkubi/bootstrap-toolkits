# AI Team Project Guide

This file is installed into consumer repositories. The package source and installation documentation remain in the bootstrap repository’s root `README.md`.

## Start a task

```powershell
python scripts/ai_team.py validate
python scripts/ai_team.py list-templates
python scripts/ai_team.py new-artifact --template task-contract --id PBI-142 --title "Example change" --owner "Team"
```

Use the phase-specific shared skill under `.agents/skills/`, keep the user-selected model, and apply the guardrail returned by:

```powershell
python scripts/ai_team.py route --task-kind implementation --model inherit
```

## Delivery artifacts

Generate governed artifacts instead of creating custom formats:

```powershell
python scripts/ai_team.py new-artifact --template pbi-delivery-contract --id PBI-142 --title "Example change" --owner "Product Team"
python scripts/ai_team.py new-artifact --template impact-analysis --id PBI-142 --title "Example change" --owner "Engineering"
python scripts/ai_team.py new-artifact --template review-gate-decision --id PBI-142 --title "Example change" --owner "Independent reviewer"
```

For domain knowledge, use `capability`, `state-matrix`, `decision-matrix`, `business-invariant`, `business-pattern`, and `business-scenario`. Keep provenance and unknowns explicit.

## Learn from named PR reviews

Collection begins only when the user explicitly supplies the source:

```powershell
python scripts/ai_team.py capture-review --pr https://github.com/OWNER/REPOSITORY/pull/123 --owner "AI Team Maintainer"
```

Or a bounded reviewer history:

```powershell
python scripts/ai_team.py capture-review --reviewer GITHUB_LOGIN --repo OWNER/REPOSITORY --limit 10 --owner "AI Team Maintainer"
```

Public repositories can use unauthenticated access within GitHub’s limits. Set `GH_TOKEN` or `GITHUB_TOKEN` in the environment for authorized private access or higher limits; never commit a token. Curate the generated observation with the `review-learning` skill. Raw packets are ignored.

## Update the installed baseline

Run the installer from a newer bootstrap checkout against this repository. Unchanged managed files update safely; local modifications are preserved and an incoming conflict copy is written for manual review.
