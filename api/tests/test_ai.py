import json
import time
from uuid import uuid4

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

ACTOR = str(uuid4())
ENTITY = str(uuid4())
KEY = ec.generate_private_key(ec.SECP256R1())
JWK = json.loads(jwt.algorithms.ECAlgorithm.to_jwk(KEY.public_key())) | {'kid': 'test', 'alg': 'ES256'}
MODEL = 'test-qwen-model'


class Upstreams:
    def __init__(self):
        self.body = {'translated_text': 'नमस्ते 👋'}
        self.cache = {}
        self.calls = []
        self.provider_status = 200
        self.finish_reason = 'stop'
        self.source = {'id': ENTITY, 'body': 'നമസ്കാരം 👋', 'language': 'ml',
                       'author_id': ACTOR, 'moderation_state': 'pending', 'deleted_at': None}
        self.hidden = False
        self.quota_status = 200

    def handle(self, request):
        path = request.url.path
        if path.endswith('jwks.json'):
            return httpx.Response(200, json={'keys': [JWK]})
        if path == '/rest/v1/posts' or path == '/rest/v1/replies':
            assert request.headers['apikey'] == 'public-test-key'
            assert request.headers['authorization'] != 'Bearer private-service-test-key'
            return httpx.Response(200, json=[] if self.hidden else [self.source])
        if path == '/rest/v1/news_items':
            return httpx.Response(200, json=[{'id': ENTITY, 'title': 'Moon mission', 'excerpt': 'The mission landed.', 'source_url': 'https://example.org/source', 'language': 'en'}])
        if path.endswith('/ai_control'):
            assert request.headers['apikey'] == 'private-service-test-key'
            payload = json.loads(request.content)
            op, data = payload['p_operation'], payload['p_payload']
            self.calls.append(op)
            if op == 'reserve':
                return httpx.Response(self.quota_status, json={'id': str(uuid4())})
            if op == 'cache_get':
                return httpx.Response(200, content=json.dumps(self.cache.get(data['key'])))
            if op == 'cache_put':
                self.cache[data['key']] = data['result']
            return httpx.Response(200, json=True)
        if path.endswith('/models'):
            return httpx.Response(200, json={'data': [{'id': MODEL}]})
        if path.endswith('/chat/completions'):
            self.calls.append('provider')
            assert 'author_id' not in request.content.decode()
            return httpx.Response(self.provider_status, json={'choices': [{'finish_reason': self.finish_reason, 'message': {'content': json.dumps(self.body)}}]})
        raise AssertionError('Unexpected request route')


def token(**overrides):
    claims = {'sub': ACTOR, 'aud': 'authenticated', 'iss': 'https://example.supabase.co/auth/v1',
              'exp': time.time()+600, 'role': 'authenticated'} | overrides
    return jwt.encode(claims, KEY, algorithm='ES256', headers={'kid': 'test'})


@pytest.fixture
def setup():
    upstream = Upstreams()
    config = Settings(_env_file=None, supabase_url='https://example.supabase.co',
        supabase_public_key='public-test-key', supabase_service_role_key='private-service-test-key',
        ai_enabled=True, ai_free_plan_confirmed=True, ai_data_policy_confirmed=True,
        ai_language_review_passed=True, groq_api_key='provider-test-key',
        ai_translation_model=MODEL, ai_summary_model=MODEL, ai_moderation_model=MODEL)
    with TestClient(create_app(config, transport=httpx.MockTransport(upstream.handle))) as client:
        client.headers['Authorization'] = 'Bearer '+token()
        yield client, upstream


def translate(client, **changes):
    return client.post('/v1/translate', json={'entity_type': 'reply', 'entity_id': ENTITY, 'target_language': 'hi'} | changes)


@pytest.mark.parametrize('claims', [{'exp': 1}, {'iss': 'https://other.supabase.co/auth/v1'}, {'aud': 'wrong'}, {'role': 'service_role'}, {'sub': 'invalid'}])
def test_invalid_claims_denied(setup, claims):
    client, upstream = setup
    client.headers['Authorization'] = 'Bearer '+token(**claims)
    assert translate(client).status_code == 401
    assert not upstream.calls


def test_forged_and_unsigned_tokens_denied(setup):
    client, _ = setup
    for value in ['bad', jwt.encode({'sub': ACTOR}, 'wrong-key-with-enough-bytes-for-test', algorithm='HS256'), jwt.encode({'sub': ACTOR}, key='', algorithm='none')]:
        client.headers['Authorization'] = 'Bearer '+value
        assert translate(client).status_code == 401


def test_unicode_translation_cache_and_reauthorization(setup):
    client, upstream = setup
    first = translate(client)
    assert first.status_code == 200
    assert first.json()['translated_text'] == 'नमस्ते 👋'
    assert first.json()['provenance'] == 'live'
    assert translate(client).json()['provenance'] == 'cache'
    assert upstream.calls.count('provider') == 1
    upstream.hidden = True
    assert translate(client).status_code == 404


def test_same_language_returns_original_without_inference(setup):
    client, upstream = setup
    result = translate(client, target_language='ml')
    assert result.json()['provenance'] == 'original'
    assert result.json()['translated_text'] == upstream.source['body']
    assert not upstream.calls


@pytest.mark.parametrize('changes', [{'target_language': 'ta'}, {'entity_id': 'bad'}, {'user_id': ACTOR}, {'entity_type': 'profile'}])
def test_invalid_inputs_normalized_without_echo(setup, changes):
    client, _ = setup
    response = translate(client, **changes)
    assert response.status_code == 400
    assert set(response.json()) == {'error'}


@pytest.mark.parametrize('status', [429, 500, 401])
def test_provider_errors_fail_safely(setup, status):
    client, upstream = setup
    upstream.provider_status = status
    result = translate(client)
    assert result.status_code == (429 if status == 429 else 503)
    assert upstream.calls.count('provider') == 1
    assert 'release' in upstream.calls
    assert not upstream.cache


def test_budget_denial_never_calls_provider(setup):
    client, upstream = setup
    upstream.quota_status = 429
    assert translate(client).status_code == 429
    assert 'provider' not in upstream.calls


@pytest.mark.parametrize('bad', [{'translated_text': ''}, {'translated_text': 'ok', 'extra': 'injected'}, {'wrong': 'value'}])
def test_malformed_output_not_cached(setup, bad):
    client, upstream = setup
    upstream.body = bad
    assert translate(client).status_code == 503
    assert not upstream.cache


def test_truncated_output_is_not_a_success(setup):
    client, upstream = setup
    upstream.finish_reason = 'length'
    assert translate(client).status_code == 503


def test_exactly_three_source_based_brief_lines(setup):
    client, upstream = setup
    upstream.body = {'lines': ['One', 'Two', 'Three']}
    response = client.post('/v1/summarize-news', json={'news_item_id': ENTITY, 'target_language': 'en'})
    assert response.status_code == 200
    assert response.json()['basis'] == 'headline_excerpt'
    assert response.json()['source_url'] == 'https://example.org/source'


@pytest.mark.parametrize('lines', [['One', 'Two'], ['One', 'Two', 'Three', 'Four'], ['One\nTwo', 'Three', 'Four']])
def test_invalid_brief_rejected(setup, lines):
    client, upstream = setup
    upstream.body = {'lines': lines}
    assert client.post('/v1/summarize-news', json={'news_item_id': ENTITY, 'target_language': 'en'}).status_code == 503


@pytest.mark.parametrize('body,expected', [
    ({'status': 'allowed', 'reason_code': 'none', 'confidence': .99, 'needs_review': False}, 'allowed'),
    ({'status': 'blocked', 'reason_code': 'harassment', 'confidence': .99, 'needs_review': False}, 'flagged'),
    ({'status': 'allowed', 'reason_code': 'none', 'confidence': .4, 'needs_review': False}, 'flagged'),
])
def test_moderation_publication_is_controlled(setup, body, expected):
    client, upstream = setup
    upstream.body = body
    response = client.post('/v1/moderate', json={'entity_type': 'reply', 'entity_id': ENTITY})
    assert response.status_code == 200
    assert response.json()['status'] == expected
    assert 'moderate_commit' in upstream.calls


def test_other_author_cannot_request_moderation(setup):
    client, upstream = setup
    upstream.source['author_id'] = str(uuid4())
    assert client.post('/v1/moderate', json={'entity_type': 'reply', 'entity_id': ENTITY}).status_code == 403
    assert not upstream.calls


def test_malformed_moderation_never_publishes(setup):
    client, upstream = setup
    upstream.body = {'status': 'allowed'}
    assert client.post('/v1/moderate', json={'entity_type': 'reply', 'entity_id': ENTITY}).status_code == 503
    assert 'moderate_commit' not in upstream.calls


def test_missing_free_plan_confirmation_prevents_inference(setup):
    client, upstream = setup
    client.app.state.ai.config.ai_free_plan_confirmed = False
    assert translate(client).status_code == 503
    assert 'provider' not in upstream.calls


def test_language_policy_release_gate_keeps_moderation_pending(setup):
    client, upstream = setup
    client.app.state.ai.config.ai_language_review_passed = False
    assert client.post('/v1/moderate', json={'entity_type': 'reply', 'entity_id': ENTITY}).status_code == 503
    assert not upstream.calls


def test_missing_model_does_not_fall_back(setup):
    client, upstream = setup
    client.app.state.ai.model_catalog = {'another-model'}
    assert translate(client).status_code == 503
    assert 'provider' not in upstream.calls


def test_deleted_content_never_returns_cached_translation(setup):
    client, upstream = setup
    assert translate(client).status_code == 200
    upstream.source['deleted_at'] = '2026-10-24T00:00:00Z'
    upstream.source['body'] = ''
    assert translate(client).status_code == 404
