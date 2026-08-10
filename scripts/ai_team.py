#!/usr/bin/env python3
"""Dependency-free utilities for the AI Engineering Team baseline."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import uuid
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import tomllib
except ModuleNotFoundError:  # pragma: no cover - Python < 3.11
    tomllib = None


REPO_ROOT = Path(__file__).resolve().parents[1]
AI_TEAM = REPO_ROOT / ".ai-team"
SKILL_NAMES = (
    "pbi-discovery",
    "impact-analysis",
    "environment-bootstrap",
    "code-review",
    "review-learning",
    "retrospective",
)
CODEX_AGENTS = ("scout", "quality-lead", "developer", "reviewer", "review-learner", "retrospective")
COPILOT_AGENTS = ("orchestrator", "discovery", "developer", "reviewer", "review-learner", "retrospective")
MARKER_RE = re.compile(r"\{\{([A-Z][A-Z0-9_]*)\}\}")


def read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object: {path}")
    return value


def parse_frontmatter(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise ValueError(f"Missing YAML frontmatter: {path}")
    try:
        end = next(index for index in range(1, len(lines)) if lines[index].strip() == "---")
    except StopIteration as exc:
        raise ValueError(f"Unclosed YAML frontmatter: {path}") from exc

    metadata: dict[str, str] = {}
    for line in lines[1:end]:
        if not line.strip():
            continue
        if ":" not in line:
            raise ValueError(f"Unsupported frontmatter line in {path}: {line}")
        key, value = line.split(":", 1)
        metadata[key.strip()] = value.strip().strip('"').strip("'")
    return metadata


def validate() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    required_files = [
        REPO_ROOT / "README.md",
        REPO_ROOT / "AGENTS.md",
        REPO_ROOT / ".github" / "copilot-instructions.md",
        REPO_ROOT / ".codex" / "config.toml",
        AI_TEAM / "model-policy.json",
        AI_TEAM / "distribution-manifest.json",
        AI_TEAM / "PROJECT-GUIDE.md",
        AI_TEAM / "schemas" / "model-policy.schema.json",
        AI_TEAM / "schemas" / "eval-case.schema.json",
        AI_TEAM / "schemas" / "trace.schema.json",
        AI_TEAM / "schemas" / "benchmark-result.schema.json",
        AI_TEAM / "schemas" / "review-capture.schema.json",
        AI_TEAM / "schemas" / "template-catalog.schema.json",
        AI_TEAM / "benchmarks" / "manifest.json",
        AI_TEAM / "traces" / "example.trace.json",
        AI_TEAM / "protocols" / "model-neutral-execution.md",
        AI_TEAM / "templates" / "catalog.json",
        AI_TEAM / "templates" / "task-contract.md",
        AI_TEAM / "templates" / "retrospective.md",
        AI_TEAM / "templates" / "improvement-proposal.md",
        AI_TEAM / "business" / "README.md",
        AI_TEAM / "review-knowledge" / "README.md",
        REPO_ROOT / "scripts" / "install_ai_team.py",
    ]
    for path in required_files:
        if not path.is_file():
            errors.append(f"Missing required file: {path.relative_to(REPO_ROOT)}")

    for skill_name in SKILL_NAMES:
        skill_dir = REPO_ROOT / ".agents" / "skills" / skill_name
        skill_file = skill_dir / "SKILL.md"
        metadata_file = skill_dir / "agents" / "openai.yaml"
        if not skill_file.is_file():
            errors.append(f"Missing skill: {skill_name}/SKILL.md")
            continue
        try:
            metadata = parse_frontmatter(skill_file)
            if metadata.get("name") != skill_name:
                errors.append(f"Skill name mismatch in {skill_file.relative_to(REPO_ROOT)}")
            if len(metadata.get("description", "")) < 50:
                errors.append(f"Skill description is too weak: {skill_name}")
            extra = set(metadata) - {"name", "description"}
            if extra:
                errors.append(f"Unsupported skill frontmatter fields in {skill_name}: {sorted(extra)}")
            if "TODO" in skill_file.read_text(encoding="utf-8"):
                errors.append(f"Unresolved TODO in skill: {skill_name}")
        except (OSError, ValueError) as exc:
            errors.append(str(exc))
        if not metadata_file.is_file():
            errors.append(f"Missing OpenAI skill metadata: {skill_name}/agents/openai.yaml")
        else:
            metadata_text = metadata_file.read_text(encoding="utf-8")
            if f"${skill_name}" not in metadata_text:
                errors.append(f"Skill default prompt does not mention ${skill_name}")

    for agent_name in COPILOT_AGENTS:
        path = REPO_ROOT / ".github" / "agents" / f"{agent_name}.agent.md"
        if not path.is_file():
            errors.append(f"Missing Copilot agent: {agent_name}")
            continue
        try:
            metadata = parse_frontmatter(path)
            if not metadata.get("description"):
                errors.append(f"Copilot agent has no description: {agent_name}")
            if "model" in metadata:
                errors.append(f"Copilot role hard-codes a model instead of inheriting it: {agent_name}")
        except (OSError, ValueError) as exc:
            errors.append(str(exc))

    if tomllib is None:
        warnings.append("Python < 3.11: TOML syntax was not validated.")
    else:
        for path in [REPO_ROOT / ".codex" / "config.toml"] + [
            REPO_ROOT / ".codex" / "agents" / f"{name}.toml" for name in CODEX_AGENTS
        ]:
            if not path.is_file():
                errors.append(f"Missing Codex config: {path.relative_to(REPO_ROOT)}")
                continue
            try:
                with path.open("rb") as handle:
                    data = tomllib.load(handle)
                if path.parent.name == "agents":
                    for key in ("name", "description", "developer_instructions"):
                        if not data.get(key):
                            errors.append(f"Codex agent {path.name} lacks {key}")
                    if "model" in data or "model_reasoning_effort" in data:
                        errors.append(f"Codex role hard-codes a model instead of inheriting it: {path.name}")
            except (OSError, ValueError) as exc:
                errors.append(f"Invalid TOML {path.relative_to(REPO_ROOT)}: {exc}")

    json_files = sorted(AI_TEAM.rglob("*.json"))
    parsed: dict[Path, dict[str, Any]] = {}
    for path in json_files:
        try:
            parsed[path] = read_json(path)
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            errors.append(f"Invalid JSON {path.relative_to(REPO_ROOT)}: {exc}")

    policy_path = AI_TEAM / "model-policy.json"
    policy = parsed.get(policy_path)
    if policy:
        model_selection = policy.get("model_selection", {})
        if model_selection.get("allow_any_model") is not True or model_selection.get("default_model") != "inherit":
            errors.append("Model policy must allow any user-selected model and default to inherit")
        reference_models = {
            item.get("model") for item in model_selection.get("reference_compatibility_models", [])
        }
        for required_model in ("deepseek-v4-flash", "gpt-5.6-luna"):
            if required_model not in reference_models:
                errors.append(f"Missing reference compatibility model: {required_model}")
        execution_profiles = policy.get("execution_profiles", {})
        for profile_name in ("compatibility-strict", "standard", "high-autonomy"):
            if profile_name not in execution_profiles:
                errors.append(f"Missing execution profile: {profile_name}")
        for route in policy.get("routes", []):
            if route.get("execution_profile") not in execution_profiles:
                errors.append(f"Route {route.get('id')} points to an unknown execution profile")

    catalog_path = AI_TEAM / "templates" / "catalog.json"
    catalog = parsed.get(catalog_path)
    template_ids: set[str] = set()
    if catalog:
        if catalog.get("schema_version") != 1 or not catalog.get("catalog_version"):
            errors.append("Template catalog must declare schema_version 1 and catalog_version")
        for item in catalog.get("templates", []):
            required = {"id", "path", "phase", "owner_role", "description", "default_output", "required_markers"}
            missing = required - set(item)
            if missing:
                errors.append(f"Template catalog entry lacks fields: {sorted(missing)}")
                continue
            template_id = item["id"]
            if template_id in template_ids:
                errors.append(f"Duplicate template id: {template_id}")
            template_ids.add(template_id)
            if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", template_id):
                errors.append(f"Invalid template id: {template_id}")
            relative = Path(item["path"])
            if relative.is_absolute() or ".." in relative.parts:
                errors.append(f"Unsafe template path: {item['path']}")
                continue
            template_path = AI_TEAM / "templates" / relative
            if not template_path.is_file():
                errors.append(f"Template file does not exist: {item['path']}")
                continue
            text = template_path.read_text(encoding="utf-8")
            markers = set(MARKER_RE.findall(text))
            for marker in item["required_markers"]:
                if marker not in markers:
                    errors.append(f"Template {template_id} is missing required marker {marker}")
            output = Path(item["default_output"])
            if output.is_absolute() or ".." in output.parts:
                errors.append(f"Unsafe default output for template {template_id}")

    distribution_path = AI_TEAM / "distribution-manifest.json"
    distribution = parsed.get(distribution_path)
    if distribution:
        for key in ("package", "version", "state_path", "conflict_root"):
            if not distribution.get(key):
                errors.append(f"Distribution manifest is missing {key}")
        for raw in distribution.get("copy_files", []):
            relative = Path(raw)
            if relative.is_absolute() or ".." in relative.parts or not (REPO_ROOT / relative).is_file():
                errors.append(f"Invalid distribution file: {raw}")
        for raw in distribution.get("copy_roots", []):
            relative = Path(raw)
            if relative.is_absolute() or ".." in relative.parts or not (REPO_ROOT / relative).is_dir():
                errors.append(f"Invalid distribution root: {raw}")
        for item in distribution.get("managed_blocks", []):
            source = Path(str(item.get("source", "")))
            target = Path(str(item.get("target", "")))
            if source.is_absolute() or target.is_absolute() or ".." in source.parts or ".." in target.parts:
                errors.append(f"Unsafe managed block entry: {item}")
            elif not (REPO_ROOT / source).is_file() or not item.get("marker"):
                errors.append(f"Invalid managed block entry: {item}")

    eval_dir = AI_TEAM / "evals" / "cases"
    eval_ids: set[str] = set()
    for path in sorted(eval_dir.glob("*.json")):
        case = parsed.get(path)
        if not case:
            continue
        missing = set(("id", "version", "skill", "objective", "input", "expected", "graders", "origin", "tags")) - set(case)
        if missing:
            errors.append(f"Eval {path.name} lacks fields: {sorted(missing)}")
            continue
        if case["id"] != path.stem:
            errors.append(f"Eval id and filename differ: {path.name}")
        if case["id"] in eval_ids:
            errors.append(f"Duplicate eval id: {case['id']}")
        eval_ids.add(case["id"])
        if case["skill"] not in SKILL_NAMES:
            errors.append(f"Eval references unknown skill: {case['skill']}")
        weight = sum(float(grader.get("weight", 0)) for grader in case.get("graders", []))
        if abs(weight - 1.0) > 0.0001:
            errors.append(f"Eval grader weights must total 1.0: {case['id']} (got {weight})")

    manifest_path = AI_TEAM / "benchmarks" / "manifest.json"
    manifest = parsed.get(manifest_path)
    if manifest:
        if policy and manifest.get("suite_id") != policy.get("qualification", {}).get("required_eval_suite"):
            errors.append("Benchmark suite id does not match the model qualification policy")
        for raw_ref in manifest.get("eval_cases", []):
            ref = (manifest_path.parent / raw_ref).resolve()
            if not ref.is_file():
                errors.append(f"Benchmark manifest references missing eval: {raw_ref}")

    example_result = parsed.get(AI_TEAM / "benchmarks" / "results" / "example.result.json")
    if example_result:
        if example_result.get("measured") is not False:
            errors.append("Example benchmark result must remain explicitly unmeasured")
        if manifest and example_result.get("suite_id") != manifest.get("suite_id"):
            errors.append("Example benchmark result suite does not match the manifest")
        if manifest:
            expected_result_ids = {
                read_json((manifest_path.parent / raw_ref).resolve())["id"] for raw_ref in manifest.get("eval_cases", [])
            }
            actual_result_ids = {
                item.get("eval_id")
                for candidate in example_result.get("candidates", [])
                for item in candidate.get("eval_results", [])
            }
            if actual_result_ids != expected_result_ids:
                errors.append("Example benchmark result must contain exactly the manifest eval cases")

    print(f"Repository: {REPO_ROOT}")
    print(f"Skills: {len(SKILL_NAMES)} | Templates: {len(template_ids)} | Eval cases: {len(eval_ids)} | JSON artifacts: {len(json_files)}")
    for warning in warnings:
        print(f"[WARN] {warning}")
    if errors:
        for error in errors:
            print(f"[ERROR] {error}")
        print(f"VALIDATION FAILED ({len(errors)} error(s))")
        return 1
    print("VALIDATION PASSED")
    return 0


def route(args: argparse.Namespace) -> int:
    policy = read_json(AI_TEAM / "model-policy.json")
    facts = {
        "public_api_change": args.public_api_change,
        "schema_change": args.schema_change,
        "security_sensitive": args.security_sensitive,
        "multi_repo_change": args.multi_repo_change,
        "ambiguous_acceptance": args.ambiguous_acceptance,
    }
    routes = sorted(policy["routes"], key=lambda item: item["priority"], reverse=True)
    selected: dict[str, Any] | None = None
    for candidate in routes:
        condition = candidate.get("when", {})
        checks: list[bool] = []
        if "task_kind_in" in condition:
            checks.append(args.task_kind in condition["task_kind_in"])
        if "any_true" in condition:
            checks.append(any(facts.get(name, False) for name in condition["any_true"]))
        if "qualification_in" in condition:
            checks.append(args.qualification in condition["qualification_in"])
        match_mode = candidate.get("match", "all")
        matches = (any(checks) if match_mode == "any" else all(checks)) if checks else True
        if matches:
            selected = candidate
            break
    if selected is None:
        raise RuntimeError("No execution route matched and no default route exists")

    result = {
        "route_id": selected["id"],
        "requested_model": args.model,
        "model_qualification": args.qualification,
        "execution_profile": selected["execution_profile"],
        "task_kind": args.task_kind,
        "risk_flags": [name for name, active in facts.items() if active],
        "protocol": ".ai-team/protocols/model-neutral-execution.md",
        "note": "This command selects guardrails, not a model. Record the actual model and any fallback in the task trace.",
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


def read_template_catalog() -> dict[str, Any]:
    return read_json(AI_TEAM / "templates" / "catalog.json")


def template_by_id(template_id: str) -> dict[str, Any]:
    for item in read_template_catalog().get("templates", []):
        if item.get("id") == template_id:
            return item
    available = ", ".join(item["id"] for item in read_template_catalog().get("templates", []))
    raise ValueError(f"Unknown template {template_id!r}. Available: {available}")


def parse_template_values(args: argparse.Namespace) -> dict[str, str]:
    values = {
        "ID": args.id,
        "TITLE": args.title,
        "OWNER": args.owner,
        "DATE": datetime.now(timezone.utc).date().isoformat(),
        "CAPABILITY": args.capability,
        "SOURCE": args.source,
    }
    for raw in args.set_values:
        if "=" not in raw:
            raise ValueError(f"Template value must use KEY=VALUE: {raw}")
        key, value = raw.split("=", 1)
        key = key.strip().upper()
        if not re.fullmatch(r"[A-Z][A-Z0-9_]*", key):
            raise ValueError(f"Invalid template marker name: {key}")
        values[key] = value
    return values


def safe_path_value(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip(".-")
    return cleaned or "UNKNOWN"


def render_template(template_id: str, values: dict[str, str]) -> tuple[dict[str, Any], str, str]:
    item = template_by_id(template_id)
    template_path = AI_TEAM / "templates" / Path(item["path"])
    content = template_path.read_text(encoding="utf-8")
    for key, value in values.items():
        content = content.replace("{{" + key + "}}", value)

    output_pattern = item["default_output"]
    path_values = {key: safe_path_value(value) for key, value in values.items()}
    for key, value in path_values.items():
        output_pattern = output_pattern.replace("{{" + key + "}}", value)
    unresolved_output = sorted(set(MARKER_RE.findall(output_pattern)))
    if unresolved_output:
        raise ValueError(f"Default output still needs values: {', '.join(unresolved_output)}")
    return item, content, output_pattern


def list_templates(_: argparse.Namespace) -> int:
    catalog = read_template_catalog()
    print(f"Template catalog {catalog['catalog_version']} ({len(catalog['templates'])} templates)")
    for item in catalog["templates"]:
        print(f"{item['id']:28} {item['phase']:20} {item['description']}")
    return 0


def new_artifact(args: argparse.Namespace) -> int:
    values = parse_template_values(args)
    item, content, default_output = render_template(args.template, values)
    output = Path(args.output) if args.output else REPO_ROOT / Path(default_output)
    if not output.is_absolute():
        output = REPO_ROOT / output
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite existing artifact: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(content, encoding="utf-8")
    unresolved = sorted(set(MARKER_RE.findall(content)))
    print(output)
    print(f"Template: {item['id']} | remaining draft markers: {', '.join(unresolved) if unresolved else 'none'}")
    return 0


def new_trace(args: argparse.Namespace) -> int:
    now = datetime.now(timezone.utc)
    trace_id = f"TRACE-{now:%Y%m%d}-{uuid.uuid4().hex[:8].upper()}"
    output = Path(args.output) if args.output else AI_TEAM / "traces" / f"{trace_id}.json"
    if not output.is_absolute():
        output = REPO_ROOT / output
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite existing trace: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    trace = {
        "$schema": "../schemas/trace.schema.json",
        "schema_version": 2,
        "trace_id": trace_id,
        "task_id": args.task_id,
        "started_at": now.isoformat().replace("+00:00", "Z"),
        "completed_at": None,
        "role": args.role,
        "requested_model": args.model,
        "model_qualification": args.qualification,
        "execution_profile": args.execution_profile,
        "actual_model": args.actual_model,
        "fallback_reason": None,
        "skills": args.skills,
        "acceptance_ids": args.acceptance_ids,
        "evidence": [],
        "decisions": [],
        "token_usage": {"input": None, "output": None, "reasoning": None},
        "latency_ms": None,
        "human_corrections": None,
        "outcome": {"status": "started", "summary": "", "verification": []},
    }
    output.write_text(json.dumps(trace, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(output)
    return 0


def new_improvement(args: argparse.Namespace) -> int:
    if not re.fullmatch(r"IMPROVEMENT-[0-9]{4,}", args.id):
        raise ValueError("Improvement id must match IMPROVEMENT-0001")
    output = AI_TEAM / "improvement-backlog" / f"{args.id}.md"
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite existing proposal: {output}")
    template = (AI_TEAM / "templates" / "improvement-proposal.md").read_text(encoding="utf-8")
    replacements = {
        "{{ID}}": args.id,
        "{{TITLE}}": args.title,
        "{{OWNER}}": args.owner,
        "{{DATE}}": datetime.now(timezone.utc).date().isoformat(),
        "{{TARGET_ARTIFACT}}": args.target,
    }
    for marker, value in replacements.items():
        template = template.replace(marker, value)
    output.write_text(template, encoding="utf-8")
    print(output)
    return 0


def new_benchmark(args: argparse.Namespace) -> int:
    now = datetime.now(timezone.utc)
    run_id = f"BENCH-{now:%Y%m%d}-{uuid.uuid4().hex[:8].upper()}"
    output = Path(args.output) if args.output else AI_TEAM / "benchmarks" / "results" / f"{run_id}.json"
    if not output.is_absolute():
        output = REPO_ROOT / output
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite existing benchmark scaffold: {output}")

    manifest_path = AI_TEAM / "benchmarks" / "manifest.json"
    manifest = read_json(manifest_path)
    eval_results = []
    for raw_ref in manifest["eval_cases"]:
        case = read_json((manifest_path.parent / raw_ref).resolve())
        eval_results.append({
            "eval_id": case["id"],
            "outcome_score": None,
            "critical_failure": None,
            "human_corrections": None,
            "latency_ms": None,
            "input_tokens": None,
            "output_tokens": None,
            "cost_usd": None,
            "notes": "Not measured.",
        })

    result = {
        "$schema": "../../schemas/benchmark-result.schema.json",
        "schema_version": 2,
        "run_id": run_id,
        "suite_id": manifest["suite_id"],
        "created_at": now.isoformat().replace("+00:00", "Z"),
        "measured": False,
        "candidates": [{
            "execution_profile": args.execution_profile,
            "provider": args.provider,
            "model": args.model,
            "reasoning": args.reasoning,
            "toolset": args.toolset,
            "skill_version": args.skill_version,
            "eval_results": eval_results,
        }],
        "decision": {
            "status": "needs-more-evidence",
            "reason": "Benchmark scaffold created; populate measured results before qualification.",
            "approved_by": None,
        },
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(output)
    return 0


def github_request(api_base: str, endpoint: str, params: dict[str, Any] | None = None) -> Any:
    query = urllib.parse.urlencode(params or {}, doseq=True)
    url = api_base.rstrip("/") + "/" + endpoint.lstrip("/")
    if query:
        url += "?" + query
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "ai-engineering-team-review-learning",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            message = json.loads(body).get("message", body)
        except json.JSONDecodeError:
            message = body
        auth_hint = " Set GH_TOKEN or GITHUB_TOKEN for private repositories or higher rate limits." if exc.code in (401, 403, 404) else ""
        raise RuntimeError(f"GitHub API {exc.code} for {endpoint}: {message}.{auth_hint}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"GitHub API request failed for {endpoint}: {exc.reason}") from exc


def github_list(api_base: str, endpoint: str, limit: int = 500) -> list[dict[str, Any]]:
    collected: list[dict[str, Any]] = []
    page = 1
    while len(collected) < limit:
        value = github_request(api_base, endpoint, {"per_page": min(100, limit - len(collected)), "page": page})
        if not isinstance(value, list):
            raise RuntimeError(f"Expected a list from GitHub API endpoint {endpoint}")
        collected.extend(item for item in value if isinstance(item, dict))
        if len(value) < 100:
            break
        page += 1
    return collected[:limit]


def parse_repo(raw: str) -> tuple[str, str]:
    match = re.fullmatch(r"([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)", raw.strip())
    if not match:
        raise ValueError("Repository must use owner/name")
    return match.group(1), match.group(2).removesuffix(".git")


def parse_pr_reference(raw: str, fallback_repo: str | None) -> tuple[str, str, int]:
    value = raw.strip()
    match = re.fullmatch(r"https?://[^/]+/([^/]+)/([^/]+)/pull/(\d+)(?:[/?#].*)?", value)
    if not match:
        match = re.fullmatch(r"([^/]+)/([^/#]+)(?:/pull/|#)(\d+)", value)
    if match:
        return match.group(1), match.group(2).removesuffix(".git"), int(match.group(3))
    if value.isdigit() and fallback_repo:
        owner, repository = parse_repo(fallback_repo)
        return owner, repository, int(value)
    raise ValueError(f"PR must be a URL, owner/repository#number, or a number with --repo: {raw}")


def clipped(value: Any, limit: int = 6000) -> str:
    text = "" if value is None else str(value)
    return text if len(text) <= limit else text[:limit] + "\n[truncated by capture tool]"


def login_of(item: dict[str, Any]) -> str | None:
    user = item.get("user")
    return user.get("login") if isinstance(user, dict) else None


def compact_review(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "reviewer": login_of(item),
        "state": item.get("state"),
        "submitted_at": item.get("submitted_at"),
        "commit_id": item.get("commit_id"),
        "url": item.get("html_url"),
        "body": clipped(item.get("body")),
    }


def compact_review_comment(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "reviewer": login_of(item),
        "path": item.get("path"),
        "line": item.get("line") or item.get("original_line"),
        "side": item.get("side") or item.get("original_side"),
        "created_at": item.get("created_at"),
        "url": item.get("html_url"),
        "body": clipped(item.get("body")),
        "diff_hunk": clipped(item.get("diff_hunk"), 4000),
    }


def compact_conversation_comment(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "author": login_of(item),
        "created_at": item.get("created_at"),
        "url": item.get("html_url"),
        "body": clipped(item.get("body")),
    }


def collect_pull_request(api_base: str, owner: str, repository: str, number: int, reviewer: str | None) -> dict[str, Any]:
    prefix = f"repos/{owner}/{repository}"
    pull = github_request(api_base, f"{prefix}/pulls/{number}")
    if not isinstance(pull, dict):
        raise RuntimeError(f"Unexpected pull request response for {owner}/{repository}#{number}")
    reviews = github_list(api_base, f"{prefix}/pulls/{number}/reviews")
    review_comments = github_list(api_base, f"{prefix}/pulls/{number}/comments")
    conversation = github_list(api_base, f"{prefix}/issues/{number}/comments")
    if reviewer:
        expected = reviewer.casefold()
        reviews = [item for item in reviews if (login_of(item) or "").casefold() == expected]
        review_comments = [item for item in review_comments if (login_of(item) or "").casefold() == expected]
        conversation = [item for item in conversation if (login_of(item) or "").casefold() == expected]
    return {
        "repository": f"{owner}/{repository}",
        "number": number,
        "url": pull.get("html_url"),
        "title": pull.get("title"),
        "state": pull.get("state"),
        "merged_at": pull.get("merged_at"),
        "author": login_of(pull),
        "base": (pull.get("base") or {}).get("ref"),
        "head": (pull.get("head") or {}).get("ref"),
        "reviews": [compact_review(item) for item in reviews],
        "review_comments": [compact_review_comment(item) for item in review_comments],
        "conversation_comments": [compact_conversation_comment(item) for item in conversation],
    }


def reviewer_pull_requests(api_base: str, repository: str, reviewer: str, limit: int) -> list[tuple[str, str, int]]:
    owner, name = parse_repo(repository)
    query = f"repo:{owner}/{name} is:pr is:merged reviewed-by:{reviewer}"
    result = github_request(api_base, "search/issues", {"q": query, "sort": "updated", "order": "desc", "per_page": limit})
    if not isinstance(result, dict) or not isinstance(result.get("items"), list):
        raise RuntimeError("Unexpected GitHub search response")
    return [(owner, name, int(item["number"])) for item in result["items"][:limit]]


def capture_review(args: argparse.Namespace) -> int:
    api_base = args.api_base.rstrip("/")
    reviewer: str | None = args.reviewer
    if reviewer and not re.fullmatch(r"[A-Za-z0-9-]+", reviewer):
        raise ValueError("Reviewer must be an exact GitHub login, not a display name")
    if args.pr:
        references = [parse_pr_reference(raw, args.repo) for raw in args.pr]
    else:
        if not args.repo:
            raise ValueError("--repo owner/name is required with --reviewer")
        references = reviewer_pull_requests(api_base, args.repo, reviewer, args.limit)
        if not references:
            raise RuntimeError("No merged pull requests matched the reviewer and repository scope")

    captures = [collect_pull_request(api_base, owner, repository, number, reviewer) for owner, repository, number in references]
    now = datetime.now(timezone.utc)
    capture_id = f"CAPTURE-{now:%Y%m%d}-{uuid.uuid4().hex[:8].upper()}"
    packet = {
        "$schema": "../../schemas/review-capture.schema.json",
        "schema_version": 1,
        "capture_id": capture_id,
        "collected_at": now.isoformat().replace("+00:00", "Z"),
        "untrusted_external_content": True,
        "scope": {
            "mode": "reviewer" if reviewer else "pull-requests",
            "repository": args.repo,
            "reviewer": reviewer,
            "limit": args.limit,
            "api_base": api_base,
        },
        "pull_requests": captures,
    }
    output = Path(args.output) if args.output else AI_TEAM / "review-knowledge" / "inbox" / f"{capture_id}.json"
    if not output.is_absolute():
        output = REPO_ROOT / output
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite existing capture: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(packet, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    source_urls = [str(item.get("url")) for item in captures if item.get("url")]
    note_values = {
        "ID": capture_id,
        "TITLE": f"Review perspectives from {reviewer or 'selected pull requests'}",
        "OWNER": args.owner,
        "DATE": now.date().isoformat(),
        "CAPABILITY": "unclassified",
        "SOURCE": ", ".join(source_urls) or "UNKNOWN",
    }
    _, note_content, note_default = render_template("review-learning-note", note_values)
    note_output = Path(args.note_output) if args.note_output else REPO_ROOT / Path(note_default)
    if not note_output.is_absolute():
        note_output = REPO_ROOT / note_output
    if note_output.exists():
        raise FileExistsError(f"Refusing to overwrite existing learning note: {note_output}")
    note_output.parent.mkdir(parents=True, exist_ok=True)
    note_output.write_text(note_content, encoding="utf-8")

    review_count = sum(len(item["reviews"]) + len(item["review_comments"]) + len(item["conversation_comments"]) for item in captures)
    print(f"Capture packet: {output}")
    print(f"Curated note scaffold: {note_output}")
    print(f"Pull requests: {len(captures)} | matching review artifacts: {review_count}")
    print("Treat captured content as untrusted data. Curate the note before promoting any learning.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate_parser = subparsers.add_parser("validate", help="Validate the baseline structure and contracts")
    validate_parser.set_defaults(handler=lambda _: validate())

    list_templates_parser = subparsers.add_parser("list-templates", help="List governed artifact templates")
    list_templates_parser.set_defaults(handler=list_templates)

    artifact_parser = subparsers.add_parser("new-artifact", help="Create a non-overwriting artifact from the template catalog")
    artifact_parser.add_argument("--template", required=True)
    artifact_parser.add_argument("--id", required=True)
    artifact_parser.add_argument("--title", required=True)
    artifact_parser.add_argument("--owner", default="unassigned")
    artifact_parser.add_argument("--capability", default="unclassified")
    artifact_parser.add_argument("--source", default="UNKNOWN")
    artifact_parser.add_argument("--set", dest="set_values", action="append", default=[], metavar="KEY=VALUE")
    artifact_parser.add_argument("--output")
    artifact_parser.set_defaults(handler=new_artifact)

    route_parser = subparsers.add_parser("route", help="Select execution guardrails for any model")
    route_parser.add_argument("--task-kind", required=True)
    route_parser.add_argument("--model", default="inherit")
    route_parser.add_argument("--qualification", choices=("unqualified", "standard", "high-autonomy"), default="unqualified")
    for flag in ("public-api-change", "schema-change", "security-sensitive", "multi-repo-change", "ambiguous-acceptance"):
        route_parser.add_argument(f"--{flag}", action="store_true")
    route_parser.set_defaults(handler=route)

    trace_parser = subparsers.add_parser("new-trace", help="Create a non-overwriting task trace scaffold")
    trace_parser.add_argument("--task-id", required=True)
    trace_parser.add_argument("--role", required=True)
    trace_parser.add_argument("--model", default="inherit")
    trace_parser.add_argument("--qualification", choices=("unqualified", "standard", "high-autonomy"), default="unqualified")
    trace_parser.add_argument("--execution-profile", choices=("compatibility-strict", "standard", "high-autonomy"), default="compatibility-strict")
    trace_parser.add_argument("--actual-model")
    trace_parser.add_argument("--skills", nargs="*", default=[])
    trace_parser.add_argument("--acceptance-ids", nargs="*", default=[])
    trace_parser.add_argument("--output")
    trace_parser.set_defaults(handler=new_trace)

    improvement_parser = subparsers.add_parser("new-improvement", help="Create a proposal from the template")
    improvement_parser.add_argument("--id", required=True)
    improvement_parser.add_argument("--title", required=True)
    improvement_parser.add_argument("--owner", default="unassigned")
    improvement_parser.add_argument("--target", default="UNKNOWN")
    improvement_parser.set_defaults(handler=new_improvement)

    benchmark_parser = subparsers.add_parser("new-benchmark", help="Create a same-corpus benchmark scaffold for any model")
    benchmark_parser.add_argument("--provider", required=True)
    benchmark_parser.add_argument("--model", required=True)
    benchmark_parser.add_argument("--reasoning", default="provider-default")
    benchmark_parser.add_argument("--execution-profile", choices=("compatibility-strict", "standard", "high-autonomy"), default="compatibility-strict")
    benchmark_parser.add_argument("--toolset", nargs="*", default=[])
    benchmark_parser.add_argument("--skill-version", default="baseline-v3")
    benchmark_parser.add_argument("--output")
    benchmark_parser.set_defaults(handler=new_benchmark)

    capture_parser = subparsers.add_parser("capture-review", help="Collect bounded GitHub review evidence and create a learning-note scaffold")
    source_group = capture_parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument("--pr", action="append", help="PR URL, owner/repository#number, or number with --repo; repeatable")
    source_group.add_argument("--reviewer", help="Exact GitHub login; requires --repo")
    capture_parser.add_argument("--repo", help="Repository scope as owner/name")
    capture_parser.add_argument("--limit", type=int, choices=range(1, 51), default=10, metavar="1-50")
    capture_parser.add_argument("--owner", default="unassigned", help="Owner of the curated learning note")
    capture_parser.add_argument("--api-base", default="https://api.github.com")
    capture_parser.add_argument("--output", help="Raw capture packet path")
    capture_parser.add_argument("--note-output", help="Curated learning-note scaffold path")
    capture_parser.set_defaults(handler=capture_review)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        return int(args.handler(args))
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
