"""Export the public Markdown vault as one deterministic, credential-free viewer feed."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def export_vault(root=ROOT):
    knowledge = root / "knowledge"
    snapshot = json.loads((knowledge / "data/snapshot.json").read_text(encoding="utf-8-sig"))
    files = []
    for path in sorted(knowledge.rglob("*.md")):
        text = path.read_text(encoding="utf-8-sig").replace("\r\n", "\n")
        files.append({"path": path.relative_to(root).as_posix(), "text": text,
                      "sha": hashlib.sha256(text.encode()).hexdigest()})
    feed = {"schema_version": 1, "repo": "mikeminer/devfridge", "branch": "master", "path": "knowledge",
            "fetchedAt": snapshot["attempted_at"], "truncated": False, "files": files}
    destination = knowledge / "data/vault.json"
    destination.write_text(json.dumps(feed, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
    print(f"Exported {len(files)} notes for Synapse.")
    return feed


if __name__ == "__main__":
    export_vault()
