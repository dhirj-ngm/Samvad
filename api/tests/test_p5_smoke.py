import asyncio

import httpx
import pytest

from tools.smoke_p5 import LocalOnlyTransport, cache_only_settings


@pytest.mark.parametrize('url', [
    'https://example.supabase.co', 'http://192.168.1.2:54321',
    'http://user:password@localhost:54321', 'http://localhost:54321/path',
])
def test_p5_transport_rejects_nonlocal_or_ambiguous_origins(url):
    with pytest.raises(ValueError):
        LocalOnlyTransport(url)


@pytest.mark.parametrize('url', [
    'https://api.sarvam.ai/translate', 'https://api.groq.com/openai/v1/models',
    'http://127.0.0.1:9999/rest/v1/posts', 'http://localhost:54321/rest/v1/posts',
    'http://user:pass@127.0.0.1:54321/rest/v1/posts',
])
def test_p5_transport_blocks_provider_or_wrong_database_requests(url):
    async def check():
        transport = LocalOnlyTransport('http://127.0.0.1:54321',
                                       inner=httpx.MockTransport(lambda _: pytest.fail('Network called')))
        async with httpx.AsyncClient(transport=transport) as client:
            with pytest.raises(RuntimeError, match='prohibits'):
                await client.get(url)
    asyncio.run(check())


def test_p5_transport_only_injects_cache_miss_not_source_or_authorization():
    calls = []

    def respond(request):
        calls.append(request.url.path)
        return httpx.Response(200, json={'real': True})

    async def check():
        transport = LocalOnlyTransport('http://127.0.0.1:54321', inner=httpx.MockTransport(respond))
        transport.force_cache_miss = True
        async with httpx.AsyncClient(transport=transport, base_url='http://127.0.0.1:54321') as client:
            result = await client.post('/rest/v1/rpc/ai_control', json={'p_operation': 'cache_get'})
            assert result.json() is None
            assert (await client.get('/auth/v1/user')).json() == {'real': True}
            assert (await client.get('/rest/v1/posts')).json() == {'real': True}
        assert calls == ['/auth/v1/user', '/rest/v1/posts']
    asyncio.run(check())


def test_p5_settings_disable_inference_and_publication_even_if_environment_enables_them(tmp_path, monkeypatch):
    path = tmp_path / 'local.env'
    path.write_text('LOCAL_DEMO_MODE=true\nAI_DEMO_ENABLED=true\n'
                    'SUPABASE_URL=http://127.0.0.1:54321\n', encoding='utf-8')
    for name in ['AI_ENABLED', 'SARVAM_ACCOUNT_USE_AUTHORIZED', 'AI_LANGUAGE_REVIEW_PASSED']:
        monkeypatch.setenv(name, 'true')
    config = cache_only_settings(path, 'http://127.0.0.1:54321')
    assert not config.ai_enabled
    assert not config.sarvam_account_use_authorized
    assert not config.ai_language_review_passed
    with pytest.raises(RuntimeError, match='matching local'):
        cache_only_settings(path, 'http://127.0.0.1:54322')
