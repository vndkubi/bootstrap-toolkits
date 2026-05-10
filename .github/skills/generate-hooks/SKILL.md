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

These GitHub Copilot hook events are supported in `.github/hooks/*.json`:

- `sessionStart` — session begins
- `userPromptSubmitted` — user submits a prompt
- `preToolUse` — before a tool executes
- `postToolUse` — after a tool executes
- `preCompact` — before context compaction (use to export critical state)
- `agentStop` — the main agent finishes a turn; can block and force continuation
- `subagentStart` — a subagent is spawned
- `subagentStop` — a subagent completes; can block and force continuation
- `sessionEnd` — session ends (use for reports, notifications, cleanup)

When you need a must-pass policy gate, prefer `agentStop` or `subagentStop` because those events can block completion and force another turn. Use `sessionEnd` for non-blocking final logging or reporting.

## Event Selection Rules

| Goal | Recommended Event | Reason |
|---|---|---|
| Auto-format after file edits | `postToolUse` | Runs after edit/write tools |
| Lint checks | `postToolUse` with tool filtering | Run only after file-changing tools |
| Compile checks | `postToolUse` with tool filtering | Run after writes, not every prompt |
| Security guardrails | `preToolUse` | Block risky commands before execution |
| Prompt/session audit | `userPromptSubmitted`, `sessionStart` | Good for logging and governance |
| Context preservation | `preCompact` | Export decisions, constraints, plan state before compaction |
| Must-pass post-turn policy gate | `agentStop` | Validate final state before the main agent turn can end |
| Subagent tracking | `subagentStart`, `subagentStop` | Log nested agent lifecycle for audit |
| Session cleanup/reporting | `sessionEnd` | Generate reports, send notifications at session end |

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
| Long-running sessions | `context-checkpoint.json` | `preCompact` | checkpoint script (see below) |

## Tool Filtering Pattern

For lint and compile checks, use `postToolUse` with filtering so expensive commands run only after file-changing tools.

Example logic:

```text
If toolName indicates file edit/write/create/replace/patch:
  run formatter/lint/compile
Else:
  exit successfully without doing anything
```

## PreCompact Hook: Context Checkpoint

The `preCompact` event fires before the system compacts (summarizes) conversation context to free token budget. This is the right place to export critical state that must survive compaction.

### When to generate

- Repos with long-running feature work (Standard and Enterprise)
- Repos using spec-driven development with multi-step pipelines
- Any repo where losing in-progress decisions during compaction would cause rework

### What the checkpoint script should capture

The hook receives the current conversation state via stdin. A checkpoint script should:

1. Extract key decisions, constraints, and current plan state
2. Write them to a checkpoint file (e.g., `.github/.session-checkpoint.md`)
3. Exit 0 so compaction proceeds normally

### Example hook file

```json
{
  "hooks": {
    "PreCompact": [
      {
        "type": "command",
        "command": "node .github/scripts/checkpoint.js",
        "timeout": 10
      }
    ]
  }
}
```

### Rules

- `preCompact` hooks must be fast (< 10 seconds) — they block compaction
- Write to a predictable path so subsequent context can reference the checkpoint
- Do not attempt to prevent compaction — the hook is for exporting state, not blocking the process
- Add `.github/.session-checkpoint.md` to `.gitignore` — it is ephemeral session state, not repo content

## Hook File Format

Location: `.github/hooks/<hook-name>.json`

For GitHub Copilot CLI command hooks, use official hook JSON fields: `bash`, `powershell`, optional `cwd`, optional `env`, and `timeoutSec`.

```json
{
  "version": 1,
  "hooks": {
    "postToolUse": [
      {
        "type": "command",
        "bash": "./scripts/run-quality-check.sh",
        "powershell": "powershell -File scripts\\run-quality-check.ps1",
        "timeoutSec": 30
      }
    ]
  }
}
```

### Hook Command Properties

| Property | Type | Description |
|---|---|---|
| `type` | string | Must be `"command"` |
| `bash` | string | Shell command for Unix-like environments |
| `powershell` | string | Shell command for Windows |
| `cwd` | string | Working directory (relative to repository root) |
| `env` | object | Additional environment variables |
| `timeoutSec` | number | Timeout in seconds (default: 30) |

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
- Provide a `command` field as the cross-platform default
- Add `windows` override only when the default command is not Windows-compatible
- Keep hooks idempotent
- Keep blocking hooks fast

### Step 4: Respect Performance

- `preToolUse` should usually finish in under 10 seconds
- `postToolUse` should usually finish in under 30 seconds
- Avoid heavyweight commands after every non-edit tool call

### Step 5: Smoke-Test Generated Hooks

After generating hook files, run a smoke test for every generated hook. Fix failures immediately before moving to the next phase.

#### 5a. Structural Validation

For each `.github/hooks/*.json` file:

1. Parse as JSON — must not throw
2. Confirm a `hooks` object exists at the top level
3. Confirm every event key is an official Copilot hook event (`postToolUse`, `preToolUse`, `agentStop`, `sessionEnd`, etc.)
4. Confirm every entry has `type: "command"` and at least one of `bash`, `powershell`
5. Confirm `timeoutSec` is a number (when present)

#### 5b. Script Availability Check

For each hook command that references a script:

1. Resolve the path relative to the repo root
2. Confirm the file exists on disk
3. For Node.js scripts: run `node -c <script>` to syntax-check — must exit 0
4. For shell scripts: run `bash -n <script>` (or `powershell -Command "Get-Command <script>"` on Windows) to verify parseability

#### 5c. Dry-Run Execution

For each hook that references a Node.js script under `.github/scripts/`:

1. Run the script with empty stdin and a temporary `MEMORY_DIR`: `echo '{}' | node <script>`
2. The script must exit 0 (fail-open contract)
3. For blocking hooks such as `agentStop` or `subagentStop`: validate that stdout is valid JSON with `decision: "allow" | "block"`
4. For non-blocking hooks: stdout can be empty unless that hook explicitly injects additional context

#### 5d. External Command Availability (best-effort)

For hooks that invoke external commands (formatter, linter, compiler):

1. Check if the command exists: `which <cmd>` (Unix) or `Get-Command <cmd>` (Windows)
2. If the command is NOT available in the current environment, log a warning but do NOT fail — the target repo's dev environment may have it installed
3. If the command IS available, optionally run it with `--version` or `--help` to confirm it is functional

#### 5e. Fix-on-Fail

If any check in 5a–5c fails:

1. Diagnose the root cause (wrong event case, missing script, syntax error, bad output format)
2. Fix the generated file immediately
3. Re-run the failing check to confirm the fix
4. Log the fix in the generation output so the user sees what was corrected

Skip 5d failures (external command not found) — these are warnings, not errors.

## Verification

- Every hook file is valid JSON with a `hooks` object
- Commands exist and are appropriate for the target project
- Hook events use official GitHub Copilot names such as `sessionStart`, `userPromptSubmitted`, `preToolUse`, `postToolUse`, `preCompact`, `agentStop`, `subagentStart`, `subagentStop`, `sessionEnd`
- Lint/compile hooks use `postToolUse`, not fictional events
- Expensive checks are filtered to relevant tool usage
- At least one of `bash` or `powershell` is present; use both when you need cross-platform parity
- `preCompact` hooks finish in < 10 seconds
- Checkpoint files are added to `.gitignore`
- Blocking policy hooks use `agentStop` or `subagentStop` and return `{ "decision": "block" | "allow", "reason"?: "..." }`
- **Step 5 smoke test passed**: all generated hooks validated structurally, scripts syntax-checked, dry-runs exit 0, and any failures were fixed before completion

## Common Failure Modes

- Using fictional event names or cargo-culted aliases instead of official Copilot hook events
- Mixing unrelated hook schemas instead of the official Copilot CLI fields `bash` / `powershell` / `timeoutSec`
- Treating `agentStop` or `sessionEnd` as unsupported and therefore missing the official post-turn / session-end hook surfaces
- Running lint or compile after every tool call without filtering
- Generating hooks for commands the target project does not actually use
- Making `preToolUse` or `preCompact` hooks so slow that they block normal work
- Forgetting Windows-compatible commands
- Writing checkpoint files that are not in `.gitignore`
- Skipping the Step 5 smoke test — hooks that pass structural checks but fail at runtime (e.g., script exits non-zero)

## Output

```text
Hooks Generated:
.github/hooks/
- auto-format.json         <- postToolUse: formatter command
- lint-check.json          <- postToolUse: linter command
- compile-check.json       <- postToolUse: compile command
- security-gate.json       <- preToolUse: optional policy command
- manifest-fidelity.json   <- agentStop: block turn end if manifest and disk diverge
- context-checkpoint.json  <- preCompact: checkpoint session state (Standard/Enterprise)
```

## Related Files

- `.github/skills/generate-copilot-config/SKILL.md`
- `.github/agents/agent-generator.agent.md`
- `.github/docs/github-resource-conventions.md`
