"""Local-only requested demo account provisioning. No emails or passwords printed."""
import json
import os
import secrets
import subprocess
from pathlib import Path

import httpx

from tools.prepare_local_p45 import local_origin

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / 'api/.local/demo-accounts.json'


def local_status():
    env = os.environ.copy()
    docker = Path(os.environ.get('LOCALAPPDATA', '')) / 'Programs/DockerDesktop/resources/bin'
    if docker.exists():
        env['PATH'] = str(docker) + os.pathsep + env.get('PATH', '')
    r = subprocess.run(['npx.cmd', '--yes', 'supabase@2.122.0', 'status', '--output', 'json'],
                       cwd=ROOT, env=env, capture_output=True, text=True, timeout=60, check=False)
    if r.returncode:
        raise RuntimeError('Start local Supabase first')
    status = json.loads(r.stdout)
    local_origin(status['API_URL'])
    return status


def session_for(client, account, admin):
    # Admin-generated local magic link sends no email and changes no password.
    r = client.post('/auth/v1/admin/generate_link', headers=admin,
                    json={'type': 'magiclink', 'email': account['email']})
    r.raise_for_status()
    hashed = r.json().get('hashed_token')
    if not hashed:
        raise RuntimeError('Local account session could not be prepared')
    r = client.post('/auth/v1/verify', json={'type': 'magiclink', 'token_hash': hashed})
    r.raise_for_status()
    return {'Authorization': 'Bearer ' + r.json()['access_token']}


def initialize_mapping():
    """Fresh local installs only; refuse to replace any existing account mapping."""
    PRIVATE.parent.mkdir(exist_ok=True)
    accounts = [
        {'email': f'p6-{role}@samvad.test', 'handle': handle, 'language': language,
         'password': secrets.token_urlsafe(24)}
        for role, handle, language in [
            ('a', 'demo_ananya', 'ml'), ('b', 'demo_aarav', 'hi'),
            ('c', 'demo_meera', 'en'), ('d', 'demo_faiz', 'en')]
    ]
    data = {'accounts': accounts[:3], 'existing': accounts[3], 'managed_existing': True}
    with PRIVATE.open('x', encoding='utf-8') as stream:
        json.dump(data, stream, ensure_ascii=False, indent=2)


def prepare():
    status = local_status()
    data = json.loads(PRIVATE.read_text(encoding='utf-8'))
    admin = {'apikey': status['SERVICE_ROLE_KEY'],
             'Authorization': 'Bearer ' + status['SERVICE_ROLE_KEY']}
    with httpx.Client(base_url=status['API_URL'], headers={'apikey': status['ANON_KEY']},
                      timeout=15, trust_env=False) as client:
        users = client.get('/auth/v1/admin/users', headers=admin, params={'per_page': 100})
        users.raise_for_status()
        by_email = {u['email'].casefold(): u for u in users.json()['users']}
        profiles = client.get('/rest/v1/profiles', params={'select': 'user_id,handle,preferred_language'})
        profiles.raise_for_status()
        profiles = {p['user_id']: p for p in profiles.json()}
        requested = {a['email'].casefold() for a in data['accounts'] if a.get('email')}
        existing = [u for u in by_email.values() if u['email'].casefold() not in requested
                    and u['id'] in profiles and not profiles[u['id']]['handle'].startswith('local_p45_')]
        if not data.get('existing'):
            if len(existing) != 1:
                raise RuntimeError('Choose the existing fourth profile explicitly; no accounts overwritten')
            u = existing[0]
            data['existing'] = {'id': u['id'], 'email': u['email'],
                                'handle': profiles[u['id']]['handle'], 'language': profiles[u['id']]['preferred_language']}
        managed = data['accounts'] + ([data['existing']] if data.get('managed_existing') else [])
        for account in managed:
            user = by_email.get(account['email'].casefold())
            if user and data.get('managed_existing'):
                # A fresh-install mapping must never adopt an unrelated pre-existing account.
                login = client.post('/auth/v1/token', params={'grant_type': 'password'},
                                    json={'email': account['email'], 'password': account['password']})
                login.raise_for_status()
                client.post('/auth/v1/logout', params={'scope': 'local'}, headers={
                    'Authorization': 'Bearer ' + login.json()['access_token']}).raise_for_status()
            if not user:
                account.setdefault('password', secrets.token_urlsafe(20))
                PRIVATE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
                r = client.post('/auth/v1/admin/users', headers=admin, json={
                    'email': account['email'], 'password': account['password'], 'email_confirm': True})
                r.raise_for_status()
                user = r.json()
            account['id'] = user['id']
            original = profiles.get(user['id'])
            if original and original['handle'] != account['handle']:
                raise RuntimeError('Existing profile conflicts with requested handle; no profile overwritten')
            headers = session_for(client, account, admin)
            try:
                if not original:
                    r = client.post('/rest/v1/rpc/social', headers=headers,
                        json={'p_action': 'save_profile', 'p_payload': {
                            'handle': account['handle'], 'display_name': account['handle'],
                            'bio': 'Samvad demo participant', 'language': account['language'],
                            'interests': [], 'avatar_path': None}})
                    r.raise_for_status()
            finally:
                client.post('/auth/v1/logout', params={'scope': 'local'}, headers=headers)
            PRIVATE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
        # The preserved fourth account is the demo operator; old reviewer stays intact.
        def grant_sql():
            from uuid import UUID
            return f"insert into samvad_internal.review_admins(user_id) values ('{UUID(data['existing']['id'])}') on conflict do nothing"
        env = os.environ.copy()
        docker = Path(os.environ.get('LOCALAPPDATA', '')) / 'Programs/DockerDesktop/resources/bin'
        env['PATH'] = str(docker) + os.pathsep + env.get('PATH', '')
        r = subprocess.run(['npx.cmd', '--yes', 'supabase@2.122.0', 'db', 'query', '--local', grant_sql()],
                           cwd=ROOT, env=env, capture_output=True, text=True, timeout=60, check=False)
        if r.returncode:
            raise RuntimeError('Local reviewer setup not confirmed')
    print('PASS: local demo profiles prepared; existing accounts/passwords preserved.')
    print('Private login/mapping sheet: api/.local/demo-accounts.json (ignored).')


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fresh-local', action='store_true',
                        help='Create a NEW private four-account mapping; refuses an existing mapping')
    args = parser.parse_args()
    try:
        if args.fresh_local:
            local_status()  # Guard against missing or nonlocal Supabase before generating anything.
            initialize_mapping()
        prepare()
    except (OSError, RuntimeError, ValueError, KeyError, httpx.HTTPError, subprocess.SubprocessError):
        # HTTP exception messages can echo request details; keep diagnostic generic.
        print('BLOCKED: local account preparation incomplete; inspect environment/mapping without printing secrets.')
        raise SystemExit(1) from None
