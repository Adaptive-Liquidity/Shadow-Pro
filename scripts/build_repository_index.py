#!/usr/bin/env python3
"""Static repository intelligence and change-impact reporting for Shadow-Pro.

The generator reads tracked source/configuration files only. It never executes
project code or enables external integrations. Findings are heuristics unless a
source review marks them verified.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
import tomllib
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / ".manus" / "index" / "repository_index.json"

RUST_SYMBOL = re.compile(r"^\s*(?:pub\s+)?(?:(?:async\s+)?fn|struct|enum|mod|trait)\s+([A-Za-z_][A-Za-z0-9_]*)")
TS_SYMBOL = re.compile(r"^\s*(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const)\s+([A-Za-z_][A-Za-z0-9_]*)")
RUST_TEST = re.compile(r"^\s*#\[test\]|^\s*fn\s+([A-Za-z_][A-Za-z0-9_]*)")
TS_TEST = re.compile(r"\b(?:describe|it|test)\(\s*['\"]([^'\"]+)")
ACCOUNT_STRUCT = re.compile(r"^\s*pub\s+struct\s+([A-Za-z_][A-Za-z0-9_]*)<'info>")
PDA_SEEDS = re.compile(r"seeds\s*=\s*\[([^\]]+)\]")
CPI = re.compile(r"\b(token::[A-Za-z_][A-Za-z0-9_]*|CpiContext::new_with_signer|invoke(?:_signed)?)")
ENV = re.compile(r"\b(?:process\.env\.[A-Za-z_][A-Za-z0-9_]*|std::env::var\(\s*['\"][^'\"]+)")
CLASSIFIER = re.compile(r"['\"]([a-z_]+)['\"]")
SECURITY_PATTERN = re.compile(r"UncheckedAccount|AccountInfo|remaining_accounts|token::transfer\b|sourceLockAllowsExecution|Date\.parse|BigInt\(|fetch\(|private[_ -]?key|Keypair|signer|vault|destination|nonce|expiry|addressLookupTables", re.IGNORECASE)


def run(*args: str) -> str:
    return subprocess.check_output(args, cwd=ROOT, text=True, stderr=subprocess.DEVNULL).strip()


def tracked_files() -> list[Path]:
    return [ROOT / line for line in run("git", "ls-files").splitlines() if line]


def text_lines(path: Path) -> list[str]:
    try:
        return path.read_text(encoding="utf-8").splitlines()
    except UnicodeDecodeError:
        return []


def language(path: Path) -> str:
    return {".rs": "rust", ".ts": "typescript", ".mts": "typescript", ".js": "javascript", ".mjs": "javascript", ".py": "python", ".md": "markdown", ".json": "json", ".toml": "toml", ".yml": "yaml", ".yaml": "yaml", ".sh": "shell"}.get(path.suffix, "other")


def relative(path: Path) -> str:
    return str(path.relative_to(ROOT))


def symbols(path: Path, lines: list[str]) -> list[dict[str, Any]]:
    pattern = RUST_SYMBOL if path.suffix == ".rs" else TS_SYMBOL if path.suffix in {".ts", ".js", ".mjs"} else None
    if not pattern:
        return []
    result = []
    for number, line in enumerate(lines, 1):
        match = pattern.match(line)
        if match:
            result.append({"name": match.group(1), "line": number, "language": language(path), "heuristic": True})
    return result


def rust_security(path: Path, lines: list[str]) -> dict[str, list[dict[str, Any]]]:
    accounts: list[dict[str, Any]] = []
    pdas: list[dict[str, Any]] = []
    cpis: list[dict[str, Any]] = []
    writable: list[dict[str, Any]] = []
    current_account: str | None = None
    for number, line in enumerate(lines, 1):
        struct = ACCOUNT_STRUCT.match(line)
        if struct:
            current_account = struct.group(1)
        if "#[account" in line or "pub " in line and ": Account<'info" in line:
            if "mut" in line or "mut," in line:
                writable.append({"line": number, "context": current_account, "text": line.strip(), "heuristic": True})
        for match in PDA_SEEDS.finditer(line):
            pdas.append({"line": number, "context": current_account, "seeds": match.group(1).strip(), "heuristic": True})
        for match in CPI.finditer(line):
            cpis.append({"line": number, "context": current_account, "operation": match.group(1), "heuristic": True})
        if "pub " in line and ("Account<'info" in line or "Signer<'info" in line or "UncheckedAccount<'info" in line):
            accounts.append({"line": number, "context": current_account, "declaration": line.strip(), "heuristic": True})
    return {"accounts": accounts, "pda_seeds": pdas, "cpis": cpis, "writable_accounts": writable}


def tests(path: Path, lines: list[str]) -> list[dict[str, Any]]:
    result = []
    if path.suffix == ".rs":
        pending = False
        for number, line in enumerate(lines, 1):
            if "#[test]" in line:
                pending = True
            elif pending:
                match = re.search(r"fn\s+([A-Za-z_][A-Za-z0-9_]*)", line)
                if match:
                    result.append({"name": match.group(1), "line": number})
                    pending = False
    elif path.suffix in {".ts", ".js", ".mjs"}:
        for number, line in enumerate(lines, 1):
            for match in TS_TEST.finditer(line):
                result.append({"name": match.group(1), "line": number})
    return result


def json_configuration(path: Path) -> dict[str, Any] | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def cargo_dependencies(path: Path) -> dict[str, Any]:
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8"))
    except (tomllib.TOMLDecodeError, UnicodeDecodeError):
        return {}
    return {"package": data.get("package", {}).get("name"), "dependencies": sorted((data.get("dependencies") or {}).keys()), "dev_dependencies": sorted((data.get("dev-dependencies") or {}).keys())}


def git_change_frequency(files: Iterable[Path]) -> dict[str, int]:
    result: dict[str, int] = {}
    for path in files:
        rel = relative(path)
        try:
            count = run("git", "log", "--format=%H", "--", rel)
            result[rel] = 0 if not count else len(count.splitlines())
        except subprocess.CalledProcessError:
            result[rel] = 0
    return result


def build_index() -> dict[str, Any]:
    files = tracked_files()
    result: dict[str, Any] = {
        "schema_version": "1.0",
        "generated_at_utc": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "source_commit": run("git", "rev-parse", "HEAD"),
        "generator": "scripts/build_repository_index.py",
        "verification_status": "candidate",
        "method": "static tracked-source analysis; heuristic findings require source review",
        "files": [],
        "symbols": {},
        "anchor": {"accounts": [], "pda_seeds": [], "cpis": [], "writable_accounts": []},
        "transaction_topology": {"instruction_classifiers": [], "alt_references": [], "signer_role_references": []},
        "configuration": {"json": {}, "environment_references": [], "source_lock": None},
        "tests": {},
        "dependencies": {},
        "security_hotspots": [],
        "change_frequency": {},
        "limitations": [
            "No full Rust or TypeScript AST/call graph is claimed by this standard-library implementation.",
            "Static inventory does not prove runtime reachability or account validation correctness.",
            "Every index result must be verified against the named source commit before use.",
        ],
    }
    for path in files:
        rel = relative(path)
        lines = text_lines(path)
        lang = language(path)
        result["files"].append({"path": rel, "language": lang, "line_count": len(lines)})
        sym = symbols(path, lines)
        if sym:
            result["symbols"][rel] = sym
        if path.suffix == ".rs":
            inventory = rust_security(path, lines)
            for key, entries in inventory.items():
                for entry in entries:
                    entry["file"] = rel
                result["anchor"][key].extend(entries)
        discovered_tests = tests(path, lines)
        if discovered_tests:
            result["tests"][rel] = discovered_tests
        if path.suffix == ".json":
            parsed = json_configuration(path)
            if parsed is not None:
                result["configuration"]["json"][rel] = parsed
                if rel == "config/sources.lock.json":
                    result["configuration"]["source_lock"] = parsed
        if path.name == "Cargo.toml":
            result["dependencies"][rel] = cargo_dependencies(path)
        for number, line in enumerate(lines, 1):
            if ENV.search(line):
                result["configuration"]["environment_references"].append({"file": rel, "line": number, "text": line.strip(), "heuristic": True})
            if "addressLookupTables" in line:
                result["transaction_topology"]["alt_references"].append({"file": rel, "line": number, "text": line.strip(), "heuristic": True})
            if "role:" in line and ("agent_intent" in line or "paymaster_fee_payer" in line):
                result["transaction_topology"]["signer_role_references"].append({"file": rel, "line": number, "text": line.strip(), "heuristic": True})
            if "INSTRUCTION_CLASSIFIERS" in line or "classifier:" in line:
                result["transaction_topology"]["instruction_classifiers"].append({"file": rel, "line": number, "text": line.strip(), "heuristic": True})
            if SECURITY_PATTERN.search(line):
                result["security_hotspots"].append({"file": rel, "line": number, "text": line.strip(), "heuristic": True})
    result["change_frequency"] = git_change_frequency(files)
    return result


def changed_files(base: str, head: str) -> list[str]:
    output = run("git", "diff", "--name-only", f"{base}..{head}")
    return [line for line in output.splitlines() if line]


def impact_report(base: str, head: str) -> dict[str, Any]:
    base_sha = run("git", "rev-parse", base)
    head_sha = run("git", "rev-parse", head)
    index = build_index()
    changes = changed_files(base_sha, head_sha)
    keywords = set()
    for file_name in changes:
        for symbol in index["symbols"].get(file_name, []):
            keywords.add(symbol["name"])
    anchors = [entry for group in ("accounts", "pda_seeds", "cpis", "writable_accounts") for entry in index["anchor"][group] if entry["file"] in changes]
    impacted_tests = [path for path in index["tests"] if any(segment in path for segment in ("composer/test", "programs/"))]
    release_risk = "high" if any(path.startswith(("programs/", "composer/src/", "config/", ".github/")) for path in changes) else "medium" if changes else "low"
    return {
        "schema_version": "1.0",
        "generated_at_utc": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "base_commit": base_sha,
        "head_commit": head_sha,
        "changed_files": changes,
        "affected_symbols": sorted(keywords),
        "affected_anchor_inventory": anchors,
        "affected_tests_to_review": impacted_tests,
        "affected_docs_to_review": [path for path in index["files"] if path["path"].startswith("docs/")],
        "source_lock_implication": "review required" if any(path.startswith("config/") or "source-lock" in path for path in changes) else "none detected by static heuristic",
        "release_risk": release_risk,
        "verification_status": "candidate",
        "limitations": index["limitations"],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    build = sub.add_parser("build", help="Generate static repository index")
    build.add_argument("--output", default=str(INDEX_PATH))
    impact = sub.add_parser("impact", help="Generate static change-impact report")
    impact.add_argument("--base", required=True)
    impact.add_argument("--head", default="HEAD")
    impact.add_argument("--output", required=True)
    args = parser.parse_args()
    if args.command == "build":
        result = build_index()
        destination = Path(args.output)
    else:
        result = impact_report(args.base, args.head)
        destination = Path(args.output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(destination), "source_commit": result.get("source_commit", getattr(args, "head", "HEAD")), "verification_status": result["verification_status"]}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
