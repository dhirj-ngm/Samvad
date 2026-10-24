"""Repeatable local P5 smoke. Never invokes an external AI provider or resets data."""
import json
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from tools.demo_accounts import PRIVATE, ROOT, local_status, session_for
from tools.demo_data import STATE
from tools.demo_data import run as verify_fixtures
from tools.prepare_local_p45 import local_origin
from tools.smoke_ai_demo import run as smoke_submission


class LocalOnlyTransport(httpx.AsyncBaseTransport):
    """Only the exact loopback DB origin is reachable, even if AI code regresses."""

    def __init__(self, origin, inner=None):
        self.origin = httpx.URL(local_origin(origin))
        self.inner = inner if inner is not None else httpx.AsyncHTTPTransport()
        self.force_cache_miss = False

    async def handle_async_request(self, request):
        url = request.url
        if (url.scheme, url.host, url.port) != (
                self.origin.scheme, self.origin.host, self.origin.port) or url.userinfo:
            raise RuntimeError('P5 smoke prohibits non-database network requests')
        if self.force_cache_miss and url.path == '/rest/v1/rpc/ai_control':
            payload = json.loads(request.content)
            if payload.get('p_operation') == 'cache_get':
                return httpx.Response(200, content=b'null', headers={'Content-Type': 'application/json'})
        return await self.inner.handle_async_request(request)

    async def aclose(self):
        await self.inner.aclose()


def cache_only_settings(path: Path, origin: str):
    config = Settings(_env_file=path, ai_enabled=False,
                      sarvam_account_use_authorized=False, ai_language_review_passed=False)
    if (not config.local_demo_mode or not config.ai_demo_enabled
            or local_origin(config.supabase_url) != local_origin(origin)):
        raise RuntimeError('P5 smoke requires the matching local demo database')
    return config


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def cache_checks():
    status = local_status()
    config = cache_only_settings(ROOT / 'api/.env.ai-demo-run', status['API_URL'])
    people = json.loads(PRIVATE.read_text(encoding='utf-8'))
    state = json.loads(STATE.read_text(encoding='utf-8'))
    require(state['origin'] == config.supabase_url, 'Fixture database does not match')
    admin = {'apikey': status['SERVICE_ROLE_KEY'],
             'Authorization': 'Bearer ' + status['SERVICE_ROLE_KEY']}
    with httpx.Client(base_url=config.supabase_url, headers={'apikey': status['ANON_KEY']},
                      timeout=25, trust_env=False, follow_redirects=False) as db:
        headers = session_for(db, people['accounts'][1], admin)
        try:
            transport = LocalOnlyTransport(config.supabase_url)
            with TestClient(create_app(config, transport=transport)) as api:
                api.headers.update(headers)
                for key, target in [('T1', 'en'), ('T1-reply-0', 'en'), ('T1-reply-1', 'hi')]:
                    item = state['items'][key]
                    response = api.post('/v1/translate', json={'entity_type': item['kind'],
                        'entity_id': item['id'], 'target_language': target})
                    require(response.status_code == 200 and response.json().get('provenance') == 'cache',
                            'Prepared translation cache is unavailable')
                    print(f'PASS: persisted translation cache {key} -> {target}; inference disabled')
                for target in ['en', 'hi', 'ml']:
                    response = api.post('/v1/summarize', json={'entity_type': 'post',
                        'entity_id': state['items']['T2']['id'], 'target_language': target})
                    data = response.json()
                    require(response.status_code == 200 and data.get('is_cached')
                            and data.get('provenance') == 'cache', 'Prepared summary cache unavailable')
                    require(4 <= len(data['english_lines']) <= 5
                            and len(data['native_lines']) == len(data['english_lines'])
                            and data['native_status'] == ('original' if target == 'en' else 'available'),
                            'Summary language/line alignment is unavailable')
                    print(f'PASS: persisted {target} summary and aligned lines; inference disabled')
                response = api.post('/v1/translate', json={'entity_type': 'reply',
                    'entity_id': state['items']['T4-held']['id'], 'target_language': 'en'})
                require(response.status_code == 404, 'Held source authorization failed')
                print('PASS: held source cannot be translated by another account')
                # Force only the cache lookup to miss: real Auth/source authorization remain active.
                transport.force_cache_miss = True
                item = state['items']['T1']
                response = api.post('/v1/translate', json={'entity_type': 'post',
                    'entity_id': item['id'], 'target_language': 'hi'})
                require(response.status_code == 503
                        and response.json()['error']['code'] == 'translation_unavailable',
                        'Provider-disabled cache miss was not normalized')
                original = db.get('/rest/v1/posts', headers=headers,
                                  params={'id': 'eq.' + item['id'], 'select': 'body'})
                require(original.status_code == 200 and original.json()
                        and original.json()[0]['body'], 'Original is unavailable after AI failure')
                print('PASS: injected cache miss returns safe 503; real original remains readable')
        finally:
            db.post('/auth/v1/logout', headers=headers, params={'scope': 'local'}).raise_for_status()
    return config


def run():
    # Read-only readiness before the submission harness creates its owner-cleaned temporary post.
    config = cache_checks()
    verify_fixtures('verify')
    with TestClient(create_app(config, transport=LocalOnlyTransport(config.supabase_url))) as api:
        smoke_submission(api_client=api)


if __name__ == '__main__':
    try:
        run()
    except (RuntimeError, ValueError, KeyError, OSError, httpx.HTTPError, AssertionError):
        print('BLOCKED/FAIL: P5 local smoke incomplete. Check local services, caches and fixtures; '
              'no reset or provider prewarm is performed automatically. Private details omitted.')
        raise SystemExit(1) from None
