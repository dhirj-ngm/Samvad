"""Start an explicitly local AI rehearsal without changing existing .env files."""
import argparse
import ipaddress
import json
import os
import socket
import subprocess
import sys

from dotenv import dotenv_values

from app.config import Settings
from tools.demo_accounts import ROOT, local_status


def start(host, mobile=False, review_approved=False, cache_only=False):
    if cache_only and review_approved:
        raise ValueError('Cache-only rehearsal cannot approve automatic publication')
    address = ipaddress.ip_address(host)
    networks = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']
    if address.version != 4 or not any(address in ipaddress.ip_network(n) for n in networks):
        raise ValueError('Use this computer\'s private LAN address')
    with socket.socket() as interface:
        interface.bind((host, 0))  # Refuse a disconnected hotspot or stale LAN address.
    port = 8086 if mobile else 8775
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', port)) == 0:
            raise ValueError(f'Port {port} is occupied; existing services were preserved')
    local = ROOT / 'api/.local'
    local.mkdir(exist_ok=True)
    env = os.environ.copy()
    if mobile:
        status = local_status()
        env.update(EXPO_NO_DOTENV='1', EXPO_PUBLIC_AI_DEMO='true',
                   EXPO_PUBLIC_LOCAL_DEMO='true', EXPO_PUBLIC_SUPABASE_URL=f'http://{host}:54321',
                   EXPO_PUBLIC_SUPABASE_ANON_KEY=status['ANON_KEY'],
                   EXPO_PUBLIC_API_BASE_URL=f'http://{host}:8775', REACT_NATIVE_PACKAGER_HOSTNAME=host,
                   CI='1')
        command = ['npm.cmd', 'exec', '--', 'expo', 'start', '--lan', '--port', '8086']
        cwd = ROOT / 'mobile'
    else:
        values = dict(dotenv_values(ROOT / 'api/.env'))
        values.update(dotenv_values(ROOT / 'api/.env.ai-demo-inputs'))
        # Retain only recognized application settings; never carry hosted credentials forward.
        known = {key.upper() for key in Settings.model_fields}
        values = {key: value for key, value in values.items() if key in known and value is not None}
        status = local_status()
        values.update(LOCAL_DEMO_MODE='true', AI_DEMO_ENABLED='true', AI_ENABLED='true',
                      AI_LANGUAGE_REVIEW_PASSED='true' if review_approved else 'false', DEMO_MODE='true',
                      SUPABASE_URL=status['API_URL'], SUPABASE_PUBLIC_KEY=status['ANON_KEY'],
                      SUPABASE_SERVICE_ROLE_KEY=status['SERVICE_ROLE_KEY'],
                      SUPABASE_JWKS_URL=status['API_URL']+'/auth/v1/.well-known/jwks.json')
        if cache_only:
            values.update(AI_ENABLED='false', SARVAM_ACCOUNT_USE_AUTHORIZED='false')
        config = Settings(_env_file=None, **{k.lower(): v for k, v in values.items()})
        if not cache_only and (not config.groq_api_key.get_secret_value()
                               or not config.sarvam_api_key.get_secret_value()):
            raise ValueError('Provider credentials are missing')
        # JSON strings are valid dotenv values and preserve lists safely.
        (ROOT / 'api/.env.ai-demo-run').write_text(
            '\n'.join(k+'='+json.dumps(v) for k, v in values.items())+'\n', encoding='utf-8')
        env.update(values)
        command = [sys.executable, '-m', 'uvicorn', 'app.main:create_app', '--factory',
                   '--host', '0.0.0.0', '--port', '8775', '--no-access-log']
        cwd = ROOT / 'api'
    label = 'metro' if mobile else 'gateway'
    with (local / f'ai-demo-{label}.log').open('ab') as output:
        child = subprocess.Popen(command, cwd=cwd, env=env, stdout=output, stderr=output,
                                 stdin=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW)
    (local / f'ai-demo-{label}.pid').write_text(str(child.pid), encoding='ascii')
    print(f'Started local {label}: PID {child.pid}, port {port}. Provider keys remain private.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', required=True)
    parser.add_argument('--mobile', action='store_true')
    parser.add_argument('--cache-only', action='store_true',
                        help='Disable external inference; missing caches remain unavailable')
    parser.add_argument('--review-approved', action='store_true',
                        help='Operator attests documented human EN/HI/ML policy review has passed')
    args = parser.parse_args()
    start(args.host, args.mobile, args.review_approved, args.cache_only)
