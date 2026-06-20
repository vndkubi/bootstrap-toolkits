from __future__ import annotations

import fnmatch
import hashlib
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SKIP_DIRS = {
    ".artifacts",
    ".git",
    ".gradle",
    ".idea",
    ".memory",
    "bin",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "obj",
    "out",
    "results",
    "target",
    "vendor",
}

MARKERS: list[tuple[str, str]] = [
    ("java-maven", "pom.xml"),
    ("jvm-gradle", "build.gradle"),
    ("jvm-gradle", "build.gradle.kts"),
    ("dotnet", "*.sln"),
    ("dotnet", "*.csproj"),
    ("web-node", "package.json"),
    ("python", "pyproject.toml"),
    ("python", "requirements.txt"),
    ("php", "composer.json"),
    ("go", "go.mod"),
    ("rust", "Cargo.toml"),
    ("swift-package", "Package.swift"),
    ("flutter", "pubspec.yaml"),
]


def to_posix(path: str | Path) -> str:
    return str(path).replace(os.sep, "/")


def resolve_repo(path: str | Path) -> Path:
    repo = Path(path).resolve()
    if not repo.exists() or not repo.is_dir():
        raise ValueError(f"repo path is not a readable directory: {repo}")
    return repo


def collect_files(repo: Path) -> tuple[list[str], str, list[str]]:
    warnings: list[str] = []
    try:
        safe = to_posix(repo)
        result = subprocess.run(
            ["git", "-c", f"safe.directory={safe}", "-C", str(repo), "ls-files", "-z"],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        files = sorted(filter(None, result.stdout.decode("utf-8", errors="replace").split("\0")))
        if files:
            return files, "git ls-files", warnings
        warnings.append("git ls-files returned no files; used filesystem fallback")
    except Exception as exc:  # pragma: no cover - exact git failures vary by host
        warnings.append(f"git ls-files failed: {exc}; used filesystem fallback")

    return walk_files(repo), "filesystem walk", warnings


def walk_files(repo: Path) -> list[str]:
    files: list[str] = []
    for root, dirs, names in os.walk(repo):
        dirs[:] = [name for name in dirs if name not in SKIP_DIRS]
        root_path = Path(root)
        for name in names:
            absolute = root_path / name
            files.append(to_posix(absolute.relative_to(repo)))
    return sorted(files)


def module_root(file_path: str) -> str:
    path = Path(file_path)
    parent = to_posix(path.parent)
    return "." if parent == "." else parent


def detect_modules(files: list[str]) -> list[dict[str, Any]]:
    modules: dict[str, dict[str, Any]] = {}
    for file_path in files:
        base = Path(file_path).name
        for ecosystem, marker in MARKERS:
            if not fnmatch.fnmatch(base, marker):
                continue
            root = module_root(file_path)
            current = modules.setdefault(root, {"id": root, "path": root, "build_file": file_path, "ecosystems": set()})
            current["ecosystems"].add(ecosystem)
            if current.get("build_file", "") > file_path:
                current["build_file"] = file_path

    result = []
    for root in sorted(modules):
        item = dict(modules[root])
        item["ecosystems"] = sorted(item["ecosystems"])
        result.append(item)
    return result


def analyze_repo(params: dict[str, Any], default_repo: Path) -> dict[str, Any]:
    repo = resolve_repo(params.get("path") or default_repo)
    files, source, warnings = collect_files(repo)
    modules = detect_modules(files)
    stack_counts: dict[str, int] = {}
    for module in modules:
        for ecosystem in module["ecosystems"]:
            stack_counts[ecosystem] = stack_counts.get(ecosystem, 0) + 1

    risks = [{"severity": "warning", "message": warning} for warning in warnings]
    if len(files) > 2500:
        risks.append({"severity": "warning", "message": "repo has more than 2500 indexed files; use context packets before broad scans"})

    return {
        "stacks": [
            {"name": name, "confidence": 0.9 if count > 0 else 0.0}
            for name, count in sorted(stack_counts.items())
        ],
        "modules": [
            {"id": item["id"], "path": item["path"], "build_file": item.get("build_file", "")}
            for item in modules
        ],
        "domains": infer_domains(files),
        "risks": risks,
        "metadata": {
            "source": source,
            "total_files": len(files),
            "repo_size": classify_repo_size(len(files)),
        },
    }


def infer_domains(files: list[str]) -> list[str]:
    candidates: dict[str, int] = {}
    for file_path in files:
        parts = file_path.split("/")
        for part in parts[:3]:
            if part in {".github", "docs", "tests", "specs"}:
                continue
            if re.match(r"^[A-Za-z][A-Za-z0-9_-]{2,}$", part):
                candidates[part] = candidates.get(part, 0) + 1
    return [name for name, _count in sorted(candidates.items(), key=lambda item: (-item[1], item[0]))[:12]]


def classify_repo_size(file_count: int) -> str:
    if file_count < 1000:
        return "small"
    if file_count < 5000:
        return "medium"
    if file_count < 20000:
        return "large"
    return "enterprise"


def audit_context(params: dict[str, Any], default_repo: Path) -> dict[str, Any]:
    repo = resolve_repo(params.get("path") or default_repo)
    agent = str(params.get("agent") or "").strip()
    filepath = to_posix(params.get("filepath") or "")
    loaded: list[dict[str, Any]] = []

    add_if_exists(repo, ".github/copilot-instructions.md", loaded, "always-on Copilot instructions")
    if Path(repo, "AGENTS.md").exists():
        add_if_exists(repo, "AGENTS.md", loaded, "provider-neutral agent guidance")
    if Path(repo, "CLAUDE.md").exists():
        add_if_exists(repo, "CLAUDE.md", loaded, "Claude project adapter")
    if agent:
        add_if_exists(repo, f".github/agents/{slugify(agent)}.agent.md", loaded, "requested agent definition")

    for instruction in sorted((repo / ".github" / "instructions").glob("*.instructions.md")):
        if instruction_matches(instruction, filepath):
            add_if_exists(repo, to_posix(instruction.relative_to(repo)), loaded, "path-specific instruction")

    total_kb = round(sum(item["kb"] for item in loaded), 2)
    flags: list[str] = []
    if total_kb > 40:
        flags.append("over 40 KB .github context budget")
    if len([item for item in loaded if item["path"].endswith(".instructions.md")]) > 5:
        flags.append("more than five instruction files matched")

    return {
        "loaded_files": loaded,
        "total_kb": total_kb,
        "budget_ok": total_kb <= 40,
        "flags": flags,
    }


def add_if_exists(repo: Path, relative_path: str, loaded: list[dict[str, Any]], reason: str) -> None:
    path = repo / relative_path
    if not path.exists() or not path.is_file():
        return
    loaded.append({"path": to_posix(relative_path), "kb": round(path.stat().st_size / 1024, 2), "reason": reason})


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def instruction_matches(path: Path, filepath: str) -> bool:
    content = path.read_text(encoding="utf-8", errors="replace")
    match = re.search(r"^applyTo:\s*['\"]?([^'\"\n]+)", content, re.MULTILINE)
    if not match:
        return False
    pattern = match.group(1).strip()
    return fnmatch.fnmatch(filepath, pattern) or fnmatch.fnmatch("/" + filepath, pattern)


def redact_text(value: str) -> tuple[str, int]:
    patterns = [
        re.compile(r"sk-[A-Za-z0-9_-]{16,}"),
        re.compile(r"AKIA[0-9A-Z]{16}"),
        re.compile(r"(?i)(authorization|x-api-key|password|token|secret)\s*[:=]\s*['\"]?[^'\"\s]+"),
    ]
    redacted = value
    count = 0
    for pattern in patterns:
        redacted, replaced = pattern.subn(lambda match: f"{match.group(1) if match.groups() else 'secret'}=<redacted>", redacted)
        count += replaced
    return redacted, count


def hash_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def hash_path(path: Path) -> str:
    return hash_text(str(path.resolve()))


def read_frontmatter(path: Path) -> dict[str, str]:
    content = path.read_text(encoding="utf-8", errors="replace")
    if not content.startswith("---"):
        return {}
    end = content.find("\n---", 3)
    if end == -1:
        return {}
    data: dict[str, str] = {}
    for line in content[3:end].splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip().strip("\"'")
    return data


def detect_drift(params: dict[str, Any], default_repo: Path) -> dict[str, Any]:
    repo = resolve_repo(params.get("path") or default_repo)
    files, source, warnings = collect_files(repo)
    snapshot = repo / ".github" / ".bootstrap-snapshot.json"
    manifest = repo / ".github" / ".bootstrap-manifest.json"
    score = 0
    recommendations: list[str] = []
    if not snapshot.exists():
        score += 35
        recommendations.append("No .github/.bootstrap-snapshot.json found; run or refresh bootstrap before comparing drift.")
    if not manifest.exists():
        score += 25
        recommendations.append("No .github/.bootstrap-manifest.json found; validate retained bootstrap surface.")
    if len(files) > 2500:
        score += 15
        recommendations.append("Repository exceeds 2500 tracked files; prefer context packets before broad scans.")
    for warning in warnings:
        score += 5
        recommendations.append(warning)
    if not recommendations:
        recommendations.append("No obvious bootstrap drift signal found by the lightweight MCP check.")
    return {
        "score": min(score, 100),
        "category_scores": {
            "snapshot": 0 if snapshot.exists() else 35,
            "manifest": 0 if manifest.exists() else 25,
            "repo_size": 15 if len(files) > 2500 else 0,
            "inventory_source": source,
        },
        "recommendations": recommendations,
    }


def list_skills(params: dict[str, Any], default_repo: Path) -> dict[str, Any]:
    repo = resolve_repo(params.get("path") or default_repo)
    skills_dir = repo / ".github" / "skills"
    invocable = {
        "generate-copilot-config",
        "specify-feature",
        "generate-tasks",
        "validate-bootstrap-output",
        "context-inspector",
    }
    skills = []
    if skills_dir.exists():
        for skill_path in sorted(skills_dir.glob("*/SKILL.md")):
            meta = read_frontmatter(skill_path)
            name = meta.get("name") or skill_path.parent.name
            description = meta.get("description") or ""
            triggers = [part.strip() for part in re.split(r"[,;]", description) if part.strip()][:8]
            skills.append({
                "name": name,
                "description": description,
                "triggers": triggers,
                "invocable_via_mcp": name in invocable,
            })
    return {"skills": skills}


def validate_bootstrap_output(params: dict[str, Any], default_repo: Path) -> dict[str, Any]:
    repo = resolve_repo(params.get("path") or default_repo)
    required = [
        ".github/copilot-instructions.md",
        ".github/.bootstrap-summary.md",
        ".github/.bootstrap-manifest.json",
        ".github/.bootstrap-state.json",
        ".github/.runtime-fidelity.json",
    ]
    stale_files: list[str] = []
    generic_residue: list[str] = []
    findings: list[dict[str, str]] = []
    for relative in required:
        if not (repo / relative).exists():
            findings.append({
                "severity": "warning",
                "message": f"Missing expected bootstrap output: {relative}",
                "file": relative,
                "remediation": "Run /bootstrap-copilot or validate whether this repo intentionally omits bootstrap metadata.",
            })
    instructions = repo / ".github" / "copilot-instructions.md"
    if instructions.exists():
        text = instructions.read_text(encoding="utf-8", errors="replace").lower()
        if "copilot-bootstrap toolkit" in text and repo.name != "copilot-bootstrap":
            generic_residue.append(".github/copilot-instructions.md")
            findings.append({
                "severity": "error",
                "message": "copilot-instructions.md still appears to describe the bootstrap toolkit.",
                "file": ".github/copilot-instructions.md",
                "remediation": "Regenerate target-repo-specific instructions.",
            })
    verdict = "pass"
    if any(item["severity"] == "error" for item in findings):
        verdict = "fail"
    elif findings:
        verdict = "warn"
    return {
        "verdict": verdict,
        "stale_files": stale_files,
        "generic_residue": generic_residue,
        "findings": findings,
    }


def doctor_client_surface(params: dict[str, Any], default_repo: Path) -> dict[str, Any]:
    repo = resolve_repo(params.get("path") or default_repo)
    home = Path.home()
    candidates = [
        ("copilot-cli", home / ".copilot" / "mcp-config.json", "mcpServers"),
        ("vscode-workspace", repo / ".vscode" / "mcp.json", "servers"),
        ("claude-desktop", home / "AppData" / "Roaming" / "Claude" / "claude_desktop_config.json", "mcpServers"),
        ("cursor-workspace", repo / ".cursor" / "mcp.json", "mcpServers"),
    ]
    surfaces = []
    for name, config_path, expected_key in candidates:
        exists = config_path.exists()
        valid_json = False
        has_expected_key = False
        if exists:
            try:
                parsed = json.loads(config_path.read_text(encoding="utf-8", errors="replace"))
                valid_json = isinstance(parsed, dict)
                has_expected_key = expected_key in parsed
            except json.JSONDecodeError:
                valid_json = False
        surfaces.append({
            "surface": name,
            "path": to_posix(config_path),
            "exists": exists,
            "valid_json": valid_json,
            "expected_key": expected_key,
            "has_expected_key": has_expected_key,
            "status": "ok" if exists and valid_json and has_expected_key else "missing_or_incomplete",
        })
    return {
        "surfaces": surfaces,
        "recommendations": [
            "Copilot CLI expects mcpServers.",
            "VS Code workspace MCP expects servers.",
            "Trust/start MCP servers and enable tools in the active client after editing config.",
        ],
    }


def target_inside_repo(repo: Path, target_path: str) -> Path:
    if not target_path:
        raise ValueError("target_path is required when write=true")
    raw = Path(target_path)
    if ".." in raw.parts:
        raise ValueError("target_path must not contain '..'")
    target = raw if raw.is_absolute() else repo / raw
    resolved = target.resolve()
    try:
        resolved.relative_to(repo.resolve())
    except ValueError as exc:
        raise ValueError("target_path must stay inside --repo") from exc
    return resolved


def append_audit(repo: Path, tool: str, params: dict[str, Any], target: Path, content: str, result: str, redaction_count: int) -> None:
    audit_dir = repo / ".bootstrap-mcp"
    audit_dir.mkdir(parents=True, exist_ok=True)
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "tool": tool,
        "repoRootHash": hash_path(repo),
        "targetPath": to_posix(target.relative_to(repo)),
        "inputHash": hash_text(json.dumps(params, sort_keys=True, default=str)),
        "outputHash": hash_text(content),
        "result": result,
        "redactionCount": redaction_count,
    }
    with (audit_dir / "audit.log").open("a", encoding="utf-8") as handle:
        handle.write(f"{json.dumps(record, sort_keys=True)}\n")


def write_or_preview(tool: str, params: dict[str, Any], default_repo: Path, content: str, default_target: str, allow_write: bool) -> dict[str, Any]:
    repo = resolve_repo(params.get("path") or default_repo)
    target_path = str(params.get("target_path") or default_target)
    target = target_inside_repo(repo, target_path)
    redacted_content, redaction_count = redact_text(content)
    response = {
        "content": {
            "markdown": redacted_content,
            "json": {
                "target_path": to_posix(target.relative_to(repo)),
                "content_sha256": hash_text(redacted_content),
            },
        },
        "provenance": {
            "tool": tool,
            "tool_version": "0.1.0",
            "server_version": "0.1.0",
            "inputs_hash": hash_text(json.dumps(params, sort_keys=True, default=str)),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        "preview": {
            "target_path": to_posix(target.relative_to(repo)),
            "content_sha256": hash_text(redacted_content),
        },
        "hints": {},
    }
    if params.get("write") is not True:
        response["hints"]["write"] = "preview_only"
        return response
    if not allow_write:
        response["hints"]["write_refused"] = "--allow-write is required for write=true"
        return response
    if params.get("confirm_write") is not True:
        response["hints"]["confirm_write_required"] = True
        return response
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(redacted_content, encoding="utf-8")
    append_audit(repo, tool, params, target, redacted_content, "written", redaction_count)
    response["written_to"] = to_posix(target.relative_to(repo))
    response["hints"]["write"] = "written"
    return response


def generate_spec(params: dict[str, Any], default_repo: Path, allow_write: bool = False) -> dict[str, Any]:
    description = str(params.get("description") or "").strip()
    if len(description) < 10:
        raise ValueError("description must be at least 10 characters")
    slug = re.sub(r"[^a-z0-9]+", "-", description.lower()).strip("-")[:48] or "feature"
    content = f"""# Feature Spec: {slug}

## Description

{description}

## Acceptance Criteria

- [ ] Define observable success criteria.
- [ ] Identify affected files or modules before implementation.
- [ ] Record verification commands.

## Open Questions

- [ ] Confirm business constraints that cannot be derived from the repository.
"""
    return write_or_preview("generate_spec", params, default_repo, content, f"specs/{slug}/spec.md", allow_write)


def generate_tasks(params: dict[str, Any], default_repo: Path, allow_write: bool = False) -> dict[str, Any]:
    repo = resolve_repo(params.get("path") or default_repo)
    plan_path = str(params.get("plan_path") or "")
    plan_excerpt = ""
    if plan_path:
        plan_file = target_inside_repo(repo, plan_path)
        if plan_file.exists():
            plan_excerpt = plan_file.read_text(encoding="utf-8", errors="replace")[:1200]
    content = f"""# Implementation Tasks

## Source

{plan_path or "No plan_path supplied."}

## Tasks

- [ ] Confirm scope and acceptance criteria.
- [ ] Build the smallest implementation slice.
- [ ] Add or update focused tests.
- [ ] Run targeted verification.
- [ ] Summarize evidence and remaining gaps.

## Plan Excerpt

{plan_excerpt or "No readable plan excerpt available."}
"""
    return write_or_preview("generate_tasks", params, default_repo, content, "tasks.md", allow_write)
