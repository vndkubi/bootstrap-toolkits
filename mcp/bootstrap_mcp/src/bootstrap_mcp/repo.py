from __future__ import annotations

import fnmatch
import json
import os
import re
import subprocess
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
