import asyncio
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.main import create_app
from app.services.ai_provider import AIUnavailable, GroqProviderSkeleton, InferenceRequest


@pytest.fixture(autouse=True)
def isolated_environment(monkeypatch):
    import os

    for key in list(os.environ):
        if key.lower() in Settings.model_fields:
            monkeypatch.delenv(key)


def test_health_without_credentials():
    with TestClient(create_app(Settings(_env_file=None))) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {
            "status": "ok", "service": "samvad-api", "phase": "P4",
            "checks": {"settings": "valid", "supabase": "not_configured", "ai": "disabled_or_missing_configuration"},
        }
        assert client.post("/v1/translate", json={}).status_code == 401


def test_configured_is_not_ready_and_secrets_are_not_exposed():
    settings = Settings(_env_file=None, supabase_url="https://example.supabase.co",
                        groq_api_key="test-secret-do-not-log")
    with TestClient(create_app(settings)) as client:
        response = client.get("/health")
        assert response.json()["checks"]["supabase"] == "not_checked"
        assert "test-secret" not in response.text
        assert "example.supabase.co" not in response.text


@pytest.mark.parametrize("values", [
    {"ai_free_tier_only": False}, {"ai_allow_paid_fallback": True},
    {"ai_provider": "google"}, {"ai_base_url": "https://other.example"},
    {"ai_max_requests_per_minute": 0}, {"ai_max_requests_per_day": 101},
    {"ai_max_tokens_per_minute": 0}, {"ai_max_tokens_per_day": 50001},
    {"ai_max_concurrent_requests": 2}, {"ai_max_input_chars": 6001},
    {"ai_max_output_tokens": 513}, {"ai_request_timeout_seconds": 21},
    {"ai_max_requests_per_day": 1}, {"ai_max_tokens_per_day": 100},
    {"ai_max_tokens_per_minute": 100},
    {"supabase_url": "http://example.supabase.co"},
    {"supabase_url": "https://user:password@example.supabase.co"},
    {"supabase_url": "https://example.supabase.co/auth/v1"},
    {"supabase_jwks_url": "https://example.supabase.co/keys"},
    {"supabase_url": "https://example.supabase.co",
     "supabase_jwks_url": "https://other.supabase.co/auth/v1/.well-known/jwks.json"},
    {"allowed_origins": ["*"]}, {"allowed_origins": ["http://192.168.1.5"]},
])
def test_unsafe_settings_rejected(values):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **values)


def test_environment_is_validated(monkeypatch):
    monkeypatch.setenv("AI_ALLOW_PAID_FALLBACK", "true")
    with pytest.raises(ValidationError):
        create_app()


def test_template_loads():
    settings = Settings(_env_file=Path(__file__).parents[1] / ".env.example")
    assert settings.demo_mode is False
    assert settings.ai_translation_model
    assert not settings.groq_api_key.get_secret_value()


def test_provider_fails_closed():
    request = InferenceRequest("translation", "നമസ്കാരം 👋", "hi")
    with pytest.raises(AIUnavailable, match="not implemented in P0"):
        asyncio.run(GroqProviderSkeleton().generate(request))


def test_cors_only_allows_configured_origin():
    settings = Settings(_env_file=None, allowed_origins=["https://client.example"])
    with TestClient(create_app(settings)) as client:
        allowed = client.get("/health", headers={"Origin": "https://client.example"})
        denied = client.get("/health", headers={"Origin": "https://unknown.example"})
        assert allowed.headers["access-control-allow-origin"] == "https://client.example"
        assert "access-control-allow-origin" not in denied.headers
