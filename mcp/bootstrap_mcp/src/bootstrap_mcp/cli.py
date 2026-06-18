from __future__ import annotations

import argparse
import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from bootstrap_mcp.server import run_stdio
    from bootstrap_mcp import __version__
else:
    from . import __version__
    from .server import run_stdio


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="bootstrap-mcp")
    parser.add_argument("--stdio", action="store_true", help="Run stdio JSON-RPC transport. This is the default.")
    parser.add_argument("--repo", default=".", help="Default repository path for tool calls.")
    parser.add_argument("--allow-write", action="store_true", help="Reserved for future generate tools; ignored by read-only M1 tools.")
    parser.add_argument("--version", action="store_true", help="Print version and exit.")
    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.version:
        print(__version__)
        return

    repo = Path(args.repo).resolve()
    run_stdio(repo_root=repo, allow_write=args.allow_write)


if __name__ == "__main__":
    main()
