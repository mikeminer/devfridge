"""Validate bundle completeness, identity, source timestamps and relative links offline."""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

from refresh import KNOWLEDGE, ROOT, asset_path, read_json, validate_assets


def validate(root=KNOWLEDGE):
    errors = []
    config = read_json(root / "config.json")
    snapshot = read_json(root / "data/snapshot.json")
    assets = snapshot["registry"]["data"]
    try:
        validate_assets(assets, config["required_asset_ids"])
    except ValueError as exc:
        errors.append(str(exc))
    for asset in assets:
        path = root / asset_path(asset)
        if not path.exists() or asset["address"] not in path.read_text(encoding="utf-8"):
            errors.append(f"Missing full asset identity: {asset['id']}")
        state = snapshot["assets"].get(asset["id"], {})
        if set(state) != {"chain", "market"}:
            errors.append(f"Missing observation status: {asset['id']}")
    expected_docs = {p.parent.name if p.parent.name != "docs" else "overview" for p in (ROOT / "scan/app/docs").glob("**/page.tsx")}
    for slug in expected_docs:
        if not (root / f"docs/{slug}.md").exists():
            errors.append(f"Missing docs reference: {slug}")
    records = [snapshot["registry"], snapshot["doc_catalog"], *snapshot["documents"].values()]
    records += [r for state in snapshot["assets"].values() for r in state.values()]
    for record in records:
        if record.get("status") not in {"ok", "stale", "unavailable"}:
            errors.append("Invalid observation status")
        if record.get("status") in {"ok", "stale"} and ("data" not in record or "fetched_at" not in record):
            errors.append("Successful/stale observation has no data or timestamp")
        if record.get("status") == "unavailable" and ("data" in record or "fetched_at" in record):
            errors.append("Unavailable observation must not fabricate successful data")
        for key in ("attempted_at", "fetched_at"):
            if key in record:
                try:
                    datetime.fromisoformat(record[key].replace("Z", "+00:00"))
                except ValueError:
                    errors.append("Invalid source timestamp")
    markdown_files = sorted(root.rglob("*.md"))
    allowed = {"Knowledge Bundle", "Index", "Asset", "Concept", "Documentation", "Report", "Process", "Term"}
    for path in markdown_files:
        text = path.read_text(encoding="utf-8-sig")
        match = re.match(r"---\n(.*?)\n---\n", text, re.S)
        if not match:
            errors.append(f"Missing YAML frontmatter: {path.relative_to(root)}")
            continue
        fields = dict(line.split(":", 1) for line in match[1].splitlines() if ":" in line)
        kind = fields.get("type", "").strip().strip('"')
        if kind not in allowed or not all(k in fields for k in ("type", "title", "description", "timestamp")):
            errors.append(f"Invalid metadata: {path.relative_to(root)}")
        for href in re.findall(r"(?<!!)\[[^\]]*\]\(([^)\s]+)\)", text):
            if re.match(r"[a-z]+:", href) or href.startswith("#"):
                continue
            target = (path.parent / href.split("#")[0]).resolve()
            if not target.is_relative_to(ROOT) or not target.exists():
                errors.append(f"Broken relative link: {path.relative_to(root)} -> {href}")
        if path.name != "index.md":
            index = path.parent / "index.md"
            if not index.exists() or f"./{path.name}" not in index.read_text(encoding="utf-8"):
                errors.append(f"Not indexed: {path.relative_to(root)}")
        elif path.parent != root:
            parent_index = path.parent.parent / "index.md"
            if not parent_index.exists() or f"./{path.parent.name}/index.md" not in parent_index.read_text(encoding="utf-8"):
                errors.append(f"Directory not indexed: {path.relative_to(root)}")
    return errors, len(markdown_files), len(assets), len(snapshot["documents"])


if __name__ == "__main__":
    errors, pages, assets, docs = validate()
    for error in errors:
        print(error)
    print(f"Validated {pages} Markdown pages, {assets} assets, {docs} documentation references; {len(errors)} errors.")
    sys.exit(bool(errors))
