import json

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from test_ai import ACTOR, ENTITY, MODEL, Upstreams, token

from app.ai import Failure
from app.config import Settings
from app.demo_ai import chunks
from app.main import create_app


class DemoUpstreams(Upstreams):
    def __init__(self):
        super().__init__()
        self.sarvam_status = 200
        self.sarvam_reservations = []
        self.saved = 0
        self.sarvam_text = None

    def handle(self, request):
        path = request.url.path
        if path == '/translate':
            self.calls.append('sarvam')
            assert request.headers['api-subscription-key'] == 'sarvam-test-key'
            data = json.loads(request.content)
            assert len(data['input']) <= 2000
            text = self.sarvam_text or ('Hello, welcome.' if data['target_language_code'] == 'en-IN' else 'नमस्ते, आपका स्वागत है।')
            return httpx.Response(self.sarvam_status, json={'translated_text': text, 'request_id': 'test'})
        if path.endswith('/demo_ai_control'):
            assert request.headers['apikey'] == 'private-service-test-key'
            self.sarvam_reservations.append(json.loads(request.content)['p_payload'])
            return httpx.Response(200, json={'id': 'reservation'})
        if path.endswith('/submit_post'):
            assert request.headers['apikey'] == 'public-test-key'
            assert request.headers['authorization'] == 'Bearer ' + token_value
            self.saved += 1
            return httpx.Response(200, json={'id': ENTITY, 'conversation_id': ENTITY,
                                            'moderation_state': 'pending', 'deleted': False})
        return super().handle(request)


token_value = token()


@pytest.fixture
def demo():
    upstream = DemoUpstreams()
    config = Settings(_env_file=None, supabase_url='https://example.supabase.co',
        supabase_public_key='public-test-key', supabase_service_role_key='private-service-test-key',
        ai_enabled=True, ai_free_plan_confirmed=True, ai_data_policy_confirmed=True,
        ai_demo_enabled=True, sarvam_api_key='sarvam-test-key', sarvam_account_use_authorized=True,
        sarvam_max_credit_inr=50, sarvam_max_characters=10000,
        ai_language_review_passed=True, groq_api_key='provider-test-key',
        ai_translation_model=MODEL, ai_summary_model=MODEL, ai_moderation_model=MODEL)
    with TestClient(create_app(config, transport=httpx.MockTransport(upstream.handle))) as client:
        client.headers['Authorization'] = 'Bearer ' + token_value
        yield client, upstream, config


def test_chunks_preserve_unicode_whitespace_and_long_unbroken_inputs():
    text = ('മലയാളം 👋. ' * 300) + ('X' * 2500)
    parts = chunks(text)
    assert ''.join(parts) == text
    assert all(0 < len(p) <= 2000 for p in parts)


def test_sarvam_caches_and_reauthorizes_source(demo):
    client, upstream, _ = demo
    payload = {'entity_type': 'post', 'entity_id': ENTITY, 'target_language': 'hi'}
    assert client.post('/v1/translate', json=payload).json()['provenance'] == 'live'
    assert client.post('/v1/translate', json=payload).json()['provenance'] == 'cache'
    assert upstream.calls.count('sarvam') == 1
    assert upstream.sarvam_reservations[0]['cap'] == 9968
    upstream.hidden = True
    assert client.post('/v1/translate', json=payload).status_code == 404


@pytest.mark.parametrize('status', [402, 429, 503])
def test_translation_failure_never_fabricates_result(demo, status):
    client, upstream, _ = demo
    upstream.sarvam_status = status
    result = client.post('/v1/translate', json={'entity_type': 'post', 'entity_id': ENTITY, 'target_language': 'hi'})
    assert result.status_code in {429, 503}
    assert 'translated_text' not in result.json()


def test_server_submission_retains_confirmed_save_when_screening_fails(demo):
    client, upstream, _ = demo
    upstream.sarvam_status = 503
    result = client.post('/v1/submit-and-screen', json={
        'entity_type': 'post', 'request_id': ENTITY, 'body': 'Hello', 'language': 'en'})
    assert result.status_code == 202
    assert result.json()['saved'] is True and result.json()['id'] == ENTITY
    assert result.json()['moderation_state'] == 'pending'
    assert result.json()['retryable'] is True


def test_evaluation_gate_makes_no_provider_call(demo):
    client, upstream, config = demo
    config.ai_language_review_passed = False
    response = client.post('/v1/submit-and-screen', json={
        'entity_type': 'post', 'request_id': ENTITY, 'body': 'Hello', 'language': 'en'})
    assert response.status_code == 202
    assert response.json()['screening_status'] == 'evaluation_pending'
    assert 'sarvam' not in upstream.calls and 'provider' not in upstream.calls


def test_summary_returns_english_when_native_translation_unavailable(demo):
    client, upstream, _ = demo
    upstream.source['body'] = ' '.join(['A proposal for a small trial with voluntary feedback.'] * 7)
    upstream.body = {'lines': ['Test a small trial.', 'Ask for voluntary feedback.',
                               'Keep personal data private.', 'Compare the alternatives.'], 'insufficient_source': False}
    upstream.sarvam_status = 503
    payload = {'entity_type': 'post', 'entity_id': ENTITY, 'target_language': 'hi'}
    result = client.post('/v1/summarize', json=payload)
    assert result.status_code == 200
    assert len(result.json()['english_lines']) == 4
    assert result.json()['native_status'] == 'unavailable'
    repeated = client.post('/v1/summarize', json=payload).json()
    assert repeated['english_provenance'] == 'cache'
    assert repeated['provenance'] == 'cache'
    assert repeated['native_provenance'] == 'unavailable'
    assert upstream.calls.count('provider') == 1


def test_insufficient_source_avoids_provider_call(demo):
    client, upstream, _ = demo
    result = client.post('/v1/summarize', json={'entity_type': 'news', 'entity_id': ENTITY, 'target_language': 'en'})
    assert result.status_code == 400
    assert result.json()['error']['code'] == 'insufficient_source'
    assert 'provider' not in upstream.calls


def test_local_http_requires_explicit_loopback_configuration():
    assert Settings(_env_file=None, local_demo_mode=True,
                    supabase_url='http://127.0.0.1:54321').local_demo_mode
    for url in ['http://example.org', 'https://example.org']:
        with pytest.raises(ValidationError):
            Settings(_env_file=None, local_demo_mode=True, supabase_url=url)


@pytest.mark.parametrize('payload', [
    {'entity_type': 'post', 'user_id': ACTOR},
    {'entity_type': 'reply', 'body': 'Reply', 'language': 'en', 'request_id': ENTITY},
])
def test_invalid_or_forged_submission_rejected(demo, payload):
    client, upstream, _ = demo
    assert client.post('/v1/submit-and-screen', json=payload).status_code == 400
    assert upstream.saved == 0


def test_partial_native_summary_is_cleared_and_english_is_reusable(demo, monkeypatch):
    client, upstream, _ = demo
    upstream.source['body'] = ' '.join(['A proposal for a small trial with voluntary feedback.'] * 7)
    upstream.body = {'lines': ['Try a small trial.', 'Ask for feedback.',
                               'Keep data private.', 'Compare alternatives.'], 'insufficient_source': False}
    calls = []

    async def partial(text, source, target, actor, entity):
        calls.append(entity)
        if entity.endswith(':summary'):
            return 'एक पंक्ति', True  # Wrong line count invokes per-line recovery.
        if entity.endswith(':summary:0'):
            return 'पहली पंक्ति', True
        raise Failure(503, 'translation_unavailable')

    monkeypatch.setattr(client.app.state.ai, 'translate_text', partial)
    payload = {'entity_type': 'post', 'entity_id': ENTITY, 'target_language': 'hi'}
    first = client.post('/v1/summarize', json=payload).json()
    assert first['native_status'] == 'unavailable'
    assert first['native_lines'] == []
    assert first['english_provenance'] == 'live'
    repeated = client.post('/v1/summarize', json=payload).json()
    assert repeated['is_cached'] is True
    assert repeated['native_lines'] == []
    assert repeated['provenance'] == 'cache'
    assert repeated['native_provenance'] == 'unavailable'
    assert upstream.calls.count('provider') == 1


def test_joined_translation_cannot_exceed_output_limit_or_enter_cache(demo):
    client, upstream, _ = demo
    upstream.source['body'] = 'Hello ' * 500
    upstream.source['language'] = 'en'
    upstream.sarvam_text = 'ह' * 5000
    response = client.post('/v1/translate', json={
        'entity_type': 'post', 'entity_id': ENTITY, 'target_language': 'hi'})
    assert response.status_code == 503
    assert not upstream.cache


def test_blank_review_reason_is_a_normalized_validation_error(demo):
    client, upstream, _ = demo
    response = client.post('/v1/review', json={'entity_type': 'post', 'entity_id': ENTITY,
        'request_id': ENTITY, 'action': 'approve', 'reason': ' \n ',
        'source_hash': 'a' * 64, 'expected_state': 'pending'})
    assert response.status_code == 400
    assert response.json()['error']['code'] == 'invalid_request'
    assert not upstream.calls
