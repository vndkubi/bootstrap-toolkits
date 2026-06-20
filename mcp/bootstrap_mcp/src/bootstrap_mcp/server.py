from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable
from urllib.parse import unquote, urlparse
from urllib.request import url2pathname

from . import __version__
from .repo import (
    analyze_repo,
    audit_context,
    detect_drift,
    doctor_client_surface,
    generate_spec,
    generate_tasks,
    list_skills,
    redact_text,
    validate_bootstrap_output,
)

PROTOCOL_VERSION = "2025-06-18"


@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    input_schema: dict[str, Any]
    handler: Callable[[dict[str, Any], Path, bool], dict[str, Any]]
    read_only: bool = True
    destructive: bool = False


def wrap_read(handler: Callable[[dict[str, Any], Path], dict[str, Any]]) -> Callable[[dict[str, Any], Path, bool], dict[str, Any]]:
    return lambda params, repo_root, _allow_write: handler(params, repo_root)


TOOLS: dict[str, Tool] = {
    "analyze_repo": Tool(
        name="analyze_repo",
        description="Analyze a local repository and return detected stacks, modules, domains, and risk notes.",
        input_schema={
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Absolute or relative local repository path. Defaults to --repo."},
                "depth": {"enum": ["quick", "standard", "deep"], "default": "standard"},
            },
            "additionalProperties": False,
        },
        handler=wrap_read(analyze_repo),
    ),
    "audit_context": Tool(
        name="audit_context",
        description="Estimate which repo guidance files would load for an agent and workspace-relative file path.",
        input_schema={
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Absolute or relative local repository path. Defaults to --repo."},
                "agent": {"type": "string"},
                "filepath": {"type": "string"},
            },
            "required": ["agent", "filepath"],
            "additionalProperties": False,
        },
        handler=wrap_read(audit_context),
    ),
    "detect_drift": Tool(
        name="detect_drift",
        description="Return a lightweight bootstrap drift score from manifest, snapshot, repo size, and scan source signals.",
        input_schema={"type": "object", "properties": {"path": {"type": "string"}}, "additionalProperties": False},
        handler=wrap_read(detect_drift),
    ),
    "list_skills": Tool(
        name="list_skills",
        description="List .github skills with descriptions, trigger hints, and MCP invocability.",
        input_schema={"type": "object", "properties": {"path": {"type": "string"}}, "additionalProperties": False},
        handler=wrap_read(list_skills),
    ),
    "validate_bootstrap_output": Tool(
        name="validate_bootstrap_output",
        description="Validate expected bootstrap output files and flag stale or generic retained surface.",
        input_schema={"type": "object", "properties": {"path": {"type": "string"}}, "additionalProperties": False},
        handler=wrap_read(validate_bootstrap_output),
    ),
    "doctor_client_surface": Tool(
        name="doctor_client_surface",
        description="Check Copilot CLI, VS Code, Claude Desktop, and Cursor MCP config shapes without editing them.",
        input_schema={"type": "object", "properties": {"path": {"type": "string"}}, "additionalProperties": False},
        handler=wrap_read(doctor_client_surface),
    ),
    "generate_spec": Tool(
        name="generate_spec",
        description="Generate a compact feature spec preview, optionally writing it inside --repo when write and confirm_write are true.",
        input_schema={
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "description": {"type": "string"},
                "target_path": {"type": "string"},
                "write": {"type": "boolean"},
                "confirm_write": {"type": "boolean"},
            },
            "required": ["description"],
            "additionalProperties": False,
        },
        handler=generate_spec,
        read_only=False,
        destructive=True,
    ),
    "generate_tasks": Tool(
        name="generate_tasks",
        description="Generate implementation tasks from a plan path, optionally writing inside --repo when confirmed.",
        input_schema={
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "plan_path": {"type": "string"},
                "target_path": {"type": "string"},
                "write": {"type": "boolean"},
                "confirm_write": {"type": "boolean"},
            },
            "additionalProperties": False,
        },
        handler=generate_tasks,
        read_only=False,
        destructive=True,
    ),
}


def run_stdio(repo_root: Path, allow_write: bool = False) -> None:
    server = BootstrapMcpServer(repo_root=repo_root, allow_write=allow_write)
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        response = server.handle_json(line)
        if response is not None:
            print(json.dumps(response, separators=(",", ":")), flush=True)


class BootstrapMcpServer:
    def __init__(self, repo_root: Path, allow_write: bool) -> None:
        self.repo_root = repo_root
        self.allow_write = allow_write
        self.initialized = False

    def handle_json(self, line: str) -> dict[str, Any] | None:
        try:
            request = json.loads(line)
        except json.JSONDecodeError as exc:
            return error_response(None, -32700, f"invalid JSON: {exc.msg}")
        if not isinstance(request, dict):
            return error_response(None, -32600, "request must be a JSON object")
        return self.handle(request)

    def handle(self, request: dict[str, Any]) -> dict[str, Any] | None:
        method = request.get("method")
        request_id = request.get("id")
        params = request.get("params") or {}

        try:
            if method == "initialize":
                self.initialized = True
                return result_response(request_id, self.initialize_result())
            if method == "notifications/initialized":
                self.initialized = True
                return None
            if not self.initialized:
                return error_response(request_id, -32002, "server must be initialized before tool calls")
            if method == "tools/list":
                return result_response(request_id, {"tools": [tool_descriptor(tool) for tool in TOOLS.values()]})
            if method == "tools/call":
                return result_response(request_id, self.call_tool(params))
            if method == "resources/list":
                return result_response(request_id, {"resources": list_resources(self.repo_root)})
            if method == "resources/read":
                return result_response(request_id, read_resource(params, self.repo_root))
            if method == "prompts/list":
                return result_response(request_id, {"prompts": list_prompts(self.repo_root)})
            if method == "prompts/get":
                return result_response(request_id, get_prompt(params, self.repo_root))
        except Exception as exc:
            redacted, _count = redact_text(str(exc))
            return error_response(request_id, -32000, redacted)

        return error_response(request_id, -32601, f"unknown method: {method}")

    def initialize_result(self) -> dict[str, Any]:
        return {
            "protocolVersion": PROTOCOL_VERSION,
            "capabilities": {
                "tools": {},
                "resources": {},
                "prompts": {},
            },
            "serverInfo": {
                "name": "bootstrap-mcp",
                "version": __version__,
            },
        }

    def call_tool(self, params: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(params, dict):
            raise ValueError("tools/call params must be an object")
        name = params.get("name")
        arguments = params.get("arguments") or {}
        if name not in TOOLS:
            raise ValueError(f"unknown tool: {name}")
        if not isinstance(arguments, dict):
            raise ValueError("tool arguments must be an object")
        tool = TOOLS[name]
        structured = tool.handler(arguments, self.repo_root, self.allow_write)
        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps(structured, indent=2, sort_keys=True),
                }
            ],
            "structuredContent": structured,
            "isError": False,
        }


def tool_descriptor(tool: Tool) -> dict[str, Any]:
    return {
        "name": tool.name,
        "description": tool.description,
        "inputSchema": tool.input_schema,
        "annotations": {
            "destructiveHint": tool.destructive,
            "idempotentHint": tool.read_only,
            "readOnlyHint": tool.read_only,
        },
    }


def list_resources(repo_root: Path) -> list[dict[str, Any]]:
    candidates = [
        "AGENTS.md",
        "CLAUDE.md",
        ".github/copilot-instructions.md",
        ".github/constitution.md",
        ".github/docs/prompt-and-context.md",
        ".github/docs/repo-intelligence-router.md",
    ]
    resources: list[dict[str, Any]] = []
    for relative in candidates:
        path = repo_root / relative
        if not path.exists():
            continue
        resources.append({"uri": path.as_uri(), "name": relative, "mimeType": "text/markdown"})
    for spec in sorted((repo_root / "specs").glob("*/spec.md")) if (repo_root / "specs").exists() else []:
        resources.append({"uri": spec.as_uri(), "name": spec.relative_to(repo_root).as_posix(), "mimeType": "text/markdown"})
    return resources


def resolve_resource_uri(uri: str, repo_root: Path) -> Path:
    parsed = urlparse(uri)
    if parsed.scheme != "file":
        raise ValueError("only file:// resources are supported")
    path = Path(url2pathname(unquote(parsed.path)))
    resolved = path.resolve()
    try:
        resolved.relative_to(repo_root.resolve())
    except ValueError as exc:
        raise ValueError("resource must stay inside --repo") from exc
    if not resolved.exists() or not resolved.is_file():
        raise ValueError("resource not found")
    return resolved


def read_resource(params: dict[str, Any], repo_root: Path) -> dict[str, Any]:
    uri = str(params.get("uri") or "")
    if not uri:
        raise ValueError("resources/read requires uri")
    path = resolve_resource_uri(uri, repo_root)
    text = path.read_text(encoding="utf-8", errors="replace")
    redacted, _count = redact_text(text)
    return {
        "contents": [
            {
                "uri": uri,
                "mimeType": "text/markdown",
                "text": redacted[:32768],
            }
        ]
    }


def list_prompts(repo_root: Path) -> list[dict[str, Any]]:
    prompts_dir = repo_root / ".github" / "prompts"
    if not prompts_dir.exists():
        return []
    prompts = []
    for path in sorted(prompts_dir.glob("*.prompt.md")):
        name = path.name.removesuffix(".prompt.md")
        prompts.append({
            "name": name,
            "description": f"Render {name} prompt from the bootstrap bundle.",
            "arguments": [
                {"name": "input", "description": "Optional prompt input text.", "required": False}
            ],
        })
    return prompts


def get_prompt(params: dict[str, Any], repo_root: Path) -> dict[str, Any]:
    name = str(params.get("name") or "")
    if not name:
        raise ValueError("prompts/get requires name")
    prompt_path = repo_root / ".github" / "prompts" / f"{name}.prompt.md"
    if not prompt_path.exists():
        raise ValueError(f"unknown prompt: {name}")
    arguments = params.get("arguments") or {}
    if not isinstance(arguments, dict):
        raise ValueError("prompt arguments must be an object")
    text = prompt_path.read_text(encoding="utf-8", errors="replace")
    for key, value in arguments.items():
        text = text.replace("{{" + str(key) + "}}", str(value))
    if arguments:
        text = f"{text.rstrip()}\n\n## MCP Arguments\n\n```json\n{json.dumps(arguments, indent=2, sort_keys=True)}\n```\n"
    redacted, _count = redact_text(text)
    return {
        "description": f"Rendered {name} prompt.",
        "messages": [
            {
                "role": "user",
                "content": {
                    "type": "text",
                    "text": redacted,
                },
            }
        ],
    }


def result_response(request_id: Any, result: dict[str, Any]) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": request_id, "result": result}


def error_response(request_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}
