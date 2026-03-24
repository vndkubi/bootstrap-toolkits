---
name: generate-hooks
description: 'Generate GitHub Copilot hooks (.github/hooks/*.json) for formatter, lint, compile, security, and audit automation. Uses only official hook events and prefers postToolUse with tool filtering for quality checks. Use when bootstrapping Copilot config, setting up quality automation, or adding lifecycle hooks.'
---

# Generate Copilot Hooks

Generate `.github/hooks/*.json` files that automate shell commands at useful points during GitHub Copilot sessions.

## When to Use

- Bootstrapping a new Copilot configuration
- Adding formatter, lint, compile, or security automation
- Standardizing quality checks across repositories
- Keywords: "hooks", "auto-format", "lint automation", "compile checks", "security gate"

## Source of Truth

- `.github/skills/generate-copilot-config/SKILL.md`
- `.github/constitution.md`
- `.github/docs/runtime-overview.md`
- `.github/docs/github-resource-conventions.md`

## Official Hook Events

Only these GitHub Copilot hook events are supported:

- `sessionStart`
- `sessionEnd`
- `userPromptSubmitted`
- `preToolUse`
- `postToolUse`
- `errorOccurred`

`agentStop` and `subagentStop` are not valid GitHub Copilot hook events.

## Event Selection Rules

| Goal | Recommended Event | Reason |
|---|---|---|
| Auto-format after file edits | `postToolUse` | Runs after edit/write tools |
| Lint checks | `postToolUse` with tool filtering | Run only after file-changing tools |
| Compile checks | `postToolUse` with tool filtering | Run after writes, not every prompt |
| Security guardrails | `preToolUse` | Block risky commands before execution |
| Prompt/session audit | `userPromptSubmitted`, `sessionStart`, `sessionEnd` | Good for logging and governance |
| Error logging | `errorOccurred` | Capture failures as they happen |

## Detection Matrix

| Detection | Hook File | Event | Command |
|---|---|---|---|
| Maven + Spotless | `auto-format.json` | `postToolUse` | `mvn spotless:apply -q` |
| Prettier | `auto-format.json` | `postToolUse` | `npx prettier --write .` |
| Black | `auto-format.json` | `postToolUse` | `python -m black .` |
| ktlint | `auto-format.json` | `postToolUse` | `./gradlew ktlintFormat -q` |
| ESLint | `lint-check.json` | `postToolUse` | `npx eslint . --max-warnings 0` |
| Checkstyle | `lint-check.json` | `postToolUse` | `mvn checkstyle:check -q` |
| PMD / detekt | `lint-check.json` | `postToolUse` | project-specific lint command |
| Maven / Gradle compile | `compile-check.json` | `postToolUse` | project-specific compile command |
| TypeScript | `compile-check.json` | `postToolUse` | `npx tsc --noEmit` |
| Security command restrictions | `security-gate.json` | `preToolUse` | policy command or script |

## Tool Filtering Pattern

For lint and compile checks, use `postToolUse` with filtering so expensive commands run only after file-changing tools.

Example logic:

```text
If toolName indicates file edit/write/create/replace/patch:
  run formatter/lint/compile
Else:
  exit successfully without doing anything
```

## Hook File Format

Location: `.github/hooks/<hook-name>.json`

```json
{
  "version": 1,
  "hooks": {
    "postToolUse": [
      {
        "type": "command",
        "bash": "./scripts/run-quality-check.sh",
        "powershell": ".\\scripts\\run-quality-check.ps1",
        "cwd": ".",
        "timeoutSec": 30
      }
    ]
  }
}
```

## Generation Workflow

### Step 1: Detect Project Tooling

- Formatters: Prettier, Spotless, Black, ktlint
- Linters: ESLint, Checkstyle, PMD, detekt
- Build tools: Maven, Gradle, npm/pnpm/yarn, dotnet, Python toolchain
- Security needs: restricted shell/terminal actions, secret exposure, destructive commands

### Step 2: Choose The Smallest Useful Hook Set

Prefer a minimal starting set:

1. `auto-format.json`
2. `lint-check.json`
3. `compile-check.json`
4. `security-gate.json` only if the repository needs it

Do not generate many hooks unless the project clearly benefits from them.

### Step 3: Keep Commands Project-Specific

- Use commands that exist in the target repository
- Provide both `bash` and `powershell`
- Keep hooks idempotent
- Keep blocking hooks fast

### Step 4: Respect Performance

- `preToolUse` should usually finish in under 10 seconds
- `postToolUse` should usually finish in under 30 seconds
- Avoid heavyweight commands after every non-edit tool call

## Verification

- Every hook file is valid JSON with `"version": 1`
- Commands exist and are appropriate for the target project
- Hook events are official GitHub Copilot events only
- Lint/compile hooks use `postToolUse`, not fictional events
- Expensive checks are filtered to relevant tool usage
- Both `bash` and `powershell` are present for cross-platform support

## Common Failure Modes

- Using unsupported events such as `agentStop`
- Running lint or compile after every tool call without filtering
- Generating hooks for commands the target project does not actually use
- Making `preToolUse` hooks so slow that they block normal work
- Forgetting Windows-compatible commands

## Output

```text
Hooks Generated:
.github/hooks/
- auto-format.json      <- postToolUse: formatter command
- lint-check.json       <- postToolUse: linter command
- compile-check.json    <- postToolUse: compile command
- security-gate.json    <- preToolUse: optional policy command
```

## Related Files

- `.github/skills/generate-copilot-config/SKILL.md`
- `.github/agents/agent-generator.agent.md`
- `.github/docs/github-resource-conventions.md`
