"""Hosted Auth/RLS through the real P4 API; live inference is a separate explicit opt-in."""

import argparse

import httpx
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from tools.check_identity import IdentityCheckError, checked_json, load_config, require

FIXTURE = '5172a1cb-ef3f-4b7e-8148-e9139c1ddb14'


def run_checks(config, live_inference=False):
    values = Settings().model_dump()
    values.update(supabase_url=config.url, supabase_public_key=config.public_key)
    settings = Settings(_env_file=None, **values)
    app = create_app(settings)
    results = []
    with TestClient(app) as api, httpx.Client(base_url=config.url,
        headers={'apikey': config.public_key}, timeout=20, trust_env=False) as client:
        require(api.post('/v1/translate', json={}).status_code == 401, 'Anonymous AI request accepted')
        for email, password in [(config.email_a, config.password_a), (config.email_b, config.password_b)]:
            session = checked_json(client.post('/auth/v1/token', params={'grant_type': 'password'},
                json={'email': email, 'password': password}), {200}, 'Dedicated login')
            headers = {'Authorization': 'Bearer '+session['access_token']}
            try:
                payload = {'entity_type': 'reply', 'entity_id': FIXTURE, 'target_language': 'ml'}
                result = checked_json(api.post('/v1/translate', headers=headers, json=payload), {200}, 'Verified JWT source read')
                require(result['provenance'] == 'original' and bool(result['translated_text']), 'Same-language source not preserved')
                if live_inference:
                    payload['target_language'] = 'hi'
                    first = checked_json(api.post('/v1/translate', headers=headers, json=payload), {200}, 'Live/cache translation')
                    second = checked_json(api.post('/v1/translate', headers=headers, json=payload), {200}, 'Translation cache')
                    require(first['translated_text'] == second['translated_text'] and second['is_cached'], 'Translation cache mismatch')
                results.append('Verified real user JWT, caller-RLS source read and exact same-language original')
            finally:
                require(client.post('/auth/v1/logout', headers=headers, params={'scope': 'local'}).status_code in {200, 204}, 'Logout failed')
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live-inference', action='store_true')
    args = parser.parse_args()
    try:
        config = load_config()
        if config is None:
            raise IdentityCheckError('Dedicated development configuration required')
        for result in run_checks(config, args.live_inference):
            print('PASS: '+result)
        if args.live_inference:
            print('PASS: live/cached translation and cache reuse; semantic language review still required')
    except (IdentityCheckError, httpx.HTTPError):
        print('BLOCKED/FAIL: P4 live configuration, authorization or inference check did not complete. No secrets printed.')
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
