# Bootstrap MCP Server — Quickstart

> Validation recipe + happy-path checks. Target time-to-first-tool-call: **< 5 min** (US-8 AC-3).

## Prerequisites

- Python 3.11, 3.12, or 3.13
- `pipx` (recommended) or `pip`
- An MCP-capable client: Claude Desktop, Cursor, Continue, or VS Code (agent mode)

## 1. Install

```bash
pipx install bootstrap-mcp        # recommended
# or:
pip install --user bootstrap-mcp
```

Verify:

```bash
bootstrap-mcp --version
```

## 2. Register in a client

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "bootstrap": {
      "command": "bootstrap-mcp",
      "args": ["--stdio", "--repo", "/absolute/path/to/your/repo"]
    }
  }
}
```

Restart Claude Desktop.

### Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "bootstrap": {
      "command": "bootstrap-mcp",
      "args": ["--stdio", "--repo", "${workspaceFolder}"]
    }
  }
}
```

### VS Code (agent mode)

Add to user settings:

```json
"mcp.servers": {
  "bootstrap": {
    "command": "bootstrap-mcp",
    "args": ["--stdio", "--repo", "${workspaceFolder}"]
  }
}
```

## 3. First call

In your client's tool picker, invoke `analyze_repo` with no parameters (the `--repo` from startup is used by default). Expected: a JSON payload with `stacks`, `modules`, `domains`, `risks`.

If you see this within 5 minutes of step 1, quickstart passed.

## 4. Enable generation with writes (optional)

Writes are OFF by default. To allow write-capable generate tools:

```json
"args": ["--stdio", "--repo", "<path>", "--allow-write"]
```

Every accepted write is appended to `<repo>/.bootstrap-mcp/audit.log`.

## 5. Telemetry (optional)

```json
"args": ["--stdio", "--repo", "<path>", "--trace", ".bootstrap-mcp/trace.jsonl"]
```

Trace format is identical to spec-008.

## Validation scenarios

Map from `spec.md` ACs to concrete checks:

| Scenario | Command / Action | Expected |
|---|---|---|
| US-1 AC-1 (initialize) | Client connects | `initialize` returns protocol version `2025-06-18`, capabilities `{tools, resources, prompts}` |
| US-1 AC-2 (tools/list) | Call `tools/list` | 15 tools returned; every tool has `name`, `description`, `inputSchema`, `annotations.destructive` |
| US-1 AC-4 (invalid request) | Send malformed `tools/call` | Structured MCP error, server still alive |
| US-2 AC-1 (analyze_repo) | Call on this repo | Output matches `contracts/mcp-tools.schema.json#analyze_repo.output` |
| US-2 AC-6 (read-only safety) | Call any read tool; inspect mtimes in repo | Nothing written, no shell spawned |
| US-3 AC-1 (generate_spec) | With `write:false` | Returns content; nothing written |
| US-3 AC-1 (generate_spec) | With `write:true`, server started without `--allow-write` | Returns content + `hints.write_refused=true`; audit entry `outcome=refused` |
| US-3 AC-1 (generate_spec) | With `write:true`, `--allow-write` set, valid target | File written; audit entry `outcome=written` |
| US-3 AC-5 (provenance) | Any generate output | `provenance` block present with `tool`, `tool_version`, `server_version`, `inputs_hash`, `timestamp` |
| US-3 AC-6 (no silent writes) | `write:true` without `--allow-write` | Refused, not silent |
| US-4 AC-3 (dual representation) | Any audit tool output | Both `content.markdown` and `content.json` present |
| US-5 AC-1 (resources) | Call `resources/list` | `constitution.md`, `SOURCE-OF-TRUTH.md`, domain files, every `specs/*/spec.md` listed when present |
| US-5 AC-4 (resource redaction) | Place a fake AWS key in a resource file; read | Key replaced with `[REDACTED]` in returned content |
| US-6 AC-1 (prompts) | Call `prompts/list` | 6 prompts: `bootstrap-copilot`, `specify-feature`, `plan-implementation`, `generate-tasks`, `implement-feature`, `review-code-changes` |
| NFR-1 (cold start) | `time bootstrap-mcp --stdio --repo .` up to first `initialize` response | < 1.5 s |
| NFR-2 (read P95) | 20 `analyze_repo` calls on this repo | P95 < 2 s |

## Parity check (NFR-7)

For each ported adapter, run the same input through the in-Copilot skill and through the MCP tool; `diff --brief` on the JSON output. Any non-empty diff fails CI at release gate.

## Troubleshooting

- **"Server disconnected" in client** — check stderr on the MCP transport (clients usually expose a log pane); most frequent cause is a bad `--repo` path.
- **`E_PATH_ESCAPE`** — `target_path` resolved outside `--repo`. Fix the input.
- **`E_WRITE_REFUSED`** — server was not started with `--allow-write`. Restart with the flag or drop `write:true` from the call.
- **Stale output** — run `detect_drift` to check whether the bootstrap snapshot is out of date.
