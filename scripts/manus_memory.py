#!/usr/bin/env python3
"""Shadow-Pro project-local engineering memory.

This tool records non-sensitive, evidence-bound project memory. It never signs,
submits, deploys, connects providers, reads secrets, or treats stored data as
current authority. Callers must verify every retrieved item against the current
repository commit before relying on it.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import sqlite3
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MEMORY_DIR = ROOT / ".manus" / "memory"
DB_PATH = MEMORY_DIR / "engineering_memory.sqlite"
EXPORT_PATH = MEMORY_DIR / "engineering_memory.jsonl"
ALLOWED_KINDS = {"fact", "inference", "hypothesis", "recommendation", "decision", "episode", "artifact", "symbol"}
ALLOWED_STATUS = {"candidate", "verified", "blocked", "superseded", "rejected", "deleted"}
SENSITIVE = re.compile(
    r"-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|\b(?:seed phrase|mnemonic|private[_ -]?key|secret[_ -]?key|api[_ -]?key|access[_ -]?token)\b",
    re.IGNORECASE,
)

SCHEMA = """
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS memory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_hash TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  project_scope TEXT NOT NULL,
  source_commit TEXT NOT NULL,
  provenance TEXT NOT NULL,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  verification_status TEXT NOT NULL,
  freshness_days INTEGER NOT NULL CHECK(freshness_days >= 0),
  importance INTEGER NOT NULL CHECK(importance >= 1 AND importance <= 5),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL,
  supersedes_id INTEGER REFERENCES memory_items(id),
  deleted_at_utc TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_memory_kind ON memory_items(kind);
CREATE INDEX IF NOT EXISTS idx_memory_status ON memory_items(verification_status);
CREATE INDEX IF NOT EXISTS idx_memory_commit ON memory_items(source_commit);
CREATE INDEX IF NOT EXISTS idx_memory_updated ON memory_items(updated_at_utc DESC);
CREATE INDEX IF NOT EXISTS idx_memory_title ON memory_items(title);
CREATE TABLE IF NOT EXISTS memory_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER REFERENCES memory_items(id),
  event_type TEXT NOT NULL,
  event_at_utc TEXT NOT NULL,
  actor TEXT NOT NULL,
  detail TEXT NOT NULL
);
"""


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def require_safe(*parts: str) -> None:
    joined = "\n".join(parts)
    if SENSITIVE.search(joined):
        raise ValueError("Sensitive-looking material is prohibited from project memory.")


def connection() -> sqlite3.Connection:
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def canonical_payload(values: dict[str, Any]) -> str:
    return json.dumps(values, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def item_hash(values: dict[str, Any]) -> str:
    return hashlib.sha256(canonical_payload(values).encode("utf-8")).hexdigest()


def parse_metadata(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    value = json.loads(raw)
    if not isinstance(value, dict):
        raise ValueError("metadata must be a JSON object")
    return value


def add_item(args: argparse.Namespace, supersedes_id: int | None = None) -> int:
    if args.kind not in ALLOWED_KINDS:
        raise ValueError(f"kind must be one of: {', '.join(sorted(ALLOWED_KINDS))}")
    if args.status not in ALLOWED_STATUS - {"deleted"}:
        raise ValueError(f"status must be one of: {', '.join(sorted(ALLOWED_STATUS - {'deleted'}))}")
    if not re.fullmatch(r"[0-9a-f]{7,64}", args.commit):
        raise ValueError("source commit must be a lowercase hexadecimal Git SHA")
    metadata = parse_metadata(args.metadata)
    require_safe(args.title, args.body, args.provenance, canonical_payload(metadata))
    now = utc_now()
    payload = {
        "kind": args.kind,
        "title": args.title,
        "body": args.body,
        "project_scope": args.scope,
        "source_commit": args.commit,
        "provenance": args.provenance,
        "confidence": args.confidence,
        "verification_status": args.status,
        "freshness_days": args.freshness_days,
        "importance": args.importance,
        "metadata": metadata,
        "supersedes_id": supersedes_id,
    }
    digest = item_hash(payload)
    with connection() as conn:
        existing = conn.execute("SELECT id FROM memory_items WHERE content_hash = ?", (digest,)).fetchone()
        if existing:
            print(json.dumps({"id": existing["id"], "deduplicated": True}))
            return int(existing["id"])
        cursor = conn.execute(
            """INSERT INTO memory_items
               (content_hash,kind,title,body,project_scope,source_commit,provenance,confidence,
                verification_status,freshness_days,importance,created_at_utc,updated_at_utc,
                supersedes_id,metadata_json)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (digest, args.kind, args.title, args.body, args.scope, args.commit, args.provenance,
             args.confidence, args.status, args.freshness_days, args.importance, now, now,
             supersedes_id, canonical_payload(metadata)),
        )
        item_id = int(cursor.lastrowid)
        conn.execute(
            "INSERT INTO memory_events(item_id,event_type,event_at_utc,actor,detail) VALUES (?,?,?,?,?)",
            (item_id, "created", now, args.actor, "memory item created"),
        )
    print(json.dumps({"id": item_id, "deduplicated": False}))
    return item_id


def stale_sql() -> str:
    return "datetime(created_at_utc, '+' || freshness_days || ' days') < datetime('now')"


def search(args: argparse.Namespace) -> None:
    terms = args.query.strip()
    clauses = ["deleted_at_utc IS NULL"]
    params: list[Any] = []
    if terms:
        clauses.append("(title LIKE ? OR body LIKE ? OR metadata_json LIKE ?)")
        needle = f"%{terms}%"
        params.extend([needle, needle, needle])
    if args.kind:
        clauses.append("kind = ?")
        params.append(args.kind)
    if args.status:
        clauses.append("verification_status = ?")
        params.append(args.status)
    if args.commit:
        clauses.append("source_commit = ?")
        params.append(args.commit)
    if args.metadata_contains:
        clauses.append("metadata_json LIKE ?")
        params.append(f"%{args.metadata_contains}%")
    where = " AND ".join(clauses)
    sql = f"""
      SELECT *, CASE WHEN {stale_sql()} THEN 1 ELSE 0 END AS stale,
      (importance * 1000000000 + CAST(strftime('%s', updated_at_utc) AS INTEGER)) AS rank
      FROM memory_items WHERE {where}
      ORDER BY stale ASC, rank DESC, id DESC LIMIT ?
    """
    params.append(args.limit)
    with connection() as conn:
        rows = [dict(row) for row in conn.execute(sql, params).fetchall()]
    for row in rows:
        row["metadata"] = json.loads(row.pop("metadata_json"))
    print(json.dumps(rows, indent=2, sort_keys=True))


def correct(args: argparse.Namespace) -> None:
    with connection() as conn:
        original = conn.execute("SELECT id FROM memory_items WHERE id = ? AND deleted_at_utc IS NULL", (args.id,)).fetchone()
    if not original:
        raise ValueError("active memory item does not exist")
    args.kind = args.kind or "fact"
    args.status = args.status or "candidate"
    args.scope = args.scope or "Shadow Account Protocol"
    args.provenance = args.provenance or f"User correction of memory item {args.id}"
    args.confidence = args.confidence if args.confidence is not None else 1.0
    args.freshness_days = args.freshness_days if args.freshness_days is not None else 30
    args.importance = args.importance if args.importance is not None else 5
    item_id = add_item(args, supersedes_id=args.id)
    with connection() as conn:
        now = utc_now()
        conn.execute("UPDATE memory_items SET verification_status = 'superseded', updated_at_utc = ? WHERE id = ?", (now, args.id))
        conn.execute("INSERT INTO memory_events(item_id,event_type,event_at_utc,actor,detail) VALUES (?,?,?,?,?)", (args.id, "superseded", now, args.actor, f"superseded by item {item_id}"))


def tombstone(args: argparse.Namespace) -> None:
    with connection() as conn:
        now = utc_now()
        cursor = conn.execute("UPDATE memory_items SET verification_status = 'deleted', deleted_at_utc = ?, updated_at_utc = ? WHERE id = ? AND deleted_at_utc IS NULL", (now, now, args.id))
        if cursor.rowcount != 1:
            raise ValueError("active memory item does not exist")
        conn.execute("INSERT INTO memory_events(item_id,event_type,event_at_utc,actor,detail) VALUES (?,?,?,?,?)", (args.id, "deleted", now, args.actor, args.reason))


def export_memory(_: argparse.Namespace) -> None:
    with connection() as conn:
        rows = [dict(row) for row in conn.execute("SELECT * FROM memory_items ORDER BY id")]
    with EXPORT_PATH.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, sort_keys=True) + "\n")
    print(json.dumps({"export": str(EXPORT_PATH), "items": len(rows)}))


def import_memory(args: argparse.Namespace) -> None:
    path = Path(args.path).resolve()
    if not path.is_file():
        raise ValueError("import path must be an existing JSONL file")
    imported = 0
    skipped = 0
    with connection() as conn, path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            item = json.loads(line)
            required = {"content_hash", "kind", "title", "body", "project_scope", "source_commit", "provenance", "confidence", "verification_status", "freshness_days", "importance", "created_at_utc", "updated_at_utc", "metadata_json"}
            if not required.issubset(item):
                raise ValueError(f"import record {line_number} is missing required fields")
            if item["kind"] not in ALLOWED_KINDS or item["verification_status"] not in ALLOWED_STATUS:
                raise ValueError(f"import record {line_number} has an invalid kind or verification status")
            require_safe(str(item["title"]), str(item["body"]), str(item["provenance"]), str(item["metadata_json"]))
            cursor = conn.execute(
                """INSERT OR IGNORE INTO memory_items
                   (content_hash,kind,title,body,project_scope,source_commit,provenance,confidence,
                    verification_status,freshness_days,importance,created_at_utc,updated_at_utc,
                    supersedes_id,deleted_at_utc,metadata_json)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (item["content_hash"], item["kind"], item["title"], item["body"], item["project_scope"],
                 item["source_commit"], item["provenance"], item["confidence"], item["verification_status"],
                 item["freshness_days"], item["importance"], item["created_at_utc"], item["updated_at_utc"],
                 None, item.get("deleted_at_utc"), item["metadata_json"]),
            )
            if cursor.rowcount == 1:
                imported += 1
            else:
                skipped += 1
    print(json.dumps({"imported": imported, "skipped_duplicates": skipped, "source": str(path)}))


def status(_: argparse.Namespace) -> None:
    with connection() as conn:
        summary = {
            "database": str(DB_PATH),
            "by_status": [dict(row) for row in conn.execute("SELECT verification_status AS status, COUNT(*) AS count FROM memory_items GROUP BY verification_status ORDER BY status")],
            "stale": conn.execute(f"SELECT COUNT(*) FROM memory_items WHERE deleted_at_utc IS NULL AND {stale_sql()}").fetchone()[0],
            "contradiction_candidates": [dict(row) for row in conn.execute("""
                SELECT title, COUNT(DISTINCT verification_status) AS status_count, GROUP_CONCAT(id) AS ids
                FROM memory_items WHERE deleted_at_utc IS NULL
                GROUP BY title HAVING COUNT(DISTINCT verification_status) > 1
            """)],
        }
    print(json.dumps(summary, indent=2, sort_keys=True))


def retrospective(args: argparse.Namespace) -> None:
    with connection() as conn:
        rows = [dict(row) for row in conn.execute("""
            SELECT id,title,body,source_commit,provenance,verification_status,updated_at_utc
            FROM memory_items WHERE kind = 'episode' AND deleted_at_utc IS NULL
            ORDER BY updated_at_utc DESC LIMIT ?
        """, (args.limit,))]
    print(json.dumps({"episodes": rows, "note": "Retrospective generation is deterministic extraction; review conclusions remain human/evidence gated."}, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    def common(target: argparse.ArgumentParser, optional: bool = False) -> None:
        required = not optional
        target.add_argument("--kind", choices=sorted(ALLOWED_KINDS), required=required)
        target.add_argument("--title", required=required)
        target.add_argument("--body", required=required)
        target.add_argument("--scope", required=required)
        target.add_argument("--commit", required=required)
        target.add_argument("--provenance", required=required)
        target.add_argument("--confidence", type=float, required=required)
        target.add_argument("--status", choices=sorted(ALLOWED_STATUS - {"deleted"}), required=required)
        target.add_argument("--freshness-days", dest="freshness_days", type=int, required=required)
        target.add_argument("--importance", type=int, choices=range(1, 6), required=required)
        target.add_argument("--metadata", default="{}")
        target.add_argument("--actor", default="manus")

    add = sub.add_parser("add", help="Add a non-sensitive, evidence-bound memory item")
    common(add)
    add.set_defaults(func=add_item)

    search_parser = sub.add_parser("search", help="Exact/metadata memory search with recency and importance ranking")
    search_parser.add_argument("query", nargs="?", default="")
    search_parser.add_argument("--kind", choices=sorted(ALLOWED_KINDS))
    search_parser.add_argument("--status", choices=sorted(ALLOWED_STATUS))
    search_parser.add_argument("--commit")
    search_parser.add_argument("--metadata-contains")
    search_parser.add_argument("--limit", type=int, default=20)
    search_parser.set_defaults(func=search)

    correction = sub.add_parser("correct", help="Supersede a memory item with a user or evidence correction")
    correction.add_argument("id", type=int)
    common(correction, optional=True)
    correction.set_defaults(func=correct)

    delete = sub.add_parser("delete", help="Tombstone a memory item without erasing its audit trail")
    delete.add_argument("id", type=int)
    delete.add_argument("--reason", required=True)
    delete.add_argument("--actor", default="manus")
    delete.set_defaults(func=tombstone)

    export = sub.add_parser("export", help="Export all memory items as JSONL")
    export.set_defaults(func=export_memory)
    importer = sub.add_parser("import", help="Import non-sensitive exported JSONL records")
    importer.add_argument("path")
    importer.set_defaults(func=import_memory)
    stat = sub.add_parser("status", help="Report stale and contradiction candidates")
    stat.set_defaults(func=status)
    retro = sub.add_parser("retrospective", help="Extract recent episodic memory for a deterministic retrospective")
    retro.add_argument("--limit", type=int, default=20)
    retro.set_defaults(func=retrospective)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        args.func(args)
        return 0
    except (ValueError, sqlite3.Error, json.JSONDecodeError) as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
