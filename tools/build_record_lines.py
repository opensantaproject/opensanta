#!/usr/bin/env python3
"""Bundle script/lines.tsv into record/lines.json for the static recorder PWA.

Run from the repo root whenever script/lines.tsv changes:
  python3 tools/build_record_lines.py
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TSV_PATH = ROOT / "script" / "lines.tsv"
OUT_PATH = ROOT / "record" / "lines.json"
CORE_ORDER = ["L013", "L002", "L014"]


def main() -> None:
    with TSV_PATH.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f, delimiter="\t"))

    core_by_id = {}
    packs: dict[str, list[dict[str, str]]] = {}

    for row in rows:
        item = {
            "id": row["line_id"].strip(),
            "section": row["section"].strip(),
            "text": row["text"].strip(),
        }
        direction = (row.get("direction") or "").strip()
        if direction:
            item["direction"] = direction

        pack = row["pack"].strip()
        if pack == "core":
            core_by_id[item["id"]] = item
        else:
            packs.setdefault(pack, []).append(item)

    core = [core_by_id[lid] for lid in CORE_ORDER if lid in core_by_id]
    for lid, item in core_by_id.items():
        if lid not in CORE_ORDER:
            core.append(item)

    payload = {
        "generatedFrom": "script/lines.tsv",
        "core": core,
        "packs": dict(sorted(packs.items())),
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({len(core)} core lines, {len(packs)} packs)")


if __name__ == "__main__":
    main()
