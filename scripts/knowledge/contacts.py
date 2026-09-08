"""Public contact observations from Connect and the API used by the Team site."""
import json
import re
from urllib.parse import urlparse

from refresh import Document, Element, observed, page, request, status_line


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
        if https_url(href) and label and (urlparse(href).hostname in {"devfridge.medium.com", "app.paragraph.com"} or href.startswith("https://x.com/i/chat/group_join/")):
            entries.append({"group": "NEWS & COMMUNITY", "label": label, "url": href})
    if found != groups or not any(e["group"] == "TALK & LISTINGS" for e in entries):
        raise ValueError("Connect contact sections missing or empty")
    return {"title": "Official Connect contacts", "entries": list({e['url']: e for e in entries}.values())}


def team_contacts(payload):
    data = json.loads(payload)
    if not isinstance(data.get("members"), list):
        raise ValueError("Team roster missing")
    members, wallets = [], set()
    prefixes = {"x": "https://x.com/", "github": "https://github.com/", "telegram": "https://t.me/", "farcaster": "https://warpcast.com/", "pumpfun": "https://pump.fun/profile/"}
    for member in data["members"]:
        wallet = member.get("wallet", "")
        if not re.fullmatch(r"[1-9A-HJ-NP-Za-km-z]{32,44}", wallet) or wallet in wallets or not isinstance(member.get("role"), str):
            raise ValueError("Invalid team identity")
        wallets.add(wallet)
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
        members.append({"wallet": wallet, "name": clean(member.get("displayName")) or wallet, "role": clean(member["role"]), "contacts": contacts})
    return {"title": "Team and leadership", "page": "https://team.devfridge.cool/", "members": members}


def refresh_contacts(config, old, stamp):
    sources = config["contact_sources"]
    return {key: observed(old.get(key), sources[key], lambda key=key: (connect_contacts if key == "connect" else team_contacts)(request(sources[key])), stamp)
            for key in ("connect", "team")}


def md(value):
    return re.sub(r"([\\`*_{}\[\]<>])", r"\\\1", clean(value))


def render_contacts(snapshot, stamp):
    records = snapshot.get("contacts", {})
    intro = "Project-published contact observations. Team roles are roster labels, not independent identity or lock verification. Check the canonical source and observation date before contacting anyone."
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
    members = team.get("data", {}).get("members", [])
    for member in members:
        body += f"## {md(member['name'])} — {md(member['role'])}\n\nPublic wallet: `{member['wallet']}`\n\n"
        for contact in member["contacts"]:
            label = md(contact["platform"] + ": " + contact["handle"])
            body += (f"- [{label}]({contact['url']})" if contact["url"] else f"- {label} (published handle; no validated link)") + "\n"
        body += "\n"
    if not members:
        body += "No team profiles in the available observation.\n"
    body += "\n[Official Connect contacts](./connect.md) · [Contact index](./index.md)\n"
    page("contacts/team.md", "Team, CEO and leadership contacts", body, stamp, "Documentation", "https://team.devfridge.cool/")
    page("contacts/index.md", "Official contacts and team", f"{intro}\n\n- [Project leader, communities and publications](./connect.md)\n- [Team, CEO and leadership](./team.md)\n\n[Investor overview](../investor/index.md) · [Source freshness](../operations/freshness.md)", stamp, "Index")
