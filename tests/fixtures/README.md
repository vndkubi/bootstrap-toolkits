# Bootstrap Test Fixtures

These fixtures are reference projects used to test and validate the bootstrap pipeline. Each fixture represents a project at a specific complexity tier.

## Purpose

1. **Validate bootstrap output quality** — run `/bootstrap-copilot` on a fixture and use `validate-bootstrap-output` to verify the generated config is project-specific and correct.
2. **Regression testing** — after toolkit changes, re-bootstrap fixtures and diff the output to catch regressions.
3. **Documentation** — illustrate what kind of config each classification tier generates.

## Fixtures

| Fixture | Classification | Stack | Description |
|---------|--------------|-------|-------------|
| [`small-project/`](small-project/) | Small | TypeScript/Node | Single-file REST API, 1 domain |
| [`standard-project/`](standard-project/) | Standard | Java/Spring Boot | 3-module e-commerce backend |
| [`enterprise-project/`](enterprise-project/) | Enterprise | Java/Jakarta EE | 12-module ERP system |

## How to Use

### Validating bootstrap output

1. Point the bootstrap toolkit at a fixture directory:
   ```
   /bootstrap-copilot (working directory: tests/fixtures/standard-project)
   ```
2. After bootstrap completes, run validation:
   ```
   validate-bootstrap-output
   ```
3. Review the report — all Tier 2 (project-specificity) checks should pass.

### Expected outputs

Each fixture has an `expected-output/` subdirectory with the reference bootstrap output. Use this for regression diffing:
- `expected-output/.bootstrap-manifest.json` — expected classification, tech stack, file list
- `expected-output/validation-report.md` — expected validation report (all passing)

## Adding New Fixtures

To add a fixture:
1. Create a new directory under `tests/fixtures/`
2. Add minimal project files that represent the target scenario (see existing fixtures for structure)
3. Add a `README.md` describing: purpose, classification, tech stack, key entities, expected agents/skills
4. Run bootstrap on it and save the output to `expected-output/`
