"""Public contact observations from Connect and the API used by the Team site."""
import json
import re
from urllib.parse import urlparse

from refresh import Document, Element, observed, page, request, status_line, now
from commitment import verify_commitment, verified_at


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def https_url(value):
    parsed = urlparse(value)
    return parsed.scheme == "https" and bool(parsed.hostname) and not parsed.username and not parsed.password


def connect_contacts(html):
    root = Document(html).root
    entries = []
    groups = {"OFFICIAL TELEGRAM BOT", "OFFICIAL SITES", "TALK & LISTINGS"}
    found = set()
    for section in root.find("section"):
        headings = [n for n in section.children if isinstance(n, Element) and n.tag == "p"]
        group = clean(headings[0].text()) if headings else ""
        if group not in groups:
            continue
        found.add(group)
        grids = [n for n in section.children if isinstance(n, Element) and n.tag == "div"]
        for grid in grids:
            for card in grid.children:
                if not isinstance(card, Element):
                    continue
                descriptions = [n for n in card.children if isinstance(n, Element) and n.tag == "div"]
                label = clean(descriptions[0].text()) if descriptions else ""
                for link in card.find("a"):
                    href = link.attrs.get("href", "")
                    if label and https_url(href):
                        entries.append({"group": group, "label": label, "url": href})
    # These links sit outside the directory cards, with descriptive visible labels.
    for link in root.find("a"):
        href, label = link.attrs.get("href", ""), clean(link.text())
        if https_url(href) and label and (urlparse(href).hostname in {"devfridge.medium.com", "app.paragraph.com", "paragraph.com"} or href.startswith("https://x.com/i/chat/group_join/")):
            entries.append({"group": "NEWS & COMMUNITY", "label": label, "url": href})
    if found != groups or not any(e["group"] == "TALK & LISTINGS" for e in entries):
        raise ValueError("Connect contact sections missing or empty")
    return {"title": "Official Connect contacts", "entries": list({e['url']: e for e in entries}.values())}


def team_contacts(payload, stamp=None):
    stamp = stamp or now()
    data = json.loads(payload)
    if not isinstance(data.get("members"), list):
        raise ValueError("Team roster missing")
    members, wallets = [], set()
    excluded, failures = 0, 0
    prefixes = {"x": "https://x.com/", "github": "https://github.com/", "telegram": "https://t.me/", "farcaster": "https://warpcast.com/", "pumpfun": "https://pump.fun/profile/"}
    for member in data["members"]:
        wallet = member.get("wallet", "")
        if not re.fullmatch(r"[1-9A-HJ-NP-Za-km-z]{32,44}", wallet) or wallet in wallets or not isinstance(member.get("role"), str):
            raise ValueError("Invalid team identity")
        wallets.add(wallet)
        try:
            proof = verify_commitment(wallet, member.get('tier'), stamp)
        except Exception:
            proof = None
            failures += 1
        if proof is None:
            excluded += 1
            continue
        socials = member.get("socials") or {}
        if not isinstance(socials, dict):
            raise ValueError("Invalid team socials")
        contacts = []
        for platform in [*prefixes, "discord"]:
            handle = clean(socials.get(platform))
            if handle:
                # Discord usernames and malformed handles remain text, never invented invite links.
                url = prefixes[platform] + handle if platform in prefixes and re.fullmatch(r"[A-Za-z0-9_.-]+", handle) else None
                contacts.append({"platform": platform, "handle": handle, "url": url})
        members.append({"wallet": wallet, "name": clean(member.get("displayName")) or wallet, "role": clean(member["role"]), "contacts": contacts, "commitment": proof})
    return {"title": "Team with verified commitment", "page": "https://team.devfridge.cool/", "members": members,
            "excluded_count": excluded, "verification_failures": failures}


def refresh_contacts(config, old, stamp):
    sources = config["contact_sources"]
    # Team verification fails closed: never republish old profiles after a failed check.
    return {"connect": observed(old.get('connect'), sources['connect'], lambda: connect_contacts(request(sources['connect'])), stamp),
            "team": observed(None, sources['team'], lambda: team_contacts(request(sources['team']), stamp), stamp)}


def md(value):
    return re.sub(r"([\\`*_{}\[\]<>])", r"\\\1", clean(value))


def render_contacts(snapshot, stamp):
    records = snapshot.get("contacts", {})
    intro = "Project-published contact observations. Only team members with verified PASTA commitment at observation are indexed. Verification follows the Team tier amounts and original lock durations, including its one-day tolerance. It does not verify real-world identity. Check source dates."
    connect, team = records.get("connect", {}), records.get("team", {})
    body = f"{intro}\n\n[Connect](https://connect.devfridge.cool/) · {status_line(connect)}.\n\n"
    entries = connect.get("data", {}).get("entries", [])
    for group in dict.fromkeys(e["group"] for e in entries):
        body += f"## {md(group)}\n\n" + "\n".join(f"- [{md(e['label'])}]({e['url']})" for e in entries if e["group"] == group) + "\n\n"
    if not entries:
        body += "No successful contact observation available.\n"
    body += "\n[Team and leadership](./team.md) · [Contact index](./index.md)\n"
    page("contacts/connect.md", "Official contacts, project leader and community", body, stamp, "Documentation", "https://connect.devfridge.cool/")
    body = f"{intro}\n\n[Team site](https://team.devfridge.cool/) · [Public roster API](https://scan.devfridge.cool/api/team) · {status_line(team)}.\n\n"
    members = [m for m in team.get("data", {}).get("members", []) if team.get('status') == 'ok' and verified_at(m, stamp)]
    for member in members:
        body += f"## {md(member['name'])} — {md(member['role'])}\n\nPublic wallet: `{member['wallet']}`\n\n"
        proof = member['commitment']
        body += f"**Verified commitment** · checked {proof['checked_at']} · tier {proof['tier']} · qualifying PASTA base units: `{proof['qualifying_amount_base_units']}`. [Lock evidence]({proof['source']}).\n\n"
        for contact in member["contacts"]:
            label = md(contact["platform"] + ": " + contact["handle"])
            body += (f"- [{label}]({contact['url']})" if contact["url"] else f"- {label} (published handle; no validated link)") + "\n"
        body += "\n"
    if not members:
        body += "No members with a current verified commitment in the available observation.\n"
    body += f"\nExcluded profiles: {team.get('data', {}).get('excluded_count', 'unknown')}; verification request failures: {team.get('data', {}).get('verification_failures', 'unknown')}. Failed verification never retains an old profile.\n"
    body += "\n[Official Connect contacts](./connect.md) · [Contact index](./index.md)\n"
    page("contacts/team.md", "Team, CEO and leadership contacts", body, stamp, "Documentation", "https://team.devfridge.cool/")
    page("contacts/index.md", "Official contacts and team", f"{intro}\n\n- [Project leader, communities and publications](./connect.md)\n- [Team, CEO and leadership](./team.md)\n\n[Investor overview](../investor/index.md) · [Source freshness](../operations/freshness.md)", stamp, "Index")
