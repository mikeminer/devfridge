"""Generate a static publisher site from reviewed app facts; standard library only."""
import argparse
from datetime import date
from html import escape
import hashlib
import importlib.util
import ipaddress
import json
from pathlib import Path
import re
import shutil
import tempfile
from urllib.parse import urlsplit

PRIVACY = {
    'collection': 'Information and processing',
    'localStorage': 'On-device storage',
    'providers': 'Service providers and external links',
    'retention': 'Retention and deletion',
    'rights': 'Privacy requests',
    'children': 'Age and audience',
}
TERMS = {
    'service': 'The service',
    'access': 'Access and availability',
    'payments': 'Payments and on-chain actions',
    'conduct': 'Acceptable use',
    'rights': 'Content and intellectual property',
    'liability': 'Responsibilities and limitations',
    'law': 'Applicable rules and disputes',
}
CSS = '''html{color-scheme:dark;background:#10211e;color:#f5f6e9;font:18px/1.65 system-ui,sans-serif}body{max-width:900px;margin:auto;padding:2rem 1.25rem}a{color:#bff58a}a:focus-visible{outline:3px solid #ffc857;outline-offset:4px}nav{display:flex;flex-wrap:wrap;gap:1.3rem}h1{font-size:clamp(2.2rem,7vw,4rem);line-height:1.12}h2{line-height:1.2}section{margin:2rem 0}p{overflow-wrap:anywhere;white-space:pre-line}.draft{padding:1rem;background:#553a0b}footer{border-top:1px solid #456050;margin-top:3rem;padding-top:1.5rem}small{color:#c6cec7}main{min-height:60vh}'''


def text(value, field):
    if not isinstance(value, str) or not value.strip() or len(value) > 12000:
        raise ValueError('Missing or oversized field: ' + field)
    if any(ord(c) < 32 and c not in '\n\t' for c in value):
        raise ValueError('Control character in: ' + field)
    return value.strip()


def https_url(value, draft=False, origin=False):
    value = text(value, 'URL')
    u = urlsplit(value)
    if (u.scheme != 'https' or not u.hostname or u.username or u.password or u.port not in (None, 443)
            or u.query or u.fragment or (origin and u.path not in ('', '/')) or '\\' in value):
        raise ValueError('Use a clean HTTPS URL without credentials, query or fragment')
    public_hostname(u.hostname, draft)
    return value.rstrip('/')


def public_hostname(host, draft=False):
    host = host.lower()
    if (len(host) > 253 or '.' not in host or host.endswith('.') or
            any(not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', label) for label in host.split('.'))):
        raise ValueError('Use a real public DNS hostname (IDN in punycode)')
    if not draft and (host in ('example.com', 'example.org', 'example.net')
                      or host.endswith(('.example', '.test', '.localhost', '.local', '.invalid', '.internal'))
                      or any(host.endswith('.' + h) for h in ('example.com', 'example.org', 'example.net'))):
        raise ValueError('A release site needs the owner\'s real HTTPS domain')
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise ValueError('Use the owner\'s public DNS domain, not an IP address')


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)


def validate(config, draft=False):
    if config.get('schemaVersion') != 1:
        raise ValueError('Expected schemaVersion 1')
    if not draft and config.get('factsReviewed') is not True:
        raise ValueError('Review the facts against the actual app before release generation')
    if not draft and (any(re.match(r'(?i)^(replace\b|todo\b|tbd\b|<[^>]+>$)', s.strip()) for s in strings(config))
                      or str(config.get('appName', '')).strip().lower() == 'your game'):
        raise ValueError('Replace every example placeholder with actual app facts')
    scanner_spec = importlib.util.spec_from_file_location('site_secret_scan', Path(__file__).resolve().parents[1] / 'check-no-secrets.py')
    scanner = importlib.util.module_from_spec(scanner_spec)
    scanner_spec.loader.exec_module(scanner)
    if scanner.contains_secret(json.dumps(config).encode(), scanner.env_secrets([])):
        raise ValueError('Configuration contains a possible secret; no pages generated')
    out = {key: text(config.get(key), key) for key in ('appName', 'publisherName', 'description', 'supportEmail', 'updatedAt', 'language')}
    if not re.fullmatch(r'[^\s<>@"&?]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}', out['supportEmail']):
        raise ValueError('Invalid support email')
    if out['language'] != 'en':
        raise ValueError('This starter renders English headings; translate and review a separate page set for other locales')
    public_hostname(out['supportEmail'].split('@')[1], draft)
    date.fromisoformat(out['updatedAt'])
    out['origin'] = https_url(config.get('origin'), draft, origin=True)
    out['downloadUrl'] = https_url(config['downloadUrl'], draft) if config.get('downloadUrl') else None
    out['playUrl'] = https_url(config['playUrl'], draft) if config.get('playUrl') else None
    out['platform'] = config.get('platform')
    if out['platform'] not in ('browser', 'seeker-bundled', 'seeker-hosted', 'both-bundled', 'both-hosted'):
        raise ValueError('Select the actual platform/architecture')
    if out['platform'] == 'seeker-bundled' and out['playUrl']:
        raise ValueError('Bundled Seeker-only does not imply a playable web game')
    for key, fields in [('privacy', PRIVACY), ('terms', TERMS)]:
        section = config.get(key)
        if not isinstance(section, dict):
            raise ValueError('Missing ' + key + ' facts')
        out[key] = {field: text(section.get(field), key + '.' + field) for field in fields}
    # This tool renders approved prose; it never infers legal, financial or data practices.
    out['draft'] = draft
    return out


def page(config, title, body, path):
    e = escape
    draft = '<p class="draft">DRAFT — app facts and public links need review. Do not submit this page to the Store.</p>' if config['draft'] else ''
    robots = '<meta name="robots" content="noindex,nofollow">' if config['draft'] else ''
    canonical = config['origin'] + path
    return f'''<!doctype html>
<html lang="{e(config['language'], quote=True)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(title)} · {e(config['appName'])}</title><meta name="description" content="{e(config['description'], quote=True)}">{robots}<link rel="canonical" href="{e(canonical, quote=True)}"><link rel="stylesheet" href="/styles.css"></head>
<body><nav aria-label="Main navigation"><a href="/">{e(config['appName'])}</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav>{draft}<main><h1>{e(title)}</h1>{body}</main><footer><p>Published by {e(config['publisherName'])}. <a href="mailto:{e(config['supportEmail'], quote=True)}">Contact support</a></p><small>Updated {e(config['updatedAt'])}</small></footer></body></html>
'''


def generate(config, destination, draft=False):
    c = validate(config, draft)
    destination = Path(destination).absolute()
    if destination.exists() or destination.is_symlink():
        raise ValueError('Output already exists; use a new directory')
    if not destination.parent.is_dir():
        raise ValueError('Output parent must already exist')
    body = '<p>' + escape(c['description']) + '</p>'
    for field, label in [('playUrl', 'Play the web game'), ('downloadUrl', 'Get the app')]:
        if c[field]:
            body += f'<p><a href="{escape(c[field], quote=True)}" rel="noopener noreferrer">{label}</a></p>'
    files = {'index.html': page(c, c['appName'], body, '/'), 'styles.css': CSS + '\n'}
    for key, fields in [('privacy', PRIVACY), ('terms', TERMS)]:
        body = ''.join(f'<section><h2>{escape(title)}</h2><p>{escape(c[key][field])}</p></section>' for field, title in fields.items())
        files[key + '/index.html'] = page(c, 'Privacy policy' if key == 'privacy' else 'Terms of use', body, '/' + key + '/')
    files['robots.txt'] = 'User-agent: *\nDisallow: /\n' if draft else 'User-agent: *\nAllow: /\n'
    manifest = {'schemaVersion': 1, 'draft': draft, 'factsReviewed': not draft, 'language': c['language'],
                'walletIdentityOrigin': c['origin'], 'websiteUrl': c['origin'] + '/',
                'privacyUrl': c['origin'] + '/privacy/', 'termsUrl': c['origin'] + '/terms/',
                'checksRemaining': ['Deploy to the owned domain', 'Verify all three HTTPS pages and support contact', 'Compare copy to the actual release and applicable requirements'],
                'files': {name: hashlib.sha256(data.encode()).hexdigest() for name, data in files.items()}}
    # Render privately first: validation/write failure never creates a partly ready destination.
    temporary = Path(tempfile.mkdtemp(prefix='.site-build-', dir=destination.parent))
    try:
        for name, data in files.items():
            target = temporary / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(data, encoding='utf-8', newline='\n')
        (temporary / 'site-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8', newline='\n')
        temporary.rename(destination)
    finally:
        if temporary.exists():
            shutil.rmtree(temporary)
    return manifest


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--config', required=True, type=Path)
    p.add_argument('--out', required=True, type=Path)
    p.add_argument('--draft', action='store_true')
    args = p.parse_args()
    try:
        generate(json.loads(args.config.read_text(encoding='utf-8')), args.out, args.draft)
    except (ValueError, OSError, TypeError, AttributeError):
        p.exit(1, 'Site generation failed: review config fields, placeholders, public URLs, secret checks and new output path. No raw input values are logged.\n')
    print('Created DRAFT site' if args.draft else 'Created site; verify deployment and real app facts before release')


if __name__ == '__main__':
    main()
