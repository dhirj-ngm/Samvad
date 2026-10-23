import base64
import json

import pytest

from tools.check_identity import IdentityCheckError, is_public_key, load_config


@pytest.mark.parametrize("role,expected", [("anon", True), ("service_role", False),
                                          ("authenticated", False)])
def test_harness_refuses_privileged_client_keys(role, expected):
    payload = base64.urlsafe_b64encode(json.dumps({"role": role}).encode()).decode().rstrip("=")
    assert is_public_key(f"header.{payload}.signature") is expected


def test_harness_missing_credentials_is_blocked(monkeypatch):
    monkeypatch.delenv("SAMVAD_P1_TEST_URL", raising=False)
    assert load_config() is None


def test_harness_requires_explicit_development_writes(monkeypatch):
    for key, value in {
        "SAMVAD_P1_TEST_URL": "https://example.supabase.co",
        "SAMVAD_P1_PUBLIC_KEY": "sb_publishable_test_placeholder",
        "SAMVAD_P1_EMAIL_A": "a@fixture.invalid", "SAMVAD_P1_PASSWORD_A": "placeholder",
        "SAMVAD_P1_EMAIL_B": "b@fixture.invalid", "SAMVAD_P1_PASSWORD_B": "placeholder",
    }.items():
        monkeypatch.setenv(key, value)
    monkeypatch.delenv("SAMVAD_P1_ALLOW_WRITES", raising=False)
    with pytest.raises(IdentityCheckError, match="write opt-in"):
        load_config()
