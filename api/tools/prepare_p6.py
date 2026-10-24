"""Read-only local release preflight; never signs off, spends inference or deploys."""
import argparse
import hashlib
import ipaddress
import json
import os
import socket
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlsplit

import httpx

from app.config import Settings
from tools.demo_accounts import ROOT

NETWORKS = tuple(map(ipaddress.ip_network, ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16')))
PENDING = [
    'Named human EN/HI/ML and code-mixed language/policy review with model provenance',
    'Disposition of the remaining dependency audit findings',
    'Final venue rehearsal, Android/iPhone evidence and screenshots for this candidate',
    'Approved final main integration, release tag and publication (not performed here)',
    'Ten consenting participants if pilot acceptance is claimed (not observed here)',
]


def private_host(host):
    address = ipaddress.ip_address(host)
    if address.version != 4 or not any(address in network for network in NETWORKS):
        raise ValueError('Use this computer\'s RFC1918 IPv4 address')
    return str(address)


def command(args):
    env = os.environ.copy()
    docker = Path(env.get('LOCALAPPDATA', '')) / 'Programs/DockerDesktop/resources/bin'
    if docker.exists():
        env['PATH'] = str(docker) + os.pathsep + env.get('PATH', '')
    result = subprocess.run(args, cwd=ROOT, env=env, capture_output=True,
                            text=True, timeout=60, check=False)
    if result.returncode:
        raise RuntimeError('Local command failed; private output omitted')
    return result.stdout


def source_snapshot():
    # Only Git-visible source, never ignored .env/.local/dependency files.
    paths = command(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'])
    hashes = {}
    for name in sorted(set(filter(None, paths.split('\0')))):
        path = ROOT / name
        if (path.name.startswith('.env') and path.name != '.env.example') or '.local' in path.parts:
            raise RuntimeError('Configuration/private artifact is Git-visible; resolve before freeze')
        if path.is_file():
            hashes[name] = hashlib.sha256(path.read_bytes()).hexdigest()
        else:
            hashes[name] = 'MISSING'
    digest = hashlib.sha256(json.dumps(hashes, sort_keys=True).encode()).hexdigest()
    return {'commit': command(['git', 'rev-parse', 'HEAD']).strip(),
            'branch': command(['git', 'branch', '--show-current']).strip(),
            'dirty': bool(command(['git', 'status', '--porcelain']).strip()),
            'source_sha256': digest, 'files': hashes}


def check_ledger(rows, versions):
    applied = [row['version'] for row in rows]
    if applied != sorted(versions):
        raise ValueError('Local applied migrations differ from the source ledger')
    return len(applied)


def check_manifest(data, host):
    expected = f'{host}:8086'
    if data['extra']['expoClient']['hostUri'] != expected:
        raise ValueError('Expo manifest advertises a stale host')
    asset = urlsplit(data['launchAsset']['url'])
    if (asset.scheme != 'http' or asset.netloc != expected or asset.username
            or not asset.path.endswith('.bundle')):
        raise ValueError('Expo bundle URL is not this local preview')


def check_bundle(content, host):
    for port in (54321, 8775):
        if f'http://{host}:{port}'.encode() not in content:
            raise ValueError('Compiled mobile backend address does not match current LAN')


def validate_config(path):
    config = Settings(_env_file=path)
    if (not config.local_demo_mode or not config.ai_demo_enabled
            or config.supabase_url != 'http://127.0.0.1:54321'
            or config.ai_language_review_passed):
        raise ValueError('Expected local demo configuration with automatic publication OFF')
    return 'Local demo; automatic publication OFF; provider settings preserved'


def collect(host):
    host = private_host(host)
    results = []

    def check(name, operation):
        try:
            detail = operation()
            results.append({'check': name, 'status': 'PASS', 'detail': detail or 'verified'})
        except (OSError, ValueError, KeyError, TypeError, RuntimeError,
                subprocess.SubprocessError, httpx.HTTPError):
            # Never serialize exceptions: settings, subprocess and HTTP details may contain secrets.
            results.append({'check': name, 'status': 'BLOCKED',
                            'detail': 'Not verified; inspect local setup using the P6 runbook'})

    def interface():
        with socket.socket() as probe:
            probe.bind((host, 0))
        return 'Address belongs to this computer'

    check('current_network_interface', interface)
    check('server_configuration', lambda: validate_config(ROOT / 'api/.env.ai-demo-run'))

    def ledger():
        value = command(['npx.cmd', '--yes', 'supabase@2.122.0', 'db', 'query', '--local',
                         'select version from supabase_migrations.schema_migrations order by version'])
        versions = [p.name.split('_', 1)[0] for p in (ROOT / 'supabase/migrations').glob('*.sql')]
        return f'{check_ledger(json.loads(value)["rows"], versions)} applied versions match source'

    check('local_migration_ledger', ledger)
    with httpx.Client(timeout=20, trust_env=False, follow_redirects=False) as client:
        def gateway():
            response = client.get(f'http://{host}:8775/health')
            response.raise_for_status()
            data = response.json()
            if data.get('status') != 'ok' or data.get('service') != 'samvad-api':
                raise ValueError('Unexpected gateway')
            return 'Liveness only; not provider or database readiness'

        def auth():
            response = client.get(f'http://{host}:54321/auth/v1/health')
            response.raise_for_status()
            return 'Local Auth health reachable from laptop via LAN address'

        check('gateway_liveness', gateway)
        check('local_auth_liveness', auth)
        for platform in ('android', 'ios'):
            def manifest(platform=platform):
                response = client.get(f'http://{host}:8086', headers={
                    'expo-platform': platform, 'accept': 'application/expo+json'})
                response.raise_for_status()
                data = response.json()
                check_manifest(data, host)
                bundle = client.get(data['launchAsset']['url'])
                bundle.raise_for_status()
                check_bundle(bundle.content, host)
                return 'Manifest and compiled backend addresses match; phone launch unobserved'
            check(f'{platform}_manifest', manifest)

    return {'generated_at': datetime.now(UTC).isoformat(), 'target': 'local-attended-demo',
            'preview': f'exp://{host}:8086', 'source': source_snapshot(), 'checks': results,
            'technical_preflight': 'PASS' if all(r['status'] == 'PASS' for r in results) else 'BLOCKED',
            'release_gate': 'PENDING', 'outstanding_acceptance': PENDING,
            'provider_inference_performed': False, 'hosted_changes_performed': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', required=True)
    args = parser.parse_args()
    try:
        report = collect(args.host)
        destination = ROOT / 'api/.local/p6-preflight.json'
        destination.parent.mkdir(exist_ok=True)
        destination.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
        for item in report['checks']:
            print(f'{item["status"]}: {item["check"]} — {item["detail"]}')
        print('Saved ignored api/.local/p6-preflight.json. Release sign-off remains PENDING.')
        return 0 if report['technical_preflight'] == 'PASS' else 1
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError):
        print('BLOCKED: preflight could not finish; private details omitted. No services were changed.')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
