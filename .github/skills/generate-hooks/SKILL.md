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
- `subagentStart` — a subagent is spawned
- `subagentStop` — a subagent completes
- `stop` — session ends (use for reports, notifications, cleanup)

`agentStop` and `sessionEnd` are not valid GitHub Copilot hook events. Use `stop` for session-end logic.

## Event Selection Rules

| Goal | Recommended Event | Reason |
|---|---|---|
| Auto-format after file edits | `postToolUse` | Runs after edit/write tools |
| Lint checks | `postToolUse` with tool filtering | Run only after file-changing tools |
| Compile checks | `postToolUse` with tool filtering | Run after writes, not every prompt |
| Security guardrails | `preToolUse` | Block risky commands before execution |
| Prompt/session audit | `userPromptSubmitted`, `sessionStart` | Good for logging and governance |
| Context preservation | `preCompact` | Export decisions, constraints, plan state before compaction |
| Subagent tracking | `subagentStart`, `subagentStop` | Log nested agent lifecycle for audit |
| Session cleanup/reporting | `stop` | Generate reports, send notifications at session end |

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

VS Code uses PascalCase event names, a `command` field (cross-platform default), and optional OS-specific overrides (`windows`, `linux`, `osx`).

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "type": "command",
        "command": "./scripts/run-quality-check.sh",
        "windows": "powershell -File scripts\\run-quality-check.ps1",
        "timeout": 30
      }
    ]
  }
}
```

### Hook Command Properties

| Property | Type | Description |
|---|---|---|
| `type` | string | Must be `"command"` |
| `command` | string | Default command (cross-platform) |
| `windows` | string | Windows-specific override |
| `linux` | string | Linux-specific override |
| `osx` | string | macOS-specific override |
| `cwd` | string | Working directory (relative to repository root) |
| `env` | object | Additional environment variables |
| `timeout` | number | Timeout in seconds (default: 30) |

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
3. Confirm every event key is PascalCase (`PostToolUse`, `SessionStart`, `Stop`, `PreCompact`, etc.)
4. Confirm every entry has `type: "command"` and at least one of `command`, `windows`, `linux`, `osx`
5. Confirm `timeout` is a number (when present)

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
3. For `SessionStart` hooks: validate that stdout is valid JSON with `hookSpecificOutput.additionalContext` (or empty when no memory data exists)
4. For other hooks: stdout can be empty

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
- Hook events use PascalCase: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PreCompact`, `SubagentStart`, `SubagentStop`, `Stop`
- Lint/compile hooks use `PostToolUse`, not fictional events
- Expensive checks are filtered to relevant tool usage
- A `command` field is present (cross-platform default); `windows`/`linux`/`osx` overrides only when needed
- `PreCompact` hooks finish in < 10 seconds
- Checkpoint files are added to `.gitignore`
- `SessionStart` hooks that inject context return JSON: `{ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: "..." } }`
- **Step 5 smoke test passed**: all generated hooks validated structurally, scripts syntax-checked, dry-runs exit 0, and any failures were fixed before completion

## Common Failure Modes

- Using lowerCamelCase event names (`postToolUse`) instead of PascalCase (`PostToolUse`)
- Using Copilot CLI fields (`bash`/`powershell`/`timeoutSec`) instead of VS Code native fields (`command`/`windows`/`timeout`)
- Using unsupported events such as `agentStop`, `sessionEnd`, or `errorOccurred`
- Running lint or compile after every tool call without filtering
- Generating hooks for commands the target project does not actually use
- Making `preToolUse` or `preCompact` hooks so slow that they block normal work
- Forgetting Windows-compatible commands
- Writing checkpoint files that are not in `.gitignore`
- Skipping the Step 5 smoke test — hooks that pass structural checks but fail at runtime (e.g., script exits non-zero, stdout is not valid JSON for SessionStart)

## Memory Hook Generation

When a target repo uses the Layer 2 memory infrastructure, generate the following additional hook set alongside the standard quality hooks.

### Memory Hook Set

| Hook File | Event | Script | Timeout | Purpose |
|---|---|---|---|---|
| `memory-capture.json` | `PostToolUse` | `.github/scripts/memory-capture.js` | 5s | Append one JSONL observation per relevant tool event |
| `memory-inject.json` | `SessionStart` | `.github/scripts/memory-inject.js` | 10s | Inject bounded context from past sessions via `hookSpecificOutput.additionalContext` |
| `memory-summary.json` | `Stop` | `.github/scripts/memory-summary.js` | 10s | Write a structured session summary to `.memory/summaries/` |
| `memory-checkpoint.json` | `PreCompact` | `.github/scripts/memory-checkpoint.js` | 10s | Preserve goal, decisions, and next verification step |

### Memory Hook Rules

- Scripts must use Node standard library only — no external dependencies.
- If Node is unavailable, scripts must fail open (exit 0) without blocking sessions.
- The `postToolUse` capture hook must stay under 5 seconds.
- Injection, summary, and checkpoint hooks must stay under 10 seconds.
- All runtime memory artifacts (`.memory/`) must be gitignored.
- Hook files must reference scripts inside `.github/scripts/` so they travel with the copied bundle.
- Use `command` field with `node .github/scripts/<name>.js` — cross-platform by default.
- `SessionStart` injection hooks must return JSON with `hookSpecificOutput.additionalContext`.

### When To Generate Memory Hooks

Generate the memory hook set when:

- The target repo has Standard or Enterprise maturity level
- The target repo has multi-session or long-running feature work
- The bootstrap analysis detects existing memory or continuity patterns

Do not generate memory hooks for minimal or single-session repos unless explicitly requested.

## Output

```text
Hooks Generated:
.github/hooks/
- auto-format.json         <- postToolUse: formatter command
- lint-check.json          <- postToolUse: linter command
- compile-check.json       <- postToolUse: compile command
- security-gate.json       <- preToolUse: optional policy command
- context-checkpoint.json  <- preCompact: checkpoint session state (Standard/Enterprise)
- memory-capture.json      <- postToolUse: JSONL observation capture (Layer 2)
- memory-inject.json       <- sessionStart: context injection (Layer 2)
- memory-summary.json      <- stop: session summary (Layer 2)
- memory-checkpoint.json   <- preCompact: task state checkpoint (Layer 2)
```

## Related Files

- `.github/skills/generate-copilot-config/SKILL.md`
- `.github/agents/agent-generator.agent.md`
- `.github/docs/github-resource-conventions.md`
