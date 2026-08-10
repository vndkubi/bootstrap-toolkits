#!/usr/bin/env python3
"""Install or update the AI Engineering Team baseline without clobbering user files."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any


SOURCE_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = SOURCE_ROOT / ".ai-team" / "distribution-manifest.json"


@dataclass(frozen=True)
class Action:
    status: str
    target: str
    detail: str = ""


def read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object: {path}")
    return value


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def normalize_relative(raw: str) -> Path:
    posix = PurePosixPath(raw)
    if posix.is_absolute() or ".." in posix.parts or not posix.parts:
        raise ValueError(f"Unsafe manifest path: {raw}")
    return Path(*posix.parts)


def resolve_target(raw: str) -> Path:
    target = Path(raw).expanduser().resolve()
    if target == SOURCE_ROOT.resolve():
        raise ValueError("The installation target must not be the bootstrap source repository")
    if target == Path(target.anchor):
        raise ValueError("Refusing to install into a drive or filesystem root")
    if not target.is_dir():
        raise ValueError(f"Target directory does not exist: {target}")
    if not (target / ".git").exists():
        raise ValueError(f"Target is not a Git repository: {target}")
    return target


def load_manifest() -> dict[str, Any]:
    manifest = read_json(MANIFEST_PATH)
    for key in ("package", "version", "state_path", "conflict_root"):
        if not manifest.get(key):
            raise ValueError(f"Distribution manifest is missing {key}")
    return manifest


def expand_copy_files(manifest: dict[str, Any]) -> list[str]:
    items = set(str(item) for item in manifest.get("copy_files", []))
    for raw_root in manifest.get("copy_roots", []):
        relative_root = normalize_relative(str(raw_root))
        source_root = SOURCE_ROOT / relative_root
        if not source_root.is_dir():
            raise ValueError(f"Copy root does not exist: {raw_root}")
        for source in source_root.rglob("*"):
            if source.is_file() and "__pycache__" not in source.parts:
                items.add(source.relative_to(SOURCE_ROOT).as_posix())
    return sorted(items)


def marker_lines(marker: str) -> tuple[str, str]:
    safe = "".join(character for character in marker if character.isalnum() or character in "-_")
    if not safe or safe != marker:
        raise ValueError(f"Unsafe managed block marker: {marker}")
    return (
        f"<!-- ai-team-bootstrap:{safe}:start -->",
        f"<!-- ai-team-bootstrap:{safe}:end -->",
    )


def extract_block(text: str, start: str, end: str) -> str | None:
    start_count = text.count(start)
    end_count = text.count(end)
    if start_count == 0 and end_count == 0:
        return None
    if start_count != 1 or end_count != 1:
        raise ValueError("Managed block markers are missing or duplicated")
    before, remainder = text.split(start, 1)
    body, after = remainder.split(end, 1)
    if end in before or start in after:
        raise ValueError("Managed block markers are malformed")
    return body.strip("\r\n")


def render_block(content: str, start: str, end: str) -> str:
    return f"{start}\n{content.rstrip()}\n{end}"


def load_state(target: Path, manifest: dict[str, Any]) -> tuple[Path, dict[str, Any]]:
    state_path = target / normalize_relative(str(manifest["state_path"]))
    if state_path.exists():
        state = read_json(state_path)
        if state.get("package") != manifest["package"]:
            raise ValueError(f"Install state belongs to another package: {state_path}")
    else:
        state = {"schema_version": 1, "package": manifest["package"], "managed": {}}
    if not isinstance(state.get("managed"), dict):
        raise ValueError(f"Invalid managed file state: {state_path}")
    return state_path, state


def plan_copy(
    target: Path,
    relative: str,
    previous: dict[str, Any] | None,
) -> tuple[Action, dict[str, Any] | None, bytes | None]:
    rel_path = normalize_relative(relative)
    source = SOURCE_ROOT / rel_path
    destination = target / rel_path
    if not source.is_file():
        raise ValueError(f"Manifest source file does not exist: {relative}")
    source_bytes = source.read_bytes()
    source_hash = sha256_bytes(source_bytes)
    state_value = {"mode": "copy", "installed_hash": source_hash}
    if not destination.exists():
        return Action("CREATE", relative), state_value, source_bytes
    if not destination.is_file():
        return Action("CONFLICT", relative, "target is not a regular file"), previous, source_bytes
    current_hash = sha256_file(destination)
    if current_hash == source_hash:
        return Action("UNCHANGED", relative), state_value, None
    if previous and previous.get("mode") == "copy" and current_hash == previous.get("installed_hash"):
        return Action("UPDATE", relative), state_value, source_bytes
    return Action("CONFLICT", relative, "local content differs from the managed version"), previous, source_bytes


def plan_block(
    target: Path,
    item: dict[str, Any],
    previous: dict[str, Any] | None,
) -> tuple[Action, dict[str, Any] | None, str | None]:
    source_rel = normalize_relative(str(item["source"]))
    target_rel = normalize_relative(str(item["target"]))
    source_content = (SOURCE_ROOT / source_rel).read_text(encoding="utf-8").strip()
    source_hash = sha256_bytes(source_content.encode("utf-8"))
    start, end = marker_lines(str(item["marker"]))
    incoming = render_block(source_content, start, end) + "\n"
    destination = target / target_rel
    state_value = {"mode": "managed-block", "marker": item["marker"], "installed_hash": source_hash}
    if not destination.exists():
        return Action("CREATE", target_rel.as_posix(), "managed block"), state_value, incoming
    if not destination.is_file():
        return Action("CONFLICT", target_rel.as_posix(), "target is not a regular file"), previous, incoming
    current_text = destination.read_text(encoding="utf-8")
    try:
        current_block = extract_block(current_text, start, end)
    except ValueError as exc:
        return Action("CONFLICT", target_rel.as_posix(), str(exc)), previous, incoming
    rendered = render_block(source_content, start, end)
    if current_block is None:
        combined = current_text.rstrip() + ("\n\n" if current_text.strip() else "") + rendered + "\n"
        return Action("APPEND", target_rel.as_posix(), "managed block"), state_value, combined
    current_hash = sha256_bytes(current_block.encode("utf-8"))
    if current_hash == source_hash:
        return Action("UNCHANGED", target_rel.as_posix(), "managed block"), state_value, None
    if previous and previous.get("mode") == "managed-block" and current_hash == previous.get("installed_hash"):
        before, remainder = current_text.split(start, 1)
        _, after = remainder.split(end, 1)
        updated = before + rendered + after
        return Action("UPDATE", target_rel.as_posix(), "managed block"), state_value, updated
    return Action("CONFLICT", target_rel.as_posix(), "managed block was modified locally"), previous, incoming


def write_conflict(conflict_root: Path, relative: str, source_bytes: bytes) -> Path:
    destination = conflict_root / normalize_relative(relative)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(source_bytes)
    return destination


def install(args: argparse.Namespace) -> int:
    manifest = load_manifest()
    target = resolve_target(args.target)
    state_path, state = load_state(target, manifest)
    previous_managed: dict[str, Any] = state["managed"]
    next_managed = dict(previous_managed)
    actions: list[Action] = []
    pending_writes: list[tuple[Path, bytes | str]] = []
    conflicts: list[tuple[str, bytes]] = []

    for item in manifest.get("managed_blocks", []):
        target_key = normalize_relative(str(item["target"])).as_posix()
        action, state_value, content = plan_block(target, item, previous_managed.get(target_key))
        actions.append(action)
        if state_value is not None:
            next_managed[target_key] = state_value
        if content is not None:
            if action.status == "CONFLICT":
                conflicts.append((target_key, content.encode("utf-8")))
            else:
                pending_writes.append((target / normalize_relative(target_key), content))

    for relative in expand_copy_files(manifest):
        action, state_value, content = plan_copy(target, relative, previous_managed.get(relative))
        actions.append(action)
        if state_value is not None:
            next_managed[relative] = state_value
        if content is not None:
            if action.status == "CONFLICT":
                conflicts.append((relative, content))
            else:
                pending_writes.append((target / normalize_relative(relative), content))

    for action in actions:
        suffix = f" - {action.detail}" if action.detail else ""
        print(f"{action.status:9} {action.target}{suffix}")

    counts = {status: sum(action.status == status for action in actions) for status in ("CREATE", "APPEND", "UPDATE", "UNCHANGED", "CONFLICT")}
    print("Summary: " + ", ".join(f"{key.lower()}={value}" for key, value in counts.items()))
    if args.command == "plan":
        return 2 if counts["CONFLICT"] else 0

    for destination, content in pending_writes:
        destination.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(content, bytes):
            destination.write_bytes(content)
        else:
            destination.write_text(content, encoding="utf-8")

    conflict_paths: list[Path] = []
    if conflicts:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        root = target / normalize_relative(str(manifest["conflict_root"])) / stamp
        for relative, content in conflicts:
            conflict_paths.append(write_conflict(root, relative + ".incoming", content))

    state_changed = (
        not state_path.exists()
        or state.get("package_version") != manifest["version"]
        or state.get("managed") != next_managed
        or any(counts[name] for name in ("CREATE", "APPEND", "UPDATE"))
    )
    if state_changed:
        timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        state.update({
            "schema_version": 1,
            "package": manifest["package"],
            "package_version": manifest["version"],
            "source_version": manifest["version"],
            "installed_at": state.get("installed_at") or timestamp,
            "updated_at": timestamp,
            "managed": next_managed,
        })
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Install state: {state_path}")
    else:
        print(f"Install state unchanged: {state_path}")
    for path in conflict_paths:
        print(f"Incoming conflict copy: {path}")
    if conflicts:
        print("INSTALL COMPLETED WITH CONFLICTS; existing local files were preserved")
        return 2
    print("INSTALL COMPLETED")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    for name, help_text in (
        ("plan", "Show what would be installed or updated without writing"),
        ("install", "Install or safely update the baseline"),
    ):
        command = subparsers.add_parser(name, help=help_text)
        command.add_argument("--target", required=True, help="Existing Git repository to receive the baseline")
        command.set_defaults(handler=install)
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
